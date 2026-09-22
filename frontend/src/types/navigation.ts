import { RouteOption, TravelMode } from "../data/routeData";
import { TravelerProfile, RoutePriority, SafetyAssessment } from "./safety";

export type NavigationStatus = 
  | "PLANNED" 
  | "READY" 
  | "ACTIVE" 
  | "OFF_ROUTE" 
  | "REROUTING_PENDING" 
  | "REROUTING" 
  | "ARRIVED" 
  | "ENDED";

export interface NavigationPosition {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  altitude: number | null; // meters
  heading: number | null; // 0 to 360 degrees
  speed: number | null; // meters per second
  timestamp: number;
}

export type ManeuverType = 
  | "turn-left"
  | "turn-right"
  | "turn-slight-left"
  | "turn-slight-right"
  | "turn-sharp-left"
  | "turn-sharp-right"
  | "uturn-left"
  | "uturn-right"
  | "straight"
  | "ramp-left"
  | "ramp-right"
  | "merge"
  | "fork-left"
  | "fork-right"
  | "roundabout"
  | "arrive"
  | "generic";

export interface ManeuverInfo {
  instruction: string;
  distanceText: string;
  distanceMeters: number;
  durationText: string;
  maneuverType: ManeuverType;
  stepIndex: number;
  totalSteps: number;
  endLocation?: [number, number]; // [lng, lat]
}

export interface RouteProgress {
  distanceTraveledMeters: number;
  distanceRemainingMeters: number;
  durationRemainingSeconds: number;
  progressPercent: number; // 0 to 100
  etaTimestamp: number;
  etaString: string;
  distanceToRouteMeters: number;
  nearestSegmentIndex: number;
}

export interface RerouteProposal {
  requestId: number;
  calculatedAt: number;
  newRoute: RouteOption;
  newSafetyAssessment: SafetyAssessment;
  reason: string;
  distanceDiffKm: number;
  durationDiffMinutes: number;
  explanation: string[];
}

export interface NavigationSession {
  sessionId: string;
  status: NavigationStatus;
  activeRoute: RouteOption;
  travelMode: TravelMode;
  profile: TravelerProfile;
  priority: RoutePriority;
  startTime: number;
  currentPosition: NavigationPosition | null;
  progress: RouteProgress | null;
  currentManeuver: ManeuverInfo | null;
  nextManeuver: ManeuverInfo | null;
  isFollowMode: boolean;
  rerouteProposal: RerouteProposal | null;
  offRouteCount: number;
  lastRerouteTimestamp: number;
  error: string | null;
}
