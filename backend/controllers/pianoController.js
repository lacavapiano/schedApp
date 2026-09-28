import { getSupabaseForUser } from "../services/supabase.js";

export async function getPianos(req, res) {
  try {
    const accessToken = req.headers.authorization?.replace("Bearer ", "");

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const supabase = getSupabaseForUser(accessToken);

    const { data, error } = await supabase
      .from("pianos")
      .select(`
        id,
        owner_id,
        client_id,
        make,
        model,
        serial,
        type,
        location,
        quiet_system,
        climate_control,
        tuning_period,
        created_at,
        updated_at,
        client:clients (
          id,
          name,
          type
        )
      `)
      .order("make", { ascending: true })
      .order("model", { ascending: true });

    if (error) {
      console.error("Error fetching pianos:", error);

      return res.status(500).json({
        error: error.message,
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching pianos:", error);

    return res.status(500).json({
      error: "Unable to fetch pianos",
    });
  }
}

export async function getPiano(req, res) {
  try {
    const accessToken = req.headers.authorization?.replace("Bearer ", "");

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const { id } = req.params;

    const supabase = getSupabaseForUser(accessToken);

    const { data, error } = await supabase
      .from("pianos")
      .select(`
        id,
        owner_id,
        client_id,
        make,
        model,
        serial,
        type,
        location,
        quiet_system,
        climate_control,
        tuning_period,
        created_at,
        updated_at,
        client:clients (
          id,
          name,
          type
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching piano:", error);

      if (error.code === "PGRST116") {
        return res.status(404).json({
          error: "Piano not found",
        });
      }

      return res.status(500).json({
        error: error.message,
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching piano:", error);

    return res.status(500).json({
      error: "Unable to fetch piano",
    });
  }
}

export async function createPiano(req, res) {
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
        error: "Invalid authentication",
      });
    }

    const {
      client_id = null,
      make = null,
      model = null,
      serial = null,
      type = null,
      location = null,
      quiet_system = null,
      climate_control = null,
      tuning_period = null,
    } = req.body;

    const { data, error } = await supabase
      .from("pianos")
      .insert({
        owner_id: user.id,
        client_id,
        make,
        model,
        serial,
        type,
        location,
        quiet_system,
        climate_control,
        tuning_period,
      })
      .select(`
        id,
        owner_id,
        client_id,
        make,
        model,
        serial,
        type,
        location,
        quiet_system,
        climate_control,
        tuning_period,
        created_at,
        updated_at,
        client:clients (
          id,
          name,
          type
        )
      `)
      .single();

    if (error) {
      console.error("Error creating piano:", error);

      return res.status(500).json({
        error: "Unable to create piano",
      });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Unexpected error creating piano:", error);

    res.status(500).json({
      error: "Server error",
    });
  }
}

export async function updatePiano(req, res) {
  try {
    const accessToken = req.headers.authorization?.replace("Bearer ", "");

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const { id } = req.params;

    const {
      client_id = null,
      make = null,
      model = null,
      serial = null,
      type = null,
      location = null,
      quiet_system = null,
      climate_control = null,
      tuning_period = null,
    } = req.body;

    const supabase = getSupabaseForUser(accessToken);

    const { data, error } = await supabase
      .from("pianos")
      .update({
        client_id,
        make,
        model,
        serial,
        type,
        location,
        quiet_system,
        climate_control,
        tuning_period,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        id,
        owner_id,
        client_id,
        make,
        model,
        serial,
        type,
        location,
        quiet_system,
        climate_control,
        tuning_period,
        created_at,
        updated_at,
        client:clients (
          id,
          name,
          type
        )
      `)
      .single();

    if (error) {
      console.error("Error updating piano:", error);

      if (error.code === "PGRST116") {
        return res.status(404).json({
          error: "Piano not found",
        });
      }

      return res.status(500).json({
        error: "Unable to update piano",
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Unexpected error updating piano:", error);

    res.status(500).json({
      error: "Server error",
    });
  }
}

export async function deletePiano(req, res) {
  try {
    const accessToken = req.headers.authorization?.replace("Bearer ", "");

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const { id } = req.params;

    const supabase = getSupabaseForUser(accessToken);

    const { error } = await supabase
      .from("pianos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting piano:", error);

      return res.status(500).json({
        error: "Unable to delete piano",
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Unexpected error deleting piano:", error);

    res.status(500).json({
      error: "Server error",
    });
  }
}