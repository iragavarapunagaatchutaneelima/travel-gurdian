import { NavigationStatus, RouteProgress, NavigationPosition } from "./navigation";
import { RouteOption } from "../data/routeData";
import { SafetyAssessment } from "./safety";
import { SafetyCheckInStatus, CheckInCycle, TrustedContact, LocationSnapshot } from "./safetyCheckIn";
import { OfflineCorridorPack } from "./offline";

export type ToolCategory = "READ_ONLY" | "USER_CONFIRMED_ACTION";

export type ReadOnlyToolName = 
  | "readNavigationState"
  | "readSafetyState"
  | "readCheckInState"
  | "getRouteSummary"
  | "getArrivalEstimate"
  | "findNearbyPlace"
  | "readOfflineMapState";

export type ActionProposalToolName = 
  | "proposeCheckInInterval"
  | "proposeAlternativeRoute"
  | "proposeCall112"
  | "proposeTrustedContactAlert";

export type AllowlistedToolName = ReadOnlyToolName | ActionProposalToolName;

export interface ToolDefinition {
  name: AllowlistedToolName;
  category: ToolCategory;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
}

export interface ToolCallRequest {
  id: string;
  name: AllowlistedToolName;
  arguments: Record<string, any>;
}

export interface ToolExecutionResult {
  toolCallId: string;
  toolName: AllowlistedToolName;
  category: ToolCategory;
  success: boolean;
  data?: any;
  error?: string;
  isSimulated?: boolean;
}

export interface ActionProposal {
  proposalId: string;
  toolName: ActionProposalToolName;
  title: string;
  description: string;
  payload: Record<string, any>;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "EXECUTED";
  createdAt: number;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  toolCalls?: ToolCallRequest[];
  toolResults?: ToolExecutionResult[];
  proposals?: ActionProposal[];
  mode?: "CONNECTED" | "DEMO" | "OFFLINE";
  model?: string;
}

export interface LiveTravelContext {
  navStatus?: NavigationStatus;
  activeRoute?: RouteOption | null;
  currentPosition?: NavigationPosition | null;
  progress?: RouteProgress | null;
  safetyScore?: number;
  safetyAssessment?: SafetyAssessment | null;
  checkInStatus?: SafetyCheckInStatus;
  activeCheckInCycle?: CheckInCycle | null;
  checkInSecondsRemaining?: number;
  trustedContactsCount?: number;
  locationSnapshot?: LocationSnapshot | null;
  originName?: string;
  destinationName?: string;
  travelMode?: string;
  activeOfflinePack?: OfflineCorridorPack | null;
  offlineMapTilesCount?: number;
}
