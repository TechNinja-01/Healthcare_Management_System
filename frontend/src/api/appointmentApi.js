import apiClient from "./apiClient";

export const createAppointment = (data) => {
    return apiClient.post("/appointments/", data);
};

export const getAppointments = () => {
    return apiClient.get("/appointments/");
};

export const getAppointmentById = (appointmentId) => {
    return apiClient.get(`/appointments/${appointmentId}`);
};

export const updateAppointment = (appointmentId, data) => {
    return apiClient.put(`/appointments/${appointmentId}`, data);
};

export const deleteAppointment = (appointmentId) => {
    return apiClient.delete(`/appointments/${appointmentId}`);
};

// Get available appointment slots for a doctor on a specific date
export const getDoctorAvailableSlots = (
    doctorId,
    appointmentDate
) => {
    return apiClient.get(
        `/appointments/doctor/${doctorId}/available-slots`,
        {
            params: {
                appointment_date: appointmentDate,
            },
        }
    );
};

