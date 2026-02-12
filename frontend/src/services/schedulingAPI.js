import { api } from "./api";

export const suggestSlots = (payload) => api.post("/scheduling/suggest", payload);
