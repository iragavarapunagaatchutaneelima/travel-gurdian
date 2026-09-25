"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  SharedLocationState, 
  getSharedLocation, 
  subscribeToLocation, 
  requestCurrentLocation, 
  updateSharedLocation 
} from "../services/locationContext";

export function useSharedLocation() {
  const [location, setLocation] = useState<SharedLocationState>(getSharedLocation);

  useEffect(() => {
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
