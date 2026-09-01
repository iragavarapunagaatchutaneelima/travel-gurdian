import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    // If Gemini key is available, call Google Gemini REST endpoint securely on the server
    if (geminiKey && geminiKey !== "your_gemini_api_key" && geminiKey.length > 5) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `You are Travel Guardian AI, an expert travel safety companion. Provide concise, safety-first, actionable advice, route risk evaluations, safe stop recommendations, or emergency steps for this traveler query:\n\n${prompt}`
                    }
                  ]
                }
              ]
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) {
            return NextResponse.json({
              reply: generatedText,
              mode: "CONNECTED",
              model: "gemini-1.5-flash"
            });
          }
        }
      } catch (err) {
        console.warn("Gemini API call failed, falling back to local safety rules engine:", err);
      }
    }

    // Graceful Demo / Local Expert Fallback
    const lower = prompt.toLowerCase();
    let reply = "AI Guardian Travel Safety Advisory: Travel corridors are currently operating under standard safety guidelines. Always keep your emergency contacts updated in Assist Hub and avoid secluded rural bypasses after dark.";

    if (lower.includes("chennai") && lower.includes("bangalore")) {
      reply = "AI Route Diagnostic (Chennai ➔ Bangalore): Distance is ~350 km via NH 48. High-density safety corridor with 24/7 HP and IndianOil fuel plazas every 40km. Day travel is optimal. Safety Index: 94/100 (Highly Recommended).";
    } else if (lower.includes("mumbai") && lower.includes("hyderabad")) {
      reply = "AI Route Diagnostic (Mumbai ➔ Hyderabad): Distance ~710 km via NH 65. Pune-Solapur expressway segment is fast and well-lit. Solapur-Hyderabad has moderate traffic. Night travel safety score: 86/100.";
    } else if (lower.includes("delhi")) {
      reply = "AI Route Diagnostic (Delhi Hub): NH 44 and Yamuna Expressway routes active. Heavy fog warnings possible during early morning hours. Verified emergency hospital nodes active at 50km intervals.";
    } else if (lower.includes("women") || lower.includes("female") || lower.includes("solo")) {
      reply = "Solo Women Traveler Protocol: 1. Enable 'Live GPS Telemetry Sharing' in Emergency tab. 2. Stop only at major 24/7 National Highway fuel plazas with verified CCTV. 3. Configure a 1-hour Dead-man checkin timer in Assist Hub.";
    } else if (lower.includes("sos") || lower.includes("emergency") || lower.includes("help") || lower.includes("police")) {
      reply = "EMERGENCY PROTOCOL: 1. Tap 'Trigger Emergency SOS' to broadcast current coordinates. 2. Regional emergency hotline in India is 112 (Police, Medical, Fire). 3. Nearest police patrol units can be dispatched via GPS link.";
    } else if (lower.includes("lost") || lower.includes("passport") || lower.includes("stolen")) {
      reply = "Lost Document Protocol: File an immediate loss report at the nearest police station or municipal desk. Access the Review & Guide tab to dial consular embassy lines.";
    }

    return NextResponse.json({
      reply,
      mode: "DEMO",
      model: "guardian-rules-engine"
    });

  } catch (error: any) {
    return NextResponse.json({
      reply: "Guardian assistant is active. Please ask about route safety, emergency numbers, or travel tips.",
      mode: "DEMO"
    });
  }
}
