// frontend/lib/api.ts

export const api = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const res = await fetch(`/api${endpoint}`, {   
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const error = await res.json();
        throw new Error(error.erreur || error.message || "Erreur serveur");
      }
      const text = await res.text();
      throw new Error(`Erreur ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    if (error.message.includes("fetch")) {
      throw new Error("Impossible de contacter le backend. Vérifiez qu'il tourne sur le port 3001");
    }
    throw error;
  }
};