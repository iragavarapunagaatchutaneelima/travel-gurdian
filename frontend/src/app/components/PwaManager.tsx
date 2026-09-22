"use client";

import React from "react";
import { Download, RefreshCw, X, ShieldCheck } from "lucide-react";
import { usePwaManager } from "../../hooks/usePwaManager";

interface PwaManagerProps {
  isNavigating?: boolean;
  isEmergencyOpen?: boolean;
}

export function PwaManager({ isNavigating = false, isEmergencyOpen = false }: PwaManagerProps) {
  const {
    isInstallable,
    isInstalled,
    updateAvailable,
    promptInstall,
    applyUpdate,
    dismissUpdate,
  } = usePwaManager(isNavigating, isEmergencyOpen);

  return (
    <>
      {/* 1. Update Available Banner (Protected against active navigation) */}
      {updateAvailable && !isNavigating && !isEmergencyOpen && (
        <aside 
          aria-label="Application Update Notice"
          className="fixed top-4 right-4 z-50 max-w-md bg-slate-900/95 border border-emerald-500/40 backdrop-blur-md text-white p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Update Ready</h4>
            <p className="text-xs text-slate-300 mt-0.5">A new verified build of Travel Guardian is available.</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={applyUpdate}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold rounded-lg transition-all shadow-md"
            >
              Update
            </button>
            <button
              onClick={dismissUpdate}
              aria-label="Dismiss Update"
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* 2. Optional PWA Install Banner */}
      {isInstallable && !isInstalled && !isNavigating && (
        <aside 
          aria-label="PWA Installation Prompt"
          className="fixed bottom-20 right-4 z-40 max-w-xs bg-slate-900/90 border border-slate-700/60 backdrop-blur-md text-white p-3 rounded-xl shadow-xl flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Install Travel Guardian</p>
              <p className="text-[10px] text-slate-400">Offline-first standalone app</p>
            </div>
          </div>
          <button
            onClick={promptInstall}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white text-[11px] font-bold rounded-lg transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
        </aside>
      )}
    </>
  );
}
