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
    <div className={`rounded-3xl border border-border bg-surface shadow-xl p-5 md:p-6 text-left space-y-5 transition-colors ${className}`}>
      
      {/* Header with Freshness and Provenance */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary-accent block">
              OFFLINE SURVIVAL DOSSIER
            </span>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
              freshness === "FRESH" 
                ? "bg-success/15 border-success/30 text-success" 
                : freshness === "STALE" 
                ? "bg-warning/15 border-warning/30 text-warning" 
                : "bg-danger/15 border-danger/30 text-danger"
            }`}>
              {freshness} CACHE
            </span>
          </div>

          <h3 className="text-xl font-black text-foreground mt-1">
            {pack.origin.name} ➔ {pack.destination.name}
          </h3>
          <p className="text-xs text-muted font-semibold mt-0.5">
            {pack.packName} • Travel Mode: {pack.travelMode}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="py-2.5 px-3.5 rounded-xl bg-primary-accent hover:bg-primary-accent-hover text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{downloadSuccess ? "Saved PDF!" : "Export Survival PDF"}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-elevated-surface rounded-2xl border border-border text-xs font-bold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`py-2 rounded-xl transition-all ${
            activeTab === "overview" 
              ? "bg-surface text-primary-accent shadow-sm font-black" 
              : "text-muted hover:text-foreground"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("turns")}
          className={`py-2 rounded-xl transition-all ${
            activeTab === "turns" 
              ? "bg-surface text-primary-accent shadow-sm font-black" 
              : "text-muted hover:text-foreground"
          }`}
        >
          Turns ({pack.turnInstructions.length})
        </button>
        <button
          onClick={() => setActiveTab("havens")}
          className={`py-2 rounded-xl transition-all ${
            activeTab === "havens" 
              ? "bg-surface text-primary-accent shadow-sm font-black" 
              : "text-muted hover:text-foreground"
          }`}
        >
          Havens ({pack.safeHavens.length})
        </button>
        <button
          onClick={() => setActiveTab("emergency")}
          className={`py-2 rounded-xl transition-all ${
            activeTab === "emergency" 
              ? "bg-surface text-danger shadow-sm font-black" 
              : "text-muted hover:text-foreground"
          }`}
        >
          112 Rescue
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
            <div className="p-3 rounded-2xl bg-elevated-surface border border-border">
              <span className="text-[10px] text-muted font-bold block uppercase">Distance</span>
              <p className="font-black text-foreground mt-0.5 text-sm">{pack.route.distance}</p>
            </div>
            <div className="p-3 rounded-2xl bg-elevated-surface border border-border">
              <span className="text-[10px] text-muted font-bold block uppercase">Cached Duration</span>
              <p className="font-black text-foreground mt-0.5 text-sm">{pack.route.time}</p>
            </div>
            <div className="p-3 rounded-2xl bg-elevated-surface border border-border">
              <span className="text-[10px] text-muted font-bold block uppercase">Safety Fit</span>
              <p className="font-black text-success mt-0.5 text-sm">{pack.route.safetyScore}/100</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-elevated-surface border border-border space-y-1.5 text-xs text-muted leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Clock className="h-3.5 w-3.5 text-primary-accent" />
              <span>Cache Provenance Information:</span>
            </div>
            <p className="text-[11px]">
              Stored on device: <strong className="text-foreground">{cachedDateStr} at {cachedTimeStr}</strong>.
              Live rerouting and real-time traffic are paused while disconnected.
            </p>
          </div>

          <Link
            href={`/map?from=${pack.origin.name.toLowerCase()}&dest=${pack.destination.name.toLowerCase()}&mode=${pack.travelMode}&routeId=${pack.route.id}`}
            className="w-full py-3.5 rounded-2xl bg-elevated-surface hover:bg-border text-foreground font-black text-xs flex items-center justify-center gap-2 border border-border transition-colors text-center"
          >
            <MapPin className="h-4 w-4 text-primary-accent" />
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
              className="p-3 rounded-2xl bg-elevated-surface border border-border flex items-start gap-3 text-xs"
            >
              <div className="h-6 w-6 rounded-full bg-primary-accent/15 text-primary-accent font-black flex items-center justify-center shrink-0 text-[10px]">
                {turn.stepIndex}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground leading-tight">{turn.instruction}</p>
                <span className="text-[10px] text-muted font-semibold mt-0.5 block">{turn.distanceText} • est. {turn.durationText}</span>
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
              className="p-3 rounded-2xl bg-elevated-surface border border-border flex items-center justify-between text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-surface border border-border text-primary-accent">
                    {haven.type}
                  </span>
                  <h4 className="font-black text-foreground">{haven.name}</h4>
                </div>
                <p className="text-[10px] text-muted font-semibold">
                  {haven.distanceAheadText} {haven.notes ? `• ${haven.notes}` : ""}
                </p>
              </div>

              {haven.phone && (
                <a
                  href={`tel:${haven.phone}`}
                  className="py-1.5 px-3 rounded-xl bg-surface hover:bg-border text-foreground font-black text-[11px] border border-border shrink-0"
                >
                  Dial {haven.phone}
                </a>
              )}
            </div>
          ))}
          <div className="text-[10px] text-muted italic text-center pt-1">
            * Cached coordinates. Current availability cannot be verified offline.
          </div>
        </div>
      )}

      {/* TAB 4: EMERGENCY */}
      {activeTab === "emergency" && (
        <div className="space-y-3 animate-fadeIn">
          <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-center space-y-2">
            <ShieldAlert className="h-8 w-8 mx-auto animate-pulse" />
            <h4 className="font-black text-sm uppercase">National Public Emergency Protocol</h4>
            <p className="text-xs text-muted font-semibold leading-relaxed">
              If cellular voice service is available on your mobile device, you can dial national dispatch line 112 directly.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <a
              href="tel:112"
              className="py-3 px-3 rounded-2xl bg-danger hover:opacity-90 text-white font-black flex items-center justify-center gap-1.5 shadow-md text-center"
            >
              <PhoneCall className="h-4 w-4" />
              <span>Call 112 (Police/Med)</span>
            </a>

            <a
              href="tel:1091"
              className="py-3 px-3 rounded-2xl bg-elevated-surface hover:bg-border text-foreground font-black flex items-center justify-center gap-1.5 border border-border text-center"
            >
              <PhoneCall className="h-4 w-4 text-primary-accent" />
              <span>Women Helpline 1091</span>
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
