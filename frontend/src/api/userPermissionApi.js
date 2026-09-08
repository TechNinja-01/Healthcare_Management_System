import axios from "axios";

const API_URL = "http://localhost:8000";


// ==========================================
// GET ALL USERS
// ==========================================

export const getUsers = async () => {

    console.log("GET USERS API CALLED");

    try {

        const response = await axios.get(
            `${API_URL}/users`
        );

        console.log(
            "GET USERS SUCCESS:",
            response.data
        );

        return response.data;

    } catch (error) {

        console.error(
            "GET USERS ERROR:",
            error.response?.status,
            error.response?.data
        );

        throw error;
    }
};


// ==========================================
// GET ROLES + ALL PERMISSIONS
// ==========================================

export const getRolesAndPermissions = async () => {

    try {

        const response = await axios.get(
            `${API_URL}/roles/all`
        );

        console.log(
            "GET ROLES/PERMISSIONS SUCCESS:",
            response.data
        );

        return response.data;

    } catch (error) {

        console.error(
            "GET ROLES/PERMISSIONS ERROR:",
            error.response?.status,
            error.response?.data
        );

        throw error;
    }
};


// ==========================================
// GET DIRECT PERMISSIONS OF ONE USER
// ==========================================

export const getUserPermissions = async (userId) => {

    try {

        console.log(
            "GET USER PERMISSIONS:",
            userId
        );

        const response = await axios.get(
            `${API_URL}/users/${userId}/permissions`
        );

        console.log(
            "GET USER PERMISSIONS SUCCESS:",
            response.data
        );

        return response.data;

    } catch (error) {

        console.error(
            "GET USER PERMISSIONS ERROR:",
            error.response?.status,
            error.response?.data
        );

        throw error;
    }
};


// ==========================================
// UPDATE DIRECT PERMISSIONS OF ONE USER
// ==========================================

export const updateUserPermissions = async (
    userId,
    permissions
) => {

    console.log(
        "========== UPDATE USER PERMISSIONS =========="
    );

    console.log(
        "USER ID:",
        userId
    );

    console.log(
        "PERMISSIONS:",
        permissions
    );


    try {

        const response = await axios.put(
            `${API_URL}/users/${userId}/permissions`,
            {
                permissions: permissions,
            }
        );


        console.log(
            "UPDATE USER PERMISSIONS SUCCESS:",
            response.data
        );


        return response.data;

    } catch (error) {

        console.error(
            "UPDATE USER PERMISSIONS ERROR:"
        );

        console.error(
            "STATUS:",
            error.response?.status
        );

        console.error(
            "DATA:",
            error.response?.data
        );

        console.error(
            "MESSAGE:",
            error.message
        );
        throw error;
    }
};
