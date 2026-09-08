import UserPermissionTable
    from "../../features/rbac/components/UserPermissionTable";


function UserPermissions() {

    return (

        <div className="min-h-screen bg-gray-50 p-6">

            <div className="mx-auto max-w-7xl">

                <UserPermissionTable />

            </div>

        </div>

    );

}


export default UserPermissions;