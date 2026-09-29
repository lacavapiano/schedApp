import { getSupabaseForUser } from "../services/supabase.js";

export async function getSettings(req, res) {
  try {
    const accessToken = req.headers.authorization?.replace("Bearer ", "");

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
      .select("user_id, google_calendar_id, google_calendar_name")
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
    const accessToken = req.headers.authorization?.replace("Bearer ", "");

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
    } = req.body;

    const { data, error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          google_calendar_id: google_calendar_id ?? null,
          google_calendar_name: google_calendar_name ?? null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select("user_id, google_calendar_id, google_calendar_name")
      .single();

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