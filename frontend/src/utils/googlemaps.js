import {
    setOptions,
    importLibrary,
} from "@googlemaps/js-api-loader";

setOptions({
    key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    v: "weekly",
});

export const loadGoogleMaps = async () => {
    const { Map } = await importLibrary("maps");

    const { AdvancedMarkerElement } =
        await importLibrary("marker");

    return {
        Map,
        AdvancedMarkerElement,
    };
};