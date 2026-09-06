import api from "./api";

// Backend currently stores bookable hospital departments in the legacy
// "service" model. The UI intentionally calls them departments.
export const getHospitals = () => api.get("/businesses");
export const getDepartments = (hospitalId) =>
  api.get(`/businesses/${hospitalId}/departments`);
export const getDoctorsByDepartment = (departmentId) =>
  api.get(`/doctors/public`, { params: { departmentId } });
export const getDoctorAvailability = (doctorId, date) =>
  api.get(`/doctors/availability`, { params: { doctorId, date } });

export const getBusinesses = getHospitals;
export const getBusinessServices = getDepartments;

export const joinQueue = (payload) => api.post("/queue/join", payload);
export const getMyQueue = () => api.get("/queue/my");
export const cancelQueue = (queueId) => api.patch(`/queue/${queueId}/cancel`);

export const getMyAppointments = () => api.get("/appointments/my");

export const createAppointment = ({ hospitalId, departmentId, doctorId, ...rest }) =>
  api.post("/appointments", {
    businessId: hospitalId,
    departmentId,
    doctorId,
    ...rest,
  });

export const cancelAppointment = (id) => api.patch(`/appointments/${id}/cancel`);

export const getPrediction = (hospitalId, departmentId, queueId) =>
  api.get("/predictions/wait-time", {
    params: { businessId: hospitalId, departmentId, queueId },
  });

export const checkInAppointment = (appointmentId) =>
  api.patch(`/appointments/${appointmentId}/check-in`);
