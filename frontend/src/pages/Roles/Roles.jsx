import RolePermissionTable from "../../features/rbac/components/RolePermissionTable";

function Roles() {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-7xl">
                <RolePermissionTable />
            </div>
        </div>
    );
}

export default Roles;