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

export type POI = {
  id: string;
  name: string;
  type: "petrol" | "food" | "hotel" | "rest" | "hospital" | "emergency";
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
  waypoints: [number, number][]; // [longitude, latitude] for Mapbox GeoJSON
  pois: POI[];
};

// Generates 3 to 4 distinct route intelligence profiles between any origin and destination
export function generateRoutes(originId: string, destId: string, travelMode = "Car"): RouteOption[] {
  const origin = CITIES[originId] || CITIES["chennai"];
  const dest = CITIES[destId] || CITIES["bangalore"];

  // Calculate straight line distance (Haversine approx)
  const dLat = Math.abs(origin.latitude - dest.latitude);
  const dLon = Math.abs(origin.longitude - dest.longitude);
  const rawDistKm = Math.round(Math.sqrt(dLat * dLat + dLon * dLon) * 111);
  const baseKm = Math.max(120, Math.round(rawDistKm * 1.25)); // Real road curvature factor

  // Speed factor based on travel mode
  const speed = travelMode === "Bike" ? 50 : travelMode === "Bus" ? 45 : travelMode === "Walk" ? 5 : 70; // km/h
  const baseMinutes = Math.round((baseKm / speed) * 60);

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  };

  // Seed for consistent pseudo-random values per pair
  const seed = (origin.name.charCodeAt(0) * 7 + dest.name.charCodeAt(0) * 13) % 100;

  // Intermediate midpoints for curved GeoJSON routes
  const midLon = (origin.longitude + dest.longitude) / 2;
  const midLat = (origin.latitude + dest.latitude) / 2;

  // Route A: Safety Corridor (National Highway)
  const routeA: RouteOption = {
    id: "A",
    name: "Safety Corridor",
    subtitle: "NH Main Highway • Fully Lit & Patrolled",
    distanceKm: baseKm + 15,
    distance: `${baseKm + 15} km`,
    durationMinutes: baseMinutes + 10,
    time: formatHours(baseMinutes + 10),
    safetyScore: Math.min(96, 91 + (seed % 6)),
    trafficScore: "Low",
    roadScore: "Good",
    nightSafety: "High",
    weatherRisk: "Low",
    emergencyAccessScore: 94,
    recommendation: "HIGHLY RECOMMENDED",
    restStops: 8 + (seed % 3),
    fuelStops: 12 + (seed % 4),
    foodStops: 16,
    hotels: 6,
    notes: "Main expressway corridor. Dedicated emergency SOS booths, well-lit fuel plazas, active highway patrol.",
    type: "safe",
    waypoints: [
      [origin.longitude, origin.latitude],
      [origin.longitude + (dest.longitude - origin.longitude) * 0.3, origin.latitude + (dest.latitude - origin.latitude) * 0.3 + 0.15],
      [midLon + 0.1, midLat + 0.1],
      [origin.longitude + (dest.longitude - origin.longitude) * 0.7, origin.latitude + (dest.latitude - origin.latitude) * 0.7 + 0.08],
      [dest.longitude, dest.latitude]
    ],
    pois: [
      { id: "p1", name: "HP 24/7 Mega Fuel Station", type: "petrol", latitude: midLat + 0.08, longitude: midLon + 0.08, distanceAhead: "45 km ahead", status: "Open • Clean Restrooms" },
      { id: "p2", name: "Safe Haven Highway Plaza", type: "rest", latitude: midLat + 0.12, longitude: midLon + 0.12, distanceAhead: "78 km ahead", status: "CCTV Monitored • Food Court" },
      { id: "p3", name: "Apollo Emergency First Response Node", type: "hospital", latitude: midLat + 0.05, longitude: midLon + 0.06, distanceAhead: "30 km ahead", status: "24/7 Emergency Care" }
    ]
  };

  // Route B: Highway Express Alternative
  const routeB: RouteOption = {
    id: "B",
    name: "Highway Alternative",
    subtitle: "Fastest Transit • Direct Toll Bypass",
    distanceKm: baseKm - 10,
    distance: `${baseKm - 10} km`,
    durationMinutes: Math.max(30, baseMinutes - 20),
    time: formatHours(Math.max(30, baseMinutes - 20)),
    safetyScore: Math.min(88, 83 + (seed % 6)),
    trafficScore: "Medium",
    roadScore: "Good",
    nightSafety: "Medium",
    weatherRisk: "Low",
    emergencyAccessScore: 86,
    recommendation: "RECOMMENDED",
    restStops: 5,
    fuelStops: 8,
    foodStops: 9,
    hotels: 4,
    notes: "Direct high-speed corridor. Minimal stops, moderate traffic around interchange points.",
    type: "fast",
    waypoints: [
      [origin.longitude, origin.latitude],
      [midLon, midLat],
      [dest.longitude, dest.latitude]
    ],
    pois: [
      { id: "p4", name: "IndianOil Express Fuel & EV Charge", type: "petrol", latitude: midLat, longitude: midLon, distanceAhead: "62 km ahead", status: "Open • EV Fast Charging" },
      { id: "p5", name: "Highway Grand Comfort Inn", type: "hotel", latitude: midLat - 0.05, longitude: midLon - 0.05, distanceAhead: "95 km ahead", status: "Verified Safe Stay" }
    ]
  };

  // Route C: Balanced Scenic Route
  const routeC: RouteOption = {
    id: "C",
    name: "Balanced Route",
    subtitle: "Scenic District Link • Moderate Speed",
    distanceKm: baseKm + 5,
    distance: `${baseKm + 5} km`,
    durationMinutes: baseMinutes + 25,
    time: formatHours(baseMinutes + 25),
    safetyScore: Math.min(79, 72 + (seed % 7)),
    trafficScore: "Medium",
    roadScore: "Moderate",
    nightSafety: "Medium",
    weatherRisk: "Medium",
    emergencyAccessScore: 78,
    recommendation: "RECOMMENDED",
    restStops: 4,
    fuelStops: 5,
    foodStops: 7,
    hotels: 2,
    notes: "Passes through intermediate townships. Good daytime visibility, reduced lighting after 21:00.",
    type: "balanced",
    waypoints: [
      [origin.longitude, origin.latitude],
      [origin.longitude + (dest.longitude - origin.longitude) * 0.35, origin.latitude + (dest.latitude - origin.latitude) * 0.35 - 0.15],
      [midLon - 0.12, midLat - 0.12],
      [origin.longitude + (dest.longitude - origin.longitude) * 0.75, origin.latitude + (dest.latitude - origin.latitude) * 0.75 - 0.08],
      [dest.longitude, dest.latitude]
    ],
    pois: [
      { id: "p6", name: "Reliance Green Fuel & Rest", type: "petrol", latitude: midLat - 0.1, longitude: midLon - 0.1, distanceAhead: "50 km ahead", status: "Open • Snack Mart" },
      { id: "p7", name: "District Community Clinic", type: "hospital", latitude: midLat - 0.15, longitude: midLon - 0.15, distanceAhead: "80 km ahead", status: "Government Medical Node" }
    ]
  };

  // Route D: Caution / Alternate Route
  const routeD: RouteOption = {
    id: "D",
    name: "Caution / Alternate Route",
    subtitle: "Rural Connecting Roads • Night Travel Caution",
    distanceKm: baseKm - 25,
    distance: `${baseKm - 25} km`,
    durationMinutes: baseMinutes + 45,
    time: formatHours(baseMinutes + 45),
    safetyScore: Math.max(50, 58 - (seed % 8)),
    trafficScore: "High",
    roadScore: "Poor",
    nightSafety: "Low",
    weatherRisk: "High",
    emergencyAccessScore: 55,
    recommendation: "USE CAUTION",
    restStops: 2,
    fuelStops: 3,
    foodStops: 3,
    hotels: 1,
    notes: "Shortest mileage but contains single-lane segments and limited cellular reception. Not advised for night transit.",
    type: "risky",
    waypoints: [
      [origin.longitude, origin.latitude],
      [origin.longitude + (dest.longitude - origin.longitude) * 0.25, origin.latitude + (dest.latitude - origin.latitude) * 0.25 - 0.25],
      [midLon - 0.25, midLat - 0.2],
      [origin.longitude + (dest.longitude - origin.longitude) * 0.8, origin.latitude + (dest.latitude - origin.latitude) * 0.8 - 0.15],
      [dest.longitude, dest.latitude]
    ],
    pois: [
      { id: "p8", name: "Bharat Petroleum Rural Outlet", type: "petrol", latitude: midLat - 0.22, longitude: midLon - 0.22, distanceAhead: "38 km ahead", status: "Closes at 20:00" }
    ]
  };

  return [routeA, routeB, routeC, routeD];
}
