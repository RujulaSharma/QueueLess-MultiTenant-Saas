import api from "./api";

export const getBusinessDashboard = () => api.get("/business/dashboard");
export const getBusinessQueue = (businessId) => api.get(`/queue/business/${businessId}`);
export const getBusinessAppointments = (businessId) => api.get(`/appointments/business/${businessId}`);
export const updateAppointmentStatus = (id, status) => api.patch(`/appointments/${id}/status`, { status });
export const getBusinessAnalytics = (days = 30) =>
  api.get("/analytics/dashboard", { params: { days } });

export const callNext = (businessId, serviceId) =>
  api.post("/staff/queue/next", { businessId, serviceId });

export const startServing = (queueId) =>
  api.patch(`/staff/queue/${queueId}/start`);

export const completeService = (queueId) =>
  api.patch(`/staff/queue/${queueId}/complete`);

export const skipQueue = (queueId) =>
  api.patch(`/staff/queue/${queueId}/skip`);

export const markNoShow = (queueId) =>
  api.patch(`/staff/queue/${queueId}/no-show`);
