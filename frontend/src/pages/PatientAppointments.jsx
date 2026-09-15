import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getAppointments } from "../api/appointmentApi";
import {
  createOrGetRoom,
  getIncomingCalls,
} from "../api/consultationApi";
import { getApiData, getErrorMessage } from "../utils/apiHelpers";

// Consultation length and how early the call may be joined.
const SLOT_DURATION_MINUTES = 30;
const EARLY_JOIN_MINUTES = 5;
const RING_POLL_MS = 5000;

export default function PatientAppointments() {
    const navigate = useNavigate();

    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [joiningId, setJoiningId] = useState(null);

    // appointment_id -> room_code for calls where the doctor is
    // already connected and waiting ("ringing").
    const [ringing, setRinging] = useState({});

    // Live clock so the Join button enables/disables on its own.
    const [now, setNow] = useState(() => new Date());

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await getAppointments();
            const data = response?.data?.data || [];

            setAppointments(data);
        } catch (err) {
            setError(
                getErrorMessage(err, "Unable to fetch appointments")
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    // Re-evaluate the join window every 30s.
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(id);
    }, []);

    // Poll for rooms where the doctor is waiting.
    useEffect(() => {
        let cancelled = false;

        const poll = async () => {
            try {
                const res = await getIncomingCalls();
                if (cancelled) return;

                const calls = getApiData(res) || [];
                const map = {};
                calls.forEach((call) => {
                    map[call.appointment_id] = call.room_code;
                });
                setRinging(map);
            } catch {
                // Network hiccup — keep polling silently.
            }
        };

        poll();
        const id = setInterval(poll, RING_POLL_MS);

        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    // Join an online consultation: create/fetch the room, then navigate.
    const handleJoinCall = async (appointment) => {
        try {
            setJoiningId(appointment.id);
            setError("");

            // If the doctor is already waiting we know the room code.
            const ringingRoom = ringing[appointment.id];
            if (ringingRoom) {
                navigate(`/consultation/${ringingRoom}`);
                return;
            }

            const response = await createOrGetRoom(appointment.id);
            const room = getApiData(response);

            if (!room?.room_code) {
                throw new Error("Consultation room is not available yet.");
            }

            navigate(`/consultation/${room.room_code}`);
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Unable to join the consultation."
                )
            );
        } finally {
            setJoiningId(null);
        }
    };

    // Compute the joinable window for an appointment's slot.
    const getCallWindow = (appointment) => {
        if (
            !appointment.appointment_date ||
            !appointment.appointment_time
        ) {
            return null;
        }

        const start = new Date(
            `${appointment.appointment_date}T${appointment.appointment_time}`
        );

        if (Number.isNaN(start.getTime())) {
            return null;
        }

        const joinFrom = new Date(
            start.getTime() - EARLY_JOIN_MINUTES * 60000
        );
        const joinUntil = new Date(
            start.getTime() + SLOT_DURATION_MINUTES * 60000
        );

        return { start, joinFrom, joinUntil };
    };

    // State of the call action: none | ringing | early | active | expired.
    const getCallState = (appointment) => {
        if (
            appointment.appointment_type !== "online" ||
            appointment.status !== "confirmed"
        ) {
            return "none";
        }

        // The doctor waiting in the room overrides the time gate.
        if (ringing[appointment.id]) return "ringing";

        const win = getCallWindow(appointment);
        if (!win) return "none";

        if (now < win.joinFrom) return "early";
        if (now > win.joinUntil) return "expired";
        return "active";
    };

    // Render the Join action / disabled state for an appointment.
    const renderCallAction = (appointment) => {
        const state = getCallState(appointment);

        if (state === "none") {
            return <span className="text-sm text-gray-400">—</span>;
        }

        if (state === "ringing") {
            return (
                <button
                    onClick={() => handleJoinCall(appointment)}
                    disabled={joiningId === appointment.id}
                    className="animate-pulse rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                    {joiningId === appointment.id
                        ? "Joining…"
                        : "📞 Pick Up Call"}
                </button>
            );
        }

        if (state === "active") {
            return (
                <button
                    onClick={() => handleJoinCall(appointment)}
                    disabled={joiningId === appointment.id}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                    {joiningId === appointment.id
                        ? "Joining…"
                        : "Join Call"}
                </button>
            );
        }

        if (state === "early") {
            return (
                <button
                    disabled
                    title="The call opens at the scheduled time"
                    className="cursor-not-allowed rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500"
                >
                    Starts {formatTime(appointment.appointment_time)}
                </button>
            );
        }

        // expired
        return (
            <span className="text-sm text-gray-400">Call ended</span>
        );
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";

        return new Date(
            `${dateString}T00:00:00`
        ).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    // Format time
    const formatTime = (timeString) => {
        if (!timeString) return "N/A";

        const [hours, minutes] = timeString.split(":");

        const date = new Date();
        date.setHours(Number(hours), Number(minutes), 0);

        return date.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Status styling
    const getStatusClass = (status) => {
        switch (status?.toLowerCase()) {
            case "confirmed":
                return "bg-green-100 text-green-700";

            case "completed":
                return "bg-blue-100 text-blue-700";

            case "cancelled":
            case "rejected":
                return "bg-red-100 text-red-700";

            case "pending_payment":
                return "bg-yellow-100 text-yellow-700";

            default:
                return "bg-gray-100 text-gray-600";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="mx-auto max-w-6xl">
                    <div className="rounded-xl bg-white p-10 text-center shadow-sm">
                        <p className="text-gray-600">
                            Loading appointments...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-6xl">

                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">
                            My Appointments
                        </h1>

                        <p className="mt-1 text-gray-500">
                            Join your online consultations from here
                        </p>
                    </div>

                    <button
                        onClick={fetchAppointments}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                        Refresh
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
                        {error}
                    </div>
                )}

                {/* Empty */}
                {!error && appointments.length === 0 && (
                    <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                        <div className="mb-3 text-5xl">📅</div>

                        <h2 className="text-xl font-semibold text-gray-800">
                            No appointments
                        </h2>

                        <p className="mt-2 text-gray-500">
                            You don't have any appointments yet. Book one
                            from the Find Doctors page.
                        </p>
                    </div>
                )}

                {/* Desktop Table */}
                {appointments.length > 0 && (
                    <div className="hidden overflow-hidden rounded-xl bg-white shadow-sm md:block">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                                        Doctor
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                                        Date
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                                        Time
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                                        Disease
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                                        Type
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {appointments.map((appointment) => (
                                    <tr
                                        key={appointment.id}
                                        className="hover:bg-gray-50"
                                    >
                                        {/* Doctor */}
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800">
                                                {appointment.doctor_name ||
                                                    "Unknown Doctor"}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Doctor ID:{" "}
                                                {appointment.doctor_id}
                                            </div>
                                        </td>

                                        {/* Date */}
                                        <td className="px-6 py-4 text-gray-700">
                                            {formatDate(
                                                appointment.appointment_date
                                            )}
                                        </td>

                                        {/* Time */}
                                        <td className="px-6 py-4 text-gray-700">
                                            {formatTime(
                                                appointment.appointment_time
                                            )}
                                        </td>

                                        {/* Disease */}
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-800">
                                                {appointment.disease || "N/A"}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                                                    appointment.status
                                                )}`}
                                            >
                                                {appointment.status ||
                                                    "confirmed"}
                                            </span>
                                        </td>

                                        {/* Type */}
                                        <td className="px-6 py-4">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                    appointment.appointment_type ===
                                                    "online"
                                                        ? "bg-purple-100 text-purple-700"
                                                        : "bg-gray-100 text-gray-600"
                                                }`}
                                            >
                                                {appointment.appointment_type ===
                                                "online"
                                                    ? "Online"
                                                    : "In-person"}
                                            </span>
                                        </td>

                                        {/* Action */}
                                        <td className="px-6 py-4">
                                            {renderCallAction(appointment)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Mobile Cards */}
                {appointments.length > 0 && (
                    <div className="space-y-4 md:hidden">
                        {appointments.map((appointment) => (
                            <div
                                key={appointment.id}
                                className="rounded-xl bg-white p-5 shadow-sm"
                            >
                                {/* Doctor + Status */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-semibold text-gray-800">
                                            {appointment.doctor_name ||
                                                "Unknown Doctor"}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Doctor ID:{" "}
                                            {appointment.doctor_id}
                                        </p>
                                    </div>

                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                                            appointment.status
                                        )}`}
                                    >
                                        {appointment.status || "confirmed"}
                                    </span>
                                </div>

                                {/* Disease */}
                                <div className="mt-4">
                                    <p className="text-xs text-gray-500">
                                        Disease
                                    </p>
                                    <p className="font-medium text-gray-800">
                                        {appointment.disease || "N/A"}
                                    </p>
                                </div>

                                {/* Date + Time */}
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">
                                            Date
                                        </p>
                                        <p className="font-medium text-gray-800">
                                            {formatDate(
                                                appointment.appointment_date
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-gray-500">
                                            Time
                                        </p>
                                        <p className="font-medium text-gray-800">
                                            {formatTime(
                                                appointment.appointment_time
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Type + Join */}
                                <div className="mt-4 flex items-center justify-between">
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                            appointment.appointment_type ===
                                            "online"
                                                ? "bg-purple-100 text-purple-700"
                                                : "bg-gray-100 text-gray-600"
                                        }`}
                                    >
                                        {appointment.appointment_type ===
                                        "online"
                                            ? "Online"
                                            : "In-person"}
                                    </span>

                                    {renderCallAction(appointment)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
