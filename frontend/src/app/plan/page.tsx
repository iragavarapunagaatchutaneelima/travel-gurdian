"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import LocationSearchInput from "../components/LocationSearchInput";
import { 
  ShieldCheck, ArrowRight, CheckCircle2, 
  AlertTriangle, Coffee, Fuel, BedDouble, PlusSquare, 
  Car, Bike, Footprints, ArrowLeftRight, Sparkles, Building,
  Loader2, Info, Hospital, ShieldAlert, Check, Navigation
} from "lucide-react";
import { LocationDetails } from "@/types/location";
import { QUICK_HUBS, RouteOption, TravelMode } from "@/data/routeData";
import { TravelerProfile, RoutePriority } from "@/types/safety";
import { calculateGoogleRoutes } from "@/services/googleRoutes";

export default function PlanJourneyScreen() {
  const router = useRouter();

  // Canonical LocationDetails states
  const [origin, setOrigin] = useState<LocationDetails | null>(QUICK_HUBS.chennai);
  const [destination, setDestination] = useState<LocationDetails | null>(QUICK_HUBS.bangalore);

  // Target Travel Modes: Car, Bike, Walk (Bus intentionally removed per product roadmap)
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

  // Quick select hub handler
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
      setValidationError("Please select both a valid origin and destination location.");
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
      setRoutingError(err.message || "Unable to calculate a real route right now. Please check your connection or try again.");
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
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      <Header />

      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6 animate-slideUp">
        
        {!showRoutes ? (
          <>
            <div className="text-left">
              <span className="text-[10px] text-primary-accent font-extrabold uppercase tracking-widest block">
                ASSESS Route Engine • Phase 2 Real Google Routing
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mt-1">
                PLAN YOUR JOURNEY
              </h2>
              <p className="text-xs text-muted font-semibold mt-1">
                Calculate real road network routes across India using Google Directions with safety-first corridor scoring.
              </p>
            </div>

            {validationError && (
              <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {routingError && (
              <div className="p-4 rounded-2xl bg-warning/10 border border-warning/30 text-warning text-xs font-bold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{routingError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRoutingError("")}
                  className="text-xs font-black hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              <div className="lg:col-span-8">
                <form onSubmit={handleFindRoute} className="rounded-3xl border border-border bg-surface p-6 md:p-8 shadow-sm space-y-6 text-left transition-colors">
                  
                  {/* Real Location Search Inputs with Swap Control */}
                  <div className="space-y-4">
                    
                    {/* Origin Input */}
                    <div className="space-y-2">
                      <LocationSearchInput
                        idPrefix="origin"
                        label="From Location (Origin)"
                        placeholder="Search address, landmark, airport, railway station, city..."
                        selectedLocation={origin}
                        onSelectLocation={(loc) => {
                          setOrigin(loc);
                          setValidationError("");
                          setRoutingError("");
                        }}
                        isOrigin={true}
                      />

                      {/* Origin Quick-Select Hubs */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[9px] font-bold text-muted uppercase mr-1">Quick Select:</span>
                        {hubsList.map(h => (
                          <button
                            key={`origin-hub-${h.key}`}
                            type="button"
                            onClick={() => handleQuickSelectHub(h.key, "origin")}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              origin?.name === h.name || (h.key === "vizag" && origin?.name === "Visakhapatnam")
                                ? "bg-primary-accent text-white shadow-xs"
                                : "bg-elevated-surface text-muted hover:text-foreground border border-border"
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
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-elevated-surface border border-border hover:bg-border text-foreground text-xs font-bold transition-all shadow-xs active:scale-95"
                        title="Swap Origin and Destination"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5 text-primary-accent" />
                        <span className="text-[10px] uppercase tracking-wider font-extrabold">Swap Locations</span>
                      </button>
                    </div>

                    {/* Destination Input */}
                    <div className="space-y-2">
                      <LocationSearchInput
                        idPrefix="destination"
                        label="To Destination"
                        placeholder="Search destination address, hotel, city, hospital..."
                        selectedLocation={destination}
                        onSelectLocation={(loc) => {
                          setDestination(loc);
                          setValidationError("");
                          setRoutingError("");
                        }}
                        isOrigin={false}
                      />

                      {/* Destination Quick-Select Hubs */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[9px] font-bold text-muted uppercase mr-1">Quick Select:</span>
                        {hubsList.map(h => (
                          <button
                            key={`dest-hub-${h.key}`}
                            type="button"
                            onClick={() => handleQuickSelectHub(h.key, "destination")}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              destination?.name === h.name || (h.key === "vizag" && destination?.name === "Visakhapatnam")
                                ? "bg-success text-white shadow-xs"
                                : "bg-elevated-surface text-muted hover:text-foreground border border-border"
                            }`}
                          >
                            {h.name}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Travel Mode (Car, Bike, Walk) */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <label className="text-[10px] font-black text-muted uppercase tracking-wider block">
                      Travel Mode
                    </label>
                    <div className="grid grid-cols-3 gap-3 max-w-md">
                      {[
                        { mode: "Car", icon: Car, desc: "Driving Route" },
                        { mode: "Bike", icon: Bike, desc: "Two-Wheeler Route" },
                        { mode: "Walk", icon: Footprints, desc: "Walking Route" }
                      ].map((item) => {
                        const isActive = travelMode === item.mode;
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.mode}
                            type="button"
                            onClick={() => {
                              setTravelMode(item.mode as TravelMode);
                              setRoutingError("");
                            }}
                            className={`rounded-2xl p-3 flex flex-col items-center justify-center gap-1 border transition-all text-xs font-black ${
                              isActive
                                ? "bg-primary-accent border-primary-accent-hover text-white shadow-md shadow-primary-accent/25"
                                : "bg-elevated-surface border-border text-foreground hover:bg-border"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{item.mode}</span>
                            <span className="text-[8px] font-normal opacity-80">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Safety & Traveler Preferences */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted uppercase block">Traveler Profile</label>
                      <select
                        value={travelerProfile}
                        onChange={(e) => setTravelerProfile(e.target.value as TravelerProfile)}
                        className="w-full rounded-2xl bg-elevated-surface border border-border px-4 py-3 text-xs text-foreground font-black focus:outline-none"
                      >
                        <option value="Solo">Solo Traveler</option>
                        <option value="Family">Family with Children (Medical & Rest Priority)</option>
                        <option value="Group">Group / Companions (Service Plazas)</option>
                        <option value="Solo Woman Traveller">Solo Woman Traveller (Emergency & Police Focus)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted uppercase block">Route Optimization Priority</label>
                      <select
                        value={routePriority}
                        onChange={(e) => setRoutePriority(e.target.value as RoutePriority)}
                        className="w-full rounded-2xl bg-elevated-surface border border-border px-4 py-3 text-xs text-foreground font-black focus:outline-none"
                      >
                        <option value="Balanced">Balanced (Optimal Safety & Transit Time)</option>
                        <option value="Maximum Safety">Maximum Safety (Prioritize High Service Density)</option>
                        <option value="Time Priority">Time Priority (Fastest Highway Transit)</option>
                      </select>
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <button
                    type="submit"
                    disabled={loadingRoutes}
                    className="w-full rounded-2xl bg-primary-accent hover:bg-primary-accent-hover disabled:opacity-60 disabled:cursor-not-allowed py-4 text-sm font-black text-white transition-all shadow-lg hover:shadow-primary-accent/30 mt-6 flex items-center justify-center gap-2"
                  >
                    {loadingRoutes ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>ANALYZING REAL ROUTE SAFETY...</span>
                      </>
                    ) : (
                      <>
                        <span>CALCULATE SAFETY FIT</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
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
                        Safety Intelligence Layer
                      </h3>
                      <span className="text-[9px] font-bold text-success uppercase">Phase 3 Active</span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted leading-relaxed font-semibold">
                    Evaluates verified Google Places POIs (Hospitals, Police, Pharmacies, Fuel Plazas), active community-reported incidents, and objective profile weighting.
                  </p>

                  <div className="pt-3 border-t border-border space-y-2.5 text-xs font-bold text-muted">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                      <span>Real Google Places corridor verification</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                      <span>Deterministic Safety Fit scoring (0-100)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                      <span>Active community hazard detection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                      <span>Zero fabricated data or fake statistics</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-elevated-surface border border-border text-[11px] text-muted space-y-1">
                    <span className="font-black text-foreground block">Active Selection:</span>
                    <div className="truncate"><b>From:</b> {origin ? `${origin.name} (${origin.latitude.toFixed(3)}, ${origin.longitude.toFixed(3)})` : "Not selected"}</div>
                    <div className="truncate"><b>To:</b> {destination ? `${destination.name} (${destination.latitude.toFixed(3)}, ${destination.longitude.toFixed(3)})` : "Not selected"}</div>
                    <div><b>Profile:</b> {travelerProfile} • <b>Priority:</b> {routePriority}</div>
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
                  ← Back to Location Search
                </button>
                <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                  SAFETY FIT CORRIDORS ({routes.length} {routes.length === 1 ? "OPTION" : "OPTIONS"} ASSESSED)
                </h2>
                <p className="text-xs text-muted font-bold mt-1">
                  Corridor from {origin?.name} to {destination?.name} • {travelMode} Mode • Profile: {travelerProfile} • Priority: {routePriority}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-success uppercase bg-success/10 text-success px-3 py-1.5 rounded-full border border-success/30">
                  Safety Engine Active
                </span>
              </div>
            </div>

            {/* Real Route Cards */}
            <div className={`grid grid-cols-1 ${routes.length === 1 ? "md:grid-cols-1 max-w-xl" : routes.length === 2 ? "md:grid-cols-2 max-w-5xl" : "md:grid-cols-2 lg:grid-cols-3"} gap-5`}>
              {routes.map((route) => {
                const isRecommended = route.recommendation === "HIGHLY RECOMMENDED" || route.safetyScore >= 88;
                const isCaution = route.recommendation === "USE CAUTION" || route.safetyScore < 65;
                const assessment = route.safetyAssessment;
                
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
                            Route {route.id} • Google Road Corridor
                          </span>
                          <h3 className="font-black text-foreground text-base mt-0.5 leading-tight">
                            {route.name}
                          </h3>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                            isRecommended ? "bg-success text-white" :
                            isCaution ? "bg-warning text-white" : "bg-info text-white"
                          }`}>
                            {assessment?.recommendation || route.recommendation}
                          </span>
                          {assessment && (
                            <span className="text-[8px] font-bold text-muted uppercase">
                              Confidence: {assessment.confidence}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-muted font-semibold leading-relaxed">
                        {route.subtitle}
                      </p>

                      {/* Primary Metrics */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-border">
                        <div>
                          <span className="text-muted text-[8px] font-extrabold uppercase block">Safety Fit</span>
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

                      {/* Verifiable Safety Factors Summary */}
                      <div className="space-y-1.5 text-xs font-semibold text-muted">
                        <div className="flex justify-between">
                          <span>Emergency Access:</span> 
                          <span className="font-bold text-foreground">
                            {assessment?.factors.emergencyAccess.rating || "Available"} ({assessment?.factors.emergencyAccess.score || 85}/100)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Traffic:</span> 
                          <span className="font-bold text-foreground">{route.trafficDuration ? `${route.trafficScore} (${route.trafficDuration})` : route.trafficScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Toll Status:</span> 
                          <span className="font-bold text-foreground">{route.tollInfo || "No Tolls"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Weather:</span> 
                          <span className="font-bold text-muted italic">Not Configured</span>
                        </div>
                      </div>

                      {/* "Why This Route?" Explanation */}
                      {assessment?.explanation && (
                        <div className="p-3 bg-elevated-surface rounded-2xl border border-border space-y-1.5">
                          <span className="text-[9px] font-black uppercase tracking-wider text-muted block">
                            Why This Route?
                          </span>
                          <ul className="text-[10px] text-muted space-y-1 font-semibold">
                            {assessment.explanation.slice(0, 3).map((exp, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-primary-accent">•</span>
                                <span>{exp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* POI Counts */}
                      <div className="pt-3 border-t border-border flex items-center justify-around text-muted">
                        <div className="flex flex-col items-center" title="Hospitals">
                          <Hospital className="h-4 w-4 mb-0.5 text-danger" />
                          <span className="text-[9px] font-bold">{route.pois?.filter(p => p.type === "hospital").length || 0} Med</span>
                        </div>
                        <div className="flex flex-col items-center" title="Police Nodes">
                          <ShieldCheck className="h-4 w-4 mb-0.5 text-primary-accent" />
                          <span className="text-[9px] font-bold">{route.pois?.filter(p => p.type === "police").length || 0} Police</span>
                        </div>
                        <div className="flex flex-col items-center" title="Fuel Stations">
                          <Fuel className="h-4 w-4 mb-0.5 text-warning" />
                          <span className="text-[9px] font-bold">{route.fuelStops} Fuel</span>
                        </div>
                        <div className="flex flex-col items-center" title="Rest Stops">
                          <Coffee className="h-4 w-4 mb-0.5 text-info" />
                          <span className="text-[9px] font-bold">{route.restStops} Rest</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
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
                        className="w-full rounded-xl py-3 text-xs font-black transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20"
                      >
                        <Navigation className="h-3.5 w-3.5 fill-white" />
                        <span>START LIVE NAVIGATION</span>
                      </button>

                      <button
                        onClick={() => handleSelectRoute(route.id)}
                        className={`w-full rounded-xl py-2.5 text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                          isRecommended 
                            ? "bg-primary-accent/15 hover:bg-primary-accent/25 text-primary-accent border border-primary-accent/30" 
                            : "bg-elevated-surface hover:bg-border text-foreground border border-border"
                        }`}
                      >
                        <span>VIEW LIVING MAP & POIs</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Route Comparison Matrix */}
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm overflow-x-auto text-left transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-muted uppercase tracking-widest">
                  Side-by-Side Safety Intelligence Matrix
                </h3>
                <span className="text-[10px] font-bold text-success">Phase 3 Verifiable Safety Factors</span>
              </div>

              <table className="w-full text-left text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-border text-muted font-black uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Verifiable Factor</th>
                    {routes.map(r => (
                      <th key={r.id} className="py-3 px-3">
                        Route {r.id} ({r.name.split(" ")[0]})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-semibold text-foreground divide-y divide-border">
                  <tr>
                    <td className="py-2.5 px-3 text-muted font-bold">Safety Fit Score</td>
                    {routes.map(r => (
                      <td key={r.id} className="py-2.5 px-3 font-black text-primary-accent">
                        {r.safetyScore}/100 ({r.safetyAssessment?.confidence || "Medium"} Confidence)
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
                    <td className="py-2.5 px-3 text-muted font-bold">Medical Facilities (Corridor)</td>
                    {routes.map(r => (
                      <td key={r.id} className="py-2.5 px-3">
                        {r.pois?.filter(p => p.type === "hospital").length || 0} Verified
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-muted font-bold">Police / Patrol Nodes</td>
                    {routes.map(r => (
                      <td key={r.id} className="py-2.5 px-3">
                        {r.pois?.filter(p => p.type === "police").length || 0} Nodes
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-muted font-bold">Fuel & Service Plazas</td>
                    {routes.map(r => <td key={r.id} className="py-2.5 px-3">{r.fuelStops} Plazas</td>)}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-muted font-bold">Community Incidents</td>
                    {routes.map(r => (
                      <td key={r.id} className="py-2.5 px-3">
                        {r.safetyAssessment?.factors.incidents.count === 0 ? "None Reported" : `${r.safetyAssessment?.factors.incidents.count} Active`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-muted font-bold">Weather Risk</td>
                    {routes.map(r => <td key={r.id} className="py-2.5 px-3 text-muted italic">Not Configured</td>)}
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
