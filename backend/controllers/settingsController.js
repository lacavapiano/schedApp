import { getSupabaseForUser } from "../services/supabase.js";

export async function getSettings(req, res) {
  try {
    const accessToken =
      req.headers.authorization?.replace("Bearer ", "");

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
        error: "Invalid authentication token",
      });
    }

    const { data, error } = await supabase
      .from("user_settings")
      .select(
        "user_id, google_calendar_id, google_calendar_name, google_calendar_event_color_id"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching settings:", error);

      return res.status(500).json({
        error: "Failed to fetch settings",
      });
    }

    // No settings row exists yet.
    if (!data) {
      return res.json({
        user_id: user.id,
        google_calendar_id: null,
        google_calendar_name: null,
        google_calendar_event_color_id: null,
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Get settings error:", error);

    res.status(500).json({
      error: "Server error",
    });
  }
}

export async function updateSettings(req, res) {
  try {
    const accessToken =
      req.headers.authorization?.replace("Bearer ", "");

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
        error: "Invalid authentication token",
      });
    }

    const {
      google_calendar_id,
      google_calendar_name,
      google_calendar_event_color_id,
    } = req.body;

    /*
     * Only update fields that were actually supplied.
     * This prevents changing one setting from clearing
     * the other settings.
     */
    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (google_calendar_id !== undefined) {
      updates.google_calendar_id = google_calendar_id;
    }

    if (google_calendar_name !== undefined) {
      updates.google_calendar_name = google_calendar_name;
    }

    if (google_calendar_event_color_id !== undefined) {
      updates.google_calendar_event_color_id =
        google_calendar_event_color_id;
    }

    /*
     * Check whether the user already has a settings row.
     */
    const { data: existingSettings, error: existingError } =
      await supabase
        .from("user_settings")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (existingError) {
      console.error(
        "Error checking existing settings:",
        existingError
      );

      return res.status(500).json({
        error: "Failed to update settings",
      });
    }

    let data;
    let error;

    if (existingSettings) {
      // Existing row: update only the supplied fields.
      ({ data, error } = await supabase
        .from("user_settings")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single());
    } else {
      // First settings update: create the row.
      ({ data, error } = await supabase
        .from("user_settings")
        .insert({
          user_id: user.id,
          google_calendar_id:
            google_calendar_id ?? null,
          google_calendar_name:
            google_calendar_name ?? null,
          google_calendar_event_color_id:
            google_calendar_event_color_id ?? null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single());
    }

    if (error) {
      console.error("Error updating settings:", error);

      return res.status(500).json({
        error: "Failed to update settings",
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Update settings error:", error);

    res.status(500).json({
      error: "Server error",
    });
  }
}