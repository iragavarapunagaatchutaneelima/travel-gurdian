"use client";

import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import SafetyCheckInWidget from "../components/SafetyCheckInWidget";
import SafetyCheckDemoMode from "../components/SafetyCheckDemoMode";
import { useSafetyCheckIn } from "../../hooks/useSafetyCheckIn";
import { useSharedLocation } from "../../hooks/useSharedLocation";
import { getTrustedContacts, refreshTrustedContactsFromBackend } from "../../services/trustedContactService";
import { TrustedContact } from "../../types/safetyCheckIn";
import { ShieldCheck, Users, MapPin, Clock } from "lucide-react";

export default function SafetyCheckPage() {
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);

  const { latitude, longitude, hasLocation } = useSharedLocation();

  const {
    status,
    config,
    activeCycle,
    secondsRemaining,
    graceSecondsRemaining,
    lastKnownSnapshot,
    escalationResult,
    backendSyncError,
    startCheckIn,
    confirmSafety,
    requestHelp,
    cancelCheckIn
  } = useSafetyCheckIn({
    destinationName: "Current Journey",
    currentPosition: hasLocation && latitude && longitude
      ? { latitude, longitude, accuracy: 15, altitude: null, heading: null, speed: null, timestamp: Date.now() }
      : null
  });

  useEffect(() => {
    setTrustedContacts(getTrustedContacts());
    refreshTrustedContactsFromBackend().then(setTrustedContacts).catch(() => {});
  }, []);

  const primaryContact = trustedContacts.find(c => c.enabled) || trustedContacts[0] || null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 md:px-6 py-8 pb-28 md:pb-10">
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-(--primary)/10 text-(--primary) border border-(--primary)/30 mb-3">
            <ShieldCheck className="h-3 w-3" /> Dead-Man's-Switch
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">Safety Check</h1>
          <p className="text-sm text-(--muted-foreground) mt-1">
            Set a check-in timer for your journey. If you don't confirm you're safe before the timer plus grace
            period expires, your trusted contact is automatically notified with your live location.
          </p>
        </div>

        {/* Status summary strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl border border-border bg-surface p-3 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-(--muted-foreground)" />
            <div className="text-[10px] font-bold uppercase text-(--muted-foreground)">Status</div>
            <div className="text-xs font-extrabold text-foreground mt-0.5">{status}</div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-3 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-(--muted-foreground)" />
            <div className="text-[10px] font-bold uppercase text-(--muted-foreground)">Trusted Contact</div>
            <div className="text-xs font-extrabold text-foreground mt-0.5 truncate">
              {primaryContact ? primaryContact.name : "Not configured"}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-3 text-center">
            <MapPin className="h-4 w-4 mx-auto mb-1 text-(--muted-foreground)" />
            <div className="text-[10px] font-bold uppercase text-(--muted-foreground)">GPS</div>
            <div className="text-xs font-extrabold text-foreground mt-0.5">{hasLocation ? "Active" : "Unavailable"}</div>
          </div>
        </div>

        {!primaryContact && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-400 font-semibold">
            No trusted contact is configured. Add one on the{" "}
            <a href="/emergency" className="underline font-bold">Emergency page</a> before starting a check-in, or
            escalation will have nobody to notify.
          </div>
        )}

        <SafetyCheckInWidget
          status={status}
          config={config}
          activeCycle={activeCycle}
          secondsRemaining={secondsRemaining}
          graceSecondsRemaining={graceSecondsRemaining}
          lastKnownSnapshot={lastKnownSnapshot}
          escalationResult={escalationResult}
          backendSyncError={backendSyncError}
          trustedContacts={trustedContacts}
          onStart={startCheckIn}
          onConfirmSafe={confirmSafety}
          onRequestHelp={requestHelp}
          onCancel={cancelCheckIn}
        />

        <div className="mt-6">
          <SafetyCheckDemoMode primaryContact={primaryContact} />
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-surface border border-border text-xs text-(--muted-foreground) space-y-2">
          <div className="flex items-center gap-2 text-foreground font-bold text-xs">
            <ShieldCheck className="h-4 w-4 text-(--primary)" />
            <span>How escalation works</span>
          </div>
          <p>
            The countdown is enforced by the backend, not this browser tab — it keeps running even if you close the
            app. If you don't tap "I'm Safe" before the interval plus grace period expires, the backend automatically
            dispatches your live location and an emergency alert to your trusted contact via Twilio (or reports
            honestly if that isn't configured yet). Dial 112 directly at any time for a genuine emergency.
          </p>
        </div>
      </main>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
