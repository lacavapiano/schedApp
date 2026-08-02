const API_URL = import.meta.env.VITE_API_URL;

export async function getApiStatus() {
    const response = await fetch(`${API_URL}/api`);

    if (!response.ok) {
        throw new Error("Failed to connect to API");
    }

    return response.json();
}

export async function getClients() {
  const response = await fetch(`${API_URL}/api/clients`);

  if (!response.ok) {
    throw new Error("Failed to fetch clients");
  }

  return response.json();
}