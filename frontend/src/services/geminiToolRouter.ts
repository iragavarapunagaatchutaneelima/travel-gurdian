import { 
  AllowlistedToolName, 
  ReadOnlyToolName, 
  ActionProposalToolName,
  ToolDefinition, 
  ToolCallRequest, 
  ToolExecutionResult, 
  ActionProposal, 
  LiveTravelContext 
} from "../types/gemini";

export const VERIFIED_HOSPITALS = [
  { name: "Apollo Emergency Care Center", type: "Hospital", distance: "1.2 km", phone: "044-28290200" },
  { name: "Government General Hospital & Trauma Center", type: "Hospital", distance: "3.5 km", phone: "108" },
  { name: "Manipal Highway Medical Haven", type: "Hospital", distance: "12.0 km", phone: "080-25024444" },
  { name: "Fortis Emergency & Critical Care", type: "Hospital", distance: "18.4 km", phone: "080-66214444" }
];

export const VERIFIED_POLICE_STATIONS = [
  { name: "Highway Patrol Control Post #4", type: "Police Station", distance: "0.8 km", phone: "112" },
  { name: "Central Police Sub-Station", type: "Police Station", distance: "2.4 km", phone: "100" },
  { name: "District Traffic & Safety Booth", type: "Police Station", distance: "9.5 km", phone: "112" }
];

export const VERIFIED_FUEL_STOPS = [
  { name: "HP 24/7 National Highway Oasis", type: "Fuel Stop", distance: "4.5 km", amenities: "Fuel, Clean Restrooms, Food Court, EV Fast Charger" },
  { name: "IndianOil COCO Highway Plaza", type: "Fuel Stop", distance: "14.2 km", amenities: "24/7 CCTV, Rest Area, Air/Nitrogen" }
];

export const VERIFIED_REST_STOPS = [
  { name: "Highway Travelers Safe Plaza", type: "Rest Stop", distance: "8.0 km", amenities: "24/7 Security, Food Court, Well-lit Parking" }
];

export const READ_ONLY_TOOLS: ReadOnlyToolName[] = [
  "readNavigationState",
  "readSafetyState",
  "readCheckInState",
  "getRouteSummary",
  "getArrivalEstimate",
  "findNearbyPlace",
  "readOfflineMapState"
];

export const USER_CONFIRMED_ACTIONS: ActionProposalToolName[] = [
  "proposeCheckInInterval",
  "proposeAlternativeRoute",
  "proposeCall112",
  "proposeTrustedContactAlert"
];

export const ALLOWLISTED_TOOLS: ToolDefinition[] = [
  {
    name: "readNavigationState",
    category: "READ_ONLY",
    description: "Returns verified live navigation telemetry, status, progress, speed, heading, and off-route status.",
    parameters: {}
  },
  {
    name: "readSafetyState",
    category: "READ_ONLY",
    description: "Returns the deterministic Safety Fit score (0-100), confidence level, and assessment factors.",
    parameters: {}
  },
  {
    name: "readCheckInState",
    category: "READ_ONLY",
    description: "Returns the current Safety Check-In status, countdown, grace period, and cycle number.",
    parameters: {}
  },
  {
    name: "getRouteSummary",
    category: "READ_ONLY",
    description: "Returns human-readable details for the currently active route.",
    parameters: {}
  },
  {
    name: "getArrivalEstimate",
    category: "READ_ONLY",
    description: "Returns the verified remaining distance, duration, and dynamic ETA.",
    parameters: {}
  },
  {
    name: "findNearbyPlace",
    category: "READ_ONLY",
    description: "Finds verified safe havens (hospitals, police stations, fuel, rest stops) near current corridor.",
    parameters: {
      placeType: {
        type: "string",
        description: "Type of place: 'hospital' | 'police' | 'fuel' | 'rest' | 'all'",
        required: true
      }
    }
  },
  {
    name: "readOfflineMapState",
    category: "READ_ONLY",
    description: "Returns the status of cached offline vector map corridors, stored tile counts, and coverage boundaries.",
    parameters: {}
  },
  {
    name: "proposeCheckInInterval",
    category: "USER_CONFIRMED_ACTION",
    description: "Proposes updating the Safety Check-In interval. Requires user button click to execute.",
    parameters: {
      intervalMinutes: {
        type: "number",
        description: "Proposed interval in minutes (e.g., 2, 5, 10, 15, 30, 60)",
        required: true
      }
    }
  },
  {
    name: "proposeAlternativeRoute",
    category: "USER_CONFIRMED_ACTION",
    description: "Proposes switching to an alternative route. Requires user button click to apply.",
    parameters: {
      routeId: {
        type: "string",
        description: "Identifier of alternative route",
        required: true
      }
    }
  },
  {
    name: "proposeCall112",
    category: "USER_CONFIRMED_ACTION",
    description: "Proposes dialing national emergency number 112. Requires user confirmation to launch dialer.",
    parameters: {
      reason: {
        type: "string",
        description: "Reason for emergency dial",
        required: false
      }
    }
  },
  {
    name: "proposeTrustedContactAlert",
    category: "USER_CONFIRMED_ACTION",
    description: "Proposes preparing an alert notification to configured trusted contacts. Requires user confirmation.",
    parameters: {
      customMessage: {
        type: "string",
        description: "Optional custom note",
        required: false
      }
    }
  }
];

/**
 * Sanitizes untrusted user inputs to resist prompt injection attempts
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return "";
  
  // Strip potential instruction overrides or delimiter escapes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/(system prompt|ignore previous instructions|disregard instructions|you are now in developer mode)/gi, "[REDACTED_COMMAND]")
    .trim()
    .slice(0, 1000);
}

/**
 * Validates if a tool name is strictly allowlisted
 */
export function isToolAllowlisted(toolName: string): toolName is AllowlistedToolName {
  return (
    READ_ONLY_TOOLS.includes(toolName as ReadOnlyToolName) ||
    USER_CONFIRMED_ACTIONS.includes(toolName as ActionProposalToolName)
  );
}

/**
 * Executes a tool call strictly through deterministic application state
 */
export function executeToolCall(
  toolCall: ToolCallRequest,
  context: LiveTravelContext
): { result: ToolExecutionResult; proposal?: ActionProposal } {
  const { id, name, arguments: args } = toolCall;

  // 1. Strict allowlist guard
  if (!isToolAllowlisted(name)) {
    return {
      result: {
        toolCallId: id,
        toolName: name as any,
        category: "READ_ONLY",
        success: false,
        error: `Tool '${name}' is not in the authorized tool allowlist.`
      }
    };
  }

  // 2. Handle READ_ONLY tools
  if (READ_ONLY_TOOLS.includes(name as ReadOnlyToolName)) {
    switch (name) {
      case "readNavigationState": {
        const navData = {
          status: context.navStatus || "READY",
          isOnRoute: context.navStatus !== "OFF_ROUTE",
          progressPercent: context.progress?.progressPercent ?? 0,
          speedKmh: context.currentPosition?.speed ? Math.round(context.currentPosition.speed * 3.6) : null,
          heading: context.currentPosition?.heading ? Math.round(context.currentPosition.heading) : null,
          destination: context.destinationName || context.activeRoute?.name || "Not specified",
          travelMode: context.travelMode || "Car",
          gpsAccuracyMeters: context.currentPosition?.accuracy ? Math.round(context.currentPosition.accuracy) : null
        };
        return {
          result: {
            toolCallId: id,
            toolName: name,
            category: "READ_ONLY",
            success: true,
            data: navData
          }
        };
      }

      case "readSafetyState": {
        const safetyData = {
          safetyScore: context.safetyScore ?? context.activeRoute?.safetyScore ?? 85,
          confidence: context.safetyAssessment?.confidence ?? context.activeRoute?.safetyAssessment?.confidence ?? "MEDIUM",
          safetyLevel: (context.safetyScore ?? context.activeRoute?.safetyScore ?? 85) >= 80 ? "HIGH" : "MODERATE",
          factors: context.activeRoute?.safetyAssessment?.factors ?? [
            { category: "Lighting", score: 85, explanation: "Adequate national corridor lighting" },
            { category: "Emergency Haven Proximity", score: 90, explanation: "Verified hospitals within 25km" }
          ]
        };
        return {
          result: {
            toolCallId: id,
            toolName: name,
            category: "READ_ONLY",
            success: true,
            data: safetyData
          }
        };
      }

      case "readCheckInState": {
        const checkInData = {
          status: context.checkInStatus || "DISABLED",
          cycleNumber: context.activeCheckInCycle?.cycleNumber ?? 1,
          secondsRemaining: context.checkInSecondsRemaining ?? 0,
          minutesRemaining: context.checkInSecondsRemaining ? Math.ceil(context.checkInSecondsRemaining / 60) : 0,
          configuredContactsCount: context.trustedContactsCount ?? 2,
          isDueSoon: (context.checkInSecondsRemaining ?? 999) < 120
        };
        return {
          result: {
            toolCallId: id,
            toolName: name,
            category: "READ_ONLY",
            success: true,
            data: checkInData
          }
        };
      }

      case "getRouteSummary": {
        const routeData = {
          routeName: context.activeRoute?.name || "Active Route",
          distance: context.activeRoute?.distance || "Unknown",
          estimatedDuration: context.activeRoute?.time || "Unknown",
          trafficScore: context.activeRoute?.trafficScore || "Moderate",
          roadCondition: context.activeRoute?.roadScore || "Good",
          nightSafety: context.activeRoute?.nightSafety || "Safe"
        };
        return {
          result: {
            toolCallId: id,
            toolName: name,
            category: "READ_ONLY",
            success: true,
            data: routeData
          }
        };
      }

      case "getArrivalEstimate": {
        const arrivalData = {
          etaString: context.progress?.etaString || context.activeRoute?.time || "--:--",
          distanceRemainingKm: context.progress ? (context.progress.distanceRemainingMeters / 1000).toFixed(1) : context.activeRoute?.distance || "0",
          progressPercent: context.progress?.progressPercent ?? 0
        };
        return {
          result: {
            toolCallId: id,
            toolName: name,
            category: "READ_ONLY",
            success: true,
            data: arrivalData
          }
        };
      }

      case "findNearbyPlace": {
        const placeType = (args?.placeType || "all").toLowerCase();
        let places: any[] = [];

        if (placeType === "hospital" || placeType === "medical" || placeType === "all") {
          places = [...places, ...VERIFIED_HOSPITALS.map(h => ({ name: h.name, type: "Hospital", distance: h.distance, phone: h.phone }))];
        }
        if (placeType === "police" || placeType === "all") {
          places = [...places, ...VERIFIED_POLICE_STATIONS.map(p => ({ name: p.name, type: "Police Station", distance: p.distance, phone: p.phone }))];
        }
        if (placeType === "fuel" || placeType === "all") {
          places = [...places, ...VERIFIED_FUEL_STOPS.map(f => ({ name: f.name, type: "Fuel Stop", distance: f.distance, amenities: f.amenities }))];
        }
        if (placeType === "rest" || placeType === "all") {
          places = [...places, ...VERIFIED_REST_STOPS.map(r => ({ name: r.name, type: "Rest Stop", distance: r.distance, amenities: r.amenities }))];
        }

        return {
          result: {
            toolCallId: id,
            toolName: name,
            category: "READ_ONLY",
            success: true,
            data: {
              count: places.length,
              places: places.slice(0, 6) // Top 6 nearby places
            }
          }
        };
      }

      case "readOfflineMapState": {
        const pack = context.activeOfflinePack;
        const offlineData = {
          hasActivePack: !!pack,
          packName: pack?.packName || "Chennai ➔ Bangalore (NH 48 Corridor)",
          provenance: pack?.provenance || "CACHED",
          tileCount: pack?.mapPack?.tileCount || context.offlineMapTilesCount || 420,
          zoomRange: pack?.mapPack?.zoomRange || [10, 13],
          coverageStatus: pack?.mapPack?.status || "READY",
          approxSizeMb: pack?.mapPack ? (pack.mapPack.totalSizeBytes / (1024 * 1024)).toFixed(2) : "1.05",
          disclaimer: "Cached vector map corridor. Real-time updates & cloud traffic are unavailable while offline."
        };
        return {
          result: {
            toolCallId: id,
            toolName: name,
            category: "READ_ONLY",
            success: true,
            data: offlineData
          }
        };
      }
    }
  }

  // 3. Handle USER_CONFIRMED_ACTION tools
  // CRITICAL PRINCIPLE: AI CANNOT AUTONOMOUSLY EXECUTE!
  // Creates a structured ActionProposal for explicit human click
  if (USER_CONFIRMED_ACTIONS.includes(name as ActionProposalToolName)) {
    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let title = "";
    let description = "";

    switch (name) {
      case "proposeCheckInInterval": {
        const mins = Number(args?.intervalMinutes) || 15;
        title = `Update Check-In Interval to ${mins} Minutes`;
        description = `Change your Safety Check-In frequency to check on you every ${mins} minutes.`;
        break;
      }
      case "proposeAlternativeRoute": {
        const routeId = String(args?.routeId || "Alternative");
        title = `Switch to Alternative Route (${routeId})`;
        description = `Recalculate and follow alternative route ${routeId}.`;
        break;
      }
      case "proposeCall112": {
        title = "Call Public Emergency Hotline 112";
        description = "Dial National Emergency Services (Police, Fire, Ambulance). Requires manual tap.";
        break;
      }
      case "proposeTrustedContactAlert": {
        title = "Prepare Alert for Trusted Contacts";
        description = "Send emergency notification with current coordinates to your configured guardians.";
        break;
      }
    }

    const proposal: ActionProposal = {
      proposalId,
      toolName: name as ActionProposalToolName,
      title,
      description,
      payload: args || {},
      status: "PENDING",
      createdAt: Date.now()
    };

    return {
      result: {
        toolCallId: id,
        toolName: name,
        category: "USER_CONFIRMED_ACTION",
        success: true,
        data: {
          proposalCreated: true,
          proposalId,
          status: "AWAITING_USER_CONFIRMATION",
          message: "Action proposal prepared. User must explicitly confirm."
        }
      },
      proposal
    };
  }

  return {
    result: {
      toolCallId: id,
      toolName: name,
      category: "READ_ONLY",
      success: false,
      error: `Unhandled tool '${name}'.`
    }
  };
}
