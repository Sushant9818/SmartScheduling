import { api } from "./api";

export const listTherapists = () => api.get("/therapists");
export const createTherapist = (payload) => api.post("/therapists", payload);
export const getTherapist = (id) => api.get(`/therapists/${id}`);
export const setAvailability = (id, weeklyAvailability) =>
  api.put(`/therapists/${id}/availability`, { weeklyAvailability });
export const addTimeOff = (id, payload) =>
  api.post(`/therapists/${id}/time-off`, payload);

