"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import OfflineSurvivalCard from "../components/OfflineSurvivalCard";
import OfflineMapView from "../components/OfflineMapView";
import OfflineAIChat from "../components/OfflineAIChat";
import { useOfflineStatus } from "../../hooks/useOfflineStatus";
import { useSharedLocation } from "../../hooks/useSharedLocation";
import {
  CloudOff,
  Wifi,
  WifiOff,
  PhoneCall,
  Compass,
  ChevronRight,
  Loader,
  MapPin,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function OfflineModeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    networkStatus,
    isOnline,
    isOffline,
    activePack,
    allPacks,
    gpsAvailable,
    gpsNetworkState,
    refreshStorage,
  } = useOfflineStatus();

  const { latitude, longitude, accuracy, hasLocation } = useSharedLocation();
  const currentPosition =
    hasLocation && latitude && longitude
      ? { latitude, longitude, accuracy: accuracy || undefined }
      : null;

  return (
    <div
      className="min-h-screen pb-20 md:pb-8 flex flex-col items-center"
      style={{
        backgroundColor: "var(--tg-background)",
        color: "var(--tg-navy)",
        fontFamily: "'Poppins',sans-serif",
      }}
    >
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6 text-left animate-slideUp">

        {/* Top Status Header */}
        <div
          className="pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ borderBottom: "1px solid var(--tg-border)" }}
        >
          <div>
            <span
              className="tg-label block"
              style={{ color: "var(--tg-danger)" }}
            >
              OFFLINE GUARDIAN ACTIVE
            </span>
            <h1
              className="font-heading"
              style={{
                fontSize: "clamp(22px,4vw,30px)",
                color: "var(--foreground)",
                marginTop: "4px",
              }}
            >
              Offline Survival Hub &amp; Living Dossier
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: "var(--tg-muted)",
                fontWeight: 400,
                marginTop: "2px",
              }}
            >
              Operating under local device cache. Turn guidance, safe havens,
              and emergency numbers remain fully functional.
            </p>
          </div>

          {/* GPS & Network State badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="tg-badge rounded-full flex items-center gap-1.5"
              style={{
                backgroundColor: isOffline
                  ? "var(--tg-danger-light)"
                  : "var(--tg-success-light)",
                border: isOffline
                  ? "1px solid var(--tg-danger)"
                  : "1px solid var(--tg-success)",
                color: isOffline ? "var(--tg-danger)" : "var(--tg-success)",
              }}
            >
              {isOffline ? (
                <WifiOff className="h-3.5 w-3.5" />
              ) : (
                <Wifi className="h-3.5 w-3.5" />
              )}
              <span>NETWORK: {networkStatus}</span>
            </span>

            <span
              className="tg-badge rounded-full flex items-center gap-1.5"
              style={{
                backgroundColor: "var(--tg-surface-soft)",
                border: "1px solid rgba(37,99,255,0.2)",
                color: "var(--tg-primary)",
              }}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>GPS: {gpsAvailable ? "AVAILABLE" : "UNAVAILABLE"}</span>
            </span>
          </div>
        </div>

        {/* Main Grid: Left (map+survival) / Right (AI+emergency+packs) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT COLUMN — Map + Survival Card (7/12 on desktop) */}
          <div className="lg:col-span-7 space-y-5">
            {activePack ? (
              <>
                {activePack.mapPack && activePack.mapPack.tileCount > 0 && (
                  <div
                    id="offline-map"
                    className="rounded-3xl overflow-hidden shadow-sm scroll-mt-24"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    {/* Map header bar */}
                    <div
                      className="px-4 py-2.5 flex items-center justify-between"
                      style={{
                        backgroundColor: "var(--elevated-surface)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <span
                        className="tg-label"
                        style={{ color: "var(--muted)" }}
                      >
                        Offline Vector Map — {activePack.mapPack.tileCount} real
                        tiles cached
                      </span>
                      <span
                        className="text-[10px] font-bold"
                        style={{ color: "var(--tg-success)" }}
                      >
                        Independent of Google Maps
                      </span>
                    </div>

                    {/* MapLibre map — height increased from h-80 (320px) to 480px */}
                    <OfflineMapView
                      pack={activePack}
                      className="w-full"
                      style={{ height: "480px" }}
                    />

                    {/* Map footer info */}
                    <div
                      className="px-4 py-2.5 text-[11px] font-semibold"
                      style={{
                        backgroundColor: "var(--elevated-surface)",
                        borderTop: "1px solid var(--border)",
                        color: "var(--muted)",
                      }}
                    >
                      Map detail covers zoom {activePack.mapPack.zoomRange[0]}–
                      {activePack.mapPack.zoomRange[1]} along the downloaded
                      corridor only. Areas off-route are intentionally blank.
                      <span
                        className="block mt-1"
                        style={{ color: "var(--tg-warning)" }}
                      >
                        Offline rerouting is unavailable. Follow the cached turn
                        list below; reconnect to plan a new route.
                      </span>
                    </div>
                  </div>
                )}
                <OfflineSurvivalCard
                  pack={activePack}
                  onRefreshPack={refreshStorage}
                />
              </>
            ) : (
              <div
                className="p-8 rounded-3xl text-center space-y-4 shadow-sm"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <CloudOff
                  className="h-12 w-12 mx-auto"
                  style={{ color: "var(--muted)" }}
                />
                <h3
                  className="font-heading"
                  style={{ fontSize: "18px", color: "var(--foreground)" }}
                >
                  No Active Offline Corridor Pack
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--tg-muted)",
                    maxWidth: "340px",
                    margin: "0 auto",
                    lineHeight: 1.6,
                  }}
                >
                  Download an offline pack in advance to view cached routes and
                  medical havens during disconnected travel.
                </p>
                <Link
                  href="/offline"
                  className="btn-primary inline-flex"
                >
                  <MapPin className="h-4 w-4" />
                  Download Journey Pack
                </Link>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — AI Chat + Emergency + Packs (5/12 on desktop) */}
          <div className="lg:col-span-5 space-y-5">

            {/* Offline AI Guardian — expanded */}
            <OfflineAIChat pack={activePack} currentPosition={currentPosition} />

            {/* Direct 112 Emergency Call */}
            <div
              className="p-5 rounded-3xl shadow-sm text-left space-y-3"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--tg-danger)",
              }}
            >
              <span
                className="tg-label block"
                style={{ color: "var(--tg-danger)" }}
              >
                Emergency Calling (Cellular Voice)
              </span>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--tg-muted)",
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                Emergency calls (112) can be placed without mobile data if voice
                signal is reachable.
              </p>
              <a
                href="tel:112"
                aria-label="Call National Emergency Line 112"
                className="btn-emergency w-full"
                style={{ fontSize: "13px" }}
              >
                <PhoneCall className="h-4 w-4" />
                <span>Call 112 Public Emergency</span>
              </a>
            </div>

            {/* Offline Corridor Pack Switcher */}
            <div
              className="p-5 rounded-3xl space-y-3 text-xs"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="tg-label"
                  style={{ color: "var(--muted)" }}
                >
                  Corridor Packs
                </span>
                <Link
                  href="/offline"
                  aria-label="Manage All Offline Corridor Packs"
                  style={{ color: "var(--tg-primary)", fontSize: "11px" }}
                  className="hover:underline font-bold"
                >
                  Manage All
                </Link>
              </div>
              <p style={{ fontSize: "12px", color: "var(--tg-muted)", fontWeight: 500 }}>
                You have{" "}
                <strong style={{ color: "var(--foreground)" }}>
                  {allPacks.length} pack(s)
                </strong>{" "}
                stored in device memory.
              </p>
              <Link
                href="/offline"
                aria-label="Browse all cached packs"
                className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors text-center"
                style={{
                  backgroundColor: "var(--elevated-surface)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                <span>Browse All Cached Packs</span>
                <ChevronRight className="h-3.5 w-3.5" style={{ color: "var(--tg-primary)" }} />
              </Link>
            </div>

          </div>

        </div>

      </div>

      <Footer />

      <div className="md:hidden">
        <BottomNav />
      </div>

    </div>
  );
}

export default function OfflineMode() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-3 text-xs font-bold"
          style={{
            backgroundColor: "var(--tg-background)",
            color: "var(--tg-muted)",
          }}
        >
          <Loader
            className="h-6 w-6 animate-spin"
            style={{ color: "var(--tg-primary)" }}
          />
          <span>Loading Offline Survival Hub...</span>
        </div>
      }
    >
      <OfflineModeContent />
    </Suspense>
  );
}
