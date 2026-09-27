"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { useOfflineStatus } from "../../hooks/useOfflineStatus";
import { saveOfflinePack, deleteOfflinePack } from "../../services/offlineStorageService";
import { downloadCorridorMapPack } from "../../services/offlineTileService";
import { OfflineCorridorPack, CacheFreshness } from "../../types/offline";
import { CITIES, City } from "../../data/routeData";
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

  // No default journey: this page used to fall back to "chennai -> bangalore"
  // with hardcoded coordinates and a synthetic route. A pack is only built
  // from a real route handed off by Plan Journey / Live Map.
  const fromParam = searchParams.get("from") || "";
  const destParam = searchParams.get("dest") || "";
  const modeParam = (searchParams.get("mode") as any) || "Car";
  const fromLat = parseFloat(searchParams.get("fromLat") || "");
  const fromLng = parseFloat(searchParams.get("fromLng") || "");
  const destLat = parseFloat(searchParams.get("destLat") || "");
  const destLng = parseFloat(searchParams.get("destLng") || "");
  const fromName = searchParams.get("fromName") || fromParam;
  const destName = searchParams.get("destName") || destParam;

  const [sourceRoute, setSourceRoute] = useState<any | null>(null);
  useEffect(() => {
    try {
      const parsed = JSON.parse(sessionStorage.getItem("tg_offline_source_route") || "null");
      if (parsed?.waypoints?.length > 1 && parsed.provider === "google") setSourceRoute(parsed);
    } catch {}
  }, []);

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
  const abortRef = useRef<AbortController | null>(null);

  const handleDownloadNewPack = async () => {
    // Only a real, already-computed Google route (waypoints, steps, Places
    // POIs) handed off from Plan Journey / Live Map. No synthetic fallback.
    const activeRoute = sourceRoute;
    if (!activeRoute) {
      setErrorMessage("Plan a journey first. A pack is built from the real route you planned, never a placeholder.");
      return;
    }
    const isRealRoute = true;
    setDownloading(true);
    setDownloadProgress({
      phase: "PREPARING",
      percent: 5,
      message: "Preparing vector corridor boundaries...",
      current: 0,
      total: 100,
    });

    // Endpoints: known city record, else the URL's coordinates, else the
    // route's own first/last waypoint ([lng, lat]). Never invented coordinates.
    const first = activeRoute.waypoints[0];
    const last = activeRoute.waypoints[activeRoute.waypoints.length - 1];
    const endpoint = (key: string, name: string, lat: number, lng: number, wp: number[], fallbackId: string): City =>
      CITIES[key.toLowerCase()] || {
        id: key.toLowerCase().replace(/[^a-z0-9]/g, "_") || fallbackId,
        name: name || (fallbackId === "origin" ? "Origin" : "Destination"),
        state: "",
        latitude: !isNaN(lat) ? lat : wp[1],
        longitude: !isNaN(lng) ? lng : wp[0],
        region: "",
        highways: [],
      };
    const origin = endpoint(fromParam, fromName, fromLat, fromLng, first, "origin");
    const dest = endpoint(destParam, destName, destLat, destLng, last, "destination");
    const packId = `pack_${origin.id}_${dest.id}_${Date.now()}`;
    const controller = new AbortController();
    abortRef.current = controller;

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
        },
        controller.signal
      );

      // Turn instructions: from the real Google-computed steps when available.
      // Never a fabricated generic 3-step placeholder.
      const realSteps = Array.isArray(activeRoute.steps) ? activeRoute.steps : [];
      const turnInstructions = isRealRoute && realSteps.length > 0
        ? realSteps.map((s: any, idx: number) => ({
            stepIndex: idx + 1,
            instruction: (s.instruction || "Continue along route").replace(/<[^>]+>/g, ""),
            distanceText: s.distance || "",
            durationText: s.duration || "",
            maneuverType: (s.maneuver || "straight").toLowerCase().replace(/_/g, "-"),
          }))
        : [];

      // Safe havens: from the real route's Google Places-sourced POIs. Never
      // an invented business name or phone number.
      const poiTypeMap: Record<string, string> = {
        hospital: "Hospital", emergency: "Hospital", police: "Police Station",
        petrol: "Fuel Stop", pharmacy: "Pharmacy", food: "Food Stop",
        rest: "Rest Stop", hotel: "Hotel",
      };
      const realPois = Array.isArray(activeRoute.pois) ? activeRoute.pois : [];
      const safeHavens = isRealRoute
        ? realPois.map((p: any) => ({
            id: p.id,
            name: p.name,
            type: (poiTypeMap[p.type] || "Rest Stop") as any,
            distanceAheadText: p.distanceAhead || "Unknown distance",
          }))
        : [];

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
        turnInstructions,
        safeHavens,
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
        provenance: isRealRoute ? "CACHED" : "DEV_SIMULATED",
        mapPack: mapPackMetadata,
      };

      if (mapPackMetadata.status === "FAILED") {
        setDownloading(false);
        setDownloadProgress(null);
        setErrorMessage(`Download failed: ${mapPackMetadata.lastError || "the offline map source is unreachable"}. Check your connection and try again.`);
        setTimeout(() => setErrorMessage(null), 7000);
        return;
      }

      const res = await saveOfflinePack(newPack);
      setDownloading(false);
      setDownloadProgress(null);

      if (res.success) {
        const statusNote = mapPackMetadata.status === "PARTIAL"
          ? ` (partial: ${mapPackMetadata.lastError || "some tiles were unavailable"})`
          : "";
        setSuccessMessage(`Downloaded ${mapPackMetadata.tileCount} real map tiles (${(mapPackMetadata.totalSizeBytes / (1024 * 1024)).toFixed(1)} MB) for ${origin.name} ➔ ${dest.name}${statusNote}.`);
        await refreshStorage();
        setTimeout(() => setSuccessMessage(null), 7000);
      } else {
        setErrorMessage(`Storage warning: ${res.error || "Unable to save pack"}`);
        setTimeout(() => setErrorMessage(null), 6000);
      }
    } catch (err: any) {
      setDownloading(false);
      setDownloadProgress(null);
      if (err?.name === "AbortError") {
        setSuccessMessage("Download cancelled. Nothing was saved.");
        setTimeout(() => setSuccessMessage(null), 5000);
        return;
      }
      console.error("Vector pack download error:", err);
      setErrorMessage(`Download failure: ${err.message || "Could not complete vector download"}. You can retry.`);
    } finally {
      abortRef.current = null;
    }
  };

  const handleDelete = async (packId: string, packName: string) => {
    if (confirm(`Remove offline pack and all stored vector tiles for "${packName}"?`)) {
      await deleteOfflinePack(packId);
      await refreshStorage();
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 flex flex-col items-center" style={{ backgroundColor: "var(--tg-background)", fontFamily: "'Poppins',sans-serif" }}>
      
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-6xl px-4 md:px-8 py-6 space-y-6 text-left animate-slideUp">
        
        {/* Title & Connectivity Banner */}
        <div className="pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderBottom: "1px solid var(--tg-border)" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--tg-primary)", textTransform: "uppercase", letterSpacing: "0.12em", display: "block" }}>
              OFFLINE GUARDIAN &amp; VECTOR CORRIDOR SUITE
            </span>
            <h1 style={{ fontWeight: 800, fontSize: "clamp(22px,4vw,30px)", color: "var(--foreground)", marginTop: "4px" }}>
              Offline Vector Corridors &amp; Map Storage
            </h1>
            <p style={{ fontSize: "13px", color: "var(--tg-muted)", fontWeight: 400, marginTop: "2px" }}>
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
                backgroundColor: isOnline ? "var(--tg-success-light)" : "var(--tg-warning-light)",
                border: isOnline ? "1px solid var(--tg-success)" : "1px solid var(--tg-warning)",
                color: isOnline ? "var(--tg-success)" : "var(--tg-warning)",
              }}
            >
              {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              <span>STATUS: {networkStatus}</span>
            </span>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn" style={{ backgroundColor: "var(--tg-danger-light)", border: "1px solid var(--tg-danger)", color: "var(--tg-danger)", fontSize: "13px", fontWeight: 600 }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="font-bold hover:underline p-1">✕</button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn" style={{ backgroundColor: "var(--tg-success-light)", border: "1px solid var(--tg-success)", color: "var(--tg-success)", fontSize: "13px", fontWeight: 600 }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="font-bold hover:underline p-1">✕</button>
          </div>
        )}

        {/* Download Progress Card (Real Phases) */}
        {downloading && downloadProgress && (
          <div className="p-5 rounded-3xl shadow-md space-y-3 animate-fadeIn" style={{ backgroundColor: "var(--tg-surface)", border: "2px solid var(--tg-primary)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" style={{ color: "var(--tg-primary)" }} />
                <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--tg-primary)" }}>
                  {downloadProgress.phase}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>{downloadProgress.percent}%</span>
                {downloadProgress.phase !== "WRITING" && (
                  <button
                    onClick={() => abortRef.current?.abort()}
                    className="px-3 py-1 rounded-lg text-xs font-bold"
                    style={{ border: "1px solid var(--tg-danger)", color: "var(--tg-danger)", backgroundColor: "var(--tg-danger-light)" }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "var(--tg-muted)", fontWeight: 500 }}>{downloadProgress.message}</p>

            <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ backgroundColor: "var(--tg-surface-soft)" }}>
              <div
                className="h-2.5 transition-all duration-300 rounded-full"
                style={{ width: `${downloadProgress.percent}%`, backgroundColor: "var(--tg-primary)" }}
              ></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Offline Packs List */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 style={{ fontSize: "14px", fontWeight: 800, color: "var(--foreground)" }}>Downloaded Vector Corridors</h3>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--tg-muted)" }}>
                {allPacks.length} Pack(s) in Storage
              </span>
            </div>

            <div className="space-y-3">
              {allPacks.map((pack) => {
                const isActive = activePack?.packId === pack.packId;
                const cachedDate = new Date(pack.updatedAt).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
                // Real values or an explicit "none" -- never a made-up count/status.
                const tileCount = pack.mapPack?.tileCount ?? 0;
                const mapStatus = pack.mapPack?.status ?? "NO MAP";
                const zoom = pack.mapPack?.zoomRange;
                const sizeMb = pack.mapPack ? (pack.mapPack.totalSizeBytes / (1024 * 1024)).toFixed(1) : null;

                return (
                  <div
                    key={pack.packId}
                    className="p-5 rounded-3xl transition-all space-y-3"
                    style={{
                      backgroundColor: "var(--tg-surface)",
                      border: isActive ? "2px solid var(--tg-primary)" : "1px solid var(--tg-border)",
                      boxShadow: isActive ? "0 4px 12px var(--tg-surface-soft)" : "0 2px 8px var(--tg-surface-soft)",
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 style={{ fontSize: "15px", fontWeight: 800, color: "var(--foreground)" }}>{pack.packName}</h4>
                          {isActive && (
                            <span style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", padding: "2px 8px", borderRadius: "8px", backgroundColor: "var(--tg-primary)", color: "#FFFFFF" }}>
                              ACTIVE CORRIDOR
                            </span>
                          )}
                          <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", padding: "2px 8px", borderRadius: "8px", backgroundColor: "var(--tg-surface-soft)", color: "var(--tg-primary)", border: "1px solid var(--tg-surface-soft)" }}>
                            VECTOR MAP: {mapStatus}
                          </span>
                        </div>
                        <p style={{ fontSize: "12px", color: "var(--tg-muted)", fontWeight: 500, marginTop: "2px" }}>
                          {pack.route.distance} • est. {pack.route.time} • Safety Fit: {pack.route.safetyScore}/100
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => generateSurvivalKitPDF(pack)}
                          className="p-2.5 rounded-xl transition-all"
                          style={{ backgroundColor: "var(--elevated-surface)", border: "1px solid var(--tg-border)", color: "var(--tg-muted)" }}
                          title="Download Survival PDF"
                        >
                          <FileText className="h-4 w-4" style={{ color: "var(--tg-primary)" }} />
                        </button>
                        <button
                          onClick={() => handleDelete(pack.packId, pack.packName)}
                          className="p-2.5 rounded-xl transition-all"
                          style={{ backgroundColor: "var(--tg-danger-light)", border: "1px solid var(--tg-danger)", color: "var(--tg-danger)" }}
                          title="Delete Pack & Tiles"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2" style={{ borderTop: "1px solid var(--tg-border)", fontSize: "11px", color: "var(--tg-muted)", fontWeight: 500 }}>
                      <div>Turns: <strong style={{ color: "var(--foreground)" }}>{pack.turnInstructions.length}</strong></div>
                      <div>Safe Havens: <strong style={{ color: "var(--foreground)" }}>{pack.safeHavens.length}</strong></div>
                      <div>Vector Tiles: <strong style={{ color: "var(--foreground)" }}>{tileCount}{zoom ? ` (Z${zoom[0]}-${zoom[1]})` : ""}{sizeMb ? `, ${sizeMb} MB` : ""}</strong></div>
                      <div>Updated: <strong style={{ color: "var(--foreground)" }}>{cachedDate}</strong></div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {!isActive && (
                        <button
                          onClick={() => switchActivePack(pack.packId)}
                          className="flex-1 py-2.5 rounded-xl transition-colors font-bold text-xs"
                          style={{ backgroundColor: "var(--elevated-surface)", border: "1px solid var(--tg-border)", color: "var(--foreground)", fontFamily: "'Poppins',sans-serif" }}
                        >
                          Set as Active Corridor
                        </button>
                      )}
                      <Link
                        href={`/offline-mode?from=${pack.origin.name.toLowerCase()}&dest=${pack.destination.name.toLowerCase()}`}
                        className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs transition-all shadow-sm text-center"
                        style={{ backgroundColor: "var(--tg-primary)", fontFamily: "'Poppins',sans-serif" }}
                      >
                        View Offline Survival Card
                      </Link>
                      <Link
                        href={`/map?from=${pack.origin.name.toLowerCase()}&dest=${pack.destination.name.toLowerCase()}&offlineMode=true`}
                        className="py-2.5 px-4 rounded-xl font-bold text-xs transition-all text-center flex items-center gap-1.5"
                        style={{ backgroundColor: "var(--tg-surface-soft)", border: "1px solid var(--tg-surface-soft)", color: "var(--tg-primary)", fontFamily: "'Poppins',sans-serif" }}
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
            <div className="p-6 rounded-3xl shadow-sm text-left space-y-4" style={{ backgroundColor: "var(--tg-surface)", border: "1px solid var(--tg-border)" }}>
              <div className="space-y-1">
                <h3 style={{ fontSize: "14px", fontWeight: 800, color: "var(--foreground)" }}>Cache Vector Corridor</h3>
                <p style={{ fontSize: "12px", color: "var(--tg-muted)", fontWeight: 400, lineHeight: 1.5 }}>
                  {sourceRoute ? (
                    <>Prepare bounded vector map tiles &amp; safety intelligence for <strong style={{ color: "var(--foreground)" }}>{fromName || "your origin"} ➔ {destName || "your destination"}</strong> ({sourceRoute.name}, {sourceRoute.distance}).</>
                  ) : (
                    <>No planned journey to download. Plan one first, then use <strong style={{ color: "var(--foreground)" }}>Download Offline Pack</strong> from its route card.</>
                  )}
                </p>
              </div>

              <button
                onClick={handleDownloadNewPack}
                disabled={downloading || !sourceRoute}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                style={{ backgroundColor: "var(--tg-primary)", fontFamily: "'Poppins',sans-serif" }}
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

              <div className="p-3.5 rounded-2xl space-y-1.5" style={{ backgroundColor: "var(--elevated-surface)", border: "1px solid var(--tg-border)", fontSize: "11px", color: "var(--tg-muted)" }}>
                <div className="flex justify-between font-medium">
                  <span>Zoom Coverage:</span>
                  <span style={{ color: "var(--foreground)", fontWeight: 700 }}>Z10 - Z13 (Bounded)</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Corridor Buffer:</span>
                  <span style={{ color: "var(--foreground)", fontWeight: 700 }}>±8 km along route</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Tile Budget:</span>
                  <span style={{ color: "var(--foreground)", fontWeight: 700 }}>Up to 1,200 tiles (route-following)</span>
                </div>
              </div>
            </div>

            {/* Storage Quota Telemetry */}
            <div className="p-6 rounded-3xl shadow-sm text-left space-y-3" style={{ backgroundColor: "var(--tg-surface)", border: "1px solid var(--tg-border)" }}>
              <h4 style={{ fontSize: "12px", fontWeight: 800, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "8px" }}>
                <Database className="h-4 w-4" style={{ color: "var(--tg-primary)" }} />
                <span>Device Storage Allocation</span>
              </h4>

              <div className="space-y-2" style={{ fontSize: "12px" }}>
                <div className="flex justify-between font-medium" style={{ color: "var(--tg-muted)" }}>
                  <span>Corridor Packs:</span>
                  <strong style={{ color: "var(--foreground)" }}>{storageUsage.totalPacks}</strong>
                </div>
                <div className="flex justify-between font-medium" style={{ color: "var(--tg-muted)" }}>
                  <span>Stored Vector Tiles:</span>
                  <strong style={{ color: "var(--foreground)" }}>{storageUsage.totalTilesCount ?? 0}</strong>
                </div>
                <div className="flex justify-between font-medium" style={{ color: "var(--tg-muted)" }}>
                  <span>IndexedDB Footprint:</span>
                  <strong style={{ color: "var(--foreground)" }}>{(storageUsage.estimatedSizeKb / 1024).toFixed(1)} MB</strong>
                </div>
              </div>

              <div className="pt-2" style={{ borderTop: "1px solid var(--tg-border)" }}>
                <span style={{ fontSize: "10px", color: "var(--tg-muted)", fontWeight: 500, display: "block" }}>
                  Storage engine: IndexedDB (Store: <code style={{ color: "var(--tg-primary)" }}>offline_map_tiles</code>)
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-xs" style={{ backgroundColor: "var(--elevated-surface)", color: "var(--tg-muted)" }}>Loading Offline Vector Hub...</div>}>
      <OfflinePacksManagerContent />
    </Suspense>
  );
}
