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

  const fromLoc = searchParams.get("from") || "Chennai, Tamil Nadu";
  const toLoc = searchParams.get("dest") || "Bangalore, Karnataka";

  const startCity = fromLoc.split(",")[0];
  const endCity = toLoc.split(",")[0];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-7xl px-4 md:px-8 py-8 space-y-8 flex flex-col items-center animate-slideUp">
        
        {/* Layout split on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start">
          
          {/* Left side column */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-xl text-center space-y-6 flex flex-col items-center transition-colors">
              
              {/* Red Cloud Icon */}
              <div className="rounded-full bg-danger/10 p-6 text-danger border border-danger/30">
                <CloudOff className="h-12 w-12 stroke-[2.5]" />
              </div>

              {/* Text Details */}
              <div className="space-y-2">
                <h2 className="text-xl font-black text-foreground">You are in Offline Mode</h2>
                <p className="text-xs text-danger font-extrabold uppercase tracking-wider">
                  Using Cached Safety Pack
                </p>
                <p className="text-xs text-muted font-semibold leading-relaxed pt-2">
                  All cached navigation coordinates, emergency numbers, and safe stop dossiers remain fully active on your device.
                </p>
              </div>

              {/* Button */}
              <button
                onClick={() => router.push(`/map?from=chennai&dest=bangalore&mode=Car&routeId=A`)}
                className="w-full rounded-2xl bg-primary-accent hover:bg-primary-accent-hover py-3.5 text-xs font-black text-white transition-colors shadow-md"
              >
                Open Cached Live Map
              </button>

              {/* Saved kit status label */}
              <div className="text-[10px] text-muted font-bold border-t border-border pt-4 w-full">
                Using cached pack for <br />
                <span className="text-primary-accent font-black mt-1 block">
                  {startCity} ➔ {endCity}
                </span>
              </div>

            </div>
          </div>

          {/* Right side column: Downloaded Offline Safety Guide */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="rounded-3xl border border-border bg-surface p-6 md:p-8 shadow-sm text-left space-y-6 transition-colors">
              
              <div className="border-b border-border pb-4">
                <span className="text-[10px] text-primary-accent font-extrabold uppercase tracking-widest block">
                  Cached Highway Dossier
                </span>
                <h3 className="text-xl font-black text-foreground tracking-tight mt-1">
                  Offline Safety Guide: {startCity} to {endCity}
                </h3>
                <p className="text-xs text-muted font-semibold mt-1">
                  All coordinates, verified stops, and contacts are preserved in device storage cache.
                </p>
              </div>

              {/* Routes breakdown in offline guide */}
              <div className="space-y-4">
                
                {/* Route A Details */}
                <div className="rounded-2xl border border-success/30 bg-success/5 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-black text-foreground">
                      <ShieldCheck className="h-5 w-5 text-success" />
                      Route A: Safe Highway Corridor
                    </span>
                    <span className="rounded-full bg-success/10 border border-success/30 px-3 py-1 text-[9px] font-black text-success uppercase">
                      94/100 Safer
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted leading-relaxed font-semibold">
                    Main National Highway corridor. Continuous lane illumination, frequent 24/7 fuel plazas with clean restrooms, and active police patrol coverage loops.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-[10px] font-bold text-muted">
                    <div><span>⛽ HP Mega Highway Plaza:</span> <span className="text-foreground">45 km ahead</span></div>
                    <div><span>🏥 Emergency Trauma Node:</span> <span className="text-foreground">30 km ahead</span></div>
                    <div><span>🏨 Verified Highway Stay:</span> <span className="text-foreground">95 km ahead</span></div>
                    <div><span>🚨 Highway Patrol Booth:</span> <span className="text-foreground">24/7 Active</span></div>
                  </div>
                </div>

                {/* Route B Details */}
                <div className="rounded-2xl border border-warning/30 bg-warning/5 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-black text-foreground">
                      <AlertOctagon className="h-5 w-5 text-warning" />
                      Route B: Alternate Bypass Road
                    </span>
                    <span className="rounded-full bg-warning/10 border border-warning/30 px-3 py-1 text-[9px] font-black text-warning uppercase">
                      76/100 Caution
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted leading-relaxed font-semibold">
                    Alternate bypass path has reduced lighting after 21:00 and limited verified rest stops. Avoid solo night driving on unlit sections.
                  </p>
                </div>

              </div>

              {/* Emergency Contacts cached list */}
              <div className="border-t border-border pt-4 space-y-2">
                <span className="text-[10px] font-black text-muted uppercase tracking-widest block">
                  Emergency Hotlines (Cached)
                </span>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <PhoneCall className="h-4 w-4 text-danger animate-pulse" />
                    <span>National Emergency Hotline: Dial 112</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <PhoneCall className="h-4 w-4 text-primary-accent" />
                    <span>Women Travel Helpline: Dial 1091</span>
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
      <div className="min-h-screen bg-background text-muted flex flex-col items-center justify-center gap-3 text-xs font-bold">
        <div className="h-6 w-6 border-2 border-primary-accent border-t-transparent rounded-full animate-spin" />
        <span>Initializing Offline Cache Mode...</span>
      </div>
    }>
      <OfflineModeContent />
    </Suspense>
  );
}
