import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";


import {
  registerAdmin,
  registerDoctor,
  registerPatient,
} from "../api/authApi";
import { getApiMessage, getErrorMessage } from "../utils/apiHelpers";

const initialForm = {
  id: "",
  username: "",
  email: "",
  password: "",
  role: "patient",
  admin_id: "",
  name: "",
  phone: "",
  designation: "",
  doctor_id: "",
  specialization: "",
  patient_id: "",
  first_name: "",
  last_name: "",
  age: "",
  gender: "Male",
  blood_group: "",
  address: "",
  disease: "",
  assigned_doctor_id: "",
};

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      let response;

      if (formData.role === "admin") {
        response = await registerAdmin({
          id: formData.id,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          admin_id: formData.admin_id,
          name: formData.name,
          phone: formData.phone,
          designation: formData.designation,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        });
      } else if (formData.role === "doctor") {
        response = await registerDoctor({
          id: formData.id,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          doctor_id: formData.doctor_id,
          name: formData.name,
          specialization: formData.specialization,
        });
      } else {
        response = await registerPatient({
          id: formData.id,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          patient_id: formData.patient_id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          age: Number(formData.age),
          gender: formData.gender,
          phone: formData.phone,
          blood_group: formData.blood_group,
          address: formData.address,
          disease: formData.disease,
          assigned_doctor_id: formData.assigned_doctor_id || null,
        });
      }

      setMessage(getApiMessage(response, "Registered successfully"));
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center text-blue-600">
          Create Account
        </h1>
        <p className="text-center text-gray-500 mt-2">Register to continue</p>
        <p className="text-center text-sm text-gray-400 mt-2">
          User ID, username, email, and profile ID must each be unique.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-8">
          {/* <input
            type="text"
            name="id"
            placeholder="User ID"
            value={formData.id}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
            required
          /> */}
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password (min 6 characters)"
            value={formData.password}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
            minLength={6}
            required
          />

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
          >
            <option value="admin">Admin</option>
            <option value="doctor">Doctor</option>
            <option value="patient">Patient</option>
          </select>

          {formData.role === "admin" && (
            <>
              {/* <input
                type="text"
                name="admin_id"
                placeholder="Admin ID"
                value={formData.admin_id}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              /> */}
              <input
                type="text"
                name="name"
                placeholder="Full name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
              <input
                type="text"
                name="phone"
                placeholder="Phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
              <input
                type="text"
                name="designation"
                placeholder="Designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
            </>
          )}

          {formData.role === "doctor" && (
            <>
              {/* <input
                type="text"
                name="doctor_id"
                placeholder="Doctor ID"
                value={formData.doctor_id}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              /> */}
              <input
                type="text"
                name="name"
                placeholder="Full name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
              <input
                type="text"
                name="specialization"
                placeholder="Specialization"
                value={formData.specialization}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
            </>
          )}

          {formData.role === "patient" && (
            <>
              {/* <input
                type="text"
                name="patient_id"
                placeholder="Patient ID"
                value={formData.patient_id}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              /> */}
              <input
                type="text"
                name="first_name"
                placeholder="First name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
              <input
                type="text"
                name="last_name"
                placeholder="Last name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
              <input
                type="number"
                name="age"
                placeholder="Age"
                value={formData.age}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                min={0}
                max={130}
                required
              />
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Others">Others</option>
              </select>
              <input
                type="text"
                name="phone"
                placeholder="Phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
              <input
                type="text"
                name="blood_group"
                placeholder="Blood group"
                value={formData.blood_group}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
              <input
                type="text"
                name="address"
                placeholder="Address"
                value={formData.address}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
              <input
                type="text"
                name="disease"
                placeholder="Disease"
                value={formData.disease}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
              <input
                type="text"
                name="assigned_doctor_id"
                placeholder="Assigned doctor ID (optional)"
                value={formData.assigned_doctor_id}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              />
            </>
          )}

          {message && (
            <div className="bg-green-100 text-green-700 p-3 rounded-lg">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-3 hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <div className="text-center mt-6">
          Already have an account?
          <Link to="/login" className="ml-2 text-blue-600 font-semibold">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
