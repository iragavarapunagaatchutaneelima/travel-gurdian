"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { Check, Loader } from "lucide-react";

export const dynamic = "force-dynamic";

function OfflineGuardianContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromLoc = searchParams.get("from") || "Mumbai, Maharashtra";
  const toLoc = searchParams.get("dest") || "Pune, Maharashtra";

  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("Last Updated: 27 Aug 2026, 08:30 AM");

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
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 md:pb-8 flex flex-col items-center">
      
      {/* Top Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6 flex flex-col items-center">
        
        <div className="text-center max-w-xl space-y-2">
          <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block">Offline Protection</span>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Prepare Journey Pack</h2>
          <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
            Download local navigation files, safe-haven networks, and weather warning registries to stay safe without cell signals.
          </p>
        </div>

        {/* Box */}
        <div className="w-full max-w-md">
          <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm text-left space-y-6">
            
            <div className="space-y-1">
              <h3 className="text-sm font-black text-zinc-800">Caching Safety Matrix</h3>
              <p className="text-[11px] text-zinc-500 font-semibold">
                Cached items will match active search query parameters for <span className="text-indigo-600 font-black">{fromLoc.split(",")[0]} ➔ {toLoc.split(",")[0]}</span>.
              </p>
            </div>

            {/* List of features with checkmarks */}
            <div className="space-y-3.5">
              {[
                "Route Information",
                "Nearby Places (Hospitals, Police, Gas)",
                "Emergency Contacts Details",
                "Offline Map Telemetry",
                "Culture & Guidelines"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs font-bold text-zinc-700">
                  <div className="rounded-full bg-emerald-50 border border-emerald-250 p-1 text-emerald-600 flex items-center justify-center">
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
              className="w-full rounded-xl bg-indigo-600 py-3.5 text-xs font-black text-white hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader className="h-4.5 w-4.5 animate-spin" />
                  <span>Downloading Maps & Assets...</span>
                </>
              ) : (
                <span>💾 Save Journey Pack</span>
              )}
            </button>

            {/* Timestamp footer */}
            <div className="text-center text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider pt-2 border-t border-zinc-150">
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
      <div className="min-h-screen bg-zinc-50 text-zinc-500 flex flex-col items-center justify-center gap-3 text-xs font-bold">
        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span>Resolving Offline Packages...</span>
      </div>
    }>
      <OfflineGuardianContent />
    </Suspense>
  );
}
