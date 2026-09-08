import { useEffect, useState } from "react";

import {
getDoctorAvailability,
createAvailability,
updateAvailability,
deleteAvailability,
createDoctorLeave,
getDoctorLeaves,
deleteDoctorLeave,
} from "../api/availabilityApi";

import { getCurrentUser } from "../api/authApi";

export default function DoctorAvailability() {


// =====================================================
// DOCTOR
// =====================================================

const [doctorId, setDoctorId] = useState(null);


// =====================================================
// AVAILABILITY
// =====================================================

const [availability, setAvailability] = useState([]);

const [availabilityDate, setAvailabilityDate] =
    useState("");

const [startTime, setStartTime] =
    useState("");

const [endTime, setEndTime] =
    useState("");

const [slotDuration, setSlotDuration] =
    useState(30);


// =====================================================
// LEAVE
// =====================================================

const [leaves, setLeaves] = useState([]);

const [leaveDate, setLeaveDate] =
    useState("");

const [leaveReason, setLeaveReason] =
    useState("");


// =====================================================
// LOADING
// =====================================================

const [loading, setLoading] =
    useState(false);

const [saving, setSaving] =
    useState(false);

const [leaveLoading, setLeaveLoading] =
    useState(false);


// =====================================================
// ERROR
// =====================================================

const [error, setError] =
    useState("");


// =====================================================
// TODAY
// =====================================================

const today = new Date()
    .toISOString()
    .split("T")[0];


// =====================================================
// GET LOGGED-IN DOCTOR
// =====================================================

useEffect(() => {

    const fetchCurrentUser = async () => {

        try {

            setError("");

            const response =
                await getCurrentUser();

            console.log(
                "Current user response:",
                response.data
            );

            const user =
                response.data?.data;

            /*
                Expected API response:

                {
                    data: {
                        profile: {
                            id: "D014"
                        }
                    }
                }
            */

            const id =
                user?.profile?.id;

            if (!id) {

                setError(
                    "Doctor ID not found"
                );

                return;
            }

            console.log(
                "Logged-in Doctor ID:",
                id
            );

            setDoctorId(id);

        } catch (err) {

            console.error(
                "Current user error:",
                err
            );

            setError(
                err.response?.data?.detail ||
                "Failed to get current user"
            );
        }
    };


    fetchCurrentUser();

}, []);


// =====================================================
// FETCH AVAILABILITY
// =====================================================

const fetchAvailability = async () => {

    if (!doctorId) return;

    try {

        setLoading(true);
        setError("");

        const response =
            await getDoctorAvailability(
                doctorId
            );

        console.log(
            "Availability response:",
            response.data
        );

        setAvailability(
            response.data?.data || []
        );

    } catch (err) {

        console.error(
            "Availability error:",
            err
        );

        setError(
            err.response?.data?.detail ||
            "Failed to fetch availability"
        );

    } finally {

        setLoading(false);
    }
};


// =====================================================
// FETCH LEAVES
// =====================================================

const fetchLeaves = async () => {

    if (!doctorId) return;

    try {

        const response =
            await getDoctorLeaves(
                doctorId
            );

        console.log(
            "Leaves response:",
            response.data
        );

        setLeaves(
            response.data?.data || []
        );

    } catch (err) {

        console.error(
            "Leave error:",
            err
        );

        setError(
            err.response?.data?.detail ||
            "Failed to fetch doctor leaves"
        );
    }
};


// =====================================================
// FETCH ALL DATA
// =====================================================

useEffect(() => {

    if (!doctorId) return;

    const loadData = async () => {

        await Promise.all([
            fetchAvailability(),
            fetchLeaves(),
        ]);
    };

    loadData();

}, [doctorId]);


// =====================================================
// CREATE AVAILABILITY
// =====================================================

const handleCreate = async (e) => {

    e.preventDefault();

    setError("");


    // -------------------------------------------------
    // Doctor ID
    // -------------------------------------------------

    if (!doctorId) {

        setError(
            "Doctor ID not found"
        );

        return;
    }


    // -------------------------------------------------
    // Date
    // -------------------------------------------------

    if (!availabilityDate) {

        setError(
            "Please select a date"
        );

        return;
    }


    // -------------------------------------------------
    // Start / End time
    // -------------------------------------------------

    if (!startTime || !endTime) {

        setError(
            "Please select start and end time"
        );

        return;
    }


    // -------------------------------------------------
    // Time validation
    // -------------------------------------------------

    if (startTime >= endTime) {

        setError(
            "End time must be greater than start time"
        );

        return;
    }


    // -------------------------------------------------
    // Calculate duration
    // -------------------------------------------------

    const start =
        startTime.split(":");

    const end =
        endTime.split(":");

    const startMinutes =
        Number(start[0]) * 60 +
        Number(start[1]);

    const endMinutes =
        Number(end[0]) * 60 +
        Number(end[1]);

    const totalMinutes =
        endMinutes - startMinutes;


    // -------------------------------------------------
    // Slot duration validation
    // -------------------------------------------------

    if (
        totalMinutes %
        Number(slotDuration) !==
        0
    ) {

        setError(
            "Availability duration must be divisible by slot duration"
        );

        return;
    }


    try {

        setSaving(true);

        await createAvailability(
            doctorId,
            {
                date: availabilityDate,

                start_time: startTime,

                end_time: endTime,

                slot_duration:
                    Number(slotDuration),

                is_active: true,
            }
        );


        alert(
            "Availability created successfully"
        );


        // -------------------------------------------------
        // Reset
        // -------------------------------------------------

        setAvailabilityDate("");

        setStartTime("");

        setEndTime("");

        setSlotDuration(30);


        // -------------------------------------------------
        // Refresh
        // -------------------------------------------------

        await fetchAvailability();

    } catch (err) {

        console.error(
            "Create availability error:",
            err
        );

        setError(
            err.response?.data?.detail ||
            "Failed to create availability"
        );

    } finally {

        setSaving(false);
    }
};


// =====================================================
// TOGGLE AVAILABILITY
// =====================================================

const handleToggle = async (item) => {

    try {

        setError("");

        await updateAvailability(
            item.id,
            {
                is_active:
                    !item.is_active,
            }
        );


        await fetchAvailability();

    } catch (err) {

        console.error(
            "Toggle availability error:",
            err
        );

        setError(
            err.response?.data?.detail ||
            "Failed to update availability"
        );
    }
};


// =====================================================
// DELETE AVAILABILITY
// =====================================================

const handleDelete = async (id) => {

    const confirmed =
        window.confirm(
            "Are you sure you want to delete this availability?"
        );

    if (!confirmed) return;


    try {

        setError("");

        await deleteAvailability(id);


        alert(
            "Availability deleted successfully"
        );


        await fetchAvailability();

    } catch (err) {

        console.error(
            "Delete availability error:",
            err
        );

        setError(
            err.response?.data?.detail ||
            "Failed to delete availability"
        );
    }
};


// =====================================================
// CREATE LEAVE
// =====================================================

const handleCreateLeave = async (e) => {

    e.preventDefault();

    setError("");


    // -------------------------------------------------
    // Doctor ID
    // -------------------------------------------------

    if (!doctorId) {

        setError(
            "Doctor ID not found"
        );

        return;
    }


    // -------------------------------------------------
    // Leave date
    // -------------------------------------------------

    if (!leaveDate) {

        setError(
            "Please select a leave date"
        );

        return;
    }


    try {

        setLeaveLoading(true);


        await createDoctorLeave(
            doctorId,
            {
                leave_date: leaveDate,

                reason:
                    leaveReason.trim() ||
                    null,
            }
        );


        alert(
            "Doctor leave created successfully"
        );


        // -------------------------------------------------
        // Reset leave form
        // -------------------------------------------------

        setLeaveDate("");

        setLeaveReason("");


        // -------------------------------------------------
        // IMPORTANT
        //
        // Creating leave can deactivate availability
        // for that date.
        //
        // Therefore refresh BOTH.
        // -------------------------------------------------

        await Promise.all([
            fetchLeaves(),
            fetchAvailability(),
        ]);

    } catch (err) {

        console.error(
            "Create leave error:",
            err
        );

        setError(
            err.response?.data?.detail ||
            "Failed to create doctor leave"
        );

    } finally {

        setLeaveLoading(false);
    }
};


// =====================================================
// DELETE LEAVE
// =====================================================

const handleDeleteLeave = async (
    leaveId
) => {

    const confirmed =
        window.confirm(
            "Are you sure you want to delete this leave?"
        );

    if (!confirmed) return;


    try {

        setError("");

        await deleteDoctorLeave(
            leaveId
        );


        alert(
            "Leave deleted successfully"
        );


        await fetchLeaves();

    } catch (err) {

        console.error(
            "Delete leave error:",
            err
        );

        setError(
            err.response?.data?.detail ||
            "Failed to delete doctor leave"
        );
    }
};


// =====================================================
// FORMAT DATE
// =====================================================

const formatDate = (date) => {

    if (!date) return "";

    const parts =
        date.split("-");

    if (parts.length !== 3) {
        return date;
    }

    return `${parts[2]}-${parts[1]}-${parts[0]}`;
};


// =====================================================
// FORMAT DAY
// =====================================================

const getDayName = (
    dayOfWeek
) => {

    const days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ];

    return days[dayOfWeek] || "";
};


// =====================================================
// UI
// =====================================================

return (

    <div className="min-h-screen bg-gray-50 p-6">

        <div className="max-w-6xl mx-auto">


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="mb-8">

                <h1 className="text-3xl font-bold text-gray-800">
                    Doctor Availability
                </h1>

                <p className="text-gray-500 mt-1">
                    Manage your appointment dates,
                    times and leaves.
                </p>


                {doctorId && (

                    <p className="text-sm text-gray-500 mt-2">

                        Doctor ID:{" "}

                        <strong>
                            {doctorId}
                        </strong>

                    </p>
                )}

            </div>


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (

                <div className="mb-6 p-4 rounded-lg bg-red-100 border border-red-200 text-red-700">

                    {error}

                </div>
            )}


            {/* =================================================
                ADD AVAILABILITY
            ================================================= */}

            <div className="bg-white shadow-sm border rounded-xl p-6 mb-8">

                <div className="mb-6">

                    <h2 className="text-xl font-semibold text-gray-800">
                        Add Availability
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                        Select a specific date and configure appointment slots.
                    </p>

                </div>


                <form onSubmit={handleCreate}>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">


                        {/* DATE */}

                        <div>

                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date
                            </label>

                            <input
                                type="date"
                                value={
                                    availabilityDate
                                }
                                min={today}
                                onChange={(e) =>
                                    setAvailabilityDate(
                                        e.target.value
                                    )
                                }
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                        </div>


                        {/* START TIME */}

                        <div>

                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Time
                            </label>

                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) =>
                                    setStartTime(
                                        e.target.value
                                    )
                                }
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                        </div>


                        {/* END TIME */}

                        <div>

                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Time
                            </label>

                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) =>
                                    setEndTime(
                                        e.target.value
                                    )
                                }
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                        </div>


                        {/* SLOT DURATION */}

                        <div>

                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Slot Duration
                            </label>

                            <select
                                value={
                                    slotDuration
                                }
                                onChange={(e) =>
                                    setSlotDuration(
                                        Number(
                                            e.target.value
                                        )
                                    )
                                }
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >

                                <option value={15}>
                                    15 minutes
                                </option>

                                <option value={30}>
                                    30 minutes
                                </option>

                                <option value={45}>
                                    45 minutes
                                </option>

                                <option value={60}>
                                    60 minutes
                                </option>

                            </select>

                        </div>

                    </div>


                    {/* ADD BUTTON */}

                    <button
                        type="submit"
                        disabled={
                            saving ||
                            !doctorId
                        }
                        className="mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >

                        {saving
                            ? "Saving..."
                            : "Add Availability"}

                    </button>

                </form>

            </div>


            {/* =================================================
                EXISTING AVAILABILITY
            ================================================= */}

            <div className="bg-white shadow-sm border rounded-xl p-6 mb-8">

                <div className="mb-6">

                    <h2 className="text-xl font-semibold text-gray-800">
                        My Availability
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                        Your scheduled appointment dates and slots.
                    </p>

                </div>


                {loading ? (

                    <p className="text-gray-500">
                        Loading availability...
                    </p>

                ) : availability.length === 0 ? (

                    <div className="border border-dashed rounded-lg p-8 text-center">

                        <p className="text-gray-500">
                            No availability configured yet.
                        </p>

                    </div>

                ) : (

                    <div className="space-y-4">

                        {availability.map(
                            (item) => (

                                <div
                                    key={item.id}
                                    className="border rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                                >

                                    <div>

                                        <h3 className="font-semibold text-lg text-gray-800">

                                            {formatDate(
                                                item.date
                                            )}

                                        </h3>


                                        <p className="text-sm text-blue-600 font-medium mt-1">

                                            {
                                                getDayName(
                                                    item.day_of_week
                                                )
                                            }

                                        </p>


                                        <p className="text-gray-600 mt-1">

                                            {item.start_time}
                                            {" - "}
                                            {item.end_time}

                                        </p>


                                        <p className="text-sm text-gray-500 mt-1">

                                            Slot duration:{" "}

                                            {
                                                item.slot_duration
                                            }{" "}

                                            minutes

                                        </p>


                                        <p
                                            className={
                                                item.is_active
                                                    ? "text-green-600 text-sm font-medium mt-2"
                                                    : "text-red-600 text-sm font-medium mt-2"
                                            }
                                        >

                                            {item.is_active
                                                ? "Active"
                                                : "Inactive"}

                                        </p>

                                    </div>


                                    <div className="flex gap-2">

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleToggle(
                                                    item
                                                )
                                            }
                                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                                        >

                                            {item.is_active
                                                ? "Disable"
                                                : "Enable"}

                                        </button>


                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDelete(
                                                    item.id
                                                )
                                            }
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                        >

                                            Delete

                                        </button>

                                    </div>

                                </div>

                            )
                        )}

                    </div>

                )}

            </div>


            {/* =================================================
                DOCTOR LEAVE
            ================================================= */}

            <div className="bg-white shadow-sm border rounded-xl p-6">

                <div className="mb-6">

                    <h2 className="text-xl font-semibold text-gray-800">
                        Doctor Leave
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                        Mark dates when you are unavailable for appointments.
                    </p>

                </div>


                {/* LEAVE FORM */}

                <form onSubmit={handleCreateLeave}>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">


                        {/* LEAVE DATE */}

                        <div>

                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Leave Date
                            </label>

                            <input
                                type="date"
                                value={leaveDate}
                                min={today}
                                onChange={(e) =>
                                    setLeaveDate(
                                        e.target.value
                                    )
                                }
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />

                        </div>


                        {/* REASON */}

                        <div>

                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason
                            </label>

                            <input
                                type="text"
                                value={leaveReason}
                                onChange={(e) =>
                                    setLeaveReason(
                                        e.target.value
                                    )
                                }
                                placeholder="Personal, Holiday, Emergency..."
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />

                        </div>

                    </div>


                    <button
                        type="submit"
                        disabled={
                            leaveLoading ||
                            !doctorId
                        }
                        className="mt-6 bg-orange-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-orange-700 transition disabled:opacity-50"
                    >

                        {leaveLoading
                            ? "Adding..."
                            : "Add Leave"}

                    </button>

                </form>


                {/* =================================================
                    EXISTING LEAVES
                ================================================= */}

                <div className="mt-8">

                    <h3 className="font-semibold text-gray-800 mb-4">
                        My Leaves
                    </h3>


                    {leaves.length === 0 ? (

                        <div className="border border-dashed rounded-lg p-8 text-center">

                            <p className="text-gray-500">
                                No leaves configured.
                            </p>

                        </div>

                    ) : (

                        <div className="space-y-3">

                            {leaves.map(
                                (leave) => (

                                    <div
                                        key={leave.id}
                                        className="border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                                    >

                                        <div>

                                            <p className="font-semibold text-gray-800">

                                                {formatDate(
                                                    leave.leave_date
                                                )}

                                            </p>


                                            {leave.reason && (

                                                <p className="text-gray-500 text-sm mt-1">

                                                    Reason:{" "}

                                                    {
                                                        leave.reason
                                                    }

                                                </p>

                                            )}

                                        </div>


                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDeleteLeave(
                                                    leave.id
                                                )
                                            }
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                        >

                                            Delete

                                        </button>

                                    </div>

                                )
                            )}

                        </div>

                    )}

                </div>

            </div>

        </div>

    </div>
);


}
