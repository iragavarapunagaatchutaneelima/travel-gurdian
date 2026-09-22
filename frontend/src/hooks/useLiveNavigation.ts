"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { RouteOption, TravelMode } from "../data/routeData";
import { LocationDetails } from "../types/location";
import { TravelerProfile, RoutePriority } from "../types/safety";
import { 
  NavigationStatus, 
  NavigationPosition, 
  RouteProgress, 
  ManeuverInfo, 
  RerouteProposal 
} from "../types/navigation";
import { 
  calculateRouteProgress, 
  isOffRoute, 
  isArrived, 
  getCurrentAndNextManeuver, 
  haversineDistanceMeters 
} from "../services/navigationMath";
import { calculateGoogleRoutes } from "../services/googleRoutes";

export interface UseLiveNavigationProps {
  initialRoute: RouteOption | null;
  destination: LocationDetails;
  travelMode: TravelMode;
  profile: TravelerProfile;
  priority: RoutePriority;
  onRouteUpdated?: (newRoute: RouteOption) => void;
}

export function useLiveNavigation({
  initialRoute,
  destination,
  travelMode,
  profile,
  priority,
  onRouteUpdated
}: UseLiveNavigationProps) {
  const [status, setStatus] = useState<NavigationStatus>("READY");
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(initialRoute);
  const [currentPosition, setCurrentPosition] = useState<NavigationPosition | null>(null);
  const [progress, setProgress] = useState<RouteProgress | null>(null);
  const [currentManeuver, setCurrentManeuver] = useState<ManeuverInfo | null>(null);
  const [nextManeuver, setNextManeuver] = useState<ManeuverInfo | null>(null);
  const [isFollowMode, setIsFollowMode] = useState<boolean>(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsAccuracyWarning, setGpsAccuracyWarning] = useState<boolean>(false);
  const [rerouteProposal, setRerouteProposal] = useState<RerouteProposal | null>(null);
  const [isRerouting, setIsRerouting] = useState<boolean>(false);

  // References to prevent memory leaks and handle async race conditions
  const watchIdRef = useRef<number | null>(null);
  const activeRouteRef = useRef<RouteOption | null>(initialRoute);
  const offRouteCountRef = useRef<number>(0);
  const arrivalCountRef = useRef<number>(0);
  const lastRerouteTimeRef = useRef<number>(0);
  const rerouteRequestIdRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // Keep activeRouteRef in sync
  useEffect(() => {
    activeRouteRef.current = activeRoute;
  }, [activeRoute]);

  // Sync initialRoute when it changes and we are not currently in an active session
  useEffect(() => {
    if (initialRoute && status === "READY") {
      setActiveRoute(initialRoute);
      activeRouteRef.current = initialRoute;
    }
  }, [initialRoute, status]);

  // Cleanup GPS watcher on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  /**
   * Process incoming GPS fix.
   */
  const handleGpsUpdate = useCallback((pos: GeolocationPosition) => {
    if (!isMountedRef.current) return;

    const navPos: NavigationPosition = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp
    };

    setCurrentPosition(navPos);
    setGpsError(null);

    // Check accuracy warning (> 40 meters)
    setGpsAccuracyWarning(navPos.accuracy > 40);

    const currentRoute = activeRouteRef.current;
    if (!currentRoute || !currentRoute.waypoints || currentRoute.waypoints.length < 2) {
      return;
    }

    // 1. Calculate Route Progress & ETA
    const totalDistMeters = currentRoute.distanceKm * 1000;
    const totalDurSeconds = currentRoute.durationMinutes * 60;
    const prog = calculateRouteProgress(navPos, currentRoute.waypoints, totalDistMeters, totalDurSeconds);
    setProgress(prog);

    // 2. Calculate Turn Maneuvers
    const { currentManeuver: curMan, nextManeuver: nxtMan } = getCurrentAndNextManeuver(
      currentRoute.steps || [],
      prog.distanceTraveledMeters
    );
    setCurrentManeuver(curMan);
    setCurrentManeuver(curMan);
    setNextManeuver(nxtMan);

    // 3. Check Arrival Detection (Persisted over 2 fixes)
    const destLat = destination.latitude;
    const destLng = destination.longitude;
    const arrived = isArrived(navPos.latitude, navPos.longitude, destLat, destLng, navPos.accuracy, 50, 1.2);

    if (arrived) {
      arrivalCountRef.current += 1;
      if (arrivalCountRef.current >= 2) {
        setStatus("ARRIVED");
        // Cleanly stop GPS watcher on arrival
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        return;
      }
    } else {
      arrivalCountRef.current = 0;
    }

    // 4. Check Off-Route Detection (Persisted over 3 consecutive fixes to avoid GPS noise)
    const off = isOffRoute(prog.distanceToRouteMeters, navPos.accuracy, 80, 1.4);
    if (off) {
      offRouteCountRef.current += 1;
      if (offRouteCountRef.current >= 3 && status === "ACTIVE") {
        setStatus("OFF_ROUTE");
      }
    } else {
      offRouteCountRef.current = 0;
      if (status === "OFF_ROUTE") {
        setStatus("ACTIVE");
      }
    }
  }, [destination, status]);

  /**
   * Handle GPS errors.
   */
  const handleGpsError = useCallback((err: GeolocationPositionError) => {
    if (!isMountedRef.current) return;
    let message = "Unable to retrieve real GPS location.";
    if (err.code === err.PERMISSION_DENIED) {
      message = "Location permission was denied. Please allow location access in your browser to enable live navigation.";
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      message = "GPS position temporarily unavailable. Waiting for satellite lock...";
    } else if (err.code === err.TIMEOUT) {
      message = "GPS location request timed out. Retrying...";
    }
    setGpsError(message);
  }, []);

  /**
   * Start Live Navigation with continuous watchPosition.
   */
  const startNavigation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    if (!activeRouteRef.current) {
      setGpsError("No route selected for navigation.");
      return;
    }

    setGpsError(null);
    setStatus("ACTIVE");
    setIsFollowMode(true);
    offRouteCountRef.current = 0;
    arrivalCountRef.current = 0;

    // Clear any existing watcher
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Start continuous GPS watcher
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleGpsUpdate,
      handleGpsError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000
      }
    );
  }, [handleGpsUpdate, handleGpsError]);

  /**
   * End or cancel Live Navigation session and clear watcher.
   */
  const endNavigation = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus("ENDED");
    setRerouteProposal(null);
    offRouteCountRef.current = 0;
    arrivalCountRef.current = 0;
  }, []);

  /**
   * Request dynamic route recalculation via Google Directions and Phase 3 Safety Engine.
   */
  const requestReroute = useCallback(async () => {
    if (!currentPosition) {
      setGpsError("Current GPS location required to recalculate route.");
      return;
    }

    const now = Date.now();
    // 15-second cooldown to prevent request spam
    if (now - lastRerouteTimeRef.current < 15000) {
      console.warn("Reroute request throttled by cooldown guard.");
      return;
    }
    lastRerouteTimeRef.current = now;

    const currentReqId = ++rerouteRequestIdRef.current;
    setIsRerouting(true);
    setStatus("REROUTING");

    try {
      const originDetails: LocationDetails = {
        placeId: "",
        name: "Current GPS Position",
        formattedAddress: `Lat: ${currentPosition.latitude.toFixed(4)}, Lng: ${currentPosition.longitude.toFixed(4)}`,
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude
      };

      const newRoutes = await calculateGoogleRoutes(
        originDetails,
        destination,
        travelMode,
        profile,
        priority
      );

      // Protect against stale async response
      if (currentReqId !== rerouteRequestIdRef.current || !isMountedRef.current) {
        return;
      }

      if (newRoutes && newRoutes.length > 0) {
        const topRoute = newRoutes[0];
        const prevRoute = activeRouteRef.current;

        const distanceDiff = topRoute.distanceKm - (prevRoute?.distanceKm || topRoute.distanceKm);
        const durationDiff = topRoute.durationMinutes - (prevRoute?.durationMinutes || topRoute.durationMinutes);

        const proposal: RerouteProposal = {
          requestId: currentReqId,
          calculatedAt: now,
          newRoute: topRoute,
          newSafetyAssessment: topRoute.safetyAssessment!,
          reason: "Route recalculated from current GPS position.",
          distanceDiffKm: distanceDiff,
          durationDiffMinutes: durationDiff,
          explanation: topRoute.whyThisRoute || topRoute.safetyAssessment?.explanation || ["Recalculated via real Google network."]
        };

        setRerouteProposal(proposal);
        setStatus("REROUTING_PENDING");
      } else {
        throw new Error("No real Google routes found from current position.");
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setGpsError(err.message || "Failed to recalculate route with Google Directions.");
        setStatus("OFF_ROUTE");
      }
    } finally {
      if (isMountedRef.current) {
        setIsRerouting(false);
      }
    }
  }, [currentPosition, destination, travelMode, profile, priority]);

  /**
   * User approves the newly calculated reroute.
   */
  const approveReroute = useCallback(() => {
    if (!rerouteProposal) return;

    const updated = rerouteProposal.newRoute;
    setActiveRoute(updated);
    activeRouteRef.current = updated;
    setRerouteProposal(null);
    setStatus("ACTIVE");
    offRouteCountRef.current = 0;

    if (onRouteUpdated) {
      onRouteUpdated(updated);
    }
  }, [rerouteProposal, onRouteUpdated]);

  /**
   * User rejects the reroute and continues on previous route.
   */
  const rejectReroute = useCallback(() => {
    setRerouteProposal(null);
    setStatus("ACTIVE");
    offRouteCountRef.current = 0;
  }, []);

  return {
    status,
    activeRoute,
    currentPosition,
    progress,
    currentManeuver,
    nextManeuver,
    isFollowMode,
    setIsFollowMode,
    gpsError,
    gpsAccuracyWarning,
    rerouteProposal,
    isRerouting,
    startNavigation,
    endNavigation,
    requestReroute,
    approveReroute,
    rejectReroute
  };
}
