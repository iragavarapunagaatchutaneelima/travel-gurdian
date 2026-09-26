import { LocationDetails } from "../types/location";
import { reverseGeocodeCoordinates } from "./googlePlaces";

export type LocationPermissionState = "prompt" | "granted" | "denied" | "unavailable";

export interface SharedLocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null; // meters
  timestamp: number | null;
  permissionStatus: LocationPermissionState;
  address: string;
  city: string;
  country: string;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = "travel_guardian_shared_location";

// Default fallback state (e.g., initial state before user geolocation request)
let currentState: SharedLocationState = {
  latitude: null,
  longitude: null,
  accuracy: null,
  timestamp: null,
  permissionStatus: "prompt",
  address: "",
  city: "",
  country: "India",
  isLoading: false,
  error: null
};

// Hydrate from localStorage if in browser
if (typeof window !== "undefined") {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.latitude === "number" && typeof parsed.longitude === "number") {
        currentState = {
          ...currentState,
          ...parsed,
          isLoading: false
        };
      }
    }
  } catch {
    // Ignore storage parse errors
  }
}

type LocationListener = (state: SharedLocationState) => void;
const listeners = new Set<LocationListener>();

function notifyListeners() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        latitude: currentState.latitude,
        longitude: currentState.longitude,
        accuracy: currentState.accuracy,
        timestamp: currentState.timestamp,
        permissionStatus: currentState.permissionStatus,
        address: currentState.address,
        city: currentState.city,
        country: currentState.country
      }));
    } catch {
      // Ignore storage errors
    }
  }
  listeners.forEach(fn => {
    try {
      fn({ ...currentState });
    } catch (err) {
      console.warn("Location listener error:", err);
    }
  });
}

/**
 * Returns the current shared location snapshot.
 */
export function getSharedLocation(): SharedLocationState {
  return { ...currentState };
}

/**
 * Subscribes to shared location updates across components (Map, AI Guardian, Navigation).
 */
export function subscribeToLocation(listener: LocationListener): () => void {
  listeners.add(listener);
  listener({ ...currentState });
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Updates the shared location state and notifies all subscribers.
 */
export function updateSharedLocation(partial: Partial<SharedLocationState>) {
  currentState = {
    ...currentState,
    ...partial
  };
  notifyListeners();
}

/**
 * Requests the current GPS location from browser Geolocation API.
 * Handles permission verification and reverse-geocoding without hallucinating.
 */
export async function requestCurrentLocation(highAccuracy = true): Promise<SharedLocationState> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    currentState = {
      ...currentState,
      permissionStatus: "unavailable",
      isLoading: false,
      error: "Geolocation is not supported by your browser."
    };
    notifyListeners();
    return getSharedLocation();
  }

  currentState = {
    ...currentState,
    isLoading: true,
    error: null
  };
  notifyListeners();

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const timestamp = pos.timestamp || Date.now();

        let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        let city = "";
        const country = "India";

        try {
          const details: LocationDetails = await reverseGeocodeCoordinates(latitude, longitude);
          if (details.formattedAddress) {
            address = details.formattedAddress;
            const parts = address.split(",").map(p => p.trim());
            if (parts.length >= 2) {
              city = parts[parts.length - 2] || parts[0];
            } else {
              city = details.name || "";
            }
          }
        } catch (e) {
          console.warn("Reverse geocode failed or offline, using coordinates:", e);
        }

        currentState = {
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          timestamp,
          permissionStatus: "granted",
          address,
          city,
          country,
          isLoading: false,
          error: null
        };
        notifyListeners();
        resolve(getSharedLocation());
      },
      (err) => {
        let errorMsg = "Unable to retrieve location.";
        let permStatus: LocationPermissionState = "prompt";

        if (err.code === err.PERMISSION_DENIED) {
          permStatus = "denied";
          errorMsg = "Location permission is required to find places near you. Please enable location permissions in your browser.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          permStatus = "unavailable";
          errorMsg = "Current location is temporarily unavailable. Check your device GPS signal.";
        } else if (err.code === err.TIMEOUT) {
          errorMsg = "Location request timed out. Please try again.";
        }

        currentState = {
          ...currentState,
          permissionStatus: permStatus,
          isLoading: false,
          error: errorMsg
        };
        notifyListeners();
        resolve(getSharedLocation());
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: 12000,
        maximumAge: 10000
      }
    );
  });
}
