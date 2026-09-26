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
    description: "Finds verified safe havens (hospitals, pharmacies, police stations, fuel stations/petrol bunks, rest stops, cafes) near current corridor or along active route.",
    parameters: {
      placeType: {
        type: "string",
        description: "Type of place: 'hospital' | 'pharmacy' | 'police' | 'fuel' | 'cafe' | 'rest' | 'all'",
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
        // Never fabricate a score or safety factors when no route has been
        // assessed yet -- an invented "85/100, adequate lighting" answer for
        // a route that doesn't exist is exactly the kind of made-up data
        // this assistant must not produce.
        const realScore = context.safetyScore ?? context.activeRoute?.safetyScore;
        const realFactors = context.activeRoute?.safetyAssessment?.factors;
        const hasRealData = realScore !== undefined && realScore !== null;
        const safetyData = hasRealData
          ? {
              available: true,
              safetyScore: realScore,
              confidence: context.safetyAssessment?.confidence ?? context.activeRoute?.safetyAssessment?.confidence ?? "MEDIUM",
              safetyLevel: realScore >= 80 ? "HIGH" : realScore >= 60 ? "MODERATE" : "LOW",
              factors: realFactors ?? []
            }
          : {
              available: false,
              safetyScore: null,
              confidence: "NONE",
              safetyLevel: "NOT_AVAILABLE",
              factors: [],
              message: "No route has been calculated and assessed yet, so there is no Safety Fit score to report."
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
        // configuredContactsCount reflects only a real number the caller
        // supplied; it is never guessed.
        const checkInData = {
          status: context.checkInStatus || "DISABLED",
          cycleNumber: context.activeCheckInCycle?.cycleNumber ?? 1,
          secondsRemaining: context.checkInSecondsRemaining ?? 0,
          minutesRemaining: context.checkInSecondsRemaining ? Math.ceil(context.checkInSecondsRemaining / 60) : 0,
          configuredContactsCount: context.trustedContactsCount ?? null,
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
        const userLat = context.currentPosition?.latitude ?? context.locationSnapshot?.latitude;
        const userLng = context.currentPosition?.longitude ?? context.locationSnapshot?.longitude;

        if (userLat === undefined || userLng === undefined || userLat === null || userLng === null) {
          return {
            result: {
              toolCallId: id,
              toolName: name,
              category: "READ_ONLY",
              success: false,
              error: "LOCATION_PERMISSION_REQUIRED",
              data: {
                locationRequired: true,
                message: "Location access is required to find places near you. Please enable location permissions."
              }
            }
          };
        }

        const R = 6371; // Earth radius in km
        const computeDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const dLatRad = ((lat2 - lat1) * Math.PI) / 180;
          const dLngRad = ((lon2 - lon1) * Math.PI) / 180;
          const a = Math.sin(dLatRad / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLngRad / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        const formatDist = (distKm: number) => {
          return distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`;
        };

        // 1. If active route with verified POIs exists, search along the active route first
        let routeMatches: any[] = [];
        if (context.activeRoute?.pois && context.activeRoute.pois.length > 0) {
          const pois = context.activeRoute.pois;
          const matchedPois = pois.filter(p => {
            const pType = (p.type || "").toLowerCase();
            if (placeType.includes("fuel") || placeType.includes("petrol") || placeType.includes("gas")) {
              return pType === "petrol" || pType === "fuel";
            }
            if (placeType.includes("hospital") || placeType.includes("medical")) {
              return pType === "hospital";
            }
            if (placeType.includes("pharmacy") || placeType.includes("chemist")) {
              return pType === "pharmacy";
            }
            if (placeType.includes("police") || placeType.includes("patrol")) {
              return pType === "police";
            }
            if (placeType.includes("cafe") || placeType.includes("coffee")) {
              return pType === "food" || pType === "cafe";
            }
            if (placeType.includes("rest") || placeType.includes("oasis")) {
              return pType === "rest" || pType === "food";
            }
            return true;
          });

          if (matchedPois.length > 0) {
            routeMatches = matchedPois.map((p, idx) => {
              const distKm = computeDistanceKm(userLat, userLng, p.latitude, p.longitude);
              return {
                id: `route_poi_${p.type}_${idx}`,
                name: p.name,
                type: p.type.charAt(0).toUpperCase() + p.type.slice(1),
                category: p.type === "petrol" ? "fuel" : p.type,
                distance: `${formatDist(distKm)} along corridor`,
                distanceKm: Number(distKm.toFixed(2)),
                latitude: p.latitude,
                longitude: p.longitude,
                isAlongRoute: true
              };
            });
          }
        }

        // NOTE: this only returns places drawn from the already-computed,
        // Google-sourced POIs along the active route (real data). It
        // deliberately does NOT invent any place: if there is no active
        // route or nothing matches, `places` is empty and callers (see
        // app/api/ai/route.ts) must either say so honestly or perform a
        // real live Places lookup via fetchLiveNearbyPlaces() below --
        // never synthesize a "verified" business at a fake coordinate
        // offset.
        const combined = routeMatches.sort((a, b) => a.distanceKm - b.distanceKm);

        return {
          result: {
            toolCallId: id,
            toolName: name,
            category: "READ_ONLY",
            success: true,
            data: {
              count: combined.length,
              userLocation: { latitude: userLat, longitude: userLng },
              places: combined.slice(0, 6),
              source: combined.length > 0 ? "ACTIVE_ROUTE_POIS" : "NONE"
            }
          }
        };
      }

      case "readOfflineMapState": {
        // Reports ONLY what was actually downloaded. No pack means no
        // fabricated "example corridor" or invented tile count -- a
        // 420-tile pack that was never downloaded is a lie, not a demo.
        const pack = context.activeOfflinePack;
        const offlineData = pack
          ? {
              hasActivePack: true,
              packName: pack.packName,
              provenance: pack.provenance,
              tileCount: pack.mapPack?.tileCount ?? 0,
              zoomRange: pack.mapPack?.zoomRange || [0, 0],
              coverageStatus: pack.mapPack?.status || "UNKNOWN",
              approxSizeMb: pack.mapPack ? (pack.mapPack.totalSizeBytes / (1024 * 1024)).toFixed(2) : "0.00",
              disclaimer: "Cached vector map corridor. Real-time updates & cloud traffic are unavailable while offline."
            }
          : {
              hasActivePack: false,
              packName: null,
              provenance: null,
              tileCount: 0,
              zoomRange: null,
              coverageStatus: "NOT_DOWNLOADED",
              approxSizeMb: "0.00",
              disclaimer: "No offline map pack has been downloaded for this device yet."
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

// ---------------------------------------------------------------------------
// Live (real) nearby-places lookup, server-side only.
// ---------------------------------------------------------------------------
// Used by app/api/ai/route.ts when findNearbyPlace's route-POI match above
// comes back empty (no active route, or nothing of that category on it).
// Calls the actual Google Places API (New) Nearby Search from the server
// using a server-side key, so it works even though this code runs in a
// Next.js Route Handler with no `window.google.maps` available. Returns an
// empty array -- never a fabricated place -- on any failure or zero results.
export interface LiveNearbyPlace {
  id: string;
  name: string;
  type: string;
  category: string;
  distanceKm: number;
  distance: string;
  latitude: number;
  longitude: number;
  phone?: string;
  isAlongRoute: false;
}

const PLACE_TYPE_MAP: Record<string, string[]> = {
  hospital: ["hospital"],
  medical: ["hospital"],
  pharmacy: ["pharmacy"],
  chemist: ["pharmacy"],
  police: ["police"],
  fuel: ["gas_station"],
  petrol: ["gas_station"],
  gas: ["gas_station"],
  bunk: ["gas_station"],
  cafe: ["cafe"],
  coffee: ["cafe"],
  rest: ["restaurant"],
  oasis: ["restaurant"],
  all: ["hospital", "police", "gas_station"]
};

function formatKm(distKm: number): string {
  return distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function fetchLiveNearbyPlaces(
  lat: number,
  lng: number,
  placeType: string,
  apiKey: string | undefined,
  radiusMeters: number = 6000
): Promise<LiveNearbyPlace[]> {
  if (!apiKey) return [];

  const includedTypes = PLACE_TYPE_MAP[placeType.toLowerCase()] || PLACE_TYPE_MAP.all;

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.nationalPhoneNumber,places.types"
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: 8,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters
          }
        }
      }),
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json().catch(() => null);
    const places = Array.isArray(data?.places) ? data.places : [];

    return places
      .map((p: any, idx: number): LiveNearbyPlace | null => {
        const pLat = p.location?.latitude;
        const pLng = p.location?.longitude;
        if (typeof pLat !== "number" || typeof pLng !== "number") return null;
        const distKm = haversineKm(lat, lng, pLat, pLng);
        return {
          id: p.id || `live_place_${idx}`,
          name: p.displayName?.text || "Unnamed location",
          type: (p.types?.[0] || placeType).replace(/_/g, " "),
          category: placeType,
          distanceKm: Number(distKm.toFixed(2)),
          distance: formatKm(distKm),
          latitude: pLat,
          longitude: pLng,
          phone: p.nationalPhoneNumber,
          isAlongRoute: false
        };
      })
      .filter((p: LiveNearbyPlace | null): p is LiveNearbyPlace => p !== null)
      .sort((a: LiveNearbyPlace, b: LiveNearbyPlace) => a.distanceKm - b.distanceKm);
  } catch {
    // Network error, timeout, or malformed response: honestly report zero
    // results rather than falling back to invented data.
    return [];
  }
}
