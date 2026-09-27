import { AssistantMessage, LiveTravelContext } from "../types/gemini";

export async function queryTravelAssistant(
  prompt: string,
  context: LiveTravelContext = {}
): Promise<AssistantMessage> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, context })
    });

    if (!res.ok) {
      const detail = res.status === 429
        ? "Too many AI requests in a short time. Please wait a minute and try again."
        : `The AI service returned an error (HTTP ${res.status}).`;
      return {
        id: `msg_error_${Date.now()}`,
        role: "assistant",
        content: `${detail} Navigation, GPS, and Safety Check are unaffected.`,
        timestamp: Date.now(),
        mode: "DEMO",
        llmUnavailableReason: detail,
      };
    }

    const data = await res.json();
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role: "assistant",
      content: data.reply || "Assistant ready to assist.",
      timestamp: Date.now(),
      toolCalls: data.toolCalls || [],
      toolResults: data.toolResults || [],
      proposals: data.proposals || [],
      mode: data.mode || "DEMO",
      model: data.model,
      llmUnavailableReason: data.llmUnavailableReason ?? null
    };
  } catch (err) {
    console.warn("Travel Assistant fetch error:", err);
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    return {
      id: `msg_fallback_${Date.now()}`,
      role: "assistant",
      content: offline
        ? "You appear to be offline, so the online AI Guardian can't be reached. The Offline Survival Hub (/offline-mode) can answer questions from your downloaded journey pack."
        : "The AI Guardian server couldn't be reached. Please try again shortly.",
      timestamp: Date.now(),
      mode: offline ? "OFFLINE" : "DEMO"
    };
  }
}
