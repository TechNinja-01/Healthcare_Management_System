import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  loadGoogleMaps,
} from "../utils/googlemaps";

const DEFAULT_LOCATION = {
  latitude: 29.4163323,
  longitude: 76.9866279,
};

export default function DoctorLocationMap({
  latitude,
  longitude,
  onLocationChange,
}) {
  const mapContainerRef =
    useRef(null);

  const mapRef =
    useRef(null);

  const markerRef =
    useRef(null);

  const googleMapsRef =
    useRef(null);

  const [mapReady, setMapReady] =
    useState(false);

  // =====================================================
  // INITIALIZE MAP
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    const initializeMap = async () => {
      try {
        console.log(
          "Initializing Google Map..."
        );

        if (!mapContainerRef.current) {
          console.error(
            "Map container does not exist"
          );

          return;
        }

        const {
          Map,
          AdvancedMarkerElement,
        } =
          await loadGoogleMaps();

        if (cancelled) {
          return;
        }

        googleMapsRef.current = {
          Map,
          AdvancedMarkerElement,
        };

        // =================================================
        // INITIAL LOCATION
        // =================================================

        const parsedLatitude =
          Number(latitude);

        const parsedLongitude =
          Number(longitude);

        const lat =
          Number.isFinite(
            parsedLatitude
          )
            ? parsedLatitude
            : DEFAULT_LOCATION.latitude;

        const lng =
          Number.isFinite(
            parsedLongitude
          )
            ? parsedLongitude
            : DEFAULT_LOCATION.longitude;

        console.log(
          "Map initial latitude:",
          lat
        );

        console.log(
          "Map initial longitude:",
          lng
        );

        // =================================================
        // CREATE MAP
        // =================================================

        const map =
          new Map(
            mapContainerRef.current,
            {
              center: {
                lat,
                lng,
              },

              zoom: 15,

              mapId:
                "DEMO_MAP_ID",

              mapTypeControl:
                true,

              streetViewControl:
                true,

              fullscreenControl:
                true,

              zoomControl:
                true,
            }
          );

        mapRef.current =
          map;

        // =================================================
        // CREATE MARKER
        // =================================================

        const marker =
          new AdvancedMarkerElement(
            {
              map,

              position: {
                lat,
                lng,
              },

              gmpDraggable:
                true,
            }
          );

        markerRef.current =
          marker;

        // =================================================
        // MARKER DRAG
        // =================================================

        marker.addListener(
          "dragend",
          () => {
            const position =
              marker.position;

            if (!position) {
              return;
            }

            const newLatitude =
              typeof position.lat ===
              "function"
                ? position.lat()
                : position.lat;

            const newLongitude =
              typeof position.lng ===
              "function"
                ? position.lng()
                : position.lng;

            console.log(
              "Marker dragged:"
            );

            console.log(
              "Latitude:",
              newLatitude
            );

            console.log(
              "Longitude:",
              newLongitude
            );

            onLocationChange({
              latitude:
                Number(
                  newLatitude
                ),

              longitude:
                Number(
                  newLongitude
                ),
            });
          }
        );

        // =================================================
        // MAP READY
        // =================================================

        setMapReady(true);

        console.log(
          "Google Map initialized successfully"
        );

      } catch (error) {
        console.error(
          "GOOGLE MAP INITIALIZATION ERROR:",
          error
        );
      }
    };

    initializeMap();

    // =====================================================
    // CLEANUP
    // =====================================================

    return () => {
      cancelled = true;

      if (markerRef.current) {
        markerRef.current.map =
          null;
      }

      markerRef.current =
        null;

      mapRef.current =
        null;

      googleMapsRef.current =
        null;

      setMapReady(false);
    };

  }, []);

  // =====================================================
  // UPDATE MAP WHEN LOCATION CHANGES
  // =====================================================

  useEffect(() => {
    if (
      !mapRef.current ||
      !markerRef.current
    ) {
      console.log(
        "Map not ready yet"
      );

      return;
    }

    const lat =
      Number(latitude);

    const lng =
      Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      console.log(
        "Invalid coordinates:",
        latitude,
        longitude
      );

      return;
    }

    const position = {
      lat,
      lng,
    };

    console.log(
      "Updating map location:",
      position
    );

    // Move map
    mapRef.current.setCenter(
      position
    );

    // Zoom
    mapRef.current.setZoom(
      16
    );

    // Move marker
    markerRef.current.position =
      position;

  }, [
    latitude,
    longitude,
  ]);

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="space-y-3">

      {/* MAP STATUS */}

      {!mapReady && (
        <div className="text-sm text-gray-500">
          Loading map...
        </div>
      )}

      {/* MAP */}

      <div
        ref={
          mapContainerRef
        }
        style={{
          width: "100%",
          height: "500px",
          minHeight: "500px",
          borderRadius: "10px",
          overflow: "hidden",
          border:
            "1px solid #d1d5db",
          backgroundColor:
            "#e5e7eb",
        }}
      />

      {/* COORDINATES */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div>
          <label className="block text-sm font-medium mb-1">
            Latitude
          </label>

          <input
            type="text"
            value={
              latitude ?? ""
            }
            readOnly
            className="
              w-full
              border
              rounded-md
              px-3
              py-2
              bg-gray-50
            "
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Longitude
          </label>

          <input
            type="text"
            value={
              longitude ?? ""
            }
            readOnly
            className="
              w-full
              border
              rounded-md
              px-3
              py-2
              bg-gray-50
            "
          />
        </div>

      </div>

    </div>
  );
}