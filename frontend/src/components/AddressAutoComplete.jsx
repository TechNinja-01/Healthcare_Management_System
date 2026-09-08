import {
  useEffect,
  useRef,
} from "react";

import {
  loadGoogleMaps,
} from "../utils/googlemaps";

export default function AddressAutocomplete({
  value,
  onAddressChange,
  onLocationChange,
}) {
  const inputRef =
    useRef(null);

  const autocompleteRef =
    useRef(null);

  useEffect(() => {
    let mounted = true;

    const initialize =
      async () => {
        try {
          // Make sure Google Maps
          // and Places are loaded
          await loadGoogleMaps();

          if (
            !mounted ||
            !inputRef.current
          ) {
            return;
          }

          const autocomplete =
            new window.google.maps.places.Autocomplete(
              inputRef.current,
              {
                fields: [
                  "formatted_address",
                  "geometry",
                  "name",
                ],

                componentRestrictions: {
                  country: "in",
                },

                types: [
                  "geocode",
                  "establishment",
                ],
              }
            );

          autocompleteRef.current =
            autocomplete;

          autocomplete.addListener(
            "place_changed",
            () => {
              const place =
                autocomplete.getPlace();

              console.log(
                "Google place selected:",
                place
              );

              if (
                !place.geometry ||
                !place.geometry.location
              ) {
                console.error(
                  "Selected place has no coordinates"
                );

                return;
              }

              const address =
                place.formatted_address ||
                place.name ||
                "";

              const latitude =
                place.geometry.location.lat();

              const longitude =
                place.geometry.location.lng();

              console.log(
                "Selected address:",
                address
              );

              console.log(
                "Latitude:",
                latitude
              );

              console.log(
                "Longitude:",
                longitude
              );

              // Update address
              onAddressChange(
                address
              );

              // Update coordinates
              onLocationChange({
                latitude,
                longitude,
              });
            }
          );

        } catch (error) {
          console.error(
            "Google autocomplete error:",
            error
          );
        }
      };

    initialize();

    return () => {
      mounted = false;

      if (
        autocompleteRef.current &&
        window.google?.maps?.event
      ) {
        window.google.maps.event.clearInstanceListeners(
          autocompleteRef.current
        );
      }

      autocompleteRef.current =
        null;
    };
  }, [
    onAddressChange,
    onLocationChange,
  ]);

  return (
    <div className="w-full">

      <input
        ref={inputRef}
        type="text"
        defaultValue={
          value || ""
        }
        placeholder="Enter clinic address"
        autoComplete="off"
        className="
          w-full
          rounded-md
          border
          border-gray-300
          bg-white
          px-4
          py-3
          text-gray-900
          placeholder-gray-400
          outline-none
          transition
          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-200
        "
      />

    </div>
  );
}