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
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
        <div className="w-full max-w-md bg-surface border-2 border-warning/60 rounded-3xl p-6 text-center space-y-5 shadow-2xl animate-slideUp">
          
          <div className="h-16 w-16 bg-warning/20 text-warning rounded-full flex items-center justify-center mx-auto border-2 border-warning animate-pulse">
            <AlertTriangle className="h-9 w-9" />
          </div>

          <div>
            <span className="text-[10px] font-black text-warning uppercase tracking-widest block">
              SCHEDULED SAFETY CHECK-IN
            </span>
            <h3 className="text-2xl font-black text-foreground mt-1">Are You Safe?</h3>
            <p className="text-xs text-muted font-semibold mt-1">
              {status === "MISSED" 
                ? "Check-in window passed. Please confirm safety before contact notification."
                : "Please confirm your journey status to continue routine monitoring."}
            </p>
          </div>

          {/* Grace Period Counter */}
          <div className="p-3.5 rounded-2xl bg-warning/10 border border-warning/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-warning font-bold">
              <Clock className="h-4 w-4" />
              <span>Grace Period Remaining:</span>
            </div>
            <span className="font-mono font-black text-foreground text-sm">
              {formatTimeRemaining(graceSecondsRemaining)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={onConfirmSafe}
              className="w-full py-4 rounded-2xl bg-success hover:opacity-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-success/20 transition-transform active:scale-98"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>I'M SAFE — CONTINUE JOURNEY</span>
            </button>

            <button
              onClick={onRequestHelp}
              className="w-full py-3.5 rounded-2xl bg-danger/15 hover:bg-danger hover:text-white border border-danger/40 text-danger font-black text-xs flex items-center justify-center gap-2 transition-all"
            >
              <LifeBuoy className="h-4 w-4" />
              <span>I NEED HELP / OPEN EMERGENCY</span>
            </button>
          </div>

          <div className="text-[10px] text-muted font-semibold">
            Notification will route to {activeContacts.length} trusted contact(s) if unresolved.
          </div>
        </div>
      </div>
    );
  }

  // 2. ESCALATING STATE MODAL
  if (status === "ESCALATING") {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-lg bg-surface border-2 border-danger/60 rounded-3xl p-6 text-left space-y-5 shadow-2xl animate-slideUp">
          
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5 text-danger">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
              <div>
                <h3 className="font-black text-lg leading-tight">Safety Check-In Unresolved</h3>
                <span className="text-[10px] font-black uppercase text-muted tracking-wider">
                  Escalation Protocol Active
                </span>
              </div>
            </div>
            <span className="text-[10px] font-black text-warning bg-warning/15 border border-warning/30 px-2 py-1 rounded-md">
              {escalationResult?.providerStatus || "NOT_CONFIGURED"}
            </span>
          </div>

          {/* Truthful Notification Provider Status */}
          <div className="p-3.5 rounded-2xl bg-elevated-surface border border-border space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold">
              <span className="text-muted">SMS / Notification Gateway:</span>
              <span className="font-mono text-warning font-black">
                {escalationResult?.providerStatus === "SENT" ? "SENT" : "NOT_CONFIGURED (DEV SIMULATED)"}
              </span>
            </div>
            <p className="text-[11px] text-muted font-semibold leading-relaxed">
              {escalationResult?.providerStatus === "SENT" 
                ? "Live SMS dispatched to configured guardian numbers."
                : "SMS gateway is not configured with a live provider (Twilio/AWS). Truthful alert payload generated locally."}
            </p>
          </div>

          {/* Last Known Location Snapshot */}
          {lastKnownSnapshot && (
            <div className="p-3.5 rounded-2xl bg-elevated-surface border border-border space-y-2 text-xs">
              <span className="text-[10px] font-black text-muted uppercase tracking-wider block">
                Last Known Location Snapshot
              </span>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-foreground">
                  {lastKnownSnapshot.latitude.toFixed(5)}, {lastKnownSnapshot.longitude.toFixed(5)}
                </span>
                <span className="text-[10px] font-semibold text-muted">
                  ±{lastKnownSnapshot.accuracy}m accuracy
                </span>
              </div>
              {lastKnownSnapshot.googleMapsUrl && (
                <a
                  href={lastKnownSnapshot.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-black text-primary-accent hover:underline"
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
              className="py-3.5 rounded-2xl bg-danger hover:opacity-90 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-danger/20 transition-all text-center"
            >
              <PhoneCall className="h-4 w-4" />
              <span>CALL 112 (POLICE/AMB)</span>
            </a>

            <button
              onClick={onConfirmSafe}
              className="py-3.5 rounded-2xl bg-success hover:opacity-90 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-success/20 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>I'M SAFE NOW</span>
            </button>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-border">
            <Link
              href="/emergency"
              className="text-xs font-black text-primary-accent hover:underline flex items-center gap-1"
            >
              <span>View Emergency Screen</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={onCancel}
              className="text-xs font-bold text-muted hover:text-foreground"
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
      <div className={`rounded-2xl border border-border bg-surface/95 backdrop-blur-md p-3 shadow-md space-y-2 ${className}`}>
        
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-xl ${status === "ACTIVE" ? "bg-success/20 text-success" : "bg-muted/20 text-muted"}`}>
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-foreground leading-tight">Safety Check-In</h4>
              <span className="text-[10px] font-bold text-muted block">
                {status === "ACTIVE" ? `Cycle #${activeCycle?.cycleNumber || 1}` : "Standby"}
              </span>
            </div>
          </div>

          {/* Quick status pill */}
          {status === "ACTIVE" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary-accent/15 border border-primary-accent/30 text-primary-accent">
              <Clock className="h-3.5 w-3.5 animate-spin-slow" />
              <span className="font-mono text-xs font-black">{formatTimeRemaining(secondsRemaining)}</span>
            </div>
          ) : (
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-2.5 py-1 rounded-xl bg-elevated-surface hover:bg-border text-foreground font-black text-[11px] border border-border transition-colors flex items-center gap-1"
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
              className="flex-1 py-2 px-3 rounded-xl bg-success hover:opacity-90 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>I'm Safe</span>
            </button>
            <button
              onClick={() => setShowConfigModal(true)}
              className="p-2 rounded-xl bg-elevated-surface hover:bg-border text-muted hover:text-foreground border border-border"
              title="Settings"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[10px] text-muted font-semibold pt-0.5">
            <span>Interval: {config.intervalMinutes}m</span>
            <span>{activeContacts.length} Contact(s) active</span>
          </div>
        )}

      </div>

      {/* CONFIGURATION & SETUP MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 text-left space-y-4 shadow-2xl animate-slideUp">
            
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary-accent" />
                <h3 className="font-black text-base text-foreground">Safety Check-In Settings</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg hover:bg-elevated-surface text-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted font-semibold leading-relaxed">
              Periodically checks in on you during travel. If a check-in is missed, a grace period starts before notifying your configured guardians.
            </p>

            {/* Interval Presets */}
            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-wider block">
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
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold text-left transition-all border ${
                      !isCustom && selectedInterval === preset.minutes
                        ? "bg-primary-accent text-white border-primary-accent shadow-sm"
                        : "bg-elevated-surface text-foreground border-border hover:bg-border"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIsCustom(true)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold text-left transition-all border ${
                    isCustom
                      ? "bg-primary-accent text-white border-primary-accent shadow-sm"
                      : "bg-elevated-surface text-foreground border-border hover:bg-border"
                  }`}
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
                      className="flex-1 rounded-xl bg-elevated-surface border border-border px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary-accent"
                    />
                    <span className="text-xs text-muted font-bold">mins</span>
                  </div>
                </div>
              )}
            </div>

            {/* Grace Period */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-muted uppercase tracking-wider block">
                Grace Period Before Escalation
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 5].map((gp) => (
                  <button
                    key={gp}
                    type="button"
                    onClick={() => setGracePeriodMinutes(gp)}
                    className={`py-2 rounded-xl text-xs font-bold text-center border ${
                      gracePeriodMinutes === gp
                        ? "bg-primary-accent/20 border-primary-accent text-primary-accent font-black"
                        : "bg-elevated-surface border-border text-foreground hover:bg-border"
                    }`}
                  >
                    {gp} min
                  </button>
                ))}
              </div>
            </div>

            {/* Trusted Contacts Overview */}
            <div className="p-3 rounded-2xl bg-elevated-surface border border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary-accent" />
                <span className="font-bold text-foreground">
                  {activeContacts.length} Trusted Contact(s) Active
                </span>
              </div>
              <Link
                href="/emergency"
                className="text-primary-accent hover:underline font-black text-xs"
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
                  className="flex-1 py-3 rounded-2xl bg-danger/15 hover:bg-danger hover:text-white border border-danger/30 text-danger font-black text-xs transition-all"
                >
                  Stop Check-In
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleStartCustom}
                className="flex-1 py-3 rounded-2xl bg-primary-accent hover:bg-primary-accent-hover text-white font-black text-xs transition-all shadow-md"
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
