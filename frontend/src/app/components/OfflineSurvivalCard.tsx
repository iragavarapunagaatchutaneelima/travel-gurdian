"use client";

import React, { useState } from "react";
import { OfflineCorridorPack, CacheFreshness } from "../../types/offline";
import { getPackFreshness } from "../../services/offlineStorageService";
import { generateSurvivalKitPDF } from "../../services/survivalPdfGenerator";
import { 
  ShieldCheck, 
  PhoneCall, 
  MapPin, 
  FileText, 
  Download, 
  Clock, 
  AlertTriangle, 
  Hospital, 
  ShieldAlert, 
  Fuel, 
  Coffee, 
  Check, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles
} from "lucide-react";
import Link from "next/link";

interface OfflineSurvivalCardProps {
  pack: OfflineCorridorPack;
  onRefreshPack?: () => void;
  className?: string;
}

export default function OfflineSurvivalCard({
  pack,
  onRefreshPack,
  className = ""
}: OfflineSurvivalCardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "turns" | "havens" | "emergency">("overview");
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const freshness: CacheFreshness = getPackFreshness(pack);
  const cachedTimeStr = new Date(pack.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const cachedDateStr = new Date(pack.updatedAt).toLocaleDateString([], { day: "numeric", month: "short" });

  const handleDownloadPDF = () => {
    setDownloading(true);
    const result = generateSurvivalKitPDF(pack);
    setDownloading(false);
    if (result.success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };

  return (
    <div
      className={`rounded-3xl p-5 md:p-6 text-left space-y-5 transition-all ${className}`}
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 2px 8px rgba(37,99,255,0.06)",
        fontFamily: "'Poppins',sans-serif",
      }}
    >
      {/* Header with Freshness and Provenance */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
        <div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#2563FF", display: "block" }}>
              OFFLINE SURVIVAL DOSSIER
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                textTransform: "uppercase",
                padding: "2px 8px",
                borderRadius: "8px",
                backgroundColor: freshness === "FRESH" ? "#DCFCE7" : freshness === "STALE" ? "#FEF3C7" : "#FEE2E2",
                color: freshness === "FRESH" ? "#16A34A" : freshness === "STALE" ? "#D97706" : "#DC2626",
                border: freshness === "FRESH" ? "1px solid #86EFAC" : freshness === "STALE" ? "1px solid #FDE68A" : "1px solid #FECACA",
              }}
            >
              {freshness} CACHE
            </span>
          </div>

          <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", marginTop: "4px" }}>
            {pack.origin.name} ➔ {pack.destination.name}
          </h3>
          <p style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, marginTop: "2px" }}>
            {pack.packName} • Travel Mode: {pack.travelMode}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="py-2.5 px-4 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            style={{ backgroundColor: "#2563FF", fontFamily: "'Poppins',sans-serif" }}
          >
            <Download className="h-3.5 w-3.5" />
            <span>{downloadSuccess ? "Saved PDF!" : "Export Survival PDF"}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        className="grid grid-cols-4 gap-1 p-1 rounded-2xl text-xs font-bold"
        style={{ backgroundColor: "#F1F5F9", border: "1px solid rgba(15,23,42,0.06)" }}
      >
        <button
          onClick={() => setActiveTab("overview")}
          className="py-2.5 rounded-xl transition-all"
          style={{
            backgroundColor: activeTab === "overview" ? "#2563FF" : "transparent",
            color: activeTab === "overview" ? "#FFFFFF" : "#64748B",
            fontWeight: activeTab === "overview" ? 700 : 500,
            boxShadow: activeTab === "overview" ? "0 2px 8px rgba(37,99,255,0.25)" : "none",
          }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("turns")}
          className="py-2.5 rounded-xl transition-all"
          style={{
            backgroundColor: activeTab === "turns" ? "#2563FF" : "transparent",
            color: activeTab === "turns" ? "#FFFFFF" : "#64748B",
            fontWeight: activeTab === "turns" ? 700 : 500,
            boxShadow: activeTab === "turns" ? "0 2px 8px rgba(37,99,255,0.25)" : "none",
          }}
        >
          Turns ({pack.turnInstructions.length})
        </button>
        <button
          onClick={() => setActiveTab("havens")}
          className="py-2.5 rounded-xl transition-all"
          style={{
            backgroundColor: activeTab === "havens" ? "#2563FF" : "transparent",
            color: activeTab === "havens" ? "#FFFFFF" : "#64748B",
            fontWeight: activeTab === "havens" ? 700 : 500,
            boxShadow: activeTab === "havens" ? "0 2px 8px rgba(37,99,255,0.25)" : "none",
          }}
        >
          Havens ({pack.safeHavens.length})
        </button>
        <button
          onClick={() => setActiveTab("emergency")}
          className="py-2.5 rounded-xl transition-all"
          style={{
            backgroundColor: activeTab === "emergency" ? "#EF4444" : "transparent",
            color: activeTab === "emergency" ? "#FFFFFF" : "#64748B",
            fontWeight: activeTab === "emergency" ? 700 : 500,
            boxShadow: activeTab === "emergency" ? "0 2px 8px rgba(239,68,68,0.25)" : "none",
          }}
        >
          112 Rescue
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
            <div className="p-3 rounded-2xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
              <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Distance</span>
              <p style={{ fontWeight: 800, color: "#0F172A", marginTop: "2px", fontSize: "14px" }}>{pack.route.distance}</p>
            </div>
            <div className="p-3 rounded-2xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
              <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Cached Duration</span>
              <p style={{ fontWeight: 800, color: "#0F172A", marginTop: "2px", fontSize: "14px" }}>{pack.route.time}</p>
            </div>
            <div className="p-3 rounded-2xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
              <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Safety Fit</span>
              <p style={{ fontWeight: 800, color: "#16A34A", marginTop: "2px", fontSize: "14px" }}>{pack.route.safetyScore}/100</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl space-y-1.5 leading-relaxed" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)", fontSize: "12px", color: "#64748B" }}>
            <div className="flex items-center gap-1.5 font-bold" style={{ color: "#0F172A" }}>
              <Clock className="h-3.5 w-3.5" style={{ color: "#2563FF" }} />
              <span>Cache Provenance Information:</span>
            </div>
            <p style={{ fontSize: "11px" }}>
              Stored on device: <strong style={{ color: "#0F172A" }}>{cachedDateStr} at {cachedTimeStr}</strong>.
              Live rerouting and real-time traffic are paused while disconnected.
            </p>
          </div>

          <Link
            href={`/map?from=${pack.origin.name.toLowerCase()}&dest=${pack.destination.name.toLowerCase()}&mode=${pack.travelMode}&routeId=${pack.route.id}`}
            className="w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all text-center"
            style={{ backgroundColor: "#EFF6FF", border: "1px solid rgba(37,99,255,0.2)", color: "#2563FF" }}
          >
            <MapPin className="h-4 w-4" style={{ color: "#2563FF" }} />
            <span>Open in Cached Living Map</span>
          </Link>
        </div>
      )}

      {/* TAB 2: TURNS */}
      {activeTab === "turns" && (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 animate-fadeIn">
          {pack.turnInstructions.map((turn, i) => (
            <div
              key={i}
              className="p-3 rounded-2xl flex items-start gap-3 text-xs"
              style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}
            >
              <div
                className="h-6 w-6 rounded-full font-extrabold flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#EFF6FF", color: "#2563FF", fontSize: "10px" }}
              >
                {turn.stepIndex}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontWeight: 700, color: "#0F172A", lineHeight: 1.4 }}>{turn.instruction}</p>
                <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 500, marginTop: "2px", display: "block" }}>{turn.distanceText} • est. {turn.durationText}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: SAFE HAVENS */}
      {activeTab === "havens" && (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 animate-fadeIn">
          {pack.safeHavens.map((haven) => (
            <div
              key={haven.id}
              className="p-3 rounded-2xl flex items-center justify-between text-xs"
              style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      backgroundColor: "#EFF6FF",
                      color: "#2563FF",
                    }}
                  >
                    {haven.type}
                  </span>
                  <h4 style={{ fontWeight: 700, color: "#0F172A" }}>{haven.name}</h4>
                </div>
                <p style={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>
                  {haven.distanceAheadText} {haven.notes ? `• ${haven.notes}` : ""}
                </p>
              </div>

              {haven.phone && (
                <a
                  href={`tel:${haven.phone}`}
                  className="py-1.5 px-3 rounded-xl font-bold text-[11px] shrink-0 transition-all"
                  style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.12)", color: "#0F172A" }}
                >
                  Dial {haven.phone}
                </a>
              )}
            </div>
          ))}
          <div style={{ fontSize: "11px", color: "#94A3B8", fontStyle: "italic", textAlign: "center", paddingTop: "4px" }}>
            * Cached coordinates. Current availability cannot be verified offline.
          </div>
        </div>
      )}

      {/* TAB 4: EMERGENCY */}
      {activeTab === "emergency" && (
        <div className="space-y-3 animate-fadeIn">
          <div className="p-4 rounded-2xl text-center space-y-2" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
            <ShieldAlert className="h-8 w-8 mx-auto animate-pulse" />
            <h4 style={{ fontWeight: 800, fontSize: "14px", textTransform: "uppercase" }}>National Public Emergency Protocol</h4>
            <p style={{ fontSize: "12px", color: "#475569", fontWeight: 500, lineHeight: 1.5 }}>
              If cellular voice service is available on your mobile device, you can dial national dispatch line 112 directly.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <a
              href="tel:112"
              className="py-3 px-3 rounded-2xl text-white font-bold flex items-center justify-center gap-1.5 shadow-sm text-center transition-all"
              style={{ backgroundColor: "#EF4444" }}
            >
              <PhoneCall className="h-4 w-4" />
              <span>Call 112 (Police/Med)</span>
            </a>

            <a
              href="tel:1091"
              className="py-3 px-3 rounded-2xl font-bold flex items-center justify-center gap-1.5 text-center transition-all"
              style={{ backgroundColor: "#EFF6FF", border: "1px solid rgba(37,99,255,0.2)", color: "#2563FF" }}
            >
              <PhoneCall className="h-4 w-4" style={{ color: "#2563FF" }} />
              <span>Women Helpline 1091</span>
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
