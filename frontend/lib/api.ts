// frontend/lib/api.ts
const API_URL = "http://localhost:3002";

export const api = async (endpoint: string, options: RequestInit = {}) => {
  try {
    // Ne pas ajouter Content-Type pour FormData
    const isFormData = options.body instanceof FormData;
    const headers: HeadersInit = {
      ...options.headers,
    };
    
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: "include", // important ba9i cookies yemchiw
      headers,
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const error = await res.json();
        // Inclure le hint si disponible pour des messages d'erreur plus utiles
        const errorMessage = error.hint 
          ? `${error.error || "Erreur serveur"}\n\n💡 ${error.hint}`
          : error.error || "Erreur serveur";
        throw new Error(errorMessage);
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