import { api } from "./api";
export const listSessions = () => api.get("/sessions");
export const bookSession = (payload) => api.post("/sessions/book", payload);
export const cancelSession = (id) => api.patch(`/sessions/${id}/cancel`);
export const rescheduleSession = (id, payload) => api.patch(`/sessions/${id}/reschedule`, payload);

