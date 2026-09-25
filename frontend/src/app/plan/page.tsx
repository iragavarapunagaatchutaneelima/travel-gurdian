"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import LocationSearchInput from "../components/LocationSearchInput";
import { 
  ShieldCheck, ArrowRight, CheckCircle2, 
  AlertTriangle, Coffee, Fuel, 
  Car, Bike, Footprints, ArrowLeftRight, 
  Loader2, Hospital, Navigation, Compass,
  ShieldAlert, Sparkles, MapPin, Download
} from "lucide-react";
import { LocationDetails } from "@/types/location";
import { QUICK_HUBS, RouteOption, TravelMode } from "@/data/routeData";
import { TravelerProfile, RoutePriority } from "@/types/safety";
import { calculateGoogleRoutes } from "@/services/googleRoutes";
import { formatMapErrorMessage } from "@/services/googlePlaces";

export default function PlanJourneyScreen() {
  const router = useRouter();

  // Canonical LocationDetails states: Default is null (NO PRESETS, Section 5)
  const [origin, setOrigin] = useState<LocationDetails | null>(null);
  const [destination, setDestination] = useState<LocationDetails | null>(null);

  // Target Travel Modes: Car, Bike, Walk
  const [travelMode, setTravelMode] = useState<TravelMode>("Car"); 
  const [travelerProfile, setTravelerProfile] = useState<TravelerProfile>("Solo");
  const [routePriority, setRoutePriority] = useState<RoutePriority>("Balanced");

  // View state
  const [showRoutes, setShowRoutes] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [routingError, setRoutingError] = useState("");

  // Swap origin and destination objects
  const handleSwapLocations = () => {
    const prevOrigin = origin;
    const prevDest = destination;
    setOrigin(prevDest);
    setDestination(prevOrigin);
    setValidationError("");
    setRoutingError("");
  };

  // Quick select hub handler (optional assistance, not preset)
  const handleQuickSelectHub = (hubKey: string, target: "origin" | "destination") => {
    const hub = QUICK_HUBS[hubKey];
    if (!hub) return;
    if (target === "origin") {
      setOrigin(hub);
    } else {
      setDestination(hub);
    }
    setValidationError("");
    setRoutingError("");
  };

  // Real Google Route Calculation with Safety Engine Assessment
  const handleFindRoute = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loadingRoutes) return;

    if (!origin || !destination) {
      setValidationError("Please select both an origin and destination location.");
      return;
    }

    // Validation: Origin == Destination
    const isSamePlaceId = origin.placeId && destination.placeId && origin.placeId === destination.placeId;
    const isSameCoords = Math.abs(origin.latitude - destination.latitude) < 0.0001 && Math.abs(origin.longitude - destination.longitude) < 0.0001;
    const isSameName = origin.name.trim().toLowerCase() === destination.name.trim().toLowerCase();

    if (isSamePlaceId || isSameCoords || isSameName) {
      setValidationError("Origin and Destination cannot be the same place. Please choose two distinct locations.");
      return;
    }

    setValidationError("");
    setRoutingError("");
    setLoadingRoutes(true);

    try {
      const realRoutes = await calculateGoogleRoutes(
        origin, 
        destination, 
        travelMode,
        travelerProfile,
        routePriority
      );
      setRoutes(realRoutes);
      setShowRoutes(true);
    } catch (err: any) {
      console.error("Route calculation error:", err);
      setRoutingError(formatMapErrorMessage(err));
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handleSelectRoute = (routeId: string) => {
    if (!origin || !destination) return;

    const query = new URLSearchParams({
      from: origin.placeId ? origin.placeId : origin.name.toLowerCase().replace(/\s+/g, "-"),
      dest: destination.placeId ? destination.placeId : destination.name.toLowerCase().replace(/\s+/g, "-"),
      fromName: origin.name,
      destName: destination.name,
      fromAddress: origin.formattedAddress,
      destAddress: destination.formattedAddress,
      fromLat: origin.latitude.toString(),
      fromLng: origin.longitude.toString(),
      destLat: destination.latitude.toString(),
      destLng: destination.longitude.toString(),
      fromPlaceId: origin.placeId,
      destPlaceId: destination.placeId,
      mode: travelMode,
      profile: travelerProfile,
      priority: routePriority,
      routeId: routeId
    });
    router.push(`/map?${query.toString()}`);
  };

  const hubsList = [
    { key: "chennai", name: "Chennai", state: "TN" },
    { key: "mumbai", name: "Mumbai", state: "MH" },
    { key: "delhi", name: "Delhi", state: "NCR" },
    { key: "hyderabad", name: "Hyderabad", state: "TS" },
    { key: "bangalore", name: "Bangalore", state: "KA" },
    { key: "vizag", name: "Vizag", state: "AP" }
  ];

  return (
    <div 
      className="min-h-screen pb-20 md:pb-8 bg-background text-foreground"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <Header />

      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 animate-slideUp">

        {!showRoutes ? (
          <>
            <div className="text-left space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--primary)/10 text-(--primary) text-xs font-bold tracking-wider uppercase">
                <Compass className="h-3.5 w-3.5" />
                <span>Real-Time Route Intelligence</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                Plan Your Journey
              </h1>
              <p className="text-xs md:text-sm text-(--muted-foreground) max-w-2xl leading-relaxed">
                Calculate real road corridors across India using Google Directions with deterministic safety scoring and emergency haven verification.
              </p>
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="p-4 rounded-2xl flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold animate-slideDown">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
                <button onClick={() => setValidationError("")} className="font-bold text-xs hover:underline">Dismiss</button>
              </div>
            )}

            {/* Routing Error Banner */}
            {routingError && (
              <div className="p-4 rounded-2xl flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold animate-slideDown">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{routingError}</span>
                </div>
                <button onClick={() => setRoutingError("")} className="font-bold text-xs hover:underline">Dismiss</button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* Main Planning Form (High Contrast & Clear Hierarchy) */}
              <div className="lg:col-span-8">
                <form
                  onSubmit={handleFindRoute}
                  className="rounded-3xl p-6 md:p-8 space-y-6 text-left bg-surface border border-border shadow-xl"
                >
                  
                  {/* Location Search Inputs with Swap Control */}
                  <div className="space-y-4">
                    
                    {/* Origin Input (Section 5: Clear Placeholder "Select location") */}
                    <div className="space-y-2">
                      <LocationSearchInput
                        idPrefix="origin"
                        label="From Location"
                        placeholder="Select location (city, landmark, station, or current GPS)..."
                        selectedLocation={origin}
                        onSelectLocation={(loc) => {
                          setOrigin(loc);
                          setValidationError("");
                          setRoutingError("");
                        }}
                        isOrigin={true}
                      />

                      {/* Optional Hub suggestions */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-(--muted-foreground) uppercase mr-1">Quick Select:</span>
                        {hubsList.map(h => (
                          <button
                            key={`origin-hub-${h.key}`}
                            type="button"
                            onClick={() => handleQuickSelectHub(h.key, "origin")}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              origin?.name === h.name || (h.key === "vizag" && origin?.name === "Visakhapatnam")
                                ? "bg-(--primary) text-white shadow-sm"
                                : "bg-elevated-surface text-(--muted-foreground) hover:text-foreground border border-border"
                            }`}
                          >
                            {h.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Swap Control */}
                    <div className="flex items-center justify-center py-1">
                      <button
                        type="button"
                        onClick={handleSwapLocations}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-elevated-surface border border-border hover:bg-surface text-(--primary) text-xs font-bold shadow-sm transition-all active:scale-95"
                        title="Swap Origin and Destination"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        <span className="uppercase tracking-wider">Swap Locations</span>
                      </button>
                    </div>

                    {/* Destination Input (Section 5: Clear Placeholder "Select location") */}
                    <div className="space-y-2">
                      <LocationSearchInput
                        idPrefix="destination"
                        label="To Destination"
                        placeholder="Select destination (city, hotel, address, corridor)..."
                        selectedLocation={destination}
                        onSelectLocation={(loc) => {
                          setDestination(loc);
                          setValidationError("");
                          setRoutingError("");
                        }}
                        isOrigin={false}
                      />

                      {/* Optional Hub suggestions */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-(--muted-foreground) uppercase mr-1">Quick Select:</span>
                        {hubsList.map(h => (
                          <button
                            key={`dest-hub-${h.key}`}
                            type="button"
                            onClick={() => handleQuickSelectHub(h.key, "destination")}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              destination?.name === h.name || (h.key === "vizag" && destination?.name === "Visakhapatnam")
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-elevated-surface text-(--muted-foreground) hover:text-foreground border border-border"
                            }`}
                          >
                            {h.name}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Travel Mode (Car, Bike, Walk) - Strong High-Contrast Buttons */}
                  <div className="space-y-2 pt-3 border-t border-border">
                    <label className="text-[11px] font-bold text-(--muted-foreground) uppercase tracking-wider block">
                      Travel Mode
                    </label>
                    <div className="grid grid-cols-3 gap-3 max-w-md">
                      {[
                        { mode: "Car", icon: Car, desc: "Highway Drive" },
                        { mode: "Bike", icon: Bike, desc: "Two-Wheeler" },
                        { mode: "Walk", icon: Footprints, desc: "Pedestrian" }
                      ].map((item) => {
                        const isActive = travelMode === item.mode;
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.mode}
                            type="button"
                            onClick={() => { setTravelMode(item.mode as TravelMode); setRoutingError(""); }}
                            className={`rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                              isActive 
                                ? "bg-(--primary) text-white shadow-lg shadow-blue-500/25 border-2 border-blue-400" 
                                : "bg-elevated-surface text-foreground border border-border hover:bg-surface"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{item.mode}</span>
                            <span className={`text-[10px] font-medium ${isActive ? "text-blue-100" : "text-(--muted-foreground)"}`}>
                              {item.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Safety & Traveler Preferences */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-(--muted-foreground) uppercase tracking-wider block">
                        Traveler Profile
                      </label>
                      <select
                        value={travelerProfile}
                        onChange={(e) => setTravelerProfile(e.target.value as TravelerProfile)}
                        className="w-full rounded-2xl bg-elevated-surface border border-border p-3 text-xs font-semibold text-foreground outline-none"
                      >
                        <option value="Solo">Solo Traveler</option>
                        <option value="Family">Family with Children (Medical &amp; Rest Priority)</option>
                        <option value="Group">Group / Companions (Service Plazas)</option>
                        <option value="Solo Woman Traveller">Solo Woman Traveller (Emergency &amp; Police Focus)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-(--muted-foreground) uppercase tracking-wider block">
                        Route Priority
                      </label>
                      <select
                        value={routePriority}
                        onChange={(e) => setRoutePriority(e.target.value as RoutePriority)}
                        className="w-full rounded-2xl bg-elevated-surface border border-border p-3 text-xs font-semibold text-foreground outline-none"
                      >
                        <option value="Balanced">Balanced (Optimal Safety &amp; Transit Time)</option>
                        <option value="Maximum Safety">Maximum Safety (Prioritize High Service Density)</option>
                        <option value="Time Priority">Time Priority (Fastest Highway Transit)</option>
                      </select>
                    </div>
                  </div>

                  {/* Primary Calculate Button (Section 3: High Contrast, Strong Background, clearly looks clickable) */}
                  <button
                    type="submit"
                    disabled={loadingRoutes}
                    className="w-full rounded-2xl py-4 text-sm font-extrabold text-white transition-all mt-4 flex items-center justify-center gap-2 bg-linear-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 shadow-xl shadow-blue-600/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-blue-500/30"
                  >
                    {loadingRoutes ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>CALCULATING SAFEST ROUTE...</span>
                      </>
                    ) : (
                      <>
                        <span>CALCULATE SAFEST ROUTE</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Right Panel: Intelligence Info */}
              <div className="lg:col-span-4 space-y-5">
                <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm text-left space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-(--primary)/10 text-(--primary)">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                        Safety Intelligence
                      </h3>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        Deterministic Safety Engine
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-(--muted-foreground) leading-relaxed font-medium">
                    Evaluates verified Google Places POIs (Hospitals, Police, Pharmacies, Fuel Plazas), active community-reported hazards, and objective traveler profile weighting.
                  </p>

                  <div className="pt-3 border-t border-border space-y-2 text-xs font-semibold text-(--muted-foreground)">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Real Google Places corridor verification</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Deterministic Safety Score (0-100)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Active community hazard detection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Zero fabricated data or fake statistics</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-elevated-surface border border-border text-[11px] text-(--muted-foreground) space-y-1">
                    <span className="font-extrabold text-foreground block">Active Status:</span>
                    <div className="truncate"><b>From:</b> {origin ? origin.name : "Select location"}</div>
                    <div className="truncate"><b>To:</b> {destination ? destination.name : "Select location"}</div>
                    <div><b>Profile:</b> {travelerProfile} • <b>Priority:</b> {routePriority}</div>
                  </div>
                </div>
              </div>

            </div>
          </>
        ) : (
          /* ============================================================
             ROUTE RESULT PRESENTATION (Section 7: Clear Visual Hierarchy)
             ============================================================ */
          <div className="space-y-6 animate-slideUp text-left">
            
            {/* Results Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <button 
                  onClick={() => setShowRoutes(false)} 
                  className="text-xs font-bold text-(--primary) hover:underline uppercase tracking-wider flex items-center gap-1 mb-1 transition-colors"
                >
                  ← Edit Locations
                </button>
                <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                  Calculated Safe Corridors ({routes.length} Available)
                </h2>
                <p className="text-xs text-(--muted-foreground) font-semibold mt-1">
                  From {origin?.name} to {destination?.name} • Mode: {travelMode} • Profile: {travelerProfile}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Google Directions &amp; Safety Active
                </span>
              </div>
            </div>

            {/* Route Cards Grid (Section 7: Clear Hierarchy & Integrated Safety Score) */}
            <div className={`grid grid-cols-1 ${routes.length === 1 ? "md:grid-cols-1 max-w-2xl" : routes.length === 2 ? "md:grid-cols-2 max-w-5xl" : "md:grid-cols-2 lg:grid-cols-3"} gap-5`}>
              {routes.map((route, idx) => {
                const isSafest = idx === 0 || route.safetyScore >= 88;
                const assessment = route.safetyAssessment;
                
                return (
                  <div 
                    key={route.id} 
                    className={`rounded-3xl border p-6 flex flex-col justify-between shadow-md transition-all hover:-translate-y-1 hover:shadow-xl ${
                      isSafest 
                        ? "bg-linear-to-b from-blue-500/10 via-surface to-surface border-(--primary) ring-2 ring-(--primary)/20" 
                        : "bg-surface border-border"
                    }`}
                  >
                    <div className="space-y-4">
                      
                      {/* Top Header & Safest Route Indicator */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-(--muted-foreground)">
                              Route {route.id}
                            </span>
                            {isSafest && (
                              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-sm">
                                ★ SAFEST ROUTE
                              </span>
                            )}
                          </div>
                          <h3 className="font-extrabold text-base md:text-lg text-foreground mt-1">
                            {route.name}
                          </h3>
                        </div>

                        {/* Prominently Presented Safety Score (Section 7: e.g. 94 clearly presented) */}
                        <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-elevated-surface border border-border shrink-0 min-w-17.5">
                          <span className="text-[9px] font-black uppercase text-(--muted-foreground)">Safety</span>
                          <span className={`text-xl font-black ${
                            route.safetyScore >= 85 ? "text-emerald-600 dark:text-emerald-400" :
                            route.safetyScore >= 70 ? "text-(--primary)" : "text-amber-500"
                          }`}>
                            {route.safetyScore}
                          </span>
                          <span className="text-[8px] font-bold text-(--muted-foreground)">/ 100</span>
                        </div>
                      </div>

                      <p className="text-xs text-(--muted-foreground) font-medium leading-relaxed">
                        {route.subtitle}
                      </p>

                      {/* Primary Metrics: Distance & Duration */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-border text-center">
                        <div className="p-2 rounded-xl bg-elevated-surface">
                          <span className="text-[9px] font-extrabold uppercase text-(--muted-foreground) block">Duration</span>
                          <span className="text-xs font-black text-foreground mt-0.5 block">{route.time}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-elevated-surface">
                          <span className="text-[9px] font-extrabold uppercase text-(--muted-foreground) block">Distance</span>
                          <span className="text-xs font-black text-foreground mt-0.5 block">{route.distance}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-elevated-surface">
                          <span className="text-[9px] font-extrabold uppercase text-(--muted-foreground) block">Traffic</span>
                          <span className="text-xs font-black text-foreground mt-0.5 block">{route.trafficScore}</span>
                        </div>
                      </div>

                      {/* Verified Factors */}
                      <div className="space-y-1.5 text-xs text-(--muted-foreground) font-semibold">
                        <div className="flex justify-between">
                          <span>Emergency Access:</span> 
                          <span className="font-bold text-foreground">
                            {assessment?.factors.emergencyAccess.rating || "Available"} ({route.emergencyAccessScore}/100)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Toll Status:</span> 
                          <span className="font-bold text-foreground">{route.tollInfo || "Standard Highway"}</span>
                        </div>
                      </div>

                      {/* POI Highlights */}
                      <div className="pt-2 border-t border-border flex items-center justify-around text-(--muted-foreground) text-center">
                        <div title="Hospitals">
                          <Hospital className="h-4 w-4 mx-auto mb-0.5 text-rose-500" />
                          <span className="text-[10px] font-bold">{route.pois?.filter(p => p.type === "hospital").length || 0} Med</span>
                        </div>
                        <div title="Police">
                          <ShieldAlert className="h-4 w-4 mx-auto mb-0.5 text-blue-500" />
                          <span className="text-[10px] font-bold">{route.pois?.filter(p => p.type === "police").length || 0} Police</span>
                        </div>
                        <div title="Fuel">
                          <Fuel className="h-4 w-4 mx-auto mb-0.5 text-amber-500" />
                          <span className="text-[10px] font-bold">{route.fuelStops} Fuel</span>
                        </div>
                        <div title="Food & Rest">
                          <Coffee className="h-4 w-4 mx-auto mb-0.5 text-emerald-500" />
                          <span className="text-[10px] font-bold">{route.restStops} Rest</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons (Section 7 & 3: High Contrast, Clear Hierarchy) */}
                    <div className="pt-5 space-y-2">
                      <button
                        onClick={() => {
                          const params = new URLSearchParams({
                            from: origin?.name.toLowerCase() || "chennai",
                            dest: destination?.name.toLowerCase() || "bangalore",
                            mode: travelMode,
                            profile: travelerProfile,
                            priority: routePriority,
                            routeId: route.id,
                            startNav: "true"
                          });
                          if (origin) {
                            params.set("fromPlaceId", origin.placeId);
                            params.set("fromLat", origin.latitude.toString());
                            params.set("fromLng", origin.longitude.toString());
                            params.set("fromName", origin.name);
                            params.set("fromAddress", origin.formattedAddress);
                          }
                          if (destination) {
                            params.set("destPlaceId", destination.placeId);
                            params.set("destLat", destination.latitude.toString());
                            params.set("destLng", destination.longitude.toString());
                            params.set("destName", destination.name);
                            params.set("destAddress", destination.formattedAddress);
                          }
                          router.push(`/map?${params.toString()}`);
                        }}
                        className="w-full rounded-2xl py-3 text-xs font-extrabold transition-all flex items-center justify-center gap-2 bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:opacity-95 text-white shadow-lg shadow-emerald-600/25 active:scale-95"
                      >
                        <Navigation className="h-4 w-4 fill-white" />
                        <span>START LIVE NAVIGATION</span>
                      </button>

                      <button
                        onClick={() => handleSelectRoute(route.id)}
                        className="w-full rounded-2xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-(--primary) text-white hover:opacity-90 shadow-md shadow-blue-500/20 active:scale-95"
                      >
                        <span>VIEW ON LIVING MAP</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          const params = new URLSearchParams({
                            from: origin?.name.toLowerCase() || "chennai",
                            dest: destination?.name.toLowerCase() || "bangalore",
                            mode: travelMode,
                          });
                          if (origin) {
                            params.set("fromLat", origin.latitude.toString());
                            params.set("fromLng", origin.longitude.toString());
                            params.set("fromName", origin.name);
                          }
                          if (destination) {
                            params.set("destLat", destination.latitude.toString());
                            params.set("destLng", destination.longitude.toString());
                            params.set("destName", destination.name);
                          }
                          router.push(`/offline?${params.toString()}`);
                        }}
                        className="w-full rounded-2xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-elevated-surface text-foreground border border-border hover:bg-surface active:scale-95"
                      >
                        <Download className="h-3.5 w-3.5 text-(--primary)" />
                        <span>DOWNLOAD OFFLINE PACK</span>
                      </button>
                    </div>
                  </div>
                );
              })}
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
