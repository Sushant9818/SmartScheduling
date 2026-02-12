import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true // ✅ needed for refreshToken cookie
});

// Attach access token from localStorage
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401 and retry once
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // If unauthorized and we haven't retried yet
    if (error?.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      try {
        // Ask backend to refresh access token (uses httpOnly cookie)
        const refreshRes = await api.post("/auth/refresh");
        const newToken = refreshRes.data?.token;

        if (newToken) {
          localStorage.setItem("token", newToken);

          // Update header and retry original request
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${newToken}`;

          return api(original);
        }
      } catch (e2) {
        // Refresh failed -> clear auth & force login
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
