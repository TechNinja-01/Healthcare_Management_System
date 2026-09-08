import { useEffect, useState } from "react";

import {
    getUsers,
    getRolesAndPermissions,
    getUserPermissions,
    updateUserPermissions,
} from "../../../api/userPermissionApi";


function UserPermissionTable() {

    // ==========================================
    // STATE
    // ==========================================

    const [users, setUsers] = useState([]);

    const [permissions, setPermissions] = useState([]);

    const [selectedUser, setSelectedUser] = useState(null);

    /*
        permissionOverrides structure:

        {
            1: true,
            2: false
        }

        1 -> explicitly ALLOW
        2 -> explicitly DENY

        If permission ID does not exist here:
        -> DEFAULT
        -> follow role permission
    */
    const [permissionOverrides, setPermissionOverrides] =
        useState({});

    const [loading, setLoading] = useState(true);

    const [loadingUser, setLoadingUser] = useState(false);

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");


    // ==========================================
    // INITIAL LOAD
    // ==========================================

    useEffect(() => {
        loadInitialData();
    }, []);


    const loadInitialData = async () => {

        console.log("1. loadInitialData started");

        try {

            setLoading(true);
            setError("");

            console.log("2. Calling getUsers...");

            const usersResponse = await getUsers();

            console.log(
                "3. Users response:",
                usersResponse
            );


            let usersList = [];

            if (Array.isArray(usersResponse)) {

                usersList = usersResponse;

            } else if (
                Array.isArray(usersResponse?.data)
            ) {

                usersList = usersResponse.data;

            } else if (
                Array.isArray(usersResponse?.users)
            ) {

                usersList = usersResponse.users;

            } else if (
                Array.isArray(
                    usersResponse?.data?.users
                )
            ) {

                usersList =
                    usersResponse.data.users;

            }


            setUsers(usersList);


            console.log(
                "4. Calling getRolesAndPermissions..."
            );


            const rolesResponse =
                await getRolesAndPermissions();


            console.log(
                "5. Roles response:",
                rolesResponse
            );


            const permissionsList =
                rolesResponse?.permissions ??
                rolesResponse?.data?.permissions ??
                [];


            setPermissions(
                permissionsList
            );


            console.log(
                "6. Data loaded successfully"
            );

        } catch (error) {

            console.error(
                "7. Failed to load data:",
                error
            );

            setError(
                error.response?.data?.detail ||
                "Failed to load users or permissions."
            );

        } finally {

            console.log(
                "8. Setting loading to false"
            );

            setLoading(false);
        }
    };


    // ==========================================
    // SELECT USER
    // ==========================================

    const selectUser = async (user) => {

    try {

        setSelectedUser(user);

        setLoadingUser(true);

        setError("");

        const response =
            await getUserPermissions(user.id);

        console.log(
            "USER PERMISSIONS:",
            response
        );

        const userPermissions =
            response?.permissions ?? [];

        const overrides = {};

        userPermissions.forEach(
            (permission) => {

                if (
                    permission.user_override !== null &&
                    permission.user_override !== undefined
                ) {

                    overrides[permission.id] =
                        permission.user_override;
                }

            }
        );

        console.log(
            "PERMISSION OVERRIDES:",
            overrides
        );

        setPermissionOverrides(
            overrides
        );

    } catch (error) {

        console.error(
            "Failed to load user permissions:",
            error
        );

        console.error(
            "Backend response:",
            error.response?.data
        );

        setError(
            error.response?.data?.detail ||
            "Failed to load user permissions."
        );

        setPermissionOverrides({});

    } finally {

        setLoadingUser(false);
    }
};


    // ==========================================
    // CLOSE MODAL
    // ==========================================

    const closeModal = () => {

        setSelectedUser(null);

        setPermissionOverrides({});

        setError("");

    };


    // ==========================================
    // CHANGE PERMISSION OVERRIDE
    // ==========================================

    const changePermissionOverride = (
        permissionId,
        value
    ) => {

        setPermissionOverrides(
            (previous) => {

                const updated = {
                    ...previous,
                };


                /*
                    DEFAULT

                    Remove the override.

                    User will follow role.
                */

                if (value === "default") {

                    delete updated[
                        permissionId
                    ];

                }


                /*
                    ALLOW

                    Explicit user override.
                */

                else if (value === "allow") {

                    updated[
                        permissionId
                    ] = true;

                }


                /*
                    DENY

                    Explicit user override.
                */

                else if (value === "deny") {

                    updated[
                        permissionId
                    ] = false;

                }


                return updated;

            }
        );

    };


    // ==========================================
    // SAVE
    // ==========================================

    const savePermissions = async () => {

        if (!selectedUser) {
            return;
        }


        try {

            setSaving(true);

            setError("");


            /*
                Convert:

                {
                    3: false,
                    4: true
                }

                into:

                [
                    {
                        permission_id: 3,
                        allowed: false
                    },
                    {
                        permission_id: 4,
                        allowed: true
                    }
                ]
            */

            const permissionsToSave =
                Object.entries(
                    permissionOverrides
                ).map(
                    ([permissionId, allowed]) => ({

                        permission_id:
                            Number(permissionId),

                        allowed: allowed,

                    })
                );


            console.log(
                "SENDING TO BACKEND:",
                {
                    permissions:
                        permissionsToSave
                }
            );


            const response =
                await updateUserPermissions(
                    selectedUser.id,
                    permissionsToSave
                );


            console.log(
                "UPDATE RESPONSE:",
                response
            );


            alert(
                "Permissions updated successfully!"
            );


            closeModal();


        } catch (error) {

            console.error(
                "Failed to update permissions:",
                error
            );


            console.error(
                "Backend error:",
                error.response?.data
            );


            setError(
                error.response?.data?.detail ||
                "Failed to update permissions."
            );

        } finally {

            setSaving(false);

        }

    };


    // ==========================================
    // LOADING
    // ==========================================

    if (loading) {

        return (

            <div className="flex min-h-[400px] items-center justify-center">

                <div className="text-center">

                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600">
                    </div>

                    <p className="text-gray-500">
                        Loading users...
                    </p>

                </div>

            </div>

        );

    }


    // ==========================================
    // MAIN UI
    // ==========================================

    return (

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">


            {/* =================================
                HEADER
            ================================= */}

            <div className="border-b border-gray-200 px-6 py-5">

                <h1 className="text-2xl font-bold text-gray-800">

                    User Permission Management

                </h1>


                <p className="mt-1 text-sm text-gray-500">

                    Manage permissions for individual users

                </p>

            </div>


            {/* =================================
                ERROR
            ================================= */}

            {error && (

                <div className="mx-6 mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">

                    {error}

                </div>

            )}


            {/* =================================
                USERS TABLE
            ================================= */}

            <div className="overflow-x-auto">

                <table className="w-full">

                    <thead>

                        <tr className="border-b bg-gray-50">

                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">

                                User

                            </th>


                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">

                                Username

                            </th>


                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">

                                Role

                            </th>


                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">

                                Action

                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {users.length === 0 ? (

                            <tr>

                                <td
                                    colSpan="4"
                                    className="px-6 py-10 text-center text-gray-500"
                                >

                                    No users found.

                                </td>

                            </tr>

                        ) : (

                            users.map((user) => (

                                <tr
                                    key={user.id}
                                    className="border-b last:border-0 hover:bg-gray-50"
                                >

                                    {/* USER */}

                                    <td className="px-6 py-4">

                                        <div className="font-medium text-gray-800">

                                            {user.name ||
                                                user.username ||
                                                "Unknown"}

                                        </div>


                                        <div className="text-xs text-gray-400">

                                            {user.id}

                                        </div>

                                    </td>


                                    {/* USERNAME */}

                                    <td className="px-6 py-4 text-sm text-gray-600">

                                        {user.username ||
                                            "-"}

                                    </td>


                                    {/* ROLE */}

                                    <td className="px-6 py-4">

                                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium capitalize text-blue-700">

                                            {user.role ||
                                                "-"}

                                        </span>

                                    </td>


                                    {/* ACTION */}

                                    <td className="px-6 py-4 text-right">

                                        <button
                                            onClick={() =>
                                                selectUser(
                                                    user
                                                )
                                            }
                                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                                        >

                                            Manage

                                        </button>

                                    </td>

                                </tr>

                            ))

                        )}

                    </tbody>

                </table>

            </div>


            {/* =================================
                MODAL
            ================================= */}

            {selectedUser && (

                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">


                    <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">


                        {/* =================================
                            MODAL HEADER
                        ================================= */}

                        <div className="flex items-center justify-between border-b px-6 py-5">

                            <div>

                                <h2 className="text-xl font-bold text-gray-800">

                                    Permissions for{" "}

                                    {selectedUser.username}

                                </h2>


                                <p className="mt-1 text-sm text-gray-500">

                                    User ID:{" "}

                                    {selectedUser.id}

                                    {" • "}

                                    Role:{" "}

                                    <span className="capitalize">

                                        {selectedUser.role}

                                    </span>

                                </p>

                            </div>


                            <button
                                onClick={closeModal}
                                className="text-2xl leading-none text-gray-400 hover:text-gray-700"
                            >

                                ×

                            </button>

                        </div>


                        {/* =================================
                            MODAL BODY
                        ================================= */}

                        {loadingUser ? (

                            <div className="flex h-80 items-center justify-center">

                                <div className="text-center">

                                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600">
                                    </div>

                                    <p className="text-gray-500">

                                        Loading permissions...

                                    </p>

                                </div>

                            </div>

                        ) : (

                            <div className="overflow-y-auto px-6 py-5">


                                {/* INFORMATION */}

                                <div className="mb-5 rounded-lg bg-blue-50 px-4 py-3">

                                    <p className="text-sm font-medium text-blue-800">

                                        Permission Override

                                    </p>

                                    <p className="mt-1 text-xs text-blue-600">

                                        Default follows the user's role.
                                        Allow or Deny creates a direct
                                        override for this user.

                                    </p>

                                </div>


                                {/* PERMISSIONS */}

                                {permissions.length === 0 ? (

                                    <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">

                                        <p className="text-gray-500">

                                            No permissions found.

                                        </p>

                                    </div>

                                ) : (

                                    <div className="space-y-3">

                                        {permissions.map(
                                            (permission) => {

                                                const override =
                                                    permissionOverrides[
                                                        permission.id
                                                    ];


                                                const currentValue =
                                                    override ===
                                                        undefined
                                                        ? "default"
                                                        : override
                                                            ? "allow"
                                                            : "deny";


                                                /*
                                                    Effective permission
                                                    after considering override.
                                                */

                                                const effective =
                                                    override ===
                                                        undefined
                                                        ? permission.role_allowed
                                                        : override;


                                                return (

                                                    <div
                                                        key={
                                                            permission.id
                                                        }
                                                        className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50"
                                                    >

                                                        {/* LEFT */}

                                                        <div className="min-w-0">

                                                            <p className="font-medium text-gray-700">

                                                                {
                                                                    permission.name
                                                                }

                                                            </p>


                                                            <div className="mt-2 flex flex-wrap gap-2 text-xs">

                                                                {/* ROLE */}

                                                                <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">

                                                                    Role:{" "}

                                                                    {
                                                                        permission.role_allowed
                                                                            ? "Allow"
                                                                            : "Deny"
                                                                    }

                                                                </span>


                                                                {/* OVERRIDE */}

                                                                <span
                                                                    className={`rounded-full px-2 py-1 ${
                                                                        override ===
                                                                            undefined
                                                                            ? "bg-gray-100 text-gray-600"
                                                                            : override
                                                                                ? "bg-green-100 text-green-700"
                                                                                : "bg-red-100 text-red-700"
                                                                    }`}
                                                                >

                                                                    Override:{" "}

                                                                    {
                                                                        override ===
                                                                            undefined
                                                                            ? "None"
                                                                            : override
                                                                                ? "Allow"
                                                                                : "Deny"
                                                                    }

                                                                </span>


                                                                {/* EFFECTIVE */}

                                                                <span
                                                                    className={`rounded-full px-2 py-1 ${
                                                                        effective
                                                                            ? "bg-green-100 text-green-700"
                                                                            : "bg-red-100 text-red-700"
                                                                    }`}
                                                                >

                                                                    Effective:{" "}

                                                                    {
                                                                        effective
                                                                            ? "Allow"
                                                                            : "Deny"
                                                                    }

                                                                </span>

                                                            </div>

                                                        </div>


                                                        {/* SELECT */}

                                                        <select
                                                            value={
                                                                currentValue
                                                            }

                                                            onChange={(e) =>
                                                                changePermissionOverride(
                                                                    permission.id,
                                                                    e.target.value
                                                                )
                                                            }

                                                            className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                        >

                                                            <option value="default">

                                                                Default

                                                            </option>


                                                            <option value="allow">

                                                                Allow

                                                            </option>


                                                            <option value="deny">

                                                                Deny

                                                            </option>

                                                        </select>

                                                    </div>

                                                );

                                            }
                                        )}

                                    </div>

                                )}

                            </div>

                        )}


                        {/* =================================
                            FOOTER
                        ================================= */}

                        <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">

                            <button
                                onClick={closeModal}
                                disabled={saving}
                                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                            >

                                Cancel

                            </button>


                            <button
                                onClick={savePermissions}
                                disabled={
                                    saving ||
                                    loadingUser
                                }
                                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >

                                {saving
                                    ? "Saving..."
                                    : "Save Changes"}

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

}


export default UserPermissionTable;