import { LocationDetails } from "../types/location";
import { RouteOption, TravelMode, POI } from "../data/routeData";
import { TravelerProfile, RoutePriority } from "../types/safety";
import { loadGoogleMapsScript } from "./googlePlaces";
import { fetchRouteCorridorPOIs, assessRouteSafety } from "./safetyEngine";
import { getActiveIncidents } from "./incidentService";

/**
 * Decodes Google encoded polyline string into an array of [longitude, latitude] coordinates
 * suitable for Mapbox GeoJSON LineString rendering.
 *
 * NOTE: GeoJSON specifies coordinates in [longitude, latitude] order.
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

    // Return in [longitude, latitude] order for GeoJSON / Mapbox
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
 * Format distance in meters into human-readable km/m string.
 */
export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km.endsWith(".0") ? km.slice(0, -2) : km} km`;
}

let directionsServiceInstance: any = null;

function getDirectionsService(): any {
  if (!directionsServiceInstance && window.google?.maps) {
    directionsServiceInstance = new window.google.maps.DirectionsService();
  }
  return directionsServiceInstance;
}

/**
 * Request real road routing from Google Maps DirectionsService.
 * Returns normalized Travel Guardian RouteOption objects with real road geometry and real safety assessments.
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

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("OFFLINE");
  }

  // Load Google Maps API with directions support
  await loadGoogleMapsScript();

  const service = getDirectionsService();
  if (!service) {
    throw new Error("SERVICE_UNAVAILABLE");
  }

  // Map TravelGuardian TravelMode to Google Maps TravelMode
  let googleTravelMode: any;
  if (travelMode === "Bike") {
    googleTravelMode = window.google.maps.TravelMode.BICYCLING;
  } else if (travelMode === "Walk") {
    googleTravelMode = window.google.maps.TravelMode.WALKING;
  } else {
    googleTravelMode = window.google.maps.TravelMode.DRIVING;
  }

  const originLocation = origin.placeId
    ? { placeId: origin.placeId }
    : { lat: origin.latitude, lng: origin.longitude };

  const destLocation = destination.placeId
    ? { placeId: destination.placeId }
    : { lat: destination.latitude, lng: destination.longitude };

  const activeIncidents = getActiveIncidents();

  return new Promise((resolve, reject) => {
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
                      instruction: step.instructions ? step.instructions.replace(/<[^>]*>?/gm, "") : "",
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
          resolve(normalizedRoutes);
        } else if (status === window.google.maps.DirectionsStatus.ZERO_RESULTS) {
          reject(
            new Error(
              `Google routing is unavailable for this travel mode (${travelMode}) on this route between "${origin.name}" and "${destination.name}".`
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
}

