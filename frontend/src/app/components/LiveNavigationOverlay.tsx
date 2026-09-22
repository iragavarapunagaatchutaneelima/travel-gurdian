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
  if (status === "READY" || status === "ENDED") {
    return null;
  }

  // 1. ARRIVAL SCREEN MODAL
  if (status === "ARRIVED") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: "rgba(15,23,42,0.4)", fontFamily: "'Poppins',sans-serif" }}>
        <div className="w-full max-w-md rounded-3xl p-6 text-center space-y-5 shadow-2xl animate-fadeIn" style={{ backgroundColor: "#FFFFFF", border: "2px solid #22C55E" }}>
          <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: "#DCFCE7", color: "#16A34A", border: "2px solid #22C55E" }}>
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.1em", display: "block" }}>
              JOURNEY COMPLETED
            </span>
            <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#0F172A", marginTop: "4px" }}>You Have Arrived!</h3>
            <p style={{ fontSize: "13px", color: "#64748B", fontWeight: 400, marginTop: "4px" }}>
              Destination reached safely via {activeRoute.name}.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl text-center" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
            <div>
              <span style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Distance</span>
              <p style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", marginTop: "2px" }}>{activeRoute.distance}</p>
            </div>
            <div>
              <span style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Safety Fit</span>
              <p style={{ fontSize: "14px", fontWeight: 800, color: "#16A34A", marginTop: "2px" }}>{activeRoute.safetyScore}/100</p>
            </div>
            <div>
              <span style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Status</span>
              <p style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", marginTop: "2px" }}>Arrived</p>
            </div>
          </div>

          <button
            onClick={onEndNavigation}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-xs transition-all shadow-sm"
            style={{ backgroundColor: "#2563FF", fontFamily: "'Poppins',sans-serif" }}
          >
            Finish &amp; Close Navigation
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* TOP TURN-BY-TURN MANEUVER CARD & SAFETY CHECK-IN */}
      <div className="absolute top-4 left-4 right-4 md:left-6 md:right-auto md:w-96 z-40 animate-slideDown space-y-3" style={{ fontFamily: "'Poppins',sans-serif" }}>
        <div
          className="rounded-3xl p-4 text-left space-y-3 shadow-md"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 4px 16px rgba(37,99,255,0.08)",
          }}
        >
          {/* Main Next Turn Action */}
          <div className="flex items-center gap-3.5">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-white"
              style={{ backgroundColor: "#2563FF" }}
            >
              <ManeuverIconComponent type={currentManeuver?.maneuverType || "straight"} className="h-7 w-7 stroke-[2.5]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span style={{ fontSize: "12px", fontWeight: 800, color: "#2563FF", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  In {currentManeuver?.distanceText || "100 m"}
                </span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", backgroundColor: "#F1F5F9", padding: "2px 6px", borderRadius: "6px" }}>
                  Step {currentManeuver?.stepIndex || 1} of {currentManeuver?.totalSteps || 1}
                </span>
              </div>
              <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", marginTop: "2px", lineHeight: 1.3 }} className="truncate">
                {currentManeuver?.instruction || "Continue on route"}
              </h4>
            </div>
          </div>

          {/* Next Maneuver Preview */}
          {nextManeuver && (
            <div className="pt-2 flex items-center justify-between text-xs" style={{ borderTop: "1px solid rgba(15,23,42,0.06)", color: "#64748B" }}>
              <div className="flex items-center gap-1.5 truncate">
                <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#94A3B8" }}>Then:</span>
                <ManeuverIconComponent type={nextManeuver.maneuverType} className="h-3.5 w-3.5 shrink-0" style={{ color: "#0F172A" }} />
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#0F172A" }} className="truncate">{nextManeuver.instruction}</span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", marginLeft: "8px" }} className="shrink-0">{nextManeuver.distanceText}</span>
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
          className="p-3 rounded-2xl shadow-sm transition-all"
          style={{
            backgroundColor: isFollowMode ? "#2563FF" : "#FFFFFF",
            color: isFollowMode ? "#FFFFFF" : "#0F172A",
            border: isFollowMode ? "1px solid #2563FF" : "1px solid rgba(15,23,42,0.1)",
            boxShadow: isFollowMode ? "0 2px 8px rgba(37,99,255,0.25)" : "0 2px 6px rgba(15,23,42,0.08)",
          }}
          title={isFollowMode ? "Camera following user" : "Re-center camera on GPS"}
        >
          <Crosshair className={`h-5 w-5 ${isFollowMode ? "animate-spin-slow" : ""}`} />
        </button>

        <button
          onClick={onEndNavigation}
          className="p-3 rounded-2xl transition-all"
          style={{
            backgroundColor: "#FFFFFF",
            color: "#EF4444",
            border: "1px solid rgba(15,23,42,0.1)",
            boxShadow: "0 2px 6px rgba(15,23,42,0.08)",
          }}
          title="End Live Navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* GPS ACCURACY WARNING BANNER */}
      {gpsAccuracyWarning && (
        <div className="absolute top-28 left-4 right-4 md:left-6 md:right-auto md:w-96 z-40 animate-fadeIn" style={{ fontFamily: "'Poppins',sans-serif" }}>
          <div className="p-2.5 rounded-2xl flex items-center gap-2 shadow-sm text-xs" style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", color: "#D97706" }}>
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span style={{ fontSize: "11px", fontWeight: 600 }}>GPS accuracy is low ({currentPosition?.accuracy ? Math.round(currentPosition.accuracy) : 50}m). Navigation continues.</span>
          </div>
        </div>
      )}

      {/* OFF-ROUTE NOTICE BANNER & RECALCULATE PROMPT */}
      {status === "OFF_ROUTE" && !rerouteProposal && (
        <div className="absolute top-36 left-4 right-4 md:left-6 md:right-auto md:w-96 z-40 animate-fadeIn" style={{ fontFamily: "'Poppins',sans-serif" }}>
          <div className="rounded-3xl p-4 shadow-xl text-left space-y-3" style={{ backgroundColor: "#FFFFFF", border: "2px solid #EF4444" }}>
            <div className="flex items-center gap-2" style={{ color: "#EF4444" }}>
              <AlertTriangle className="h-5 w-5" />
              <h4 style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Off Planned Route</h4>
            </div>
            <p style={{ fontSize: "12px", color: "#64748B", fontWeight: 400, lineHeight: 1.5 }}>
              You are {progress?.distanceToRouteMeters ? Math.round(progress.distanceToRouteMeters) : 100}m away from the corridor. Would you like to calculate a new real Google route from your current GPS position?
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={onRequestReroute}
                disabled={isRerouting}
                className="flex-1 py-2.5 px-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                style={{ backgroundColor: "#2563FF", fontFamily: "'Poppins',sans-serif" }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: "rgba(15,23,42,0.4)", fontFamily: "'Poppins',sans-serif" }}>
          <div className="w-full max-w-md rounded-3xl p-6 text-left space-y-4 shadow-2xl animate-fadeIn" style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)" }}>
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" style={{ color: "#2563FF" }} />
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>New Route Available</h3>
              </div>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#16A34A", backgroundColor: "#DCFCE7", padding: "2px 8px", borderRadius: "6px" }}>
                Fit: {rerouteProposal.newRoute.safetyScore}/100
              </span>
            </div>

            <p style={{ fontSize: "12px", color: "#64748B", fontWeight: 400, lineHeight: 1.5 }}>
              Google Directions calculated a new real road route from your current position.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
                <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, display: "block" }}>New Distance</span>
                <p style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", marginTop: "2px" }}>{rerouteProposal.newRoute.distance}</p>
              </div>
              <div className="p-3 rounded-2xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
                <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, display: "block" }}>New Est. Duration</span>
                <p style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", marginTop: "2px" }}>{rerouteProposal.newRoute.time}</p>
              </div>
            </div>

            {/* Why This Route */}
            <div className="space-y-1.5 p-3 rounded-2xl text-xs" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#2563FF", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>
                Safety Engine Assessment
              </span>
              {rerouteProposal.explanation.map((item, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-[11px]" style={{ color: "#64748B", fontWeight: 500 }}>
                  <span style={{ color: "#2563FF", fontWeight: 800 }}>•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onRejectReroute}
                className="flex-1 py-3 rounded-2xl text-xs font-bold transition-all"
                style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.1)", color: "#64748B", fontFamily: "'Poppins',sans-serif" }}
              >
                Keep Current Route
              </button>
              <button
                onClick={onApproveReroute}
                className="flex-1 py-3 rounded-2xl text-white font-bold text-xs transition-all shadow-sm"
                style={{ backgroundColor: "#2563FF", fontFamily: "'Poppins',sans-serif" }}
              >
                Use New Route
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM TELEMETRY STRIP */}
      <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-6 z-40 animate-slideUp" style={{ fontFamily: "'Poppins',sans-serif" }}>
        <div
          className="rounded-3xl p-4 md:p-5 shadow-lg text-left space-y-3"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 4px 20px rgba(37,99,255,0.08)",
          }}
        >
          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold" style={{ color: "#64748B" }}>
              <span>{progress ? `${(progress.distanceRemainingMeters / 1000).toFixed(1)} km remaining` : activeRoute.distance}</span>
              <span style={{ color: "#2563FF", fontWeight: 800 }}>{progress?.progressPercent || 0}% Complete</span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#F1F5F9" }}>
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress?.progressPercent || 0}%`, backgroundColor: "#2563FF" }}
              />
            </div>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-2xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold" style={{ color: "#64748B" }}>
                <Clock className="h-3 w-3" style={{ color: "#2563FF" }} /> ETA
              </div>
              <p style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", marginTop: "2px" }}>{progress?.etaString || activeRoute.time}</p>
            </div>

            <div className="p-2.5 rounded-2xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold" style={{ color: "#64748B" }}>
                <Gauge className="h-3 w-3" style={{ color: "#00D4FF" }} /> Speed
              </div>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }} className="truncate">
                {formatSpeedKmh(currentPosition?.speed ?? null)}
              </p>
            </div>

            <div className="p-2.5 rounded-2xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold" style={{ color: "#64748B" }}>
                <Compass className="h-3 w-3 text-amber-500" /> Heading
              </div>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }} className="truncate">
                {formatHeading(currentPosition?.heading ?? null)}
              </p>
            </div>

            <div className="p-2.5 rounded-2xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold" style={{ color: "#64748B" }}>
                <ShieldCheck className="h-3 w-3 text-emerald-600" /> Safety Fit
              </div>
              <p style={{ fontSize: "14px", fontWeight: 800, color: "#16A34A", marginTop: "2px" }}>{activeRoute.safetyScore}</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
