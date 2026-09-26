import { POI, RouteOption, TravelMode } from "../data/routeData";
import { 
  SafetyAssessment, SafetyFactor, TravelerProfile, 
  RoutePriority, SafetyConfidence, IncidentReport 
} from "../types/safety";
import { loadGoogleMapsScript } from "./googlePlaces";
import { getActiveIncidents } from "./incidentService";

// In-memory cache for corridor POI queries to prevent excessive Google Places API calls
const poiCache = new Map<string, POI[]>();

/**
 * Calculate Euclidean distance in km between two lat/lng points.
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * 111;
  const dLon = (lon2 - lon1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

/**
 * Sample up to 4 evenly-spaced anchor points along the route geometry.
 */
// Sample up to 2 strategic anchor points along the route corridor (midpoint and quarter-point)
function sampleRouteWaypoints(waypoints: [number, number][]): [number, number][] {
  if (waypoints.length <= 2) return waypoints;
  const mid = Math.floor(waypoints.length / 2);
  const quarter = Math.floor(waypoints.length / 4);
  return [waypoints[quarter], waypoints[mid]];
}

/**
 * Queries Google Places for real POIs along the route corridor.
 * Throttled, deduplicated, parallelized with timeout, and cached.
 */
export async function fetchRouteCorridorPOIs(
  waypoints: [number, number][],
  travelMode: TravelMode = "Car"
): Promise<POI[]> {
  if (typeof window === "undefined" || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return [];
  }

  if (!waypoints || waypoints.length === 0) {
    return [];
  }

  try {
    await loadGoogleMapsScript();
  } catch {
    return [];
  }

  if (!window.google?.maps?.places) {
    return [];
  }

  const dummyDiv = document.createElement("div");
  const placesService = new window.google.maps.places.PlacesService(dummyDiv);

  const samplePoints = sampleRouteWaypoints(waypoints);
  const categories: Array<{ type: POI["type"]; googleType: string }> = [
    { type: "hospital", googleType: "hospital" },
    { type: "police", googleType: "police" },
    { type: "pharmacy", googleType: "pharmacy" }
  ];

  if (travelMode === "Car" || travelMode === "Bike") {
    categories.push({ type: "petrol", googleType: "gas_station" });
  }
  categories.push({ type: "food", googleType: "restaurant" });

  const allPOIs: POI[] = [];
  const seenPlaceIds = new Set<string>();

  // Prepare batch requests to run in parallel
  const searchPromises: Promise<POI[]>[] = [];

  for (const pt of samplePoints) {
    const lng = pt[0];
    const lat = pt[1];

    for (const cat of categories) {
      const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}_${cat.googleType}`;
      if (poiCache.has(cacheKey)) {
        const cached = poiCache.get(cacheKey) || [];
        cached.forEach(p => {
          if (!seenPlaceIds.has(p.id)) {
            seenPlaceIds.add(p.id);
            allPOIs.push(p);
          }
        });
        continue;
      }

      // Run query with a strict 2-second timeout to avoid blocking route calculation
      const queryPromise = new Promise<POI[]>((resolve) => {
        let isDone = false;
        const timer = setTimeout(() => {
          if (!isDone) {
            isDone = true;
            resolve([]);
          }
        }, 1800);

        try {
          placesService.nearbySearch(
            {
              location: new window.google.maps.LatLng(lat, lng),
              radius: 6000, // 6 km corridor radius
              type: cat.googleType as any
            },
            (res: any[], status: any) => {
              if (isDone) return;
              isDone = true;
              clearTimeout(timer);

              if (status === window.google.maps.places.PlacesServiceStatus.OK && res) {
                const mapped: POI[] = res.slice(0, 3).map((r) => {
                  const rLat = typeof r.geometry?.location?.lat === "function" ? r.geometry.location.lat() : r.geometry?.location?.lat || lat;
                  const rLng = typeof r.geometry?.location?.lng === "function" ? r.geometry.location.lng() : r.geometry?.location?.lng || lng;
                  const distFromAnchor = calculateDistanceKm(lat, lng, rLat, rLng).toFixed(1);

                  return {
                    id: r.place_id || `poi_${Math.random()}`,
                    name: r.name || "Verified Facility",
                    type: cat.type,
                    latitude: rLat,
                    longitude: rLng,
                    distanceAhead: `~${distFromAnchor} km from corridor`,
                    status: r.business_status ? r.business_status.replace(/_/g, " ") : (r.rating ? `Rating: ${r.rating}★` : "Verified Listing")
                  };
                });
                poiCache.set(cacheKey, mapped);
                resolve(mapped);
              } else {
                resolve([]);
              }
            }
          );
        } catch {
          if (!isDone) {
            isDone = true;
            clearTimeout(timer);
            resolve([]);
          }
        }
      });

      searchPromises.push(queryPromise);
    }
  }

  if (searchPromises.length > 0) {
    const batchResults = await Promise.all(searchPromises);
    batchResults.forEach(batch => {
      batch.forEach(p => {
        if (!seenPlaceIds.has(p.id)) {
          seenPlaceIds.add(p.id);
          allPOIs.push(p);
        }
      });
    });
  }

  return allPOIs;
}

/**
 * Core Travel Guardian Safety Assessment Engine.
 * Evaluates real POIs, active community incidents, and user preferences deterministically.
 */
export function assessRouteSafety(
  route: RouteOption,
  corridorPOIs: POI[],
  activeIncidents: IncidentReport[],
  profile: TravelerProfile = "Solo",
  priority: RoutePriority = "Balanced",
  travelMode: TravelMode = "Car"
): SafetyAssessment {
  const hospitals = corridorPOIs.filter(p => p.type === "hospital");
  const policeStations = corridorPOIs.filter(p => p.type === "police");
  const pharmacies = corridorPOIs.filter(p => p.type === "pharmacy");
  const fuelStations = corridorPOIs.filter(p => p.type === "petrol");
  const restStops = corridorPOIs.filter(p => p.type === "food" || p.type === "rest");

  // Check for nearby user-reported incidents along the route waypoints
  const nearbyIncidents: IncidentReport[] = [];
  activeIncidents.forEach(inc => {
    const isNear = route.waypoints.some(wp => {
      const d = calculateDistanceKm(wp[1], wp[0], inc.latitude, inc.longitude);
      return d < 12; // Within 12 km of route line
    });
    if (isNear) {
      nearbyIncidents.push(inc);
    }
  });

  // Factor 1: Medical Access
  const medicalCount = hospitals.length;
  const medicalScore = medicalCount >= 3 ? 95 : medicalCount === 2 ? 85 : medicalCount === 1 ? 70 : 45;
  const medicalFactor: SafetyFactor = {
    name: "Medical Access",
    category: "medical",
    status: medicalCount > 0 ? "AVAILABLE" : "LIMITED",
    score: medicalScore,
    rating: medicalCount >= 3 ? "Good" : medicalCount >= 1 ? "Moderate" : "Limited",
    details: medicalCount > 0 
      ? `${medicalCount} verified hospital/clinic ${medicalCount === 1 ? "facility" : "facilities"} identified along corridor.`
      : "Limited medical facilities found directly within the sampled route corridor.",
    count: medicalCount,
    samplePOIs: hospitals
  };

  // Factor 2: Police Access
  const policeCount = policeStations.length;
  const policeScore = policeCount >= 2 ? 92 : policeCount === 1 ? 78 : 50;
  const policeFactor: SafetyFactor = {
    name: "Police Access",
    category: "police",
    status: policeCount > 0 ? "AVAILABLE" : "LIMITED",
    score: policeScore,
    rating: policeCount >= 2 ? "Good" : policeCount === 1 ? "Moderate" : "Limited",
    details: policeCount > 0 
      ? `${policeCount} police station/post ${policeCount === 1 ? "node" : "nodes"} found along corridor.`
      : "No direct police stations identified in sampled corridor segment.",
    count: policeCount,
    samplePOIs: policeStations
  };

  // Factor 3: Emergency Accessibility (Combined Hospital + Police)
  const emergencyScore = Math.round((medicalScore * 0.6) + (policeScore * 0.4));
  const emergencyFactor: SafetyFactor = {
    name: "Emergency Accessibility",
    category: "emergency",
    status: (medicalCount > 0 || policeCount > 0) ? "AVAILABLE" : "LIMITED",
    score: emergencyScore,
    rating: emergencyScore >= 85 ? "Good" : emergencyScore >= 70 ? "Moderate" : "Limited",
    details: `Combined medical & police first-responder accessibility index based on ${medicalCount} medical and ${policeCount} police locations.`,
    count: medicalCount + policeCount
  };

  // Factor 4: Pharmacy Access
  const pharmacyCount = pharmacies.length;
  const pharmacyScore = pharmacyCount >= 2 ? 90 : pharmacyCount === 1 ? 75 : 55;
  const pharmacyFactor: SafetyFactor = {
    name: "Pharmacy Access",
    category: "pharmacy",
    status: pharmacyCount > 0 ? "AVAILABLE" : "LIMITED",
    score: pharmacyScore,
    rating: pharmacyCount >= 2 ? "Good" : pharmacyCount === 1 ? "Moderate" : "Limited",
    details: pharmacyCount > 0 
      ? `${pharmacyCount} verified pharmacy locations found.` 
      : "No pharmacy locations recorded in sampled route segments.",
    count: pharmacyCount,
    samplePOIs: pharmacies
  };

  // Factor 5: Fuel Access (Applicable for Car & Bike, not penalized for Walk)
  const fuelCount = fuelStations.length;
  let fuelScore = 85;
  let fuelRating: SafetyFactor["rating"] = "Good";
  let fuelDetails = "";

  if (travelMode === "Walk") {
    fuelScore = 100;
    fuelRating = "Good";
    fuelDetails = "Fuel stations are not required for walking travel mode.";
  } else {
    fuelScore = fuelCount >= 3 ? 95 : fuelCount >= 1 ? 80 : 50;
    fuelRating = fuelCount >= 3 ? "Good" : fuelCount >= 1 ? "Moderate" : "Limited";
    fuelDetails = fuelCount > 0 
      ? `${fuelCount} fuel/service plazas identified along route.` 
      : "Limited fuel plazas identified in sampled corridor segments.";
  }

  const fuelFactor: SafetyFactor = {
    name: "Fuel & Service Access",
    category: "fuel",
    status: travelMode === "Walk" ? "AVAILABLE" : fuelCount > 0 ? "AVAILABLE" : "LIMITED",
    score: fuelScore,
    rating: fuelRating,
    details: fuelDetails,
    count: fuelCount,
    samplePOIs: fuelStations
  };

  // Factor 6: Food & Rest Access
  const restCount = restStops.length;
  const restScore = restCount >= 3 ? 92 : restCount >= 1 ? 80 : 55;
  const foodRestFactor: SafetyFactor = {
    name: "Rest & Food Amenities",
    category: "rest",
    status: restCount > 0 ? "AVAILABLE" : "LIMITED",
    score: restScore,
    rating: restCount >= 3 ? "Good" : restCount >= 1 ? "Moderate" : "Limited",
    details: restCount > 0 
      ? `${restCount} food/rest stop amenities identified for transit preparedness.` 
      : "Limited food and rest stops recorded along sampled segments.",
    count: restCount,
    samplePOIs: restStops
  };

  // Factor 7: Weather (Truthful: NOT_CONFIGURED)
  const weatherFactor: SafetyFactor = {
    name: "Weather & Environmental Risk",
    category: "weather",
    status: "NOT_CONFIGURED",
    score: 75,
    rating: "Not Configured",
    details: "Live weather telemetry provider is not configured for this installation. No synthetic weather assumed."
  };

  // Factor 8: Community Reported Incidents
  const incidentCount = nearbyIncidents.length;
  const incidentScore = incidentCount === 0 ? 98 : incidentCount === 1 ? 75 : 50;
  const incidentFactor: SafetyFactor = {
    name: "Reported Corridor Incidents",
    category: "incidents",
    status: "AVAILABLE",
    score: incidentScore,
    rating: incidentCount === 0 ? "Good" : incidentCount === 1 ? "Moderate" : "Limited",
    details: incidentCount === 0 
      ? "No active community-reported road blockages or hazards recorded along this corridor." 
      : `${incidentCount} active community-reported hazard ${incidentCount === 1 ? "entry" : "entries"} located near corridor.`,
    count: incidentCount
  };

  // Profile-specific factor weighting
  let wEmergency = 0.25;
  let wMedical = 0.20;
  let wPolice = 0.15;
  let wFuel = 0.15;
  let wRest = 0.10;
  let wIncidents = 0.15;

  if (profile === "Solo Woman Traveller") {
    wEmergency = 0.30;
    wPolice = 0.25;
    wMedical = 0.15;
    wIncidents = 0.20;
    wFuel = 0.05;
    wRest = 0.05;
  } else if (profile === "Family") {
    wMedical = 0.30;
    wRest = 0.25;
    wEmergency = 0.20;
    wFuel = 0.15;
    wPolice = 0.05;
    wIncidents = 0.05;
  } else if (profile === "Group") {
    wFuel = 0.25;
    wRest = 0.25;
    wEmergency = 0.20;
    wMedical = 0.15;
    wPolice = 0.10;
    wIncidents = 0.05;
  }

  // Priority adjustments
  let rawSafetyFit = (
    (emergencyScore * wEmergency) +
    (medicalScore * wMedical) +
    (policeScore * wPolice) +
    (fuelScore * wFuel) +
    (restScore * wRest) +
    (incidentScore * wIncidents)
  );

  // Toll road bonus only when tolls are actually confirmed -- "possible" or
  // "unavailable" toll status must not be treated as if it were confirmed.
  if (route.tollInfo === "Tolls on Route") {
    rawSafetyFit = Math.min(98, rawSafetyFit + 3); // Structured toll corridors have organized patrol
  }

  if (priority === "Time Priority") {
    rawSafetyFit = Math.round((rawSafetyFit * 0.7) + 25);
  }

  const safetyFit = Math.max(40, Math.min(96, Math.round(rawSafetyFit)));

  // Confidence calculation
  let availableFactorCount = 0;
  if (corridorPOIs.length > 5) availableFactorCount += 3;
  else if (corridorPOIs.length > 0) availableFactorCount += 2;
  else availableFactorCount += 1;

  availableFactorCount += 1; // Incidents available

  const confidence: SafetyConfidence = availableFactorCount >= 4 ? "HIGH" : availableFactorCount >= 3 ? "MEDIUM" : "LIMITED";

  // Build factual explanation
  const explanation: string[] = [];
  if (medicalCount > 0) {
    explanation.push(`${medicalCount} verified medical ${medicalCount === 1 ? "facility" : "facilities"} found within route corridor.`);
  } else {
    explanation.push("Limited hospital coverage identified in sampled corridor sections.");
  }

  if (policeCount > 0) {
    explanation.push(`${policeCount} police station/control ${policeCount === 1 ? "node" : "nodes"} located near route.`);
  }

  if (travelMode !== "Walk") {
    if (fuelCount > 0) {
      explanation.push(`${fuelCount} verified fuel/service plazas identified for transit.`);
    }
  }

  if (incidentCount > 0) {
    explanation.push(`Alert: ${incidentCount} community-reported incident near corridor.`);
  } else {
    explanation.push("No active community incident alerts on this roadway.");
  }

  if (route.tollInfo === "Tolls on Route") {
    explanation.push("Toll expressway corridor with standardized infrastructure.");
  }

  explanation.push("Weather provider not configured; no synthetic weather used.");

  const warnings: string[] = [];
  if (incidentCount > 0) {
    nearbyIncidents.forEach(inc => {
      warnings.push(`[Community Report] ${inc.type}: ${inc.description}`);
    });
  }

  if (medicalCount === 0) {
    warnings.push("Limited medical facilities identified along sampled route sections.");
  }

  const unavailableFactors: string[] = [
    "Live Weather & Flood Gauges (Provider Not Configured)"
  ];

  let recommendation: SafetyAssessment["recommendation"] = "Balanced Fit";
  if (safetyFit >= 88) {
    recommendation = "Better Safety Fit";
  } else if (priority === "Time Priority") {
    recommendation = "Time Priority Fit";
  } else if (safetyFit < 65 || incidentCount > 1) {
    recommendation = "Caution Advised";
  }

  return {
    routeId: route.id,
    safetyFit,
    confidence,
    factors: {
      emergencyAccess: emergencyFactor,
      medicalAccess: medicalFactor,
      policeAccess: policeFactor,
      fuelAccess: fuelFactor,
      pharmacyAccess: pharmacyFactor,
      foodRestAccess: foodRestFactor,
      weather: weatherFactor,
      incidents: incidentFactor
    },
    warnings,
    unavailableFactors,
    explanation,
    recommendation,
    profileApplied: profile,
    priorityApplied: priority
  };
}
