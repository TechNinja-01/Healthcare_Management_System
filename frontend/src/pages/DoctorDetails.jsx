import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getDoctorById } from "../api/doctorApi";
import AppointmentModal from "../components/AppointmentModal";
import DoctorViewMap from "../components/DoctorViewMap";
import { getCurrentLocation } from "../utils/location";

export default function DoctorDetails() {
    const { doctorId } = useParams();
    const navigate = useNavigate();

    // =====================================================
    // STATE
    // =====================================================

    const [doctor, setDoctor] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [distance, setDistance] = useState(null);
    const [distanceLoading, setDistanceLoading] =
        useState(false);

    const [showAppointmentModal, setShowAppointmentModal] =
        useState(false);

    // =====================================================
    // HAVERSINE DISTANCE CALCULATION
    // =====================================================

    const calculateDistance = (
        patientLatitude,
        patientLongitude,
        doctorLatitude,
        doctorLongitude
    ) => {
        const earthRadius = 6371;

        const lat1 = Number(patientLatitude);
        const lon1 = Number(patientLongitude);

        const lat2 = Number(doctorLatitude);
        const lon2 = Number(doctorLongitude);

        if (
            !Number.isFinite(lat1) ||
            !Number.isFinite(lon1) ||
            !Number.isFinite(lat2) ||
            !Number.isFinite(lon2)
        ) {
            return null;
        }

        const dLat =
            ((lat2 - lat1) * Math.PI) / 180;

        const dLon =
            ((lon2 - lon1) * Math.PI) / 180;

        const latitude1 =
            (lat1 * Math.PI) / 180;

        const latitude2 =
            (lat2 * Math.PI) / 180;

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(latitude1) *
                Math.cos(latitude2) *
                Math.sin(dLon / 2) ** 2;

        const c =
            2 *
            Math.atan2(
                Math.sqrt(a),
                Math.sqrt(1 - a)
            );

        return earthRadius * c;
    };

    // =====================================================
    // CALCULATE DISTANCE FROM PATIENT TO DOCTOR
    // =====================================================

    const calculateDoctorDistance = async (
        doctorData
    ) => {
        try {
            setDistanceLoading(true);

            // Check doctor's coordinates
            if (
                doctorData?.latitude === null ||
                doctorData?.latitude === undefined ||
                doctorData?.longitude === null ||
                doctorData?.longitude === undefined
            ) {
                console.warn(
                    "Doctor coordinates are not available"
                );

                setDistance(null);
                return;
            }

            // Get patient's current location
            const patientLocation =
                await getCurrentLocation();

            console.log(
                "Patient location:",
                patientLocation
            );

            if (!patientLocation) {
                setDistance(null);
                return;
            }

            const patientLatitude =
                patientLocation.latitude;

            const patientLongitude =
                patientLocation.longitude;

            console.log(
                "Patient latitude:",
                patientLatitude
            );

            console.log(
                "Patient longitude:",
                patientLongitude
            );

            console.log(
                "Doctor latitude:",
                doctorData.latitude
            );

            console.log(
                "Doctor longitude:",
                doctorData.longitude
            );

            // Calculate distance
            const calculatedDistance =
                calculateDistance(
                    patientLatitude,
                    patientLongitude,
                    doctorData.latitude,
                    doctorData.longitude
                );

            console.log(
                "Calculated distance:",
                calculatedDistance
            );

            if (calculatedDistance !== null) {
                setDistance(
                    calculatedDistance.toFixed(2)
                );
            } else {
                setDistance(null);
            }
        } catch (error) {
            console.error(
                "Error calculating doctor distance:",
                error
            );

            setDistance(null);
        } finally {
            setDistanceLoading(false);
        }
    };

    // =====================================================
    // FETCH DOCTOR
    // =====================================================

    const fetchDoctor = async () => {
        try {
            setLoading(true);
            setError("");

            const response =
                await getDoctorById(doctorId);

            console.log(
                "Doctor API response:",
                response
            );

            /*
             * Your ApiResponse appears to return:
             *
             * response.data.data
             */

            const doctorData =
                response?.data?.data;

            console.log(
                "Doctor data:",
                doctorData
            );

            if (!doctorData) {
                throw new Error(
                    "Doctor data not found"
                );
            }

            setDoctor(doctorData);

            // Calculate distance
            await calculateDoctorDistance(
                doctorData
            );
        } catch (error) {
            console.error(
                "Error fetching doctor:",
                error
            );

            setError(
                error?.response?.data?.message ||
                error?.response?.data?.detail ||
                error?.message ||
                "Unable to fetch doctor details"
            );
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // LOAD DOCTOR
    // =====================================================

    useEffect(() => {
        if (doctorId) {
            fetchDoctor();
        }
    }, [doctorId]);

    // =====================================================
    // REQUEST APPOINTMENT
    // =====================================================

    const handleRequestAppointment = () => {
        /*
         * We don't check patient_id here.
         *
         * The backend gets the logged-in patient from
         * the JWT access token.
         */

        const token =
            localStorage.getItem("access_token");

        if (!token) {
            alert(
                "Please login to request an appointment."
            );

            navigate("/login");
            return;
        }

        console.log(
            "Request appointment for doctor:",
            doctor.id
        );

        setShowAppointmentModal(true);
    };

    // =====================================================
    // APPOINTMENT SUCCESS
    // =====================================================

    const handleAppointmentSuccess = (
        response
    ) => {
        console.log(
            "Appointment created successfully:",
            response
        );

        setShowAppointmentModal(false);

        /*
         * Navigate to patient's appointments.
         */

        navigate("/patient/appointments");
    };

    // =====================================================
    // CLOSE APPOINTMENT MODAL
    // =====================================================

    const handleCloseAppointmentModal = () => {
        setShowAppointmentModal(false);
    };

    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">

                <div className="mx-auto max-w-5xl py-20 text-center">

                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

                    <p className="text-gray-600">
                        Loading doctor details...
                    </p>

                </div>

            </div>
        );
    }

    // =====================================================
    // ERROR
    // =====================================================

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">

                <div className="mx-auto max-w-5xl">

                    <div className="rounded-lg bg-red-50 p-5 text-red-700">
                        {error}
                    </div>

                    <button
                        onClick={() => navigate(-1)}
                        className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
                    >
                        Go Back
                    </button>

                </div>

            </div>
        );
    }

    // =====================================================
    // DOCTOR NOT FOUND
    // =====================================================

    if (!doctor) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">

                <div className="mx-auto max-w-5xl py-20 text-center">

                    <p className="text-gray-600">
                        Doctor not found.
                    </p>

                    <button
                        onClick={() => navigate(-1)}
                        className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
                    >
                        Go Back
                    </button>

                </div>

            </div>
        );
    }

    // =====================================================
    // UI
    // =====================================================

    return (
        <div className="min-h-screen bg-gray-50 p-6">

            <div className="mx-auto max-w-5xl">

                {/* =================================================
                    BACK BUTTON
                ================================================== */}

                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition hover:bg-gray-100"
                >
                    ← Back to Doctors
                </button>

                {/* =================================================
                    DOCTOR INFORMATION
                ================================================== */}

                <div className="rounded-xl bg-white p-6 shadow-sm">

                    <div className="flex flex-col justify-between gap-4 md:flex-row">

                        <div>

                            <h1 className="text-3xl font-bold text-gray-800">
                                Dr. {doctor.name}
                            </h1>

                            <p className="mt-2 text-lg font-medium text-blue-600">
                                {doctor.specialization ||
                                    "Specialization not available"}
                            </p>

                        </div>

                        {/* Distance badge */}

                        <div>

                            {distanceLoading ? (
                                <span className="inline-block rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-500">
                                    Calculating distance...
                                </span>
                            ) : distance !== null ? (
                                <span className="inline-block rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600">
                                    📍 {distance} km away
                                </span>
                            ) : (
                                <span className="inline-block rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-500">
                                    Distance unavailable
                                </span>
                            )}

                        </div>

                    </div>

                    <div className="mt-6 grid gap-6 md:grid-cols-3">

                        {/* Hospital */}

                        <div>

                            <p className="text-sm text-gray-500">
                                Hospital
                            </p>

                            <p className="mt-1 font-medium text-gray-800">
                                {doctor.hospital_name ||
                                    "Not available"}
                            </p>

                        </div>

                        {/* Address */}

                        <div>

                            <p className="text-sm text-gray-500">
                                Address
                            </p>

                            <p className="mt-1 font-medium text-gray-800">
                                {doctor.address ||
                                    "Not available"}
                            </p>

                        </div>

                        {/* Distance */}

                        <div>

                            <p className="text-sm text-gray-500">
                                Distance from you
                            </p>

                            {distanceLoading ? (
                                <p className="mt-1 font-medium text-gray-500">
                                    Calculating...
                                </p>
                            ) : distance !== null ? (
                                <p className="mt-1 font-semibold text-blue-600">
                                    {distance} km away
                                </p>
                            ) : (
                                <p className="mt-1 font-medium text-gray-500">
                                    Distance unavailable
                                </p>
                            )}

                        </div>

                    </div>

                </div>

                {/* =================================================
                    GOOGLE MAP
                ================================================== */}

                <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">

                    <h2 className="mb-4 text-xl font-semibold text-gray-800">
                        Doctor Location
                    </h2>

                    {doctor.latitude !== null &&
                    doctor.latitude !== undefined &&
                    doctor.longitude !== null &&
                    doctor.longitude !== undefined ? (

                        <DoctorViewMap
                            latitude={doctor.latitude}
                            longitude={doctor.longitude}
                            doctorName={doctor.name}
                        />

                    ) : (

                        <div className="flex h-64 items-center justify-center rounded-lg bg-gray-100">

                            <p className="text-gray-500">
                                Doctor location is not available.
                            </p>

                        </div>

                    )}

                </div>

                {/* =================================================
                    APPOINTMENT
                ================================================== */}

                <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">

                    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

                        <div>

                            <h2 className="text-xl font-semibold text-gray-800">
                                Need an appointment?
                            </h2>

                            <p className="mt-2 text-gray-600">
                                Request an appointment with Dr.{" "}
                                {doctor.name}.
                            </p>

                            <p className="mt-2 text-sm text-gray-500">
                                Select your preferred date and time.
                            </p>

                        </div>

                        <button
                            type="button"
                            onClick={
                                handleRequestAppointment
                            }
                            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 active:scale-95"
                        >
                            Request Appointment
                        </button>

                    </div>

                </div>

                {/* =================================================
                    APPOINTMENT MODAL
                ================================================== */}

                <AppointmentModal
                    isOpen={
                        showAppointmentModal
                    }
                    onClose={
                        handleCloseAppointmentModal
                    }
                    doctor={doctor}
                    onSuccess={
                        handleAppointmentSuccess
                    }
                />

            </div>

        </div>
    );
}

