import { getSupabaseForUser } from "../services/supabase.js";

export async function getClients(req, res) {
  try {
    const accessToken = req.headers.authorization?.replace("Bearer ", "");

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const supabase = getSupabaseForUser(accessToken);

    const { data, error } = await supabase
      .from("clients")
      .select(`
        id,
        owner_id,
        name,
        type,
        notes,
        client_emails (
          id,
          email,
          label,
          is_primary
        ),
        client_phones (
          id,
          phone,
          label,
          is_primary
        ),
        client_addresses (
          id,
          address,
          apt,
          city,
          state,
          zip,
          label,
          is_primary
        ),
        client_contacts (
          id,
          name,
          relationship,
          notes,
          contact_emails (
            id,
            email,
            label,
            is_primary
          ),
          contact_phones (
            id,
            phone,
            label,
            is_primary
          )
        )
      `)
      .order("name");
      
    if (error) {
      console.error(error);

      return res.status(500).json({
        error: error.message,
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching clients:", error);

    return res.status(500).json({
      error: "Unable to fetch clients",
    });
  }
}

export async function getClient(req, res) {
  try {
    const clientId = req.params.id;

    const accessToken = req.headers.authorization?.replace("Bearer ", "");

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const { id } = req.params;

    const supabase = getSupabaseForUser(accessToken);

    const { data, error } = await supabase
      .from("clients")
      .select(`
        id,
        owner_id,
        name,
        type,
        notes,

        client_emails (
          id,
          email,
          label,
          is_primary
        ),

        client_phones (
          id,
          phone,
          label,
          is_primary
        ),

        client_addresses (
          id,
          address,
          apt,
          city,
          state,
          zip,
          label,
          is_primary
        ),

        client_contacts (
          id,
          name,
          relationship,
          notes,
          contact_emails (
            id,
            email,
            label,
            is_primary
          ),
          contact_phones (
            id,
            phone,
            label,
            is_primary
          )
        ),

        pianos (
          id,
          make,
          model,
          serial,
          type,
          location,
          quiet_system,
          climate_control,
          tuning_period
        )
      `)
      .eq("id", clientId)
      .single();

    if (error) {
      console.error(error);

      if (error.code === "PGRST116") {
        return res.status(404).json({
          error: "Client not found",
        });
      }

      return res.status(500).json({
        error: error.message,
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching client:", error);

    return res.status(500).json({
      error: "Unable to fetch client",
    });
  }
}

export async function createClient(req, res) {
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
      name,
      type = "individual",
      notes,
      emails = [],
      phones = [],
      addresses = [],
    } = req.body;

    const { data: clientId, error } = await supabase.rpc(
      "create_client_transaction",
      {
        p_owner_id: user.id,
        p_name: name,
        p_type: type,
        p_notes: notes || null,
        p_emails: emails,
        p_phones: phones,
        p_addresses: addresses,
      }
    );

    if (error) {
      console.error("Error creating client:", error);

      return res.status(500).json({
        error: "Unable to create client",
      });
    }

    res.status(201).json({
      id: clientId,
    });
  } catch (error) {
    console.error("Unexpected error creating client:", error);

    res.status(500).json({
      error: "Server error",
    });
  }
}

export async function updateClient(req, res) {
  try {
    const accessToken = req.headers.authorization?.replace("Bearer ", "");

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const supabase = getSupabaseForUser(accessToken);

    const { id } = req.params;

    const {
      name,
      type,
      notes,
      emails = [],
      phones = [],
      addresses = [],
      contacts = [],
    } = req.body;

    const { error } = await supabase.rpc(
      "update_client_transaction",
      {
        p_client_id: id,
        p_name: name,
        p_type: type,
        p_notes: notes || null,
        p_emails: emails,
        p_phones: phones,
        p_addresses: addresses,
        p_contacts: contacts,
      }
    );

    if (error) {
      console.error("Error updating client:", error);

      if (error.message === "Client not found") {
        return res.status(404).json({
          error: "Client not found",
        });
      }

      return res.status(500).json({
        error: "Unable to update client",
      });
    }

    res.json({
      id,
      name,
      type,
      notes,
      emails,
      phones,
      addresses,
      contacts,
    });
  } catch (error) {
    console.error("Unexpected error updating client:", error);

    res.status(500).json({
      error: "Server error",
    });
  }
}

export async function deleteClient(req, res) {
  try {
    const accessToken = req.headers.authorization?.replace("Bearer ", "");

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const supabase = getSupabaseForUser(accessToken);

    const { id } = req.params;

    const { error } = await supabase.rpc(
      "delete_client_transaction",
      {
        p_client_id: id,
      }
    );

    if (error) {
      console.error("Error deleting client:", error);

      if (error.message === "Client not found") {
        return res.status(404).json({
          error: "Client not found",
        });
      }

      return res.status(500).json({
        error: "Unable to delete client",
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Unexpected error deleting client:", error);

    res.status(500).json({
      error: "Server error",
    });
  }
}