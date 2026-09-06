import api from "./api";

export const getAdminDepartments = () => api.get("/admin/departments");
export const createDepartment = (payload) => api.post("/admin/departments", payload);
export const updateDepartment = (id, payload) => api.patch(`/admin/departments/${id}`, payload);
export const toggleDepartment = (id) => api.patch(`/admin/departments/${id}/toggle`);

export const getAdminDoctors = () => api.get("/admin/doctors");
export const createDoctor = (payload) => api.post("/admin/doctors", payload);
export const updateDoctor = (id, payload) => api.patch(`/admin/doctors/${id}`, payload);
