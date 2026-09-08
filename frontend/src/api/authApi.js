import apiClient, { clearTokens, setTokens } from "./apiClient";

export const login = async ({ username, password }) => {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  return apiClient.post("/auth/login", formData, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
};

export const getCurrentUser = () => apiClient.get("/auth/me");

export const refreshToken = (refreshTokenValue) =>
  apiClient.post("/auth/refresh", {
    refresh_token: refreshTokenValue,
  });

export const registerAdmin = (data) =>
  apiClient.post("/auth/register/admin", data);

export const registerDoctor = (data) =>
  apiClient.post("/auth/register/doctor", data);

export const registerPatient = (data) =>
  apiClient.post("/auth/register/patient", data);

export const logout = () => {
  clearTokens();
};

export { setTokens, clearTokens };
