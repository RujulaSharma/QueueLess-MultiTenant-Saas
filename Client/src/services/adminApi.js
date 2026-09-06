import api from "./api";

export const getAdminServices = () => api.get("/admin/services");

export const createAdminService = (payload) =>
  api.post("/admin/services", payload);

export const updateAdminService = (id, payload) =>
  api.patch(`/admin/services/${id}`, payload);

export const toggleAdminService = (id) =>
  api.patch(`/admin/services/${id}/toggle`);
