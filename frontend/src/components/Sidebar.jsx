import { NavLink } from "react-router-dom";

import { usePermissions } from "../hooks/usePermissions";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    path: "/dashboard",
    roles: ["admin", "doctor", "patient"],
  },
  {
    name: "Doctors",
    path: "/doctors",
    roles: ["admin"],
    permission: "doctor.read",
  },
  {
    name: "Patients",
    path: "/patients",
    roles: ["admin", "doctor"],
    permission: "patient.read",
  },
  {
    name: "Find Doctors",
    path: "/patient/doctors",
    roles: ["patient"],
  },
  {
    name: "View Appointments",
    path: "/appointments",
    roles: ["doctor"],
    permission: "doctor.read",
  },
  {
    name: "My Availability",
    path: "/availability",
    roles: ["doctor"],
    permission: "doctor.read",
  },
  {
    name: "My Profile",
    path: "/patients",
    roles: ["patient"],
    permission: "patient.read",
  },
  {
    name: "Admins",
    path: "/admins",
    roles: ["admin"],
    permission: "admin.read",
  },
  {
    name: "Profile",
    path: "/profile",
    roles: ["admin", "doctor", "patient"],
  },
];

export default function Sidebar() {
  const { user, hasPermission } = usePermissions();

  const menus = NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(user?.role)) {
      return false;
    }
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }
    return true;
  });

  return (
    <aside
      className="w-64 min-h-screen shrink-0 flex flex-col"
      style={{ background: "var(--color-sidebar)" }}
    >
      <div className="px-6 py-5 border-b border-slate-700">
        <p className="text-xl font-bold text-white tracking-tight">HMS</p>
        <p className="text-xs text-slate-400 mt-1">Healthcare Management</p>
      </div>

      <nav className="flex-1 py-4">
        {menus.map((menu) => (
          <NavLink
            key={`${menu.path}-${menu.name}`}
            to={menu.path}
            className={({ isActive }) =>
              `block px-5 py-2.5 mx-2 rounded-lg text-sm font-medium transition ${isActive
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            {menu.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
