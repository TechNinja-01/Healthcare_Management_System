import apiClient from "./apiClient";

// =====================================================
// GET ALL DOCTORS
// =====================================================

export const getDoctors = () =>
    apiClient.get("/doctor/");

// =====================================================
// GET DOCTOR BY ID
// =====================================================

export const getDoctor = (doctorId) =>
    apiClient.get(`/doctor/${doctorId}`);

export const getDoctorById = (doctorId) =>
    apiClient.get(`/doctor/${doctorId}`);

// =====================================================
// CREATE DOCTOR
// =====================================================

export const createDoctor = (data) =>
    apiClient.post("/doctor/", data);

// =====================================================
// SEARCH DOCTORS
// =====================================================

export const searchDoctor = (search = "") =>
    apiClient.get("/doctor/doctors", {
        params: {
            search: search.trim(),
        },
    });

// =====================================================
// UPDATE DOCTOR
// =====================================================

export const updateDoctor = (
    doctorId,
    data
) =>
    apiClient.put(
        `/doctor/${doctorId}`,
        data
    );

// =====================================================
// DELETE DOCTOR
// =====================================================

export const deleteDoctor = (
    doctorId
) =>
    apiClient.delete(
        `/doctor/${doctorId}`
    );

// =====================================================
// NEARBY DOCTORS
// =====================================================

export const getNearbyDoctors = (
    latitude,
    longitude,
    radius_km = 5,
    search = ""
) =>
    apiClient.get("/doctor/nearby", {
        params: {
            latitude,
            longitude,
            radius_km,
            search: search.trim(),
        },
    });