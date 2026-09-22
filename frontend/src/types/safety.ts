import { POI, RouteOption, TravelMode } from "../data/routeData";

export type SafetyFactorStatus = "AVAILABLE" | "DATA_UNAVAILABLE" | "NOT_CONFIGURED" | "LIMITED";

export type SafetyRating = "Good" | "Moderate" | "Limited" | "Unavailable" | "Not Configured";

export interface SafetyFactor {
  name: string;
  category: "emergency" | "medical" | "police" | "fuel" | "pharmacy" | "rest" | "weather" | "incidents";
  status: SafetyFactorStatus;
  score: number; // 0 to 100
  rating: SafetyRating;
  details: string;
  count?: number;
  nearestDistanceKm?: number;
  samplePOIs?: POI[];
}

export type SafetyConfidence = "HIGH" | "MEDIUM" | "LOW" | "LIMITED";

export interface SafetyAssessment {
  routeId: string;
  safetyFit: number; // 0 to 100
  confidence: SafetyConfidence;
  factors: {
    emergencyAccess: SafetyFactor;
    medicalAccess: SafetyFactor;
    policeAccess: SafetyFactor;
    fuelAccess: SafetyFactor;
    pharmacyAccess: SafetyFactor;
    foodRestAccess: SafetyFactor;
    weather: SafetyFactor;
    incidents: SafetyFactor;
  };
  warnings: string[];
  unavailableFactors: string[];
  explanation: string[];
  recommendation: "Better Safety Fit" | "Balanced Fit" | "Time Priority Fit" | "Caution Advised";
  profileApplied: TravelerProfile;
  priorityApplied: RoutePriority;
}

export type TravelerProfile = "Solo" | "Family" | "Group" | "Solo Woman Traveller";

export type RoutePriority = "Maximum Safety" | "Balanced" | "Time Priority";

export type IncidentType = 
  | "Road blocked" 
  | "Accident" 
  | "Heavy traffic" 
  | "Flood / water" 
  | "Construction" 
  | "Hazard / Other"
  | "Other";

export interface IncidentReport {
  id: string;
  type: IncidentType;
  latitude: number;
  longitude: number;
  description: string;
  timestamp: number; // Date.now()
  status: "ACTIVE" | "EXPIRED" | "RESOLVED";
  source: "USER_REPORT";
  routeCorridor?: string;
  corridorName?: string;
}
