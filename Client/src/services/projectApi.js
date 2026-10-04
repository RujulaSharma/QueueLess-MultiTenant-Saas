import api from "./api";

// Project API methods
export const getProjects = async () => {
  const response = await api.get("/projects");
  return response.data;
};

export const getProjectDashboard = async () => {
  const response = await api.get("/projects/dashboard");
  return response.data;
};

export const getProjectById = async (id) => {
  const response = await api.get(`/projects/${id}`);
  return response.data;
};

export const createProject = async (data) => {
  const response = await api.post("/projects", data);
  return response.data;
};

export const updateProject = async (id, data) => {
  const response = await api.put(`/projects/${id}`, data);
  return response.data;
};

export const deleteProject = async (id) => {
  const response = await api.delete(`/projects/${id}`);
  return response.data;
};

export const addProjectMember = async (projectId, data) => {
  const response = await api.post(`/projects/${projectId}/members`, data);
  return response.data;
};

export const removeProjectMember = async (projectId, userId) => {
  const response = await api.delete(`/projects/${projectId}/members/${userId}`);
  return response.data;
};

export const getCollaborators = async () => {
  const response = await api.get("/projects/collaborators");
  return response.data;
};

// Task API methods
export const getTasks = async (projectId, params = {}) => {
  const response = await api.get("/tasks", {
    params: { projectId, ...params },
  });
  return response.data;
};

export const getTaskById = async (id) => {
  const response = await api.get(`/tasks/${id}`);
  return response.data;
};

export const createTask = async (data) => {
  const response = await api.post("/tasks", data);
  return response.data;
};

export const updateTask = async (id, data) => {
  const response = await api.put(`/tasks/${id}`, data);
  return response.data;
};

export const updateTaskStatus = async (id, status, expectedVersion) => {
  const response = await api.patch(`/tasks/${id}/status`, {
    status,
    expectedVersion,
  });
  return response.data;
};

export const assignTask = async (id, assignedTo, expectedVersion) => {
  const response = await api.patch(`/tasks/${id}/assign`, {
    assignedTo,
    expectedVersion,
  });
  return response.data;
};

export const addTaskComment = async (taskId, text) => {
  const response = await api.post(`/tasks/${taskId}/comments`, { text });
  return response.data;
};

export const addTaskAttachment = async (taskId, attachment) => {
  const response = await api.post(`/tasks/${taskId}/attachments`, attachment);
  return response.data;
};

export const deleteTaskAttachment = async (taskId, attachmentId) => {
  const response = await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
  return response.data;
};

export const deleteTask = async (id) => {
  const response = await api.delete(`/tasks/${id}`);
  return response.data;
};
