"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { MapPin, Calculator, ShieldCheck, HelpCircle } from "lucide-react";

export default function PlanJourneyScreen() {
  const router = useRouter();

  // Form parameters
  const [fromLoc, setFromLoc] = useState("Mumbai, Maharashtra");
  const [toLoc, setToLoc] = useState("Pune, Maharashtra");
  const [travelMode, setTravelMode] = useState("Car"); // Car, Bike, Bus, Walk
  const [travelerType, setTravelerType] = useState("Solo Traveler");
  const [womenSafety, setWomenSafety] = useState("Preferred");
  const [language, setLanguage] = useState("English");
  const [accessibility, setAccessibility] = useState("No Preference");

  const handleFindRoute = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to Screen 4 (Living Map) passing parameters in search query
    const query = new URLSearchParams({
      from: fromLoc,
      dest: toLoc,
      mode: travelMode,
      travelerType: travelerType,
      womenSafety: womenSafety,
      language: language,
      accessibility: accessibility
    });
    router.push(`/map?${query.toString()}`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 md:pb-8 flex flex-col items-center">
      
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6">
        
        <div className="text-left">
          <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block">ASSESS Engine</span>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Plan Your Journey</h2>
          <p className="text-xs text-zinc-500 font-semibold">Configure routing safety preferences and evaluate environmental risks.</p>
        </div>

        {/* Desktop Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Journey Input Form (8 cols on desktop) */}
          <div className="lg:col-span-8">
            <form onSubmit={handleFindRoute} className="rounded-3xl border border-zinc-200 bg-white p-6 md:p-8 shadow-sm space-y-6 text-left">
              
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-zinc-150">
                <Calculator className="h-4.5 w-4.5 text-indigo-600" />
                Route Diagnostics Configurator
              </h3>

              {/* Form Input elements grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* From input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">From Location</label>
                  <input
                    type="text"
                    value={fromLoc}
                    onChange={(e) => setFromLoc(e.target.value)}
                    className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-xs text-zinc-800 focus:outline-none focus:border-indigo-500 font-bold"
                    placeholder="Enter starting coordinates"
                    required
                  />
                </div>

                {/* To input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">To Destination</label>
                  <input
                    type="text"
                    value={toLoc}
                    onChange={(e) => setToLoc(e.target.value)}
                    className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-xs text-zinc-800 focus:outline-none focus:border-indigo-500 font-bold"
                    placeholder="Enter ending destination"
                    required
                  />
                </div>

              </div>

              {/* Travel Mode select pills grid */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Travel Transit Mode</label>
                <div className="grid grid-cols-4 gap-3 max-w-md">
                  {["Car", "Bike", "Bus", "Walk"].map((mode) => {
                    const isActive = travelMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setTravelMode(mode)}
                        className={`rounded-xl py-2.5 text-xs font-black border transition-all ${
                          isActive
                            ? "bg-indigo-600 border-indigo-650 text-white shadow-md shadow-indigo-600/10"
                            : "bg-white border-zinc-250 text-zinc-600 hover:bg-zinc-50"
                        }`}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preferences Subsections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-zinc-150">
                
                {/* Preferences column */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block border-b border-zinc-100 pb-1">
                    Route Preferences
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase block">Traveler Type</label>
                      <select
                        value={travelerType}
                        onChange={(e) => setTravelerType(e.target.value)}
                        className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-800 font-bold focus:outline-none"
                      >
                        <option value="Solo Traveler">Solo Traveler</option>
                        <option value="Family Group">Family Group</option>
                        <option value="Business traveler">Business traveler</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase block">Women Safety</label>
                      <select
                        value={womenSafety}
                        onChange={(e) => setWomenSafety(e.target.value)}
                        className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-800 font-bold focus:outline-none"
                      >
                        <option value="Preferred">Preferred</option>
                        <option value="Standard">Standard</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Additional Options column */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block border-b border-zinc-100 pb-1">
                    Additional Options
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase block">Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-800 font-bold focus:outline-none"
                      >
                        <option value="English">English</option>
                        <option value="Hindi">Hindi (हिंदी)</option>
                        <option value="Tamil">Tamil (தமிழ்)</option>
                        <option value="Telugu">Telugu (తెలుగు)</option>
                        <option value="Bengali">Bengali (বাংলা)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase block">Accessibility</label>
                      <select
                        value={accessibility}
                        onChange={(e) => setAccessibility(e.target.value)}
                        className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-800 font-bold focus:outline-none"
                      >
                        <option value="No Preference">No Preference</option>
                        <option value="Wheelchair Access">Wheelchair</option>
                        <option value="Low Mobility Support">Low Mobility</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 py-3.5 text-xs font-black text-white hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/10 mt-6"
              >
                Find Best Route
              </button>

            </form>
          </div>

          {/* Right panel: Information Summary guidelines (4 cols on desktop) */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-left space-y-4">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5 text-indigo-600" />
                Vigilance Guidelines
              </h3>
              
              <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
                Travel Guardian evaluates crime index averages, road illumination factors, weather bulletins, and proximity logs to recommend safer paths.
              </p>
              
              <div className="rounded-2xl bg-zinc-50 border border-zinc-150 p-4 text-[10px] text-zinc-450 leading-relaxed font-bold">
                ⚠️ SAFETY NOTICE: Environmental threats are dynamic. Route recommendations represent safer alternatives but do not guarantee complete safety.
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Bottom navbar for mobile */}
      <div className="md:hidden">
        <BottomNav />
      </div>

    </div>
  );
}
