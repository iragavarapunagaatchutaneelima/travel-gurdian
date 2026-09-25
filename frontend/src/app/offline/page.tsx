"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { useOfflineStatus } from "../../hooks/useOfflineStatus";
import { saveOfflinePack, deleteOfflinePack } from "../../services/offlineStorageService";
import { downloadCorridorMapPack } from "../../services/offlineTileService";
import { OfflineCorridorPack, CacheFreshness } from "../../types/offline";
import { CITIES, generateRoutes, City } from "../../data/routeData";
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
  const fromLat = parseFloat(searchParams.get("fromLat") || "");
  const fromLng = parseFloat(searchParams.get("fromLng") || "");
  const destLat = parseFloat(searchParams.get("destLat") || "");
  const destLng = parseFloat(searchParams.get("destLng") || "");
  const fromName = searchParams.get("fromName") || fromParam;
  const destName = searchParams.get("destName") || destParam;

  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    phase: string;
    percent: number;
    message: string;
    current: number;
    total: number;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownloadNewPack = async () => {
    setDownloading(true);
    setDownloadProgress({
      phase: "PREPARING",
      percent: 5,
      message: "Preparing vector corridor boundaries...",
      current: 0,
      total: 100,
    });

    const origin: City = CITIES[fromParam.toLowerCase()] || {
      id: fromParam.toLowerCase().replace(/[^a-z0-9]/g, "_") || "origin",
      name: fromName,
      state: "Regional",
      latitude: !isNaN(fromLat) ? fromLat : 13.0827,
      longitude: !isNaN(fromLng) ? fromLng : 80.2707,
      region: "Local Corridor",
      highways: ["National Highway"]
    };
    const dest: City = CITIES[destParam.toLowerCase()] || {
      id: destParam.toLowerCase().replace(/[^a-z0-9]/g, "_") || "destination",
      name: destName,
      state: "Regional",
      latitude: !isNaN(destLat) ? destLat : 12.9716,
      longitude: !isNaN(destLng) ? destLng : 77.5946,
      region: "Local Corridor",
      highways: ["National Highway"]
    };

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
          { stepIndex: 1, instruction: `Depart from ${origin.name} toward main corridor link`, distanceText: "2.5 km", durationText: "5 mins", maneuverType: "straight" },
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
      } else {
        setErrorMessage(`Storage warning: ${res.error || "Unable to save pack"}`);
        setTimeout(() => setErrorMessage(null), 6000);
      }
    } catch (err: any) {
      console.error("Vector pack download error:", err);
      setDownloading(false);
      setDownloadProgress(null);
      setErrorMessage(`Download failure: ${err.message || "Could not complete vector download"}`);
      setTimeout(() => setErrorMessage(null), 6000);
    }
  };

  const handleDelete = async (packId: string, packName: string) => {
    if (confirm(`Remove offline pack and all stored vector tiles for "${packName}"?`)) {
      await deleteOfflinePack(packId);
      await refreshStorage();
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 flex flex-col items-center" style={{ backgroundColor: "#F8FAFC", fontFamily: "'Poppins',sans-serif" }}>
      
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-6xl px-4 md:px-8 py-6 space-y-6 text-left animate-slideUp">
        
        {/* Title & Connectivity Banner */}
        <div className="pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563FF", textTransform: "uppercase", letterSpacing: "0.12em", display: "block" }}>
              OFFLINE GUARDIAN &amp; VECTOR CORRIDOR SUITE
            </span>
            <h1 style={{ fontWeight: 800, fontSize: "clamp(22px,4vw,30px)", color: "#0F172A", marginTop: "4px" }}>
              Offline Vector Corridors &amp; Map Storage
            </h1>
            <p style={{ fontSize: "13px", color: "#64748B", fontWeight: 400, marginTop: "2px" }}>
              Download bounded vector map corridors, route geometry, and safe haven emergency intelligence.
            </p>
          </div>

          {/* Connectivity Pill */}
          <div className="flex items-center gap-2">
            <span
              className="rounded-full flex items-center gap-1.5"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "6px 14px",
                backgroundColor: isOnline ? "#DCFCE7" : "#FEF3C7",
                border: isOnline ? "1px solid #86EFAC" : "1px solid #FDE68A",
                color: isOnline ? "#16A34A" : "#D97706",
              }}
            >
              {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              <span>STATUS: {networkStatus}</span>
            </span>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn" style={{ backgroundColor: "#FEE2E2", border: "1px solid #FCA5A5", color: "#DC2626", fontSize: "13px", fontWeight: 600 }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="font-bold hover:underline p-1">✕</button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn" style={{ backgroundColor: "#DCFCE7", border: "1px solid #86EFAC", color: "#16A34A", fontSize: "13px", fontWeight: 600 }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="font-bold hover:underline p-1">✕</button>
          </div>
        )}

        {/* Download Progress Card (Real Phases) */}
        {downloading && downloadProgress && (
          <div className="p-5 rounded-3xl shadow-md space-y-3 animate-fadeIn" style={{ backgroundColor: "#FFFFFF", border: "2px solid #2563FF" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" style={{ color: "#2563FF" }} />
                <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#2563FF" }}>
                  {downloadProgress.phase}
                </span>
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>{downloadProgress.percent}%</span>
            </div>

            <p style={{ fontSize: "13px", color: "#64748B", fontWeight: 500 }}>{downloadProgress.message}</p>

            <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ backgroundColor: "#EFF6FF" }}>
              <div
                className="h-2.5 transition-all duration-300 rounded-full"
                style={{ width: `${downloadProgress.percent}%`, backgroundColor: "#2563FF" }}
              ></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Offline Packs List */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A" }}>Downloaded Vector Corridors</h3>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748B" }}>
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
                    className="p-5 rounded-3xl transition-all space-y-3"
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: isActive ? "2px solid #2563FF" : "1px solid rgba(15,23,42,0.08)",
                      boxShadow: isActive ? "0 4px 12px rgba(37,99,255,0.12)" : "0 2px 8px rgba(37,99,255,0.04)",
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#0F172A" }}>{pack.packName}</h4>
                          {isActive && (
                            <span style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", padding: "2px 8px", borderRadius: "8px", backgroundColor: "#2563FF", color: "#FFFFFF" }}>
                              ACTIVE CORRIDOR
                            </span>
                          )}
                          <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", padding: "2px 8px", borderRadius: "8px", backgroundColor: "#EFF6FF", color: "#2563FF", border: "1px solid rgba(37,99,255,0.2)" }}>
                            VECTOR MAP: {mapStatus}
                          </span>
                        </div>
                        <p style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, marginTop: "2px" }}>
                          {pack.route.distance} • est. {pack.route.time} • Safety Fit: {pack.route.safetyScore}/100
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => generateSurvivalKitPDF(pack)}
                          className="p-2.5 rounded-xl transition-all"
                          style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.08)", color: "#64748B" }}
                          title="Download Survival PDF"
                        >
                          <FileText className="h-4 w-4" style={{ color: "#2563FF" }} />
                        </button>
                        <button
                          onClick={() => handleDelete(pack.packId, pack.packName)}
                          className="p-2.5 rounded-xl transition-all"
                          style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", color: "#EF4444" }}
                          title="Delete Pack & Tiles"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2" style={{ borderTop: "1px solid rgba(15,23,42,0.06)", fontSize: "11px", color: "#64748B", fontWeight: 500 }}>
                      <div>Turns: <strong style={{ color: "#0F172A" }}>{pack.turnInstructions.length}</strong></div>
                      <div>Safe Havens: <strong style={{ color: "#0F172A" }}>{pack.safeHavens.length}</strong></div>
                      <div>Vector Tiles: <strong style={{ color: "#0F172A" }}>{tileCount} (Z10-13)</strong></div>
                      <div>Updated: <strong style={{ color: "#0F172A" }}>{cachedDate}</strong></div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {!isActive && (
                        <button
                          onClick={() => switchActivePack(pack.packId)}
                          className="flex-1 py-2.5 rounded-xl transition-colors font-bold text-xs"
                          style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.1)", color: "#0F172A", fontFamily: "'Poppins',sans-serif" }}
                        >
                          Set as Active Corridor
                        </button>
                      )}
                      <Link
                        href={`/offline-mode?from=${pack.origin.name.toLowerCase()}&dest=${pack.destination.name.toLowerCase()}`}
                        className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs transition-all shadow-sm text-center"
                        style={{ backgroundColor: "#2563FF", fontFamily: "'Poppins',sans-serif" }}
                      >
                        View Offline Survival Card
                      </Link>
                      <Link
                        href={`/map?from=${pack.origin.name.toLowerCase()}&dest=${pack.destination.name.toLowerCase()}&offlineMode=true`}
                        className="py-2.5 px-4 rounded-xl font-bold text-xs transition-all text-center flex items-center gap-1.5"
                        style={{ backgroundColor: "#EFF6FF", border: "1px solid rgba(37,99,255,0.2)", color: "#2563FF", fontFamily: "'Poppins',sans-serif" }}
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
            <div className="p-6 rounded-3xl shadow-sm text-left space-y-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)" }}>
              <div className="space-y-1">
                <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A" }}>Cache Vector Corridor</h3>
                <p style={{ fontSize: "12px", color: "#64748B", fontWeight: 400, lineHeight: 1.5 }}>
                  Prepare bounded vector map tiles &amp; safety intelligence for <strong style={{ color: "#0F172A" }}>{fromParam} ➔ {destParam}</strong>.
                </p>
              </div>

              <button
                onClick={handleDownloadNewPack}
                disabled={downloading}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                style={{ backgroundColor: "#2563FF", fontFamily: "'Poppins',sans-serif" }}
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

              <div className="p-3.5 rounded-2xl space-y-1.5" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)", fontSize: "11px", color: "#64748B" }}>
                <div className="flex justify-between font-medium">
                  <span>Zoom Coverage:</span>
                  <span style={{ color: "#0F172A", fontWeight: 700 }}>Z10 - Z13 (Bounded)</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Corridor Buffer:</span>
                  <span style={{ color: "#0F172A", fontWeight: 700 }}>±8 km along route</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Est. Tile Footprint:</span>
                  <span style={{ color: "#0F172A", fontWeight: 700 }}>~400 - 1,200 tiles</span>
                </div>
              </div>
            </div>

            {/* Storage Quota Telemetry */}
            <div className="p-6 rounded-3xl shadow-sm text-left space-y-3" style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)" }}>
              <h4 style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "8px" }}>
                <Database className="h-4 w-4" style={{ color: "#2563FF" }} />
                <span>Device Storage Allocation</span>
              </h4>

              <div className="space-y-2" style={{ fontSize: "12px" }}>
                <div className="flex justify-between font-medium" style={{ color: "#64748B" }}>
                  <span>Corridor Packs:</span>
                  <strong style={{ color: "#0F172A" }}>{storageUsage.totalPacks}</strong>
                </div>
                <div className="flex justify-between font-medium" style={{ color: "#64748B" }}>
                  <span>Stored Vector Tiles:</span>
                  <strong style={{ color: "#0F172A" }}>{storageUsage.totalTilesCount || 420}</strong>
                </div>
                <div className="flex justify-between font-medium" style={{ color: "#64748B" }}>
                  <span>IndexedDB Footprint:</span>
                  <strong style={{ color: "#0F172A" }}>~{storageUsage.estimatedSizeKb || 1100} KB</strong>
                </div>
              </div>

              <div className="pt-2" style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}>
                <span style={{ fontSize: "10px", color: "#94A3B8", fontWeight: 500, display: "block" }}>
                  Storage engine: IndexedDB (Store: <code style={{ color: "#2563FF" }}>offline_map_tiles</code>)
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-xs" style={{ backgroundColor: "#F8FAFC", color: "#64748B" }}>Loading Offline Vector Hub...</div>}>
      <OfflinePacksManagerContent />
    </Suspense>
  );
}
