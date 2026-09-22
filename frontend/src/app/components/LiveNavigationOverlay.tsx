"use client";

import React from "react";
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

export function ManeuverIconComponent({ type, className = "h-8 w-8" }: { type: ManeuverType; className?: string }) {
  switch (type) {
    case "turn-left":
    case "turn-sharp-left":
      return <CornerUpLeft className={className} />;
    case "turn-right":
    case "turn-sharp-right":
      return <CornerUpRight className={className} />;
    case "turn-slight-left":
    case "fork-left":
    case "ramp-left":
      return <ArrowUpLeft className={className} />;
    case "turn-slight-right":
    case "fork-right":
    case "ramp-right":
      return <ArrowUpRight className={className} />;
    case "uturn-left":
    case "uturn-right":
      return <RotateCcw className={className} />;
    case "arrive":
      return <MapPin className={className} />;
    case "straight":
    default:
      return <ArrowUp className={className} />;
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
  if (status === "READY" || status === "ENDED") {
    return null;
  }

  // 1. ARRIVAL SCREEN MODAL
  if (status === "ARRIVED") {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface border border-success/40 rounded-3xl p-6 text-center space-y-5 shadow-2xl animate-fadeIn">
          <div className="h-16 w-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto border-2 border-success">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div>
            <span className="text-[10px] font-black text-success uppercase tracking-widest block">
              JOURNEY COMPLETED
            </span>
            <h3 className="text-2xl font-black text-foreground mt-1">You Have Arrived!</h3>
            <p className="text-xs text-muted font-semibold mt-1">
              Destination reached safely via {activeRoute.name}.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-elevated-surface border border-border text-center">
            <div>
              <span className="text-[9px] text-muted uppercase font-bold block">Distance</span>
              <p className="text-sm font-black text-foreground mt-0.5">{activeRoute.distance}</p>
            </div>
            <div>
              <span className="text-[9px] text-muted uppercase font-bold block">Safety Fit</span>
              <p className="text-sm font-black text-success mt-0.5">{activeRoute.safetyScore}/100</p>
            </div>
            <div>
              <span className="text-[9px] text-muted uppercase font-bold block">Status</span>
              <p className="text-sm font-black text-foreground mt-0.5">Arrived</p>
            </div>
          </div>

          <button
            onClick={onEndNavigation}
            className="w-full py-3.5 rounded-2xl bg-primary-accent hover:bg-primary-accent-hover text-white font-black text-xs transition-all shadow-lg"
          >
            Finish & Close Navigation
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* TOP TURN-BY-TURN MANEUVER CARD & SAFETY CHECK-IN */}
      <div className="absolute top-4 left-4 right-4 md:left-6 md:right-auto md:w-96 z-40 animate-slideDown space-y-3">
        <div className="rounded-3xl border border-border bg-surface/95 backdrop-blur-md p-4 shadow-xl text-left space-y-3">
          
          {/* Main Next Turn Action */}
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 rounded-2xl bg-primary-accent text-white flex items-center justify-center shrink-0 shadow-md">
              <ManeuverIconComponent type={currentManeuver?.maneuverType || "straight"} className="h-7 w-7 stroke-[2.5]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-primary-accent tracking-wide uppercase">
                  In {currentManeuver?.distanceText || "100 m"}
                </span>
                <span className="text-[9px] font-bold text-muted bg-elevated-surface px-2 py-0.5 rounded-md border border-border">
                  Step {currentManeuver?.stepIndex || 1} of {currentManeuver?.totalSteps || 1}
                </span>
              </div>
              <h4 className="text-sm font-black text-foreground truncate mt-0.5 leading-tight">
                {currentManeuver?.instruction || "Continue on route"}
              </h4>
            </div>
          </div>

          {/* Next Maneuver Preview */}
          {nextManeuver && (
            <div className="pt-2 border-t border-border/80 flex items-center justify-between text-xs text-muted">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[10px] font-bold uppercase text-muted">Then:</span>
                <ManeuverIconComponent type={nextManeuver.maneuverType} className="h-3.5 w-3.5 text-foreground shrink-0" />
                <span className="text-foreground font-semibold truncate text-[11px]">{nextManeuver.instruction}</span>
              </div>
              <span className="text-[10px] font-bold text-muted ml-2 shrink-0">{nextManeuver.distanceText}</span>
            </div>
          )}

        </div>

        {/* Phase 5 Safety Check-In HUD Widget */}
        {safetyWidget}
      </div>

      {/* FLOATING MAP CONTROLS (Re-center / Follow Me / Exit) */}
      <div className="absolute top-4 right-4 z-40 flex flex-col gap-2">
        <button
          onClick={onRecenter}
          className={`p-3 rounded-2xl border shadow-md backdrop-blur-md transition-all ${
            isFollowMode 
              ? "bg-primary-accent text-white border-primary-accent shadow-primary-accent/30" 
              : "bg-surface/90 text-foreground border-border hover:bg-surface"
          }`}
          title={isFollowMode ? "Camera following user" : "Re-center camera on GPS"}
        >
          <Crosshair className={`h-5 w-5 ${isFollowMode ? "animate-spin-slow" : ""}`} />
        </button>

        <button
          onClick={onEndNavigation}
          className="p-3 rounded-2xl bg-surface/90 hover:bg-danger text-foreground hover:text-white border border-border shadow-md backdrop-blur-md transition-all"
          title="End Live Navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* GPS ACCURACY WARNING BANNER */}
      {gpsAccuracyWarning && (
        <div className="absolute top-28 left-4 right-4 md:left-6 md:right-auto md:w-96 z-40 animate-fadeIn">
          <div className="p-2.5 rounded-2xl bg-warning/15 border border-warning/30 text-warning text-xs font-bold flex items-center gap-2 backdrop-blur-md shadow-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-[11px]">GPS accuracy is low ({currentPosition?.accuracy ? Math.round(currentPosition.accuracy) : 50}m). Navigation continues.</span>
          </div>
        </div>
      )}

      {/* OFF-ROUTE NOTICE BANNER & RECALCULATE PROMPT */}
      {status === "OFF_ROUTE" && !rerouteProposal && (
        <div className="absolute top-36 left-4 right-4 md:left-6 md:right-auto md:w-96 z-40 animate-fadeIn">
          <div className="rounded-3xl border border-rose-500/50 bg-surface/95 backdrop-blur-md p-4 shadow-2xl text-left space-y-3">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              <h4 className="font-black text-xs uppercase tracking-wider">Off Planned Route</h4>
            </div>
            <p className="text-xs text-muted font-semibold leading-relaxed">
              You are {progress?.distanceToRouteMeters ? Math.round(progress.distanceToRouteMeters) : 100}m away from the corridor. Would you like to calculate a new real Google route from your current GPS position?
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={onRequestReroute}
                disabled={isRerouting}
                className="flex-1 py-2.5 px-3 rounded-xl bg-primary-accent hover:bg-primary-accent-hover text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                {isRerouting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                <span>Recalculate Route</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER-APPROVED REROUTE PROPOSAL MODAL */}
      {rerouteProposal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-primary-accent/40 rounded-3xl p-6 text-left space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary-accent" />
                <h3 className="font-black text-base text-foreground">New Route Available</h3>
              </div>
              <span className="text-[10px] font-black text-success bg-success/15 px-2 py-0.5 rounded-md">
                Fit: {rerouteProposal.newRoute.safetyScore}/100
              </span>
            </div>

            <p className="text-xs text-muted font-semibold leading-relaxed">
              Google Directions calculated a new real road route from your current position.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-elevated-surface border border-border">
                <span className="text-[10px] text-muted font-bold block">New Distance</span>
                <p className="font-black text-foreground mt-0.5">{rerouteProposal.newRoute.distance}</p>
              </div>
              <div className="p-3 rounded-2xl bg-elevated-surface border border-border">
                <span className="text-[10px] text-muted font-bold block">New Est. Duration</span>
                <p className="font-black text-foreground mt-0.5">{rerouteProposal.newRoute.time}</p>
              </div>
            </div>

            {/* Why This Route */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-elevated-surface border border-border text-xs">
              <span className="text-[10px] font-black text-primary-accent uppercase tracking-wider block">
                Safety Engine Assessment
              </span>
              {rerouteProposal.explanation.map((item, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-muted font-semibold text-[11px]">
                  <span className="text-primary-accent font-black">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onRejectReroute}
                className="flex-1 py-3 rounded-2xl bg-elevated-surface hover:bg-border text-muted font-black text-xs transition-all border border-border"
              >
                Keep Current Route
              </button>
              <button
                onClick={onApproveReroute}
                className="flex-1 py-3 rounded-2xl bg-primary-accent hover:bg-primary-accent-hover text-white font-black text-xs transition-all shadow-md"
              >
                Use New Route
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM TELEMETRY STRIP */}
      <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-6 z-40 animate-slideUp">
        <div className="rounded-3xl border border-border bg-surface/95 backdrop-blur-md p-4 md:p-5 shadow-2xl text-left space-y-3">
          
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-black text-muted">
              <span>{progress ? `${(progress.distanceRemainingMeters / 1000).toFixed(1)} km remaining` : activeRoute.distance}</span>
              <span className="text-primary-accent font-black">{progress?.progressPercent || 0}% Complete</span>
            </div>
            <div className="h-2 w-full bg-elevated-surface rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-accent rounded-full transition-all duration-300"
                style={{ width: `${progress?.progressPercent || 0}%` }}
              />
            </div>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-2xl bg-elevated-surface border border-border">
              <div className="flex items-center justify-center gap-1 text-muted text-[10px] font-bold">
                <Clock className="h-3 w-3 text-primary-accent" /> ETA
              </div>
              <p className="font-black text-foreground mt-0.5 text-sm">{progress?.etaString || activeRoute.time}</p>
            </div>

            <div className="p-2.5 rounded-2xl bg-elevated-surface border border-border">
              <div className="flex items-center justify-center gap-1 text-muted text-[10px] font-bold">
                <Gauge className="h-3 w-3 text-info" /> Speed
              </div>
              <p className="font-black text-foreground mt-0.5 text-xs truncate">
                {formatSpeedKmh(currentPosition?.speed ?? null)}
              </p>
            </div>

            <div className="p-2.5 rounded-2xl bg-elevated-surface border border-border">
              <div className="flex items-center justify-center gap-1 text-muted text-[10px] font-bold">
                <Compass className="h-3 w-3 text-warning" /> Heading
              </div>
              <p className="font-black text-foreground mt-0.5 text-xs truncate">
                {formatHeading(currentPosition?.heading ?? null)}
              </p>
            </div>

            <div className="p-2.5 rounded-2xl bg-elevated-surface border border-border">
              <div className="flex items-center justify-center gap-1 text-muted text-[10px] font-bold">
                <ShieldCheck className="h-3 w-3 text-success" /> Safety Fit
              </div>
              <p className="font-black text-success mt-0.5 text-sm">{activeRoute.safetyScore}</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
