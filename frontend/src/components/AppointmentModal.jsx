import { useEffect, useState } from "react";

import {
  createAppointment,
  getDoctorAvailableSlots,
} from "../api/appointmentApi";
import { createOrder, verifyPayment } from "../api/paymentApi";
import { getErrorMessage } from "../utils/apiHelpers";

const APPOINTMENT_FEE = 500;

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");

    script.src = "https://checkout.razorpay.com/v1/checkout.js";

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

export default function AppointmentModal({
  isOpen,
  onClose,
  doctor,
  onSuccess,
}) {
  const [formData, setFormData] = useState({
    appointment_date: "",
    appointment_time: "",
    disease: "",
    appointment_type: "in_person",
  });

  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================================================
  // RESET FORM WHEN MODAL CLOSES
  // ============================================================

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        appointment_date: "",
        appointment_time: "",
        disease: "",
        appointment_type: "in_person",
      });

      setSlots([]);
      setError("");
      setSuccess("");
      setLoadingSlots(false);
      setLoading(false);
    }
  }, [isOpen]);

  // ============================================================
  // FETCH AVAILABLE SLOTS
  // ============================================================

  const fetchAvailableSlots = async (date) => {
    if (!doctor?.id || !date) {
      setSlots([]);
      return;
    }

    try {
      setLoadingSlots(true);
      setError("");

      setFormData((prev) => ({
        ...prev,
        appointment_time: "",
      }));

      const response = await getDoctorAvailableSlots(
        doctor.id,
        date
      );

      setSlots(
        response?.data?.data?.slots || []
      );
    } catch (err) {
      setSlots([]);

      setError(
        getErrorMessage(
          err,
          "Unable to fetch available slots."
        )
      );
    } finally {
      setLoadingSlots(false);
    }
  };

  // ============================================================
  // DATE CHANGE
  // ============================================================

  const handleDateChange = (event) => {
    const date = event.target.value;

    setFormData((prev) => ({
      ...prev,
      appointment_date: date,
      appointment_time: "",
    }));

    setError("");
    setSuccess("");

    if (date) {
      fetchAvailableSlots(date);
    } else {
      setSlots([]);
    }
  };

  // ============================================================
  // SLOT SELECT
  // ============================================================

  const handleSlotSelect = (slot) => {
    if (!slot.available) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      appointment_time: slot.time,
    }));

    setError("");
    setSuccess("");
  };

  // ============================================================
  // DISEASE CHANGE
  // ============================================================

  const handleDiseaseChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      disease: event.target.value,
    }));

    setError("");
    setSuccess("");
  };

  // ============================================================
  // FORMAT SLOT TIME
  // ============================================================

  const formatSlotTime = (time) => {
    if (!time) {
      return "";
    }

    try {
      const [hours, minutes] = String(time).split(":");

      const date = new Date();

      date.setHours(
        Number(hours),
        Number(minutes),
        0,
        0
      );

      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return time;
    }
  };

  // ============================================================
  // RAZORPAY CHECKOUT
  // ============================================================

  const openRazorpayCheckout = async (appointmentId) => {
    const scriptLoaded =
      await loadRazorpayScript();

    if (
      !scriptLoaded ||
      !window.Razorpay
    ) {
      throw new Error(
        "Unable to load Razorpay Checkout. Please refresh and try again."
      );
    }

    const orderResponse =
      await createOrder(
        appointmentId,
        APPOINTMENT_FEE
      );

    const order =
      orderResponse?.data;

    if (
      !order?.order_id ||
      !order?.key_id
    ) {
      throw new Error(
        "Invalid payment order response from server."
      );
    }

    return new Promise(
      (resolve, reject) => {
        const options = {
          key: order.key_id,

          amount: order.amount,

          currency:
            order.currency || "INR",

          name:
            "Healthcare Management System",

          description:
            `Consultation with Dr. ${
              doctor?.name || ""
            }`.trim(),

          order_id:
            order.order_id,

          handler:
            async (paymentResponse) => {
              try {
                setSuccess(
                  "Payment received. Verifying..."
                );

                const verifyResponse =
                  await verifyPayment({
                    razorpay_order_id:
                      paymentResponse.razorpay_order_id,

                    razorpay_payment_id:
                      paymentResponse.razorpay_payment_id,

                    razorpay_signature:
                      paymentResponse.razorpay_signature,
                  });

                if (
                  !verifyResponse?.data
                    ?.success
                ) {
                  throw new Error(
                    "Payment verification failed."
                  );
                }

                resolve(
                  verifyResponse
                );
              } catch (err) {
                reject(err);
              }
            },

          theme: {
            color: "#2563eb",
          },

          modal: {
            ondismiss: () => {
              reject(
                new Error(
                  "Payment was cancelled. Your appointment is pending payment."
                )
              );
            },
          },
        };

        const razorpay =
          new window.Razorpay(
            options
          );

        razorpay.on(
          "payment.failed",
          (response) => {
            reject(
              new Error(
                response?.error
                  ?.description ||
                  "Payment failed. Please try again."
              )
            );
          }
        );

        razorpay.open();
      }
    );
  };

  // ============================================================
  // SUBMIT APPOINTMENT
  // ============================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    // ----------------------------------------------------------
    // Validate doctor
    // ----------------------------------------------------------

    if (!doctor?.id) {
      setError(
        "Doctor information is missing."
      );
      return;
    }

    // ----------------------------------------------------------
    // Validate date and time
    // ----------------------------------------------------------

    if (
      !formData.appointment_date ||
      !formData.appointment_time
    ) {
      setError(
        "Please select a date and time slot."
      );
      return;
    }

    try {
      setLoading(true);

      setSuccess(
        "Creating appointment..."
      );

      // --------------------------------------------------------
      // Create appointment
      // --------------------------------------------------------

      const appointmentResponse =
        await createAppointment({
          doctor_id: doctor.id,

          appointment_date:
            formData.appointment_date,

          appointment_time:
            formData.appointment_time,

          // IMPORTANT:
          // Send disease to backend
          disease:
            formData.disease.trim() || null,

          appointment_type:
            formData.appointment_type,
        });

      console.log(
        "Appointment creation response:",
        appointmentResponse
      );

      const appointment =
        appointmentResponse?.data?.data;

      if (!appointment?.id) {
        throw new Error(
          "Appointment was not created."
        );
      }

      // --------------------------------------------------------
      // Payment
      // --------------------------------------------------------

      setSuccess(
        "Opening secure payment..."
      );

      const verifyResponse =
        await openRazorpayCheckout(
          appointment.id
        );

      // --------------------------------------------------------
      // Payment successful
      // --------------------------------------------------------

      setSuccess(
        "Payment successful. Appointment confirmed!"
      );

      if (onSuccess) {
        setTimeout(() => {
          onSuccess(
            verifyResponse ||
              appointmentResponse
          );
        }, 700);
      }
    } catch (err) {
      console.error(
        "Appointment booking error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          err?.message ||
            "Unable to complete booking."
        )
      );

      setSuccess("");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // DON'T RENDER WHEN CLOSED
  // ============================================================

  if (!isOpen) {
    return null;
  }

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Book Appointment
            </h2>

            {doctor && (
              <p className="mt-1 text-sm text-gray-500">
                Dr. {doctor.name}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-2xl text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* ================================================== */}
        {/* FORM */}
        {/* ================================================== */}

        <form
          onSubmit={handleSubmit}
          className="p-5"
        >
          {/* ================================================== */}
          {/* ERROR */}
          {/* ================================================== */}

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ================================================== */}
          {/* SUCCESS */}
          {/* ================================================== */}

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {/* ================================================== */}
          {/* CONSULTATION TYPE */}
          {/* ================================================== */}

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Consultation Type
            </label>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: "in_person",
                  label: "In-person",
                  hint: "Visit the clinic",
                },
                {
                  value: "online",
                  label: "Online",
                  hint: "Video call",
                },
              ].map((option) => {
                const isSelected =
                  formData.appointment_type ===
                  option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        appointment_type:
                          option.value,
                      }))
                    }
                    className={`rounded-lg border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-800">
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {option.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ================================================== */}
          {/* DISEASE */}
          {/* ================================================== */}

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Disease / Health Problem
            </label>

            <textarea
              value={formData.disease}
              onChange={
                handleDiseaseChange
              }
              placeholder="Describe your disease or health problem"
              rows={3}
              maxLength={255}
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Maximum 255 characters
            </p>
          </div>

          {/* ================================================== */}
          {/* APPOINTMENT DATE */}
          {/* ================================================== */}

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Appointment Date
            </label>

            <input
              type="date"
              value={
                formData.appointment_date
              }
              onChange={
                handleDateChange
              }
              min={today}
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              required
            />
          </div>

          {/* ================================================== */}
          {/* AVAILABLE SLOTS */}
          {/* ================================================== */}

          {formData.appointment_date && (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Available Time Slots
                </label>

                {loadingSlots && (
                  <span className="text-sm text-gray-500">
                    Loading...
                  </span>
                )}
              </div>

              {!loadingSlots &&
                slots.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {slots.map(
                      (
                        slot,
                        index
                      ) => {
                        if (!slot.time) {
                          return null;
                        }

                        const isSelected =
                          formData.appointment_time ===
                          slot.time;

                        const isAvailable =
                          slot.available ===
                          true;

                        return (
                          <button
                            key={`${slot.time}-${index}`}
                            type="button"
                            disabled={
                              !isAvailable ||
                              loading
                            }
                            onClick={() =>
                              handleSlotSelect(
                                slot
                              )
                            }
                            className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                              !isAvailable
                                ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through"
                                : isSelected
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-500 hover:bg-blue-100"
                            }`}
                            title={
                              slot.reason ||
                              ""
                            }
                          >
                            {formatSlotTime(
                              slot.time
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                )}

              {!loadingSlots &&
                slots.length === 0 && (
                  <div className="rounded-lg bg-yellow-50 p-4 text-center text-sm text-yellow-800">
                    No available slots for
                    this date.
                  </div>
                )}
            </div>
          )}

          {/* ================================================== */}
          {/* FEE */}
          {/* ================================================== */}

          {formData.appointment_time && (
            <div className="mb-5 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              Fee:{" "}
              <strong>
                ₹{APPOINTMENT_FEE}
              </strong>{" "}
              — payment confirms the
              booking.
            </div>
          )}

          {/* ================================================== */}
          {/* BUTTONS */}
          {/* ================================================== */}

          <div className="flex justify-end gap-3 border-t pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                loadingSlots ||
                !formData.appointment_date ||
                !formData.appointment_time
              }
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : `Pay ₹${APPOINTMENT_FEE} & Book`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}