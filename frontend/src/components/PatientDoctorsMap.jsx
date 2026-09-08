import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../utils/googlemaps";

export default function PatientDoctorsMap({
    doctors = [],
    onDoctorClick,
}) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const onDoctorClickRef = useRef(onDoctorClick);

    const [mapReady, setMapReady] = useState(false);

    // =====================================================
    // KEEP LATEST CLICK HANDLER
    // =====================================================

    useEffect(() => {
        onDoctorClickRef.current = onDoctorClick;
    }, [onDoctorClick]);

    // =====================================================
    // INITIALIZE MAP
    // =====================================================

    useEffect(() => {
        let cancelled = false;

        const initializeMap = async () => {
            try {
                if (!mapRef.current) {
                    return;
                }

                const { Map } = await loadGoogleMaps();

                if (cancelled) {
                    return;
                }

                // Prevent duplicate map initialization
                if (mapInstanceRef.current) {
                    setMapReady(true);
                    return;
                }

                const defaultCenter = {
                    lat: 29.3909464,
                    lng: 76.9635023,
                };

                const map = new Map(mapRef.current, {
                    center: defaultCenter,
                    zoom: 7,

                    // Required for AdvancedMarkerElement
                    mapId: "DEMO_MAP_ID",

                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                    zoomControl: true,
                });

                mapInstanceRef.current = map;

                // IMPORTANT:
                // Tell marker effect that map now exists
                setMapReady(true);

            } catch (error) {
                console.error(
                    "Google Map initialization error:",
                    error
                );
            }
        };

        initializeMap();

        return () => {
            cancelled = true;

            markersRef.current.forEach((marker) => {
                marker.map = null;
            });

            markersRef.current = [];

            mapInstanceRef.current = null;
            setMapReady(false);
        };
    }, []);

    // =====================================================
    // UPDATE DOCTOR MARKERS
    // =====================================================

    useEffect(() => {
        if (!mapReady || !mapInstanceRef.current) {
            return;
        }

        let cancelled = false;

        const updateMarkers = async () => {
            try {
                const {
                    AdvancedMarkerElement,
                } = await loadGoogleMaps();

                if (cancelled || !mapInstanceRef.current) {
                    return;
                }

                const map = mapInstanceRef.current;

                // =================================================
                // REMOVE OLD MARKERS
                // =================================================

                markersRef.current.forEach((marker) => {
                    marker.map = null;
                });

                markersRef.current = [];

                // =================================================
                // VALID DOCTORS
                // =================================================

                const validDoctors = doctors.filter((doctor) => {
                    const latitude = Number(
                        doctor?.latitude
                    );

                    const longitude = Number(
                        doctor?.longitude
                    );

                    return (
                        Number.isFinite(latitude) &&
                        Number.isFinite(longitude) &&
                        latitude >= -90 &&
                        latitude <= 90 &&
                        longitude >= -180 &&
                        longitude <= 180
                    );
                });

                console.log(
                    "Doctors received by map:",
                    doctors
                );

                console.log(
                    "Doctors with valid coordinates:",
                    validDoctors
                );

                // =================================================
                // NO DOCTORS WITH COORDINATES
                // =================================================

                if (validDoctors.length === 0) {
                    map.setCenter({
                        lat: 29.3909464,
                        lng: 76.9635023,
                    });

                    map.setZoom(7);

                    return;
                }

                // =================================================
                // CREATE BOUNDS
                // =================================================

                const bounds =
                    new google.maps.LatLngBounds();

                // =================================================
                // CREATE DOCTOR MARKERS
                // =================================================

                validDoctors.forEach((doctor) => {
                    const position = {
                        lat: Number(
                            doctor.latitude
                        ),

                        lng: Number(
                            doctor.longitude
                        ),
                    };

                    // =================================================
                    // CREATE CUSTOM MARKER ELEMENT
                    // =================================================

                    const marker = new google.maps.Marker({
                        map,
                        position,
                        title: doctor.name
                            ? `Dr. ${doctor.name}`
                            : "Doctor",
                    });

                    // =================================================
                    // MARKER CLICK
                    // =================================================

                    marker.addListener("click", () => {
                        console.log("Clicked doctor:", doctor);

                        if (onDoctorClickRef.current) {
                            onDoctorClickRef.current(doctor);
                        }
                    });

                    markersRef.current.push(marker);

                    bounds.extend(position);
                });

                // =================================================
                // FIT ALL DOCTORS ON MAP
                // =================================================

                if (validDoctors.length > 1) {
                    map.fitBounds(bounds);

                    google.maps.event.addListenerOnce(
                        map,
                        "bounds_changed",
                        () => {
                            const zoom =
                                map.getZoom();

                            if (
                                zoom &&
                                zoom > 15
                            ) {
                                map.setZoom(15);
                            }
                        }
                    );
                }

                // =================================================
                // ONE DOCTOR
                // =================================================

                if (validDoctors.length === 1) {
                    map.setCenter({
                        lat: Number(
                            validDoctors[0].latitude
                        ),

                        lng: Number(
                            validDoctors[0].longitude
                        ),
                    });

                    map.setZoom(14);
                }

            } catch (error) {
                console.error(
                    "Doctor marker error:",
                    error
                );
            }
        };

        updateMarkers();

        return () => {
            cancelled = true;
        };

    }, [doctors, mapReady]);

    // =====================================================
    // RENDER MAP
    // =====================================================

    return (
        <div
            ref={mapRef}
            className="h-[550px] w-full rounded-xl"
        />
    );
}