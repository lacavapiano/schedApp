import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL;

export async function getApiStatus() {
    const response = await fetch(`${API_URL}/api`);

    if (!response.ok) {
        throw new Error("Failed to connect to API");
    }

    return response.json();
}

export async function getClients() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(`${API_URL}/api/clients`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch clients");
  }

  return response.json();
}

export async function getClient(clientId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(
    `${API_URL}/api/clients/${clientId}`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to fetch client");
  }

  return response.json();
}

export async function createClient(clientData) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(`${API_URL}/api/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(clientData),
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to create client");
  }

  return response.json();
}

export async function updateClient(clientId, clientData) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(
    `${API_URL}/api/clients/${clientId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(clientData),
    }
  );

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to update client");
  }

  return response.json();
}

export async function deleteClient(clientId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(
    `${API_URL}/api/clients/${clientId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to delete client");
  }

  return true;
}