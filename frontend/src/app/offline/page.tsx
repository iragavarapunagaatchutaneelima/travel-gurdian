"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { Check, Loader, Download, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

function OfflineGuardianContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromLoc = searchParams.get("from") || "Chennai, Tamil Nadu";
  const toLoc = searchParams.get("dest") || "Bangalore, Karnataka";

  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("Last Updated: 28 Aug 2026, 08:30 AM");

  const handleSavePack = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
      setLastUpdated(`Last Updated: ${now.toLocaleDateString('en-US', options)}`);
      
      localStorage.setItem("journey_safety_pack", JSON.stringify({
        from: fromLoc,
        dest: toLoc,
        savedAt: now.toISOString(),
        status: "active_offline"
      }));

      router.push(`/offline-mode?from=${encodeURIComponent(fromLoc)}&dest=${encodeURIComponent(toLoc)}`);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      
      {/* Top Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6 flex flex-col items-center animate-slideUp">
        
        <div className="text-center max-w-xl space-y-2">
          <span className="text-[10px] text-primary-accent font-extrabold uppercase tracking-widest block">
            OFFLINE GUARDIAN
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            Prepare Offline Journey Pack
          </h2>
          <p className="text-xs text-muted font-semibold leading-relaxed">
            Download local navigation coordinates, safety corridor checklists, and emergency numbers to stay protected without cellular signals.
          </p>
        </div>

        {/* Box */}
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm text-left space-y-6 transition-colors">
            
            <div className="space-y-1">
              <h3 className="text-sm font-black text-foreground">Caching Safety Matrix</h3>
              <p className="text-xs text-muted font-semibold">
                Cached items will match active search query parameters for <span className="text-primary-accent font-black">{fromLoc.split(",")[0]} ➔ {toLoc.split(",")[0]}</span>.
              </p>
            </div>

            {/* List of features with checkmarks */}
            <div className="space-y-3">
              {[
                "6-City Route Intelligence Coordinates",
                "Nearby POIs (Hospitals, Police, Gas Plazas)",
                "Emergency Contacts Telemetry Protocol",
                "Offline Map Bounds Cache",
                "Highway Safety & Guidelines Dossier"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs font-bold text-foreground">
                  <div className="rounded-full bg-success/10 border border-success/30 p-1 text-success flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Save button */}
            <button
              onClick={handleSavePack}
              disabled={saving}
              className="w-full rounded-2xl bg-primary-accent hover:bg-primary-accent-hover py-3.5 text-xs font-black text-white transition-colors shadow-md flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader className="h-4.5 w-4.5 animate-spin" />
                  <span>Downloading Maps & Intelligence Assets...</span>
                </>
              ) : (
                <>
                  <Download className="h-4.5 w-4.5" />
                  <span>Save Offline Journey Pack</span>
                </>
              )}
            </button>

            {/* Timestamp footer */}
            <div className="text-center text-[10px] text-muted font-extrabold uppercase tracking-wider pt-2 border-t border-border">
              {lastUpdated}
            </div>

          </div>
        </div>

      </div>

      {/* Bottom nav */}
      <div className="md:hidden">
        <BottomNav />
      </div>

    </div>
  );
}

export default function OfflineGuardian() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-muted flex flex-col items-center justify-center gap-3 text-xs font-bold">
        <div className="h-6 w-6 border-2 border-primary-accent border-t-transparent rounded-full animate-spin" />
        <span>Resolving Offline Packages...</span>
      </div>
    }>
      <OfflineGuardianContent />
    </Suspense>
  );
}
