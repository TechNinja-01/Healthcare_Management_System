import { useEffect, useState } from "react";

import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import DashboardLayout from "../layout/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { getAdmins } from "../api/adminApi";
import { getDoctors } from "../api/doctorApi";
import { getPatients } from "../api/patientApi";
import { getApiData, getErrorMessage } from "../utils/apiHelpers";

function AdminDashboard() {
  const [counts, setCounts] = useState({ doctors: "—", patients: "—", admins: "—" });
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getDoctors(), getPatients(), getAdmins()])
      .then(([docRes, patRes, admRes]) => {
        setCounts({
          doctors: String((getApiData(docRes) || []).length),
          patients: String((getApiData(patRes) || []).length),
          admins: String((getApiData(admRes) || []).length),
        });
      })
      .catch((err) => setError(getErrorMessage(err, "Could not load dashboard stats")));
  }, []);

  return (
    <>
      {error && <div className="alert alert-error mb-4">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card title="Doctors" value={counts.doctors} />
        <Card title="Patients" value={counts.patients} />
        <Card title="Admins" value={counts.admins} />
      </div>
    </>
  );
}

function DoctorDashboard({ user }) {
  const profile = user?.profile;
  const [patientCount, setPatientCount] = useState("—");

  useEffect(() => {
    getPatients()
      .then((res) => setPatientCount(String((getApiData(res) || []).length)))
      .catch(() => setPatientCount("—"));
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <Card title="Doctor ID" value={profile?.id || "—"} />
      <Card title="Specialization" value={profile?.specialization || "—"} />
      <Card title="My Patients" value={patientCount} />
    </div>
  );
}

function PatientDashboard({ user }) {
  const profile = user?.profile;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      <Card title="Patient ID" value={profile?.id || "—"} />
      <Card title="Age" value={profile?.age ?? "—"} />
      <Card title="Disease" value={profile?.disease || "—"} />
      <Card title="Blood Group" value={profile?.blood_group || "—"} />
      <Card title="Assigned Doctor" value={profile?.doctor_id || "None"} />
    </div>
  );
}

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg-page)" }}>
        <p style={{ color: "var(--color-text-secondary)" }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome, ${user?.username}`}
        subtitle={`Role: ${user?.role}`}
      />

      {user?.role === "admin" && <AdminDashboard />}
      {user?.role === "doctor" && <DoctorDashboard user={user} />}
      {user?.role === "patient" && <PatientDashboard user={user} />}
    </DashboardLayout>
  );
}
