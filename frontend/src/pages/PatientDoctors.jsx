import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import PatientDoctorsMap from "../components/PatientDoctorsMap";

import {
    getDoctors,
    getNearbyDoctors,
} from "../api/doctorApi";

import { getCurrentLocation } from "../utils/location";

export default function PatientDoctors() {

    const navigate = useNavigate();

    // =====================================================
    // STATE
    // =====================================================

    const [doctors, setDoctors] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [searchLoading, setSearchLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [search, setSearch] =
        useState("");

    const [distanceFilter, setDistanceFilter] =
        useState("all");

    const [patientLocation, setPatientLocation] =
        useState(null);


    // =====================================================
    // GET PATIENT LOCATION
    // =====================================================

    const fetchPatientLocation = async () => {

        try {

            const location =
                await getCurrentLocation();

            console.log(
                "Patient location:",
                location
            );

            setPatientLocation(location);

            return location;

        } catch (error) {

            console.error(
                "Location error:",
                error
            );

            return null;
        }
    };


    // =====================================================
    // GET ALL DOCTORS
    // =====================================================

    const fetchAllDoctors = async () => {

        try {

            setLoading(true);

            setError("");

            const response =
                await getDoctors();

            console.log(
                "All doctors:",
                response
            );

            const data =
                response?.data?.data;

            if (Array.isArray(data)) {

                setDoctors(data);

            } else {

                setDoctors([]);
            }

        } catch (error) {

            console.error(
                "Error fetching doctors:",
                error
            );

            setError(
                error.response?.data?.detail ||
                error.response?.data?.message ||
                error.message ||
                "Unable to fetch doctors"
            );

            setDoctors([]);

        } finally {

            setLoading(false);
        }
    };


    // =====================================================
    // GET NEARBY DOCTORS
    // =====================================================

    const fetchNearbyDoctors = async (
        location,
        radius,
        searchValue = ""
    ) => {

        try {

            setLoading(true);

            setError("");

            const response =
                await getNearbyDoctors(
                    location.latitude,
                    location.longitude,
                    radius,
                    searchValue
                );

            console.log(
                "Nearby doctors:",
                response
            );

            const data =
                response?.data?.data;

            if (Array.isArray(data)) {

                setDoctors(data);

            } else {

                setDoctors([]);
            }

        } catch (error) {

            console.error(
                "Nearby doctor error:",
                error
            );

            setError(
                error.response?.data?.detail ||
                error.response?.data?.message ||
                error.message ||
                "Unable to find nearby doctors"
            );

            setDoctors([]);

        } finally {

            setLoading(false);
        }
    };


    // =====================================================
    // LOAD DOCTORS
    // =====================================================

    const loadDoctors = async (
        searchValue,
        radiusValue
    ) => {

        // -------------------------------------------------
        // ALL DOCTORS
        // -------------------------------------------------

        if (radiusValue === "all") {

            if (!searchValue.trim()) {

                await fetchAllDoctors();

                return;
            }

            // Search needs current location
            // only if distance filter is not all.
            //
            // For "All Doctors", we can search
            // locally using the frontend list.

            try {

                setSearchLoading(true);

                const response =
                    await getDoctors();

                const data =
                    response?.data?.data;

                if (!Array.isArray(data)) {

                    setDoctors([]);

                    return;
                }

                const value =
                    searchValue
                        .trim()
                        .toLowerCase();

                const filtered =
                    data.filter(
                        (doctor) => {

                            const name =
                                String(
                                    doctor.name ||
                                    ""
                                ).toLowerCase();

                            const specialization =
                                String(
                                    doctor.specialization ||
                                    ""
                                ).toLowerCase();

                            const hospital =
                                String(
                                    doctor.hospital_name ||
                                    ""
                                ).toLowerCase();

                            const address =
                                String(
                                    doctor.address ||
                                    ""
                                ).toLowerCase();

                            return (
                                name.includes(value) ||
                                specialization.includes(value) ||
                                hospital.includes(value) ||
                                address.includes(value)
                            );
                        }
                    );

                setDoctors(filtered);

            } catch (error) {

                console.error(
                    "Search error:",
                    error
                );

                setError(
                    error.response?.data?.message ||
                    "Unable to search doctors"
                );

            } finally {

                setSearchLoading(false);
            }

            return;
        }


        // -------------------------------------------------
        // GET LOCATION
        // -------------------------------------------------

        let location =
            patientLocation;

        if (!location) {

            location =
                await fetchPatientLocation();
        }

        if (!location) {

            setError(
                "Please allow location access to search nearby doctors."
            );

            return;
        }


        // -------------------------------------------------
        // NEARBY + SEARCH
        // -------------------------------------------------

        await fetchNearbyDoctors(
            location,
            Number(radiusValue),
            searchValue
        );
    };


    // =====================================================
    // DIRECT SEARCH WITH DEBOUNCE
    // =====================================================

    useEffect(() => {

        const timer =
            setTimeout(() => {

                loadDoctors(
                    search,
                    distanceFilter
                );

            }, 400);

        return () => {
            clearTimeout(timer);
        };

    }, [
        search,
        distanceFilter,
    ]);


    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {

        const initialize = async () => {

            await fetchPatientLocation();

            await fetchAllDoctors();
        };

        initialize();

    }, []);


    // =====================================================
    // DISTANCE
    // =====================================================

    const calculateDistance = (
        patientLatitude,
        patientLongitude,
        doctorLatitude,
        doctorLongitude
    ) => {

        const earthRadius = 6371;

        const lat1 =
            Number(patientLatitude);

        const lon1 =
            Number(patientLongitude);

        const lat2 =
            Number(doctorLatitude);

        const lon2 =
            Number(doctorLongitude);

        if (
            !Number.isFinite(lat1) ||
            !Number.isFinite(lon1) ||
            !Number.isFinite(lat2) ||
            !Number.isFinite(lon2)
        ) {
            return null;
        }

        const dLat =
            ((lat2 - lat1) *
                Math.PI) /
            180;

        const dLon =
            ((lon2 - lon1) *
                Math.PI) /
            180;

        const lat1Rad =
            (lat1 * Math.PI) /
            180;

        const lat2Rad =
            (lat2 * Math.PI) /
            180;

        const a =
            Math.sin(dLat / 2) *
            Math.sin(dLat / 2) +

            Math.cos(lat1Rad) *
            Math.cos(lat2Rad) *

            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c =
            2 *
            Math.atan2(
                Math.sqrt(a),
                Math.sqrt(1 - a)
            );

        return earthRadius * c;
    };


    // =====================================================
    // GET DOCTOR DISTANCE
    // =====================================================

    const getDoctorDistance = (
        doctor
    ) => {

        // Backend distance
        if (
            doctor.distance_km !==
            undefined &&
            doctor.distance_km !== null
        ) {

            return Number(
                doctor.distance_km
            );
        }

        // Frontend distance
        if (
            patientLocation &&
            doctor.latitude !== null &&
            doctor.longitude !== null
        ) {

            return calculateDistance(
                patientLocation.latitude,
                patientLocation.longitude,
                doctor.latitude,
                doctor.longitude
            );
        }

        return null;
    };


    // =====================================================
    // DOCTOR CLICK
    // =====================================================

    const handleDoctorClick = (
        doctor
    ) => {

        console.log(
            "Selected doctor:",
            doctor
        );

        navigate(
            `/patient/doctors/${doctor.id}`
        );
    };


    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {

        return (
            <div className="min-h-screen bg-gray-50 p-6">

                <div className="mx-auto max-w-7xl py-20 text-center">

                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

                    <p className="text-lg text-gray-600">
                        Finding doctors...
                    </p>

                </div>

            </div>
        );
    }


    // =====================================================
    // PAGE
    // =====================================================

    return (
        <div className="min-h-screen bg-gray-50 p-6">

            <div className="mx-auto max-w-7xl">


                {/* ================================================= */}
                {/* HEADER */}
                {/* ================================================= */}

                <div className="mb-6">

                    <h1 className="text-3xl font-bold text-gray-800">
                        Find Doctors
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Find doctors near your location
                    </p>

                </div>


                {/* ================================================= */}
                {/* SEARCH + RADIUS */}
                {/* ================================================= */}

                <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">

                        {/* SEARCH */}
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                🔍
                            </span>

                            <input
                                type="text"
                                value={search}
                                onChange={(e) =>
                                    setSearch(e.target.value)
                                }
                                placeholder="Search doctor, specialization, hospital..."
                                className="w-full rounded-lg border border-gray-300 py-2.5 pl-11 pr-4 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />

                            {searchLoading && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                                </div>
                            )}
                        </div>

                        {/* RADIUS DROPDOWN */}
                        <div className="w-full md:w-44">
                            <select
                                value={distanceFilter}
                                onChange={(e) =>
                                    setDistanceFilter(e.target.value)
                                }
                                className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            >
                                <option value="all">
                                    All Doctors
                                </option>

                                <option value="5">
                                    Within 5 km
                                </option>

                                <option value="10">
                                    Within 10 km
                                </option>
                            </select>
                        </div>

                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                        Search doctors by name, specialization or hospital
                    </p>
                </div>


                {/* ================================================= */}
                {/* ERROR */}
                {/* ================================================= */}

                {error && (

                    <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">

                        {error}

                    </div>

                )}


                {/* ================================================= */}
                {/* MAP */}
                {/* ================================================= */}

                <div className="mb-8 overflow-hidden rounded-xl bg-white p-5 shadow-sm">

                    <div className="mb-4">

                        <h2 className="text-xl font-semibold text-gray-800">
                            Doctor Locations
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">

                            {distanceFilter ===
                                "all"
                                ? "Showing all matching doctors"
                                : `Showing matching doctors within ${distanceFilter} km`}

                            {" • "}

                            {doctors.length} doctor
                            {doctors.length !==
                                1
                                ? "s"
                                : ""}

                        </p>

                    </div>


                    <PatientDoctorsMap
                        doctors={doctors}
                        onDoctorClick={
                            handleDoctorClick
                        }
                    />

                </div>


                {/* ================================================= */}
                {/* DOCTORS */}
                {/* ================================================= */}

                <div className="mb-5">

                    <h2 className="text-2xl font-bold text-gray-800">
                        Available Doctors
                    </h2>

                    <p className="mt-1 text-gray-500">
                        {doctors.length} doctor
                        {doctors.length !==
                            1
                            ? "s"
                            : ""}{" "}
                        found
                    </p>

                </div>


                {/* ================================================= */}
                {/* NO DOCTORS */}
                {/* ================================================= */}

                {doctors.length === 0 ? (

                    <div className="rounded-xl bg-white p-10 text-center shadow-sm">

                        <div className="text-5xl">
                            🩺
                        </div>

                        <h3 className="mt-4 text-xl font-semibold text-gray-800">
                            No doctors found
                        </h3>

                        <p className="mt-2 text-gray-500">

                            {search
                                ? `No doctors found for "${search}"`
                                : distanceFilter !==
                                    "all"
                                    ? `No doctors found within ${distanceFilter} km.`
                                    : "No doctors are currently available."}

                        </p>

                    </div>

                ) : (

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

                        {doctors.map(
                            (doctor) => {

                                const distance =
                                    getDoctorDistance(
                                        doctor
                                    );

                                return (

                                    <div
                                        key={
                                            doctor.id
                                        }
                                        className="rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                                    >

                                        {/* NAME */}

                                        <div className="flex items-start justify-between gap-3">

                                            <div>

                                                <h3 className="text-xl font-bold text-gray-800">
                                                    Dr.{" "}
                                                    {
                                                        doctor.name
                                                    }
                                                </h3>

                                                <p className="mt-1 font-medium text-blue-600">
                                                    {
                                                        doctor.specialization
                                                    }
                                                </p>

                                            </div>


                                            {distance !==
                                                null && (

                                                    <span className="whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">

                                                        {distance.toFixed(
                                                            2
                                                        )}{" "}
                                                        km

                                                    </span>
                                                )}

                                        </div>


                                        {/* HOSPITAL */}

                                        <div className="mt-5">

                                            <p className="text-sm text-gray-500">
                                                Hospital
                                            </p>

                                            <p className="mt-1 font-medium text-gray-800">
                                                {doctor.hospital_name ||
                                                    "Not available"}
                                            </p>

                                        </div>


                                        {/* ADDRESS */}

                                        <div className="mt-4">

                                            <p className="text-sm text-gray-500">
                                                Address
                                            </p>

                                            <p className="mt-1 text-sm text-gray-700">
                                                {doctor.address ||
                                                    "Not available"}
                                            </p>

                                        </div>


                                        {/* DISTANCE */}

                                        <div className="mt-4">

                                            <p className="text-sm text-gray-500">
                                                Distance from you
                                            </p>

                                            {distance !==
                                                null ? (

                                                <p className="mt-1 font-semibold text-blue-600">

                                                    📍{" "}
                                                    {distance.toFixed(
                                                        2
                                                    )}{" "}
                                                    km away

                                                </p>

                                            ) : (

                                                <p className="mt-1 text-sm text-gray-500">
                                                    Distance unavailable
                                                </p>

                                            )}

                                        </div>


                                        {/* VIEW */}

                                        <button
                                            onClick={() =>
                                                handleDoctorClick(
                                                    doctor
                                                )
                                            }
                                            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700"
                                        >
                                            View Doctor
                                        </button>

                                    </div>
                                );
                            }
                        )}

                    </div>

                )}

            </div>

        </div>
    );
}