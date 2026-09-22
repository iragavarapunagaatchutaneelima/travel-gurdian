"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import OfflineSurvivalCard from "../components/OfflineSurvivalCard";
import { useOfflineStatus } from "../../hooks/useOfflineStatus";
import { 
  CloudOff, 
  Wifi, 
  WifiOff, 
  MapPin, 
  PhoneCall, 
  Compass, 
  ShieldCheck, 
  Database, 
  ChevronRight,
  Loader
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function OfflineModeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    networkStatus,
    isOnline,
    isOffline,
    activePack,
    allPacks,
    gpsAvailable,
    gpsNetworkState,
    refreshStorage
  } = useOfflineStatus();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-6xl px-4 md:px-8 py-6 space-y-6 text-left animate-slideUp">
        
        {/* Top Status Header */}
        <div className="border-b border-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black text-danger uppercase tracking-widest block">
              OFFLINE GUARDIAN ACTIVE
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mt-1">
              Offline Survival Hub & Living Dossier
            </h1>
            <p className="text-xs text-muted font-semibold mt-0.5">
              Operating under local device cache. Turn guidance, safe havens, and emergency numbers remain fully functional.
            </p>
          </div>

          {/* Combined GPS & Network State */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
              isOffline ? "bg-danger/10 border-danger/30 text-danger" : "bg-success/10 border-success/30 text-success"
            }`}>
              {isOffline ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
              <span>NETWORK: {networkStatus}</span>
            </span>

            <span className="text-[10px] font-black uppercase px-3 py-1.5 rounded-full border bg-elevated-surface border-border text-foreground flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-primary-accent" />
              <span>GPS: {gpsAvailable ? "AVAILABLE" : "UNAVAILABLE"}</span>
            </span>
          </div>
        </div>

        {/* Main Grid: Active Pack Card + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Interactive Offline Survival Card */}
          <div className="lg:col-span-8">
            {activePack ? (
              <OfflineSurvivalCard pack={activePack} onRefreshPack={refreshStorage} />
            ) : (
              <div className="p-8 rounded-3xl border border-border bg-surface text-center space-y-4 shadow-sm">
                <CloudOff className="h-12 w-12 text-muted mx-auto" />
                <h3 className="font-black text-lg text-foreground">No Active Offline Corridor Pack</h3>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  Download an offline pack in advance to view cached routes and medical havens during disconnected travel.
                </p>
                <Link
                  href="/offline"
                  className="inline-flex py-3 px-5 rounded-2xl bg-primary-accent hover:bg-primary-accent-hover text-white font-black text-xs shadow-md"
                >
                  Download Journey Pack
                </Link>
              </div>
            )}
          </div>

          {/* Right Column: Quick Navigation & Emergency Dialing */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Direct 112 Hotline */}
            <div className="p-6 rounded-3xl bg-surface border border-danger/30 shadow-sm text-left space-y-3">
              <span className="text-[10px] font-black text-danger uppercase tracking-widest block">
                Emergency Calling (Cellular Voice)
              </span>
              <p className="text-xs text-muted font-semibold leading-relaxed">
                Emergency calls (112) can be placed without mobile data if voice signal is reachable.
              </p>
              <a
                href="tel:112"
                className="w-full py-3.5 rounded-2xl bg-danger hover:opacity-90 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-danger/20 text-center"
              >
                <PhoneCall className="h-4 w-4" />
                <span>Call 112 Public Emergency</span>
              </a>
            </div>

            {/* Offline Corridor Switcher Card */}
            <div className="p-5 rounded-3xl bg-elevated-surface border border-border space-y-3 text-xs">
              <div className="flex items-center justify-between font-black text-foreground">
                <span className="uppercase text-[10px] tracking-wider text-muted">Corridor Packs</span>
                <Link href="/offline" className="text-primary-accent hover:underline text-[11px]">
                  Manage All
                </Link>
              </div>
              <p className="text-[11px] text-muted font-semibold">
                You have <strong className="text-foreground">{allPacks.length} pack(s)</strong> stored in device memory.
              </p>
              <Link
                href="/offline"
                className="w-full py-2.5 rounded-xl bg-surface hover:bg-border text-foreground font-black text-xs flex items-center justify-center gap-1.5 border border-border transition-colors text-center"
              >
                <span>Browse All Cached Packs</span>
                <ChevronRight className="h-3.5 w-3.5" />
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

export default function OfflineMode() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-muted flex flex-col items-center justify-center gap-3 text-xs font-bold">
        <Loader className="h-6 w-6 animate-spin text-primary-accent" />
        <span>Loading Offline Survival Hub...</span>
      </div>
    }>
      <OfflineModeContent />
    </Suspense>
  );
}
