import { useAuth } from "../context/AuthContext";

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission) =>
    Boolean(user?.permissions?.includes(permission));

  return { user, hasPermission };
}
