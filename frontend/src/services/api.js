import axios from "axios";

// Same base URL as lib/config.ts (VITE_API_URL / NEXT_PUBLIC_API_BASE_URL)
const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_VITE_API_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000/api");

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error?.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      try {
        const refreshRes = await api.post("/auth/refresh");
        const newToken = refreshRes.data?.token;

        if (newToken) {
          localStorage.setItem("token", newToken);
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);
