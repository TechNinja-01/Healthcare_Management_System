import apiClient from "./apiClient";

export const createOrder = (appointmentId, amountInr = 500) => {
  return apiClient.post("/payments/create-order", {
    appointment_id: appointmentId,
    amount_inr: amountInr,
  });
};

export const verifyPayment = (data) => {
  return apiClient.post("/payments/verify", data);
};

export const getPayment = (paymentId) => {
  return apiClient.get(`/payments/${paymentId}`);
};

export const getPaymentForAppointment = (appointmentId) => {
  return apiClient.get(`/payments/appointment/${appointmentId}`);
};
