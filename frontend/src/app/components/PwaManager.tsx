"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Download, RefreshCw, X, ShieldCheck } from "lucide-react";
import { usePwaManager } from "../../hooks/usePwaManager";

interface PwaManagerProps {
  isNavigating?: boolean;
  isEmergencyOpen?: boolean;
}

export function PwaManager({ isNavigating = false, isEmergencyOpen = false }: PwaManagerProps) {
  const pathname = usePathname();
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("travel_guardian_pwa_dismissed") === "true";
      if (dismissed) {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("travel_guardian_pwa_dismissed", "true");
    }
  };

  const {
    isInstallable,
    isInstalled,
    updateAvailable,
    promptInstall,
    applyUpdate,
    dismissUpdate,
  } = usePwaManager(isNavigating, isEmergencyOpen);

  // Suppress floating banner on Map page to prevent any collision with HUD / navigation
  const isMapPage = pathname === "/map";

  return (
    <>
      {/* 1. Update Available Banner (Protected against active navigation) */}
      {updateAvailable && !isNavigating && !isEmergencyOpen && (
        <aside 
          aria-label="Application Update Notice"
          className="fixed top-4 right-4 z-50 max-w-md bg-slate-900/95 border border-emerald-500/40 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Update Ready</h4>
            <p className="text-xs text-slate-300 mt-0.5">A new verified build of Travel Guardian is available.</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={applyUpdate}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
            >
              Update
            </button>
            <button
              onClick={dismissUpdate}
              aria-label="Dismiss Update"
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* 2. Optional PWA Install Banner (Dismissable & Persisted) */}
      {isInstallable && !isInstalled && !isNavigating && !isDismissed && !isMapPage && (
        <aside 
          aria-label="PWA Installation Prompt"
          className="fixed bottom-6 right-6 z-40 max-w-sm bg-slate-900/95 border border-slate-700/80 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-100 truncate">Install Travel Guardian</p>
              <p className="text-[10px] text-slate-400 truncate">Offline-first standalone app</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={promptInstall}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss Install Prompt"
              className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
