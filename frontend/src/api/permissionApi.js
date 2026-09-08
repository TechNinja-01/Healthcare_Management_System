import axios from "axios";

const API_URL = "http://localhost:8000";


export const getRolesAndPermissions = async () => {

    const response = await axios.get(
        `${API_URL}/roles/all`
    );

    return response.data;
};


export const updateRolePermissions = async (
    roleId,
    permissionIds
) => {

    const response = await axios.put(
        `${API_URL}/roles/${roleId}/permissions`,
        {
            permission_ids: permissionIds,
        }
    );

    return response.data;
};