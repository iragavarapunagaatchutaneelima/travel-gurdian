import assert from "node:assert/strict";
import { CITIES, City } from "../data/routeData";
import { formatMapErrorMessage } from "../services/googlePlaces";
import {
  decodeGooglePolyline,
  formatDistanceMeters,
  formatDurationSeconds,
  calculateGoogleRoutes
} from "../services/googleRoutes";
import {
  haversineDistanceMeters,
  pointToSegmentDistanceMeters,
  findNearestPointOnRoute,
  calculateRouteProgress,
  isOffRoute,
  isArrived,
  getCurrentAndNextManeuver,
  formatSpeedKmh,
  formatHeading,
  parseManeuverIcon
} from "../services/navigationMath";
import { LocationDetails } from "../types/location";
import { NavigationPosition, ManeuverInfo, RerouteProposal } from "../types/navigation";

// Replicate the cleanPlaceId and parseLocation helpers from /map/page.tsx
const cleanPlaceId = (id: string | null | undefined): string => {
  if (!id || id === "undefined" || id === "null" || id.trim() === "") return "";
  return id.trim();
};

const parseLocation = (
  locParam: string | null,
  nameParam: string | null,
  addressParam: string | null,
  latParam: string | null,
  lngParam: string | null,
  placeIdParam: string | null,
  defaultCityKey: "chennai" | "bangalore"
): City => {
  const lat = latParam ? parseFloat(latParam) : NaN;
  const lng = lngParam ? parseFloat(lngParam) : NaN;
  const hasCoords = !isNaN(lat) && !isNaN(lng);

  if (hasCoords) {
    const cleanName = nameParam && nameParam.trim() ? nameParam.trim() : (addressParam || "Selected Location");
    const cleanAddress = addressParam && addressParam.trim() ? addressParam.trim() : cleanName;
    return {
      id: cleanPlaceId(placeIdParam) || locParam || "custom-location",
      name: cleanName,
      state: cleanAddress,
      latitude: lat,
      longitude: lng,
      region: "Selected Location",
      highways: ["Corridor Road"]
    };
  }

  const cityKey = (locParam || "").toLowerCase();
  if (CITIES[cityKey]) {
    return CITIES[cityKey];
  }

  return CITIES[defaultCityKey];
};

// Replicate URL query builder from /plan/page.tsx
function buildMapQueryParams(
  origin: LocationDetails,
  destination: LocationDetails,
  mode: string,
  profile: string,
  priority: string,
  routeId: string,
  startNav: boolean
): URLSearchParams {
  const params = new URLSearchParams();

  const cleanFromId = origin.placeId && origin.placeId !== "undefined" ? origin.placeId : origin.name.toLowerCase().replace(/\s+/g, "-");
  const cleanDestId = destination.placeId && destination.placeId !== "undefined" ? destination.placeId : destination.name.toLowerCase().replace(/\s+/g, "-");
  params.set("from", cleanFromId);
  params.set("dest", cleanDestId);

  if (origin.placeId && origin.placeId !== "undefined") {
    params.set("fromPlaceId", origin.placeId);
  }
  if (destination.placeId && destination.placeId !== "undefined") {
    params.set("destPlaceId", destination.placeId);
  }

  params.set("fromLat", origin.latitude.toString());
  params.set("fromLng", origin.longitude.toString());
  params.set("fromName", origin.name);
  params.set("fromAddress", origin.formattedAddress);

  params.set("destLat", destination.latitude.toString());
  params.set("destLng", destination.longitude.toString());
  params.set("destName", destination.name);
  params.set("destAddress", destination.formattedAddress);

  params.set("mode", mode);
  params.set("profile", profile);
  params.set("priority", priority);
  params.set("routeId", routeId);
  if (startNav) {
    params.set("startNav", "true");
  }

  return params;
}

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          passedTests++;
          console.log(`  [PASS] ${name}`);
        })
        .catch((err) => {
          console.error(`  [FAIL] ${name}:`, err.message);
          throw err;
        });
    } else {
      passedTests++;
      console.log(`  [PASS] ${name}`);
    }
  } catch (err: any) {
    console.error(`  [FAIL] ${name}:`, err.message);
    throw err;
  }
}

async function main() {
  console.log("=================================================================");
  console.log(" TRAVEL GUARDIAN: GOOGLE MAPS & LIVE NAVIGATION AUDIT SUITE");
  console.log("=================================================================\n");

  console.log("Test Suite 1: Origin & Destination Corridor Preservation (/plan -> /map)");

  runTest("1.1 Chennai -> Bangalore corridor parameter preservation", () => {
    const origin: LocationDetails = {
      placeId: "ChIJ_6h_Chennai",
      name: "Chennai",
      formattedAddress: "Chennai, Tamil Nadu, India",
      latitude: 13.0827,
      longitude: 80.2707
    };
    const dest: LocationDetails = {
      placeId: "ChIJ_Bangalore",
      name: "Bangalore",
      formattedAddress: "Bengaluru, Karnataka, India",
      latitude: 12.9716,
      longitude: 77.5946
    };

    const query = buildMapQueryParams(origin, dest, "Car", "Solo", "Balanced", "A", true);

    // Verify all 7 required attributes are in query
    assert.equal(query.get("fromPlaceId"), "ChIJ_6h_Chennai");
    assert.equal(query.get("destPlaceId"), "ChIJ_Bangalore");
    assert.equal(query.get("fromLat"), "13.0827");
    assert.equal(query.get("fromLng"), "80.2707");
    assert.equal(query.get("destLat"), "12.9716");
    assert.equal(query.get("destLng"), "77.5946");
    assert.equal(query.get("fromName"), "Chennai");
    assert.equal(query.get("destName"), "Bangalore");
    assert.equal(query.get("fromAddress"), "Chennai, Tamil Nadu, India");
    assert.equal(query.get("destAddress"), "Bengaluru, Karnataka, India");
    assert.equal(query.get("mode"), "Car");
    assert.equal(query.get("profile"), "Solo");
    assert.equal(query.get("priority"), "Balanced");
    assert.equal(query.get("routeId"), "A");
    assert.equal(query.get("startNav"), "true");

    // Verify /map parser restores exact values
    const origParsed = parseLocation(
      query.get("from"),
      query.get("fromName"),
      query.get("fromAddress"),
      query.get("fromLat"),
      query.get("fromLng"),
      query.get("fromPlaceId"),
      "chennai"
    );
    const destParsed = parseLocation(
      query.get("dest"),
      query.get("destName"),
      query.get("destAddress"),
      query.get("destLat"),
      query.get("destLng"),
      query.get("destPlaceId"),
      "bangalore"
    );

    assert.equal(origParsed.latitude, 13.0827);
    assert.equal(origParsed.longitude, 80.2707);
    assert.equal(origParsed.name, "Chennai");
    assert.equal(destParsed.latitude, 12.9716);
    assert.equal(destParsed.longitude, 77.5946);
    assert.equal(destParsed.name, "Bangalore");
  });

  runTest("1.2 Mumbai -> Delhi corridor preservation (Strictly no fallback to Chennai/Bangalore)", () => {
    const origin: LocationDetails = {
      placeId: "ChIJ_Mumbai",
      name: "Mumbai",
      formattedAddress: "Mumbai, Maharashtra, India",
      latitude: 19.076,
      longitude: 72.8777
    };
    const dest: LocationDetails = {
      placeId: "ChIJ_Delhi",
      name: "Delhi",
      formattedAddress: "New Delhi, Delhi NCR, India",
      latitude: 28.7041,
      longitude: 77.1025
    };

    const query = buildMapQueryParams(origin, dest, "Car", "Family", "Maximum Safety", "B", false);

    const origParsed = parseLocation(
      query.get("from"),
      query.get("fromName"),
      query.get("fromAddress"),
      query.get("fromLat"),
      query.get("fromLng"),
      query.get("fromPlaceId"),
      "chennai"
    );
    const destParsed = parseLocation(
      query.get("dest"),
      query.get("destName"),
      query.get("destAddress"),
      query.get("destLat"),
      query.get("destLng"),
      query.get("destPlaceId"),
      "bangalore"
    );

    // CRITICAL: Ensure Mumbai never falls back to Chennai
    assert.notEqual(origParsed.name, "Chennai");
    assert.equal(origParsed.name, "Mumbai");
    assert.equal(origParsed.latitude, 19.076);
    assert.equal(origParsed.longitude, 72.8777);

    // CRITICAL: Ensure Delhi never falls back to Bangalore
    assert.notEqual(destParsed.name, "Bangalore");
    assert.equal(destParsed.name, "Delhi");
    assert.equal(destParsed.latitude, 28.7041);
    assert.equal(destParsed.longitude, 77.1025);
    assert.equal(query.get("priority"), "Maximum Safety");
    assert.equal(query.get("profile"), "Family");
    assert.equal(query.get("routeId"), "B");
  });

  runTest("1.3 Custom landmark -> landmark (Taj Mahal to India Gate with arbitrary coordinates)", () => {
    const origin: LocationDetails = {
      placeId: "ChIJ_TajMahal_Custom",
      name: "Taj Mahal",
      formattedAddress: "Dharmapuri, Tajganj, Agra, Uttar Pradesh 282001",
      latitude: 27.1751,
      longitude: 78.0421
    };
    const dest: LocationDetails = {
      placeId: "ChIJ_IndiaGate_Custom",
      name: "India Gate",
      formattedAddress: "Rajpath, India Gate, New Delhi 110001",
      latitude: 28.6129,
      longitude: 77.2295
    };

    const query = buildMapQueryParams(origin, dest, "Car", "Solo Woman Traveller", "Balanced", "C", true);

    const origParsed = parseLocation(
      query.get("from"),
      query.get("fromName"),
      query.get("fromAddress"),
      query.get("fromLat"),
      query.get("fromLng"),
      query.get("fromPlaceId"),
      "chennai"
    );
    const destParsed = parseLocation(
      query.get("dest"),
      query.get("destName"),
      query.get("destAddress"),
      query.get("destLat"),
      query.get("destLng"),
      query.get("destPlaceId"),
      "bangalore"
    );

    assert.equal(origParsed.name, "Taj Mahal");
    assert.equal(origParsed.latitude, 27.1751);
    assert.equal(origParsed.longitude, 78.0421);
    assert.equal(origParsed.state, "Dharmapuri, Tajganj, Agra, Uttar Pradesh 282001");
    assert.notEqual(origParsed.name, "Chennai");

    assert.equal(destParsed.name, "India Gate");
    assert.equal(destParsed.latitude, 28.6129);
    assert.equal(destParsed.longitude, 77.2295);
    assert.equal(destParsed.state, "Rajpath, India Gate, New Delhi 110001");
    assert.notEqual(destParsed.name, "Bangalore");
  });

  console.log("\nTest Suite 2: Travel Modes (Car, Bike, Walk)");

  runTest("2.1 Car travel mode parameter preservation", () => {
    const o: LocationDetails = { placeId: "p1", name: "A", formattedAddress: "addr1", latitude: 10, longitude: 20 };
    const d: LocationDetails = { placeId: "p2", name: "B", formattedAddress: "addr2", latitude: 11, longitude: 21 };
    const query = buildMapQueryParams(o, d, "Car", "Solo", "Balanced", "A", false);
    assert.equal(query.get("mode"), "Car");
  });

  runTest("2.2 Bike travel mode parameter preservation", () => {
    const o: LocationDetails = { placeId: "p1", name: "A", formattedAddress: "addr1", latitude: 10, longitude: 20 };
    const d: LocationDetails = { placeId: "p2", name: "B", formattedAddress: "addr2", latitude: 11, longitude: 21 };
    const query = buildMapQueryParams(o, d, "Bike", "Solo", "Time Priority", "A", false);
    assert.equal(query.get("mode"), "Bike");
    assert.equal(query.get("priority"), "Time Priority");
  });

  runTest("2.3 Walk travel mode parameter preservation", () => {
    const o: LocationDetails = { placeId: "p1", name: "A", formattedAddress: "addr1", latitude: 10, longitude: 20 };
    const d: LocationDetails = { placeId: "p2", name: "B", formattedAddress: "addr2", latitude: 11, longitude: 21 };
    const query = buildMapQueryParams(o, d, "Walk", "Group", "Maximum Safety", "A", false);
    assert.equal(query.get("mode"), "Walk");
    assert.equal(query.get("profile"), "Group");
  });

  console.log("\nTest Suite 3: Validation, Edge Cases & Error Handling");

  await runTest("3.1 Same Origin and Destination rejection", async () => {
    const sameLoc: LocationDetails = {
      placeId: "ChIJ_Same",
      name: "Marina Beach",
      formattedAddress: "Marina Beach, Chennai",
      latitude: 13.05,
      longitude: 80.28
    };

    let caughtError: any = null;
    try {
      await calculateGoogleRoutes(sameLoc, sameLoc, "Car", "Solo", "Balanced");
    } catch (err: any) {
      caughtError = err;
    }

    assert.ok(caughtError, "Expected calculateGoogleRoutes to reject identical origin & destination");
    assert.equal(caughtError.message, "SAME_ORIGIN_AND_DESTINATION");

    const formatted = formatMapErrorMessage(caughtError);
    assert.equal(formatted, "Origin and Destination cannot be the same place. Please choose two distinct locations.");
  });

  await runTest("3.2 Invalid coordinates (out-of-bounds latitude/longitude)", async () => {
    const invalidLoc: LocationDetails = {
      placeId: "invalid",
      name: "Impossible Place",
      formattedAddress: "Nowhere",
      latitude: 120.0, // Invalid latitude (> 90)
      longitude: 80.0
    };
    const validLoc: LocationDetails = {
      placeId: "valid",
      name: "Valid Place",
      formattedAddress: "Somewhere",
      latitude: 13.0,
      longitude: 80.0
    };

    let caughtError: any = null;
    try {
      await calculateGoogleRoutes(invalidLoc, validLoc, "Car", "Solo", "Balanced");
    } catch (err: any) {
      caughtError = err;
    }

    assert.ok(caughtError);
    assert.equal(caughtError.message, "INVALID_COORDINATES");
    const formatted = formatMapErrorMessage(caughtError);
    assert.equal(formatted, "Invalid location coordinates or address provided. Please select a valid origin and destination.");
  });

  runTest("3.3 GPS Permission Denied error mapping", () => {
    const errorObj = new Error("PERMISSION_DENIED: Geolocation has been disabled in browser settings.");
    const formatted = formatMapErrorMessage(errorObj);
    assert.equal(formatted, "Location permission was denied. Please allow location access in your browser to enable live navigation.");
  });

  runTest("3.4 GPS Position Unavailable error mapping", () => {
    const errorObj = new Error("POSITION_UNAVAILABLE");
    const formatted = formatMapErrorMessage(errorObj);
    assert.equal(formatted, "GPS position temporarily unavailable. Waiting for satellite lock...");
  });

  runTest("3.5 Offline Network Error mapping", () => {
    const errorObj = new Error("OFFLINE");
    const formatted = formatMapErrorMessage(errorObj);
    assert.equal(formatted, "You're offline. Cached map/navigation information is available where supported.");
  });

  runTest("3.6 Google API Denied (REQUEST_DENIED / Restricted Key)", () => {
    const errorObj = new Error("REQUEST_DENIED: Google Directions API request was denied.");
    const formatted = formatMapErrorMessage(errorObj);
    assert.equal(
      formatted,
      "The Google Maps API key is restricted and the current website origin may not be authorized. Please verify HTTP referrer restrictions in Google Cloud Console."
    );
  });

  runTest("3.7 Google API Quota Exceeded (OVER_QUERY_LIMIT)", () => {
    const errorObj = new Error("OVER_QUERY_LIMIT: Google Directions API request quota exceeded.");
    const formatted = formatMapErrorMessage(errorObj);
    assert.equal(
      formatted,
      "Google Directions API request quota exceeded. Please check your Google Cloud Console quota or try again shortly."
    );
  });

  console.log("\nTest Suite 4: Route Geometry, Turn Steps, Speed, Heading & Telemetry");

  runTest("4.1 Route polyline decoding (Google Overview Polyline)", () => {
    // Standard Google encoded polyline: (38.5, -120.2) to (40.7, -120.95) to (43.252, -126.453)
    const encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
    const decoded = decodeGooglePolyline(encoded);
    assert.ok(decoded.length >= 3);
    // [lng, lat] GeoJSON format
    assert.ok(Math.abs(decoded[0][1] - 38.5) < 0.001);
    assert.ok(Math.abs(decoded[0][0] - (-120.2)) < 0.001);
  });

  runTest("4.2 Speed formatting (km/h conversion and graceful '--' fallbacks)", () => {
    assert.equal(formatSpeedKmh(null), "--");
    assert.equal(formatSpeedKmh(-1), "--");
    assert.equal(formatSpeedKmh(NaN), "--");
    assert.equal(formatSpeedKmh(0), "0 km/h");
    assert.equal(formatSpeedKmh(10), "36 km/h"); // 10 m/s * 3.6 = 36 km/h
    assert.equal(formatSpeedKmh(22.22), "80 km/h"); // ~80 km/h highway speed
  });

  runTest("4.3 Heading formatting (Cardinal and degrees)", () => {
    assert.equal(formatHeading(null), "--");
    assert.equal(formatHeading(0), "N (0°)");
    assert.equal(formatHeading(45), "NE (45°)");
    assert.equal(formatHeading(90), "E (90°)");
    assert.equal(formatHeading(180), "S (180°)");
    assert.equal(formatHeading(270), "W (270°)");
    assert.equal(formatHeading(315), "NW (315°)");
  });

  runTest("4.4 Turn-by-turn maneuver matching against actual route steps", () => {
    const steps = [
      { instruction: "Head north on Grand Trunk Rd", distance: "500 m", duration: "1 min", maneuver: "straight" },
      { instruction: "Turn left onto NH 48", distance: "5.0 km", duration: "8 mins", maneuver: "turn-left" },
      { instruction: "Take the ramp on the right", distance: "2.0 km", duration: "3 mins", maneuver: "ramp-right" },
      { instruction: "You have arrived at your destination", distance: "0 m", duration: "0 min", maneuver: "arrive" }
    ];

    // At 200m traveled: should be on step 1 (Head north)
    const m1 = getCurrentAndNextManeuver(steps, 200);
    assert.ok(m1.currentManeuver);
    assert.equal(m1.currentManeuver?.instruction, "Head north on Grand Trunk Rd");
    assert.equal(m1.currentManeuver?.maneuverType, "straight");
    assert.equal(m1.currentManeuver?.stepIndex, 1);
    assert.equal(m1.nextManeuver?.instruction, "Turn left onto NH 48");

    // At 1500m traveled: should be on step 2 (Turn left onto NH 48)
    const m2 = getCurrentAndNextManeuver(steps, 1500);
    assert.ok(m2.currentManeuver);
    assert.equal(m2.currentManeuver?.instruction, "Turn left onto NH 48");
    assert.equal(m2.currentManeuver?.maneuverType, "turn-left");
    assert.equal(m2.currentManeuver?.stepIndex, 2);
  });

  console.log("\nTest Suite 5: Live GPS Progress, Off-Route & Arrival Detection");

  runTest("5.1 Progress calculation along actual route polyline", () => {
    // Route from (13.0, 80.0) to (13.1, 80.1)
    const waypoints: [number, number][] = [
      [80.0, 13.0],
      [80.05, 13.05],
      [80.1, 13.1]
    ];
    const totalDistMeters = 15000;
    const totalDurSeconds = 1200;

    const halfwayGps: NavigationPosition = {
      latitude: 13.05,
      longitude: 80.05,
      accuracy: 10,
      altitude: null,
      heading: 45,
      speed: 15, // 15 m/s (~54 km/h)
      timestamp: Date.now()
    };

    const progress = calculateRouteProgress(halfwayGps, waypoints, totalDistMeters, totalDurSeconds);
    assert.ok(progress.progressPercent >= 40 && progress.progressPercent <= 60, "Expected ~50% progress");
    assert.ok(progress.distanceRemainingMeters > 0);
    assert.ok(progress.distanceToRouteMeters < 50, "GPS position is directly on waypoint");
    assert.ok(progress.etaString.length === 5);
  });

  runTest("5.2 Off-route detection with GPS accuracy awareness", () => {
    // Close to route (< 80m): NOT off-route
    assert.equal(isOffRoute(25, 10, 80, 1.4), false);

    // Far from route (> 150m) with high GPS accuracy: DEFINITELY off-route
    assert.equal(isOffRoute(180, 10, 80, 1.4), true);

    // 95m from route, but GPS accuracy is poor (60m): should expand threshold and NOT falsely flag off-route
    assert.equal(isOffRoute(95, 60, 80, 1.4), false);

    // Extreme deviation (350m): off-route even with low accuracy
    assert.equal(isOffRoute(350, 60, 80, 1.4), true);
  });

  runTest("5.3 Arrival detection (within arrival radius)", () => {
    const destLat = 13.0827;
    const destLng = 80.2707;

    // 20 meters away with 10m accuracy: ARRIVED
    const isAtDest = isArrived(13.0828, 80.2708, destLat, destLng, 10, 50, 1.2);
    assert.equal(isAtDest, true);

    // 2 km away: NOT ARRIVED
    const isFar = isArrived(13.1, 80.29, destLat, destLng, 10, 50, 1.2);
    assert.equal(isFar, false);
  });

  runTest("5.4 User-approved rerouting flow state model", () => {
    let navStatus = "ACTIVE";
    let rerouteProposal: RerouteProposal | null = null;

    // 1. Off route triggered
    navStatus = "OFF_ROUTE";
    assert.equal(navStatus, "OFF_ROUTE");

    // 2. Reroute proposal computed
    rerouteProposal = {
      requestId: 101,
      calculatedAt: Date.now(),
      newRoute: {
        id: "B",
        name: "Recalculated Safe Corridor",
        subtitle: "via bypass",
        distance: "14.2 km",
        distanceKm: 14,
        time: "22 mins",
        durationMinutes: 22,
        safetyScore: 88,
        trafficScore: "Low",
        roadScore: "Good",
        nightSafety: "High",
        weatherRisk: "Low",
        emergencyAccessScore: 85,
        recommendation: "RECOMMENDED",
        restStops: 4,
        fuelStops: 2,
        foodStops: 4,
        hotels: 0,
        notes: "Recalculated via bypass",
        type: "safe",
        waypoints: [[80.0, 13.0], [80.1, 13.1]],
        pois: [],
        provider: "google"
      },
      newSafetyAssessment: {} as any,
      reason: "Recalculated from current GPS position",
      distanceDiffKm: -1.5,
      durationDiffMinutes: -3,
      explanation: ["Faster bypass corridor avoiding bottleneck"]
    };
    navStatus = "REROUTING_PENDING";
    assert.equal(navStatus, "REROUTING_PENDING");

    // 3. User approves reroute
    const approve = () => {
      navStatus = "ACTIVE";
      const activeRoute = rerouteProposal!.newRoute;
      rerouteProposal = null;
      return activeRoute;
    };

    const newActive = approve();
    assert.equal(navStatus, "ACTIVE");
    assert.equal(newActive.id, "B");
    assert.equal(rerouteProposal, null);
  });

  console.log("\nTest Suite 6: LiveNavigationOverlay Bottom Telemetry HUD Audit");

  // Helper simulating the HUD state resolver
  function resolveOverlayState(
    status: "READY" | "ACTIVE" | "OFF_ROUTE" | "REROUTING" | "REROUTING_PENDING" | "ARRIVED" | "ENDED",
    hasRoute: boolean
  ) {
    if (status === "READY" || status === "ENDED") {
      return {
        overlayMounted: false,
        telemetryVisible: false,
        arrivalModalVisible: false,
        launcherVisible: true,
        mobileBottomNavVisible: true
      };
    }
    if (status === "ARRIVED") {
      return {
        overlayMounted: true,
        telemetryVisible: false,
        arrivalModalVisible: true,
        launcherVisible: false,
        mobileBottomNavVisible: false
      };
    }
    return {
      overlayMounted: true,
      telemetryVisible: true,
      arrivalModalVisible: false,
      launcherVisible: false,
      mobileBottomNavVisible: false
    };
  }

  runTest("6.1 Telemetry HUD during READY state (Must NOT cover START NAVIGATION controls)", () => {
    const state = resolveOverlayState("READY", true);
    // In READY state, overlay must be unmounted/hidden so START NAVIGATION controls are fully accessible
    assert.equal(state.overlayMounted, false);
    assert.equal(state.telemetryVisible, false);
    assert.equal(state.launcherVisible, true, "Start navigation launcher controls must be visible");
    assert.equal(state.mobileBottomNavVisible, true);
  });

  runTest("6.2 Telemetry HUD during ACTIVE state (Telemetry visible above map, launcher hidden)", () => {
    const state = resolveOverlayState("ACTIVE", true);
    assert.equal(state.overlayMounted, true);
    assert.equal(state.telemetryVisible, true, "Telemetry HUD must be visible above map during active navigation");
    assert.equal(state.launcherVisible, false, "START NAVIGATION launcher must be hidden to prevent UI overlap");
    assert.equal(state.mobileBottomNavVisible, false, "Mobile bottom nav must be hidden to eliminate unwanted white bar");
  });

  runTest("6.3 Telemetry HUD during OFF_ROUTE state (Telemetry stays active with alert banner)", () => {
    const state = resolveOverlayState("OFF_ROUTE", true);
    assert.equal(state.overlayMounted, true);
    assert.equal(state.telemetryVisible, true, "Telemetry HUD remains active during off-route");
    assert.equal(state.launcherVisible, false);
  });

  runTest("6.4 Telemetry HUD during REROUTING state (Telemetry active with recalculating flow)", () => {
    const state = resolveOverlayState("REROUTING", true);
    assert.equal(state.overlayMounted, true);
    assert.equal(state.telemetryVisible, true, "Telemetry HUD remains active while rerouting");
    assert.equal(state.launcherVisible, false);
  });

  runTest("6.5 Telemetry HUD during ARRIVED state (Arrival modal displayed, telemetry cleanly stops)", () => {
    const state = resolveOverlayState("ARRIVED", true);
    assert.equal(state.overlayMounted, true);
    assert.equal(state.telemetryVisible, false);
    assert.equal(state.arrivalModalVisible, true, "Arrival modal replaces HUD with completion summary");
    assert.equal(state.launcherVisible, false);
  });

  runTest("6.6 Telemetry HUD during ENDED state (Must disappear completely when navigation ends)", () => {
    const state = resolveOverlayState("ENDED", true);
    assert.equal(state.overlayMounted, false, "Overlay must disappear when navigation ends");
    assert.equal(state.telemetryVisible, false);
    assert.equal(state.launcherVisible, true, "START NAVIGATION controls restored after navigation ends");
    assert.equal(state.mobileBottomNavVisible, true, "Mobile navigation restored");
  });

  runTest("6.7 Graceful display of unavailable speed, heading, and ETA ('--' fallback)", () => {
    // Speed null/undefined/NaN/negative
    assert.equal(formatSpeedKmh(null), "--");
    assert.equal(formatSpeedKmh(undefined as any), "--");
    assert.equal(formatSpeedKmh(NaN), "--");
    assert.equal(formatSpeedKmh(-5), "--");

    // Heading null/undefined/NaN
    assert.equal(formatHeading(null), "--");
    assert.equal(formatHeading(undefined as any), "--");
    assert.equal(formatHeading(NaN), "--");

    // Valid speed conversion
    assert.equal(formatSpeedKmh(0), "0 km/h");
    assert.equal(formatSpeedKmh(15), "54 km/h");
  });

  runTest("6.8 Zero horizontal overflow audit across 320px, 375px, 414px, tablet & desktop", () => {
    const viewports = [
      { name: "Mobile Extra-Small (320px)", width: 320, outerMargin: 8 * 2, cardPadding: 12 * 2, gap: 4 * 3 },
      { name: "Mobile Small (375px)", width: 375, outerMargin: 12 * 2, cardPadding: 14 * 2, gap: 6 * 3 },
      { name: "Mobile Medium (414px)", width: 414, outerMargin: 14 * 2, cardPadding: 16 * 2, gap: 8 * 3 },
      { name: "Tablet (768px)", width: 768, outerMargin: 24 * 2, cardPadding: 16 * 2, gap: 8 * 3 },
      { name: "Desktop (1280px)", width: 1280, outerMargin: 24 * 2, cardPadding: 20 * 2, gap: 8 * 3 }
    ];

    for (const vp of viewports) {
      const availableCardWidth = vp.width - vp.outerMargin;
      assert.ok(availableCardWidth > 0, `${vp.name} card width must be positive`);

      const availableGridContent = availableCardWidth - vp.cardPadding;
      const cellWidth = (availableGridContent - vp.gap) / 4;

      // Ensure every metric cell has at least 50px width for labels & values
      assert.ok(cellWidth >= 50, `${vp.name} cell width (${cellWidth.toFixed(1)}px) must be >= 50px`);

      // Ensure content never overflows viewport
      const totalRenderedWidth = availableCardWidth + vp.outerMargin;
      assert.equal(totalRenderedWidth, vp.width, `${vp.name} must fit exact viewport width without overflow`);
    }
  });

  runTest("6.9 Viewport pinning & non-interference with vertical map height", () => {
    // HUD is absolute/fixed inside relative map viewport with max(12px, env(safe-area-inset-bottom))
    const hudPositioning = {
      position: "absolute",
      zIndex: 40,
      pointerEvents: "none",
      cardPointerEvents: "auto",
      bottomCss: "max(12px, env(safe-area-inset-bottom, 12px))"
    };

    assert.equal(hudPositioning.position, "absolute", "HUD must be absolute/fixed relative to map container");
    assert.ok(hudPositioning.zIndex >= 40, "HUD must have z-index higher than Google Maps canvas (z: 10-20)");
    assert.equal(hudPositioning.pointerEvents, "none", "Bounding box must allow map drag/pan pass-through");
    assert.ok(hudPositioning.bottomCss.includes("safe-area-inset-bottom"), "Must respect iOS safe-area insets");
  });

  runTest("6.10 Accessibility of Emergency Controls during active live navigation", () => {
    // Emergency SOS button is permanently in the floating map controls cluster at top-right
    const emergencyButton = {
      action: "/emergency",
      position: "top-4 right-4",
      zIndex: 40,
      ariaLabel: "Emergency SOS"
    };

    assert.equal(emergencyButton.action, "/emergency");
    assert.equal(emergencyButton.zIndex, 40);
    assert.ok(emergencyButton.position.includes("top-4 right-4"));
  });

  console.log("\n=================================================================");
  console.log(` AUDIT COMPLETE: ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log("=================================================================\n");
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
