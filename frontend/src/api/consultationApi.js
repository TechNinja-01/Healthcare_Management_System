import apiClient from "./apiClient";

// Base URL used for REST; the WebSocket URL is derived from it.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Build the signaling WebSocket URL (http -> ws, https -> wss).
export const buildConsultationWsUrl = (roomCode, token) => {
  const wsBase = API_BASE_URL.replace(/^http/i, "ws");
  return `${wsBase}/consultations/ws/${roomCode}?token=${encodeURIComponent(
    token || ""
  )}`;
};

// Lazily create (or fetch the existing) room for an online appointment.
export const createOrGetRoom = (appointmentId) =>
  apiClient.post(`/consultations/${appointmentId}/room`);

export const getRoom = (roomCode) =>
  apiClient.get(`/consultations/${roomCode}`);

export const getRoomMessages = (roomCode) =>
  apiClient.get(`/consultations/${roomCode}/messages`);

export const getIceServers = () =>
  apiClient.get(`/consultations/ice-servers`);

// ------------------------------------------------------------
// Recording
// ------------------------------------------------------------

export const initiateRecording = (roomCode) =>
  apiClient.post(`/consultations/${roomCode}/recordings/initiate`);

export const getRecordingPartUrl = (roomCode, recordingId, partNumber) =>
  apiClient.post(
    `/consultations/${roomCode}/recordings/${recordingId}/part-url`,
    null,
    { params: { part_number: partNumber } }
  );

export const completeRecording = (roomCode, recordingId, body) =>
  apiClient.post(
    `/consultations/${roomCode}/recordings/${recordingId}/complete`,
    body
  );

export const abortRecording = (roomCode, recordingId) =>
  apiClient.post(
    `/consultations/${roomCode}/recordings/${recordingId}/abort`
  );

export const listRecordings = (roomCode) =>
  apiClient.get(`/consultations/${roomCode}/recordings`);

export const getRecordingDownloadUrl = (recordingId) =>
  apiClient.get(`/consultations/recordings/${recordingId}/download`);
