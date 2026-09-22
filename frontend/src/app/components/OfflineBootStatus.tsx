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
      className="px-4 py-2.5 shadow-sm text-xs"
      style={{
        backgroundColor: "#FFFBEB",
        borderBottom: "1px solid #FDE68A",
        color: "#92400E",
        fontFamily: "'Poppins',sans-serif",
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span style={{ fontWeight: 800, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "11px" }}>
            Offline Mode Active
          </span>
          <span style={{ color: "#B45309" }} className="hidden sm:inline">• Using Cached Application Shell</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          {/* Active Corridor */}
          <div className="flex items-center gap-1.5" style={{ color: "#78350F" }}>
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Pack: <strong style={{ color: "#0F172A" }}>{activePack ? `${activePack.origin.name.split(',')[0]} → ${activePack.destination.name.split(',')[0]}` : `${dbPacksCount} Cached`}</strong>
            </span>
          </div>

          {/* GPS Chip Availability */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span style={{ color: "#78350F" }}>
              GPS: <strong style={{ color: gpsSupported ? "#2563FF" : "#94A3B8" }}>{gpsSupported ? "Available" : "No GPS"}</strong>
            </span>
          </div>

          {/* Service Worker Shell */}
          <div className="hidden md:flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-purple-600" />
            <span style={{ color: "#78350F" }}>
              PWA Shell: <strong style={{ color: swAvailable ? "#16A34A" : "#D97706" }}>{swAvailable ? "Cached" : "Standard"}</strong>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
