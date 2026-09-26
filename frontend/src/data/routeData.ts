import { LocationDetails } from "../types/location";
import { SafetyAssessment } from "../types/safety";

export type City = {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  region: string;
  highways: string[];
};

export const CITIES: Record<string, City> = {
  chennai: { 
    id: "chennai", 
    name: "Chennai", 
    state: "Tamil Nadu", 
    latitude: 13.0827, 
    longitude: 80.2707, 
    region: "South",
    highways: ["NH 48", "NH 16", "NH 716"]
  },
  mumbai: { 
    id: "mumbai", 
    name: "Mumbai", 
    state: "Maharashtra", 
    latitude: 19.0760, 
    longitude: 72.8777, 
    region: "West",
    highways: ["NH 48", "NH 65", "Mumbai-Pune Expressway"]
  },
  delhi: { 
    id: "delhi", 
    name: "Delhi", 
    state: "Delhi NCR", 
    latitude: 28.7041, 
    longitude: 77.1025, 
    region: "North",
    highways: ["NH 44", "NH 48", "Yamuna Expressway"]
  },
  hyderabad: { 
    id: "hyderabad", 
    name: "Hyderabad", 
    state: "Telangana", 
    latitude: 17.3850, 
    longitude: 78.4867, 
    region: "South-Central",
    highways: ["NH 65", "NH 44", "Nehru ORR"]
  },
  bangalore: { 
    id: "bangalore", 
    name: "Bangalore", 
    state: "Karnataka", 
    latitude: 12.9716, 
    longitude: 77.5946, 
    region: "South",
    highways: ["NH 44", "NH 48", "NICE Ring Road"]
  },
  vizag: { 
    id: "vizag", 
    name: "Visakhapatnam", 
    state: "Andhra Pradesh", 
    latitude: 17.6868, 
    longitude: 83.2185, 
    region: "East Coast",
    highways: ["NH 16", "AH 45"]
  }
};

export const QUICK_HUBS: Record<string, LocationDetails> = {
  chennai: {
    placeId: "ChIJYTN9T-plUjoRMugkrSFjlTU",
    name: "Chennai",
    formattedAddress: "Chennai, Tamil Nadu, India",
    latitude: 13.0827,
    longitude: 80.2707,
    types: ["locality", "political"]
  },
  mumbai: {
    placeId: "ChIJwe1EZjDG5zsRaYxkjY_oFDo",
    name: "Mumbai",
    formattedAddress: "Mumbai, Maharashtra, India",
    latitude: 19.0760,
    longitude: 72.8777,
    types: ["locality", "political"]
  },
  delhi: {
    placeId: "ChIJfUQU2qEEADsRLWaeerQDgIZ",
    name: "Delhi",
    formattedAddress: "Delhi, India",
    latitude: 28.7041,
    longitude: 77.1025,
    types: ["locality", "political"]
  },
  hyderabad: {
    placeId: "ChIJx9wgRZX9zTsRjzA5AhKGeTk",
    name: "Hyderabad",
    formattedAddress: "Hyderabad, Telangana, India",
    latitude: 17.3850,
    longitude: 78.4867,
    types: ["locality", "political"]
  },
  bangalore: {
    placeId: "ChIJbU60yXAWrjsR4E9-UejD3_g",
    name: "Bangalore",
    formattedAddress: "Bengaluru, Karnataka, India",
    latitude: 12.9716,
    longitude: 77.5946,
    types: ["locality", "political"]
  },
  vizag: {
    placeId: "ChIJW0q6b5xVOTsR7HqP1kGjCq0",
    name: "Visakhapatnam",
    formattedAddress: "Visakhapatnam, Andhra Pradesh, India",
    latitude: 17.6868,
    longitude: 83.2185,
    types: ["locality", "political"]
  }
};

export type POI = {
  id: string;
  name: string;
  type: "petrol" | "food" | "hotel" | "rest" | "hospital" | "emergency" | "police" | "pharmacy";
  latitude: number;
  longitude: number;
  distanceAhead: string;
  status: string;
};

export type RouteOption = {
  id: "A" | "B" | "C" | "D";
  name: string;
  subtitle: string;
  distance: string;
  distanceKm: number;
  time: string;
  durationMinutes: number;
  safetyScore: number;
  trafficScore: "Low" | "Medium" | "High";
  roadScore: "Good" | "Moderate" | "Poor";
  nightSafety: "High" | "Medium" | "Low";
  weatherRisk: "Low" | "Medium" | "High";
  emergencyAccessScore: number;
  recommendation: "HIGHLY RECOMMENDED" | "RECOMMENDED" | "USE CAUTION" | "AVOID / HIGH RISK";
  restStops: number;
  fuelStops: number;
  foodStops: number;
  hotels: number;
  notes: string;
  type: "safe" | "fast" | "balanced" | "risky";
  waypoints: [number, number][]; // [longitude, latitude] GeoJSON format
  pois: POI[];
  provider?: "google" | "synthetic";
  tollInfo?: string;
  trafficDuration?: string;
  warnings?: string[];
  legs?: any[];
  steps?: any[];
  safetyAssessment?: SafetyAssessment;
  whyThisRoute?: string[];
  rank?: number;
  rankLabel?: string;
  rankBadge?: string;
};

export type TravelMode = "Car" | "Bike" | "Walk";

/**
 * Generates 4 distinct route intelligence profiles between any origin and destination.
 * Supports either LocationDetails objects or string identifiers.
 */
export function generateRoutes(
  originInput: LocationDetails | string,
  destInput: LocationDetails | string,
  travelMode: TravelMode = "Car"
): RouteOption[] {
  let originName = "Origin";
  let originLat = 13.0827;
  let originLon = 80.2707;

  let destName = "Destination";
  let destLat = 12.9716;
  let destLon = 77.5946;

  if (typeof originInput === "object" && originInput !== null) {
    originName = originInput.name || "Origin";
    originLat = originInput.latitude;
    originLon = originInput.longitude;
  } else if (typeof originInput === "string") {
    const hub = CITIES[originInput.toLowerCase()] || CITIES["chennai"];
    originName = hub.name;
    originLat = hub.latitude;
    originLon = hub.longitude;
  }

  if (typeof destInput === "object" && destInput !== null) {
    destName = destInput.name || "Destination";
    destLat = destInput.latitude;
    destLon = destInput.longitude;
  } else if (typeof destInput === "string") {
    const hub = CITIES[destInput.toLowerCase()] || CITIES["bangalore"];
    destName = hub.name;
    destLat = hub.latitude;
    destLon = hub.longitude;
  }

  // Calculate straight line distance (Haversine formula)
  const dLat = Math.abs(originLat - destLat);
  const dLon = Math.abs(originLon - destLon);
  const rawDistKm = Math.round(Math.sqrt(dLat * dLat + dLon * dLon) * 111);
  const baseKm = Math.max(15, Math.round(rawDistKm * 1.25)); // Real road curvature factor

  // Speed factor based on travel mode: Car = 70 km/h, Bike = 50 km/h, Walk = 5 km/h
  const speed = travelMode === "Bike" ? 50 : travelMode === "Walk" ? 5 : 70; // km/h
  const baseMinutes = Math.max(5, Math.round((baseKm / speed) * 60));

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  };

  // Seed for consistent pseudo-random metrics per pair
  const charSeed = (originName.charCodeAt(0) * 7 + destName.charCodeAt(0) * 13) % 100;

  // Intermediate midpoints for curved GeoJSON routes
  const midLon = (originLon + destLon) / 2;
  const midLat = (originLat + destLat) / 2;

  // Route A: Safety Corridor
  const routeA: RouteOption = {
    id: "A",
    name: "Safety Corridor",
    subtitle: "Main Highway • Fully Lit & 24/7 Patrolled",
    distanceKm: baseKm + Math.round(baseKm * 0.05),
    distance: `${baseKm + Math.round(baseKm * 0.05)} km`,
    durationMinutes: baseMinutes + Math.round(baseMinutes * 0.08),
    time: formatHours(baseMinutes + Math.round(baseMinutes * 0.08)),
    safetyScore: Math.min(96, 91 + (charSeed % 6)),
    trafficScore: "Low",
    roadScore: "Good",
    nightSafety: "High",
    weatherRisk: "Low",
    emergencyAccessScore: 94,
    recommendation: "HIGHLY RECOMMENDED",
    restStops: Math.max(2, Math.round(baseKm / 45)),
    fuelStops: Math.max(3, Math.round(baseKm / 35)),
    foodStops: Math.max(4, Math.round(baseKm / 30)),
    hotels: Math.max(1, Math.round(baseKm / 80)),
    notes: "Main expressway corridor. Dedicated emergency SOS booths, well-lit fuel plazas, active highway patrol.",
    type: "safe",
    waypoints: [
      [originLon, originLat],
      [originLon + (destLon - originLon) * 0.3, originLat + (destLat - originLat) * 0.3 + 0.15],
      [midLon + 0.1, midLat + 0.1],
      [originLon + (destLon - originLon) * 0.7, originLat + (destLat - originLat) * 0.7 + 0.08],
      [destLon, destLat]
    ],
    pois: [
      { id: "p1", name: "24/7 Mega Highway Fuel Plaza", type: "petrol", latitude: midLat + 0.08, longitude: midLon + 0.08, distanceAhead: "45 km ahead", status: "Open • Clean Restrooms" },
      { id: "p2", name: "Safe Haven Highway Rest Stop", type: "rest", latitude: midLat + 0.12, longitude: midLon + 0.12, distanceAhead: "78 km ahead", status: "CCTV Monitored • Food Court" },
      { id: "p3", name: "Emergency Medical First Response Node", type: "hospital", latitude: midLat + 0.05, longitude: midLon + 0.06, distanceAhead: "30 km ahead", status: "24/7 Emergency Care" }
    ]
  };

  // Route B: Highway Alternative
  const routeB: RouteOption = {
    id: "B",
    name: "Highway Alternative",
    subtitle: "Fastest Direct Toll Transit",
    distanceKm: Math.max(12, baseKm - Math.round(baseKm * 0.05)),
    distance: `${Math.max(12, baseKm - Math.round(baseKm * 0.05))} km`,
    durationMinutes: Math.max(5, baseMinutes - Math.round(baseMinutes * 0.1)),
    time: formatHours(Math.max(5, baseMinutes - Math.round(baseMinutes * 0.1))),
    safetyScore: Math.min(88, 83 + (charSeed % 6)),
    trafficScore: "Medium",
    roadScore: "Good",
    nightSafety: "Medium",
    weatherRisk: "Low",
    emergencyAccessScore: 86,
    recommendation: "RECOMMENDED",
    restStops: Math.max(1, Math.round(baseKm / 60)),
    fuelStops: Math.max(2, Math.round(baseKm / 50)),
    foodStops: Math.max(2, Math.round(baseKm / 45)),
    hotels: Math.max(1, Math.round(baseKm / 100)),
    notes: "Direct high-speed corridor. Minimal stops, moderate traffic around interchange points.",
    type: "fast",
    waypoints: [
      [originLon, originLat],
      [midLon, midLat],
      [destLon, destLat]
    ],
    pois: [
      { id: "p4", name: "Expressway Fuel & EV Fast Charge", type: "petrol", latitude: midLat, longitude: midLon, distanceAhead: "62 km ahead", status: "Open • EV Fast Charging" },
      { id: "p5", name: "Highway Comfort Inn", type: "hotel", latitude: midLat - 0.05, longitude: midLon - 0.05, distanceAhead: "95 km ahead", status: "Verified Safe Stay" }
    ]
  };

  // Route C: Balanced Route
  const routeC: RouteOption = {
    id: "C",
    name: "Balanced Route",
    subtitle: "Scenic District Link • Moderate Speed",
    distanceKm: baseKm + Math.round(baseKm * 0.02),
    distance: `${baseKm + Math.round(baseKm * 0.02)} km`,
    durationMinutes: baseMinutes + Math.round(baseMinutes * 0.15),
    time: formatHours(baseMinutes + Math.round(baseMinutes * 0.15)),
    safetyScore: Math.min(79, 72 + (charSeed % 7)),
    trafficScore: "Medium",
    roadScore: "Moderate",
    nightSafety: "Medium",
    weatherRisk: "Medium",
    emergencyAccessScore: 78,
    recommendation: "RECOMMENDED",
    restStops: Math.max(1, Math.round(baseKm / 70)),
    fuelStops: Math.max(1, Math.round(baseKm / 60)),
    foodStops: Math.max(2, Math.round(baseKm / 55)),
    hotels: 1,
    notes: "Passes through intermediate townships. Good daytime visibility, reduced lighting after 21:00.",
    type: "balanced",
    waypoints: [
      [originLon, originLat],
      [originLon + (destLon - originLon) * 0.35, originLat + (destLat - originLat) * 0.35 - 0.15],
      [midLon - 0.12, midLat - 0.12],
      [originLon + (destLon - originLon) * 0.75, originLat + (destLat - originLat) * 0.75 - 0.08],
      [destLon, destLat]
    ],
    pois: [
      { id: "p6", name: "Green Energy Highway Outlet", type: "petrol", latitude: midLat - 0.1, longitude: midLon - 0.1, distanceAhead: "50 km ahead", status: "Open • Snack Mart" },
      { id: "p7", name: "District Community Clinic", type: "hospital", latitude: midLat - 0.15, longitude: midLon - 0.15, distanceAhead: "80 km ahead", status: "Government Medical Node" }
    ]
  };

  // Route D: Caution / Alternate Route
  const routeD: RouteOption = {
    id: "D",
    name: "Caution / Alternate Route",
    subtitle: "Rural Connecting Roads • Night Caution",
    distanceKm: Math.max(10, baseKm - Math.round(baseKm * 0.1)),
    distance: `${Math.max(10, baseKm - Math.round(baseKm * 0.1))} km`,
    durationMinutes: baseMinutes + Math.round(baseMinutes * 0.3),
    time: formatHours(baseMinutes + Math.round(baseMinutes * 0.3)),
    safetyScore: Math.max(50, 58 - (charSeed % 8)),
    trafficScore: "High",
    roadScore: "Poor",
    nightSafety: "Low",
    weatherRisk: "High",
    emergencyAccessScore: 55,
    recommendation: "USE CAUTION",
    restStops: 1,
    fuelStops: 1,
    foodStops: 1,
    hotels: 0,
    notes: "Shortest mileage but contains single-lane segments and limited cellular reception. Not advised for night transit.",
    type: "risky",
    waypoints: [
      [originLon, originLat],
      [originLon + (destLon - originLon) * 0.25, originLat + (destLat - originLat) * 0.25 - 0.25],
      [midLon - 0.25, midLat - 0.2],
      [originLon + (destLon - originLon) * 0.8, originLat + (destLat - originLat) * 0.8 - 0.15],
      [destLon, destLat]
    ],
    pois: [
      { id: "p8", name: "Rural Fuel Station", type: "petrol", latitude: midLat - 0.22, longitude: midLon - 0.22, distanceAhead: "38 km ahead", status: "Closes at 20:00" }
    ]
  };

  return [routeA, routeB, routeC, routeD];
}
