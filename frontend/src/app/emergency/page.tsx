"use client";

import React, { useState } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { Share2, Phone, ShieldPlus, Landmark, PhoneCall, Check, AlertTriangle, ShieldCheck } from "lucide-react";

export default function EmergencyScreen() {
  const [sharingStatus, setSharingStatus] = useState("Your live location telemetry is being shared with registered contacts.");
  const [sharingActive, setSharingActive] = useState(true);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const handleTriggerAction = (actionName: string) => {
    if (actionName === "Share My Location") {
      setSharingActive(!sharingActive);
      setSharingStatus(
        !sharingActive 
          ? "Your live location telemetry is being shared with registered contacts." 
          : "Location telemetry sharing paused."
      );
      setAlertMessage(!sharingActive ? "Live GPS sharing activated." : "Live GPS sharing paused.");
    } else if (actionName === "Contact Trusted Person") {
      setAlertMessage("Emergency SMS dispatched to registered emergency contacts: 'EMERGENCY: I need assistance. My current coordinates have been broadcasted via Travel Guardian.'");
    } else if (actionName === "Nearby Hospital") {
      setAlertMessage("Nearby Medical Havens: 1. Apollo Emergency Care (1.2 km). 2. Government General Hospital (2.8 km). Emergency dispatch line active.");
    } else {
      setAlertMessage("Nearby Police Stations: Highway Patrol Station (0.8 km), Central Police Control Sub-station.");
    }
  };

  const handleEmergencyCall = () => {
    setAlertMessage("Initiating emergency hotline call dial to 112 (National Emergency Number)...");
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6 flex flex-col items-center animate-slideUp">
        
        <div className="text-center max-w-xl space-y-2">
          <span className="text-[10px] text-danger font-extrabold uppercase tracking-widest block">
            EMERGENCY RESPONSE PROTOCOL
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            Emergency & SOS Assistance
          </h2>
          <p className="text-xs text-muted font-semibold leading-relaxed">
            Quickly trigger SOS telemetry broadcasts, dispatch coordinates to registered guardians, or initiate regional public emergency hotline (112).
          </p>
        </div>

        {alertMessage && (
          <div className="w-full max-w-md p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-xs font-bold flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{alertMessage}</span>
            </div>
            <button onClick={() => setAlertMessage(null)} className="text-xs font-black hover:underline p-1">✕</button>
          </div>
        )}

        {/* Core Actions Box */}
        <div className="w-full max-w-md space-y-4">
          
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm space-y-3 transition-colors">
            
            {/* Share location */}
            <button
              onClick={() => handleTriggerAction("Share My Location")}
              className="w-full flex items-center justify-between rounded-2xl bg-elevated-surface border border-border p-4 hover:bg-border transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="rounded-xl bg-danger text-white p-2.5 shadow-sm">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-foreground leading-tight">
                    Share My Live Location
                  </h3>
                  <span className="text-[10px] text-muted font-bold block mt-0.5">
                    {sharingActive ? "Active: broadcasting live GPS coordinates" : "Disabled: tap to activate telemetry"}
                  </span>
                </div>
              </div>
              <span className="text-muted group-hover:text-foreground text-xs font-bold font-mono">➔</span>
            </button>

            {/* Contact Trusted Person */}
            <button
              onClick={() => handleTriggerAction("Contact Trusted Person")}
              className="w-full flex items-center justify-between rounded-2xl bg-elevated-surface border border-border p-4 hover:bg-border transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="rounded-xl bg-primary-accent text-white p-2.5 shadow-sm">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-foreground leading-tight">
                    Alert Guardian Contacts
                  </h3>
                  <span className="text-[10px] text-muted font-bold block mt-0.5">
                    Send emergency SMS & coordinates to guardians
                  </span>
                </div>
              </div>
              <span className="text-muted group-hover:text-foreground text-xs font-bold font-mono">➔</span>
            </button>

            {/* Nearby Hospital */}
            <button
              onClick={() => handleTriggerAction("Nearby Hospital")}
              className="w-full flex items-center justify-between rounded-2xl bg-elevated-surface border border-border p-4 hover:bg-border transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="rounded-xl bg-info text-white p-2.5 shadow-sm">
                  <ShieldPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-foreground leading-tight">
                    Nearby Hospital & Medical Havens
                  </h3>
                  <span className="text-[10px] text-muted font-bold block mt-0.5">
                    Emergency rooms & ambulance dispatch
                  </span>
                </div>
              </div>
              <span className="text-muted group-hover:text-foreground text-xs font-bold font-mono">➔</span>
            </button>

            {/* Nearby Police / Emergency */}
            <button
              onClick={() => handleTriggerAction("Nearby Police / Emergency")}
              className="w-full flex items-center justify-between rounded-2xl bg-elevated-surface border border-border p-4 hover:bg-border transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="rounded-xl bg-primary-accent-hover text-white p-2.5 shadow-sm">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-foreground leading-tight">
                    Nearby Police & Highway Patrol
                  </h3>
                  <span className="text-[10px] text-muted font-bold block mt-0.5">
                    Find nearest police stations & patrol booths
                  </span>
                </div>
              </div>
              <span className="text-muted group-hover:text-foreground text-xs font-bold font-mono">➔</span>
            </button>

          </div>

          {/* Big Red Button */}
          <button
            onClick={handleEmergencyCall}
            className="w-full flex items-center justify-center gap-3 rounded-3xl bg-danger hover:opacity-90 text-white p-5 shadow-xl shadow-danger/25 transition-transform active:scale-95"
          >
            <PhoneCall className="h-6 w-6 animate-pulse" />
            <span className="font-black text-sm tracking-wider uppercase">
              Emergency Services Call 112
            </span>
          </button>

          {/* Location shared checks label */}
          {sharingActive && (
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted pt-2">
              <div className="rounded-full bg-success/10 border border-success/30 p-0.5 text-success">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
              <span>{sharingStatus}</span>
            </div>
          )}

        </div>

      </div>

      {/* Bottom Nav */}
      <div className="md:hidden">
        <BottomNav />
      </div>

    </div>
  );
}
