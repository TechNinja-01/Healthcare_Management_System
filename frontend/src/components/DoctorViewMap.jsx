import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../utils/googlemaps";

export default function DoctorViewMap({
  latitude,
  longitude,
  doctorName,
}) {
  // HTML div where Google Map will be rendered
  const mapContainerRef = useRef(null);

  // Google Map instance
  const mapRef = useRef(null);

  // Google Advanced Marker instance
  const markerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const initializeMap = async () => {
      try {
        setLoading(true);
        setError("");

        // ============================================
        // CHECK MAP CONTAINER
        // ============================================

        if (!mapContainerRef.current) {
          throw new Error("Map container is not available");
        }

        // ============================================
        // VALIDATE COORDINATES
        // ============================================

        const latitudeNumber = Number(latitude);
        const longitudeNumber = Number(longitude);

        if (
          !Number.isFinite(latitudeNumber) ||
          !Number.isFinite(longitudeNumber)
        ) {
          throw new Error(
            "Doctor location is not available"
          );
        }

        console.log(
          "Doctor latitude:",
          latitudeNumber
        );

        console.log(
          "Doctor longitude:",
          longitudeNumber
        );

        // ============================================
        // LOAD GOOGLE MAPS
        // ============================================

        const {
          Map,
          AdvancedMarkerElement,
        } = await loadGoogleMaps();

        if (cancelled) {
          return;
        }

        // ============================================
        // POSITION
        // ============================================

        const position = {
          lat: latitudeNumber,
          lng: longitudeNumber,
        };

        // ============================================
        // CREATE GOOGLE MAP
        // ============================================

        // IMPORTANT:
        // Use mapContainerRef.current here
        // NOT mapRef.current
        const map = new Map(
          mapContainerRef.current,
          {
            center: position,
            zoom: 15,

            mapId: "DEMO_MAP_ID",

            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
            zoomControl: true,
          }
        );

        if (cancelled) {
          return;
        }

        mapRef.current = map;

        // ============================================
        // CREATE MARKER
        // ============================================

        const marker = new AdvancedMarkerElement({
          map: map,
          position: position,
          title: doctorName || "Doctor",
        });

        if (cancelled) {
          marker.map = null;
          return;
        }

        markerRef.current = marker;

        // ============================================
        // SUCCESS
        // ============================================

        setLoading(false);

        console.log(
          "Google Map initialized successfully"
        );

      } catch (error) {
        console.error(
          "Google Map error:",
          error
        );

        if (!cancelled) {
          setError(
            error?.message ||
            "Unable to load Google Map"
          );

          setLoading(false);
        }
      }
    };

    initializeMap();

    // ============================================
    // CLEANUP
    // ============================================

    return () => {
      cancelled = true;

      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }

      mapRef.current = null;
    };
  }, [
    latitude,
    longitude,
    doctorName,
  ]);

  // ============================================
  // UI
  // ============================================

  return (
    <div className="relative w-full">

      {/* MAP CONTAINER */}

      <div
        ref={mapContainerRef}
        className="w-full overflow-hidden rounded-lg border border-gray-300"
        style={{
          height: "450px",
          minHeight: "450px",
        }}
      />

      {/* LOADING */}

      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-100">
          <p className="text-gray-600">
            Loading Google Map...
          </p>
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-50">
          <p className="px-4 text-center text-red-600">
            {error}
          </p>
        </div>
      )}

    </div>
  );
}