import { useAuth } from "../context/AuthContext";
import DoctorAppointments from "./DoctorAppointment";
import PatientAppointments from "./PatientAppointments";

// /appointments shows the right view for whoever is logged in.
export default function Appointments() {
  const { user } = useAuth();

  if (user?.role === "patient") {
    return <PatientAppointments />;
  }

  return <DoctorAppointments />;
}
