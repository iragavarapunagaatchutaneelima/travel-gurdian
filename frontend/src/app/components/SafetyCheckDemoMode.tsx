"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, ShieldAlert, Clock, AlertTriangle, MegaphoneOff, X } from "lucide-react";
import { TrustedContact } from "../../types/safetyCheckIn";

/**
 * Safety Check demo/presentation mode (mentor Section 29).
 *
 * This is a PURE UI simulation: it never calls the backend, never touches
 * the real Dead-Man's-Switch state machine in useSafetyCheckIn, and never
 * dispatches an SMS/call to any contact -- real or otherwise. Every visible
 * label says "DEMO" or "SIMULATED" so it can never be mistaken for a real
 * escalation, satisfying the hard requirement that demo mode must not be
 * able to send a real alert even by accident.
 */

const DEMO_TOTAL_SECONDS = 30;
const REMINDER_AT_REMAINING = 20;
const WARNING_AT_REMAINING = 10;

type DemoPhase = "IDLE" | "ACTIVE" | "REMINDER" | "WARNING" | "ESCALATED";

interface SafetyCheckDemoModeProps {
  primaryContact: TrustedContact | null;
}

export default function SafetyCheckDemoMode({ primaryContact }: SafetyCheckDemoModeProps) {
  const [phase, setPhase] = useState<DemoPhase>("IDLE");
  const [remaining, setRemaining] = useState(DEMO_TOTAL_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startDemo = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemaining(DEMO_TOTAL_SECONDS);
    setPhase("ACTIVE");
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setPhase("ESCALATED");
          return 0;
        }
        if (next <= WARNING_AT_REMAINING) setPhase("WARNING");
        else if (next <= REMINDER_AT_REMAINING) setPhase("REMINDER");
        return next;
      });
    }, 1000);
  };

  const stopDemo = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("IDLE");
    setRemaining(DEMO_TOTAL_SECONDS);
  };

  const maskedContact = primaryContact
    ? `${primaryContact.name} (${primaryContact.phone.slice(0, 5)}${"*".repeat(Math.max(0, primaryContact.phone.length - 8))}${primaryContact.phone.slice(-3)})`
    : "your trusted contact (none configured)";

  return (
    <div className="rounded-3xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
            DEMO / SIMULATION
          </span>
          <h3 className="text-sm font-bold text-foreground">Safety Check Demo Mode</h3>
        </div>
        {phase !== "IDLE" && (
          <button onClick={stopDemo} className="p-1 rounded-lg hover:bg-amber-500/10 text-(--muted-foreground)">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="text-xs text-(--muted-foreground)">
        A {DEMO_TOTAL_SECONDS}-second walkthrough of the check-in escalation timeline for presentations. This never
        contacts the backend and never sends a real SMS or call to anyone, even if a trusted contact is configured.
      </p>

      {phase === "IDLE" && (
        <button
          onClick={startDemo}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold transition-all"
        >
          <Play className="h-4 w-4" /> Start {DEMO_TOTAL_SECONDS}s Demo
        </button>
      )}

      {phase === "ACTIVE" && (
        <div className="flex items-center justify-between rounded-2xl px-4 py-3 bg-surface border border-border">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Clock className="h-4 w-4 text-emerald-500" /> Simulated monitoring active
          </div>
          <span className="text-sm font-extrabold text-foreground">{remaining}s</span>
        </div>
      )}

      {phase === "REMINDER" && (
        <div className="flex items-center justify-between rounded-2xl px-4 py-3 bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
            <Clock className="h-4 w-4" /> [DEMO] Reminder: please confirm you're safe
          </div>
          <span className="text-sm font-extrabold text-foreground">{remaining}s</span>
        </div>
      )}

      {phase === "WARNING" && (
        <div className="flex items-center justify-between rounded-2xl px-4 py-3 bg-orange-500/10 border border-orange-500/30 animate-pulse">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-700 dark:text-orange-400">
            <AlertTriangle className="h-4 w-4" /> [DEMO] Warning: escalation imminent
          </div>
          <span className="text-sm font-extrabold text-foreground">{remaining}s</span>
        </div>
      )}

      {phase === "ESCALATED" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-2xl px-4 py-3 bg-rose-500/10 border border-rose-500/30">
            <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
              [SIMULATED ESCALATION] In a real check-in, {maskedContact} would now receive an SMS and call with your
              live location. No message was actually sent — this is demo mode.
            </span>
          </div>
          <button
            onClick={stopDemo}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 bg-surface hover:bg-elevated-surface border border-border text-(--muted-foreground) text-xs font-bold transition-all"
          >
            <MegaphoneOff className="h-4 w-4" /> Reset Demo
          </button>
        </div>
      )}
    </div>
  );
}
