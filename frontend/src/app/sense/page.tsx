"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Activity, MapPin, ShieldAlert, ArrowLeft, Sun, CloudRain, Wind, 
  Map, Navigation, ShieldCheck, CheckSquare, Plus, Check, Loader, Phone
} from "lucide-react";

interface POIMarker {
  name: string;
  type: "hospital" | "food" | "hotel" | "petrol" | "restroom";
  x: number;
  y: number;
  phone: string;
}

function LivingMapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search parameters for active route
  const fromLoc = searchParams.get("from") || "Airport Terminal 1";
  const toLoc = searchParams.get("dest") || "Rio de Janeiro";
  const activeRouteType = searchParams.get("route") || "safer"; // safer, fastest, balanced
  const travelMode = searchParams.get("mode") || "Car";
  const routeScore = parseInt(searchParams.get("score") || "92");
  const routeDuration = searchParams.get("duration") || "26 mins";
  const routeDistance = searchParams.get("distance") || "8.5 km";

  // Toggle Overlays State
  const [trafficLayer, setTrafficLayer] = useState(true);
  const [weatherLayer, setWeatherLayer] = useState(true);
  const [aqiLayer, setAqiLayer] = useState(false);

  // POI Filter Toggles
  const [poiFilters, setPoiFilters] = useState({
    hospital: true,
    food: false,
    hotel: true,
    petrol: false,
    restroom: false
  });

  // Telemetry Weather matching
  const [weatherType, setWeatherType] = useState<"sunny" | "rainy" | "cloudy">("sunny");

  // Offline guardian states
  const [isOffline, setIsOffline] = useState(false);
  const [isGpsOn, setIsGpsOn] = useState(true);
  const [isRouteDrifted, setIsRouteDrifted] = useState(false);
  const [manualX, setManualX] = useState("180");
  const [manualY, setManualY] = useState("120");
  const [savingPack, setSavingPack] = useState(false);
  const [isPackSaved, setIsPackSaved] = useState(false);
  useEffect(() => {
    if (toLoc.toLowerCase() === "tokyo") {
      setWeatherType("rainy");
    } else if (toLoc.toLowerCase() === "paris") {
      setWeatherType("cloudy");
    } else {
      setWeatherType("sunny");
    }
  }, [toLoc]);

  const togglePoiFilter = (type: keyof typeof poiFilters) => {
    setPoiFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // POIs Dataset placed relative to route coordinate map space (900x450 px map box)
  const pois: POIMarker[] = [
    { name: "General Metropolitan Hospital", type: "hospital", x: 420, y: 190, phone: "+1-555-0144" },
    { name: "Red Cross Emergency Center", type: "hospital", x: 550, y: 310, phone: "+1-555-0155" },
    { name: "Safe Haven Tourist Hotel", type: "hotel", x: 280, y: 150, phone: "+1-555-0100" },
    { name: "Copacabana Palace Lodging", type: "hotel", x: 620, y: 330, phone: "+1-555-0101" },
    { name: "Petrobras Fuel Station", type: "petrol", x: 350, y: 220, phone: "+1-555-0111" },
    { name: "Ipiranga Service Hub", type: "petrol", x: 510, y: 260, phone: "+1-555-0112" },
    { name: "Subway Food Court", type: "food", x: 310, y: 110, phone: "+1-555-0122" },
    { name: "Restroom Checkpoint B", type: "restroom", x: 480, y: 240, phone: "Public Area" }
  ];

  // SVG drawing specs for the route pathways
  const startNode = { x: 180, y: 120 };
  const endNode = { x: 720, y: 320 };

  // Generate control points for curved paths
  const selectedRoutePath = `M ${startNode.x} ${startNode.y} Q 350 80, 480 200 T ${endNode.x} ${endNode.y}`;
  const alternativeRoutePath = `M ${startNode.x} ${startNode.y} Q 250 250, 450 340 T ${endNode.x} ${endNode.y}`;

  const getPoiColor = (type: string) => {
    switch (type) {
      case "hospital": return "bg-red-500 text-white";
      case "hotel": return "bg-blue-500 text-white";
      case "petrol": return "bg-amber-500 text-white";
      case "food": return "bg-emerald-500 text-white";
      default: return "bg-zinc-500 text-white";
    }
  };

  return (
    <div className="flex-grow bg-zinc-950 text-zinc-100 min-h-screen flex flex-col">
      
      {/* Sub-navbar */}
      <nav className="w-full bg-zinc-900 border-b border-zinc-800/80 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-7 text-xs font-bold text-zinc-400 tracking-wider">
          <span onClick={() => router.push("/dashboard")} className="hover:text-zinc-200 transition-colors cursor-pointer">Home</span>
          <span onClick={() => {
            if (isOffline) {
              alert("Route recalculation is disabled in offline mode. Recalculating will resume when network connectivity returns.");
            } else {
              router.push("/assess");
            }
          }} className="hover:text-zinc-200 transition-colors cursor-pointer">Plan Journey</span>
          <span onClick={() => router.push("/sense")} className="hover:text-zinc-200 transition-colors cursor-pointer">Safety</span>
          <span className="text-emerald-400 border-b-2 border-emerald-500 pb-1 cursor-pointer">Live Map</span>
          <span onClick={() => router.push("/dashboard")} className="hover:text-zinc-200 transition-colors cursor-pointer">My Trips</span>
          <span onClick={() => router.push("/guide")} className="hover:text-zinc-200 transition-colors cursor-pointer">Resources</span>
          <span className="hover:text-zinc-200 transition-colors cursor-pointer">Profile</span>
        </div>
      </nav>

      {/* 2. Offline Guardian Status Banner */}
      {isOffline && (
        <div className="bg-amber-600 text-black px-6 py-3 text-xs font-black text-center uppercase tracking-widest flex items-center justify-center gap-3 animate-fadeIn">
          <Activity className="h-4.5 w-4.5 animate-pulse" />
          <span>OFFLINE GUARDIAN ACTIVE: Running on Cached Journey Safety Pack (Calculations Frozen)</span>
        </div>
      )}

      {/* 3. Route Deviation Alert */}
      {isRouteDrifted && (
        <div className="bg-red-950/90 border-b border-red-800 text-white px-6 py-4 text-xs font-semibold text-center flex flex-col md:flex-row items-center justify-center gap-4 animate-fadeIn">
          <span className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
            ⚠️ You appear to have left your saved journey route.
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setIsRouteDrifted(false);
                setManualX("180");
                setManualY("120");
              }}
              className="rounded bg-white text-black px-3.5 py-2 font-black uppercase hover:bg-zinc-200 text-[10px]"
            >
              Follow Saved Route
            </button>
            <button
              onClick={() => {
                setIsRouteDrifted(false);
                // Snap to control point of alternative route
                setManualX("250");
                setManualY("250");
              }}
              className="rounded border border-white px-3.5 py-2 font-black uppercase hover:bg-white/10 text-[10px]"
            >
              Saved Alternative
            </button>
            <button
              onClick={() => {
                setPoiFilters({
                  hospital: true,
                  food: true,
                  hotel: true,
                  petrol: true,
                  restroom: true
                });
              }}
              className="rounded border border-white px-3.5 py-2 font-black uppercase hover:bg-white/10 text-[10px]"
            >
              Nearby Saved Services
            </button>
            <button
              onClick={() => {
                const el = document.querySelector('[className*="TRIGGER SOS"]') as HTMLButtonElement;
                if (el) el.click();
              }}
              className="rounded bg-red-600 text-white px-3.5 py-2 font-black uppercase hover:bg-red-500 text-[10px]"
            >
              Emergency Assistance
            </button>
          </div>
        </div>
      )}

      {/* 4. GPS Signal Disabled banner */}
      {!isGpsOn && (
        <div className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 px-6 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2">
          <span>🛰️ GPS Disabled: Live location assistance is unavailable. Please input your current position manually.</span>
        </div>
      )}

      {/* Grid container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-4rem)]">
        
        {/* LEFT COLUMN: CONTROL PANEL & TELEMETRY SUMMARY (4 Cols) */}
        <div className="lg:col-span-4 border-r border-zinc-900 bg-zinc-950/80 backdrop-blur-md p-6 flex flex-col justify-between overflow-y-auto">
          
          <div className="space-y-6">
            
            {/* Header / Route Stats */}
            <div className="text-left border-b border-zinc-900 pb-4">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 animate-pulse" />
                Active Living Map Telemetry
              </span>
              <h2 className="text-xl font-black text-white mt-2">Active Route: {toLoc}</h2>
              
              <div className="flex gap-4 text-xs font-bold text-zinc-400 mt-2">
                <span>{routeDuration}</span>
                <span>{routeDistance}</span>
                <span className="text-emerald-400 font-extrabold">{routeScore} Safety Rating</span>
              </div>
            </div>

            {/* 1. Context Overlays Toggles */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-left">Map Layer Toggles</h4>
              
              <div className="space-y-2">
                {/* Traffic */}
                <label className="flex items-center justify-between rounded-xl bg-zinc-900/60 p-3 border border-zinc-900 cursor-pointer">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-white">Traffic Matrix Layer</span>
                    <span className="text-[10px] text-zinc-550 mt-0.5">Show real-time street speeds congestion</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={trafficLayer}
                    onChange={() => setTrafficLayer(!trafficLayer)}
                    className="rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 h-4.5 w-4.5"
                  />
                </label>

                {/* Weather */}
                <label className="flex items-center justify-between rounded-xl bg-zinc-900/60 p-3 border border-zinc-900 cursor-pointer">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-white">Dynamic Weather Overlay</span>
                    <span className="text-[10px] text-zinc-550 mt-0.5">Animate local atmospheric conditions</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={weatherLayer}
                    onChange={() => setWeatherLayer(!weatherLayer)}
                    className="rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 h-4.5 w-4.5"
                  />
                </label>

                {/* AQI */}
                <label className="flex items-center justify-between rounded-xl bg-zinc-900/60 p-3 border border-zinc-900 cursor-pointer">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-white">Air Quality (AQI) Overlay</span>
                    <span className="text-[10px] text-zinc-550 mt-0.5">Highlight heat-zones of PM2.5 particles</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={aqiLayer}
                    onChange={() => setAqiLayer(!aqiLayer)}
                    className="rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 h-4.5 w-4.5"
                  />
                </label>
              </div>
            </div>

            {/* 2. POI Filters */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-left">POI Pins Filters</h4>
              
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "hospital", label: "🏥 Hospitals" },
                  { id: "hotel", label: "🏨 Hotels" },
                  { id: "food", label: "🍔 Restaurants" },
                  { id: "petrol", label: "⛽ Fuel Stations" },
                  { id: "restroom", label: "🚾 Restrooms" }
                ].map(poi => (
                  <button
                    key={poi.id}
                    onClick={() => togglePoiFilter(poi.id as keyof typeof poiFilters)}
                    className={`rounded-lg px-3 py-2 text-xs font-bold border transition-colors ${
                      poiFilters[poi.id as keyof typeof poiFilters]
                        ? "bg-zinc-900 text-white border-zinc-800"
                        : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {poi.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Journey Safety Pack Offline Downloader */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-left">Journey Safety Pack</h4>
              
              <button
                type="button"
                onClick={() => {
                  setSavingPack(true);
                  setTimeout(() => {
                    setSavingPack(false);
                    setIsPackSaved(true);
                    // Save mock data locally to localStorage
                    localStorage.setItem("journey_safety_pack", JSON.stringify({
                      from: fromLoc,
                      dest: toLoc,
                      route: activeRouteType,
                      mode: travelMode,
                      score: routeScore,
                      pois: pois,
                      disclaimer: "safer risk-aware offline pack"
                    }));
                  }, 1200);
                }}
                disabled={savingPack}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-4 py-3 text-xs font-bold text-zinc-200 transition-colors"
              >
                {savingPack ? (
                  <>
                    <Loader className="h-4 w-4 text-emerald-400 animate-spin" />
                    <span>Caching safety vectors...</span>
                  </>
                ) : isPackSaved ? (
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                    ✓ Cached Offline Pack (8.4MB)
                  </span>
                ) : (
                  <span>💾 Save Journey Safety Pack (Offline)</span>
                )}
              </button>
            </div>

            {/* 4. GPS Location Manual Position Control Panel */}
            {!isGpsOn && (
              <div className="rounded-2xl bg-zinc-900 border border-zinc-850 p-4 text-left space-y-3 animate-fadeIn">
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block">Manual Position Inputs</span>
                <p className="text-[10px] text-zinc-500 leading-normal font-semibold">
                  Live location services are disabled. Provide coordinates to plot tracker pin.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-zinc-400">
                  <div>
                    <label className="text-[9px] text-zinc-500 block mb-1">POS X (0-900)</label>
                    <input
                      type="number"
                      value={manualX}
                      onChange={e => setManualX(e.target.value)}
                      className="w-full rounded bg-zinc-950 border border-zinc-800 px-2 py-1 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 block mb-1">POS Y (0-450)</label>
                    <input
                      type="number"
                      value={manualY}
                      onChange={e => setManualY(e.target.value)}
                      className="w-full rounded bg-zinc-950 border border-zinc-800 px-2 py-1 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. Simulation Controllers Console */}
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4 text-left space-y-3">
              <span className="text-[9px] font-black text-zinc-650 uppercase tracking-widest block">Simulation Control Console</span>
              
              <div className="space-y-2 text-xs font-bold text-zinc-400">
                {/* Network connectivity toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Network Connectivity</span>
                  <button
                    type="button"
                    onClick={() => setIsOffline(!isOffline)}
                    className={`rounded px-2.5 py-1 text-[9px] font-black border uppercase ${
                      isOffline ? "bg-amber-600/20 text-amber-400 border-amber-500/20" : "bg-emerald-600/20 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {isOffline ? "Offline Mode" : "Online Mode"}
                  </button>
                </label>

                {/* GPS signal toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span>GPS Sensor Status</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGpsOn(!isGpsOn);
                      if (isGpsOn) {
                        // Reset to manual inputs defaults
                        setManualX("180");
                        setManualY("120");
                      }
                    }}
                    className={`rounded px-2.5 py-1 text-[9px] font-black border uppercase ${
                      isGpsOn ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-500 border-zinc-700"
                    }`}
                  >
                    {isGpsOn ? "GPS Active" : "GPS Off"}
                  </button>
                </label>

                {/* Route Deviation check-in */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Route Drift Trigger</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isRouteDrifted) {
                        setIsRouteDrifted(false);
                        setManualX("180");
                        setManualY("120");
                      } else {
                        setIsRouteDrifted(true);
                        // Position far off the route lines
                        setManualX("350");
                        setManualY("400");
                      }
                    }}
                    className={`rounded px-2.5 py-1 text-[9px] font-black border uppercase ${
                      isRouteDrifted ? "bg-red-600/20 text-red-400 border-red-500/20 animate-pulse" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                    }`}
                  >
                    {isRouteDrifted ? "Drifted" : "Within Route"}
                  </button>
                </label>
              </div>
            </div>

          </div>

          {/* Quick exit to dashboard */}
          <div className="pt-6 border-t border-zinc-900 flex gap-2">
            <button
              onClick={() => router.push("/assess")}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-850"
            >
              Re-route Journey
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-500"
            >
              Command Center
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: THE LIVING MAP DISPLAY (8 Cols) */}
        <div className="lg:col-span-8 relative h-full bg-zinc-950 overflow-hidden flex items-center justify-center p-4">
          
          {/* MAP CANVAS/SVG CONTAINER */}
          <div className="relative w-full max-w-4xl aspect-[2/1] rounded-3xl border border-zinc-900 bg-zinc-950 overflow-hidden shadow-2xl">
            
            {/* 1. MOCK CITY MAP DETAILS (Background Street Grid) */}
            <svg viewBox="0 0 900 450" className="absolute inset-0 w-full h-full opacity-10 stroke-zinc-700 stroke-[1] fill-none">
              {/* Coastline */}
              <path d="M 0 350 Q 300 320 600 370 T 900 340 L 900 450 L 0 450 Z" className="fill-blue-950/20 stroke-blue-800 stroke-[1.5]" />
              
              {/* City Grid Grid lines */}
              <line x1="100" y1="0" x2="100" y2="450" />
              <line x1="200" y1="0" x2="200" y2="450" />
              <line x1="300" y1="0" x2="300" y2="450" />
              <line x1="400" y1="0" x2="400" y2="450" />
              <line x1="500" y1="0" x2="500" y2="450" />
              <line x1="600" y1="0" x2="600" y2="450" />
              <line x1="700" y1="0" x2="700" y2="450" />
              <line x1="800" y1="0" x2="800" y2="450" />

              <line x1="0" y1="100" x2="900" y2="100" />
              <line x1="0" y1="200" x2="900" y2="200" />
              <line x1="0" y1="300" x2="900" y2="300" />
              <line x1="0" y1="400" x2="900" y2="400" />
              
              {/* Secondary Diagonal Avenues */}
              <line x1="0" y1="0" x2="900" y2="450" />
              <line x1="900" y1="0" x2="0" y2="450" />
            </svg>

            {/* 2. AIR QUALITY LAYER (Heat-Zone Overlays) */}
            {aqiLayer && (
              <div className="absolute inset-0 z-10 pointer-events-none opacity-25">
                {/* Custom heat gradients */}
                <div className="absolute top-[20%] left-[40%] h-64 w-64 rounded-full bg-red-600 blur-[80px]" />
                <div className="absolute top-[50%] left-[10%] h-48 w-48 rounded-full bg-amber-500 blur-[60px]" />
                <div className="absolute top-[10%] left-[70%] h-80 w-80 rounded-full bg-emerald-500 blur-[90px]" />
              </div>
            )}

            {/* 3. DYNAMIC WEATHER EFFECTS (Rain/Sun Overlay) */}
            {weatherLayer && (
              <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                
                {/* 3A. Sunny Effect (Golden corner pulse) */}
                {weatherType === "sunny" && (
                  <div className="absolute -top-12 -right-12 h-64 w-64 rounded-full bg-amber-500/25 blur-[60px] animate-pulse" />
                )}

                {/* 3B. Rainy Effect (Slanted falling lines loop) */}
                {weatherType === "rainy" && (
                  <div className="absolute inset-0">
                    <svg className="w-full h-full opacity-60">
                      <defs>
                        <pattern id="rain" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(75)">
                          <line x1="0" y1="0" x2="0" y2="20" stroke="#00d8ff" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#rain)" className="animate-rain" />
                    </svg>
                    {/* Add keyframes style dynamically */}
                    <style>{`
                      @keyframes rainMove {
                        0% { background-position: 0px 0px; }
                        100% { background-position: 400px 800px; }
                      }
                      .animate-rain {
                        animation: rainMove 0.8s linear infinite;
                      }
                    `}</style>
                  </div>
                )}

                {/* 3C. Cloudy Effect (Floating fog blocks) */}
                {weatherType === "cloudy" && (
                  <div className="absolute inset-0">
                    <div className="absolute top-10 left-[-20%] h-24 w-[50%] bg-zinc-800/10 blur-[30px] rounded-full animate-cloud" />
                    <div className="absolute bottom-20 left-[40%] h-20 w-[40%] bg-zinc-800/10 blur-[25px] rounded-full animate-cloud-slow" />
                    <style>{`
                      @keyframes cloudMove {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(250%); }
                      }
                      .animate-cloud {
                        animation: cloudMove 20s linear infinite;
                      }
                      .animate-cloud-slow {
                        animation: cloudMove 35s linear infinite;
                      }
                    `}</style>
                  </div>
                )}

              </div>
            )}

            {/* 4. ROUTE LINES & NODES (SVG Vector Layer) */}
            <svg viewBox="0 0 900 450" className="absolute inset-0 w-full h-full z-10 pointer-events-none">
              
              {/* ALTERNATIVE ROUTE PATH (Dotted line) */}
              <path
                d={alternativeRoutePath}
                fill="none"
                stroke="#3f3f46"
                strokeWidth="4"
                strokeDasharray="6 6"
              />

              {/* TRAFFIC MATRIX HIGHLIGHT (Active traffic layer) */}
              {trafficLayer ? (
                <>
                  {/* Part 1: Green section (Free-flowing) */}
                  <path
                    d={selectedRoutePath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="900"
                    strokeDashoffset="0"
                    style={{ strokeDasharray: "250, 900" }}
                  />
                  {/* Part 2: Red section (Heavy traffic delays) */}
                  <path
                    d={selectedRoutePath}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="900"
                    strokeDashoffset="-220"
                    style={{ strokeDasharray: "120, 900" }}
                  />
                  {/* Part 3: Yellow section (Moderate) */}
                  <path
                    d={selectedRoutePath}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="900"
                    strokeDashoffset="-340"
                    style={{ strokeDasharray: "530, 900" }}
                  />
                </>
              ) : (
                /* Standard glowing selected path */
                <path
                  d={selectedRoutePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              )}

              {/* Start Pin */}
              <circle cx={startNode.x} cy={startNode.y} r="10" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" />
              {/* End Pin */}
              <circle cx={endNode.x} cy={endNode.y} r="10" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />

              {/* Live Traveler Tracker Pin */}
              <g>
                <circle cx={Number(manualX) || startNode.x} cy={Number(manualY) || startNode.y} r="12" className="fill-blue-500/25 stroke-blue-400 stroke-[1.5] animate-pulse" />
                <circle cx={Number(manualX) || startNode.x} cy={Number(manualY) || startNode.y} r="4" className="fill-blue-400" />
              </g>
            </svg>

            {/* Labels overlay */}
            <div className="absolute z-30 pointer-events-none" style={{ left: startNode.x - 20, top: startNode.y - 30 }}>
              <span className="rounded bg-blue-600 border border-white/10 px-2 py-0.5 text-[9px] font-black text-white uppercase tracking-wider shadow">
                START: {fromLoc.substring(0, 10)}
              </span>
            </div>
            <div className="absolute z-30 pointer-events-none" style={{ left: endNode.x - 20, top: endNode.y - 30 }}>
              <span className="rounded bg-emerald-600 border border-white/10 px-2 py-0.5 text-[9px] font-black text-white uppercase tracking-wider shadow">
                END: {toLoc}
              </span>
            </div>

            {/* 5. POI PINS WITH GENTLE PULSING KEYFRAMES */}
            {pois.map((poi, idx) => {
              const isActive = poiFilters[poi.type as keyof typeof poiFilters];
              if (!isActive) return null;

              return (
                <div
                  key={idx}
                  className="absolute z-30 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  style={{ left: `${(poi.x / 900) * 100}%`, top: `${(poi.y / 450) * 100}%` }}
                >
                  {/* Outer pulsing ring */}
                  <span className="absolute inline-flex h-8 w-8 rounded-full bg-zinc-400 opacity-25 animate-ping" />
                  
                  {/* Core Icon wrapper */}
                  <div className={`relative flex h-6.5 w-6.5 items-center justify-center rounded-full border border-zinc-950 shadow-md ${getPoiColor(poi.type)} hover:scale-125 transition-transform`}>
                    <span className="text-[10px] leading-none">
                      {poi.type === "hospital" ? "🏥" :
                       poi.type === "hotel" ? "🏨" :
                       poi.type === "petrol" ? "⛽" :
                       poi.type === "food" ? "🍔" : "🚾"}
                    </span>
                  </div>

                  {/* Tooltip detail popup on hover */}
                  <div className="absolute bottom-8 scale-0 group-hover:scale-100 transition-transform origin-bottom bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 shadow-lg w-40 z-50 text-left pointer-events-none">
                    <h5 className="font-extrabold text-[10px] text-white leading-tight">{poi.name}</h5>
                    <span className="rounded bg-zinc-850 px-1 py-0.5 text-[8px] font-bold text-zinc-400 uppercase mt-1 inline-block capitalize">
                      {poi.type}
                    </span>
                    {poi.phone !== "Public Area" && (
                      <p className="text-[8px] text-zinc-500 font-bold mt-1">📞 {poi.phone}</p>
                    )}
                  </div>

                </div>
              );
            })}

          </div>

        </div>

      </div>

    </div>
  );
}

export default function LivingMap() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 text-zinc-500 flex flex-col items-center justify-center gap-3 text-xs font-bold">
        <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span>Initializing Safe Haven Living Map...</span>
      </div>
    }>
      <LivingMapContent />
    </Suspense>
  );
}
