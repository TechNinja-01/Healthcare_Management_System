import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export const getRoles = async () => {
    const response = await axios.get(`${API_URL}/roles`);
    return response.data;
};

export const getPermissions = async () => {
    const response = await axios.get(`${API_URL}/permissions`);
    return response.data;
};

export const getRolePermissions = async () => {
    const response = await axios.get(`${API_URL}/roles/permissions`);
    return response.data;
};

export const updateRolePermissions = async (data) => {
    const response = await axios.put(
        `${API_URL}/roles/permissions`,
        data
    );

    return response.data;
};