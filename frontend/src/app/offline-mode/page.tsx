"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
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
    <div className="min-h-screen pb-20 md:pb-8 flex flex-col items-center" style={{ backgroundColor: "#F8FAFC", fontFamily: "'Poppins',sans-serif" }}>
      
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-6xl px-4 md:px-8 py-6 space-y-6 text-left animate-slideUp">
        
        {/* Top Status Header */}
        <div className="pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#DC2626", display: "block" }}>
              OFFLINE GUARDIAN ACTIVE
            </span>
            <h1 style={{ fontWeight: 800, fontSize: "clamp(22px,4vw,30px)", color: "#0F172A", marginTop: "4px" }}>
              Offline Survival Hub &amp; Living Dossier
            </h1>
            <p style={{ fontSize: "13px", color: "#64748B", fontWeight: 400, marginTop: "2px" }}>
              Operating under local device cache. Turn guidance, safe havens, and emergency numbers remain fully functional.
            </p>
          </div>

          {/* Combined GPS & Network State */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full flex items-center gap-1.5"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "6px 14px",
                backgroundColor: isOffline ? "#FEE2E2" : "#DCFCE7",
                border: isOffline ? "1px solid #FECACA" : "1px solid #86EFAC",
                color: isOffline ? "#DC2626" : "#16A34A",
              }}
            >
              {isOffline ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
              <span>NETWORK: {networkStatus}</span>
            </span>

            <span
              className="rounded-full flex items-center gap-1.5"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "6px 14px",
                backgroundColor: "#EFF6FF",
                border: "1px solid rgba(37,99,255,0.2)",
                color: "#2563FF",
              }}
            >
              <Compass className="h-3.5 w-3.5" style={{ color: "#2563FF" }} />
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
              <div className="p-8 rounded-3xl text-center space-y-4 shadow-sm" style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)" }}>
                <CloudOff className="h-12 w-12 mx-auto" style={{ color: "#94A3B8" }} />
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>No Active Offline Corridor Pack</h3>
                <p style={{ fontSize: "13px", color: "#64748B", maxWidth: "340px", margin: "0 auto", lineHeight: 1.6 }}>
                  Download an offline pack in advance to view cached routes and medical havens during disconnected travel.
                </p>
                <Link
                  href="/offline"
                  className="inline-flex py-3 px-6 rounded-2xl text-white font-bold text-xs shadow-sm transition-all"
                  style={{ backgroundColor: "#2563FF", fontFamily: "'Poppins',sans-serif" }}
                >
                  Download Journey Pack
                </Link>
              </div>
            )}
          </div>

          {/* Right Column: Quick Navigation & Emergency Dialing */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Direct 112 Hotline */}
            <div className="p-6 rounded-3xl shadow-sm text-left space-y-3" style={{ backgroundColor: "#FFFFFF", border: "1px solid #FECACA" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#DC2626", display: "block" }}>
                Emergency Calling (Cellular Voice)
              </span>
              <p style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, lineHeight: 1.5 }}>
                Emergency calls (112) can be placed without mobile data if voice signal is reachable.
              </p>
              <a
                href="tel:112"
                aria-label="Call National Emergency Line 112"
                className="w-full py-3.5 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm text-center transition-all"
                style={{ backgroundColor: "#EF4444", fontFamily: "'Poppins',sans-serif" }}
              >
                <PhoneCall className="h-4 w-4" />
                <span>Call 112 Public Emergency</span>
              </a>
            </div>

            {/* Offline Corridor Switcher Card */}
            <div className="p-5 rounded-3xl space-y-3 text-xs" style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)" }}>
              <div className="flex items-center justify-between font-extrabold" style={{ color: "#0F172A" }}>
                <span style={{ textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.08em", color: "#64748B" }}>Corridor Packs</span>
                <Link href="/offline" aria-label="Manage All Offline Corridor Packs" style={{ color: "#2563FF", fontSize: "11px" }} className="hover:underline">
                  Manage All
                </Link>
              </div>
              <p style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>
                You have <strong style={{ color: "#0F172A" }}>{allPacks.length} pack(s)</strong> stored in device memory.
              </p>
              <Link
                href="/offline"
                aria-label="Browse all cached packs"
                className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors text-center"
                style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.1)", color: "#0F172A", fontFamily: "'Poppins',sans-serif" }}
              >
                <span>Browse All Cached Packs</span>
                <ChevronRight className="h-3.5 w-3.5" style={{ color: "#2563FF" }} />
              </Link>
            </div>

          </div>

        </div>

      </div>

      <Footer />

      <div className="md:hidden">
        <BottomNav />
      </div>

    </div>
  );
}

export default function OfflineMode() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-xs font-bold" style={{ backgroundColor: "#F8FAFC", color: "#64748B" }}>
        <Loader className="h-6 w-6 animate-spin" style={{ color: "#2563FF" }} />
        <span>Loading Offline Survival Hub...</span>
      </div>
    }>
      <OfflineModeContent />
    </Suspense>
  );
}
