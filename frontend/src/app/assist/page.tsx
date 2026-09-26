"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import TravelAssistant from "../components/TravelAssistant";
import GuardianMapSync, { PinnedPlace } from "../components/GuardianMapSync";
import SafetyCheckInWidget from "../components/SafetyCheckInWidget";
import { useSafetyCheckIn } from "../../hooks/useSafetyCheckIn";
import { useSharedLocation } from "../../hooks/useSharedLocation";
import { getTrustedContacts } from "../../services/trustedContactService";
import { searchNearbyPlaces } from "../../services/googlePlaces";
import { TrustedContact } from "../../types/safetyCheckIn";
import { LiveTravelContext } from "../../types/gemini";
import { 
  Bot, 
  ShieldCheck, 
  MapPin, 
  Users, 
  LifeBuoy, 
  MessageSquare,
  Compass,
  Layers,
  Sparkles,
  Info
} from "lucide-react";
import Link from "next/link";

export default function AssistHub() {
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
  const [pinnedPlaces, setPinnedPlaces] = useState<PinnedPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"chat" | "map" | "safety">("chat");

  // Shared Location Hook
  const { latitude, longitude, accuracy, timestamp, address, locate, hasLocation, permissionStatus } = useSharedLocation();

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
    destinationName: "Regional Destination Corridor"
  });

  useEffect(() => {
    setTrustedContacts(getTrustedContacts());
  }, []);

  // When GPS location is available and no places pinned yet, discover initial safe havens
  useEffect(() => {
    if (latitude && longitude && pinnedPlaces.length === 0) {
      searchNearbyPlaces({ lat: latitude, lng: longitude }, "all", 6000)
        .then(places => {
          if (places && places.length > 0) {
            setPinnedPlaces(places.map(p => ({
              id: p.id,
              name: p.name,
              type: p.type,
              category: p.category,
              distance: p.distanceFormatted,
              distanceKm: p.distanceMeters / 1000,
              latitude: p.latitude,
              longitude: p.longitude,
              address: p.address,
              phone: p.phone
            })));
          }
        })
        .catch(err => console.warn("Failed to load initial nearby safe havens:", err));
    }
  }, [latitude, longitude]);

  // Aggregated live context for Gemini Tool Router
  const liveContext: LiveTravelContext = useMemo(() => ({
    navStatus: "READY",
    safetyScore: 89,
    currentPosition: latitude && longitude ? {
      latitude,
      longitude,
      accuracy: accuracy || 15,
      altitude: null,
      heading: null,
      speed: null,
      timestamp: timestamp || 0
    } : null,
    locationSnapshot: latitude && longitude ? {
      latitude,
      longitude,
      accuracy: accuracy || 15,
      timestamp: timestamp || 0,
      isStale: false,
      formattedText: address
    } : null,
    checkInStatus,
    activeCheckInCycle: checkInCycle,
    checkInSecondsRemaining,
    trustedContactsCount: trustedContacts.filter(c => c.enabled).length,
    destinationName: "Destination Corridor",
    travelMode: "Car"
  }), [
    latitude,
    longitude,
    accuracy,
    timestamp,
    address,
    checkInStatus,
    checkInCycle,
    checkInSecondsRemaining,
    trustedContacts
  ]);

  const handleApplyInterval = (minutes: number) => {
    startCheckIn({ intervalMinutes: minutes });
  };

  const handleTriggerAlert = () => {
    requestHelp("User requested assistance via Travel Assistant.");
  };

  // Callback when AI discovers places from tool results
  const handlePlacesDiscovered = useCallback((places: any[]) => {
    if (!places || places.length === 0) return;
    const mapped: PinnedPlace[] = places.map((p, idx) => ({
      id: p.id || `ai_place_${idx}`,
      name: p.name,
      type: p.type || "Safe Haven",
      category: (p.category || "general").toLowerCase(),
      distance: p.distance,
      distanceKm: p.distanceKm,
      latitude: p.latitude,
      longitude: p.longitude,
      address: p.address || p.amenities || "Nearby",
      phone: p.phone,
      amenities: p.amenities
    }));
    setPinnedPlaces(mapped);
  }, []);

  const handleSelectPlaceOnMap = (place: PinnedPlace) => {
    setSelectedPlaceId(place.id);
  };

  return (
    <div 
      className="h-dvh flex flex-col overflow-hidden bg-background text-foreground"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <Header />

      {/* Main Container: Exact Viewport Fitting without Whole-Page Scrolling */}
      <main className="flex-1 min-h-0 flex flex-col p-3 md:p-5 max-w-7xl w-full mx-auto">
        
        {/* Sub-header Banner */}
        <div className="flex items-center justify-between pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-(--primary)/10 text-(--primary)">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                <span>AI Guardian Assistant</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  REAL GPS ACTIVE
                </span>
              </h1>
              <p className="text-xs text-(--muted-foreground) hidden sm:block">
                Synchronized Map &amp; Chat. Ask &quot;What&apos;s near me?&quot; or inspect verified safety havens.
              </p>
            </div>
          </div>

          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden items-center p-1 rounded-2xl bg-elevated-surface border border-border text-xs font-semibold">
            <button
              onClick={() => setMobileTab("chat")}
              className={`py-1.5 px-3 rounded-xl transition-all ${mobileTab === "chat" ? "bg-(--primary) text-white shadow-sm" : "text-(--muted-foreground)"}`}
            >
              Chat
            </button>
            <button
              onClick={() => setMobileTab("map")}
              className={`py-1.5 px-3 rounded-xl transition-all ${mobileTab === "map" ? "bg-(--primary) text-white shadow-sm" : "text-(--muted-foreground)"}`}
            >
              Live Map
            </button>
            <button
              onClick={() => setMobileTab("safety")}
              className={`py-1.5 px-3 rounded-xl transition-all ${mobileTab === "safety" ? "bg-(--primary) text-white shadow-sm" : "text-(--muted-foreground)"}`}
            >
              Check-In
            </button>
          </div>
        </div>

        {/* Desktop Split View / Mobile Tab View */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Column: AI Guardian Chat (50% on Desktop) */}
          <div className={`h-full min-h-0 flex flex-col lg:col-span-6 xl:col-span-7 ${mobileTab !== "chat" ? "hidden lg:flex" : "flex"}`}>
            <TravelAssistant
              context={liveContext}
              isOpen={true}
              isFloating={false}
              onApplyInterval={handleApplyInterval}
              onTriggerAlert={handleTriggerAlert}
              onPlacesDiscovered={handlePlacesDiscovered}
              onSelectPlace={(p) => {
                setSelectedPlaceId(p.id);
                setMobileTab("map");
              }}
            />
          </div>

          {/* Right Column: Live Synchronized Map & Safety Hub (50% on Desktop) */}
          <div className={`h-full min-h-0 flex flex-col gap-3 lg:col-span-6 xl:col-span-5 ${mobileTab === "chat" ? "hidden lg:flex" : "flex"}`}>
            
            {/* Upper Half: Live Synchronized Map */}
            <div className={`rounded-3xl overflow-hidden border border-border shadow-sm shrink-0 ${mobileTab === "map" ? "h-full" : "h-70 lg:h-[48%]"}`}>
              <GuardianMapSync
                pinnedPlaces={pinnedPlaces}
                selectedPlaceId={selectedPlaceId}
                onSelectPlace={handleSelectPlaceOnMap}
                className="w-full h-full"
              />
            </div>

            {/* Lower Half: Safety Check-In Widget & Context Details (Scrollable Container) */}
            <div className={`flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 ${mobileTab === "map" ? "hidden lg:block" : "block"}`}>
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

              {/* Verified Corridor Security Rules */}
              <div className="p-4 rounded-2xl bg-surface border border-border text-xs text-(--muted-foreground) space-y-2">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                  <ShieldCheck className="h-4 w-4 text-(--primary)" />
                  <span>Real-time Safety Rules</span>
                </div>
                <p>
                  AI tools strictly query verified coordinates without hallucinating places. Emergency calls (112) and SOS require manual user confirmation.
                </p>
              </div>
            </div>

          </div>

        </div>

      </main>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
