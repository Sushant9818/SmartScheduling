import { api } from "./api";

export const listClients = () => api.get("/clients");
export const createClient = (payload) => api.post("/clients", payload);
export const getClient = (id) => api.get(`/clients/${id}`);
export const updateClientPreferences = (id, preferences) =>
  api.put(`/clients/${id}/preferences`, { preferences });

