import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import GuestRoute from "../components/GuestRoute";
import ProtectedRoute from "../components/ProtectedRoute";

import Admins from "../pages/Admins";
import Dashboard from "../pages/Dashboard";
import Doctors from "../pages/Doctors";
import Login from "../pages/Login";
import Patients from "../pages/Patients";
import Profile from "../pages/Profile";
import Register from "../pages/Register";
import Roles from "../pages/Roles/Roles";
import UserPermissions from "../pages/UserPermissions/UserPermission";
import DoctorAppointments from "../pages/DoctorAppointment";
import DoctorAvailability from "../pages/DoctorAvailability"
 
import PatientDoctors from "../pages/PatientDoctors";
import DoctorDetails from "../pages/DoctorDetails";
import Consultation from "../pages/Consultation";



export default function AppRoutes() {
  return (
    <BrowserRouter>

      <Routes>


        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />




        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />

        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />




        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctors"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Doctors />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patients"
          element={
            <ProtectedRoute
              allowedRoles={[
                "admin",
                "doctor",
                "patient",
              ]}
            >
              <Patients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admins"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Admins />
            </ProtectedRoute>
          }
        />



        <Route
          path="/patient/doctors"
          element={
            <ProtectedRoute allowedRoles={["patient"]}>
              <PatientDoctors />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patient/doctors/:doctorId"
          element={
            <ProtectedRoute allowedRoles={["patient"]}>
              <DoctorDetails />
            </ProtectedRoute>
          }
        />




        <Route
          path="/roles"
          element={<Roles />}
        />

        <Route
          path="/user-permissions"
          element={<UserPermissions />}
        />

        <Route
          path="/availability"
          element={<DoctorAvailability/>}
        />

        <Route
          path="/appointments"
          element={<DoctorAppointments />}
        />

        <Route
          path="/consultation/:roomCode"
          element={
            <ProtectedRoute
              allowedRoles={["doctor", "patient", "admin"]}
            >
              <Consultation />
            </ProtectedRoute>
          }
        />



        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}