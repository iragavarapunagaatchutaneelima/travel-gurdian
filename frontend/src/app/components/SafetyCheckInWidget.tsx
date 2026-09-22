"use client";

import React, { useState } from "react";
import { 
  SafetyCheckInStatus, 
  SafetyCheckInConfig, 
  CheckInCycle, 
  NotificationResult,
  LocationSnapshot,
  TrustedContact
} from "../../types/safetyCheckIn";
import { PRESET_INTERVALS } from "../../hooks/useSafetyCheckIn";
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  PhoneCall, 
  MapPin, 
  Settings2, 
  X, 
  ChevronRight, 
  Users,
  ExternalLink,
  Shield,
  LifeBuoy
} from "lucide-react";
import Link from "next/link";

interface SafetyCheckInWidgetProps {
  status: SafetyCheckInStatus;
  config: SafetyCheckInConfig;
  activeCycle: CheckInCycle | null;
  secondsRemaining: number;
  graceSecondsRemaining: number;
  lastKnownSnapshot: LocationSnapshot | null;
  escalationResult: NotificationResult | null;
  trustedContacts: TrustedContact[];
  onStart: (cfg?: Partial<SafetyCheckInConfig>) => void;
  onConfirmSafe: () => void;
  onRequestHelp: () => void;
  onCancel: () => void;
  className?: string;
}

export function formatTimeRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function SafetyCheckInWidget({
  status,
  config,
  activeCycle,
  secondsRemaining,
  graceSecondsRemaining,
  lastKnownSnapshot,
  escalationResult,
  trustedContacts,
  onStart,
  onConfirmSafe,
  onRequestHelp,
  onCancel,
  className = ""
}: SafetyCheckInWidgetProps) {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<number>(config.intervalMinutes || 15);
  const [customMinutes, setCustomMinutes] = useState<string>("");
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(config.gracePeriodMinutes || 2);
  const [isCustom, setIsCustom] = useState(false);

  const activeContacts = trustedContacts.filter(c => c.enabled);

  const handleStartCustom = () => {
    let finalInterval = selectedInterval;
    if (isCustom) {
      const parsed = parseInt(customMinutes, 10);
      if (isNaN(parsed) || parsed <= 0 || parsed > 1440) {
        alert("Please enter a valid custom interval between 1 and 1440 minutes (24 hours).");
        return;
      }
      finalInterval = parsed;
    }

    onStart({
      intervalMinutes: finalInterval,
      customIntervalMinutes: isCustom ? finalInterval : undefined,
      gracePeriodMinutes: gracePeriodMinutes
    });
    setShowConfigModal(false);
  };

  // 1. REMINDER / GRACE PERIOD / MISSED MODAL (Authoritative alert modal)
  if (status === "REMINDER" || status === "GRACE_PERIOD" || status === "MISSED") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn" style={{ backgroundColor: "rgba(15,23,42,0.4)", fontFamily: "'Poppins',sans-serif" }}>
        <div className="w-full max-w-md rounded-3xl p-6 text-center space-y-5 shadow-2xl animate-slideUp" style={{ backgroundColor: "#FFFFFF", border: "2px solid #F59E0B" }}>
          
          <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto animate-pulse" style={{ backgroundColor: "#FEF3C7", color: "#D97706", border: "2px solid #F59E0B" }}>
            <AlertTriangle className="h-9 w-9" />
          </div>

          <div>
            <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#D97706", display: "block" }}>
              SCHEDULED SAFETY CHECK-IN
            </span>
            <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#0F172A", marginTop: "4px" }}>Are You Safe?</h3>
            <p style={{ fontSize: "13px", color: "#64748B", fontWeight: 400, marginTop: "4px", lineHeight: 1.5 }}>
              {status === "MISSED" 
                ? "Check-in window passed. Please confirm safety before contact notification."
                : "Please confirm your journey status to continue routine monitoring."}
            </p>
          </div>

          {/* Grace Period Counter */}
          <div className="p-3.5 rounded-2xl flex items-center justify-between text-xs" style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <div className="flex items-center gap-2 font-bold" style={{ color: "#D97706" }}>
              <Clock className="h-4 w-4" />
              <span>Grace Period Remaining:</span>
            </div>
            <span className="font-mono text-sm font-black" style={{ color: "#0F172A" }}>
              {formatTimeRemaining(graceSecondsRemaining)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={onConfirmSafe}
              className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98"
              style={{ backgroundColor: "#16A34A" }}
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>I'M SAFE — CONTINUE JOURNEY</span>
            </button>

            <button
              onClick={onRequestHelp}
              className="w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
              style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", color: "#EF4444" }}
            >
              <LifeBuoy className="h-4 w-4" />
              <span>I NEED HELP / OPEN EMERGENCY</span>
            </button>
          </div>

          <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500 }}>
            Notification will route to {activeContacts.length} trusted contact(s) if unresolved.
          </div>
        </div>
      </div>
    );
  }

  // 2. ESCALATING STATE MODAL
  if (status === "ESCALATING") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn" style={{ backgroundColor: "rgba(15,23,42,0.4)", fontFamily: "'Poppins',sans-serif" }}>
        <div className="w-full max-w-lg rounded-3xl p-6 text-left space-y-5 shadow-2xl animate-slideUp" style={{ backgroundColor: "#FFFFFF", border: "2px solid #EF4444" }}>
          
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
            <div className="flex items-center gap-2.5 text-red-600">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", lineHeight: 1.2 }}>Safety Check-In Unresolved</h3>
                <span style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#DC2626" }}>
                  Escalation Protocol Active
                </span>
              </div>
            </div>
            <span style={{ fontSize: "10px", fontWeight: 800, color: "#D97706", backgroundColor: "#FEF3C7", border: "1px solid #FDE68A", padding: "4px 8px", borderRadius: "6px" }}>
              {escalationResult?.providerStatus || "NOT_CONFIGURED"}
            </span>
          </div>

          {/* Truthful Notification Provider Status */}
          <div className="p-3.5 rounded-2xl space-y-1.5 text-xs" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
            <div className="flex items-center justify-between font-bold">
              <span style={{ color: "#64748B" }}>SMS / Notification Gateway:</span>
              <span className="font-mono font-black" style={{ color: "#D97706" }}>
                {escalationResult?.providerStatus === "SENT" ? "SENT" : "NOT_CONFIGURED (DEV SIMULATED)"}
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#64748B", fontWeight: 400, lineHeight: 1.5 }}>
              {escalationResult?.providerStatus === "SENT" 
                ? "Live SMS dispatched to configured guardian numbers."
                : "SMS gateway is not configured with a live provider (Twilio/AWS). Truthful alert payload generated locally."}
            </p>
          </div>

          {/* Last Known Location Snapshot */}
          {lastKnownSnapshot && (
            <div className="p-3.5 rounded-2xl space-y-2 text-xs" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>
                Last Known Location Snapshot
              </span>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold" style={{ color: "#0F172A" }}>
                  {lastKnownSnapshot.latitude.toFixed(5)}, {lastKnownSnapshot.longitude.toFixed(5)}
                </span>
                <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>
                  ±{lastKnownSnapshot.accuracy}m accuracy
                </span>
              </div>
              {lastKnownSnapshot.googleMapsUrl && (
                <a
                  href={lastKnownSnapshot.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                  style={{ fontSize: "12px", fontWeight: 700, color: "#2563FF" }}
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {/* Core Emergency Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <a
              href="tel:112"
              className="py-3.5 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all text-center"
              style={{ backgroundColor: "#EF4444" }}
            >
              <PhoneCall className="h-4 w-4" />
              <span>CALL 112 (POLICE/AMB)</span>
            </a>

            <button
              onClick={onConfirmSafe}
              className="py-3.5 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              style={{ backgroundColor: "#16A34A" }}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>I'M SAFE NOW</span>
            </button>
          </div>

          <div className="flex justify-between items-center pt-2" style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}>
            <Link
              href="/emergency"
              className="text-xs font-bold hover:underline flex items-center gap-1"
              style={{ color: "#2563FF" }}
            >
              <span>View Emergency Screen</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={onCancel}
              className="text-xs font-semibold hover:underline"
              style={{ color: "#94A3B8" }}
            >
              Cancel Monitoring
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. COMPACT HUD INDICATOR (During active navigation / idle)
  return (
    <>
      <div
        className={`rounded-2xl p-3 shadow-sm space-y-2 ${className}`}
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 2px 8px rgba(37,99,255,0.06)",
          fontFamily: "'Poppins',sans-serif",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-xl"
              style={{
                backgroundColor: status === "ACTIVE" ? "#DCFCE7" : "#F1F5F9",
                color: status === "ACTIVE" ? "#16A34A" : "#64748B",
              }}
            >
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h4 style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A", lineHeight: 1.2 }}>Safety Check-In</h4>
              <span style={{ fontSize: "10px", fontWeight: 500, color: "#64748B", display: "block" }}>
                {status === "ACTIVE" ? `Cycle #${activeCycle?.cycleNumber || 1}` : "Standby"}
              </span>
            </div>
          </div>

          {/* Quick status pill */}
          {status === "ACTIVE" ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl"
              style={{ backgroundColor: "#EFF6FF", border: "1px solid rgba(37,99,255,0.2)", color: "#2563FF" }}
            >
              <Clock className="h-3.5 w-3.5 animate-spin-slow" />
              <span className="font-mono text-xs font-black">{formatTimeRemaining(secondsRemaining)}</span>
            </div>
          ) : (
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-colors"
              style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.1)", color: "#0F172A" }}
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Configure</span>
            </button>
          )}
        </div>

        {/* Action strip */}
        {status === "ACTIVE" ? (
          <div className="flex gap-2 pt-1">
            <button
              onClick={onConfirmSafe}
              className="flex-1 py-2 px-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95"
              style={{ backgroundColor: "#16A34A" }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>I'm Safe</span>
            </button>
            <button
              onClick={() => setShowConfigModal(true)}
              className="p-2 rounded-xl transition-all"
              style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.1)", color: "#64748B" }}
              title="Settings"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-0.5" style={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>
            <span>Interval: {config.intervalMinutes}m</span>
            <span>{activeContacts.length} Contact(s) active</span>
          </div>
        )}

      </div>

      {/* CONFIGURATION & SETUP MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn" style={{ backgroundColor: "rgba(15,23,42,0.4)", fontFamily: "'Poppins',sans-serif" }}>
          <div className="w-full max-w-md rounded-3xl p-6 text-left space-y-4 shadow-2xl animate-slideUp" style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)" }}>
            
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" style={{ color: "#2563FF" }} />
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>Safety Check-In Settings</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100"
                style={{ color: "#64748B" }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p style={{ fontSize: "12px", color: "#64748B", fontWeight: 400, lineHeight: 1.5 }}>
              Periodically checks in on you during travel. If a check-in is missed, a grace period starts before notifying your configured guardians.
            </p>

            {/* Interval Presets */}
            <div className="space-y-2">
              <label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748B", display: "block" }}>
                Check-In Interval
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_INTERVALS.map((preset) => (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => {
                      setSelectedInterval(preset.minutes);
                      setIsCustom(false);
                    }}
                    className="py-2.5 px-3 rounded-xl text-xs font-bold text-left transition-all"
                    style={{
                      backgroundColor: !isCustom && selectedInterval === preset.minutes ? "#2563FF" : "#F8FAFC",
                      color: !isCustom && selectedInterval === preset.minutes ? "#FFFFFF" : "#0F172A",
                      border: !isCustom && selectedInterval === preset.minutes ? "1px solid #2563FF" : "1px solid rgba(15,23,42,0.08)",
                      boxShadow: !isCustom && selectedInterval === preset.minutes ? "0 2px 8px rgba(37,99,255,0.2)" : "none",
                    }}
                  >
                    {preset.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIsCustom(true)}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold text-left transition-all"
                  style={{
                    backgroundColor: isCustom ? "#2563FF" : "#F8FAFC",
                    color: isCustom ? "#FFFFFF" : "#0F172A",
                    border: isCustom ? "1px solid #2563FF" : "1px solid rgba(15,23,42,0.08)",
                    boxShadow: isCustom ? "0 2px 8px rgba(37,99,255,0.2)" : "none",
                  }}
                >
                  Custom Interval...
                </button>
              </div>

              {isCustom && (
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      placeholder="Minutes (e.g., 20)"
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(e.target.value)}
                      className="flex-1 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                      style={{
                        backgroundColor: "#F8FAFC",
                        border: "1px solid rgba(15,23,42,0.12)",
                        color: "#0F172A",
                        fontFamily: "'Poppins',sans-serif",
                      }}
                    />
                    <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 700 }}>mins</span>
                  </div>
                </div>
              )}
            </div>

            {/* Grace Period */}
            <div className="space-y-1.5">
              <label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748B", display: "block" }}>
                Grace Period Before Escalation
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 5].map((gp) => (
                  <button
                    key={gp}
                    type="button"
                    onClick={() => setGracePeriodMinutes(gp)}
                    className="py-2 rounded-xl text-xs font-bold text-center transition-all"
                    style={{
                      backgroundColor: gracePeriodMinutes === gp ? "#EFF6FF" : "#F8FAFC",
                      color: gracePeriodMinutes === gp ? "#2563FF" : "#0F172A",
                      border: gracePeriodMinutes === gp ? "1px solid #2563FF" : "1px solid rgba(15,23,42,0.08)",
                      fontWeight: gracePeriodMinutes === gp ? 800 : 600,
                    }}
                  >
                    {gp} min
                  </button>
                ))}
              </div>
            </div>

            {/* Trusted Contacts Overview */}
            <div className="p-3 rounded-2xl flex items-center justify-between text-xs" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: "#2563FF" }} />
                <span style={{ fontWeight: 700, color: "#0F172A" }}>
                  {activeContacts.length} Trusted Contact(s) Active
                </span>
              </div>
              <Link
                href="/emergency"
                className="hover:underline font-bold text-xs"
                style={{ color: "#2563FF" }}
              >
                Manage
              </Link>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              {status === "ACTIVE" ? (
                <button
                  type="button"
                  onClick={() => {
                    onCancel();
                    setShowConfigModal(false);
                  }}
                  className="flex-1 py-3 rounded-2xl font-bold text-xs transition-all"
                  style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", color: "#EF4444" }}
                >
                  Stop Check-In
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleStartCustom}
                className="flex-1 py-3 rounded-2xl text-white font-bold text-xs transition-all shadow-sm"
                style={{ backgroundColor: "#2563FF", fontFamily: "'Poppins',sans-serif" }}
              >
                {status === "ACTIVE" ? "Update Settings" : "Start Safety Check-In"}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
