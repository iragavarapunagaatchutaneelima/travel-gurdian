/**
 * Server-side grounded answers for AI Guardian questions whose facts must
 * come from application data, never from an LLM:
 *
 *  - weather / rain / flooding  -> backend Digital Twin (Open-Meteo,
 *                                  GloFAS, GDACS) for the active route, or
 *                                  point weather at the GPS position
 *  - trusted contact            -> backend contact store (device-scoped)
 *
 * Replies are deterministic and cite sources + timestamps. An LLM (Nugen)
 * may later rephrase them, but only from the `data` returned here.
 */
import { LiveTravelContext } from "../types/gemini";

export interface GroundedAnswer {
  reply: string;
  tool: "readWeatherImpact" | "readTrustedContact";
  data: Record<string, unknown>;
}

const WEATHER_WORDS = ["weather", "rain", "flood", "storm", "cyclone", "monsoon", "waterlog", "precipitation", "thunder", "downpour"];
const CONTACT_WORDS = ["trusted contact", "emergency contact", "guardian contact", "my contact", "my guardian"];

export function isWeatherQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return WEATHER_WORDS.some((w) => p.includes(w));
}

export function isTrustedContactQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return CONTACT_WORDS.some((w) => p.includes(w));
}

function hhmm(iso?: string | null): string {
  if (!iso) return "unknown time";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso) : d.toISOString().slice(11, 16) + " UTC";
}

async function backendJson(url: string, init: RequestInit): Promise<any> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20000), cache: "no-store" });
  if (!res.ok) throw new Error(`backend HTTP ${res.status}`);
  return res.json();
}

export async function answerWeather(prompt: string, context: LiveTravelContext, backendUrl: string): Promise<GroundedAnswer> {
  const floodFocus = /flood|waterlog/i.test(prompt);
  const route = context.activeRoute;

  if (route?.waypoints && route.waypoints.length >= 2) {
    try {
      const twin = await backendJson(`${backendUrl}/twin/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: { name: route.name, distance_km: route.distanceKm, duration_min: route.durationMinutes, safety_score: route.safetyScore, waypoints: route.waypoints },
          pois: (route.pois || []).map((p) => ({ name: p.name, type: p.type, lat: p.latitude, lng: p.longitude })),
        }),
      });
      const { state, impacts } = twin;
      const rains = impacts.segments.map((s: any) => s.rain_mm_h).filter((v: any) => v !== null);
      const parts: string[] = [];
      if (state.weather.status === "UNAVAILABLE") {
        parts.push(`Live weather is unavailable right now (${state.weather.reason}).`);
      } else {
        parts.push(`Live weather along your route (${state.weather.source}, ${state.weather.status}, fetched ${hhmm(state.weather.fetched_at)}): rainfall ${rains.length ? `${Math.min(...rains)}–${Math.max(...rains)} mm/h` : "not reported"}.`);
        const p = impacts.uncertainty.precipitation_probability_next_hours_max_pct;
        if (p !== null && p !== undefined) parts.push(`Forecast chance of rain in the next few hours: up to ${p}% (model prediction).`);
      }
      const risk = impacts.route_weather_risk;
      const fe = impacts.flood_exposure;
      parts.push(`Route weather risk: ${risk}. Flood/waterlogging exposure: ${fe.likely} of ${fe.segments} segments likely, ${fe.possible} possible (${impacts.affected_km} of ${impacts.total_km} km).`);
      const t = impacts.travel_impact;
      if (t.estimated_extra_min !== null && t.estimated_extra_min !== undefined) parts.push(`Estimated weather delay: +${t.estimated_extra_min} min (FHWA-based estimate).`);
      else if (t.advisory) parts.push(t.advisory);
      if (floodFocus) {
        const assessed = impacts.segments.filter((s: any) => ["NORMAL", "ELEVATED", "HIGH"].includes(s.river_level));
        const elevated = assessed.filter((s: any) => s.river_level !== "NORMAL").length;
        const notAssessed = impacts.segments.length - assessed.length;
        parts.push(state.flood.status === "UNAVAILABLE"
          ? `River data is unavailable (${state.flood.reason}).`
          : assessed.length === 0
            ? "River levels: no significant modelled river along this route, so river flooding can't be assessed from GloFAS."
            : `River levels (GloFAS): ${elevated} of ${assessed.length} assessed segment(s) elevated vs their own recent median${notAssessed ? ` (${notAssessed} segment(s) have no significant modelled river)` : ""}; a relative signal, not an official flood warning.`);
      }
      const sigs = state.signals.signals || [];
      if (state.signals.status === "UNAVAILABLE") parts.push(`Official alerts are unavailable (${state.signals.reason}).`);
      else parts.push(sigs.length
        ? `Official alerts near the route (GDACS): ${sigs.slice(0, 3).map((s: any) => `${s.name} (${s.alert_level}, ${s.distance_to_route_km} km away)`).join("; ")}.`
        : "No official GDACS alerts near the route in the last 14 days.");
      parts.push("Impacts are deterministic estimates. Open the Digital Twin on Live Map to simulate heavier rain.");
      return {
        reply: parts.join(" "),
        tool: "readWeatherImpact",
        data: {
          scope: "route",
          weather_status: state.weather.status, weather_source: state.weather.source, weather_fetched_at: state.weather.fetched_at,
          rainfall_mm_h_range: rains.length ? [Math.min(...rains), Math.max(...rains)] : null,
          precipitation_probability_max_pct: impacts.uncertainty.precipitation_probability_next_hours_max_pct,
          route_weather_risk: risk, flood_exposure: fe, affected_km: impacts.affected_km, total_km: impacts.total_km,
          travel_impact: t, emergency_readiness: impacts.emergency_readiness,
          alerts: sigs.slice(0, 5).map((s: any) => ({ name: s.name, level: s.alert_level, distance_km: s.distance_to_route_km })),
          alerts_status: state.signals.status,
        },
      };
    } catch (e: any) {
      return { reply: `The Digital Twin service couldn't be reached (${e?.message}), so I can't assess weather impact on your route right now.`, tool: "readWeatherImpact", data: { scope: "route", available: false } };
    }
  }

  const pos = context.currentPosition || (context.locationSnapshot as any);
  if (pos?.latitude !== undefined && pos?.longitude !== undefined && pos.latitude !== null) {
    try {
      const w = await backendJson(`${backendUrl}/twin/weather?lat=${pos.latitude}&lng=${pos.longitude}`, { method: "GET" });
      if (w.status === "UNAVAILABLE" || !w.point) {
        return { reply: `Live weather is unavailable right now (${w.reason || "no data"}).`, tool: "readWeatherImpact", data: { scope: "point", available: false } };
      }
      const pt = w.point;
      return {
        reply: `Current weather at your GPS position (${w.source}, observed ${pt.observed_at}): ${pt.condition}, ${pt.temperature_c}°C, wind ${pt.wind_kmh} km/h, rainfall ${pt.precip_rate_mm_h} mm/h. No route is planned, so I can't assess impact on a journey. Plan one to see route-level weather risk.`,
        tool: "readWeatherImpact",
        data: { scope: "point", ...pt, source: w.source, status: w.status },
      };
    } catch (e: any) {
      return { reply: `The weather service couldn't be reached (${e?.message}).`, tool: "readWeatherImpact", data: { scope: "point", available: false } };
    }
  }

  return {
    reply: "I can't check the weather without a planned route or your GPS position. Enable location or plan a journey first.",
    tool: "readWeatherImpact",
    data: { available: false, reason: "no route and no GPS" },
  };
}

function mask(phone: string): string {
  const d = phone.replace(/[^\d+]/g, "");
  return d.length > 8 ? `${d.slice(0, 5)}${"*".repeat(d.length - 8)}${d.slice(-3)}` : "****";
}

export async function answerTrustedContact(cookieHeader: string | null, backendUrl: string): Promise<GroundedAnswer> {
  try {
    const contacts = await backendJson(`${backendUrl}/assist/contacts`, {
      method: "GET",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    });
    const enabled = (contacts || []).filter((c: any) => c.is_enabled);
    const primary = enabled.find((c: any) => c.is_primary) || enabled[0];
    if (!primary) {
      return { reply: "You don't have a trusted contact configured yet. Add one on the Emergency page so Safety Check and SOS have someone to notify.", tool: "readTrustedContact", data: { configured: false } };
    }
    return {
      reply: `Your primary trusted contact is ${primary.name}${primary.relation ? ` (${primary.relation})` : ""}, ${mask(primary.phone)}. Travel Guardian doesn't track your contact's location, so it can't tell you where they are.`,
      tool: "readTrustedContact",
      data: { configured: true, name: primary.name, relation: primary.relation, phone_masked: mask(primary.phone), enabled_contacts: enabled.length, location_known: false },
    };
  } catch (e: any) {
    return { reply: `I couldn't reach the contact service (${e?.message}), so I can't confirm your trusted contact right now.`, tool: "readTrustedContact", data: { available: false } };
  }
}
