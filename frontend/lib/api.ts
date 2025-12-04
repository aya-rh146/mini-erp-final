// frontend/lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

const DEFAULT_TIMEOUT = process.env.NODE_ENV === "development" ? 90_000 : 15_000;

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout = DEFAULT_TIMEOUT
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: "include",
    });
    clearTimeout(timer);
    return response;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw err;
  }
};

export const api = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_URL.replace(/\/+$/, "")}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;

  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers);

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const response = await fetchWithTimeout(url, {
    ...options,
    method: options.method || "GET",
    headers,
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch {}
    throw new Error(message);
  }

  if (response.status === 204 || response.status === 201) return {};

  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return text;
  }
};