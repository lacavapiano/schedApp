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

export async function completeAppointment(appointmentId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in");

  const response = await fetch(`${API_URL}/api/appointments/${appointmentId}/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to complete appointment");
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

export async function getSettings() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(
    `${API_URL}/api/settings`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();

    throw new Error(
      error.error || "Failed to fetch settings"
    );
  }

  return response.json();
}

export async function updateSettings(settingsData) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(
    `${API_URL}/api/settings`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(settingsData),
    }
  );

  if (!response.ok) {
    const error = await response.json();

    throw new Error(
      error.error || "Failed to update settings"
    );
  }

  return response.json();
}

export async function getGoogleStatus() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(
    `${API_URL}/api/google/status`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();

    throw new Error(
      error.error ||
        "Failed to fetch Google connection status"
    );
  }

  return response.json();
}

export async function connectGoogle() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(
    `${API_URL}/api/google/connect`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();

    throw new Error(
      error.error ||
        "Failed to start Google authorization"
    );
  }

  const data = await response.json();

  if (!data.auth_url) {
    throw new Error(
      "Google authorization URL was not returned"
    );
  }

  const width = 600;
  const height = 700;

  const left =
    window.screenX +
    (window.outerWidth - width) / 2;

  const top =
    window.screenY +
    (window.outerHeight - height) / 2;

  return window.open(
    data.auth_url,
    "google-calendar-auth",
    `width=${width},height=${height},left=${left},top=${top}`
  );
}

export async function getGoogleCalendars() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(
    `${API_URL}/api/google/calendars`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();

    throw new Error(
      error.error ||
        "Failed to fetch Google calendars"
    );
  }

  return response.json();
}

export async function getServiceTypes({ includeInactive = false } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in");
  const query = includeInactive ? "?include_inactive=true" : "";
  const response = await fetch(`${API_URL}/api/pricing/service-types${query}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch service types");
  }
  return response.json();
}

export async function createServiceType(serviceData) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in");
  const response = await fetch(`${API_URL}/api/pricing/service-types`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(serviceData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create service type");
  }
  return response.json();
}

export async function updateServiceType(serviceTypeId, serviceData) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in");
  const response = await fetch(`${API_URL}/api/pricing/service-types/${serviceTypeId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(serviceData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update service type");
  }
  return response.json();
}

export async function getClientDiscounts(clientId, { includeInactive = false } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in");
  const params = new URLSearchParams();
  if (clientId) params.set("client_id", clientId);
  if (includeInactive) params.set("include_inactive", "true");
  const suffix = params.size ? `?${params.toString()}` : "";
  const response = await fetch(`${API_URL}/api/pricing/client-discounts${suffix}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch client discounts");
  }
  return response.json();
}

export async function createClientDiscount(discountData) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in");
  const response = await fetch(`${API_URL}/api/pricing/client-discounts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(discountData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create client discount");
  }
  return response.json();
}

export async function updateClientDiscount(discountId, discountData) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in");
  const response = await fetch(`${API_URL}/api/pricing/client-discounts/${discountId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(discountData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update client discount");
  }
  return response.json();
}

export async function getAppointmentCharges(appointmentId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in");
  const response = await fetch(`${API_URL}/api/pricing/appointment-charges?appointment_id=${encodeURIComponent(appointmentId)}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch appointment charges");
  }
  return response.json();
}

export async function saveAppointmentCharges(appointmentId, charges) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in");
  const response = await fetch(`${API_URL}/api/pricing/appointment-charges`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ appointment_id: appointmentId, charges }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to calculate appointment pricing");
  }
  return response.json();
}
