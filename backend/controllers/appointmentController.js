import { getSupabaseForUser } from "../services/supabase.js";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "../services/googleCalendar.js";

const appointmentSelect = `
  id,
  owner_id,
  client_id,
  client_address_id,
  start_time,
  end_time,
  status,
  notes,
  payment,
  payment_type,
  miles,
  invoice,
  google_event_id,
  created_at,
  updated_at,
  client:clients (
    id,
    name,
    type
  ),
  client_address:client_addresses (
    id,
    address,
    apt,
    city,
    state,
    zip,
    label,
    is_primary
  ),
  appointment_pianos (
    id,
    piano_id,
    service,
    temp,
    hum,
    notes,
    piano:pianos (
      id,
      make,
      model,
      serial,
      type,
      location
    )
  ),
  appointment_charges (
    appointment_piano_id,
    service_type_id,
    service_name
  )
`;

function getAccessToken(req) {
  return req.headers.authorization?.replace("Bearer ", "");
}

function validateTimes(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  return (
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    end > start
  );
}

function normalizePianos(pianos) {
  if (!Array.isArray(pianos)) {
    return [];
  }

  return pianos
    .filter((piano) => piano?.piano_id)
    .map((piano) => ({
      ...(piano.id ? { id: piano.id } : {}),
      piano_id: piano.piano_id,
      service: piano.service ?? null,
      temp: piano.temp ?? null,
      hum: piano.hum ?? null,
      notes: piano.notes ?? null,
    }));
}

async function validatePianosForClient(
  supabase,
  clientId,
  pianos
) {
  const pianoIds = [
    ...new Set(
      pianos.map((piano) => piano.piano_id)
    ),
  ];

  if (pianoIds.length === 0) {
    return { valid: true };
  }

  const { data, error } = await supabase
    .from("pianos")
    .select("id, client_id")
    .in("id", pianoIds);

  if (error) {
    return {
      valid: false,
      error: error.message,
    };
  }

  if (
    data.length !== pianoIds.length ||
    data.some(
      (piano) => piano.client_id !== clientId
    )
  ) {
    return {
      valid: false,
      error:
        "All selected pianos must belong to the selected client",
    };
  }

  return { valid: true };
}

async function validateAddressForClient(
  supabase,
  clientId,
  clientAddressId
) {
  // No address selected is valid.
  if (!clientAddressId) {
    return { valid: true };
  }

  const { data, error } = await supabase
    .from("client_addresses")
    .select("id, client_id")
    .eq("id", clientAddressId)
    .maybeSingle();

  if (error) {
    return {
      valid: false,
      error: error.message,
    };
  }

  if (!data) {
    return {
      valid: false,
      error: "Selected address was not found",
    };
  }

  if (data.client_id !== clientId) {
    return {
      valid: false,
      error:
        "Selected address must belong to the selected client",
    };
  }

  return { valid: true };
}

export async function getAppointments(req, res) {
  try {
    const accessToken = getAccessToken(req);

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const supabase = getSupabaseForUser(accessToken);
    const { start, end } = req.query;

    let query = supabase
      .from("appointments")
      .select(appointmentSelect)
      .order("start_time", {
        ascending: true,
      });

    // Optional date-range filtering.
    // This will be useful for the calendar later.
    if (start) {
      query = query.gte("start_time", start);
    }

    if (end) {
      query = query.lt("start_time", end);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "Error fetching appointments:",
        error
      );

      return res.status(500).json({
        error: error.message,
      });
    }

    return res.json(data);
  } catch (error) {
    console.error(
      "Unexpected error fetching appointments:",
      error
    );

    return res.status(500).json({
      error: "Unable to fetch appointments",
    });
  }
}

export async function getAppointment(req, res) {
  try {
    const accessToken = getAccessToken(req);

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const supabase = getSupabaseForUser(accessToken);

    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("id", req.params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          error: "Appointment not found",
        });
      }

      console.error(
        "Error fetching appointment:",
        error
      );

      return res.status(500).json({
        error: error.message,
      });
    }

    return res.json(data);
  } catch (error) {
    console.error(
      "Unexpected error fetching appointment:",
      error
    );

    return res.status(500).json({
      error: "Unable to fetch appointment",
    });
  }
}

export async function createAppointment(req, res) {
  try {
    const accessToken = getAccessToken(req);

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const supabase = getSupabaseForUser(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({
        error: "Invalid authentication",
      });
    }

    const {
      client_id,
      client_address_id = null,
      start_time,
      end_time,
      notes = null,
      payment = null,
      payment_type = null,
      miles = null,
      invoice = null,
      pianos = [],
    } = req.body;

    if (!client_id || !start_time || !end_time) {
      return res.status(400).json({
        error:
          "client_id, start_time, and end_time are required",
      });
    }

    if (!validateTimes(start_time, end_time)) {
      return res.status(400).json({
        error:
          "end_time must be after start_time and both must be valid dates",
      });
    }

    const addressValidation =
      await validateAddressForClient(
        supabase,
        client_id,
        client_address_id
      );

    if (!addressValidation.valid) {
      return res.status(400).json({
        error: addressValidation.error,
      });
    }

    const normalizedPianos =
      normalizePianos(pianos);

    const uniquePianoIds = new Set(
      normalizedPianos.map(
        (piano) => piano.piano_id
      )
    );

    if (
      normalizedPianos.length !==
      uniquePianoIds.size
    ) {
      return res.status(400).json({
        error:
          "A piano can only be added once to an appointment",
      });
    }

    const pianoValidation =
      await validatePianosForClient(
        supabase,
        client_id,
        normalizedPianos
      );

    if (!pianoValidation.valid) {
      return res.status(400).json({
        error: pianoValidation.error,
      });
    }

    const {
      data: appointment,
      error: appointmentError,
    } = await supabase
      .from("appointments")
      .insert({
        owner_id: user.id,
        client_id,
        client_address_id,
        start_time,
        end_time,
        status: "scheduled",
        notes,
        payment,
        payment_type,
        miles,
        invoice,
        google_event_id: null,
      })
      .select("id")
      .single();

    if (appointmentError) {
      console.error(
        "Error creating appointment:",
        appointmentError
      );

      return res.status(500).json({
        error: "Unable to create appointment",
      });
    }

    if (normalizedPianos.length > 0) {
      const { error: pianoError } =
        await supabase
          .from("appointment_pianos")
          .insert(
            normalizedPianos.map(({ id: _ignoredId, ...piano }) => ({
              appointment_id: appointment.id,
              ...piano,
            }))
          );

      if (pianoError) {
        console.error(
          "Error creating appointment pianos:",
          pianoError
        );

        await supabase
          .from("appointments")
          .delete()
          .eq("id", appointment.id);

        return res.status(500).json({
          error:
            "Unable to create appointment pianos",
        });
      }
    }

    const {
      data: completeAppointment,
      error: completeAppointmentError,
    } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("id", appointment.id)
      .single();

    if (completeAppointmentError) {
      console.error(
        "Error retrieving created appointment:",
        completeAppointmentError
      );

      return res.status(500).json({
        error:
          "Appointment created but could not be returned",
      });
    }

    try {
      const googleEvent =
        await createGoogleCalendarEvent(
          user.id,
          completeAppointment
        );

      if (googleEvent?.id) {
        const { error: googleIdError } =
          await supabase
            .from("appointments")
            .update({
              google_event_id: googleEvent.id,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", appointment.id);

        if (googleIdError) {
          console.error(
            "Google event created but Google event ID could not be saved:",
            googleIdError
          );
        } else {
          completeAppointment.google_event_id =
            googleEvent.id;
        }
      }
    } catch (googleError) {

      console.error(
        "Google Calendar event creation failed:",
        googleError
      );
    }

    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("id", appointment.id)
      .single();

    if (error) {
      return res.status(500).json({
        error:
          "Appointment created but could not be returned",
      });
    }

    return res.status(201).json(data);
  } catch (error) {
    console.error(
      "Unexpected error creating appointment:",
      error
    );

    return res.status(500).json({
      error: "Server error",
    });
  }
}

export async function updateAppointment(req, res) {
  try {
    const accessToken = getAccessToken(req);

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const supabase = getSupabaseForUser(accessToken);
    const { id } = req.params;

    /*
     * Get the existing appointment first so we preserve
     * its google_event_id rather than accepting one from
     * the frontend.
     */
    const {
      data: existingAppointment,
      error: existingError,
    } = await supabase
      .from("appointments")
      .select("id, google_event_id, status")
      .eq("id", id)
      .single();

    if (existingError) {
      if (existingError.code === "PGRST116") {
        return res.status(404).json({
          error: "Appointment not found",
        });
      }

      console.error(
        "Error retrieving existing appointment:",
        existingError
      );

      return res.status(500).json({
        error: "Unable to retrieve appointment",
      });
    }

    const {
      client_id,
      client_address_id = null,
      start_time,
      end_time,
      notes = null,
      payment = null,
      payment_type = null,
      miles = null,
      invoice = null,
      pianos = [],
    } = req.body;

    if (!client_id || !start_time || !end_time) {
      return res.status(400).json({
        error:
          "client_id, start_time, and end_time are required",
      });
    }

    if (!validateTimes(start_time, end_time)) {
      return res.status(400).json({
        error:
          "end_time must be after start_time and both must be valid dates",
      });
    }

    const addressValidation =
      await validateAddressForClient(
        supabase,
        client_id,
        client_address_id
      );

    if (!addressValidation.valid) {
      return res.status(400).json({
        error: addressValidation.error,
      });
    }

    const normalizedPianos =
      normalizePianos(pianos);

    const uniquePianoIds = new Set(
      normalizedPianos.map(
        (piano) => piano.piano_id
      )
    );

    if (
      normalizedPianos.length !==
      uniquePianoIds.size
    ) {
      return res.status(400).json({
        error:
          "A piano can only be added once to an appointment",
      });
    }

    const pianoValidation =
      await validatePianosForClient(
        supabase,
        client_id,
        normalizedPianos
      );

    if (!pianoValidation.valid) {
      return res.status(400).json({
        error: pianoValidation.error,
      });
    }

    /*
     * Update the appointment while preserving
     * google_event_id.
     */
    const {
      data: appointment,
      error: appointmentError,
    } = await supabase
      .from("appointments")
      .update({
        client_id,
        client_address_id,
        start_time,
        end_time,
        notes,
        payment,
        payment_type,
        miles,
        invoice,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, google_event_id")
      .single();

    if (appointmentError) {
      console.error(
        "Error updating appointment:",
        appointmentError
      );

      return res.status(500).json({
        error: "Unable to update appointment",
      });
    }

    /*
     * Preserve existing appointment_piano IDs when a service remains on
     * the appointment. One-time discounts target these IDs, so deleting and
     * recreating every row would silently delete those discounts by cascade.
     */
    const { data: existingPianos, error: existingPianosError } = await supabase
      .from("appointment_pianos")
      .select("id")
      .eq("appointment_id", id);
    if (existingPianosError) {
      return res.status(500).json({ error: "Unable to retrieve existing appointment services" });
    }

    const existingPianoIds = new Set((existingPianos || []).map((row) => row.id));
    const submittedExistingIds = normalizedPianos.map((piano) => piano.id).filter(Boolean);
    if (submittedExistingIds.some((pianoId) => !existingPianoIds.has(pianoId))) {
      return res.status(400).json({ error: "An appointment service ID does not belong to this appointment" });
    }

    const removedIds = [...existingPianoIds].filter((pianoId) => !submittedExistingIds.includes(pianoId));
    if (removedIds.length) {
      const { error: deletePianosError } = await supabase
        .from("appointment_pianos")
        .delete()
        .in("id", removedIds)
        .eq("appointment_id", id);
      if (deletePianosError) {
        console.error("Error removing appointment services:", deletePianosError);
        return res.status(500).json({ error: "Appointment updated but removed services could not be deleted" });
      }
    }

    for (const piano of normalizedPianos) {
      const { id: pianoRowId, ...pianoData } = piano;
      if (pianoRowId) {
        const { error: updatePianoError } = await supabase
          .from("appointment_pianos")
          .update(pianoData)
          .eq("id", pianoRowId)
          .eq("appointment_id", id);
        if (updatePianoError) {
          console.error("Error updating appointment service:", updatePianoError);
          return res.status(500).json({ error: "Appointment updated but a service could not be updated" });
        }
      } else {
        const { error: insertPianoError } = await supabase
          .from("appointment_pianos")
          .insert({ appointment_id: appointment.id, ...pianoData });
        if (insertPianoError) {
          console.error("Error inserting appointment service:", insertPianoError);
          return res.status(500).json({ error: "Appointment updated but a new service could not be saved" });
        }
      }
    }

    /*
     * Retrieve the complete updated appointment for
     * Google Calendar synchronization.
     */
    const {
      data: completeAppointment,
      error: completeAppointmentError,
    } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("id", id)
      .single();

    if (completeAppointmentError) {
      return res.status(500).json({
        error:
          "Appointment updated but could not be returned",
      });
    }

    /*
     * Synchronize the Google Calendar event.
     *
     * If the appointment already has a Google event,
     * update it.
     *
     * If it doesn't have one, attempt to create one.
     * This also handles appointments that existed before
     * Google Calendar was connected.
     */
    try {
      if (existingAppointment.google_event_id) {
        await updateGoogleCalendarEvent(
          completeAppointment.owner_id,
          existingAppointment.google_event_id,
          completeAppointment
        );
      } else {
        const googleEvent =
          await createGoogleCalendarEvent(
            completeAppointment.owner_id,
            completeAppointment
          );

        if (googleEvent?.id) {
          const { error: googleIdError } =
            await supabase
              .from("appointments")
              .update({
                google_event_id: googleEvent.id,
                updated_at:
                  new Date().toISOString(),
              })
              .eq("id", id);

          if (googleIdError) {
            console.error(
              "Google event created but Google event ID could not be saved:",
              googleIdError
            );
          } else {
            completeAppointment.google_event_id =
              googleEvent.id;
          }
        }
      }
    } catch (googleError) {
      /*
       * Don't fail the schedApp update just because
       * Google synchronization failed.
       */
      console.error(
        "Google Calendar event synchronization failed:",
        googleError
      );
    }

    /*
     * Return the final appointment.
     */
    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("id", id)
      .single();

    if (error) {
      return res.status(500).json({
        error:
          "Appointment updated but could not be returned",
      });
    }

    return res.json(data);
  } catch (error) {
    console.error(
      "Unexpected error updating appointment:",
      error
    );

    return res.status(500).json({
      error: "Server error",
    });
  }
}


export async function completeAppointment(req, res) {
  try {
    const accessToken = getAccessToken(req);
    if (!accessToken) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const supabase = getSupabaseForUser(accessToken);
    const { id } = req.params;

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id, status, payment, payment_type, miles, appointment_pianos(id, temp, hum)")
      .eq("id", id)
      .maybeSingle();

    if (appointmentError) {
      return res.status(500).json({ error: appointmentError.message });
    }
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    if (appointment.status !== "scheduled") {
      return res.status(400).json({ error: "Only scheduled appointments can be completed." });
    }

    const missing = [];
    if (appointment.miles === null || appointment.miles === undefined || appointment.miles === "") {
      missing.push("mileage");
    }
    if (appointment.payment === null || appointment.payment === undefined || appointment.payment === "") {
      missing.push("payment amount");
    }
    if (!String(appointment.payment_type || "").trim()) {
      missing.push("payment type");
    }
    for (const [index, piano] of (appointment.appointment_pianos || []).entries()) {
      if (piano.temp === null || piano.temp === undefined || !String(piano.temp).trim()) {
        missing.push(`temperature for piano ${index + 1}`);
      }
      if (piano.hum === null || piano.hum === undefined || !String(piano.hum).trim()) {
        missing.push(`humidity for piano ${index + 1}`);
      }
    }
    if (missing.length) {
      return res.status(400).json({
        error: `Fill in the following before completing: ${missing.join(", ")}.`,
        missing,
      });
    }

    const { data: charges, error: chargesError } = await supabase
      .from("appointment_charges")
      .select("appointment_piano_id, final_amount")
      .eq("appointment_id", id);

    if (chargesError) {
      return res.status(500).json({ error: "Unable to verify appointment balance." });
    }

    const pianos = appointment.appointment_pianos || [];
    const pricedPianoIds = new Set((charges || []).map((charge) => charge.appointment_piano_id).filter(Boolean));
    const unpricedPianos = pianos.filter((piano) => !pricedPianoIds.has(piano.id));
    if (unpricedPianos.length) {
      return res.status(400).json({
        error: "Every piano on the appointment must have a calculated service price before it can be completed.",
      });
    }

    const totalDue = Math.round((charges || []).reduce((sum, charge) => sum + Number(charge.final_amount || 0), 0) * 100) / 100;
    const amountPaid = Number(appointment.payment);
    if (!Number.isFinite(amountPaid) || amountPaid < 0) {
      return res.status(400).json({ error: "Enter a valid payment amount." });
    }
    if (amountPaid + 0.00001 < totalDue) {
      return res.status(400).json({
        error: `This appointment cannot be completed until it is paid in full. Total due: ${totalDue.toFixed(2)}; paid: ${amountPaid.toFixed(2)}.`,
        total_due: totalDue,
        amount_paid: amountPaid,
      });
    }

    const { data, error } = await supabase
      .from("appointments")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "scheduled")
      .select(appointmentSelect)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: "Unable to complete appointment." });
    }
    if (!data) {
      return res.status(409).json({ error: "Appointment status changed. Refresh and try again." });
    }

    return res.json(data);
  } catch (error) {
    console.error("Unexpected error completing appointment:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function deleteAppointment(req, res) {
  try {
    const accessToken = getAccessToken(req);

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const supabase = getSupabaseForUser(accessToken);
    const { id } = req.params;

    /*
     * Get the appointment before deleting it so we know
     * whether there is a Google Calendar event to remove.
     */
    const {
      data: appointment,
      error: appointmentError,
    } = await supabase
      .from("appointments")
      .select(
        "id, owner_id, google_event_id"
      )
      .eq("id", id)
      .single();

    if (appointmentError) {
      if (appointmentError.code === "PGRST116") {
        return res.status(404).json({
          error: "Appointment not found",
        });
      }

      console.error(
        "Error retrieving appointment for deletion:",
        appointmentError
      );

      return res.status(500).json({
        error: "Unable to retrieve appointment",
      });
    }

    /*
     * Remove the Google Calendar event first.
     *
     * A 404 from Google is treated as success by
     * deleteGoogleCalendarEvent(), since the event is
     * already gone.
     */
    if (appointment.google_event_id) {
      try {
        await deleteGoogleCalendarEvent(
          appointment.owner_id,
          appointment.google_event_id
        );
      } catch (googleError) {
        // Cancellation in schedApp must still succeed if Google is unavailable.
        console.error(
          "Google Calendar event deletion failed while cancelling appointment:",
          googleError
        );
      }
    }

    // Keep the appointment and its service/pricing history; mark it cancelled.
    const { data: cancelledAppointment, error } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        google_event_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(appointmentSelect)
      .single();

    if (error) {
      console.error("Error cancelling appointment:", error);
      return res.status(500).json({ error: "Unable to cancel appointment" });
    }

    return res.json(cancelledAppointment);
  } catch (error) {
    console.error(
      "Unexpected error deleting appointment:",
      error
    );

    return res.status(500).json({
      error: "Server error",
    });
  }
}