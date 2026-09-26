import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { origin, destination, travelMode, computeAlternativeRoutes, languageCode } = body;

    if (!origin || !destination) {
      return NextResponse.json(
        { error: "Origin and destination are required" },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GOOGLE_ROUTES_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      "";

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
    if (origin.latitude != null && origin.longitude != null && !isNaN(Number(origin.latitude)) && !isNaN(Number(origin.longitude))) {
      requestPayload.origin = {
        location: {
          latLng: {
            latitude: Number(origin.latitude),
            longitude: Number(origin.longitude)
          }
        }
      };
    } else if (origin.placeId) {
      requestPayload.origin = { placeId: origin.placeId };
    } else if (origin.address || origin.name) {
      requestPayload.origin = { address: origin.address || origin.name };
    } else {
      return NextResponse.json({ error: "Invalid origin coordinates or location" }, { status: 400 });
    }

    // Format destination
    if (destination.latitude != null && destination.longitude != null && !isNaN(Number(destination.latitude)) && !isNaN(Number(destination.longitude))) {
      requestPayload.destination = {
        location: {
          latLng: {
            latitude: Number(destination.latitude),
            longitude: Number(destination.longitude)
          }
        }
      };
    } else if (destination.placeId) {
      requestPayload.destination = { placeId: destination.placeId };
    } else if (destination.address || destination.name) {
      requestPayload.destination = { address: destination.address || destination.name };
    } else {
      return NextResponse.json({ error: "Invalid destination coordinates or location" }, { status: 400 });
    }

    const fieldMask = [
      "routes.duration",
      "routes.distanceMeters",
      "routes.description",
      "routes.warnings",
      "routes.routeLabels",
      "routes.polyline.encodedPolyline",
      "routes.legs.steps.navigationInstruction",
      "routes.legs.steps.distanceMeters",
      "routes.legs.steps.staticDuration",
      "routes.legs.steps.startLocation",
      "routes.legs.steps.endLocation",
      "routes.legs.steps.polyline.encodedPolyline"
    ].join(",");

    // Forward the current host / referer to satisfy Google Cloud API key restrictions
    const clientReferer = req.headers.get("referer") || "http://localhost:3000/";

    const googleResponse = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
        "Referer": clientReferer
      },
      body: JSON.stringify(requestPayload)
    });

    const data = await googleResponse.json();

    if (!googleResponse.ok) {
      const errMsg = data?.error?.message || `Google Routes API error (${googleResponse.status})`;
      console.warn("Google Routes API error response:", data);
      return NextResponse.json(
        { error: errMsg, details: data?.error },
        { status: googleResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Route compute proxy error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error while computing route" },
      { status: 500 }
    );
  }
}
