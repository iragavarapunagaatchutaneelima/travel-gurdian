"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { CloudOff, ShieldCheck, AlertOctagon, PhoneCall, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

function OfflineModeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromLoc = searchParams.get("from") || "Kakinada, Andhra Pradesh";
  const toLoc = searchParams.get("dest") || "Rajahmundry, Andhra Pradesh";

  const startCity = fromLoc.split(",")[0];
  const endCity = toLoc.split(",")[0];

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 md:pb-8 flex flex-col items-center">
      
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-7xl px-4 md:px-8 py-8 space-y-8 flex flex-col items-center">
        
        {/* Layout split on desktop: Left side offline alert card, Right side cached offline manual */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start">
          
          {/* Left side column: Alert & Navigation recovery */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-md rounded-[32px] border border-zinc-200 bg-white p-8 shadow-xl text-center space-y-6 flex flex-col items-center">
              
              {/* Red Cloud Icon */}
              <div className="rounded-full bg-red-50 p-6 text-red-500 border border-red-200">
                <CloudOff className="h-12 w-12 stroke-[2.5]" />
              </div>

              {/* Text Details */}
              <div className="space-y-2">
                <h2 className="text-xl font-black text-zinc-900">You are Offline</h2>
                <p className="text-xs text-red-500 font-extrabold uppercase tracking-wider">
                  No Internet Connection Detected
                </p>
                <p className="text-xs text-zinc-500 font-semibold leading-relaxed pt-2">
                  Don't worry! You can use your saved journey pack. Some features will be limited until you're back online.
                </p>
              </div>

              {/* Button */}
              <button
                onClick={() => router.push(`/map?from=${encodeURIComponent(fromLoc)}&dest=${encodeURIComponent(toLoc)}`)}
                className="w-full rounded-xl bg-indigo-600 py-3.5 text-xs font-black text-white hover:bg-indigo-500 transition-colors shadow-md"
              >
                Go to Offline Home
              </button>

              {/* Saved kit status label */}
              <div className="text-[10px] text-zinc-450 font-bold border-t border-zinc-150 pt-4 w-full">
                Using saved journey pack for <br />
                <span className="text-indigo-650 font-black mt-1 block">
                  {startCity} ➔ {endCity}
                </span>
              </div>

            </div>
          </div>

          {/* Right side column: Downloaded Offline Safety Guide detailing Route A & Route B */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 md:p-8 shadow-sm text-left space-y-6">
              
              <div className="border-b border-zinc-150 pb-4">
                <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block">Downloaded Guide Pack</span>
                <h3 className="text-xl font-black text-zinc-900 tracking-tight mt-1">
                  Offline Safety Guide: {startCity} to {endCity}
                </h3>
                <p className="text-xs text-zinc-500 font-semibold mt-1">
                  All maps telemetry, verified stops, and contacts are preserved in device storage cache.
                </p>
              </div>

              {/* Two routes breakdown in offline guide */}
              <div className="space-y-6">
                
                {/* Route A Details */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/15 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-black text-zinc-900">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      Route A: Safe Haven Highway Corridor
                    </span>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[9px] font-black text-emerald-600 uppercase">
                      92/100 Safer
                    </span>
                  </div>
                  
                  <p className="text-xs text-zinc-650 leading-relaxed font-semibold">
                    Safe corridor follows the main National Highway route. It features fully illuminated lane structures, active CCTV monitoring coverage, and consistent cellular coverage loops.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[10px] font-bold text-zinc-550">
                    <div className="flex items-center gap-2">
                      <span>⛽ Reliance Green Fuel:</span>
                      <span className="text-zinc-850">12.4 km away (Clean toilets)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>🏥 Apollo Clinic:</span>
                      <span className="text-zinc-850">21.8 km away (24/7 emergency)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>⛽ HP Highway Bunk:</span>
                      <span className="text-zinc-850">34.1 km away (Well lit)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>🏨 Sri Kanya Grand:</span>
                      <span className="text-zinc-850">45.0 km away (Women Approved)</span>
                    </div>
                  </div>
                </div>

                {/* Route B Details */}
                <div className="rounded-2xl border border-red-100 bg-red-50/10 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-black text-zinc-900">
                      <AlertOctagon className="h-5 w-5 text-red-500" />
                      Route B: Alternate Bypass Forest Road
                    </span>
                    <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-[9px] font-black text-red-650 uppercase">
                      64/100 Risky
                    </span>
                  </div>
                  
                  <p className="text-xs text-zinc-650 leading-relaxed font-semibold">
                    Alternate bypass path is 15 minutes shorter but features poor lane lighting, storm waterlogging drainage risks (active heavy rain alert), and no verified CCTV checkpoints. Avoid driving after dark.
                  </p>

                  <div className="rounded-xl bg-red-50/20 border border-red-150 p-3 text-[10px] text-red-650 font-bold leading-relaxed">
                    ⚠️ OFFLINE HAZARD LOG: Storm water runoff reported at 22km bypass segment. Cellular networks show weak telemetry. Safe stops are limited.
                  </div>
                </div>

              </div>

              {/* Emergency Contacts cached list */}
              <div className="border-t border-zinc-150 pt-5 space-y-3">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Emergency Services</span>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                    <PhoneCall className="h-4.5 w-4.5 text-red-500 animate-pulse" />
                    <span>Guardian: Sarah Miller (+1-555-0199)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                    <PhoneCall className="h-4.5 w-4.5 text-red-500" />
                    <span>National Helpline Hotkey: Dial 112</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* Bottom Nav */}
      <div className="md:hidden">
        <BottomNav />
      </div>

    </div>
  );
}

export default function OfflineMode() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 text-zinc-500 flex flex-col items-center justify-center gap-3 text-xs font-bold">
        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span>Initializing Offline Cache Mode...</span>
      </div>
    }>
      <OfflineModeContent />
    </Suspense>
  );
}
