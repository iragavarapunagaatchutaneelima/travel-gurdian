import { NavigationPosition, RouteProgress, ManeuverType, ManeuverInfo } from "../types/navigation";
import { formatDistanceMeters, formatDurationSeconds } from "./googleRoutes";

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates great-circle distance between two [latitude, longitude] points in meters using the Haversine formula.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates perpendicular distance from point P to line segment AB,
 * clamping to segment bounds.
 * All coordinates in [longitude, latitude] format (standard for GeoJSON).
 */
export function pointToSegmentDistanceMeters(
  point: [number, number], // [lng, lat]
  segStart: [number, number], // [lng, lat]
  segEnd: [number, number] // [lng, lat]
): { distanceMeters: number; projection: [number, number]; t: number } {
  const pLng = point[0];
  const pLat = point[1];
  const aLng = segStart[0];
  const aLat = segStart[1];
  const bLng = segEnd[0];
  const bLat = segEnd[1];

  const dx = bLng - aLng;
  const dy = bLat - aLat;

  if (dx === 0 && dy === 0) {
    const dist = haversineDistanceMeters(pLat, pLng, aLat, aLng);
    return { distanceMeters: dist, projection: segStart, t: 0 };
  }

  // Linear projection parameter in degree space
  let t = ((pLng - aLng) * dx + (pLat - aLat) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));

  const projLng = aLng + t * dx;
  const projLat = aLat + t * dy;
  const dist = haversineDistanceMeters(pLat, pLng, projLat, projLng);

  return { distanceMeters: dist, projection: [projLng, projLat], t };
}

/**
 * Finds the nearest point on the route polyline to the current GPS position.
 * Waypoints are in [lng, lat] GeoJSON format.
 */
export function findNearestPointOnRoute(
  gpsLat: number,
  gpsLng: number,
  waypoints: [number, number][]
): {
  distanceToRouteMeters: number;
  nearestSegmentIndex: number;
  projectionPoint: [number, number];
  distanceAlongRouteMeters: number;
} {
  if (!waypoints || waypoints.length < 2) {
    return {
      distanceToRouteMeters: 0,
      nearestSegmentIndex: 0,
      projectionPoint: waypoints[0] || [gpsLng, gpsLat],
      distanceAlongRouteMeters: 0
    };
  }

  let minDistance = Infinity;
  let bestSegIdx = 0;
  let bestProj: [number, number] = waypoints[0];
  let distanceBeforeBestSeg = 0;
  let cumulativeDist = 0;
  let bestT = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    const segLength = haversineDistanceMeters(start[1], start[0], end[1], end[0]);

    const result = pointToSegmentDistanceMeters([gpsLng, gpsLat], start, end);
    if (result.distanceMeters < minDistance) {
      minDistance = result.distanceMeters;
      bestSegIdx = i;
      bestProj = result.projection;
      bestT = result.t;
      distanceBeforeBestSeg = cumulativeDist;
    }

    cumulativeDist += segLength;
  }

  const startPt = waypoints[bestSegIdx];
  const segLength = haversineDistanceMeters(startPt[1], startPt[0], waypoints[bestSegIdx + 1][1], waypoints[bestSegIdx + 1][0]);
  const distanceAlongRouteMeters = distanceBeforeBestSeg + segLength * bestT;

  return {
    distanceToRouteMeters: minDistance,
    nearestSegmentIndex: bestSegIdx,
    projectionPoint: bestProj,
    distanceAlongRouteMeters
  };
}

/**
 * Computes live route progress, remaining distance, ETA, and progress percentage.
 */
export function calculateRouteProgress(
  gpsPos: NavigationPosition,
  waypoints: [number, number][],
  totalRouteDistanceMeters: number,
  totalRouteDurationSeconds: number
): RouteProgress {
  const nearest = findNearestPointOnRoute(gpsPos.latitude, gpsPos.longitude, waypoints);

  const distanceTraveledMeters = Math.min(totalRouteDistanceMeters, Math.max(0, nearest.distanceAlongRouteMeters));
  const distanceRemainingMeters = Math.max(0, totalRouteDistanceMeters - distanceTraveledMeters);

  const progressPercent = totalRouteDistanceMeters > 0
    ? Math.min(100, Math.max(0, Math.round((distanceTraveledMeters / totalRouteDistanceMeters) * 100)))
    : 0;

  // Compute remaining duration scaled by progress
  let durationRemainingSeconds = 0;
  if (totalRouteDistanceMeters > 0) {
    const ratioRemaining = distanceRemainingMeters / totalRouteDistanceMeters;
    durationRemainingSeconds = Math.round(totalRouteDurationSeconds * ratioRemaining);
  }

  // If valid ground speed is available and > 3 m/s (~11 km/h), compute refined dynamic ETA
  if (gpsPos.speed && gpsPos.speed > 3) {
    const dynamicSeconds = Math.round(distanceRemainingMeters / gpsPos.speed);
    // Blend 50/50 with route base duration for stability against red lights
    durationRemainingSeconds = Math.round((durationRemainingSeconds + dynamicSeconds) / 2);
  }

  const now = Date.now();
  const etaTimestamp = now + durationRemainingSeconds * 1000;
  const etaDate = new Date(etaTimestamp);
  const etaHours = etaDate.getHours().toString().padStart(2, "0");
  const etaMins = etaDate.getMinutes().toString().padStart(2, "0");
  const etaString = `${etaHours}:${etaMins}`;

  return {
    distanceTraveledMeters,
    distanceRemainingMeters,
    durationRemainingSeconds,
    progressPercent,
    etaTimestamp,
    etaString,
    distanceToRouteMeters: nearest.distanceToRouteMeters,
    nearestSegmentIndex: nearest.nearestSegmentIndex
  };
}

/**
 * Deterministic, noise-resistant off-route calculation.
 * Accounts for GPS accuracy circle so low-accuracy fixes do not spuriously trigger off-route.
 */
export function isOffRoute(
  distanceToRouteMeters: number,
  accuracyMeters: number,
  baseThresholdMeters: number = 80,
  accuracyMultiplier: number = 1.4
): boolean {
  // Effective threshold expands with low GPS accuracy up to a ceiling of 250m
  const effectiveThreshold = Math.max(
    baseThresholdMeters,
    Math.min(250, accuracyMeters * accuracyMultiplier)
  );
  return distanceToRouteMeters > effectiveThreshold;
}

/**
 * Checks if user has arrived at the destination.
 * Accounts for arrival radius (base 50m) and GPS accuracy.
 */
export function isArrived(
  gpsLat: number,
  gpsLng: number,
  destLat: number,
  destLng: number,
  accuracyMeters: number,
  baseArrivalRadiusMeters: number = 50,
  accuracyMultiplier: number = 1.2
): boolean {
  const dist = haversineDistanceMeters(gpsLat, gpsLng, destLat, destLng);
  const effectiveRadius = Math.max(
    baseArrivalRadiusMeters,
    Math.min(150, accuracyMeters * accuracyMultiplier)
  );
  return dist <= effectiveRadius;
}

/**
 * Maps Google Maps maneuver string and step instruction text to a clean ManeuverType.
 */
export function parseManeuverIcon(maneuver: string = "", instruction: string = ""): ManeuverType {
  const m = maneuver.toLowerCase();
  const text = instruction.toLowerCase();

  if (m.includes("turn-sharp-left") || text.includes("sharp left")) return "turn-sharp-left";
  if (m.includes("turn-sharp-right") || text.includes("sharp right")) return "turn-sharp-right";
  if (m.includes("fork-left") || text.includes("fork left") || text.includes("take the left fork")) return "fork-left";
  if (m.includes("fork-right") || text.includes("fork right") || text.includes("take the fork") || text.includes("take the right fork")) return "fork-right";
  if (m.includes("ramp-left") || text.includes("take the ramp on the left") || text.includes("ramp left")) return "ramp-left";
  if (m.includes("ramp-right") || text.includes("take the ramp on the right") || text.includes("ramp right") || text.includes("ramp")) return "ramp-right";
  if (m.includes("turn-slight-left") || text.includes("slight left") || text.includes("keep left")) return "turn-slight-left";
  if (m.includes("turn-slight-right") || text.includes("slight right") || text.includes("keep right")) return "turn-slight-right";
  if (m.includes("turn-left") || text.includes("turn left")) return "turn-left";
  if (m.includes("turn-right") || text.includes("turn right")) return "turn-right";
  if (m.includes("uturn-left") || text.includes("u-turn left")) return "uturn-left";
  if (m.includes("uturn-right") || text.includes("u-turn") || text.includes("uturn")) return "uturn-right";
  if (m.includes("merge") || text.includes("merge")) return "merge";
  if (m.includes("roundabout") || text.includes("roundabout") || text.includes("rotary")) return "roundabout";
  if (m.includes("straight") || text.includes("continue straight") || text.includes("head")) return "straight";
  if (text.includes("destination will be") || text.includes("arrive")) return "arrive";

  return "generic";
}

/**
 * Evaluates current and next step maneuvers based on GPS progress.
 */
export function getCurrentAndNextManeuver(
  steps: any[],
  distanceTraveledMeters: number
): { currentManeuver: ManeuverInfo | null; nextManeuver: ManeuverInfo | null } {
  if (!steps || steps.length === 0) {
    return { currentManeuver: null, nextManeuver: null };
  }

  let cumulativeStepDist = 0;
  let activeStepIdx = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    // Approximate step distance in meters
    let stepMeters = 0;
    if (step.distance) {
      if (typeof step.distance === "string") {
        if (step.distance.includes("km")) {
          stepMeters = parseFloat(step.distance) * 1000;
        } else {
          stepMeters = parseFloat(step.distance);
        }
      } else if (typeof step.distance.value === "number") {
        stepMeters = step.distance.value;
      }
    }

    cumulativeStepDist += stepMeters;

    if (distanceTraveledMeters < cumulativeStepDist || i === steps.length - 1) {
      activeStepIdx = i;
      break;
    }
  }

  const activeStep = steps[activeStepIdx];
  const nextStep = steps[activeStepIdx + 1] || null;

  const currentDistRemaining = Math.max(0, cumulativeStepDist - distanceTraveledMeters);

  const currentManeuver: ManeuverInfo = {
    instruction: activeStep?.instruction || "Continue on route",
    distanceText: formatDistanceMeters(currentDistRemaining),
    distanceMeters: currentDistRemaining,
    durationText: activeStep?.duration || "",
    maneuverType: parseManeuverIcon(activeStep?.maneuver, activeStep?.instruction),
    stepIndex: activeStepIdx + 1,
    totalSteps: steps.length,
    endLocation: activeStep?.endLocation
  };

  const nextManeuver: ManeuverInfo | null = nextStep
    ? {
        instruction: nextStep.instruction || "Follow route",
        distanceText: nextStep.distance || "",
        distanceMeters: 0,
        durationText: nextStep.duration || "",
        maneuverType: parseManeuverIcon(nextStep.maneuver, nextStep.instruction),
        stepIndex: activeStepIdx + 2,
        totalSteps: steps.length,
        endLocation: nextStep.endLocation
      }
    : null;

  return { currentManeuver, nextManeuver };
}

/**
 * Formats speed into human-readable km/h string or returns fallback.
 */
export function formatSpeedKmh(speedMps: number | null): string {
  if (speedMps === null || speedMps === undefined || isNaN(speedMps) || speedMps < 0) {
    return "Speed unavailable";
  }
  const kmh = Math.round(speedMps * 3.6);
  return `${kmh} km/h`;
}

/**
 * Formats heading into cardinal direction and degree string.
 */
export function formatHeading(headingDegrees: number | null): string {
  if (headingDegrees === null || headingDegrees === undefined || isNaN(headingDegrees)) {
    return "Heading unavailable";
  }

  const normalized = ((headingDegrees % 360) + 360) % 360;
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(normalized / 45) % 8;
  return `${directions[index]} (${Math.round(normalized)}°)`;
}
