"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import TravelAssistant from "../components/TravelAssistant";
import SafetyCheckInWidget from "../components/SafetyCheckInWidget";
import { useSafetyCheckIn } from "../../hooks/useSafetyCheckIn";
import { getTrustedContacts } from "../../services/trustedContactService";
import { TrustedContact } from "../../types/safetyCheckIn";
import { LiveTravelContext } from "../../types/gemini";
import { 
  Bot, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Sparkles, 
  Users, 
  LifeBuoy, 
  ChevronRight,
  Shield,
  Info
} from "lucide-react";
import Link from "next/link";

export default function AssistHub() {
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);

  // Safety Check-In Controller
  const {
    status: checkInStatus,
    config: checkInConfig,
    activeCycle: checkInCycle,
    secondsRemaining: checkInSecondsRemaining,
    graceSecondsRemaining: checkInGraceSecondsRemaining,
    lastKnownSnapshot: checkInLocationSnapshot,
    escalationResult: checkInEscalationResult,
    startCheckIn,
    confirmSafety,
    requestHelp,
    cancelCheckIn
  } = useSafetyCheckIn({
    destinationName: "Regional Destination"
  });

  useEffect(() => {
    setTrustedContacts(getTrustedContacts());
  }, []);

  // Aggregated live context for Gemini Tool Router
  const liveContext: LiveTravelContext = {
    navStatus: "READY",
    safetyScore: 88,
    checkInStatus,
    activeCheckInCycle: checkInCycle,
    checkInSecondsRemaining,
    trustedContactsCount: trustedContacts.filter(c => c.enabled).length,
    destinationName: "Destination Corridor",
    travelMode: "Car"
  };

  const handleApplyInterval = (minutes: number) => {
    startCheckIn({ intervalMinutes: minutes });
  };

  const handleTriggerAlert = () => {
    requestHelp("User requested assistance via Travel Assistant.");
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      
      <Header />

      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6 text-left animate-slideUp">
        
        {/* Page Title Header */}
        <div className="border-b border-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black text-primary-accent uppercase tracking-widest block">
              PHASE 6 — AI GUARDIAN ASSISTANT
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mt-1">
              Travel Assistant & Controlled Tool Calling
            </h1>
            <p className="text-xs text-muted font-semibold mt-0.5">
              Ask contextual journey questions, inspect safety scores, and review user-confirmed action proposals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase px-3 py-1.5 rounded-full border bg-success/10 border-success/30 text-success">
              AI BOUNDARY: OBSERVER & ASSISTANT (USER CONTROLLED)
            </span>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Full-Height Travel Assistant Window */}
          <div className="lg:col-span-7">
            <TravelAssistant
              context={liveContext}
              isOpen={true}
              isFloating={false}
              onApplyInterval={handleApplyInterval}
              onTriggerAlert={handleTriggerAlert}
            />
          </div>

          {/* Right Column: Safety Check-In Hub & Quick Context Cards */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Safety Check-In Controller Card */}
            <SafetyCheckInWidget
              status={checkInStatus}
              config={checkInConfig}
              activeCycle={checkInCycle}
              secondsRemaining={checkInSecondsRemaining}
              graceSecondsRemaining={checkInGraceSecondsRemaining}
              lastKnownSnapshot={checkInLocationSnapshot}
              escalationResult={checkInEscalationResult}
              trustedContacts={trustedContacts}
              onStart={startCheckIn}
              onConfirmSafe={confirmSafety}
              onRequestHelp={requestHelp}
              onCancel={cancelCheckIn}
            />

            {/* AI Safety Boundary Card */}
            <div className="p-5 rounded-3xl bg-surface border border-border shadow-sm space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-info/15 text-info">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-xs text-foreground uppercase tracking-wider">
                    AI Safety Rules & Governance
                  </h3>
                  <span className="text-[10px] text-muted font-bold">Strict Ethical Boundaries</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-muted font-semibold leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="text-primary-accent font-black">•</span>
                  <span><strong>AI Observes & Explains:</strong> Uses deterministic tools to read live telemetry without inventing scores.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary-accent font-black">•</span>
                  <span><strong>No Autonomous Emergency Actions:</strong> The AI cannot independently call 112 or fire SOS.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary-accent font-black">•</span>
                  <span><strong>Explicit Confirmation:</strong> Any safety proposal requires direct user button confirmation.</span>
                </div>
              </div>
            </div>

            {/* Quick Links to Live Map & Emergency */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/map"
                className="p-4 rounded-3xl bg-surface border border-border hover:border-primary-accent transition-all shadow-sm group text-left space-y-1"
              >
                <div className="flex items-center justify-between">
                  <MapPin className="h-4 w-4 text-primary-accent" />
                  <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary-accent transition-colors" />
                </div>
                <h4 className="font-black text-xs text-foreground">Live Map & Nav</h4>
                <p className="text-[10px] text-muted font-semibold">Track GPS corridor</p>
              </Link>

              <Link
                href="/emergency"
                className="p-4 rounded-3xl bg-surface border border-border hover:border-danger transition-all shadow-sm group text-left space-y-1"
              >
                <div className="flex items-center justify-between">
                  <LifeBuoy className="h-4 w-4 text-danger" />
                  <ChevronRight className="h-4 w-4 text-muted group-hover:text-danger transition-colors" />
                </div>
                <h4 className="font-black text-xs text-foreground">Emergency Hub</h4>
                <p className="text-[10px] text-muted font-semibold">112 dial & contacts</p>
              </Link>
            </div>

          </div>

        </div>

      </div>

      <div className="md:hidden">
        <BottomNav />
      </div>

    </div>
  );
}
