"use client";

import React, { useState } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { Share2, Phone, ShieldPlus, Landmark, PhoneCall, Check } from "lucide-react";

export default function EmergencyScreen() {
  const [sharingStatus, setSharingStatus] = useState("Your location is being shared with trusted contacts.");
  const [sharingActive, setSharingActive] = useState(true);

  const handleTriggerAction = (actionName: string) => {
    if (actionName === "Share My Location") {
      setSharingActive(!sharingActive);
      setSharingStatus(
        !sharingActive 
          ? "Your location is being shared with trusted contacts." 
          : "Location telemetry sharing paused."
      );
    } else if (actionName === "Contact Trusted Person") {
      alert("Simulating emergency SMS to Sarah Miller (+1-555-0199): 'EMERGENCY: I need assistance. My current coordinates have been updated on Travel Guardian.'");
    } else if (actionName === "Nearby Hospital") {
      alert("Opening nearby hospitals: 1. Metropolitan Hospital (+1-555-0144). 2. Red Cross Emergency Center (+1-555-0155).");
    } else {
      alert("Opening nearby Police Stations: Mumbai Central Police Station, Rajahmundry Police Control Sub-station.");
    }
  };

  const handleEmergencyCall = () => {
    alert("Initiating emergency hotline call dial... calling 112...");
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 md:pb-8 flex flex-col items-center">
      
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6 flex flex-col items-center">
        
        <div className="text-center max-w-xl space-y-2">
          <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-widest block">Emergency Services</span>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Emergency Assistance</h2>
          <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
            Quickly trigger SOS location sharing logs, alert your predefined guardians, or initiate regional public services hotlines immediately.
          </p>
        </div>

        {/* Core Actions Box */}
        <div className="w-full max-w-md space-y-4">
          
          <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
            
            {/* Share location */}
            <button
              onClick={() => handleTriggerAction("Share My Location")}
              className="w-full flex items-center justify-between rounded-2xl bg-zinc-50 border border-zinc-150 p-4 hover:bg-zinc-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="rounded-xl bg-red-500 text-white p-2.5">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-zinc-850 leading-tight">Share My Location</h3>
                  <span className="text-[10px] text-zinc-500 font-bold block mt-0.5">
                    {sharingActive ? "Active: sharing live GPS tracking" : "Disabled: tap to activate"}
                  </span>
                </div>
              </div>
              <span className="text-zinc-350 text-xs font-bold font-mono">➔</span>
            </button>

            {/* Contact Trusted Person */}
            <button
              onClick={() => handleTriggerAction("Contact Trusted Person")}
              className="w-full flex items-center justify-between rounded-2xl bg-zinc-50 border border-zinc-150 p-4 hover:bg-zinc-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="rounded-xl bg-purple-600 text-white p-2.5">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-zinc-850 leading-tight">Contact Trusted Person</h3>
                  <span className="text-[10px] text-zinc-500 font-bold block mt-0.5">
                    Call or message emergency contacts
                  </span>
                </div>
              </div>
              <span className="text-zinc-355 text-xs font-bold font-mono">➔</span>
            </button>

            {/* Nearby Hospital */}
            <button
              onClick={() => handleTriggerAction("Nearby Hospital")}
              className="w-full flex items-center justify-between rounded-2xl bg-zinc-50 border border-zinc-150 p-4 hover:bg-zinc-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="rounded-xl bg-blue-500 text-white p-2.5">
                  <ShieldPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-zinc-850 leading-tight">Nearby Hospital</h3>
                  <span className="text-[10px] text-zinc-500 font-bold block mt-0.5">
                    View nearby hospitals & directions
                  </span>
                </div>
              </div>
              <span className="text-zinc-350 text-xs font-bold font-mono">➔</span>
            </button>

            {/* Nearby Police / Emergency */}
            <button
              onClick={() => handleTriggerAction("Nearby Police / Emergency")}
              className="w-full flex items-center justify-between rounded-2xl bg-zinc-50 border border-zinc-150 p-4 hover:bg-zinc-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="rounded-xl bg-blue-600 text-white p-2.5">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-zinc-850 leading-tight">Nearby Police / Emergency</h3>
                  <span className="text-[10px] text-zinc-500 font-bold block mt-0.5">
                    Find police stations & emergency services
                  </span>
                </div>
              </div>
              <span className="text-zinc-350 text-xs font-bold font-mono">➔</span>
            </button>

          </div>

          {/* Big Red Button */}
          <button
            onClick={handleEmergencyCall}
            className="w-full flex items-center justify-center gap-3 rounded-3xl bg-red-650 hover:bg-red-500 text-white p-5 shadow-lg shadow-red-950/10 transition-transform active:scale-95"
          >
            <PhoneCall className="h-6 w-6 animate-pulse" />
            <span className="font-black text-sm tracking-wider uppercase">
              Emergency Services Call 112
            </span>
          </button>

          {/* Location shared checks label */}
          {sharingActive && (
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-550 pt-2">
              <div className="rounded-full bg-emerald-50 border border-emerald-250 p-0.5 text-emerald-600">
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
