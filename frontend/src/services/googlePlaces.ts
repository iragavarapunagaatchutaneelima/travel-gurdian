import { LocationDetails, PlaceSuggestion } from "../types/location";

declare global {
  interface Window {
    google?: any;
    __googleMapsLoadingPromise?: Promise<void>;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

/**
 * Dynamically loads the Google Maps JavaScript API with Places library.
 * Returns a Promise that resolves when window.google.maps is available.
 */
export function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cannot load Google Maps in SSR environment"));
  }

  if (window.google?.maps?.places) {
    return Promise.resolve();
  }

  if (window.__googleMapsLoadingPromise) {
    return window.__googleMapsLoadingPromise;
  }

  const apiKey = GOOGLE_MAPS_API_KEY.trim();
  if (!apiKey || apiKey === "your_google_maps_api_key_here") {
    return Promise.reject(new Error("MISSING_API_KEY"));
  }

  window.__googleMapsLoadingPromise = new Promise((resolve, reject) => {
    // Check if script element already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => reject(new Error("LOAD_ERROR")));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps?.places) {
        resolve();
      } else {
        reject(new Error("PLACES_LIBRARY_UNAVAILABLE"));
      }
    };
    script.onerror = () => {
      reject(new Error("LOAD_ERROR"));
    };
    document.head.appendChild(script);
  });

  return window.__googleMapsLoadingPromise;
}

let autocompleteServiceInstance: any = null;
let placesServiceInstance: any = null;
let geocoderInstance: any = null;
let currentSessionToken: any = null;

function getSessionToken(): any {
  if (!currentSessionToken && window.google?.maps?.places?.AutocompleteSessionToken) {
    currentSessionToken = new window.google.maps.places.AutocompleteSessionToken();
  }
  return currentSessionToken;
}

export function resetPlacesSessionToken(): void {
  currentSessionToken = null;
}

function getAutocompleteService(): any {
  if (!autocompleteServiceInstance && window.google?.maps?.places) {
    autocompleteServiceInstance = new window.google.maps.places.AutocompleteService();
  }
  return autocompleteServiceInstance;
}

function getPlacesService(): any {
  if (!placesServiceInstance && window.google?.maps?.places) {
    const dummyDiv = document.createElement("div");
    placesServiceInstance = new window.google.maps.places.PlacesService(dummyDiv);
  }
  return placesServiceInstance;
}

function getGeocoder(): any {
  if (!geocoderInstance && window.google?.maps) {
    geocoderInstance = new window.google.maps.Geocoder();
  }
  return geocoderInstance;
}

/**
 * Fetches autocomplete suggestions for a search query.
 */
export async function getAutocompletePredictions(query: string): Promise<PlaceSuggestion[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("OFFLINE");
  }

  await loadGoogleMapsScript();

  const service = getAutocompleteService();
  if (!service) {
    throw new Error("SERVICE_UNAVAILABLE");
  }

  const sessionToken = getSessionToken();

  return new Promise((resolve, reject) => {
    service.getPlacePredictions(
      {
        input: query,
        sessionToken,
        componentRestrictions: { country: "in" } // Prioritize India while allowing global fallbacks if desired
      },
      (predictions: any[], status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          const suggestions: PlaceSuggestion[] = predictions.map((pred) => ({
            placeId: pred.place_id,
            mainText: pred.structured_formatting?.main_text || pred.description,
            secondaryText: pred.structured_formatting?.secondary_text || "",
            fullDescription: pred.description,
            types: pred.types || []
          }));
          resolve(suggestions);
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          // If restricted search returns zero or error, try unrestricted search
          service.getPlacePredictions(
            { input: query, sessionToken },
            (globalPredictions: any[], globalStatus: any) => {
              if (globalStatus === window.google.maps.places.PlacesServiceStatus.OK && globalPredictions) {
                const suggestions: PlaceSuggestion[] = globalPredictions.map((pred) => ({
                  placeId: pred.place_id,
                  mainText: pred.structured_formatting?.main_text || pred.description,
                  secondaryText: pred.structured_formatting?.secondary_text || "",
                  fullDescription: pred.description,
                  types: pred.types || []
                }));
                resolve(suggestions);
              } else if (globalStatus === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                resolve([]);
              } else {
                reject(new Error(`Places Autocomplete Status: ${globalStatus || status}`));
              }
            }
          );
        }
      }
    );
  });
}

/**
 * Fetches full Place details (coordinates, formatted address, name) for a selected placeId.
 */
export async function fetchPlaceDetails(placeId: string, fallbackName?: string): Promise<LocationDetails> {
  if (!placeId) {
    throw new Error("PLACE_ID_REQUIRED");
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("OFFLINE");
  }

  await loadGoogleMapsScript();

  const placesService = getPlacesService();
  if (!placesService) {
    throw new Error("SERVICE_UNAVAILABLE");
  }

  const sessionToken = getSessionToken();

  return new Promise((resolve, reject) => {
    placesService.getDetails(
      {
        placeId,
        sessionToken,
        fields: ["name", "formatted_address", "geometry", "place_id", "types"]
      },
      (place: any, status: any) => {
        // Reset session token after completion of place selection cycle
        resetPlacesSessionToken();

        if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = typeof place.geometry.location.lat === "function"
            ? place.geometry.location.lat()
            : place.geometry.location.lat;
          const lng = typeof place.geometry.location.lng === "function"
            ? place.geometry.location.lng()
            : place.geometry.location.lng;

          const location: LocationDetails = {
            placeId: place.place_id || placeId,
            name: place.name || fallbackName || "Selected Location",
            formattedAddress: place.formatted_address || place.name || fallbackName || "",
            latitude: Number(lat),
            longitude: Number(lng),
            types: place.types || []
          };
          resolve(location);
        } else {
          // Fallback to Geocoder if PlacesService details call fails
          const geocoder = getGeocoder();
          if (geocoder) {
            geocoder.geocode({ placeId }, (results: any[], geoStatus: any) => {
              if (geoStatus === "OK" && results?.[0]?.geometry?.location) {
                const geoLat = results[0].geometry.location.lat();
                const geoLng = results[0].geometry.location.lng();
                resolve({
                  placeId: results[0].place_id || placeId,
                  name: fallbackName || results[0].formatted_address?.split(",")[0] || "Location",
                  formattedAddress: results[0].formatted_address || "",
                  latitude: Number(geoLat),
                  longitude: Number(geoLng),
                  types: results[0].types || []
                });
              } else {
                reject(new Error(`Failed to retrieve place details: ${status}`));
              }
            });
          } else {
            reject(new Error(`Places Service getDetails failed: ${status}`));
          }
        }
      }
    );
  });
}

/**
 * Reverse geocodes coordinates (lat, lng) into LocationDetails.
 */
export async function reverseGeocodeCoordinates(latitude: number, longitude: number): Promise<LocationDetails> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("OFFLINE");
  }

  await loadGoogleMapsScript();

  const geocoder = getGeocoder();
  if (!geocoder) {
    throw new Error("GEOCODER_UNAVAILABLE");
  }

  return new Promise((resolve, reject) => {
    geocoder.geocode(
      { location: { lat: latitude, lng: longitude } },
      (results: any[], status: any) => {
        if (status === "OK" && results && results.length > 0) {
          const topResult = results[0];
          // Extract a friendly name from address components if available
          let friendlyName = topResult.address_components?.[0]?.long_name || "Current Location";
          if (topResult.address_components?.[1]?.long_name) {
            friendlyName = `${friendlyName}, ${topResult.address_components[1].long_name}`;
          }

          resolve({
            placeId: topResult.place_id || `current_loc_${latitude.toFixed(4)}_${longitude.toFixed(4)}`,
            name: friendlyName,
            formattedAddress: topResult.formatted_address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            latitude,
            longitude,
            types: topResult.types || ["current_location"]
          });
        } else {
          // If reverse geocoding returns no address, return raw coordinates with placeId
          resolve({
            placeId: `gps_${latitude.toFixed(4)}_${longitude.toFixed(4)}`,
            name: `GPS Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
            formattedAddress: `Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            latitude,
            longitude,
            types: ["current_location"]
          });
        }
      }
    );
  });
}
