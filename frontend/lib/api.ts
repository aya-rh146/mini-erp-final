// frontend/lib/api.ts
const API_URL = "http://localhost:3002";

export const api = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: "include", // important ba9i cookies yemchiw
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const error = await res.json();
        throw new Error(error.error || "Erreur serveur");
      } else {
        const text = await res.text();
        throw new Error(`Erreur serveur: ${res.status} ${res.statusText}`);
      }
    }

    return res.json();
  } catch (error: any) {
    // Gérer les erreurs réseau (Failed to fetch, etc.)
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur le port 3002.");
    }
    throw error;
  }
};