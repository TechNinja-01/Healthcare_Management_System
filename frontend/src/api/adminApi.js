import apiClient from "./apiClient";

export const getAdmins = () => apiClient.get("/admin/");

export const createAdmin = (data) => apiClient.post("/admin/", data);

export const getAdmin = (adminId) => apiClient.get(`/admin/${adminId}`);

export const updateAdmin = (adminId, data) =>
  apiClient.put(`/admin/${adminId}`, data);

export const deleteAdmin = (adminId) =>
  apiClient.delete(`/admin/${adminId}`);
