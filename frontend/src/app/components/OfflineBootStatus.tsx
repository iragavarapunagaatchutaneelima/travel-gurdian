"use client";

import React, { useEffect, useState } from "react";
import { Wifi, WifiOff, MapPin, Database, Cpu, ShieldCheck } from "lucide-react";
import { useOfflineStatus } from "../../hooks/useOfflineStatus";
import { offlineStorageService } from "../../services/offlineStorageService";

export function OfflineBootStatus() {
  const { isOnline, activePack, gpsNetworkState } = useOfflineStatus();
  const [swAvailable, setSwAvailable] = useState<boolean>(false);
  const [dbPacksCount, setDbPacksCount] = useState<number>(0);
  const [gpsSupported, setGpsSupported] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check Service Worker
    setSwAvailable("serviceWorker" in navigator);

    // Check Geolocation hardware API
    setGpsSupported("geolocation" in navigator);

    // Check IndexedDB
    offlineStorageService.listOfflinePacks().then((packs) => {
      setDbPacksCount(packs.length);
    });
  }, []);

  // Only render prominent boot diagnostic if offline or viewing offline hub
  if (isOnline) return null;

  return (
    <aside 
      aria-label="Offline Boot Diagnostics"
      className="bg-slate-900/90 border-b border-amber-500/30 px-4 py-2.5 backdrop-blur-md text-slate-200 text-xs"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
            Offline Mode Active
          </span>
          <span className="text-slate-400 hidden sm:inline">• Using Cached Application Shell</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          {/* Active Corridor */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Pack: <strong className="text-white">{activePack ? `${activePack.origin.name.split(',')[0]} → ${activePack.destination.name.split(',')[0]}` : `${dbPacksCount} Cached`}</strong>
            </span>
          </div>

          {/* GPS Chip Availability */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-300">
              GPS: <strong className={gpsSupported ? "text-sky-300" : "text-slate-500"}>{gpsSupported ? "Available" : "No GPS"}</strong>
            </span>
          </div>

          {/* Service Worker Shell */}
          <div className="hidden md:flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-300">
              PWA Shell: <strong className={swAvailable ? "text-emerald-400" : "text-amber-400"}>{swAvailable ? "Cached" : "Standard"}</strong>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
