import { useEffect, useState } from "react";

import {
    getRolesAndPermissions,
    updateRolePermissions,
} from "../../../api/permissionApi";


function RolePermissionTable() {

    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [rolePermissions, setRolePermissions] = useState({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);


    // =========================
    // LOAD DATA
    // =========================

    useEffect(() => {
        loadData();
    }, []);


    const loadData = async () => {

        try {

            const data = await getRolesAndPermissions();

            console.log("RBAC DATA:", data);

            setRoles(data.roles);
            setPermissions(data.permissions);


            // Convert:
            //
            // [
            //   { role_id: 1, permission_id: 1 },
            //   { role_id: 1, permission_id: 2 },
            //   { role_id: 2, permission_id: 6 }
            // ]
            //
            // into:
            //
            // {
            //   1: [1, 2],
            //   2: [6],
            //   3: []
            // }

            const map = {};

            data.roles.forEach((role) => {
                map[role.id] = [];
            });


            data.role_permissions.forEach((item) => {

                if (!map[item.role_id]) {
                    map[item.role_id] = [];
                }

                map[item.role_id].push(
                    item.permission_id
                );

            });


            setRolePermissions(map);

        } catch (error) {

            console.error(
                "Error loading roles:",
                error
            );

        } finally {

            setLoading(false);

        }
    };


    // =========================
    // CHECKBOX STATUS
    // =========================

    const isChecked = (
        roleId,
        permissionId
    ) => {

        return (
            rolePermissions[roleId]?.includes(
                permissionId
            ) ?? false
        );

    };


    // =========================
    // TOGGLE CHECKBOX
    // =========================

    const togglePermission = (
        roleId,
        permissionId
    ) => {

        setRolePermissions((prev) => {

            const current =
                prev[roleId] || [];

            if (
                current.includes(permissionId)
            ) {

                return {
                    ...prev,

                    [roleId]: current.filter(
                        (id) =>
                            id !== permissionId
                    ),
                };

            }


            return {
                ...prev,

                [roleId]: [
                    ...current,
                    permissionId,
                ],
            };

        });

    };


    // =========================
    // SELECT ALL
    // =========================

    const selectAll = (roleId) => {

        setRolePermissions((prev) => ({
            ...prev,

            [roleId]: permissions.map(
                (permission) =>
                    permission.id
            ),
        }));

    };


    // =========================
    // CLEAR ALL
    // =========================

    const clearAll = (roleId) => {

        setRolePermissions((prev) => ({
            ...prev,

            [roleId]: [],
        }));

    };


    // =========================
    // SAVE
    // =========================

    const savePermissions = async () => {

        try {

            setSaving(true);

            for (const role of roles) {

                await updateRolePermissions(
                    role.id,
                    rolePermissions[role.id] || []
                );

            }

            alert(
                "Permissions updated successfully!"
            );

        } catch (error) {

            console.error(
                "Save error:",
                error
            );

            alert(
                "Failed to update permissions"
            );

        } finally {

            setSaving(false);

        }
    };


    // =========================
    // LOADING
    // =========================

    if (loading) {

        return (
            <div className="flex min-h-[300px] items-center justify-center">

                <p className="text-gray-500">
                    Loading permissions...
                </p>

            </div>
        );

    }


    // =========================
    // TABLE
    // =========================

    return (

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">


            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-gray-200 p-6">

                <div>

                    <h1 className="text-2xl font-bold text-gray-800">
                        Role Permission Management
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Assign permissions to each role
                    </p>

                </div>


                <button
                    onClick={savePermissions}
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >

                    {saving
                        ? "Saving..."
                        : "Save Changes"}

                </button>

            </div>


            {/* TABLE */}

            <div className="overflow-x-auto">

                <table className="w-full border-collapse">


                    {/* TABLE HEADER */}

                    <thead>

                        <tr className="border-b bg-gray-50">


                            {/* Permission */}

                            <th className="min-w-[280px] px-6 py-4 text-left text-sm font-semibold text-gray-700">

                                Permission

                            </th>


                            {/* Roles */}

                            {roles.map((role) => (

                                <th
                                    key={role.id}
                                    className="min-w-[180px] px-6 py-4 text-center"
                                >

                                    <div className="flex flex-col items-center gap-2">

                                        <span className="text-sm font-bold capitalize text-gray-800">
                                            {role.name}
                                        </span>


                                        <div className="flex gap-3 text-xs">

                                            <button
                                                onClick={() =>
                                                    selectAll(
                                                        role.id
                                                    )
                                                }
                                                className="text-blue-600 hover:underline"
                                            >
                                                Select all
                                            </button>


                                            <button
                                                onClick={() =>
                                                    clearAll(
                                                        role.id
                                                    )
                                                }
                                                className="text-red-500 hover:underline"
                                            >
                                                Clear
                                            </button>

                                        </div>

                                    </div>

                                </th>

                            ))}

                        </tr>

                    </thead>


                    {/* TABLE BODY */}

                    <tbody>

                        {permissions.map(
                            (permission) => (

                                <tr
                                    key={permission.id}
                                    className="border-b hover:bg-gray-50"
                                >


                                    {/* Permission name */}

                                    <td className="px-6 py-4">

                                        <span className="font-medium text-gray-700">
                                            {permission.name}
                                        </span>

                                    </td>


                                    {/* Role checkboxes */}

                                    {roles.map((role) => (

                                        <td
                                            key={`${role.id}-${permission.id}`}
                                            className="px-6 py-4 text-center"
                                        >

                                            <input
                                                type="checkbox"

                                                checked={isChecked(
                                                    role.id,
                                                    permission.id
                                                )}

                                                onChange={() =>
                                                    togglePermission(
                                                        role.id,
                                                        permission.id
                                                    )
                                                }

                                                className="h-5 w-5 cursor-pointer accent-blue-600"
                                            />

                                        </td>

                                    ))}

                                </tr>

                            )
                        )}

                    </tbody>

                </table>

            </div>


            {/* FOOTER */}

            <div className="border-t border-gray-200 p-4 text-right">

                <button
                    onClick={savePermissions}
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >

                    {saving
                        ? "Saving..."
                        : "Save Changes"}

                </button>

            </div>

        </div>

    );
}


export default RolePermissionTable;