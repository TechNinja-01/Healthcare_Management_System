import apiClient from "./apiClient";

// =========================================================
// DOCTOR AVAILABILITY
// =========================================================

// Get all availability for a doctor
export const getDoctorAvailability = (doctorId) => {
return apiClient.get(
`/availability/${doctorId}`
);
};

// Create availability
export const createAvailability = (
doctorId,
data
) => {
return apiClient.post(
`/availability/${doctorId}`,
data
);
};

// Update availability
export const updateAvailability = (
availabilityId,
data
) => {
return apiClient.put(
`/availability/${availabilityId}`,
data
);
};

// Delete availability
export const deleteAvailability = (
availabilityId
) => {
return apiClient.delete(
`/availability/${availabilityId}`
);
};

// =========================================================
// DOCTOR LEAVE
// =========================================================

// Create doctor leave
export const createDoctorLeave = (
doctorId,
data
) => {
return apiClient.post(
`/availability/${doctorId}/leave`,
data
);
};

// Get doctor leaves
export const getDoctorLeaves = (
doctorId
) => {
return apiClient.get(
`/availability/${doctorId}/leave`
);
};

// Delete doctor leave
export const deleteDoctorLeave = (
leaveId
) => {
return apiClient.delete(
`/availability/leave/${leaveId}`
);
};
