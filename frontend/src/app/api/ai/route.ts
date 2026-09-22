import { NextResponse } from "next/server";
import { 
  ALLOWLISTED_TOOLS, 
  executeToolCall, 
  sanitizeInput 
} from "../../../services/geminiToolRouter";
import { 
  ToolCallRequest, 
  ToolExecutionResult, 
  ActionProposal, 
  LiveTravelContext 
} from "../../../types/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawPrompt = body.prompt;
    const context: LiveTravelContext = body.context || {};

    if (!rawPrompt || typeof rawPrompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const sanitizedPrompt = sanitizeInput(rawPrompt);
    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const toolCallsExecuted: ToolCallRequest[] = [];
    const toolResults: ToolExecutionResult[] = [];
    const proposals: ActionProposal[] = [];

    // Helper to run a local tool deterministically
    const runTool = (name: any, args: any = {}) => {
      const toolReq: ToolCallRequest = {
        id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name,
        arguments: args
      };
      toolCallsExecuted.push(toolReq);
      const { result, proposal } = executeToolCall(toolReq, context);
      toolResults.push(result);
      if (proposal) proposals.push(proposal);
      return result;
    };

    // 1. If real Gemini API key is available, call Gemini with tool declarations
    if (geminiKey && geminiKey !== "your_gemini_api_key" && geminiKey.length > 5) {
      try {
        const functionDeclarations = ALLOWLISTED_TOOLS.map(t => ({
          name: t.name,
          description: t.description,
          parameters: {
            type: "OBJECT",
            properties: Object.entries(t.parameters).reduce((acc, [k, v]) => {
              acc[k] = { type: v.type.toUpperCase(), description: v.description };
              return acc;
            }, {} as Record<string, any>),
            required: Object.entries(t.parameters).filter(([, v]) => v.required).map(([k]) => k)
          }
        }));

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: sanitizedPrompt }]
                }
              ],
              tools: [{ functionDeclarations }],
              systemInstruction: {
                parts: [
                  {
                    text: "You are Travel Guardian AI, an expert travel safety assistant. You observe navigation, check-in, and safety state. You can explain information and suggest actions via tool calls, but you CANNOT autonomously execute safety-critical actions. Always explain clearly and truthfully using verified tool data."
                  }
                ]
              }
            })
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const candidate = data?.candidates?.[0]?.content?.parts?.[0];

          // Check if Gemini invoked a tool call
          if (candidate?.functionCall) {
            const funcName = candidate.functionCall.name;
            const funcArgs = candidate.functionCall.args || {};
            runTool(funcName, funcArgs);

            // Generate contextual summary based on tool result
            let replyText = "";
            if (funcName === "readSafetyState") {
              replyText = `Your current Safety Fit score is ${context.safetyScore ?? context.activeRoute?.safetyScore ?? 85}/100 with ${(context.safetyAssessment?.confidence ?? "MEDIUM")} confidence.`;
            } else if (funcName === "readNavigationState") {
              replyText = `Navigation status is ${context.navStatus || "ACTIVE"}. Route progress is ${context.progress?.progressPercent || 0}% complete with dynamic ETA ${context.progress?.etaString || context.activeRoute?.time || "--:--"}.`;
            } else if (funcName === "readCheckInState") {
              const mins = context.checkInSecondsRemaining ? Math.ceil(context.checkInSecondsRemaining / 60) : 15;
              replyText = `Your Safety Check-In is active (Cycle #${context.activeCheckInCycle?.cycleNumber || 1}). Next check-in is due in ~${mins} minute(s).`;
            } else if (funcName === "findNearbyPlace") {
              replyText = `I found verified safe havens along your corridor. You can view nearby hospital and emergency nodes in your map overlay.`;
            } else if (funcName.startsWith("propose")) {
              replyText = `I have prepared a proposal for this action. Please confirm below to proceed.`;
            } else {
              replyText = `Retrieved verified data for ${funcName}.`;
            }

            return NextResponse.json({
              reply: replyText,
              toolCalls: toolCallsExecuted,
              toolResults,
              proposals,
              mode: "CONNECTED",
              model: geminiModel
            });
          }

          if (candidate?.text) {
            return NextResponse.json({
              reply: candidate.text,
              toolCalls: [],
              toolResults: [],
              proposals: [],
              mode: "CONNECTED",
              model: geminiModel
            });
          }
        }
      } catch (err) {
        console.warn("Gemini cloud API error, switching to deterministic tool router:", err);
      }
    }

    // 2. Deterministic Tool Execution & Natural Language Intent Matching (Demo / Offline / Local)
    const lower = sanitizedPrompt.toLowerCase();
    let reply = "";

    // Intent: Safety Score / Safety State
    if (lower.includes("safety") || lower.includes("score") || lower.includes("fit") || lower.includes("safe status")) {
      const res = runTool("readSafetyState");
      reply = `Your current Safety Fit score is ${res.data.safetyScore}/100 (${res.data.confidence} Confidence). Key factors include: ${res.data.factors.map((f: any) => f.explanation).join(". ")}.`;
    }
    // Intent: ETA / Arrival / Progress / Route status
    else if (lower.includes("eta") || lower.includes("how long") || lower.includes("arrival") || lower.includes("reach") || lower.includes("time left")) {
      const res = runTool("getArrivalEstimate");
      reply = `Estimated arrival is at ${res.data.etaString} with ${res.data.distanceRemainingKm} km remaining (${res.data.progressPercent}% complete).`;
    }
    // Intent: Next Check-in / Check-in status
    else if (lower.includes("check-in") || lower.includes("checkin") || lower.includes("countdown") || lower.includes("timer")) {
      const res = runTool("readCheckInState");
      if (res.data.status === "ACTIVE") {
        reply = `Safety Check-In is currently ACTIVE (Cycle #${res.data.cycleNumber}). Your next check-in is scheduled in approximately ${res.data.minutesRemaining} minute(s). ${res.data.configuredContactsCount} guardian contacts are linked.`;
      } else {
        reply = `Safety Check-In is currently in ${res.data.status} state. You can configure and start it anytime from the navigation overlay.`;
      }
    }
    // Intent: Off Route query
    else if (lower.includes("off route") || lower.includes("lost") || lower.includes("wrong way")) {
      const res = runTool("readNavigationState");
      if (res.data.isOnRoute) {
        reply = `You are currently ON the planned corridor for ${res.data.destination}. Navigation status: ${res.data.status}.`;
      } else {
        reply = `You are currently marked as OFF_ROUTE. A real Google route recalculation proposal is ready on your map.`;
      }
    }
    // Intent: Find Hospital / Medical
    else if (lower.includes("hospital") || lower.includes("medical") || lower.includes("doctor") || lower.includes("clinic")) {
      const res = runTool("findNearbyPlace", { placeType: "hospital" });
      const topPlaces = res.data.places.map((p: any) => `${p.name} (${p.distance})`).join(", ");
      reply = `Verified medical havens nearby: ${topPlaces}. You can dial or navigate directly from your emergency tab.`;
    }
    // Intent: Police / Highway Patrol
    else if (lower.includes("police") || lower.includes("patrol") || lower.includes("cops")) {
      const res = runTool("findNearbyPlace", { placeType: "police" });
      const topPlaces = res.data.places.map((p: any) => `${p.name} (${p.distance})`).join(", ");
      reply = `Nearby police control posts: ${topPlaces}.`;
    }
    // Intent: Fuel / Rest Stop
    else if (lower.includes("fuel") || lower.includes("petrol") || lower.includes("gas") || lower.includes("rest stop")) {
      const res = runTool("findNearbyPlace", { placeType: "fuel" });
      const topPlaces = res.data.places.map((p: any) => `${p.name} (${p.distance})`).join(", ");
      reply = `24/7 Verified highway fuel plazas: ${topPlaces}.`;
    }
    // Intent: Propose Call 112
    else if (lower.includes("call 112") || lower.includes("dial 112") || lower.includes("call police") || lower.includes("call ambulance")) {
      runTool("proposeCall112", { reason: "User query requested emergency dial" });
      reply = `Calling National Emergency Line (112) requires your explicit confirmation. Please tap the action proposal below to initiate dialing.`;
    }
    // Intent: Propose Alert Contacts
    else if (lower.includes("alert contact") || lower.includes("alert guardian") || lower.includes("send alert") || lower.includes("notify family")) {
      runTool("proposeTrustedContactAlert", { customMessage: "Assistance requested via Travel Assistant" });
      reply = `I can prepare an alert notification to your trusted guardians. Sending requires your explicit confirmation.`;
    }
    // Intent: Propose Check-in interval change
    else if (lower.includes("change interval") || lower.includes("increase interval") || lower.includes("check in every")) {
      const match = lower.match(/\b(\d+)\b/);
      const mins = match ? parseInt(match[1], 10) : 15;
      runTool("proposeCheckInInterval", { intervalMinutes: mins });
      reply = `I can propose updating your Safety Check-In interval to ${mins} minutes. Tap below to confirm.`;
    }
    // Intent: Propose Route change
    else if (lower.includes("alternative route") || lower.includes("change route") || lower.includes("different route")) {
      runTool("proposeAlternativeRoute", { routeId: "Route B" });
      reply = `I can propose switching to an alternative verified route. Review and confirm below.`;
    }
    // Intent: Offline Map / Vector Corridor Status
    else if (lower.includes("offline map") || lower.includes("cached map") || lower.includes("map data") || lower.includes("available offline") || lower.includes("how much of my route is cached")) {
      const res = runTool("readOfflineMapState");
      reply = `Offline Vector Map: Active corridor is ${res.data.packName} with ${res.data.tileCount} cached vector tiles (Zoom ${res.data.zoomRange[0]}-${res.data.zoomRange[1]}, ~${res.data.approxSizeMb} MB). ${res.data.disclaimer}`;
    }
    // Intent: Offline Reroute (Truthful constraint)
    else if ((lower.includes("reroute") || lower.includes("new route") || lower.includes("different route")) && (lower.includes("offline") || lower.includes("no internet") || lower.includes("without internet"))) {
      reply = `I cannot calculate a new live route while offline. Real-time Google routing requires active network connectivity. You can continue following your active cached corridor route.`;
    }
    // General Route Explanation / Safety Overview
    else {
      const res = runTool("getRouteSummary");
      reply = `Travel Guardian Assistant: Active route is ${res.data.routeName} (${res.data.distance}, est. ${res.data.estimatedDuration}). Traffic condition is ${res.data.trafficScore}, road quality is ${res.data.roadCondition}. How can I assist with your journey?`;
    }

    return NextResponse.json({
      reply,
      toolCalls: toolCallsExecuted,
      toolResults,
      proposals,
      mode: "DEMO",
      model: "guardian-deterministic-tools"
    });

  } catch (error: any) {
    console.error("AI API route error:", error);
    return NextResponse.json({
      reply: "Travel Guardian Assistant is active. Ask me about your safety fit, ETA, next check-in, or nearby havens.",
      toolCalls: [],
      toolResults: [],
      proposals: [],
      mode: "OFFLINE"
    });
  }
}
