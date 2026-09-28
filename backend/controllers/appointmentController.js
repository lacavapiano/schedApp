import { getSupabaseForUser } from "../services/supabase.js";

const appointmentSelect = `
  id,
  owner_id,
  client_id,
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
      piano_id: piano.piano_id,
      service: piano.service ?? null,
      temp: piano.temp ?? null,
      hum: piano.hum ?? null,
      notes: piano.notes ?? null,
    }));
}

async function validatePianosForClient(supabase, clientId, pianos) {
  const pianoIds = [...new Set(pianos.map((piano) => piano.piano_id))];

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
    data.some((piano) => piano.client_id !== clientId)
  ) {
    return {
      valid: false,
      error: "All selected pianos must belong to the selected client",
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
      .order("start_time", { ascending: true });

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
      console.error("Error fetching appointments:", error);

      return res.status(500).json({
        error: error.message,
      });
    }

    return res.json(data);
  } catch (error) {
    console.error("Unexpected error fetching appointments:", error);

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

      console.error("Error fetching appointment:", error);

      return res.status(500).json({
        error: error.message,
      });
    }

    return res.json(data);
  } catch (error) {
    console.error("Unexpected error fetching appointment:", error);

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
      start_time,
      end_time,
      status = "scheduled",
      notes = null,
      payment = null,
      payment_type = null,
      miles = null,
      invoice = null,
      google_event_id = null,
      pianos = [],
    } = req.body;

    if (!client_id || !start_time || !end_time) {
      return res.status(400).json({
        error: "client_id, start_time, and end_time are required",
      });
    }

    if (!validateTimes(start_time, end_time)) {
      return res.status(400).json({
        error:
          "end_time must be after start_time and both must be valid dates",
      });
    }

    const normalizedPianos = normalizePianos(pianos);

    const uniquePianoIds = new Set(
      normalizedPianos.map((piano) => piano.piano_id)
    );

    if (normalizedPianos.length !== uniquePianoIds.size) {
      return res.status(400).json({
        error: "A piano can only be added once to an appointment",
      });
    }

    const pianoValidation = await validatePianosForClient(
      supabase,
      client_id,
      normalizedPianos
    );

    if (!pianoValidation.valid) {
      return res.status(400).json({
        error: pianoValidation.error,
      });
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        owner_id: user.id,
        client_id,
        start_time,
        end_time,
        status,
        notes,
        payment,
        payment_type,
        miles,
        invoice,
        google_event_id,
      })
      .select("id")
      .single();

    if (appointmentError) {
      console.error("Error creating appointment:", appointmentError);

      return res.status(500).json({
        error: "Unable to create appointment",
      });
    }

    if (normalizedPianos.length > 0) {
      const { error: pianoError } = await supabase
        .from("appointment_pianos")
        .insert(
          normalizedPianos.map((piano) => ({
            appointment_id: appointment.id,
            ...piano,
          }))
        );

      if (pianoError) {
        console.error(
          "Error creating appointment pianos:",
          pianoError
        );

        // Roll back the appointment if its piano records fail.
        await supabase
          .from("appointments")
          .delete()
          .eq("id", appointment.id);

        return res.status(500).json({
          error: "Unable to create appointment pianos",
        });
      }
    }

    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("id", appointment.id)
      .single();

    if (error) {
      return res.status(500).json({
        error: "Appointment created but could not be returned",
      });
    }

    return res.status(201).json(data);
  } catch (error) {
    console.error("Unexpected error creating appointment:", error);

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

    const {
      client_id,
      start_time,
      end_time,
      status = "scheduled",
      notes = null,
      payment = null,
      payment_type = null,
      miles = null,
      invoice = null,
      google_event_id = null,
      pianos = [],
    } = req.body;

    if (!client_id || !start_time || !end_time) {
      return res.status(400).json({
        error: "client_id, start_time, and end_time are required",
      });
    }

    if (!validateTimes(start_time, end_time)) {
      return res.status(400).json({
        error:
          "end_time must be after start_time and both must be valid dates",
      });
    }

    const normalizedPianos = normalizePianos(pianos);

    const uniquePianoIds = new Set(
      normalizedPianos.map((piano) => piano.piano_id)
    );

    if (normalizedPianos.length !== uniquePianoIds.size) {
      return res.status(400).json({
        error: "A piano can only be added once to an appointment",
      });
    }

    const pianoValidation = await validatePianosForClient(
      supabase,
      client_id,
      normalizedPianos
    );

    if (!pianoValidation.valid) {
      return res.status(400).json({
        error: pianoValidation.error,
      });
    }

    const { data: appointment, error: appointmentError } =
      await supabase
        .from("appointments")
        .update({
          client_id,
          start_time,
          end_time,
          status,
          notes,
          payment,
          payment_type,
          miles,
          invoice,
          google_event_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id")
        .single();

    if (appointmentError) {
      if (appointmentError.code === "PGRST116") {
        return res.status(404).json({
          error: "Appointment not found",
        });
      }

      console.error(
        "Error updating appointment:",
        appointmentError
      );

      return res.status(500).json({
        error: "Unable to update appointment",
      });
    }

    /*
     * Replace the appointment's piano records.
     *
     * This keeps the update logic simple:
     * whatever pianos are submitted become the complete
     * list for this appointment.
     */
    const { error: deleteError } = await supabase
      .from("appointment_pianos")
      .delete()
      .eq("appointment_id", id);

    if (deleteError) {
      console.error(
        "Error replacing appointment pianos:",
        deleteError
      );

      return res.status(500).json({
        error:
          "Appointment updated but appointment pianos could not be replaced",
      });
    }

    if (normalizedPianos.length > 0) {
      const { error: insertError } = await supabase
        .from("appointment_pianos")
        .insert(
          normalizedPianos.map((piano) => ({
            appointment_id: appointment.id,
            ...piano,
          }))
        );

      if (insertError) {
        console.error(
          "Error inserting appointment pianos:",
          insertError
        );

        return res.status(500).json({
          error:
            "Appointment updated but appointment pianos could not be saved",
        });
      }
    }

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
    console.error("Unexpected error updating appointment:", error);

    return res.status(500).json({
      error: "Server error",
    });
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

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      console.error("Error deleting appointment:", error);

      return res.status(500).json({
        error: "Unable to delete appointment",
      });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Unexpected error deleting appointment:", error);

    return res.status(500).json({
      error: "Server error",
    });
  }
}