"use client";

import React, { useState } from "react";
import { 
  NavigationStatus, 
  NavigationPosition, 
  RouteProgress, 
  ManeuverInfo, 
  RerouteProposal,
  ManeuverType
} from "../../types/navigation";
import { RouteOption } from "../../data/routeData";
import { formatSpeedKmh, formatHeading } from "../../services/navigationMath";
import { 
  Navigation, 
  ArrowUpRight, 
  ArrowUpLeft, 
  ArrowUp, 
  CornerUpLeft, 
  CornerUpRight, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Compass, 
  Gauge, 
  Clock, 
  MapPin, 
  X, 
  RefreshCw, 
  Crosshair, 
  Sparkles,
  ShieldCheck,
  Fuel,
  Hospital
} from "lucide-react";

interface LiveNavigationOverlayProps {
  status: NavigationStatus;
  activeRoute: RouteOption;
  currentPosition: NavigationPosition | null;
  progress: RouteProgress | null;
  currentManeuver: ManeuverInfo | null;
  nextManeuver: ManeuverInfo | null;
  isFollowMode: boolean;
  gpsAccuracyWarning: boolean;
  rerouteProposal: RerouteProposal | null;
  isRerouting: boolean;
  safetyWidget?: React.ReactNode;
  onRecenter: () => void;
  onEndNavigation: () => void;
  onRequestReroute: () => void;
  onApproveReroute: () => void;
  onRejectReroute: () => void;
}

export function ManeuverIconComponent({ type, className = "h-8 w-8", style }: { type: ManeuverType; className?: string; style?: React.CSSProperties }) {
  switch (type) {
    case "turn-left":
    case "turn-sharp-left":
      return <CornerUpLeft className={className} style={style} />;
    case "turn-right":
    case "turn-sharp-right":
      return <CornerUpRight className={className} style={style} />;
    case "turn-slight-left":
    case "fork-left":
    case "ramp-left":
      return <ArrowUpLeft className={className} style={style} />;
    case "turn-slight-right":
    case "fork-right":
    case "ramp-right":
      return <ArrowUpRight className={className} style={style} />;
    case "uturn-left":
    case "uturn-right":
      return <RotateCcw className={className} style={style} />;
    case "arrive":
      return <MapPin className={className} style={style} />;
    case "straight":
    default:
      return <ArrowUp className={className} style={style} />;
  }
}

export default function LiveNavigationOverlay({
  status,
  activeRoute,
  currentPosition,
  progress,
  currentManeuver,
  nextManeuver,
  isFollowMode,
  gpsAccuracyWarning,
  rerouteProposal,
  isRerouting,
  safetyWidget,
  onRecenter,
  onEndNavigation,
  onRequestReroute,
  onApproveReroute,
  onRejectReroute
}: LiveNavigationOverlayProps) {
  const [isAccuracyDismissed, setIsAccuracyDismissed] = useState(false);
  const [showMobileSafety, setShowMobileSafety] = useState(false);

  if (status === "READY" || status === "ENDED") {
    return null;
  }

  // 1. ARRIVAL SCREEN MODAL
  if (status === "ARRIVED") {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/70"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <div className="w-full max-w-md rounded-3xl p-6 text-center space-y-5 shadow-2xl animate-fadeIn bg-surface border-2 border-emerald-500 text-foreground">
          <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto bg-emerald-500/15 text-emerald-500 border-2 border-emerald-500/40">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
              JOURNEY COMPLETED
            </span>
            <h3 className="text-2xl font-extrabold mt-1 text-foreground">You Have Arrived!</h3>
            <p className="text-xs text-(--muted-foreground) mt-1">
              Destination reached safely via {activeRoute.name}.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl text-center bg-elevated-surface border border-border">
            <div>
              <span className="text-[10px] text-(--muted-foreground) uppercase font-bold block">Distance</span>
              <p className="text-sm font-extrabold text-foreground mt-0.5">{activeRoute.distance}</p>
            </div>
            <div>
              <span className="text-[10px] text-(--muted-foreground) uppercase font-bold block">Safety Fit</span>
              <p className="text-sm font-extrabold text-emerald-500 mt-0.5">{activeRoute.safetyScore}/100</p>
            </div>
            <div>
              <span className="text-[10px] text-(--muted-foreground) uppercase font-bold block">Status</span>
              <p className="text-sm font-extrabold text-foreground mt-0.5">Arrived</p>
            </div>
          </div>

          <button
            onClick={onEndNavigation}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-xs transition-all shadow-md bg-(--primary) hover:bg-blue-600 active:scale-98 cursor-pointer"
          >
            Finish &amp; Close Navigation
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ============================================================
          TOP-LEFT: TURN-BY-TURN MANEUVER CARD & ALERTS
          ============================================================ */}
      <div 
        className="pointer-events-none absolute top-4 left-3 right-16 sm:right-auto md:left-6 md:w-96 z-40 animate-slideDown flex flex-col gap-2.5" 
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <div
          className="pointer-events-auto rounded-3xl p-4 text-left space-y-3 shadow-2xl backdrop-blur-xl border border-white/15 text-white"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.88)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)"
          }}
        >
          {/* Main Next Turn Action */}
          <div className="flex items-center gap-3.5">
            <div
              className="h-13 w-13 rounded-2xl flex items-center justify-center shrink-0 shadow-md bg-blue-600 text-white"
            >
              <ManeuverIconComponent type={currentManeuver?.maneuverType || "straight"} className="h-7 w-7 stroke-[2.5]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-400 tracking-wider uppercase">
                  In {currentManeuver?.distanceText || "100 m"}
                </span>
                <span className="text-[10px] font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded-md">
                  Step {currentManeuver?.stepIndex || 1}/{currentManeuver?.totalSteps || 1}
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-white mt-1 leading-snug truncate">
                {currentManeuver?.instruction || "Continue on route"}
              </h4>
            </div>
          </div>

          {/* Next Maneuver Preview */}
          {nextManeuver && (
            <div className="pt-2 flex items-center justify-between text-xs border-t border-white/10 text-slate-300">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[10px] font-bold uppercase text-slate-400">Then:</span>
                <ManeuverIconComponent type={nextManeuver.maneuverType} className="h-3.5 w-3.5 shrink-0 text-white" />
                <span className="text-[11px] font-semibold text-white truncate">{nextManeuver.instruction}</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400 ml-2 shrink-0">{nextManeuver.distanceText}</span>
            </div>
          )}
        </div>

        {/* GPS ACCURACY WARNING BANNER - Natural Stack Below Maneuver Card */}
        {gpsAccuracyWarning && !isAccuracyDismissed && (
          <div className="pointer-events-auto p-2.5 rounded-2xl flex items-center justify-between gap-2 shadow-lg text-xs backdrop-blur-md bg-amber-500/20 border border-amber-500/40 text-amber-200 animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span className="text-[11px] font-semibold truncate">
                GPS accuracy is low ({currentPosition?.accuracy ? Math.round(currentPosition.accuracy) : 50}m). Navigation continues.
              </span>
            </div>
            <button
              onClick={() => setIsAccuracyDismissed(true)}
              className="p-1 rounded-lg hover:bg-amber-500/30 text-amber-300 transition-colors shrink-0 cursor-pointer"
              title="Dismiss accuracy notice"
              aria-label="Dismiss accuracy notice"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* OFF-ROUTE NOTICE BANNER & RECALCULATE PROMPT - Natural Stack */}
        {status === "OFF_ROUTE" && !rerouteProposal && (
          <div className="pointer-events-auto rounded-3xl p-4 shadow-2xl text-left space-y-3 backdrop-blur-xl bg-slate-900/90 border-2 border-rose-500 text-white animate-fadeIn">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              <h4 className="text-xs font-extrabold uppercase tracking-wider">Off Planned Route</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You are {progress?.distanceToRouteMeters ? Math.round(progress.distanceToRouteMeters) : 100}m away from the corridor. Would you like to calculate a new real Google route from your current GPS position?
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={onRequestReroute}
                disabled={isRerouting}
                className="flex-1 py-2.5 px-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md bg-blue-600 hover:bg-blue-500 transition-all cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRerouting ? "animate-spin" : ""}`} />
                <span>Recalculate Route</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          TOP-RIGHT: SAFETY CHECK-IN WIDGET (RIGHT SIDE) & MAP CONTROLS
          ============================================================ */}
      <div 
        className="pointer-events-none absolute top-4 right-3 sm:right-4 z-40 flex items-start gap-2.5 sm:gap-3"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        {/* Safety Check-In HUD Widget - Relocated to Right Side on Desktop/Tablet */}
        {safetyWidget && (
          <div className="pointer-events-auto hidden md:block w-80 lg:w-84 shadow-2xl animate-slideDown">
            {safetyWidget}
          </div>
        )}

        {/* Floating Action Cluster */}
        <div className="pointer-events-auto flex flex-col gap-2">
          {/* Mobile Safety Check-In Toggle Pill */}
          {safetyWidget && (
            <button
              onClick={() => setShowMobileSafety(prev => !prev)}
              className={`md:hidden p-3 rounded-2xl shadow-lg transition-all cursor-pointer backdrop-blur-md border active:scale-95 ${
                showMobileSafety
                  ? "bg-emerald-600 text-white border-emerald-400/50 shadow-emerald-600/30"
                  : "bg-slate-900/85 hover:bg-slate-800 text-emerald-400 border-white/15"
              }`}
              title="Toggle Safety Check-In"
              aria-label="Toggle Safety Check-In"
            >
              <ShieldCheck className="h-5 w-5" />
            </button>
          )}

          {/* Emergency SOS Button */}
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/emergency";
              }
            }}
            className="p-3 rounded-2xl shadow-lg transition-all cursor-pointer backdrop-blur-md bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-400/40 shadow-rose-600/30 active:scale-95"
            title="Emergency SOS / 112 Protocol"
            aria-label="Emergency SOS"
          >
            <AlertTriangle className="h-5 w-5 text-white" />
          </button>

          {/* Re-center Camera Button */}
          <button
            onClick={onRecenter}
            className="p-3 rounded-2xl shadow-lg transition-all cursor-pointer backdrop-blur-md"
            style={{
              backgroundColor: isFollowMode ? "#2563FF" : "rgba(15, 23, 42, 0.85)",
              color: "#FFFFFF",
              border: isFollowMode ? "1px solid #3B82F6" : "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: isFollowMode ? "0 4px 16px rgba(37,99,255,0.4)" : "0 4px 16px rgba(0,0,0,0.25)",
            }}
            title={isFollowMode ? "Camera following user" : "Re-center camera on GPS"}
            aria-label="Re-center camera"
          >
            <Crosshair className={`h-5 w-5 ${isFollowMode ? "animate-spin-slow" : ""}`} />
          </button>

          {/* End Live Navigation Button */}
          <button
            onClick={onEndNavigation}
            className="p-3 rounded-2xl transition-all cursor-pointer backdrop-blur-md hover:bg-red-700 active:scale-95"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.85)",
              color: "#FFFFFF",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
            }}
            title="End Live Navigation"
            aria-label="End Live Navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* MOBILE SAFETY CHECK-IN FLOATING DRAWER */}
      {showMobileSafety && safetyWidget && (
        <div className="md:hidden fixed inset-x-3 top-20 z-50 p-2 animate-fadeIn pointer-events-auto">
          <div className="relative shadow-2xl rounded-3xl overflow-hidden border border-white/20 bg-surface">
            <button
              onClick={() => setShowMobileSafety(false)}
              className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full bg-slate-800/90 text-white shadow-md border border-white/20 hover:bg-slate-700 cursor-pointer"
              aria-label="Close Safety Check-In"
            >
              <X className="h-4 w-4" />
            </button>
            {safetyWidget}
          </div>
        </div>
      )}

      {/* USER-APPROVED REROUTE PROPOSAL MODAL */}
      {rerouteProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/70" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <div className="w-full max-w-md rounded-3xl p-6 text-left space-y-4 shadow-2xl animate-fadeIn bg-surface border border-border text-foreground">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-(--primary)" />
                <h3 className="text-base font-extrabold text-foreground">New Route Available</h3>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Fit: {rerouteProposal.newRoute.safetyScore}/100
              </span>
            </div>

            <p className="text-xs text-(--muted-foreground) leading-relaxed">
              Google Directions calculated a new real road route from your current position.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-elevated-surface border border-border">
                <span className="text-[10px] text-(--muted-foreground) font-bold block">New Distance</span>
                <p className="text-sm font-extrabold text-foreground mt-0.5">{rerouteProposal.newRoute.distance}</p>
              </div>
              <div className="p-3 rounded-2xl bg-elevated-surface border border-border">
                <span className="text-[10px] text-(--muted-foreground) font-bold block">New Est. Duration</span>
                <p className="text-sm font-extrabold text-foreground mt-0.5">{rerouteProposal.newRoute.time}</p>
              </div>
            </div>

            {/* Why This Route */}
            <div className="space-y-1.5 p-3 rounded-2xl text-xs bg-elevated-surface border border-border">
              <span className="text-[10px] font-extrabold text-(--primary) uppercase tracking-wider block">
                Safety Engine Assessment
              </span>
              {rerouteProposal.explanation.map((item, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-[11px] text-(--muted-foreground) font-medium">
                  <span className="text-(--primary) font-extrabold">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onRejectReroute}
                className="flex-1 py-3 rounded-2xl text-xs font-bold transition-all bg-elevated-surface border border-border text-(--muted-foreground) hover:bg-surface cursor-pointer"
              >
                Keep Current Route
              </button>
              <button
                onClick={onApproveReroute}
                className="flex-1 py-3 rounded-2xl text-white font-bold text-xs transition-all shadow-md bg-(--primary) hover:bg-blue-600 cursor-pointer"
              >
                Use New Route
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
      {/* ============================================================
          BOTTOM TELEMETRY OVERLAY — Semi-Transparent Glassmorphism HUD
          ============================================================ */}
      <div 
        className="pointer-events-none absolute left-2 right-2 sm:left-6 sm:right-6 lg:max-w-2xl lg:mx-auto lg:left-0 lg:right-0 z-40 animate-slideUp"
        style={{
          fontFamily: "'Poppins', sans-serif",
          bottom: "max(12px, env(safe-area-inset-bottom, 12px))"
        }}
      >
        <div
          className="pointer-events-auto rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl backdrop-blur-xl border border-white/20 text-white space-y-2.5 sm:space-y-3"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.90)",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.50), 0 0 0 1px rgba(255, 255, 255, 0.12)"
          }}
        >
          {/* Telemetry Metrics Grid: ETA | SPEED | HEADING | SAFETY */}
          <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center">
            
            {/* ETA */}
            <div className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col justify-center min-h-[52px] sm:min-h-16">
              <span className="text-[9px] sm:text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center justify-center gap-0.5 sm:gap-1">
                <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-400 shrink-0" /> ETA
              </span>
              <p className="text-xs sm:text-base font-black text-white mt-0.5 sm:mt-1 truncate">
                {progress?.etaString || activeRoute.time || "--"}
              </p>
            </div>

            {/* SPEED */}
            <div className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col justify-center min-h-[52px] sm:min-h-16">
              <span className="text-[9px] sm:text-[10px] font-bold text-cyan-300 uppercase tracking-wider flex items-center justify-center gap-0.5 sm:gap-1">
                <Gauge className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-cyan-400 shrink-0" /> SPEED
              </span>
              <p className="text-xs sm:text-base font-black text-white mt-0.5 sm:mt-1 truncate">
                {formatSpeedKmh(currentPosition?.speed ?? null)}
              </p>
            </div>

            {/* HEADING */}
            <div className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col justify-center min-h-[52px] sm:min-h-16">
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center justify-center gap-0.5 sm:gap-1">
                <Compass className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-400 shrink-0" /> HEADING
              </span>
              <p className="text-xs sm:text-base font-black text-white mt-0.5 sm:mt-1 truncate">
                {formatHeading(currentPosition?.heading ?? null)}
              </p>
            </div>

            {/* SAFETY FIT */}
            <div className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl bg-emerald-500/15 backdrop-blur-md border border-emerald-500/30 flex flex-col justify-center min-h-[52px] sm:min-h-16">
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center justify-center gap-0.5 sm:gap-1">
                <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-400 shrink-0" /> SAFETY
              </span>
              <p className="text-xs sm:text-base font-black text-emerald-400 mt-0.5 sm:mt-1 truncate">
                {activeRoute.safetyScore}
              </p>
            </div>

          </div>

          {/* Progress Bar & Distance Remaining */}
          <div className="space-y-1 sm:space-y-1.5 pt-0.5">
            <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-semibold text-slate-200">
              <span className="flex items-center gap-1 sm:gap-1.5 truncate max-w-[68%]">
                <MapPin className="h-3 w-3 text-blue-400 shrink-0" />
                <span className="truncate">
                  {progress 
                    ? `${(progress.distanceRemainingMeters / 1000).toFixed(1)} km remaining (${activeRoute.name})` 
                    : `${activeRoute.distance} remaining`}
                </span>
              </span>
              <span className="text-blue-300 font-extrabold shrink-0 ml-1.5">
                {progress?.progressPercent ?? 0}% Complete
              </span>
            </div>

            <div className="h-1.5 sm:h-2 w-full rounded-full overflow-hidden bg-white/20">
              <div 
                className="h-full rounded-full transition-all duration-300 bg-linear-to-r from-blue-500 via-indigo-500 to-emerald-400 shadow-sm"
                style={{ width: `${Math.min(100, Math.max(0, progress?.progressPercent || 0))}%` }}
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
