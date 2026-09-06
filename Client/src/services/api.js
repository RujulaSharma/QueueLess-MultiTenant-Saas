import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("queueless_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("queueless_token");
      localStorage.removeItem("queueless_user");
    }
    return Promise.reject(error);
  }
);
