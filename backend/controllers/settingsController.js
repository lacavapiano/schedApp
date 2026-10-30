import { getSupabaseForUser } from "../services/supabase.js";

const SETTINGS_COLUMNS = "user_id, google_calendar_id, google_calendar_name, google_calendar_event_color_id, business_address, business_email, business_phone, invoice_due_days";

async function getAuthenticatedUser(req, res) {
  const accessToken = req.headers.authorization?.replace("Bearer ", "");
  if (!accessToken) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  const supabase = getSupabaseForUser(accessToken);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    res.status(401).json({ error: "Invalid authentication token" });
    return null;
  }
  return { supabase, user };
}

export async function getSettings(req, res) {
  try {
    const auth = await getAuthenticatedUser(req, res);
    if (!auth) return;
    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from("user_settings")
      .select(SETTINGS_COLUMNS)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching settings:", error);
      return res.status(500).json({ error: "Failed to fetch settings" });
    }

    res.json(data || {
      user_id: user.id,
      google_calendar_id: null,
      google_calendar_name: null,
      google_calendar_event_color_id: null,
      business_address: "",
      business_email: "",
      business_phone: "",
      invoice_due_days: 30,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ error: "Server error" });
  }
}

export async function updateSettings(req, res) {
  try {
    const auth = await getAuthenticatedUser(req, res);
    if (!auth) return;
    const { supabase, user } = auth;
    const allowedFields = [
      "google_calendar_id",
      "google_calendar_name",
      "google_calendar_event_color_id",
      "business_address",
      "business_email",
      "business_phone",
      "invoice_due_days",
    ];
    const updates = { updated_at: new Date().toISOString() };

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (updates.invoice_due_days !== undefined) {
      const dueDays = Number(updates.invoice_due_days);
      if (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > 365) {
        return res.status(400).json({ error: "Invoice due period must be between 0 and 365 days." });
      }
      updates.invoice_due_days = dueDays;
    }

    for (const field of ["business_address", "business_email", "business_phone"]) {
      if (updates[field] !== undefined && typeof updates[field] !== "string") {
        return res.status(400).json({ error: "Business contact fields must be text." });
      }
      if (updates[field] !== undefined) updates[field] = updates[field].trim();
    }

    const { data, error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, ...updates }, { onConflict: "user_id" })
      .select(SETTINGS_COLUMNS)
      .single();

    if (error) {
      console.error("Error updating settings:", error);
      return res.status(500).json({ error: "Failed to update settings" });
    }

    res.json(data);
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ error: "Server error" });
  }
}
