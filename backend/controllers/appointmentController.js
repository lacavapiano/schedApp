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
      status = "scheduled",
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
        status,
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
      .select("id, google_event_id")
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
      status = "scheduled",
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
        status,
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
     * Replace the appointment's piano records.
     */
    const { error: deletePianosError } =
      await supabase
        .from("appointment_pianos")
        .delete()
        .eq("appointment_id", id);

    if (deletePianosError) {
      console.error(
        "Error replacing appointment pianos:",
        deletePianosError
      );

      return res.status(500).json({
        error:
          "Appointment updated but appointment pianos could not be replaced",
      });
    }

    if (normalizedPianos.length > 0) {
      const { error: insertPianosError } =
        await supabase
          .from("appointment_pianos")
          .insert(
            normalizedPianos.map((piano) => ({
              appointment_id: appointment.id,
              ...piano,
            }))
          );

      if (insertPianosError) {
        console.error(
          "Error inserting appointment pianos:",
          insertPianosError
        );

        return res.status(500).json({
          error:
            "Appointment updated but appointment pianos could not be saved",
        });
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
        console.error(
          "Google Calendar event deletion failed:",
          googleError
        );

        return res.status(500).json({
          error:
            "The appointment could not be deleted because its Google Calendar event could not be removed",
        });
      }
    }

    /*
     * Now delete the schedApp appointment.
     *
     * appointment_pianos should be removed by your
     * existing database foreign-key cascade if configured.
     */
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Error deleting appointment:",
        error
      );

      return res.status(500).json({
        error: "Unable to delete appointment",
      });
    }

    return res.status(204).send();
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