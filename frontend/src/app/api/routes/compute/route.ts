import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Server-side security hardening for the Google Routes API proxy.
// ---------------------------------------------------------------------------
// This endpoint spends real Google Cloud quota on every call, so it must not
// behave as an open relay: it validates the request shape strictly, never
// trusts client-supplied headers to satisfy Google's own key restrictions,
// and applies a simple best-effort rate limit per source IP.

const ALLOWED_TRAVEL_MODES = new Set(["DRIVE", "WALK", "TWO_WHEELER", "Car", "Walk", "Bike"]);
const MAX_REQUESTS_PER_WINDOW = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

// In-memory, best-effort limiter (per Node process). Not a substitute for a
// shared store in a multi-instance deployment, but meaningfully raises the
// cost of casual abuse without adding external infrastructure.
const requestLog = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(key, timestamps);
  // Bound memory: drop stale keys occasionally.
  if (requestLog.size > 5000) {
    for (const [k, v] of requestLog) {
      if (v.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) requestLog.delete(k);
    }
  }
  return timestamps.length > MAX_REQUESTS_PER_WINDOW;
}

function isValidLatLng(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln) && la >= -90 && la <= 90 && ln >= -180 && ln <= 180;
}

function isValidLocationInput(loc: any): boolean {
  if (!loc || typeof loc !== "object") return false;
  if (loc.latitude != null && loc.longitude != null) return isValidLatLng(loc.latitude, loc.longitude);
  if (typeof loc.placeId === "string" && loc.placeId.length > 0 && loc.placeId.length < 512) return true;
  if (typeof loc.address === "string" && loc.address.trim().length > 0 && loc.address.length < 512) return true;
  if (typeof loc.name === "string" && loc.name.trim().length > 0 && loc.name.length < 512) return true;
  return false;
}

export async function POST(req: Request) {
  try {
    // 1. Best-effort same-app-origin check. A request with no Origin/Referer
    // at all is allowed (some legitimate same-origin fetches omit it), but a
    // request that explicitly names a DIFFERENT origin is rejected outright.
    const selfOrigin = new URL(req.url).origin;
    const originHeader = req.headers.get("origin");
    const refererHeader = req.headers.get("referer");
    const claimedOrigin = originHeader || (refererHeader ? new URL(refererHeader).origin : null);
    if (claimedOrigin && claimedOrigin !== selfOrigin) {
      return NextResponse.json({ error: "Requests from this origin are not permitted." }, { status: 403 });
    }

    // 2. Best-effort rate limit per source IP.
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
    if (isRateLimited(clientIp)) {
      return NextResponse.json({ error: "Too many route requests. Please slow down." }, { status: 429 });
    }

    // 3. Strict payload validation -- only the fields this endpoint actually
    // uses are read; nothing else from the client body is forwarded.
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { origin, destination, travelMode, computeAlternativeRoutes, languageCode } = body;

    if (!isValidLocationInput(origin)) {
      return NextResponse.json({ error: "Invalid origin coordinates or location" }, { status: 400 });
    }
    if (!isValidLocationInput(destination)) {
      return NextResponse.json({ error: "Invalid destination coordinates or location" }, { status: 400 });
    }
    if (travelMode !== undefined && !ALLOWED_TRAVEL_MODES.has(travelMode)) {
      return NextResponse.json({ error: `Unsupported travel mode: ${travelMode}` }, { status: 400 });
    }
    if (languageCode !== undefined && (typeof languageCode !== "string" || languageCode.length > 20)) {
      return NextResponse.json({ error: "Invalid languageCode" }, { status: 400 });
    }

    // Prefer a dedicated, server-only key (should be restricted by server IP
    // in Google Cloud Console, NOT by HTTP referrer, since this is a
    // server-to-server call). Falls back to the browser key only if a
    // separate one hasn't been configured.
    const dedicatedServerKey = process.env.GOOGLE_ROUTES_API_KEY;
    const apiKey = dedicatedServerKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps / Routes API key is not configured on the server." },
        { status: 500 }
      );
    }

    // Map internal travelMode to Google Routes API v2 RouteTravelMode
    // "Bike" -> "TWO_WHEELER" (Motorized motorcycle/scooter)
    // "Car" -> "DRIVE"
    // "Walk" -> "WALK"
    let routeTravelMode = "DRIVE";
    if (travelMode === "TWO_WHEELER" || travelMode === "Bike") {
      routeTravelMode = "TWO_WHEELER";
    } else if (travelMode === "WALK" || travelMode === "Walk") {
      routeTravelMode = "WALK";
    }

    const requestPayload: any = {
      travelMode: routeTravelMode,
      computeAlternativeRoutes: computeAlternativeRoutes !== false,
      languageCode: languageCode || "en-US",
      units: "METRIC"
    };

    // Format origin
    if (origin.latitude != null && origin.longitude != null) {
      requestPayload.origin = {
        location: { latLng: { latitude: Number(origin.latitude), longitude: Number(origin.longitude) } }
      };
    } else if (origin.placeId) {
      requestPayload.origin = { placeId: origin.placeId };
    } else {
      requestPayload.origin = { address: origin.address || origin.name };
    }

    // Format destination
    if (destination.latitude != null && destination.longitude != null) {
      requestPayload.destination = {
        location: { latLng: { latitude: Number(destination.latitude), longitude: Number(destination.longitude) } }
      };
    } else if (destination.placeId) {
      requestPayload.destination = { placeId: destination.placeId };
    } else {
      requestPayload.destination = { address: destination.address || destination.name };
    }

    // Request toll information honestly: travelAdvisory.tollInfo is only
    // populated when Google actually has toll data for the route. Absence
    // of the field means "unknown", not "no tolls" -- the caller must not
    // collapse those two states.
    const fieldMask = [
      "routes.duration",
      "routes.distanceMeters",
      "routes.description",
      "routes.warnings",
      "routes.routeLabels",
      "routes.travelAdvisory.tollInfo",
      "routes.polyline.encodedPolyline",
      "routes.legs.steps.navigationInstruction",
      "routes.legs.steps.distanceMeters",
      "routes.legs.steps.staticDuration",
      "routes.legs.steps.startLocation",
      "routes.legs.steps.endLocation",
      "routes.legs.steps.polyline.encodedPolyline"
    ].join(",");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask
    };

    // Only send a Referer header when we're using the shared, HTTP-referrer-
    // restricted public Maps key (no dedicated server key configured), and
    // even then it is a fixed, server-controlled value -- never the
    // client's own Referer header, which would let any caller spoof
    // whatever origin the key happens to allow.
    if (!dedicatedServerKey) {
      headers["Referer"] = selfOrigin;
    }

    const googleResponse = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers,
      body: JSON.stringify(requestPayload),
      signal: AbortSignal.timeout(15000)
    });

    const data = await googleResponse.json().catch(() => null);

    if (!googleResponse.ok || !data) {
      const errMsg = data?.error?.message || `Google Routes API error (${googleResponse.status})`;
      console.warn("Google Routes API error response:", data);
      return NextResponse.json(
        { error: errMsg, details: data?.error },
        { status: googleResponse.status || 502 }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      console.error("Route compute proxy timed out");
      return NextResponse.json({ error: "Route computation timed out. Please try again." }, { status: 504 });
    }
    console.error("Route compute proxy error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error while computing route" },
      { status: 500 }
    );
  }
}
