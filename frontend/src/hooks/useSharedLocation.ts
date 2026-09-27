"use client";

import { useState, useEffect, useCallback } from "react";
import {
  SharedLocationState,
  getSharedLocation,
  subscribeToLocation,
  requestCurrentLocation,
  updateSharedLocation,
  hydrateSharedLocationFromStorage
} from "../services/locationContext";

export function useSharedLocation() {
  // Initial render (both server and the client's first pass) always sees the
  // neutral default state -- getSharedLocation() only returns cached data
  // once hydrateSharedLocationFromStorage() has run, which happens in the
  // effect below, after mount/hydration. This keeps server and client output
  // identical on the first render.
  const [location, setLocation] = useState<SharedLocationState>(getSharedLocation);

  useEffect(() => {
    hydrateSharedLocationFromStorage();
    const unsubscribe = subscribeToLocation(setLocation);
    return () => {
      unsubscribe();
    };
  }, []);

  const locate = useCallback(async (highAccuracy = true) => {
    return await requestCurrentLocation(highAccuracy);
  }, []);

  const setManualLocation = useCallback((coords: { latitude: number; longitude: number }, address?: string) => {
    updateSharedLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: Date.now(),
      permissionStatus: "granted",
      address: address || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
      error: null
    });
  }, []);

  return {
    ...location,
    hasLocation: location.latitude !== null && location.longitude !== null,
    locate,
    setManualLocation
  };
}
