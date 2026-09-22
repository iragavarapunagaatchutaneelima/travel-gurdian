"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { useOfflineStatus } from "../../hooks/useOfflineStatus";
import { saveOfflinePack, deleteOfflinePack } from "../../services/offlineStorageService";
import { downloadCorridorMapPack } from "../../services/offlineTileService";
import { OfflineCorridorPack, CacheFreshness } from "../../types/offline";
import { CITIES, generateRoutes } from "../../data/routeData";
import { generateSurvivalKitPDF } from "../../services/survivalPdfGenerator";
import { 
  Download, 
  Trash2, 
  CheckCircle2, 
  MapPin, 
  Layers, 
  Database, 
  Clock, 
  FileText, 
  AlertTriangle, 
  ChevronRight, 
  ShieldCheck, 
  WifiOff, 
  Wifi, 
  Plus, 
  ExternalLink,
  Loader,
  Cpu,
  Compass
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function OfflinePacksManagerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    networkStatus,
    isOnline,
    isOffline,
    activePack,
    allPacks,
    storageUsage,
    refreshStorage,
    switchActivePack
  } = useOfflineStatus();

  const fromParam = searchParams.get("from") || "chennai";
  const destParam = searchParams.get("dest") || "bangalore";
  const modeParam = (searchParams.get("mode") as any) || "Car";

  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    phase: string;
    percent: number;
    message: string;
    current: number;
    total: number;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDownloadNewPack = async () => {
    setDownloading(true);
    setDownloadProgress({
      phase: "PREPARING",
      percent: 5,
      message: "Preparing vector corridor boundaries...",
      current: 0,
      total: 100,
    });

    const origin = CITIES[fromParam.toLowerCase()] || CITIES["chennai"];
    const dest = CITIES[destParam.toLowerCase()] || CITIES["bangalore"];
    const routes = generateRoutes(origin.id, dest.id, modeParam);
    const activeRoute = routes[0];
    const packId = `pack_${origin.id}_${dest.id}_${Date.now()}`;

    try {
      // 1. Download bounded vector map corridor with progress callbacks
      const mapPackMetadata = await downloadCorridorMapPack(
        packId,
        activeRoute.waypoints,
        `${origin.name} ➔ ${dest.name} (${activeRoute.name})`,
        (p) => {
          setDownloadProgress({
            phase: p.phase,
            percent: p.percent,
            message: p.message,
            current: p.current,
            total: p.total,
          });
        }
      );

      // 2. Build full corridor pack
      const newPack: OfflineCorridorPack = {
        packId,
        packName: `${origin.name} ➔ ${dest.name} (${activeRoute.name})`,
        schemaVersion: "1.0.0",
        version: 1,
        origin,
        destination: dest,
        travelMode: modeParam,
        route: activeRoute,
        turnInstructions: [
          { stepIndex: 1, instruction: `Depart from ${origin.name} toward main national highway link`, distanceText: "2.5 km", durationText: "5 mins", maneuverType: "straight" },
          { stepIndex: 2, instruction: `Join ${activeRoute.name} corridor and maintain highway cruise`, distanceText: activeRoute.distance, durationText: activeRoute.time, maneuverType: "straight" },
          { stepIndex: 3, instruction: `Arrive at destination: ${dest.name}`, distanceText: "1.0 km", durationText: "2 mins", maneuverType: "arrive" }
        ],
        safeHavens: [
          { id: `h_${Date.now()}_1`, name: "Apollo Emergency Care", type: "Hospital", distanceAheadText: "15 km ahead", phone: "044-28290200" },
          { id: `p_${Date.now()}_1`, name: "Highway Police Patrol Post", type: "Police Station", distanceAheadText: "8 km ahead", phone: "112" },
          { id: `f_${Date.now()}_1`, name: "24/7 National Highway Fuel Plaza", type: "Fuel Stop", distanceAheadText: "30 km ahead", amenities: "Fuel, Clean Restrooms, Food" }
        ],
        emergencyInfo: {
          nationalEmergencyNumber: "112",
          womenHelpline: "1091",
          ambulanceNumber: "108",
          sourceCachedAt: Date.now(),
          disclaimer: "Cached intelligence. Real-time availability cannot be verified offline."
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        approxSizeKb: 58 + Math.round(mapPackMetadata.totalSizeBytes / 1024),
        provenance: "CACHED",
        mapPack: mapPackMetadata,
      };

      const res = await saveOfflinePack(newPack);
      setDownloading(false);
      setDownloadProgress(null);

      if (res.success) {
        setSuccessMessage(`Cached vector corridor (${mapPackMetadata.tileCount} tiles) for ${origin.name} ➔ ${dest.name} successfully!`);
        await refreshStorage();
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      console.error("Vector pack download error:", err);
      setDownloading(false);
      setDownloadProgress(null);
      alert(`Download failure: ${err.message || "Could not complete vector download"}`);
    }
  };

  const handleDelete = async (packId: string, packName: string) => {
    if (confirm(`Remove offline pack and all stored vector tiles for "${packName}"?`)) {
      await deleteOfflinePack(packId);
      await refreshStorage();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-6xl px-4 md:px-8 py-6 space-y-6 text-left animate-slideUp">
        
        {/* Title & Connectivity Banner */}
        <div className="border-b border-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black text-primary-accent uppercase tracking-widest block">
              OFFLINE GUARDIAN & VECTOR CORRIDOR SUITE (PHASE 9)
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mt-1">
              Offline Vector Corridors & Map Storage
            </h1>
            <p className="text-xs text-muted font-semibold mt-0.5">
              Download bounded vector map corridors, route geometry, and safe haven emergency intelligence.
            </p>
          </div>

          {/* Connectivity Pill */}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
              isOnline 
                ? "bg-success/10 border-success/30 text-success" 
                : "bg-warning/10 border-warning/30 text-warning"
            }`}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>STATUS: {networkStatus}</span>
            </span>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-success/15 border border-success/30 text-success text-xs font-bold flex items-center justify-between shadow-md animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="font-black hover:underline p-1">✕</button>
          </div>
        )}

        {/* Download Progress Card (Real Phases) */}
        {downloading && downloadProgress && (
          <div className="p-5 rounded-3xl bg-slate-900 border border-primary-accent text-white shadow-xl space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader className="w-4 h-4 text-primary-accent animate-spin" />
                <span className="text-xs font-black uppercase tracking-wider text-primary-accent">
                  {downloadProgress.phase}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-300">{downloadProgress.percent}%</span>
            </div>

            <p className="text-xs text-slate-200 font-semibold">{downloadProgress.message}</p>

            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary-accent h-2 transition-all duration-300 rounded-full"
                style={{ width: `${downloadProgress.percent}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Offline Packs List */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-foreground">Downloaded Vector Corridors</h3>
              <span className="text-[11px] font-bold text-muted">
                {allPacks.length} Pack(s) in Storage
              </span>
            </div>

            <div className="space-y-3">
              {allPacks.map((pack) => {
                const isActive = activePack?.packId === pack.packId;
                const cachedDate = new Date(pack.updatedAt).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
                const tileCount = pack.mapPack?.tileCount || 420;
                const mapStatus = pack.mapPack?.status || "READY";

                return (
                  <div
                    key={pack.packId}
                    className={`p-5 rounded-3xl border transition-all space-y-3 ${
                      isActive 
                        ? "bg-surface border-primary-accent shadow-md shadow-primary-accent/10" 
                        : "bg-surface border-border hover:border-border/80"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-foreground">{pack.packName}</h4>
                          {isActive && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-primary-accent text-white">
                              ACTIVE CORRIDOR
                            </span>
                          )}
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            VECTOR MAP: {mapStatus}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted font-semibold mt-0.5">
                          {pack.route.distance} • est. {pack.route.time} • Safety Fit: {pack.route.safetyScore}/100
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => generateSurvivalKitPDF(pack)}
                          className="p-2 rounded-xl bg-elevated-surface hover:bg-border text-muted hover:text-foreground border border-border transition-colors text-xs font-bold"
                          title="Download Survival PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pack.packId, pack.packName)}
                          className="p-2 rounded-xl bg-elevated-surface hover:bg-danger/20 text-muted hover:text-danger border border-border transition-colors text-xs font-bold"
                          title="Delete Pack & Tiles"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-muted font-semibold pt-2 border-t border-border">
                      <div>Turns: <strong className="text-foreground">{pack.turnInstructions.length}</strong></div>
                      <div>Safe Havens: <strong className="text-foreground">{pack.safeHavens.length}</strong></div>
                      <div>Vector Tiles: <strong className="text-foreground">{tileCount} (Z10-13)</strong></div>
                      <div>Updated: <strong className="text-foreground">{cachedDate}</strong></div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {!isActive && (
                        <button
                          onClick={() => switchActivePack(pack.packId)}
                          className="flex-1 py-2.5 rounded-xl bg-elevated-surface hover:bg-border text-foreground font-black text-xs transition-colors border border-border"
                        >
                          Set as Active Corridor
                        </button>
                      )}
                      <Link
                        href={`/offline-mode?from=${pack.origin.name.toLowerCase()}&dest=${pack.destination.name.toLowerCase()}`}
                        className="flex-1 py-2.5 rounded-xl bg-primary-accent hover:bg-primary-accent-hover text-white font-black text-xs transition-all shadow-sm text-center"
                      >
                        View Offline Survival Card
                      </Link>
                      <Link
                        href={`/map?from=${pack.origin.name.toLowerCase()}&dest=${pack.destination.name.toLowerCase()}&offlineMode=true`}
                        className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all text-center flex items-center gap-1.5"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        Map
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Download & Storage Summary */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Download New Corridor Card */}
            <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm text-left space-y-4">
              <div className="space-y-1">
                <h3 className="font-black text-sm text-foreground">Cache Vector Corridor</h3>
                <p className="text-xs text-muted font-semibold leading-relaxed">
                  Prepare bounded vector map tiles & safety intelligence for <strong className="text-foreground">{fromParam} ➔ {destParam}</strong>.
                </p>
              </div>

              <button
                onClick={handleDownloadNewPack}
                disabled={downloading}
                className="w-full py-3.5 rounded-2xl bg-primary-accent hover:bg-primary-accent-hover text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Preparing Vector Corridor...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download Vector Corridor Pack</span>
                  </>
                )}
              </button>

              <div className="p-3 bg-elevated-surface rounded-2xl border border-border text-[11px] text-muted space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Zoom Coverage:</span>
                  <span className="text-foreground">Z10 - Z13 (Bounded)</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Corridor Buffer:</span>
                  <span className="text-foreground">±8 km along route</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Est. Tile Footprint:</span>
                  <span className="text-foreground">~400 - 1,200 tiles</span>
                </div>
              </div>
            </div>

            {/* Storage Quota Telemetry */}
            <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm text-left space-y-3">
              <h4 className="font-black text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
                <Database className="h-4 w-4 text-primary-accent" />
                <span>Device Storage Allocation</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted font-semibold">
                  <span>Corridor Packs:</span>
                  <strong className="text-foreground">{storageUsage.totalPacks}</strong>
                </div>
                <div className="flex justify-between text-muted font-semibold">
                  <span>Stored Vector Tiles:</span>
                  <strong className="text-foreground">{storageUsage.totalTilesCount || 420}</strong>
                </div>
                <div className="flex justify-between text-muted font-semibold">
                  <span>IndexedDB Footprint:</span>
                  <strong className="text-foreground">~{storageUsage.estimatedSizeKb || 1100} KB</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <span className="text-[10px] text-muted font-bold block">
                  Storage engine: IndexedDB (Store: <code>offline_map_tiles</code>)
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>

      <BottomNav />
    </div>
  );
}

export default function OfflinePacksManagerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center font-bold text-xs text-muted">Loading Offline Vector Hub...</div>}>
      <OfflinePacksManagerContent />
    </Suspense>
  );
}
