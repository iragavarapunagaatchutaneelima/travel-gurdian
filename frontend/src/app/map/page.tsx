"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { 
  ArrowLeft, CheckCircle2, ShieldCheck, MapPin, CloudRain, Sun, 
  Wind, Car, Activity, Download, Settings, Loader, HelpCircle 
} from "lucide-react";

export const dynamic = "force-dynamic";

function LivingMapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Route parameters (support dynamic values from query strings)
  const fromLoc = searchParams.get("from") || "Mumbai, Maharashtra";
  const toLoc = searchParams.get("dest") || "Pune, Maharashtra";
  const travelMode = searchParams.get("mode") || "Car";
  const travelerType = searchParams.get("travelerType") || "Solo Traveler";
  const womenSafety = searchParams.get("womenSafety") || "Preferred";
  const language = searchParams.get("language") || "English";
  const accessibility = searchParams.get("accessibility") || "No Preference";

  // Simulation parameters
  const [isOffline, setIsOffline] = useState(false);
  const [isGpsOn, setIsGpsOn] = useState(true);
  const [isRouteDrifted, setIsRouteDrifted] = useState(false);
  const [savingPack, setSavingPack] = useState(false);
  const [isPackSaved, setIsPackSaved] = useState(false);
  
  // Custom manual tracking coordinates
  const [manualX, setManualX] = useState("200");
  const [manualY, setManualY] = useState("130");

  // Route Selection state (A = Safer, B = Alternative / Risky)
  const [selectedRoute, setSelectedRoute] = useState<"A" | "B">("A");

  // Weather telemetry condition state (rainy, sunny, cloudy)
  const [weatherCondition, setWeatherCondition] = useState<"rainy" | "sunny" | "cloudy">("rainy");

  // Dynamic user profile name
  const [profileName, setProfileName] = useState("Traveler");

  // Verified Public POIs list with KM details
  const [pois, setPois] = useState([
    { id: 1, name: "Reliance Green Fuel Station", type: "petrol", x: 310, y: 110, distance: "12.4 km", rating: "4.5★", status: "Verified Safe Rest Stop", phone: "+91 98480 22334" },
    { id: 2, name: "HP Highway Petrol Bunk", type: "petrol", x: 500, y: 210, distance: "34.1 km", rating: "4.2★", status: "CCTV Checked Center", phone: "+91 99123 44556" },
    { id: 3, name: "Apollo Emergency Clinic", type: "hospital", x: 420, y: 150, distance: "21.8 km", rating: "4.8★", status: "24/7 Trauma Services", phone: "+91 884 2351234" },
    { id: 4, name: "Hotel Sri Kanya Grand", type: "hotel", x: 590, y: 260, distance: "45.0 km", rating: "4.6★", status: "Family & Women Approved Rooming", phone: "+91 883 2445566" },
    { id: 5, name: "Goutami Regional Restroom", type: "restroom", x: 250, y: 140, distance: "4.2 km", rating: "4.0★", status: "Verified Clean Restroom Block", phone: "N/A" }
  ]);

  const [selectedPOI, setSelectedPOI] = useState<any>(null);

  // Public Reviews state
  const [reviews, setReviews] = useState<{ author: string; text: string; date: string; rating: number }[]>([]);
  const [newReviewText, setNewReviewText] = useState("");
  const [newReviewRating, setNewReviewRating] = useState(5);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Get profile name
      const storedName = localStorage.getItem("user_identity");
      if (storedName) {
        if (storedName.includes("@")) {
          setProfileName(storedName.split("@")[0]);
        } else {
          setProfileName(storedName);
        }
      }

      // Load reviews
      const cacheKey = `public_reviews_${fromLoc.split(",")[0]}_${toLoc.split(",")[0]}`;
      const savedReviews = localStorage.getItem(cacheKey);
      if (savedReviews) {
        setReviews(JSON.parse(savedReviews));
      } else {
        // Seed default reviews for route safety
        const seed = [
          { author: "Ramesh Kumar", text: `NH-16 near ${fromLoc.split(",")[0]} has excellent road surface, but toll intersections are crowded. Drive slowly.`, date: "2 days ago", rating: 4 },
          { author: "Anitha Reddy", text: `Highly recommend the Reliance Green Fuel Station at 12.4 km! Restrooms are verified clean, and parking is well-lit for solo women travelers.`, date: "1 week ago", rating: 5 },
          { author: "Suresh Rao", text: "Avoid driving near the bypass junction after 10 PM due to active road construction work.", date: "3 days ago", rating: 3 }
        ];
        setReviews(seed);
        localStorage.setItem(cacheKey, JSON.stringify(seed));
      }
    }
  }, [fromLoc, toLoc]);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;

    const newRev = {
      author: profileName.charAt(0).toUpperCase() + profileName.slice(1),
      text: newReviewText.trim(),
      date: "Just now",
      rating: newReviewRating
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);
    setNewReviewText("");
    
    if (typeof window !== "undefined") {
      const cacheKey = `public_reviews_${fromLoc.split(",")[0]}_${toLoc.split(",")[0]}`;
      localStorage.setItem(cacheKey, JSON.stringify(updated));
    }
  };

  const startNode = { x: 200, y: 130 };
  const endNode = { x: 700, y: 320 };

  const selectedRoutePath = `M ${startNode.x} ${startNode.y} Q 350 80, 520 220 T ${endNode.x} ${endNode.y}`;
  const alternativeRoutePath = `M ${startNode.x} ${startNode.y} Q 250 250, 480 340 T ${endNode.x} ${endNode.y}`;

  const handleOfflineMode = () => {
    router.push(`/offline-mode?from=${encodeURIComponent(fromLoc)}&dest=${encodeURIComponent(toLoc)}`);
  };

  const handleSavePack = () => {
    setSavingPack(true);
    setTimeout(() => {
      setSavingPack(false);
      setIsPackSaved(true);
      localStorage.setItem("journey_safety_pack", JSON.stringify({
        from: fromLoc,
        dest: toLoc,
        savedAt: new Date().toISOString()
      }));
      alert("Journey Safety Pack saved offline successfully!");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 md:pb-8 flex flex-col items-center">
      
      {/* Sticky header navigation */}
      <Header />

      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="w-full bg-amber-600 text-black px-6 py-2.5 text-[11px] font-black text-center uppercase tracking-widest flex items-center justify-center gap-2 animate-fadeIn z-30">
          <span>📶 Offline Guardian Active: Running on Cached Journey Pack (Calculations Frozen)</span>
        </div>
      )}

      {/* GPS Warning Banner */}
      {!isGpsOn && (
        <div className="w-full bg-zinc-800 text-zinc-350 px-6 py-2 text-[10px] font-bold text-center flex items-center justify-center gap-2 z-35 animate-fadeIn">
          <span>🛰️ GPS Signal Disabled: Use manual coordinates inputs in the map console panel.</span>
        </div>
      )}

      {/* Route Drift Alert Banner */}
      {isRouteDrifted && (
        <div className="w-full bg-red-950 border-b border-red-800 text-white px-6 py-3.5 text-xs font-semibold text-center flex flex-col md:flex-row items-center justify-center gap-4 animate-fadeIn z-40">
          <span className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
            ⚠️ You appear to have left your saved journey route.
          </span>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => {
                setIsRouteDrifted(false);
                setManualX("200");
                setManualY("130");
              }}
              className="rounded bg-white text-black px-3.5 py-2 font-black uppercase text-[10px] hover:bg-zinc-200"
            >
              Follow Saved Route
            </button>
            <button
              onClick={() => {
                setIsRouteDrifted(false);
                setManualX("250");
                setManualY("250");
              }}
              className="rounded border border-white px-3.5 py-2 font-black uppercase text-[10px] hover:bg-white/10"
            >
              Saved Alternative
            </button>
            <button
              onClick={() => {
                router.push("/emergency");
              }}
              className="rounded bg-red-650 text-white px-3.5 py-2 font-black uppercase text-[10px] hover:bg-red-500"
            >
              Emergency Assistance
            </button>
          </div>
        </div>
      )}

      {/* Main wide screen content area */}
      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6">
        
        {/* Breadcrumb info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-4 text-left">
          <div>
            <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block">SENSE Engine</span>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight mt-0.5">
              Live Map: {fromLoc.split(",")[0]} to {toLoc.split(",")[0]}
            </h2>
            <p className="text-xs text-zinc-500 font-bold mt-1">
              Parameters: {travelMode} Mode • {travelerType} • Women Safety: {womenSafety}
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white border border-zinc-200 rounded-2xl px-4 py-2 text-xs font-black text-indigo-600">
            <span>
              {weatherCondition === "rainy" ? "🌧️ Heavy Rain 26°C" :
               weatherCondition === "sunny" ? "☀️ Sunny 32°C" : "☁️ Cloudy 24°C"}
            </span>
            <span className="text-zinc-300">|</span>
            <span>
              {weatherCondition === "rainy" ? "AQI 82 (Fair)" :
               weatherCondition === "sunny" ? "AQI 45 (Good)" : "AQI 60 (Moderate)"}
            </span>
            <span className="text-zinc-300">|</span>
            <span>
              {weatherCondition === "rainy" ? "Traffic High" :
               weatherCondition === "sunny" ? "Traffic Normal" : "Traffic Medium"}
            </span>
          </div>
        </div>

        {/* Desktop Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Score cards & simulation controls (col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-left space-y-4">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-150 pb-2 flex items-center justify-between">
                <span>Select Travel Route</span>
                <span className="text-[9px] bg-indigo-50 text-indigo-650 px-2 py-0.5 rounded-full font-bold">2 Paths Found</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoute("A");
                    setManualX("310");
                    setManualY("110");
                  }}
                  className={`rounded-2xl border p-4 text-left space-y-1 transition-all ${
                    selectedRoute === "A"
                      ? "border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-600"
                      : "border-zinc-200 bg-white hover:bg-zinc-50"
                  }`}
                >
                  <span className="text-[10px] font-black text-indigo-600 block uppercase">Route A</span>
                  <span className="text-xs font-black text-zinc-800 block">Safe Corridor</span>
                  <span className="text-[10px] font-extrabold text-emerald-600 block mt-1">92 (Low Risk)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoute("B");
                    setManualX("500");
                    setManualY("210");
                  }}
                  className={`rounded-2xl border p-4 text-left space-y-1 transition-all ${
                    selectedRoute === "B"
                      ? "border-amber-600 bg-amber-50/20 ring-1 ring-amber-600"
                      : "border-zinc-200 bg-white hover:bg-zinc-50"
                  }`}
                >
                  <span className="text-[10px] font-black text-amber-650 block uppercase">Route B</span>
                  <span className="text-xs font-black text-zinc-800 block">Alternate Bypass</span>
                  <span className="text-[10px] font-extrabold text-red-500 block mt-1">64 (High Risk!)</span>
                </button>
              </div>

              {/* Dynamic Explanation Section below selectors (Why choose Route A over B) */}
              <div className="rounded-2xl bg-zinc-100/70 border border-zinc-200 p-4 space-y-2 text-xs font-semibold text-zinc-800 leading-relaxed">
                <span className="text-[9px] font-black text-zinc-550 uppercase tracking-wide block">Route Risk Diagnostics & Reasons</span>
                {selectedRoute === "A" ? (
                  <p>
                    <span className="text-indigo-600 font-bold">✓ Recommended Route A:</span> Follows the main National Highway corridor. It features fully illuminated lane structures, active police patrol assistance hubs, and 5 verified safety rest stops. Safe for solo or women travel.
                  </p>
                ) : (
                  <p>
                    <span className="text-red-500 font-bold">⚠️ Warning Route B:</span> Route B is 12 km shorter but features unlit segments, storm drainage hazards (active waterlogging warning due to rain), and minimal CCTV security nodes. Risk of stranded breakdowns.
                  </p>
                )}
              </div>
            </div>

            {/* Safety Score Card (Mockup styled inside desktop grid) */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-left space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-150 pb-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Route Safety Index</h3>
                  <p className="text-sm font-black text-zinc-800">Risk Assessment Margin</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 font-black text-sm shadow-inner transition-colors ${
                    selectedRoute === "A"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                      : "border-red-500 bg-red-50 text-red-650 animate-pulse"
                  }`}>
                    {selectedRoute === "A" ? "92" : "64"}
                  </div>
                  <div className="text-left leading-none">
                    <span className="text-[10px] font-black text-zinc-900 block uppercase">
                      {selectedRoute === "A" ? "Safer Path" : "RISK DETECTED"}
                    </span>
                    <span className="text-[9px] text-zinc-400 font-semibold mt-1 block">
                      {selectedRoute === "A" ? "Active Guard Rails" : "High Hazard Risk"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Checklists */}
              <div className="grid grid-cols-2 gap-3.5 text-xs font-bold text-zinc-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4.5 w-4.5 ${selectedRoute === "A" ? "text-indigo-600" : "text-amber-500"}`} />
                  <span>Weather {selectedRoute === "A" ? "(Clear)" : "(Storm alert)"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4.5 w-4.5 ${selectedRoute === "A" ? "text-indigo-600" : "text-amber-500"}`} />
                  <span>Traffic {selectedRoute === "A" ? "(Low)" : "(High delays)"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5 text-indigo-600" />
                  <span>Air Quality (OK)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5 text-indigo-600" />
                  <span>CCTV Coverage {selectedRoute === "A" ? "(Good)" : "(None)"}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <CheckCircle2 className="h-4.5 w-4.5 text-indigo-600" />
                  <span>Verified Safe rest stops nearby</span>
                </div>
              </div>

              {/* Journey Pack Caching tools */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={handleSavePack}
                  disabled={savingPack}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 py-3 text-xs font-black text-zinc-750 transition-colors"
                >
                  {savingPack ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin text-indigo-600" />
                      <span>Saving offline pack...</span>
                    </>
                  ) : isPackSaved ? (
                    <span className="text-emerald-600 flex items-center gap-1 font-extrabold">✓ Caching completed</span>
                  ) : (
                    <span>💼 Save Journey Pack (Offline)</span>
                  )}
                </button>
                
                <button
                  onClick={handleOfflineMode}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 py-3 text-xs font-black text-white transition-colors"
                >
                  📡 Simulate Offline Mode
                </button>
              </div>
            </div>

            {/* Public Review & Feedback Section */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-left space-y-4">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-150 pb-2 flex items-center justify-between">
                <span>Route Reviews & Safety Feedbacks</span>
                <span className="text-[9px] bg-indigo-50 text-indigo-650 px-2 py-0.5 rounded-full">Public Hub</span>
              </h3>

              {/* Reviews list */}
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {reviews.map((rev, idx) => (
                  <div key={idx} className="border-b border-zinc-100 pb-2.5 space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-extrabold text-zinc-800">{rev.author}</span>
                      <span className="text-zinc-400 font-semibold">{rev.date}</span>
                    </div>
                    <div className="text-[9px] text-amber-500 font-bold">
                      {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                    </div>
                    <p className="text-[10px] text-zinc-650 leading-relaxed font-semibold">
                      {rev.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Add review form */}
              <form onSubmit={handleSubmitReview} className="space-y-2 pt-2 border-t border-zinc-150">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Write a public review</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder="Share road hazards, lighting safety..."
                    className="flex-1 rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2 text-[10px] text-zinc-800 focus:outline-none focus:border-indigo-500 font-bold"
                    required
                  />
                  <select
                    value={newReviewRating}
                    onChange={(e) => setNewReviewRating(Number(e.target.value))}
                    className="rounded-xl bg-zinc-50 border border-zinc-200 px-2 py-2 text-[10px] text-zinc-850 font-bold focus:outline-none"
                  >
                    <option value="5">5★</option>
                    <option value="4">4★</option>
                    <option value="3">3★</option>
                    <option value="2">2★</option>
                    <option value="1">1★</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-650 hover:bg-indigo-550 text-white px-3 text-[10px] font-black"
                  >
                    Post
                  </button>
                </div>
              </form>
            </div>

            {/* Simulation controls panel */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-5 text-left space-y-4 shadow-sm">
              <span className="text-[10px] font-black text-zinc-550 uppercase tracking-widest block border-b border-zinc-150 pb-2">
                Simulation Overrides console
              </span>

              <div className="space-y-2.5 text-xs font-bold text-zinc-550">
                <label className="flex items-center justify-between cursor-pointer">
                  <span>GPS Tracking Node</span>
                  <button
                    onClick={() => {
                      setIsGpsOn(!isGpsOn);
                      if (isGpsOn) {
                        setManualX("200");
                        setManualY("130");
                      }
                    }}
                    className={`rounded px-2.5 py-1 text-[9px] font-black border ${
                      isGpsOn ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-zinc-100 border-zinc-200 text-zinc-500"
                    }`}
                  >
                    {isGpsOn ? "Active" : "Disabled"}
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span>Route Drift Status</span>
                  <button
                    onClick={() => {
                      if (isRouteDrifted) {
                        setIsRouteDrifted(false);
                        setManualX("200");
                        setManualY("130");
                      } else {
                        setIsRouteDrifted(true);
                        setManualX("420");
                        setManualY("400");
                      }
                    }}
                    className={`rounded px-2.5 py-1 text-[9px] font-black border ${
                      isRouteDrifted ? "bg-red-50 border-red-200 text-red-650 animate-pulse" : "bg-zinc-100 border-zinc-200 text-zinc-500"
                    }`}
                  >
                    {isRouteDrifted ? "Drifted" : "Within Path"}
                  </button>
                </label>

                {/* Weather simulation selectors */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-150">
                  <span className="text-[9px] font-black text-zinc-550 uppercase tracking-widest block">Environment Simulation</span>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {["rainy", "sunny", "cloudy"].map((cond) => {
                      const isActive = weatherCondition === cond;
                      return (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => setWeatherCondition(cond as any)}
                          className={`rounded-lg py-1.5 text-[9px] font-black border transition-all uppercase ${
                            isActive
                              ? "bg-indigo-600 border-indigo-650 text-white shadow-sm"
                              : "bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50"
                          }`}
                        >
                          {cond === "rainy" ? "🌧️ Rainy" :
                           cond === "sunny" ? "☀️ Sunny" : "☁️ Cloudy"}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Manual position coordinate sliders when GPS is disabled */}
              {!isGpsOn && (
                <div className="space-y-2 pt-2 border-t border-zinc-150">
                  <span className="text-[9px] font-black text-zinc-500 uppercase block">Manual Coordinates Input</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-zinc-400">
                    <div>
                      <label className="block mb-1">COORD X (0-900)</label>
                      <input
                        type="number"
                        value={manualX}
                        onChange={(e) => setManualX(e.target.value)}
                        className="w-full rounded bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-zinc-800"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">COORD Y (0-675)</label>
                      <input
                        type="number"
                        value={manualY}
                        onChange={(e) => setManualY(e.target.value)}
                        className="w-full rounded bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-zinc-800"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right panel: SVG Map Canvas (col-span-8) */}
          <div className="lg:col-span-8">
            <div className="relative w-full aspect-[4/3] rounded-[32px] border border-zinc-200 bg-white overflow-hidden shadow-sm">
              
              {/* City Grid Line drawing mock */}
              <svg viewBox="0 0 900 675" className="absolute inset-0 w-full h-full stroke-zinc-150 stroke-[1.5] fill-none opacity-40">
                <path d="M 0 520 Q 300 480 600 550 T 900 510 L 900 675 L 0 675 Z" className="fill-indigo-50/20 stroke-indigo-150 stroke-[2]" />
                <line x1="150" y1="0" x2="150" y2="675" />
                <line x1="300" y1="0" x2="300" y2="675" />
                <line x1="450" y1="0" x2="450" y2="675" />
                <line x1="600" y1="0" x2="600" y2="675" />
                <line x1="750" y1="0" x2="750" y2="675" />
                <line x1="0" y1="150" x2="900" y2="150" />
                <line x1="0" y1="300" x2="900" y2="300" />
                <line x1="0" y1="450" x2="900" y2="450" />
                <line x1="0" y1="600" x2="900" y2="600" />
              </svg>

              {/* SVG Map Path layer */}
              <svg viewBox="0 0 900 675" className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                {/* Route A Path */}
                <path 
                  d={selectedRoutePath} 
                  fill="none" 
                  stroke={selectedRoute === "A" ? "#6366f1" : "#4b5563"} 
                  strokeWidth={selectedRoute === "A" ? "9" : "6"} 
                  strokeDasharray={selectedRoute === "A" ? "" : "8 8"} 
                  strokeLinecap="round" 
                />

                {/* Route B Path */}
                <path 
                  d={alternativeRoutePath} 
                  fill="none" 
                  stroke={selectedRoute === "B" ? "#ef4444" : "#f59e0b"} 
                  strokeWidth={selectedRoute === "B" ? "9" : "6"} 
                  strokeDasharray={selectedRoute === "B" ? "" : "8 8"} 
                  strokeLinecap="round" 
                />

                {/* Start Pin */}
                <circle cx={startNode.x} cy={startNode.y} r="12" fill="#4f46e5" stroke="#ffffff" strokeWidth="3" />
                
                {/* End Pin */}
                <circle cx={endNode.x} cy={endNode.y} r="12" fill="#818cf8" stroke="#ffffff" strokeWidth="3" />

                {/* Live Location Marker (glowing blue ring) */}
                <g>
                  <circle cx={Number(manualX)} cy={Number(manualY)} r="14" className="fill-indigo-500/20 stroke-indigo-500 stroke-[2] animate-pulse" />
                  <circle cx={Number(manualX)} cy={Number(manualY)} r="5" className="fill-indigo-600" />
                </g>
              </svg>

              {/* DYNAMIC labels overlay (Fixes hardcoded Mumbai -> Pune issue!) */}
              <div className="absolute z-20 pointer-events-none" style={{ left: `${(startNode.x / 900) * 100}%`, top: `${(startNode.y / 675) * 100 - 8}%` }}>
                <span className="rounded bg-indigo-600 border border-indigo-750 px-2.5 py-1 text-[9px] font-black text-white uppercase shadow-sm whitespace-nowrap">
                  {fromLoc.split(",")[0]}
                </span>
              </div>
              
              <div className="absolute z-20 pointer-events-none" style={{ left: `${(endNode.x / 900) * 100 - 8}%`, top: `${(endNode.y / 675) * 100 - 8}%` }}>
                <span className="rounded bg-indigo-500 border border-indigo-650 px-2.5 py-1 text-[9px] font-black text-white uppercase shadow-sm whitespace-nowrap">
                  {toLoc.split(",")[0]}
                </span>
              </div>

              {/* Dynamic Weather Overlays Loop */}
              <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                
                {/* Rainy Overlay (Animated diagonal drops) */}
                {weatherCondition === "rainy" && (
                  <>
                    <svg className="w-full h-full opacity-40">
                      <defs>
                        <pattern id="rainPattern" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(75)">
                          <line x1="0" y1="0" x2="0" y2="20" stroke="#6366f1" strokeWidth="1.8" />
                          <line x1="20" y1="20" x2="20" y2="40" stroke="#818cf8" strokeWidth="1.2" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#rainPattern)" className="animate-rain" />
                    </svg>
                    <style>{`
                      @keyframes rainFlow {
                        0% { background-position: 0px 0px; }
                        100% { background-position: 400px 800px; }
                      }
                      .animate-rain {
                        animation: rainFlow 0.6s linear infinite;
                      }
                    `}</style>
                  </>
                )}

                {/* Sunny Overlay (Rotating pulsing sun core) */}
                {weatherCondition === "sunny" && (
                  <>
                    <div className="absolute top-6 right-6 z-25 flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full bg-amber-400 border border-amber-300 shadow-lg shadow-amber-300/40 animate-pulse relative">
                        <div className="absolute inset-0 border-4 border-dashed border-amber-300/65 rounded-full scale-125 animate-spin" style={{ animationDuration: '8s' }} />
                        <div className="absolute inset-0 border border-dashed border-amber-200/45 rounded-full scale-150 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
                      </div>
                      <div className="absolute h-36 w-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
                    </div>
                  </>
                )}

                {/* Cloudy Overlay (Floating drifting clouds) */}
                {weatherCondition === "cloudy" && (
                  <>
                    <div className="absolute inset-0 z-20 opacity-30 pointer-events-none overflow-hidden">
                      <div className="absolute top-12 left-0 h-10 w-24 bg-zinc-200 rounded-full blur-[1px] animate-drift pointer-events-none" style={{ animationDuration: '20s' }} />
                      <div className="absolute top-24 left-0 h-8 w-20 bg-zinc-200 rounded-full blur-[1.5px] animate-drift pointer-events-none" style={{ animationDuration: '30s', animationDelay: '5s' }} />
                      <div className="absolute top-6 left-0 h-12 w-32 bg-zinc-200 rounded-full blur-[2px] animate-drift pointer-events-none" style={{ animationDuration: '45s', animationDelay: '12s' }} />
                    </div>
                    <style>{`
                      @keyframes cloudDrift {
                        0% { transform: translateX(-150px); }
                        100% { transform: translateX(950px); }
                      }
                      .animate-drift {
                        animation: cloudDrift linear infinite;
                      }
                    `}</style>
                  </>
                )}
              </div>

              {/* HTML POI Overlays (Clickable & Popups) */}
              {pois.map((poi) => (
                <div
                  key={poi.id}
                  className="absolute z-35 transition-all hover:scale-110"
                  style={{ left: `${(poi.x / 900) * 100}%`, top: `${(poi.y / 675) * 100}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPOI(poi)}
                    className={`h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-xs shadow-md transition-transform ${
                      poi.type === "petrol" ? "bg-amber-500 text-white" :
                      poi.type === "hospital" ? "bg-red-500 text-white" :
                      poi.type === "hotel" ? "bg-indigo-600 text-white" :
                      "bg-zinc-650 text-white"
                    } ${selectedPOI?.id === poi.id ? "ring-4 ring-indigo-300 scale-110" : ""}`}
                    title={`${poi.name} (${poi.distance})`}
                  >
                    {poi.type === "petrol" ? "⛽" :
                     poi.type === "hospital" ? "🏥" :
                     poi.type === "hotel" ? "🏨" : "🚻"}
                  </button>

                  {/* Micro-label popup on hover */}
                  <div className="hidden group-hover:block absolute bottom-9 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded shadow whitespace-nowrap pointer-events-none border border-zinc-700">
                    {poi.distance}
                  </div>
                </div>
              ))}

              {/* Floating POI Detail Panel Card (Pop-up when a public place is clicked) */}
              {selectedPOI && (
                <div className="absolute top-4 right-4 z-40 w-64 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl text-left space-y-3 animate-slideUp">
                  <div className="flex justify-between items-start">
                    <span className={`rounded-xl px-2 py-0.5 text-[8px] font-black uppercase text-white ${
                      selectedPOI.type === "petrol" ? "bg-amber-500" :
                      selectedPOI.type === "hospital" ? "bg-red-500" :
                      selectedPOI.type === "hotel" ? "bg-indigo-650" : "bg-zinc-650"
                    }`}>
                      {selectedPOI.type} • {selectedPOI.distance} away
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedPOI(null)}
                      className="text-zinc-400 hover:text-zinc-800 font-bold text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-zinc-900">{selectedPOI.name}</h4>
                    <p className="text-[10px] text-indigo-600 font-bold mt-0.5 flex items-center gap-1">
                      <span>{selectedPOI.status}</span>
                      <span>•</span>
                      <span>{selectedPOI.rating}</span>
                    </p>
                  </div>
                  {selectedPOI.phone !== "N/A" && (
                    <div className="text-[9px] text-zinc-500 font-semibold">
                      Phone: <span className="text-zinc-850 font-bold">{selectedPOI.phone}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setManualX(selectedPOI.x.toString());
                      setManualY(selectedPOI.y.toString());
                      alert(`Tracking route path to ${selectedPOI.name} (${selectedPOI.distance} away). GPS coordinates set.`);
                    }}
                    className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 py-1.5 text-[9px] font-black text-white transition-colors"
                  >
                    Reroute via this Stop
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* Bottom nav for mobile */}
      <div className="md:hidden">
        <BottomNav />
      </div>

    </div>
  );
}

export default function LivingMap() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 text-zinc-500 flex flex-col items-center justify-center gap-3 text-xs font-bold">
        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span>Initializing Safe Haven Living Map...</span>
      </div>
    }>
      <LivingMapContent />
    </Suspense>
  );
}
