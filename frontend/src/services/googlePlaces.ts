import { LocationDetails, PlaceSuggestion } from "../types/location";

declare global {
  interface Window {
    google?: any;
    __googleMapsLoadingPromise?: Promise<void>;
    __googleMapsAuthFailed?: boolean;
    gm_authFailure?: () => void;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

/**
 * Normalized user-facing map and routing error formatter.
 * Strictly adheres to Phase 12 requirements.
 */
export function formatMapErrorMessage(error: any): string {
  const msg = typeof error === "string" ? error : error?.message || "";

  if (msg.includes("SAME_ORIGIN_AND_DESTINATION")) {
    return "Origin and Destination cannot be the same place. Please choose two distinct locations.";
  }

  if (msg.includes("INVALID_COORDINATES") || msg.includes("INVALID_LOCATION")) {
    return "Invalid location coordinates or address provided. Please select a valid origin and destination.";
  }

  if (msg.includes("MISSING_API_KEY") || msg.includes("API key not configured") || msg.includes("not configured")) {
    return "Google Maps API key is not configured.";
  }

  if (
    msg.includes("RESTRICTED_KEY") || 
    msg.includes("AUTH_FAILURE") || 
    msg.includes("RefererNotAllowedMapError") || 
    msg.includes("REQUEST_DENIED") ||
    (typeof window !== "undefined" && window.__googleMapsAuthFailed)
  ) {
    return "The Google Maps API key is restricted and the current website origin may not be authorized. Please verify HTTP referrer restrictions in Google Cloud Console.";
  }

  if (msg.includes("OVER_QUERY_LIMIT") || msg.includes("quota exceeded") || msg.includes("quota")) {
    return "Google Directions API request quota exceeded. Please check your Google Cloud Console quota or try again shortly.";
  }

  if (
    msg.includes("OFFLINE") ||
    (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.onLine === false)
  ) {
    return "You're offline. Cached map/navigation information is available where supported.";
  }

  if (msg.includes("PERMISSION_DENIED")) {
    return "Location permission was denied. Please allow location access in your browser to enable live navigation.";
  }

  if (msg.includes("POSITION_UNAVAILABLE")) {
    return "GPS position temporarily unavailable. Waiting for satellite lock...";
  }

  if (msg.includes("TIMEOUT")) {
    return "GPS location request timed out. Retrying...";
  }

  if (msg.includes("LOAD_ERROR") || msg.includes("SERVICE_UNAVAILABLE")) {
    return "Map service is temporarily unavailable.";
  }

  return msg || "Map service is temporarily unavailable.";
}

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

  if (window.__googleMapsAuthFailed) {
    return Promise.reject(new Error("RESTRICTED_KEY_FAILURE"));
  }

  if (window.__googleMapsLoadingPromise) {
    return window.__googleMapsLoadingPromise;
  }

  const apiKey = GOOGLE_MAPS_API_KEY.trim();
  if (!apiKey || apiKey === "your_google_maps_api_key_here") {
    return Promise.reject(new Error("MISSING_API_KEY"));
  }

  // Hook gm_authFailure to catch invalid/restricted key errors from Google Maps script
  const prevAuthFailure = window.gm_authFailure;
  window.gm_authFailure = () => {
    window.__googleMapsAuthFailed = true;
    console.warn("Google Maps API authentication failed: restricted key or unauthorized referrer origin.");
    if (typeof prevAuthFailure === "function") {
      prevAuthFailure();
    }
  };

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

  return new Promise((resolve) => {
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

export interface NearbyPlaceResult {
  id: string;
  name: string;
  type: string;
  category: "hospital" | "police" | "fuel" | "rest" | "cafe" | "general";
  distanceMeters: number;
  distanceFormatted: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  phone?: string;
  openNow?: boolean;
}

/**
 * Searches for nearby places based on verified coordinates and category.
 * Prevents hallucinated locations and synchronizes with map markers.
 */
export async function searchNearbyPlaces(
  coords: { lat: number; lng: number },
  category: string = "hospital",
  radiusMeters: number = 8000
): Promise<NearbyPlaceResult[]> {
  const { lat, lng } = coords;

  const haversineDistMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Map user query to Google Place type / keyword
  let queryKeyword = category.toLowerCase().trim();
  let placeCategory: NearbyPlaceResult["category"] = "general";
  let googleType = "";

  if (queryKeyword.includes("hospital") || queryKeyword.includes("medical") || queryKeyword.includes("clinic") || queryKeyword.includes("doctor")) {
    placeCategory = "hospital";
    googleType = "hospital";
    queryKeyword = "hospital emergency medical";
  } else if (queryKeyword.includes("police") || queryKeyword.includes("patrol") || queryKeyword.includes("station")) {
    placeCategory = "police";
    googleType = "police";
    queryKeyword = "police station";
  } else if (queryKeyword.includes("fuel") || queryKeyword.includes("petrol") || queryKeyword.includes("gas")) {
    placeCategory = "fuel";
    googleType = "gas_station";
    queryKeyword = "petrol pump fuel station";
  } else if (queryKeyword.includes("cafe") || queryKeyword.includes("coffee") || queryKeyword.includes("tea")) {
    placeCategory = "cafe";
    googleType = "cafe";
    queryKeyword = "cafe safe coffee shop";
  } else if (queryKeyword.includes("rest") || queryKeyword.includes("oasis") || queryKeyword.includes("hotel") || queryKeyword.includes("food")) {
    placeCategory = "rest";
    googleType = "restaurant";
    queryKeyword = "highway restaurant rest area";
  }

  // 1. Try Google Maps Places API if available
  try {
    await loadGoogleMapsScript();
    const service = getPlacesService();
    if (service && window.google?.maps) {
      const searchRequest: any = {
        location: new window.google.maps.LatLng(lat, lng),
        radius: radiusMeters,
        keyword: queryKeyword
      };
      if (googleType) {
        searchRequest.type = googleType;
      }

      const results = await new Promise<any[]>((resolve) => {
        service.nearbySearch(searchRequest, (res: any[], status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && res) {
            resolve(res);
          } else {
            resolve([]);
          }
        });
      });

      if (results && results.length > 0) {
        return results.slice(0, 8).map((p) => {
          const pLat = typeof p.geometry.location.lat === "function" ? p.geometry.location.lat() : p.geometry.location.lat;
          const pLng = typeof p.geometry.location.lng === "function" ? p.geometry.location.lng() : p.geometry.location.lng;
          const distM = haversineDistMeters(lat, lng, pLat, pLng);

          return {
            id: p.place_id || `place_${Math.random()}`,
            name: p.name || "Safe Haven",
            type: p.types?.[0]?.replace(/_/g, " ") || placeCategory,
            category: placeCategory,
            distanceMeters: Math.round(distM),
            distanceFormatted: formatDistance(distM),
            address: p.vicinity || p.formatted_address || "Nearby",
            latitude: pLat,
            longitude: pLng,
            rating: p.rating,
            openNow: p.opening_hours?.isOpen ? p.opening_hours.isOpen() : undefined
          };
        }).sort((a, b) => a.distanceMeters - b.distanceMeters);
      }
    }
  } catch (err) {
    console.warn("Google Maps Places nearbySearch failed or restricted:", err);
  }

  // Google returned nothing (or is unavailable/restricted right now). Return
  // an honest empty result -- NEVER invent hospitals, fuel stations, cafes,
  // or any other place. A fabricated "verified" business with a made-up
  // phone number and coordinate offset is worse than no answer at all.
  return [];
}

