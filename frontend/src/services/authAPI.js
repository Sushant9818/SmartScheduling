import { api } from "./api";

export const registerUser = (payload) => api.post("/auth/register", payload);

// ✅ AuthContext expects `login`
export const login = (payload) => api.post("/auth/login", payload);

// ✅ AuthContext expects `logout`
export const logout = () => api.post("/auth/logout");

// (optional admin-only)
export const registerAdminUser = (payload) => api.post("/auth/register-admin", payload);
