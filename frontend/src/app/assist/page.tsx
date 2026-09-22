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
    <div className="min-h-screen pb-20 md:pb-8" style={{ backgroundColor: "#F8FAFC", fontFamily: "'Poppins',sans-serif" }}>
      
      <Header />

      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6 text-left animate-slideUp">
        
        {/* Page Title Header */}
        <div 
          className="pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}
        >
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563FF", textTransform: "uppercase", letterSpacing: "0.12em", display: "block" }}>
              AI GUARDIAN ASSISTANT
            </span>
            <h1 style={{ fontWeight: 800, fontSize: "clamp(20px,4vw,28px)", color: "#0F172A", marginTop: "4px", letterSpacing: "-0.01em" }}>
              Travel Assistant &amp; Tool Calling
            </h1>
            <p style={{ fontSize: "13px", color: "#64748B", fontWeight: 400, marginTop: "4px" }}>
              Ask contextual journey questions. Inspect safety scores. Confirm action proposals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "#F0FDF4", color: "#16A34A", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              AI: OBSERVER &amp; ASSISTANT
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
            <div 
              className="p-5 rounded-3xl space-y-3"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 2px 8px rgba(37,99,255,0.06)" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl" style={{ backgroundColor: "#EFF6FF" }}>
                  <ShieldCheck className="h-5 w-5" style={{ color: "#2563FF" }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: "13px", color: "#0F172A" }}>AI Safety Rules &amp; Governance</h3>
                  <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>Strict Ethical Boundaries</span>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { bold: "AI Observes & Explains:", rest: "Uses deterministic tools to read live telemetry without inventing scores." },
                  { bold: "No Autonomous Emergency Actions:", rest: "The AI cannot independently call 112 or fire SOS." },
                  { bold: "Explicit Confirmation:", rest: "Any safety proposal requires direct user button confirmation." },
                ].map((rule, i) => (
                  <div key={i} className="flex items-start gap-2" style={{ fontSize: "12px", color: "#374151" }}>
                    <span style={{ color: "#2563FF", fontWeight: 700, flexShrink: 0 }}>•</span>
                    <span><strong>{rule.bold}</strong> {rule.rest}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/map"
                className="p-4 rounded-3xl text-left space-y-1 transition-all group"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 2px 8px rgba(37,99,255,0.05)" }}
              >
                <div className="flex items-center justify-between">
                  <MapPin className="h-4 w-4" style={{ color: "#2563FF" }} />
                  <ChevronRight className="h-4 w-4 opacity-30 group-hover:opacity-70 transition-opacity" style={{ color: "#2563FF" }} />
                </div>
                <h4 style={{ fontWeight: 700, fontSize: "13px", color: "#0F172A" }}>Live Map &amp; Nav</h4>
                <p style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 400 }}>Track GPS corridor</p>
              </Link>

              <Link
                href="/emergency"
                className="p-4 rounded-3xl text-left space-y-1 transition-all group"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 2px 8px rgba(37,99,255,0.05)" }}
              >
                <div className="flex items-center justify-between">
                  <LifeBuoy className="h-4 w-4" style={{ color: "#EF4444" }} />
                  <ChevronRight className="h-4 w-4 opacity-30 group-hover:opacity-70 transition-opacity" style={{ color: "#EF4444" }} />
                </div>
                <h4 style={{ fontWeight: 700, fontSize: "13px", color: "#0F172A" }}>Emergency Hub</h4>
                <p style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 400 }}>112 dial &amp; contacts</p>
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
