"use client";

import React, { useEffect, useRef, useState } from "react";
import { CloudRain, X, Loader2, Waves, Siren, Clock, ShieldPlus, Route as RouteIcon, RotateCcw, FlaskConical, AlertTriangle, ExternalLink } from "lucide-react";
import { RouteOption } from "../../data/routeData";
import {
  fetchTwinState, simulateTwin, TwinResponse, TwinSimulationResponse, TwinImpacts, TwinSignal, TwinSegmentImpact, ProviderStatus,
} from "../../services/digitalTwinService";

export interface TwinOverlay {
  mode: "LIVE" | "SIMULATED";
  segments: TwinSegmentImpact[];
  signals: TwinSignal[];
}

interface Props {
  route: RouteOption;
  position: { latitude: number; longitude: number; accuracy?: number | null } | null;
  onOverlayChange: (overlay: TwinOverlay | null) => void;
  onClose: () => void;
}

// Display-only mirror of the backend's AMS/Met Office classes.
function rainLabel(mm: number): string {
  if (mm >= 50) return "violent";
  if (mm >= 7.6) return "heavy";
  if (mm >= 2.5) return "moderate";
  if (mm >= 0.1) return "light";
  return "none";
}

function timeOf(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const STATUS_STYLE: Record<string, string> = {
  LIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  FORECAST: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  CACHED: "bg-slate-500/10 text-slate-500 border-slate-500/30",
  SIMULATED: "bg-violet-500/10 text-violet-600 border-violet-500/30",
  UNAVAILABLE: "bg-rose-500/10 text-rose-600 border-rose-500/30",
};

const RISK_STYLE: Record<string, string> = {
  LOW: "text-emerald-600", MODERATE: "text-amber-600", HIGH: "text-rose-600", UNKNOWN: "text-slate-500", UNAVAILABLE: "text-slate-500",
};

function SourceChip({ label, status, time, reason }: { label: string; status: ProviderStatus; time?: string | null; reason?: string }) {
  return (
    <span title={reason || undefined} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[status] || STATUS_STYLE.CACHED}`}>
      {label}: {status}{time ? ` · ${timeOf(time)}` : ""}
    </span>
  );
}

function travelText(t: TwinImpacts["travel_impact"]): string {
  if (t.estimated_extra_min !== null && t.estimated_extra_min !== undefined) return `+${t.estimated_extra_min} min`;
  if (t.advisory) return `Not quantified${t.extra_min_lower_bound ? ` (≥ +${t.extra_min_lower_bound} min)` : ""}`;
  return "Unavailable";
}

export default function DigitalTwinPanel({ route, position, onOverlayChange, onClose }: Props) {
  const [live, setLive] = useState<TwinResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rain, setRain] = useState(20);
  const [sim, setSim] = useState<TwinSimulationResponse | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [view, setView] = useState<"LIVE" | "SIMULATED">("LIVE");
  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Re-model when the route changes. GPS is read once per load: the twin is
  // about the route corridor, so we don't refetch on every GPS tick.
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setSim(null);
    setView("LIVE");
    fetchTwinState(route, positionRef.current, ctrl.signal)
      .then((res) => setLive(res))
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setLive(null);
        setError(e?.message || "Digital Twin unavailable");
      })
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [route.id, route.name, route.waypoints?.length]);

  const shown: TwinImpacts | null = view === "SIMULATED" && sim ? sim.impacts : live?.impacts ?? null;

  useEffect(() => {
    if (!shown || !live) {
      onOverlayChange(null);
      return;
    }
    onOverlayChange({ mode: shown.mode, segments: shown.segments, signals: live.state.signals.signals || [] });
  }, [shown, live, onOverlayChange]);

  useEffect(() => () => onOverlayChange(null), [onOverlayChange]);

  const runSimulation = async () => {
    if (!live) return;
    setSimLoading(true);
    setError(null);
    try {
      const res = await simulateTwin(live.state, rain);
      setSim(res);
      setView("SIMULATED");
    } catch (e: any) {
      setError(e?.message || "Simulation failed");
    } finally {
      setSimLoading(false);
    }
  };

  const resetToLive = () => {
    setSim(null);
    setView("LIVE");
  };

  const st = live?.state;
  const liveIm = live?.impacts;
  const signals = st?.signals.signals || [];
  const liveRain = liveIm?.segments.map((s) => s.rain_mm_h).filter((v): v is number => v !== null) || [];

  return (
    <div className="h-full flex flex-col bg-surface border-l border-border shadow-2xl text-foreground" role="dialog" aria-label="Digital Twin">
      <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-extrabold"><Waves className="h-4 w-4 text-(--primary)" /> Digital Twin</div>
          <div className="text-[11px] text-(--muted-foreground) mt-0.5">Weather → roads → your route → safety</div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-elevated-surface" aria-label="Close Digital Twin"><X className="h-4 w-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {loading && (
          <div className="flex items-center gap-2 text-(--muted-foreground)"><Loader2 className="h-4 w-4 animate-spin" /> Fetching live weather, river and alert data along the route…</div>
        )}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 font-semibold">
            Digital Twin: {error}
          </div>
        )}

        {st && liveIm && (
          <>
            <div className="flex flex-wrap gap-1.5">
              <SourceChip label="Weather" status={st.weather.status} time={st.weather.fetched_at} reason={st.weather.reason} />
              <SourceChip label="River" status={st.flood.status} time={st.flood.fetched_at} reason={st.flood.reason} />
              <SourceChip label="Alerts" status={st.signals.status} time={st.signals.fetched_at} reason={st.signals.reason} />
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-elevated-surface border border-border" role="tablist">
              {(["LIVE", "SIMULATED"] as const).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  disabled={v === "SIMULATED" && !sim}
                  onClick={() => setView(v)}
                  className={`py-1.5 rounded-lg text-[11px] font-extrabold transition-all disabled:opacity-40 ${view === v ? (v === "LIVE" ? "bg-emerald-600 text-white" : "bg-violet-600 text-white") : "text-(--muted-foreground)"}`}
                >
                  {v} STATE
                </button>
              ))}
            </div>

            {view === "SIMULATED" && sim && (
              <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-700 dark:text-violet-300 font-semibold">
                Simulated: {sim.state.simulation?.rainfall_mm_h} mm/h on every segment. Your real journey, Safety Check, contacts and emergency state are unchanged.
              </div>
            )}

            {shown && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: RouteIcon, label: "Route weather risk", value: shown.route_weather_risk, live: liveIm.route_weather_risk, cls: RISK_STYLE[shown.route_weather_risk] },
                  { icon: Waves, label: "Flood exposure", value: `${shown.flood_exposure.likely} likely · ${shown.flood_exposure.possible} possible`, live: `${liveIm.flood_exposure.likely} · ${liveIm.flood_exposure.possible}` },
                  { icon: AlertTriangle, label: "Affected area", value: `${shown.affected_km} / ${shown.total_km} km`, live: `${liveIm.affected_km} km` },
                  { icon: Clock, label: "Travel impact", value: travelText(shown.travel_impact), live: travelText(liveIm.travel_impact) },
                  { icon: ShieldPlus, label: "Emergency readiness", value: shown.emergency_readiness.level, live: liveIm.emergency_readiness.level },
                  { icon: CloudRain, label: "Rainfall now (live)", value: liveRain.length ? `${Math.min(...liveRain)}–${Math.max(...liveRain)} mm/h` : "Unavailable", live: null },
                ].map((c) => (
                  <div key={c.label} className="p-2.5 rounded-xl bg-elevated-surface border border-border">
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-(--muted-foreground)"><c.icon className="h-3 w-3" />{c.label}</div>
                    <div className={`mt-1 text-sm font-extrabold ${c.cls || ""}`}>{c.value}</div>
                    {view === "SIMULATED" && c.live !== null && <div className="text-[10px] text-(--muted-foreground)">live: {c.live}</div>}
                  </div>
                ))}
              </div>
            )}

            {shown && shown.emergency_readiness.share_of_route_with_reachable_hospital !== undefined && (
              <div className="text-[10px] text-(--muted-foreground)">
                Readiness: {Math.round((shown.emergency_readiness.share_of_route_with_reachable_hospital || 0) * 100)}% of route segments have a hospital within 20 km and aren't flood-exposed. Based on {shown.emergency_readiness.basis}, not on every hospital near the road.
              </div>
            )}

            {shown?.travel_impact.advisory && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 font-semibold">{shown.travel_impact.advisory}</div>
            )}

            <div className="p-3 rounded-xl border border-dashed border-violet-500/40 bg-violet-500/5 space-y-2">
              <div className="flex items-center gap-1.5 font-extrabold"><FlaskConical className="h-4 w-4 text-violet-600" /> What-if: rainfall intensity</div>
              <input
                type="range" min={0} max={100} step={5} value={rain}
                onChange={(e) => setRain(Number(e.target.value))}
                className="w-full accent-violet-600"
                aria-label="Simulated rainfall in millimetres per hour"
              />
              <div className="flex justify-between text-[11px] font-bold">
                <span>{rain} mm/h</span><span className="uppercase text-(--muted-foreground)">{rainLabel(rain)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={runSimulation} disabled={simLoading} className="flex-1 py-2 rounded-lg bg-violet-600 text-white font-bold disabled:opacity-50">
                  {simLoading ? "Simulating…" : "Run simulation"}
                </button>
                <button onClick={resetToLive} disabled={!sim} className="px-3 py-2 rounded-lg border border-border font-bold disabled:opacity-40 flex items-center gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> Live
                </button>
              </div>
            </div>

            {shown && (
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-(--muted-foreground) mb-2">How the weather propagates</div>
                <ol className="relative ml-2 border-l-2 border-dotted border-(--primary)/40 space-y-3">
                  {shown.effects.map((e, i) => (
                    <li key={i} className="pl-4 relative">
                      <span className="absolute -left-[7px] top-0.5 h-3 w-3 rounded-full bg-(--primary) ring-2 ring-surface" />
                      <div className="font-bold">{e.rule}</div>
                      <div className="text-(--muted-foreground)">in: {e.input}</div>
                      <div>out: {typeof e.output === "string" ? e.output : JSON.stringify(e.output)}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {shown && shown.safe_locations_for_affected_segments.length > 0 && (
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-(--muted-foreground) mb-1">Nearest safe locations to affected stretches</div>
                <ul className="space-y-1">
                  {shown.safe_locations_for_affected_segments.map((l) => (
                    <li key={`${l.type}-${l.name}`} className="flex justify-between"><span>{l.name} <span className="text-(--muted-foreground)">({l.type})</span></span><span>{l.distance_km} km</span></li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-elevated-surface border border-border space-y-1">
              <div className="text-[10px] font-extrabold uppercase text-(--muted-foreground)">Uncertainty</div>
              <div>Rain probability, next hours (max along route): {liveIm.uncertainty.precipitation_probability_next_hours_max_pct !== null ? `${liveIm.uncertainty.precipitation_probability_next_hours_max_pct}%` : "unavailable"} <span className="text-(--muted-foreground)">— PREDICTION, Open-Meteo</span></div>
              <div>River discharge: GloFAS ensemble p25–p75 spread per segment</div>
              <div className="font-bold">Impacts above: DETERMINISTIC ESTIMATE (rule-based; no model confidence claimed)</div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-(--muted-foreground) mb-1"><Siren className="h-3 w-3" /> Official alerts near route (GDACS)</div>
              {st.signals.status === "UNAVAILABLE" ? (
                <div className="text-rose-600 font-semibold">PUBLIC SIGNALS UNAVAILABLE: {st.signals.reason}</div>
              ) : signals.length === 0 ? (
                <div className="text-(--muted-foreground)">No GDACS alerts within range of this route in the last 14 days.</div>
              ) : (
                <ul className="space-y-1.5">
                  {signals.map((s) => (
                    <li key={s.id} className="p-2 rounded-lg bg-elevated-surface border border-border">
                      <div className="flex justify-between font-bold"><span>{s.name}</span><span className={s.alert_level === "Red" ? "text-rose-600" : s.alert_level === "Orange" ? "text-amber-600" : "text-emerald-600"}>{s.alert_level}</span></div>
                      <div className="text-(--muted-foreground)">{s.type} · {s.distance_to_route_km} km from route{s.severity ? ` · ${s.severity}` : ""}</div>
                      {s.report_url && <a href={s.report_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-(--primary) font-semibold">GDACS report <ExternalLink className="h-3 w-3" /></a>}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-1 text-[10px] text-(--muted-foreground)">Social media feeds are not integrated (they require paid, authenticated API access); none are shown or invented.</div>
            </div>

            <div className="text-[10px] text-(--muted-foreground) border-t border-border pt-2">
              {st.weather.attribution} · River data: Copernicus GloFAS via Open-Meteo · Alerts: GDACS. Route and POIs: Google, unchanged by the twin. Modelled {timeOf(st.generated_at)}.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
