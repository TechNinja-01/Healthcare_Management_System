import DashboardLayout from "../layout/DashboardLayout";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  const profile = user?.profile;

  return (
    <DashboardLayout>
      <PageHeader title="Profile" subtitle="Your account and role information" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        <Card title="Username" value={user?.username || "—"} />
        <Card title="Role" value={user?.role || "—"} />
        <Card title="Email" value={user?.email || "—"} />
        <Card title="User ID" value={user?.id || "—"} />
      </div>

      {profile && (
        <div className="card mt-6 max-w-3xl text-left">
          <h2 className="section-heading">Profile Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {Object.entries(profile).map(([key, value]) => (
              <p key={key}>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  {key.replace(/_/g, " ")}:{" "}
                </span>
                <span className="font-medium">{String(value ?? "—")}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
