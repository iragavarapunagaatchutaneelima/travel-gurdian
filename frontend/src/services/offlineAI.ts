/**
 * Offline AI Guardian (mentor Sections 23-26).
 *
 * Architecture (matches the online assistant's grounding pattern exactly,
 * so the same no-fabrication guarantee holds offline):
 *
 *   user prompt -> deterministic intent detection -> executeToolCall()
 *   against an offline-sourced LiveTravelContext (real downloaded route/
 *   POIs/check-in state, GPS) -> verified JSON data
 *     -> WebLLM (if WebGPU available) explains that JSON in natural language
 *     -> otherwise a deterministic template explains the same JSON
 *
 * The local LLM (or the deterministic template) is ONLY ever allowed to
 * phrase already-verified data. It never independently decides whether a
 * route is safe, never invents a nearby place, and never claims a message
 * was sent. If the offline pack has no answer for something, both paths
 * say so honestly.
 */
import { executeToolCall } from "./geminiToolRouter";
import { generateOfflineCompletion, isWebGPUSupported, isOfflineEngineReady } from "./webllmEngine";
import { OfflineCorridorPack } from "../types/offline";
import { LiveTravelContext, ToolCallRequest } from "../types/gemini";

export type OfflineAnswerMode = "LOCAL_LLM" | "DETERMINISTIC";

export interface OfflineAnswer {
  reply: string;
  mode: OfflineAnswerMode;
  toolUsed: string;
  groundedData: any;
  /** Set when the on-device LLM answered but failed the grounding check. */
  llmRejectedReason?: string;
}

// Claims a small model tends to add on its own. Each may appear in an LLM
// reply only if the verified answer/data already mentions it.
const UNSUPPORTED_CLAIM_TERMS = [
  "traffic", "congestion", "delay", "roadblock", "closure", "closed", "accident", "construction",
  "weather", "rain", "flood", "storm", "fog", "visibility", "crime", "danger", "unsafe", "risk",
  "police", "hospital", "fuel", "petrol", "pharmacy", "open 24", "miles", "toll",
];

/**
 * Deterministic guard on on-device LLM output. Rejects a reply that:
 *  - contains a number not present in the verified answer or data
 *    (catches invented distances, times, scores, unit conversions)
 *  - mentions a risk/service term the verified data doesn't
 *  - is far longer than the verified answer (padding = embellishment)
 */
export function checkLlmReplyGrounded(reply: string, verifiedReply: string, data: unknown): { ok: boolean; reason?: string } {
  if (!reply) return { ok: false, reason: "empty reply" };
  const allowed = `${verifiedReply} ${JSON.stringify(data ?? {})}`.toLowerCase();
  const lower = reply.toLowerCase();
  // Whole-number tokens, so "1" doesn't pass just because "13" is present.
  const allowedNumbers = new Set(allowed.match(/\d+(?:\.\d+)?/g) || []);
  for (const n of lower.match(/\d+(?:\.\d+)?/g) || []) {
    if (!allowedNumbers.has(n)) return { ok: false, reason: `number "${n}" is not in the verified data` };
  }
  for (const term of UNSUPPORTED_CLAIM_TERMS) {
    if (lower.includes(term) && !allowed.includes(term)) return { ok: false, reason: `mentions "${term}", which the verified data doesn't` };
  }
  if (reply.length > Math.max(160, verifiedReply.length * 2 + 60)) return { ok: false, reason: "reply adds content beyond the verified answer" };
  return { ok: true };
}

/** Builds the same LiveTravelContext shape the online assistant uses, sourced entirely from the downloaded pack + live GPS. */
export function buildOfflineContext(
  pack: OfflineCorridorPack | null,
  currentPosition: { latitude: number; longitude: number; accuracy?: number } | null
): LiveTravelContext {
  return {
    navStatus: "READY",
    activeRoute: pack?.route ?? null,
    currentPosition: currentPosition
      ? {
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
          accuracy: currentPosition.accuracy ?? 20,
          altitude: null,
          heading: null,
          speed: null,
          timestamp: Date.now(),
        }
      : null,
    safetyScore: pack?.route?.safetyScore,
    originName: pack ? (pack.origin as any)?.name : undefined,
    destinationName: pack ? (pack.destination as any)?.name : undefined,
    travelMode: pack?.travelMode,
    activeOfflinePack: pack,
    offlineMapTilesCount: pack?.mapPack?.tileCount,
  };
}

function detectOfflineIntent(prompt: string): { tool: string; args: Record<string, any> } {
  const lower = prompt.toLowerCase();
  if (lower.includes("where am i") || lower.includes("my location") || lower.includes("current location")) {
    return { tool: "readNavigationState", args: {} };
  }
  if (lower.includes("safety") || lower.includes("safe fit") || lower.includes("how safe")) {
    return { tool: "readSafetyState", args: {} };
  }
  if (lower.includes("check-in") || lower.includes("check in")) {
    return { tool: "readCheckInState", args: {} };
  }
  if (lower.includes("map") || lower.includes("offline") || lower.includes("tiles")) {
    return { tool: "readOfflineMapState", args: {} };
  }
  if (lower.includes("eta") || lower.includes("arrival") || lower.includes("how long")) {
    return { tool: "getArrivalEstimate", args: {} };
  }
  let placeType = "all";
  if (lower.includes("fuel") || lower.includes("petrol") || lower.includes("gas")) placeType = "fuel";
  else if (lower.includes("hospital") || lower.includes("medical")) placeType = "hospital";
  else if (lower.includes("police")) placeType = "police";
  else if (lower.includes("pharmacy") || lower.includes("chemist")) placeType = "pharmacy";
  else if (lower.includes("rest") || lower.includes("food")) placeType = "rest";
  if (lower.includes("near") || placeType !== "all") {
    return { tool: "findNearbyPlace", args: { placeType } };
  }
  return { tool: "getRouteSummary", args: {} };
}

function deterministicReply(toolName: string, data: any): string {
  switch (toolName) {
    case "readSafetyState":
      return data.available
        ? `Offline Safety Fit (cached at download time): ${data.safetyScore}/100 (${data.safetyLevel}).`
        : "No cached Safety Fit score is available offline for this corridor.";
    case "readCheckInState":
      return data.status && data.status !== "DISABLED"
        ? `Safety Check-In status (as last synced while online): ${data.status}.`
        : "Safety Check-In is not active. Note: while offline, the backend cannot enforce or escalate a check-in timer.";
    case "readOfflineMapState":
      return data.hasActivePack
        ? `Offline map: ${data.packName}, ${data.tileCount} real vector tiles cached (zoom ${data.zoomRange?.[0]}-${data.zoomRange?.[1]}).`
        : "No offline map pack has been downloaded for this device yet.";
    case "getArrivalEstimate":
      return data.available
        ? `Cached route estimate: ETA ${data.etaString}, ${data.distanceRemainingKm ?? "unknown"} km remaining. This does not account for live traffic while offline.`
        : "No route estimate is available offline.";
    case "findNearbyPlace": {
      if (!data.success && data.data?.locationRequired) {
        return "Location access is required to find places near you. Enable GPS to search the downloaded corridor's cached safe havens.";
      }
      const places = data.data?.places || data.places || [];
      if (places.length === 0) {
        return "No cached safe havens of that type were found along the downloaded corridor.";
      }
      const list = places.slice(0, 4).map((p: any) => `• ${p.name} (${p.distance})`).join("\n");
      return `Cached safe havens near your position:\n${list}`;
    }
    case "getRouteSummary":
    default:
      return data.available
        ? `Cached route: ${data.routeName} (${data.distance}, est. ${data.estimatedDuration}).`
        : "No route has been downloaded for offline use yet. Download an offline pack from a planned journey first.";
  }
}

/**
 * Answers a prompt entirely offline. Always returns a real, grounded
 * answer or an honest "unavailable" -- never invents data, and always
 * reports which engine (local LLM vs deterministic) actually produced the
 * final text so the UI can be honest about it too.
 */
export async function answerOffline(
  prompt: string,
  pack: OfflineCorridorPack | null,
  currentPosition: { latitude: number; longitude: number; accuracy?: number } | null
): Promise<OfflineAnswer> {
  const context = buildOfflineContext(pack, currentPosition);
  const { tool, args } = detectOfflineIntent(prompt);

  const toolReq: ToolCallRequest = { id: `offline_${Date.now()}`, name: tool as any, arguments: args };
  const { result } = executeToolCall(toolReq, context);
  const groundedData = result.data ?? result;

  const fallbackReply = deterministicReply(tool, groundedData);

  // Only use the local LLM once the user has loaded it. Otherwise the first
  // question would silently start a multi-hundred-MB download and hold a
  // safety-relevant answer hostage until it finished.
  if (!isWebGPUSupported() || !isOfflineEngineReady()) {
    return { reply: fallbackReply, mode: "DETERMINISTIC", toolUsed: tool, groundedData };
  }

  try {
    // The small on-device model only REPHRASES the verified answer. Asked to
    // "summarise the data" it embellished freely (invented traffic claims,
    // unit conversions), so its output must also pass checkLlmReplyGrounded.
    const systemPrompt =
      "You rephrase a verified travel-safety answer for the user in plain, friendly language. " +
      "Use ONLY the facts in the VERIFIED ANSWER and DATA. Do not add advice, explanations, conversions, or any fact not present. " +
      "At most 2 short sentences.\n\nVERIFIED ANSWER:\n" + fallbackReply + "\n\nDATA:\n" + JSON.stringify(groundedData);
    const llmReply = (await generateOfflineCompletion(systemPrompt, prompt, { maxTokens: 96, temperature: 0 })).trim();
    const check = checkLlmReplyGrounded(llmReply, fallbackReply, groundedData);
    if (!check.ok) {
      return { reply: fallbackReply, mode: "DETERMINISTIC", toolUsed: tool, groundedData, llmRejectedReason: check.reason };
    }
    return { reply: llmReply, mode: "LOCAL_LLM", toolUsed: tool, groundedData };
  } catch {
    // Honest fallback: WebGPU exists but the model failed to load/generate
    // (e.g. first-time download failed, out of memory). Never block the
    // user's safety-relevant question on that -- use the deterministic path.
    return { reply: fallbackReply, mode: "DETERMINISTIC", toolUsed: tool, groundedData };
  }
}

export { isWebGPUSupported, isOfflineEngineReady };
