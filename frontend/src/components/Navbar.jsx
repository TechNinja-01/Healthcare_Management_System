import { useNavigate } from "react-router-dom";

import Button from "./Button";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header
      className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b"
      style={{ background: "#fff", borderColor: "var(--color-border)" }}
    >
      <div>
        <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
          Hospital Management
        </h1>
        {user && (
          <p className="text-sm mt-0.5 capitalize" style={{ color: "var(--color-text-secondary)" }}>
            {user.username} · {user.role}
          </p>
        )}
      </div>

      <Button variant="danger" onClick={handleLogout}>
        Logout
      </Button>
    </header>
  );
}
