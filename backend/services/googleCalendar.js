import { google } from "googleapis";

import supabase from "./supabase.js";

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

async function getGoogleConnection(userId) {
  const { data, error } = await supabase
    .from("google_connections")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to retrieve Google connection: ${error.message}`
    );
  }

  return data;
}

async function getSelectedCalendar(userId) {
  const { data, error } = await supabase
    .from("user_settings")
    .select(
      `
        google_calendar_id,
        google_calendar_name,
        google_calendar_event_color_id
      `
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to retrieve Google Calendar settings: ${error.message}`
    );
  }

  return data;
}

async function getGoogleCalendarClient(userId) {
  const connection =
    await getGoogleConnection(userId);

  if (!connection?.refresh_token) {
    return null;
  }

  const settings =
    await getSelectedCalendar(userId);

  if (!settings?.google_calendar_id) {
    return null;
  }

  const oauth2Client = createOAuthClient();

  oauth2Client.setCredentials({
    refresh_token: connection.refresh_token,
  });

  return {
    calendar: google.calendar({
      version: "v3",
      auth: oauth2Client,
    }),
    calendarId: settings.google_calendar_id,
    eventColorId:
      settings.google_calendar_event_color_id,
  };
}

function buildEvent(appointment, eventColorId) {
  const clientName =
    appointment.client?.name ||
    "Appointment";

  const pianos =
    appointment.appointment_pianos || [];

  const services = pianos
    .map((appointmentPiano) =>
      appointmentPiano.service
        ? appointmentPiano.service
        : null
    )
    .filter(Boolean);

  const primaryService =
    services[0] || "Tuning";

  const summary =
    `${clientName} Piano ${primaryService
      ? primaryService.charAt(0).toUpperCase() + primaryService.slice(1)
      : ""}`;

  const pianoDetails = pianos
    .map((appointmentPiano) => {
      const piano = appointmentPiano.piano;

      if (!piano) {
        return null;
      }

      const pianoParts = [
        piano.make,
        piano.model,
        piano.serial
      ].filter(Boolean);

      const pianoName =
        pianoParts.length > 0
          ? pianoParts.join(" ")
          : "Piano";

      const details = [pianoName];

      if (appointmentPiano.service) {
        details.push(
          `Service: ${appointmentPiano.service
            ? appointmentPiano.service.charAt(0).toUpperCase() + appointmentPiano.service.slice(1)
            : ""}`
        );
      }

      if (piano.location) {
        details.push(
          `Location: ${piano.location}`
        );
      }

      return details.join("\n");
    })
    .filter(Boolean);

  const descriptionParts = [];

  if (pianoDetails.length > 0) {
    descriptionParts.push(
      `Pianos:\n\n${pianoDetails
        .map((piano, index) => {
          return `${index + 1}. ${piano}`;
        })
        .join("\n\n")}`
    );
  }

  if (appointment.notes) {
    descriptionParts.push(
      `Notes:\n${appointment.notes}`
    );
  }

  const address =
    appointment.client_address;

  const addressParts = address
    ? [
        address.address,
        address.apt,
        address.city,
        address.state,
        address.zip,
      ].filter(Boolean)
    : [];

  return {
    summary,

    description:
      descriptionParts.length > 0
        ? descriptionParts.join("\n\n")
        : undefined,

    location:
      addressParts.length > 0
        ? addressParts.join(", ")
        : undefined,

    colorId: eventColorId || undefined,

    start: {
      dateTime: new Date(
        appointment.start_time
      ).toISOString(),
    },

    end: {
      dateTime: new Date(
        appointment.end_time
      ).toISOString(),
    },
  };
}

export async function createGoogleCalendarEvent(
  userId,
  appointment
) {
  const googleClient =
    await getGoogleCalendarClient(userId);

  // Google Calendar synchronization is optional.
  if (!googleClient) {
    return null;
  }

  const event = buildEvent(
    appointment,
    googleClient.eventColorId
  );

  const response =
    await googleClient.calendar.events.insert({
      calendarId: googleClient.calendarId,
      requestBody: event,
    });

  return response.data;
}

export async function updateGoogleCalendarEvent(
  userId,
  googleEventId,
  appointment
) {
  const googleClient =
    await getGoogleCalendarClient(userId);

  if (!googleClient) {
    return null;
  }

  const event = buildEvent(
    appointment,
    googleClient.eventColorId
  );

  const response =
    await googleClient.calendar.events.update({
      calendarId: googleClient.calendarId,
      eventId: googleEventId,
      requestBody: event,
    });

  return response.data;
}

export async function deleteGoogleCalendarEvent(
  userId,
  googleEventId
) {
  const googleClient =
    await getGoogleCalendarClient(userId);

  if (!googleClient) {
    return null;
  }

  try {
    await googleClient.calendar.events.delete({
      calendarId: googleClient.calendarId,
      eventId: googleEventId,
    });

    return true;
  } catch (error) {
    // Google returns 404 when the event has already
    // been deleted. Treat that as success.
    if (error?.code === 404) {
      return true;
    }

    throw error;
  }
}