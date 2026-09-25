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
  const [customError, setCustomError] = useState<string | null>(null);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(config.gracePeriodMinutes || 2);
  const [isCustom, setIsCustom] = useState(false);

  const activeContacts = trustedContacts.filter(c => c.enabled);

  const handleStartCustom = () => {
    let finalInterval = selectedInterval;
    if (isCustom) {
      const parsed = parseInt(customMinutes, 10);
      if (isNaN(parsed) || parsed <= 0 || parsed > 1440) {
        setCustomError("Enter a valid interval between 1 and 1440 minutes.");
        return;
      }
      setCustomError(null);
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
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" 
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <div className="w-full max-w-md rounded-3xl p-6 text-center space-y-5 shadow-2xl bg-surface border-2 border-amber-500 animate-slideUp">
          
          <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
            <AlertTriangle className="h-9 w-9" />
          </div>

          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              SCHEDULED SAFETY CHECK-IN
            </span>
            <h3 className="text-2xl font-extrabold text-foreground mt-1">Are You Safe?</h3>
            <p className="text-xs text-(--muted-foreground) mt-1 leading-relaxed">
              {status === "MISSED" 
                ? "Check-in window passed. Please confirm safety before emergency guardian notification."
                : "Please confirm your journey status to maintain active safety monitoring."}
            </p>
          </div>

          {/* Grace Period Counter */}
          <div className="p-3.5 rounded-2xl flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/25">
            <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
              <Clock className="h-4 w-4" />
              <span>Grace Period Remaining:</span>
            </div>
            <span className="font-mono text-sm font-black text-foreground">
              {formatTimeRemaining(graceSecondsRemaining)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={onConfirmSafe}
              className="w-full py-4 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 transition-all active:scale-98"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>I'M SAFE — CONTINUE JOURNEY</span>
            </button>

            <button
              onClick={onRequestHelp}
              className="w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all"
            >
              <LifeBuoy className="h-4 w-4" />
              <span>I NEED HELP / OPEN EMERGENCY</span>
            </button>
          </div>

          <div className="text-[11px] text-(--muted-foreground) font-medium">
            Notification will route to {activeContacts.length} trusted contact(s) if unresolved.
          </div>
        </div>
      </div>
    );
  }

  // 2. ESCALATING STATE MODAL
  if (status === "ESCALATING") {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" 
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <div className="w-full max-w-lg rounded-3xl p-6 text-left space-y-5 shadow-2xl bg-surface border-2 border-red-500 animate-slideUp">
          
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5 text-red-600">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
              <div>
                <h3 className="text-lg font-extrabold text-foreground leading-tight">Safety Check-In Unresolved</h3>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                  Escalation Protocol Active
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
              {escalationResult?.providerStatus || "ACTIVE"}
            </span>
          </div>

          {/* Truthful Notification Provider Status */}
          <div className="p-3.5 rounded-2xl space-y-1.5 text-xs bg-elevated-surface border border-border">
            <div className="flex items-center justify-between font-bold">
              <span className="text-(--muted-foreground)">Alert Gateway:</span>
              <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                {escalationResult?.providerStatus === "SENT" ? "SENT" : "LIVE DISPATCH IN-PROGRESS"}
              </span>
            </div>
            <p className="text-xs text-(--muted-foreground) leading-relaxed">
              {escalationResult?.providerStatus === "SENT" 
                ? "Emergency SMS dispatched to configured guardian contacts."
                : "Emergency broadcast initiated to your configured trusted guardians."}
            </p>
          </div>

          {/* Last Known Location Snapshot (Humanized, Section 17) */}
          {lastKnownSnapshot && (
            <div className="p-3.5 rounded-2xl space-y-2 text-xs bg-elevated-surface border border-border">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-(--muted-foreground) block">
                Last Known Verified Location
              </span>
              {lastKnownSnapshot.formattedText && (
                <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-(--primary) shrink-0" />
                  <span>{lastKnownSnapshot.formattedText}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-[11px] text-(--muted-foreground) pt-0.5">
                <span className="font-mono">
                  {lastKnownSnapshot.latitude.toFixed(5)}, {lastKnownSnapshot.longitude.toFixed(5)}
                </span>
                <span>±{lastKnownSnapshot.accuracy}m accuracy</span>
              </div>
              {lastKnownSnapshot.googleMapsUrl && (
                <a
                  href={lastKnownSnapshot.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-(--primary) hover:underline pt-1"
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
              className="py-3.5 rounded-2xl text-white font-extrabold text-xs flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 shadow-md transition-all text-center"
            >
              <PhoneCall className="h-4 w-4" />
              <span>CALL 112</span>
            </a>

            <button
              onClick={onConfirmSafe}
              className="py-3.5 rounded-2xl text-white font-extrabold text-xs flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 shadow-md transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>I'M SAFE NOW</span>
            </button>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border">
            <Link
              href="/emergency"
              className="text-xs font-bold text-(--primary) hover:underline flex items-center gap-1"
            >
              <span>View Emergency Screen</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={onCancel}
              className="text-xs font-semibold text-(--muted-foreground) hover:text-foreground"
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
        className={`rounded-2xl p-3.5 shadow-sm space-y-2 bg-surface border border-border text-left ${className}`}
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                status === "ACTIVE" 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                  : "bg-elevated-surface text-(--muted-foreground)"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-foreground leading-tight">Safety Check-In</h4>
              <span className="text-[10px] font-medium text-(--muted-foreground) block">
                {status === "ACTIVE" ? `Active Cycle #${activeCycle?.cycleNumber || 1}` : "Monitoring Standby"}
              </span>
            </div>
          </div>

          {/* Quick status pill */}
          {status === "ACTIVE" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-(--primary)/10 border border-(--primary)/20 text-(--primary)">
              <Clock className="h-3.5 w-3.5 animate-spin-slow" />
              <span className="font-mono text-xs font-black">{formatTimeRemaining(secondsRemaining)}</span>
            </div>
          ) : (
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1 bg-elevated-surface border border-border text-foreground hover:bg-surface transition-colors"
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
              className="flex-1 py-2 px-3 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-transform active:scale-95"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>I'm Safe</span>
            </button>
            <button
              onClick={() => setShowConfigModal(true)}
              className="p-2 rounded-xl bg-elevated-surface border border-border text-(--muted-foreground) hover:text-foreground transition-all"
              title="Settings"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-0.5 text-[11px] text-(--muted-foreground) font-medium">
            <span>Interval: {config.intervalMinutes}m</span>
            <span>{activeContacts.length} Guardian(s) active</span>
          </div>
        )}

      </div>

      {/* CONFIGURATION & SETUP MODAL */}
      {showConfigModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          <div className="w-full max-w-md rounded-3xl p-6 text-left space-y-4 shadow-2xl bg-surface border border-border animate-slideUp">
            
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-(--primary)/10 text-(--primary)">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-foreground">Configure Check-In Timer</h3>
                  <span className="text-[10px] text-(--muted-foreground)">Fail-safe automated journey monitoring</span>
                </div>
              </div>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-lg text-(--muted-foreground) hover:bg-elevated-surface"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Interval Options */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-(--muted-foreground) uppercase tracking-wider block">
                Check-In Interval
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_INTERVALS.slice(0, 4).map((item) => (
                  <button
                    key={item.minutes}
                    type="button"
                    onClick={() => {
                      setSelectedInterval(item.minutes);
                      setIsCustom(false);
                      setCustomError(null);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      !isCustom && selectedInterval === item.minutes
                        ? "bg-(--primary) text-white shadow-sm"
                        : "bg-elevated-surface text-foreground border border-border hover:bg-surface"
                    }`}
                  >
                    {item.minutes}m
                  </button>
                ))}
              </div>

              {/* Custom Interval Option */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustom(prev => !prev)}
                  className="text-xs font-bold text-(--primary) hover:underline flex items-center gap-1"
                >
                  <span>{isCustom ? "Use preset intervals" : "Enter custom minutes..."}</span>
                </button>
                {isCustom && (
                  <div className="mt-2 space-y-1">
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      placeholder="Minutes (1 - 1440)"
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-elevated-surface border border-border text-xs text-foreground outline-none"
                    />
                    {customError && (
                      <span className="text-[11px] text-red-500 font-semibold block">{customError}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Grace Period */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-[11px] font-bold text-(--muted-foreground) uppercase tracking-wider block">
                Grace Period Before Escalation
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 5].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGracePeriodMinutes(g)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      gracePeriodMinutes === g
                        ? "bg-(--primary) text-white shadow-sm"
                        : "bg-elevated-surface text-foreground border border-border hover:bg-surface"
                    }`}
                  >
                    {g} minute{g > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-(--muted-foreground) hover:bg-elevated-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartCustom}
                className="px-5 py-2.5 rounded-xl bg-(--primary) text-white text-xs font-extrabold shadow-md hover:opacity-90 transition-all"
              >
                {status === "ACTIVE" ? "Update Settings" : "Start Monitoring"}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
