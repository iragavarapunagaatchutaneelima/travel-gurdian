"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { 
  Calculator, ShieldCheck, MapPin, ArrowRight, CheckCircle2, 
  AlertTriangle, Coffee, Fuel, BedDouble, PlusSquare, Car, Bike, Bus, Footprints, Shield
} from "lucide-react";
import { CITIES, generateRoutes, RouteOption } from "@/data/routeData";

export default function PlanJourneyScreen() {
  const router = useRouter();

  // All 6 supported Indian cities as defined in Phase 5
  const supportedCities = [
    { id: "chennai", name: "Chennai", state: "Tamil Nadu", type: "Origin / Destination" },
    { id: "mumbai", name: "Mumbai", state: "Maharashtra", type: "Origin / Destination" },
    { id: "delhi", name: "Delhi", state: "Delhi NCR", type: "Origin / Destination" },
    { id: "hyderabad", name: "Hyderabad", state: "Telangana", type: "Origin / Destination" },
    { id: "bangalore", name: "Bangalore", state: "Karnataka", type: "Origin / Destination" },
    { id: "vizag", name: "Visakhapatnam", state: "Andhra Pradesh", type: "Origin / Destination" }
  ];

  const [fromLoc, setFromLoc] = useState("chennai");
  const [toLoc, setToLoc] = useState("bangalore");
  const [travelMode, setTravelMode] = useState<"Car" | "Bike" | "Bus" | "Walk">("Car"); 
  const [travelerType, setTravelerType] = useState("Solo Traveler");
  const [womenSafety, setWomenSafety] = useState("Preferred");
  const [language, setLanguage] = useState("English");
  const [accessibility, setAccessibility] = useState("No Preference");

  // View state
  const [showRoutes, setShowRoutes] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [validationError, setValidationError] = useState("");

  const handleFindRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromLoc === toLoc) {
      setValidationError("Origin and Destination cannot be the same city. Please select two distinct locations.");
      return;
    }
    setValidationError("");
    const generated = generateRoutes(fromLoc, toLoc, travelMode);
    setRoutes(generated);
    setShowRoutes(true);
  };

  const handleSelectRoute = (routeId: string) => {
    const query = new URLSearchParams({
      from: fromLoc,
      dest: toLoc,
      mode: travelMode,
      travelerType: travelerType,
      womenSafety: womenSafety,
      routeId: routeId
    });
    router.push(`/map?${query.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      <Header />

      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6 animate-slideUp">
        
        {!showRoutes ? (
          <>
            <div className="text-left">
              <span className="text-[10px] text-primary-accent font-extrabold uppercase tracking-widest block">
                ASSESS Route Engine
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mt-1">
                PLAN YOUR JOURNEY
              </h2>
              <p className="text-xs text-muted font-semibold mt-1">
                Configure your route and travel safety preferences across supported primary city corridors.
              </p>
            </div>

            {validationError && (
              <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              <div className="lg:col-span-8">
                <form onSubmit={handleFindRoute} className="rounded-3xl border border-border bg-surface p-6 md:p-8 shadow-sm space-y-6 text-left transition-colors">
                  
                  {/* Origin and Destination City Selectors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted uppercase tracking-wider block">
                        From Location (Origin)
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-accent" />
                        <select
                          value={fromLoc}
                          onChange={(e) => {
                            setFromLoc(e.target.value);
                            setValidationError("");
                          }}
                          className="w-full rounded-2xl bg-elevated-surface border border-border pl-10 pr-4 py-3.5 text-xs text-foreground focus:outline-none focus:border-primary-accent font-black transition-colors"
                        >
                          {supportedCities.map(c => (
                            <option key={`from-${c.id}`} value={c.id}>
                              {c.name}, {c.state}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted uppercase tracking-wider block">
                        To Destination
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
                        <select
                          value={toLoc}
                          onChange={(e) => {
                            setToLoc(e.target.value);
                            setValidationError("");
                          }}
                          className="w-full rounded-2xl bg-elevated-surface border border-border pl-10 pr-4 py-3.5 text-xs text-foreground focus:outline-none focus:border-primary-accent font-black transition-colors"
                        >
                          {supportedCities.map(c => (
                            <option key={`to-${c.id}`} value={c.id}>
                              {c.name}, {c.state}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Travel Mode (Car, Bike, Bus, Walk) */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted uppercase tracking-wider block">
                      Travel Mode
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg">
                      {[
                        { mode: "Car", icon: Car, desc: "Full Intelligence" },
                        { mode: "Bike", icon: Bike, desc: "Full Intelligence" },
                        { mode: "Bus", icon: Bus, desc: "Transit Schedule" },
                        { mode: "Walk", icon: Footprints, desc: "Pedestrian Path" }
                      ].map((item) => {
                        const isActive = travelMode === item.mode;
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.mode}
                            type="button"
                            onClick={() => setTravelMode(item.mode as any)}
                            className={`rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 border transition-all text-xs font-black ${
                              isActive
                                ? "bg-primary-accent border-primary-accent-hover text-white shadow-md shadow-primary-accent/25"
                                : "bg-elevated-surface border-border text-foreground hover:bg-border"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{item.mode}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Safety & Traveler Preferences */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted uppercase block">Traveler Type</label>
                      <select
                        value={travelerType}
                        onChange={(e) => setTravelerType(e.target.value)}
                        className="w-full rounded-2xl bg-elevated-surface border border-border px-4 py-3 text-xs text-foreground font-black focus:outline-none"
                      >
                        <option value="Solo Traveler">Solo Traveler</option>
                        <option value="Group">Group / Companions</option>
                        <option value="Family">Family with Children</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted uppercase block">Women Safety Preference</label>
                      <select
                        value={womenSafety}
                        onChange={(e) => setWomenSafety(e.target.value)}
                        className="w-full rounded-2xl bg-elevated-surface border border-border px-4 py-3 text-xs text-foreground font-black focus:outline-none"
                      >
                        <option value="Preferred">Preferred (Prioritize Patrolled Corridors & CCTV Nodes)</option>
                        <option value="Standard">Standard (Fastest Available Route)</option>
                      </select>
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-primary-accent hover:bg-primary-accent-hover py-4 text-sm font-black text-white transition-all shadow-lg hover:shadow-primary-accent/30 mt-6 flex items-center justify-center gap-2"
                  >
                    <span>FIND BEST ROUTE</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>

              {/* Right Panel: Intelligence Info */}
              <div className="lg:col-span-4 space-y-6">
                <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm text-left space-y-4 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-primary-accent/10 text-primary-accent">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                        Route Intelligence Engine
                      </h3>
                      <span className="text-[9px] font-bold text-muted uppercase">6 Indian Metro Hubs</span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted leading-relaxed font-semibold">
                    Travel Guardian calculates 4 distinct safety profiles per trip: Safety Corridors, Express Bypasses, Balanced Township links, and Caution Routes with transparent multi-factor scoring.
                  </p>

                  <div className="pt-3 border-t border-border space-y-2 text-xs font-bold text-muted">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Cross-compatible origin & destination matrix</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Night travel & weather hazard evaluation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Verified fuel, food & hospital POIs</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </>
        ) : (
          <div className="space-y-8 animate-slideUp">
            {/* Results Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4 text-left">
              <div>
                <button 
                  onClick={() => setShowRoutes(false)} 
                  className="text-[10px] font-black text-primary-accent hover:underline uppercase tracking-widest flex items-center gap-1 mb-1 transition-colors"
                >
                  ← Back to Planning Form
                </button>
                <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                  BEST ROUTES (4 OPTIONS GENERATED)
                </h2>
                <p className="text-xs text-muted font-bold mt-1">
                  Corridor from {CITIES[fromLoc]?.name} to {CITIES[toLoc]?.name} • {travelMode} Mode • {womenSafety === "Preferred" ? "Women Safety Prioritized" : "Standard Safety"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-muted uppercase bg-elevated-surface px-3 py-1.5 rounded-full border border-border">
                  Simulated Demo Intelligence
                </span>
              </div>
            </div>

            {/* 4 Distinct Route Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {routes.map((route) => {
                const isRecommended = route.recommendation === "HIGHLY RECOMMENDED";
                const isCaution = route.recommendation === "USE CAUTION";
                
                return (
                  <div 
                    key={route.id} 
                    className={`rounded-3xl border ${
                      isRecommended 
                        ? "border-success bg-success/5 shadow-md ring-1 ring-success/30" 
                        : isCaution 
                        ? "border-warning/60 bg-surface" 
                        : "border-border bg-surface"
                    } p-6 shadow-sm flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-lg text-left`}
                  >
                    <div className="space-y-4">
                      {/* Top Badges */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                            Route {route.id}
                          </span>
                          <h3 className="font-black text-foreground text-base mt-0.5 leading-tight">
                            {route.name}
                          </h3>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                          route.recommendation === "HIGHLY RECOMMENDED" ? "bg-success text-white" :
                          route.recommendation === "RECOMMENDED" ? "bg-info text-white" :
                          "bg-warning text-white"
                        }`}>
                          {route.recommendation}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted font-semibold leading-relaxed">
                        {route.subtitle}
                      </p>

                      {/* Primary Metrics */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-border">
                        <div>
                          <span className="text-muted text-[8px] font-extrabold uppercase block">Safety</span>
                          <span className={`text-base font-black ${
                            route.safetyScore >= 85 ? "text-success" : route.safetyScore >= 70 ? "text-info" : "text-warning"
                          }`}>
                            {route.safetyScore}/100
                          </span>
                        </div>
                        <div>
                          <span className="text-muted text-[8px] font-extrabold uppercase block">Time</span>
                          <span className="text-xs font-black text-foreground">{route.time}</span>
                        </div>
                        <div>
                          <span className="text-muted text-[8px] font-extrabold uppercase block">Distance</span>
                          <span className="text-xs font-black text-foreground">{route.distance}</span>
                        </div>
                      </div>

                      {/* Secondary Factors */}
                      <div className="space-y-1.5 text-xs font-semibold text-muted">
                        <div className="flex justify-between">
                          <span>Traffic:</span> 
                          <span className="font-bold text-foreground">{route.trafficScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Road Quality:</span> 
                          <span className="font-bold text-foreground">{route.roadScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Night Safety:</span> 
                          <span className="font-bold text-foreground">{route.nightSafety}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Weather Risk:</span> 
                          <span className="font-bold text-foreground">{route.weatherRisk}</span>
                        </div>
                      </div>
                      
                      {/* POI Counts */}
                      <div className="pt-3 border-t border-border flex items-center justify-around text-muted">
                        <div className="flex flex-col items-center" title="Rest Stops">
                          <Coffee className="h-4 w-4 mb-0.5 text-primary-accent" />
                          <span className="text-[9px] font-bold">{route.restStops} Rest</span>
                        </div>
                        <div className="flex flex-col items-center" title="Fuel Stations">
                          <Fuel className="h-4 w-4 mb-0.5 text-warning" />
                          <span className="text-[9px] font-bold">{route.fuelStops} Fuel</span>
                        </div>
                        <div className="flex flex-col items-center" title="Hotels">
                          <BedDouble className="h-4 w-4 mb-0.5 text-info" />
                          <span className="text-[9px] font-bold">{route.hotels} Stay</span>
                        </div>
                        <div className="flex flex-col items-center" title="Emergency Access">
                          <PlusSquare className="h-4 w-4 mb-0.5 text-danger" />
                          <span className="text-[9px] font-bold">SOS</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-5 space-y-2">
                      <button
                        onClick={() => handleSelectRoute(route.id)}
                        className={`w-full rounded-xl py-3 text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                          isRecommended 
                            ? "bg-primary-accent hover:bg-primary-accent-hover text-white shadow-md shadow-primary-accent/20" 
                            : "bg-elevated-surface hover:bg-border text-foreground border border-border"
                        }`}
                      >
                        <span>SELECT ROUTE</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Route Comparison Matrix (Compact) */}
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm overflow-x-auto text-left transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-muted uppercase tracking-widest">
                  Side-by-Side Route Comparison Matrix
                </h3>
                <span className="text-[10px] font-bold text-muted">Multi-Profile Model</span>
              </div>

              <table className="w-full text-left text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-border text-muted font-black uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Metric</th>
                    {routes.map(r => (
                      <th key={r.id} className="py-3 px-3">
                        Route {r.id} ({r.name.split(" ")[0]})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-semibold text-foreground divide-y divide-border">
                  <tr>
                    <td className="py-2.5 px-3 text-muted font-bold">Safety Score</td>
                    {routes.map(r => (
                      <td key={r.id} className="py-2.5 px-3 font-black text-primary-accent">
                        {r.safetyScore}/100
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-muted font-bold">Travel Time</td>
                    {routes.map(r => <td key={r.id} className="py-2.5 px-3">{r.time}</td>)}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-muted font-bold">Distance</td>
                    {routes.map(r => <td key={r.id} className="py-2.5 px-3">{r.distance}</td>)}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-muted font-bold">Traffic Congestion</td>
                    {routes.map(r => <td key={r.id} className="py-2.5 px-3">{r.trafficScore}</td>)}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-muted font-bold">Night Safety</td>
                    {routes.map(r => <td key={r.id} className="py-2.5 px-3">{r.nightSafety}</td>)}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-muted font-bold">Weather Risk</td>
                    {routes.map(r => <td key={r.id} className="py-2.5 px-3">{r.weatherRisk}</td>)}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-muted font-bold">Emergency Index</td>
                    {routes.map(r => <td key={r.id} className="py-2.5 px-3">{r.emergencyAccessScore}/100</td>)}
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
