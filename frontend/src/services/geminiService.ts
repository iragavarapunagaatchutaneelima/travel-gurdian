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
      throw new Error(`AI API responded with status ${res.status}`);
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
      mode: data.mode || "DEMO"
    };
  } catch (err) {
    console.warn("Travel Assistant fetch error (offline or server error):", err);
    return {
      id: `msg_fallback_${Date.now()}`,
      role: "assistant",
      content: "Travel Assistant is currently operating offline. Your live navigation, GPS tracking, and Safety Check-In remain 100% active.",
      timestamp: Date.now(),
      mode: "OFFLINE"
    };
  }
}
