"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  SafetyCheckInStatus, 
  SafetyCheckInConfig, 
  CheckInCycle, 
  SafetyCheckInSession, 
  EscalationAlertPayload, 
  NotificationResult,
  LocationSnapshot
} from "../types/safetyCheckIn";
import { NavigationPosition } from "../types/navigation";
import { getTrustedContacts } from "../services/trustedContactService";
import { 
  createLocationSnapshot, 
  sendTrustedContactAlert, 
  clearEscalationHistory 
} from "../services/notificationService";

export interface UseSafetyCheckInOptions {
  autoStartWithNavigation?: boolean;
  destinationName?: string;
  journeyId?: string;
  currentPosition?: NavigationPosition | null;
  onStateChange?: (status: SafetyCheckInStatus) => void;
}

export const PRESET_INTERVALS = [
  { label: "2 min (Test)", minutes: 2 },
  { label: "3 min", minutes: 3 },
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
  { label: "15 min (Recommended)", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 }
];

const DEFAULT_CONFIG: SafetyCheckInConfig = {
  enabled: false,
  intervalMinutes: 15,
  gracePeriodMinutes: 2,
  autoEscalateToContacts: true,
  sendLocationSnapshot: true
};

export function useSafetyCheckIn(options: UseSafetyCheckInOptions = {}) {
  const { destinationName, journeyId, currentPosition, onStateChange } = options;

  const [config, setConfig] = useState<SafetyCheckInConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<SafetyCheckInStatus>("DISABLED");
  const [activeCycle, setActiveCycle] = useState<CheckInCycle | null>(null);
  const [completedCycles, setCompletedCycles] = useState<CheckInCycle[]>([]);
  const [lastConfirmedAt, setLastConfirmedAt] = useState<number | null>(null);
  const [escalationResult, setEscalationResult] = useState<NotificationResult | null>(null);
  
  // Real-time remaining seconds derived from absolute timestamp
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [graceSecondsRemaining, setGraceSecondsRemaining] = useState<number>(0);
  const [lastKnownSnapshot, setLastKnownSnapshot] = useState<LocationSnapshot | null>(null);

  // References for reliable interval ticks
  const activeCycleRef = useRef<CheckInCycle | null>(null);
  activeCycleRef.current = activeCycle;

  const statusRef = useRef<SafetyCheckInStatus>(status);
  statusRef.current = status;

  const configRef = useRef<SafetyCheckInConfig>(config);
  configRef.current = config;

  const positionRef = useRef<NavigationPosition | null>(currentPosition || null);
  positionRef.current = currentPosition || null;

  // Keep snapshot updated with latest valid position
  useEffect(() => {
    if (currentPosition) {
      const snap = createLocationSnapshot(currentPosition);
      if (snap) {
        setLastKnownSnapshot(snap);
      }
    }
  }, [currentPosition]);

  // Notify parent on status change
  useEffect(() => {
    onStateChange?.(status);
  }, [status, onStateChange]);

  /**
   * Evaluates state machine based on authoritative Date.now()
   */
  const evaluateTimeouts = useCallback(async () => {
    const cycle = activeCycleRef.current;
    const currentStatus = statusRef.current;
    if (!cycle || currentStatus === "DISABLED" || currentStatus === "RESOLVED" || currentStatus === "CANCELLED") {
      return;
    }

    const now = Date.now();

    // 1. ACTIVE state -> check if check-in is due
    if (currentStatus === "ACTIVE") {
      const remainingMs = cycle.scheduledCheckInAt - now;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsRemaining(remainingSec);

      if (now >= cycle.scheduledCheckInAt) {
        // Due! Transition to REMINDER & GRACE_PERIOD
        setStatus("REMINDER");
        setActiveCycle(prev => prev ? { ...prev, status: "REMINDER" } : null);
      }
    } 
    // 2. REMINDER / GRACE_PERIOD state -> countdown grace period
    else if (currentStatus === "REMINDER" || currentStatus === "GRACE_PERIOD" || currentStatus === "MISSED") {
      const graceRemainingMs = cycle.gracePeriodEndsAt - now;
      const graceSec = Math.max(0, Math.ceil(graceRemainingMs / 1000));
      setGraceSecondsRemaining(graceSec);

      // Transition to MISSED if reminder has been shown for > 15 seconds
      if (now > cycle.scheduledCheckInAt + 15000 && currentStatus === "REMINDER") {
        setStatus("MISSED");
        setActiveCycle(prev => prev ? { ...prev, status: "MISSED" } : null);
      }

      // Check if Grace Period expired -> ESCALATING
      if (now >= cycle.gracePeriodEndsAt) {
        setStatus("ESCALATING");
        setActiveCycle(prev => prev ? { ...prev, status: "ESCALATING", missedAt: now } : null);

        // Trigger truthful trusted contact alert
        if (configRef.current.autoEscalateToContacts) {
          const contacts = getTrustedContacts();
          const snapshot = createLocationSnapshot(positionRef.current) || lastKnownSnapshot;
          
          const payload: EscalationAlertPayload = {
            alertId: `alert_${Date.now()}`,
            cycleId: cycle.cycleId,
            timestamp: now,
            reason: "CHECK_IN_MISSED",
            locationSnapshot: snapshot,
            destinationName: destinationName || undefined,
            recipients: contacts
          };

          const result = await sendTrustedContactAlert(payload);
          setEscalationResult(result);
        }
      }
    }
  }, [destinationName, lastKnownSnapshot]);

  // Master 1-second tick loop + visibility change listener for background tab wake-up
  useEffect(() => {
    const interval = setInterval(() => {
      evaluateTimeouts();
    }, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        evaluateTimeouts();
      }
    };

    window.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [evaluateTimeouts]);

  /**
   * Starts a new check-in session with specified or current config
   */
  const startCheckIn = useCallback((customConfig?: Partial<SafetyCheckInConfig>) => {
    const activeConfig: SafetyCheckInConfig = {
      ...configRef.current,
      ...customConfig,
      enabled: true
    };
    setConfig(activeConfig);
    clearEscalationHistory();

    const now = Date.now();
    const intervalMs = (activeConfig.customIntervalMinutes || activeConfig.intervalMinutes) * 60 * 1000;
    const gracePeriodMs = activeConfig.gracePeriodMinutes * 60 * 1000;
    const scheduledAt = now + intervalMs;
    const graceEndsAt = scheduledAt + gracePeriodMs;

    const initialCycle: CheckInCycle = {
      cycleId: `cycle_1_${now}`,
      cycleNumber: 1,
      startedAt: now,
      scheduledCheckInAt: scheduledAt,
      gracePeriodEndsAt: graceEndsAt,
      status: "ACTIVE"
    };

    setActiveCycle(initialCycle);
    setCompletedCycles([]);
    setLastConfirmedAt(now);
    setEscalationResult(null);
    setStatus("ACTIVE");
    setSecondsRemaining(Math.ceil(intervalMs / 1000));
    setGraceSecondsRemaining(Math.ceil(gracePeriodMs / 1000));
  }, []);

  /**
   * User confirms safety ("I'M SAFE")
   * Resets nextCheckInAt, increments cycle count, clears reminders
   */
  const confirmSafety = useCallback(() => {
    const now = Date.now();
    const current = activeCycleRef.current;
    const currentCfg = configRef.current;

    if (current) {
      const finishedCycle: CheckInCycle = {
        ...current,
        confirmedAt: now,
        status: "RESOLVED"
      };
      setCompletedCycles(prev => [...prev, finishedCycle]);
    }

    const nextCycleNum = (current?.cycleNumber || 1) + 1;
    const intervalMs = (currentCfg.customIntervalMinutes || currentCfg.intervalMinutes) * 60 * 1000;
    const gracePeriodMs = currentCfg.gracePeriodMinutes * 60 * 1000;
    const scheduledAt = now + intervalMs;
    const graceEndsAt = scheduledAt + gracePeriodMs;

    const nextCycle: CheckInCycle = {
      cycleId: `cycle_${nextCycleNum}_${now}`,
      cycleNumber: nextCycleNum,
      startedAt: now,
      scheduledCheckInAt: scheduledAt,
      gracePeriodEndsAt: graceEndsAt,
      status: "ACTIVE"
    };

    setActiveCycle(nextCycle);
    setLastConfirmedAt(now);
    setEscalationResult(null);
    setStatus("ACTIVE");
    setSecondsRemaining(Math.ceil(intervalMs / 1000));
    setGraceSecondsRemaining(Math.ceil(gracePeriodMs / 1000));
  }, []);

  /**
   * User explicitly requests emergency help ("I NEED HELP")
   */
  const requestHelp = useCallback(async (customMessage?: string) => {
    const now = Date.now();
    const current = activeCycleRef.current;
    
    setStatus("ESCALATING");
    if (current) {
      setActiveCycle({
        ...current,
        status: "ESCALATING",
        missedAt: now
      });
    }

    const contacts = getTrustedContacts();
    const snapshot = createLocationSnapshot(positionRef.current) || lastKnownSnapshot;

    const payload: EscalationAlertPayload = {
      alertId: `alert_help_${Date.now()}`,
      cycleId: current?.cycleId || `manual_help_${Date.now()}`,
      timestamp: now,
      reason: "USER_REQUESTED_HELP",
      userMessage: customMessage,
      locationSnapshot: snapshot,
      destinationName: destinationName || undefined,
      recipients: contacts
    };

    const result = await sendTrustedContactAlert(payload);
    setEscalationResult(result);
  }, [destinationName, lastKnownSnapshot]);

  /**
   * Clean cancellation by user
   */
  const cancelCheckIn = useCallback(() => {
    setStatus("CANCELLED");
    setActiveCycle(null);
    setEscalationResult(null);
  }, []);

  /**
   * Arrival integration: resolves cleanly when destination is reached
   */
  const resolveOnArrival = useCallback(() => {
    setStatus("RESOLVED");
    setActiveCycle(prev => prev ? { ...prev, status: "RESOLVED", confirmedAt: Date.now() } : null);
  }, []);

  return {
    status,
    config,
    setConfig,
    activeCycle,
    completedCycles,
    lastConfirmedAt,
    escalationResult,
    secondsRemaining,
    graceSecondsRemaining,
    lastKnownSnapshot,
    startCheckIn,
    confirmSafety,
    requestHelp,
    cancelCheckIn,
    resolveOnArrival
  };
}
