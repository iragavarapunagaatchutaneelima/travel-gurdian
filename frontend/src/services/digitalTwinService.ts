import { RouteOption } from "../data/routeData";

/**
 * Client for the backend Digital Twin (/api/twin/*, via the same-origin
 * /backend-api proxy). The route geometry and POIs sent here are the real,
 * Google-computed ones the user already planned; the backend adds live
 * weather, river and official-alert data and never invents either side.
 */

export type ProviderStatus = "LIVE" | "FORECAST" | "CACHED" | "SIMULATED" | "UNAVAILABLE";
export type Exposure = "LOW" | "POSSIBLE" | "LIKELY" | "UNKNOWN";

export interface TwinSegmentImpact {
  index: number;
  start_km: number;
  end_km: number;
  mid: [number, number]; // [lat, lng]
  rain_mm_h: number | null;
  rain_source: "LIVE" | "SIMULATED" | "UNAVAILABLE";
  rain_class: string | null;
  river_level: string;
  exposure: Exposure;
  speed_reduction_pct: number | null;
  nearest_hospital: { name: string; distance_km: number } | null;
  hospital_reachable: boolean;
}

export interface TwinSignal {
  id: string;
  type: string;
  name: string;
  alert_level: string;
  is_current: boolean;
  from: string | null;
  to: string | null;
  lat: number;
  lng: number;
  distance_to_route_km: number;
  severity: string | null;
  report_url: string | null;
  source: string;
}

export interface TwinImpacts {
  mode: "LIVE" | "SIMULATED";
  route_weather_risk: "LOW" | "MODERATE" | "HIGH" | "UNKNOWN" | "UNAVAILABLE";
  affected_segments: number[];
  affected_km: number;
  total_km: number;
  flood_exposure: { likely: number; possible: number; segments: number };
  travel_impact: {
    baseline_duration_min: number | null;
    estimated_extra_min: number | null;
    extra_min_lower_bound?: number | null;
    method: string;
    advisory?: string;
  };
  emergency_readiness: { level: string; share_of_route_with_reachable_hospital?: number; hospitals_considered?: number; basis?: string; rule?: string; reason?: string };
  safe_locations_for_affected_segments: { name: string; type: string; distance_km: number; near_segment_km: number }[];
  segments: TwinSegmentImpact[];
  effects: { input: string; rule: string; output: unknown }[];
  uncertainty: {
    precipitation_probability_next_hours_max_pct: number | null;
    precipitation_probability_source: string | null;
    river_discharge: string;
    derived_impacts: string;
  };
}

export interface TwinState {
  mode: "LIVE" | "SIMULATED";
  generated_at: string;
  route: { name: string | null; distance_km: number | null; duration_min: number | null; safety_score: number | null; source: string; segments: unknown[] };
  traveler: { status: string; reason?: string };
  weather: { status: ProviderStatus; source: string; attribution?: string; fetched_at: string | null; reason?: string };
  flood: { status: ProviderStatus; source: string; fetched_at: string | null; method?: string; reason?: string };
  signals: { status: ProviderStatus; source: string; fetched_at: string | null; reason?: string; social_media?: string; signals: TwinSignal[] };
  services: { status: string; source: string; reason?: string | null; pois: unknown[] };
  simulation: null | { rainfall_mm_h: number; applied_to: string; note: string; created_at: string };
}

export interface TwinResponse {
  state: TwinState;
  impacts: TwinImpacts;
}

export interface TwinSimulationResponse extends TwinResponse {
  live_impacts: TwinImpacts;
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/backend-api/twin/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      detail = typeof j.detail === "string" ? j.detail : detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export function fetchTwinState(
  route: RouteOption,
  position: { latitude: number; longitude: number; accuracy?: number | null } | null,
  signal?: AbortSignal
): Promise<TwinResponse> {
  return postJson<TwinResponse>(
    "state",
    {
      route: {
        name: route.name,
        distance_km: route.distanceKm,
        duration_min: route.durationMinutes,
        safety_score: route.safetyScore,
        waypoints: route.waypoints,
      },
      pois: (route.pois || []).map((p) => ({ name: p.name, type: p.type, lat: p.latitude, lng: p.longitude })),
      traveler: position ? { lat: position.latitude, lng: position.longitude, accuracy_m: position.accuracy ?? null } : null,
    },
    signal
  );
}

export function simulateTwin(liveState: TwinState, rainfallMmH: number): Promise<TwinSimulationResponse> {
  return postJson<TwinSimulationResponse>("simulate", { state: liveState, rainfall_mm_h: rainfallMmH });
}
