import { getSupabaseForUser } from "../services/supabase.js";

function getAccessToken(req) {
  return req.headers.authorization?.replace("Bearer ", "");
}

async function getUserContext(req, res) {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  const supabase = getSupabaseForUser(accessToken);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    res.status(401).json({ error: "Invalid authentication" });
    return null;
  }

  return { supabase, user };
}

function validService(body) {
  const duration = body.default_service_minutes;
  const validDuration = duration == null || duration === "" || (Number.isInteger(Number(duration)) && Number(duration) >= 1 && Number(duration) <= 1440);
  return typeof body.name === "string"
    && body.name.trim().length > 0
    && ["hourly", "flat_rate"].includes(body.pricing_method)
    && Number.isFinite(Number(body.price))
    && Number(body.price) >= 0
    && validDuration;
}

export async function getServiceTypes(req, res) {
  try {
    const context = await getUserContext(req, res);
    if (!context) return;
    const { supabase } = context;

    let query = supabase.from("service_types")
      .select("id, owner_id, name, pricing_method, price, default_service_minutes, is_active, created_at, updated_at")
      .order("name", { ascending: true });
    if (req.query.include_inactive !== "true") query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (error) {
    console.error("Error fetching service types:", error);
    return res.status(500).json({ error: "Unable to fetch service types" });
  }
}

export async function createServiceType(req, res) {
  try {
    const context = await getUserContext(req, res);
    if (!context) return;
    const { supabase, user } = context;
    if (!validService(req.body)) {
      return res.status(400).json({
        error: "A service name, valid pricing method, and non-negative price are required",
      });
    }

    const payload = {
      owner_id: user.id,
      name: req.body.name.trim(),
      pricing_method: req.body.pricing_method,
      price: Number(req.body.price).toFixed(2),
      default_service_minutes: req.body.pricing_method === "flat_rate" && req.body.default_service_minutes != null && req.body.default_service_minutes !== "" ? Number(req.body.default_service_minutes) : null,
      is_active: req.body.is_active !== false,
    };
    const { data, error } = await supabase.from("service_types")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "A service with this name already exists" });
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json(data);
  } catch (error) {
    console.error("Error creating service type:", error);
    return res.status(500).json({ error: "Unable to create service type" });
  }
}

export async function updateServiceType(req, res) {
  try {
    const context = await getUserContext(req, res);
    if (!context) return;
    const { supabase } = context;
    const updates = {};

    if (req.body.name !== undefined) {
      if (typeof req.body.name !== "string" || !req.body.name.trim()) {
        return res.status(400).json({ error: "Service name cannot be empty" });
      }
      updates.name = req.body.name.trim();
    }
    if (req.body.pricing_method !== undefined) {
      if (!["hourly", "flat_rate"].includes(req.body.pricing_method)) {
        return res.status(400).json({ error: "pricing_method must be hourly or flat_rate" });
      }
      updates.pricing_method = req.body.pricing_method;
    }
    if (req.body.price !== undefined) {
      if (!Number.isFinite(Number(req.body.price)) || Number(req.body.price) < 0) {
        return res.status(400).json({ error: "Price must be a non-negative number" });
      }
      updates.price = Number(req.body.price).toFixed(2);
    }
    if (req.body.is_active !== undefined) updates.is_active = Boolean(req.body.is_active);
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from("service_types")
      .update(updates)
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "A service with this name already exists" });
      if (error.code === "PGRST116") return res.status(404).json({ error: "Service not found" });
      return res.status(500).json({ error: error.message });
    }
    return res.json(data);
  } catch (error) {
    console.error("Error updating service type:", error);
    return res.status(500).json({ error: "Unable to update service type" });
  }
}

export async function getClientDiscounts(req, res) {
  try {
    const context = await getUserContext(req, res);
    if (!context) return;
    const { supabase } = context;

    let query = supabase.from("client_discounts")
      .select("id, owner_id, client_id, service_type_id, discount_percent, discount_type, is_active, applies_to_appointment_id, applies_to_appointment_piano_id, created_at, updated_at, service_type:service_types(id, name, pricing_method)")
      .order("created_at", { ascending: false });
    if (req.query.client_id) query = query.eq("client_id", req.query.client_id);
    if (req.query.include_inactive !== "true") query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (error) {
    console.error("Error fetching client discounts:", error);
    return res.status(500).json({ error: "Unable to fetch client discounts" });
  }
}

export async function createClientDiscount(req, res) {
  try {
    const context = await getUserContext(req, res);
    if (!context) return;
    const { supabase, user } = context;
    const {
      client_id,
      service_type_id = null,
      discount_percent,
      discount_type = "ongoing",
      applies_to_appointment_id = null,
      applies_to_appointment_piano_id = null,
    } = req.body;

    const percent = Number(discount_percent);
    if (!client_id || !Number.isFinite(percent) || percent <= 0 || percent > 100) {
      return res.status(400).json({ error: "client_id and a discount percentage greater than 0 and at most 100 are required" });
    }
    if (!["ongoing", "one_time"].includes(discount_type)) {
      return res.status(400).json({ error: "discount_type must be ongoing or one_time" });
    }
    if (discount_type === "ongoing" && (applies_to_appointment_id || applies_to_appointment_piano_id)) {
      return res.status(400).json({ error: "Ongoing discounts cannot target a specific appointment or service" });
    }
    if (discount_type === "one_time" && !applies_to_appointment_id && !applies_to_appointment_piano_id) {
      return res.status(400).json({ error: "Choose the appointment or service that should receive this one-time discount" });
    }

    // Validate that the client belongs to this signed-in user.
    const { data: client, error: clientError } = await supabase.from("clients")
      .select("id")
      .eq("id", client_id)
      .maybeSingle();
    if (clientError || !client) return res.status(400).json({ error: "Selected client was not found" });

    if (service_type_id) {
      const { data: service, error: serviceError } = await supabase.from("service_types")
        .select("id")
        .eq("id", service_type_id)
        .maybeSingle();
      if (serviceError || !service) return res.status(400).json({ error: "Selected service type was not found" });
    }

    if (discount_type === "one_time") {
      if (applies_to_appointment_id && applies_to_appointment_piano_id) {
        return res.status(400).json({ error: "Choose either a whole appointment or a specific appointment service, not both" });
      }

      if (applies_to_appointment_id) {
        const { data: targetAppointment, error: targetError } = await supabase
          .from("appointments")
          .select("id, client_id")
          .eq("id", applies_to_appointment_id)
          .maybeSingle();
        if (targetError || !targetAppointment || targetAppointment.client_id !== client_id) {
          return res.status(400).json({ error: "The selected appointment must belong to this client" });
        }
      }

      if (applies_to_appointment_piano_id) {
        const { data: targetService, error: targetServiceError } = await supabase
          .from("appointment_pianos")
          .select("id, appointment_id")
          .eq("id", applies_to_appointment_piano_id)
          .maybeSingle();
        if (targetServiceError || !targetService) {
          return res.status(400).json({ error: "The selected appointment service was not found" });
        }

        const { data: targetAppointment, error: targetAppointmentError } = await supabase
          .from("appointments")
          .select("id, client_id")
          .eq("id", targetService.appointment_id)
          .maybeSingle();
        if (targetAppointmentError || !targetAppointment || targetAppointment.client_id !== client_id) {
          return res.status(400).json({ error: "The selected service must belong to an appointment for this client" });
        }
      }
    }

    const { data, error } = await supabase.from("client_discounts").insert({
      owner_id: user.id,
      client_id,
      service_type_id,
      discount_percent: percent.toFixed(2),
      discount_type,
      is_active: true,
      applies_to_appointment_id: discount_type === "one_time" ? applies_to_appointment_id : null,
      applies_to_appointment_piano_id: discount_type === "one_time" ? applies_to_appointment_piano_id : null,
    }).select("id, owner_id, client_id, service_type_id, discount_percent, discount_type, is_active, applies_to_appointment_id, applies_to_appointment_piano_id, created_at, updated_at, service_type:service_types(id, name, pricing_method)").single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
  } catch (error) {
    console.error("Error creating client discount:", error);
    return res.status(500).json({ error: "Unable to create client discount" });
  }
}

export async function updateClientDiscount(req, res) {
  try {
    const context = await getUserContext(req, res);
    if (!context) return;
    const { supabase } = context;
    const updates = {};

    if (req.body.discount_percent !== undefined) {
      const percent = Number(req.body.discount_percent);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
        return res.status(400).json({ error: "Discount percentage must be greater than 0 and at most 100" });
      }
      updates.discount_percent = percent.toFixed(2);
    }
    if (req.body.is_active !== undefined) updates.is_active = Boolean(req.body.is_active);

    const { data, error } = await supabase.from("client_discounts")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ error: "Discount not found" });
      return res.status(400).json({ error: error.message });
    }
    return res.json(data);
  } catch (error) {
    console.error("Error updating client discount:", error);
    return res.status(500).json({ error: "Unable to update client discount" });
  }
}


function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function effectivePercent(discounts) {
  const remaining = discounts.reduce(
    (product, discount) => product * (1 - Number(discount.discount_percent) / 100),
    1
  );
  return Math.round((1 - remaining) * 10000) / 100;
}

export async function getAppointmentCharges(req, res) {
  try {
    const context = await getUserContext(req, res);
    if (!context) return;
    const { supabase } = context;
    const appointmentId = req.query.appointment_id;

    if (!appointmentId) {
      return res.status(400).json({ error: "appointment_id is required" });
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id")
      .eq("id", appointmentId)
      .maybeSingle();
    if (appointmentError || !appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const { data, error } = await supabase
      .from("appointment_charges")
      .select("*")
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (error) {
    console.error("Error fetching appointment charges:", error);
    return res.status(500).json({ error: "Unable to fetch appointment charges" });
  }
}

export async function saveAppointmentCharges(req, res) {
  try {
    const context = await getUserContext(req, res);
    if (!context) return;
    const { supabase, user } = context;
    const { appointment_id: appointmentId, charges = [] } = req.body || {};

    if (!appointmentId || !Array.isArray(charges)) {
      return res.status(400).json({ error: "appointment_id and a charges array are required" });
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id, owner_id, client_id")
      .eq("id", appointmentId)
      .maybeSingle();
    if (appointmentError || !appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const { data: appointmentPianos, error: pianoError } = await supabase
      .from("appointment_pianos")
      .select("id, appointment_id")
      .eq("appointment_id", appointmentId);
    if (pianoError) return res.status(500).json({ error: pianoError.message });

    const appointmentPianoIds = new Set((appointmentPianos || []).map((row) => row.id));
    const submittedIds = charges.map((charge) => charge.appointment_piano_id);
    if (submittedIds.some((id) => !id || !appointmentPianoIds.has(id))) {
      return res.status(400).json({ error: "Every priced service must belong to this appointment" });
    }
    const serviceIds = [...new Set(charges.map((charge) => charge.service_type_id).filter(Boolean))];
    const { data: serviceRows, error: serviceError } = serviceIds.length
      ? await supabase.from("service_types")
          .select("id, owner_id, name, pricing_method, price")
          .in("id", serviceIds)
      : { data: [], error: null };
    if (serviceError) return res.status(500).json({ error: serviceError.message });

    const servicesById = new Map((serviceRows || []).map((service) => [service.id, service]));
    const { data: discounts, error: discountsError } = await supabase
      .from("client_discounts")
      .select("id, service_type_id, discount_percent, discount_type, is_active, applies_to_appointment_id, applies_to_appointment_piano_id")
      .eq("client_id", appointment.client_id)
      .eq("is_active", true);
    if (discountsError) return res.status(500).json({ error: discountsError.message });

    const rowsToInsert = [];
    const responseRows = [];

    for (const input of charges) {
      const service = servicesById.get(input.service_type_id);
      if (!service) {
        return res.status(400).json({ error: "Choose a valid configured service for every priced piano" });
      }
      if (service.owner_id !== user.id) {
        return res.status(400).json({ error: "The selected service does not belong to this account" });
      }

      const hours = input.billable_hours === "" || input.billable_hours === null || input.billable_hours === undefined
        ? null
        : Number(input.billable_hours);
      if (service.pricing_method === "hourly" && (!Number.isFinite(hours) || hours <= 0)) {
        return res.status(400).json({ error: `Enter actual billable hours for hourly service "${service.name}".` });
      }
      if (service.pricing_method === "flat_rate" && hours !== null && (!Number.isFinite(hours) || hours < 0)) {
        return res.status(400).json({ error: "Billable hours must be zero or greater" });
      }

      const baseAmount = roundMoney(Number(service.price) * (service.pricing_method === "hourly" ? hours : 1));
      const matchingRules = (discounts || []).filter((rule) => {
        if (rule.service_type_id && rule.service_type_id !== service.id) return false;
        if (rule.discount_type === "ongoing") return true;
        return rule.applies_to_appointment_id === appointmentId
          || rule.applies_to_appointment_piano_id === input.appointment_piano_id;
      });
      const globalRules = matchingRules.filter((rule) => rule.discount_type === "ongoing" && !rule.service_type_id);
      const serviceRules = matchingRules.filter((rule) => rule.discount_type === "ongoing" && rule.service_type_id === service.id);
      const oneTimeRules = matchingRules.filter((rule) => rule.discount_type === "one_time");
      const orderedRules = [...globalRules, ...serviceRules, ...oneTimeRules];

      let runningAmount = baseAmount;
      const breakdown = [];
      for (const rule of orderedRules) {
        const before = runningAmount;
        runningAmount = roundMoney(runningAmount * (1 - Number(rule.discount_percent) / 100));
        breakdown.push({
          id: rule.id,
          type: rule.discount_type === "one_time" ? "one_time" : (rule.service_type_id ? "service" : "global"),
          percent: Number(rule.discount_percent),
          amount: roundMoney(before - runningAmount),
          remaining: runningAmount,
        });
      }
      const finalAmount = runningAmount;
      const row = {
        owner_id: user.id,
        appointment_id: appointmentId,
        appointment_piano_id: input.appointment_piano_id,
        service_type_id: service.id,
        service_name: service.name,
        pricing_method: service.pricing_method,
        unit_price: Number(service.price),
        billable_hours: service.pricing_method === "hourly" ? hours : null,
        base_amount: baseAmount,
        global_discount_percent: effectivePercent(globalRules),
        service_discount_percent: effectivePercent(serviceRules),
        one_time_discount_percent: effectivePercent(oneTimeRules),
        discount_rule_ids: orderedRules.map((rule) => rule.id),
        discount_amount: roundMoney(baseAmount - finalAmount),
        final_amount: finalAmount,
        updated_at: new Date().toISOString(),
      };
      rowsToInsert.push(row);
      responseRows.push({ ...row, discount_breakdown: breakdown });
    }

    const { error: deleteError } = await supabase
      .from("appointment_charges")
      .delete()
      .eq("appointment_id", appointmentId);
    if (deleteError) return res.status(500).json({ error: deleteError.message });

    if (rowsToInsert.length) {
      const { error: insertError } = await supabase
        .from("appointment_charges")
        .insert(rowsToInsert);
      if (insertError) return res.status(500).json({ error: insertError.message });
    }

    return res.json(responseRows);
  } catch (error) {
    console.error("Error saving appointment charges:", error);
    return res.status(500).json({ error: "Unable to calculate and save appointment charges" });
  }
}
