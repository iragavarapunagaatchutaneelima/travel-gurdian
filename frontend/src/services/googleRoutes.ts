import { LocationDetails } from "../types/location";
import { RouteOption, TravelMode, POI } from "../data/routeData";
import { TravelerProfile, RoutePriority } from "../types/safety";
import { loadGoogleMapsScript } from "./googlePlaces";
import { fetchRouteCorridorPOIs, assessRouteSafety } from "./safetyEngine";
import { getActiveIncidents } from "./incidentService";

/**
 * Decodes Google encoded polyline string into an array of [longitude, latitude] coordinates
 * suitable for Google Maps and GeoJSON spatial rendering.
 *
 * NOTE: Standard coordinate format is [longitude, latitude] order.
 */
export function decodeGooglePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];

  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    // Return in [longitude, latitude] order
    points.push([lng * 1e-5, lat * 1e-5]);
  }

  return points;
}

/**
 * Format duration in seconds into human-readable hours and minutes string.
 */
export function formatDurationSeconds(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) {
    return `${mins}m`;
  }
  return `${hours}h ${mins.toString().padStart(2, "0")}m`;
}

/**
 * Clean and normalize HTML instructions returned by Google Directions.
 * Replaces block elements with space and removes tags without gluing words together.
 */
export function cleanInstruction(html: string): string {
  if (!html) return "";
  return html
    .replace(/<div[^>]*>/gi, " ")
    .replace(/<br[^>]*>/gi, " ")
    .replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Format distance in meters into human-readable km/m string with integer rounding.
 */
export function formatDistanceMeters(meters: number): string {
  if (isNaN(meters) || meters <= 0) return "0 m";
  const roundedMeters = Math.round(meters);
  if (roundedMeters < 1000) {
    return `${roundedMeters} m`;
  }
  const km = (roundedMeters / 1000).toFixed(1);
  return `${km.endsWith(".0") ? km.slice(0, -2) : km} km`;
}

let directionsServiceInstance: any = null;
const inFlightRouteRequests = new Map<string, Promise<RouteOption[]>>();
const routeResultCache = new Map<string, { routes: RouteOption[]; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

function getDirectionsService(): any {
  if (!directionsServiceInstance && window.google?.maps) {
    directionsServiceInstance = new window.google.maps.DirectionsService();
  }
  return directionsServiceInstance;
}

/**
 * Request real road routing from Google Maps DirectionsService.
 * Returns normalized Travel Guardian RouteOption objects with real road geometry and real safety assessments.
 * Includes in-flight deduplication and caching for sub-second repeat responses.
 */
export async function calculateGoogleRoutes(
  origin: LocationDetails,
  destination: LocationDetails,
  travelMode: TravelMode = "Car",
  profile: TravelerProfile = "Solo",
  priority: RoutePriority = "Balanced"
): Promise<RouteOption[]> {
  if (!origin || !destination) {
    throw new Error("ORIGIN_AND_DESTINATION_REQUIRED");
  }

  const cleanPlaceId = (id: string | null | undefined): string => {
    if (!id || id === "undefined" || id === "null" || id.trim() === "") return "";
    return id.trim();
  };

  const origPlaceId = cleanPlaceId(origin.placeId);
  const dstPlaceId = cleanPlaceId(destination.placeId);

  // 1. Validation: Same Origin and Destination
  const isSamePlaceId = Boolean(origPlaceId && dstPlaceId && origPlaceId === dstPlaceId);
  const isSameCoords =
    origin.latitude != null &&
    destination.latitude != null &&
    origin.longitude != null &&
    destination.longitude != null &&
    !isNaN(Number(origin.latitude)) &&
    !isNaN(Number(destination.latitude)) &&
    !isNaN(Number(origin.longitude)) &&
    !isNaN(Number(destination.longitude)) &&
    Math.abs(Number(origin.latitude) - Number(destination.latitude)) < 0.0001 &&
    Math.abs(Number(origin.longitude) - Number(destination.longitude)) < 0.0001;
  const isSameName =
    Boolean(
      origin.name &&
      destination.name &&
      origin.name.trim().toLowerCase() === destination.name.trim().toLowerCase() &&
      origin.name.trim().length > 0
    );

  if (isSamePlaceId || isSameCoords || (isSameName && !origPlaceId && !dstPlaceId)) {
    throw new Error("SAME_ORIGIN_AND_DESTINATION");
  }

  // 2. Validation: Invalid Coordinates bounds
  const hasInvalidOriginCoords =
    (origin.latitude != null && (isNaN(Number(origin.latitude)) || Number(origin.latitude) < -90 || Number(origin.latitude) > 90)) ||
    (origin.longitude != null && (isNaN(Number(origin.longitude)) || Number(origin.longitude) < -180 || Number(origin.longitude) > 180));
  const hasInvalidDestCoords =
    (destination.latitude != null && (isNaN(Number(destination.latitude)) || Number(destination.latitude) < -90 || Number(destination.latitude) > 90)) ||
    (destination.longitude != null && (isNaN(Number(destination.longitude)) || Number(destination.longitude) < -180 || Number(destination.longitude) > 180));

  if (hasInvalidOriginCoords || hasInvalidDestCoords) {
    throw new Error("INVALID_COORDINATES");
  }

  // 3. Validation: Missing location identifier
  const hasOriginIdentifier =
    (origin.latitude != null && origin.longitude != null && !isNaN(Number(origin.latitude)) && !isNaN(Number(origin.longitude))) ||
    Boolean(origPlaceId) ||
    Boolean(origin.name && origin.name.trim() !== "");
  const hasDestIdentifier =
    (destination.latitude != null && destination.longitude != null && !isNaN(Number(destination.latitude)) && !isNaN(Number(destination.longitude))) ||
    Boolean(dstPlaceId) ||
    Boolean(destination.name && destination.name.trim() !== "");

  if (!hasOriginIdentifier || !hasDestIdentifier) {
    throw new Error("INVALID_LOCATION");
  }

  // 4. Offline Check
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("OFFLINE");
  }

  // Generate cache & deduplication key
  const origKey = origPlaceId || `${Number(origin.latitude)?.toFixed(4)}_${Number(origin.longitude)?.toFixed(4)}_${origin.name}`;
  const destKey = dstPlaceId || `${Number(destination.latitude)?.toFixed(4)}_${Number(destination.longitude)?.toFixed(4)}_${destination.name}`;
  const cacheKey = `${origKey}__${destKey}__${travelMode}__${profile}__${priority}`;

  // Check cache
  const cached = routeResultCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.routes;
  }

  // Deduplicate in-flight identical request
  if (inFlightRouteRequests.has(cacheKey)) {
    return inFlightRouteRequests.get(cacheKey)!;
  }

  const executionPromise: Promise<RouteOption[]> = (async (): Promise<RouteOption[]> => {
    try {
      const activeIncidents = getActiveIncidents();

      // Priority-based ranking helper
      const applyPriorityRanking = (unrankedRoutes: RouteOption[]): RouteOption[] => {
        if (!unrankedRoutes || unrankedRoutes.length === 0) return [];
        if (unrankedRoutes.length === 1) {
          const r = unrankedRoutes[0];
          r.id = "A";
          r.rank = 1;
          r.rankBadge = priority === "Maximum Safety" ? "★ MOST SAFE" : priority === "Time Priority" ? "⚡ FASTEST ROUTE" : "★ BEST MATCH";
          r.rankLabel = priority === "Maximum Safety" ? "#1 — MOST SAFE (HIGHLY RECOMMENDED)" : priority === "Time Priority" ? "#1 — FASTEST CORRIDOR (RECOMMENDED)" : "#1 — BEST CORRIDOR (HIGHLY RECOMMENDED)";
          r.recommendation = "HIGHLY RECOMMENDED";
          r.name = priority === "Maximum Safety" ? "Primary Safety Corridor" : priority === "Time Priority" ? "Direct Express Route" : "Optimal Safety Corridor";
          return [r];
        }

        const minDuration = Math.min(...unrankedRoutes.map(r => r.durationMinutes || 1));

        const scored = unrankedRoutes.map(r => {
          const dur = r.durationMinutes || 1;
          const timeEfficiency = Math.max(10, Math.min(100, Math.round(100 - ((dur - minDuration) / Math.max(1, minDuration)) * 60)));
          let compositeScore = 0;

          if (priority === "Maximum Safety") {
            compositeScore = (r.safetyScore * 0.85) + (timeEfficiency * 0.15);
          } else if (priority === "Time Priority") {
            compositeScore = (timeEfficiency * 0.75) + (r.safetyScore * 0.25);
          } else {
            // Balanced
            compositeScore = (r.safetyScore * 0.55) + (timeEfficiency * 0.45);
          }

          return { ...r, _compositeScore: compositeScore };
        });

        // Deterministic sort: highest composite score first
        scored.sort((a, b) => b._compositeScore - a._compositeScore);

        const routeLetters: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
        return scored.map((r, idx) => {
          const letter = routeLetters[idx] || ("D" as const);
          let rankBadge = "ALTERNATIVE ROUTE";
          let rankLabel = `#${idx + 1} — ALTERNATIVE OPTION`;
          let rec: RouteOption["recommendation"] = "USE CAUTION";
          let corridorName = "Alternative Corridor";

          if (idx === 0) {
            rankBadge = priority === "Maximum Safety" ? "★ MOST SAFE" : priority === "Time Priority" ? "⚡ FASTEST ROUTE" : "★ BEST MATCH";
            rankLabel = priority === "Maximum Safety" ? "#1 — MOST SAFE (HIGHLY RECOMMENDED)" : priority === "Time Priority" ? "#1 — FASTEST CORRIDOR (RECOMMENDED)" : "#1 — BEST CORRIDOR (HIGHLY RECOMMENDED)";
            rec = "HIGHLY RECOMMENDED";
            corridorName = priority === "Maximum Safety" ? "Primary Safety Corridor" : priority === "Time Priority" ? "Direct Express Route" : "Optimal Safety Corridor";
          } else if (idx === 1) {
            rankBadge = "SAFE ALTERNATIVE";
            rankLabel = "#2 — SAFE ALTERNATIVE (RECOMMENDED)";
            rec = "RECOMMENDED";
            corridorName = "Secondary Safety Corridor";
          } else if (idx === 2) {
            rankBadge = "ALTERNATIVE ROUTE";
            rankLabel = "#3 — ALTERNATIVE ROUTE (CONSIDER IF NEEDED)";
            rec = "USE CAUTION";
            corridorName = "Alternative Transit Pathway";
          }

          return {
            ...r,
            id: letter,
            rank: idx + 1,
            rankBadge,
            rankLabel,
            recommendation: rec,
            name: corridorName
          };
        });
      };

      // =========================================================================
      // MOTORIZED TWO-WHEELER ROUTING via Google Routes API v2 (TWO_WHEELER)
      // Sections 5, 6, 8: Motorized two-wheeler routing replaces legacy BICYCLING.
      // =========================================================================
      if (travelMode === "Bike") {
        const computeRes = await fetch("/api/routes/compute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: {
              latitude: origin.latitude,
              longitude: origin.longitude,
              placeId: origPlaceId,
              name: origin.name,
              address: origin.formattedAddress
            },
            destination: {
              latitude: destination.latitude,
              longitude: destination.longitude,
              placeId: dstPlaceId,
              name: destination.name,
              address: destination.formattedAddress
            },
            travelMode: "TWO_WHEELER",
            computeAlternativeRoutes: true,
            languageCode: "en-US"
          })
        });

        const computeData = await computeRes.json().catch(() => null);

        if (!computeRes.ok || !computeData?.routes || computeData.routes.length === 0) {
          throw new Error(
            `Two-wheeler routing is currently unavailable for this route between "${origin.name}" and "${destination.name}". Try another destination or switch to Car mode.`
          );
        }

        const rawRoutes = computeData.routes;
        const normalizedPromises = rawRoutes.map(async (route: any, index: number) => {
          let waypoints: [number, number][] = [];
          if (route.polyline?.encodedPolyline) {
            waypoints = decodeGooglePolyline(route.polyline.encodedPolyline);
          }

          const totalDistanceMeters = route.distanceMeters || 0;
          const totalDurationSeconds = parseInt(route.duration?.replace("s", "") || "0");
          const routeWarnings: string[] = route.warnings || [];
          const hasTolls = routeWarnings.some((w: string) => w.toLowerCase().includes("toll"));

          const structuredSteps: any[] = [];
          if (route.legs && Array.isArray(route.legs)) {
            route.legs.forEach((leg: any) => {
              if (leg.steps && Array.isArray(leg.steps)) {
                leg.steps.forEach((step: any, sIdx: number) => {
                  const sDist = step.distanceMeters || 0;
                  const sDur = parseInt(step.staticDuration?.replace("s", "") || "0");
                  const startLat = step.startLocation?.latLng?.latitude || 0;
                  const startLng = step.startLocation?.latLng?.longitude || 0;
                  const endLat = step.endLocation?.latLng?.latitude || 0;
                  const endLng = step.endLocation?.latLng?.longitude || 0;

                  let stepPath: [number, number][] = [];
                  if (step.polyline?.encodedPolyline) {
                    stepPath = decodeGooglePolyline(step.polyline.encodedPolyline);
                  } else if (startLat && startLng && endLat && endLng) {
                    stepPath = [[startLng, startLat], [endLng, endLat]];
                  }

                  structuredSteps.push({
                    instruction: step.navigationInstruction?.instructions || "Continue along roadway",
                    distance: formatDistanceMeters(sDist),
                    distanceMeters: sDist,
                    duration: formatDurationSeconds(sDur),
                    durationSeconds: sDur,
                    startLocation: [startLng, startLat],
                    endLocation: [endLng, endLat],
                    maneuver: step.navigationInstruction?.maneuver || "STRAIGHT",
                    stepIndex: sIdx,
                    path: stepPath
                  });
                });
              }
            });
          }

          const distanceKm = Math.round(totalDistanceMeters / 1000);
          const durationMinutes = Math.round(totalDurationSeconds / 60);
          const distanceText = formatDistanceMeters(totalDistanceMeters);
          const durationText = formatDurationSeconds(totalDurationSeconds);
          const tollInfo = hasTolls ? "Tolls on Route" : "No Tolls Reported";

          const realPOIs = await fetchRouteCorridorPOIs(waypoints, "Bike");

          const baseRouteObj: RouteOption = {
            id: index === 0 ? "A" : index === 1 ? "B" : index === 2 ? "C" : "D",
            name: index === 0 ? "Motorized Two-Wheeler Corridor" : "Alternative Two-Wheeler Route",
            subtitle: route.description ? `via ${route.description}` : "Motorized 2-Wheeler Network",
            distance: distanceText,
            distanceKm: distanceKm || 1,
            time: durationText,
            durationMinutes: durationMinutes || 1,
            safetyScore: 85,
            trafficScore: "Low",
            roadScore: "Good",
            nightSafety: "Medium",
            weatherRisk: "Low",
            emergencyAccessScore: 85,
            recommendation: "RECOMMENDED",
            restStops: realPOIs.filter(p => p.type === "food" || p.type === "rest").length,
            fuelStops: realPOIs.filter(p => p.type === "petrol").length,
            foodStops: realPOIs.filter(p => p.type === "food").length,
            hotels: 0,
            notes: `Verified Google motorized two-wheeler corridor via ${route.description || "highway network"}. Distance: ${distanceText}, estimated time: ${durationText}. ${hasTolls ? "Tolls apply." : "No tolls indicated."}`,
            type: "safe",
            waypoints,
            pois: realPOIs,
            provider: "google",
            tollInfo,
            warnings: routeWarnings,
            legs: route.legs,
            steps: structuredSteps
          };

          const safetyAssessment = assessRouteSafety(baseRouteObj, realPOIs, activeIncidents, profile, priority, "Bike");
          const safetyScore = safetyAssessment.safetyFit;

          return {
            ...baseRouteObj,
            safetyScore,
            emergencyAccessScore: safetyAssessment.factors.emergencyAccess.score,
            notes: safetyAssessment.explanation.join(" "),
            safetyAssessment
          };
        });

        const resolvedRoutes = await Promise.all(normalizedPromises);
        return applyPriorityRanking(resolvedRoutes);
      }

      // Load Google Maps API with directions support for Car & Walk
      await loadGoogleMapsScript();

      const service = getDirectionsService();
      if (!service) {
        throw new Error("SERVICE_UNAVAILABLE");
      }

      // Map TravelGuardian TravelMode to Google Maps TravelMode
      const googleTravelMode = travelMode === "Walk"
        ? window.google.maps.TravelMode.WALKING
        : window.google.maps.TravelMode.DRIVING;

      const originLocation =
        origin.latitude != null && origin.longitude != null && !isNaN(Number(origin.latitude)) && !isNaN(Number(origin.longitude))
          ? { lat: Number(origin.latitude), lng: Number(origin.longitude) }
          : origPlaceId
            ? { placeId: origPlaceId }
            : origin.formattedAddress || origin.name;

      const destLocation =
        destination.latitude != null && destination.longitude != null && !isNaN(Number(destination.latitude)) && !isNaN(Number(destination.longitude))
          ? { lat: Number(destination.latitude), lng: Number(destination.longitude) }
          : dstPlaceId
            ? { placeId: dstPlaceId }
            : destination.formattedAddress || destination.name;

      return new Promise<RouteOption[]>((resolve, reject) => {
        service.route(
          {
            origin: originLocation,
            destination: destLocation,
            travelMode: googleTravelMode,
        provideRouteAlternatives: true,
        unitSystem: window.google.maps.UnitSystem.METRIC
      },
      async (response: any, status: any) => {
        if (status === window.google.maps.DirectionsStatus.OK && response?.routes?.length > 0) {
          const rawRoutes = response.routes;
          const routeLetters: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];

          const normalizedPromises = rawRoutes.map(async (route: any, index: number) => {
            const letter = routeLetters[index] || ("D" as const);
            
            // Extract geometry: decode overview_polyline or parse overview_path
            let waypoints: [number, number][] = [];
            if (route.overview_polyline) {
              waypoints = decodeGooglePolyline(route.overview_polyline);
            } else if (route.overview_path && Array.isArray(route.overview_path)) {
              waypoints = route.overview_path.map((latLng: any) => {
                const lat = typeof latLng.lat === "function" ? latLng.lat() : latLng.lat;
                const lng = typeof latLng.lng === "function" ? latLng.lng() : latLng.lng;
                return [Number(lng), Number(lat)] as [number, number];
              });
            }

            // If overview_path had fewer than 2 points, ensure origin and dest are present
            if (waypoints.length === 0) {
              waypoints = [
                [origin.longitude, origin.latitude],
                [destination.longitude, destination.latitude]
              ];
            }

            // Aggregate metrics across all legs
            let totalDistanceMeters = 0;
            let totalDurationSeconds = 0;
            let totalDurationInTrafficSeconds: number | undefined = undefined;
            const routeWarnings: string[] = route.warnings || [];
            let hasTolls = false;

            const structuredSteps: any[] = [];

            if (route.legs && Array.isArray(route.legs)) {
              route.legs.forEach((leg: any) => {
                totalDistanceMeters += leg.distance?.value || 0;
                totalDurationSeconds += leg.duration?.value || 0;
                if (leg.duration_in_traffic?.value) {
                  totalDurationInTrafficSeconds = (totalDurationInTrafficSeconds || 0) + leg.duration_in_traffic.value;
                }
                if (leg.steps && Array.isArray(leg.steps)) {
                  leg.steps.forEach((step: any) => {
                    structuredSteps.push({
                      instruction: step.instructions ? cleanInstruction(step.instructions) : "",
                      distance: step.distance?.text || "",
                      duration: step.duration?.text || "",
                      startLocation: step.start_location ? [step.start_location.lng(), step.start_location.lat()] : null,
                      endLocation: step.end_location ? [step.end_location.lng(), step.end_location.lat()] : null,
                      maneuver: step.maneuver || ""
                    });
                  });
                }
              });
            }

            // Check for toll warnings
            if (routeWarnings.some((w: string) => w.toLowerCase().includes("toll"))) {
              hasTolls = true;
            }

            const distanceKm = Math.round(totalDistanceMeters / 1000);
            const durationMinutes = Math.round(totalDurationSeconds / 60);
            const distanceText = formatDistanceMeters(totalDistanceMeters);
            const durationText = formatDurationSeconds(totalDurationSeconds);

            const trafficDurationText = totalDurationInTrafficSeconds
              ? formatDurationSeconds(totalDurationInTrafficSeconds)
              : undefined;

            const tollInfo = hasTolls ? "Tolls on Route" : "No Tolls Reported";

            // Query real POIs along the route corridor
            const realPOIs = await fetchRouteCorridorPOIs(waypoints, travelMode);

            // Temporary base route for assessment
            const baseRouteObj: RouteOption = {
              id: letter,
              name: index === 0 ? "Safety Corridor" : index === 1 ? "Alternative Corridor" : index === 2 ? "Balanced Route" : "Alternate Route",
              subtitle: route.summary ? `via ${route.summary}` : "Google Road Route",
              distance: distanceText,
              distanceKm: distanceKm || 1,
              time: durationText,
              durationMinutes: durationMinutes || 1,
              safetyScore: 85,
              trafficScore: totalDurationInTrafficSeconds && totalDurationInTrafficSeconds > totalDurationSeconds * 1.2 ? "High" : "Low",
              roadScore: index === 0 ? "Good" : "Moderate",
              nightSafety: index === 0 ? "High" : "Medium",
              weatherRisk: "Low",
              emergencyAccessScore: 85,
              recommendation: "RECOMMENDED",
              restStops: realPOIs.filter(p => p.type === "food" || p.type === "rest").length,
              fuelStops: realPOIs.filter(p => p.type === "petrol").length,
              foodStops: realPOIs.filter(p => p.type === "food").length,
              hotels: 0,
              notes: `Real Google road routing via ${route.summary || "active network"}. Distance: ${distanceText}, estimated time: ${durationText}. ${hasTolls ? "Tolls apply on this route." : "No tolls indicated by Google."}`,
              type: index === 0 ? "safe" : index === 1 ? "fast" : "balanced",
              waypoints,
              pois: realPOIs,
              provider: "google",
              tollInfo,
              trafficDuration: trafficDurationText,
              warnings: routeWarnings,
              legs: route.legs,
              steps: structuredSteps
            };

            // Run deterministic Safety Engine
            const safetyAssessment = assessRouteSafety(baseRouteObj, realPOIs, activeIncidents, profile, priority, travelMode);

            const safetyScore = safetyAssessment.safetyFit;
            const routeSummary = route.summary ? `via ${route.summary}` : "";
            let name = "Safety Corridor";
            let subtitle = routeSummary ? `${routeSummary} • Primary Highway` : "Main Verified Corridor";
            let recommendation: "HIGHLY RECOMMENDED" | "RECOMMENDED" | "USE CAUTION" | "AVOID / HIGH RISK" = "RECOMMENDED";

            if (safetyAssessment.recommendation === "Better Safety Fit") {
              name = "Safety Fit Corridor";
              subtitle = routeSummary ? `${routeSummary} • Higher Service Density` : "Optimal Safety Corridor";
              recommendation = "HIGHLY RECOMMENDED";
            } else if (safetyAssessment.recommendation === "Time Priority Fit") {
              name = "Fast Transit Route";
              subtitle = routeSummary ? `${routeSummary} • Direct Route` : "Fast Transit Corridor";
              recommendation = "RECOMMENDED";
            } else if (safetyAssessment.recommendation === "Caution Advised") {
              name = "Alternate Route";
              subtitle = routeSummary ? `${routeSummary} • Limited Support` : "Alternate Pathway";
              recommendation = "USE CAUTION";
            }

            const hospitalCount = realPOIs.filter(p => p.type === "hospital").length;
            const policeCount = realPOIs.filter(p => p.type === "police").length;
            const fuelCount = realPOIs.filter(p => p.type === "petrol").length;
            const foodCount = realPOIs.filter(p => p.type === "food").length;

            return {
              ...baseRouteObj,
              name,
              subtitle,
              safetyScore,
              emergencyAccessScore: safetyAssessment.factors.emergencyAccess.score,
              recommendation,
              restStops: foodCount,
              fuelStops: fuelCount,
              foodStops: foodCount,
              hotels: 0,
              notes: safetyAssessment.explanation.join(" "),
              safetyAssessment
            };
          });

          const normalizedRoutes = await Promise.all(normalizedPromises);
          resolve(applyPriorityRanking(normalizedRoutes));
        } else if (status === window.google.maps.DirectionsStatus.ZERO_RESULTS) {
          reject(
            new Error(
              `Routing is unavailable for this travel mode (${travelMode}) on this route between "${origin.name}" and "${destination.name}". Try another destination or switch to Car.`
            )
          );
        } else if (status === window.google.maps.DirectionsStatus.NOT_FOUND) {
          reject(
            new Error(
              `One or both locations could not be resolved by Google Directions routing.`
            )
          );
        } else if (status === window.google.maps.DirectionsStatus.OVER_QUERY_LIMIT) {
          reject(
            new Error(
              `Google Directions API request quota exceeded. Please check your Google Cloud Console quota or try again shortly.`
            )
          );
        } else if (status === window.google.maps.DirectionsStatus.REQUEST_DENIED) {
          reject(
            new Error(
              `Google Directions API request was denied. Ensure the Directions API is enabled on your Google Cloud Console key.`
            )
          );
        } else if (status === window.google.maps.DirectionsStatus.INVALID_REQUEST) {
          reject(
            new Error(
              `Invalid routing request. Please verify the selected locations.`
            )
          );
        } else {
          reject(
            new Error(
              `Unable to calculate a real route right now (Status: ${status}). Please check your connection or try again.`
            )
          );
        }
      }
    );
  });

    } finally {
      inFlightRouteRequests.delete(cacheKey);
    }
  })();

  inFlightRouteRequests.set(cacheKey, executionPromise);
  const result = await executionPromise;
  routeResultCache.set(cacheKey, { routes: result, timestamp: Date.now() });
  return result;
}

