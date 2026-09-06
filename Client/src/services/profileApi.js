import api from "./api";

export const getProfile = () => api.get("/profile/me");
export const updateProfile = (payload) => api.patch("/profile/me", payload);
