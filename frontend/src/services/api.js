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

export async function getPianos() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(`${API_URL}/api/pianos`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to fetch pianos");
  }

  return response.json();
}

export async function getPiano(pianoId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(`${API_URL}/api/pianos/${pianoId}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to fetch piano");
  }

  return response.json();
}

export async function createPiano(pianoData) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(`${API_URL}/api/pianos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(pianoData),
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to create piano");
  }

  return response.json();
}

export async function updatePiano(pianoId, pianoData) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(`${API_URL}/api/pianos/${pianoId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(pianoData),
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to update piano");
  }

  return response.json();
}

export async function deletePiano(pianoId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(`${API_URL}/api/pianos/${pianoId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to delete piano");
  }

  return true;
}

export async function getAppointments() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(`${API_URL}/api/appointments`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(
      error.error || "Failed to fetch appointments"
    );
  }

  return response.json();
}

export async function createAppointment(appointmentData) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(`${API_URL}/api/appointments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(appointmentData),
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(
      error.error || "Failed to create appointment"
    );
  }

  return response.json();
}

export async function updateAppointment(
  appointmentId,
  appointmentData
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(
    `${API_URL}/api/appointments/${appointmentId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(appointmentData),
    }
  );

  if (!response.ok) {
    const error = await response.json();

    throw new Error(
      error.error || "Failed to update appointment"
    );
  }

  return response.json();
}

export async function deleteAppointment(appointmentId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(
    `${API_URL}/api/appointments/${appointmentId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();

    throw new Error(
      error.error || "Failed to delete appointment"
    );
  }

  return true;
}