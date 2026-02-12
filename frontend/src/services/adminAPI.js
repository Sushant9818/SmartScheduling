import { api } from "./api";
export const getSummary = () => api.get("/admin/summary");
