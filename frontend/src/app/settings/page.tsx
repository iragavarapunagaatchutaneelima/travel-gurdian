"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { 
  Settings, Sun, Shield, Bell, Wifi, 
  MapPin, Eye, Smartphone, Database, Check, RefreshCw 
} from "lucide-react";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Settings states
  const [womenSafetyDefault, setWomenSafetyDefault] = useState(true);
  const [offlinePackSync, setOfflinePackSync] = useState(true);
  const [liveGpsTelemetry, setLiveGpsTelemetry] = useState(true);
  const [sosAutoDial, setSosAutoDial] = useState(true);
  const [clearedDataMessage, setClearedDataMessage] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleResetCache = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tg_checklist");
      localStorage.removeItem("tg_assess_history");
    }
    setClearedDataMessage(true);
    setTimeout(() => setClearedDataMessage(false), 3000);
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 flex flex-col items-center" style={{ backgroundColor: "#F8FAFC", fontFamily: "'Poppins',sans-serif" }}>
      <Header />

      <div className="w-full max-w-4xl px-4 md:px-8 py-6 space-y-6 text-left animate-slideUp">
        
        {/* Header */}
        <div className="pb-2 flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563FF", textTransform: "uppercase", letterSpacing: "0.12em", display: "block" }}>
              SYSTEM CONFIGURATION
            </span>
            <h1 style={{ fontWeight: 800, fontSize: "clamp(22px,4vw,30px)", color: "#0F172A", marginTop: "4px" }}>
              Application Settings
            </h1>
            <p style={{ fontSize: "13px", color: "#64748B", fontWeight: 400, marginTop: "2px" }}>
              Configure appearance themes, telemetry feeds, and safety preferences.
            </p>
          </div>
        </div>

        {clearedDataMessage && (
          <div className="p-4 rounded-2xl flex items-center gap-2 shadow-sm" style={{ backgroundColor: "#DCFCE7", border: "1px solid #86EFAC", color: "#16A34A", fontSize: "13px", fontWeight: 600 }}>
            <Check className="h-4 w-4" />
            <span>Local demo cache and route history reset successfully!</span>
          </div>
        )}

        <div className="space-y-6">
          
          {/* Appearance / Theme Settings */}
          <div className="rounded-3xl p-6 space-y-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 2px 8px rgba(37,99,255,0.06)" }}>
            <div className="flex items-center gap-2.5 pb-3" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
              <div className="p-2 rounded-xl" style={{ backgroundColor: "#EFF6FF", color: "#2563FF" }}>
                <Sun className="h-4.5 w-4.5 text-amber-500" />
              </div>
              <div>
                <h3 style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Theme &amp; Appearance (Light Mode Active)
                </h3>
                <p style={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>High-clarity Travel Guardian Light design system</p>
              </div>
            </div>

            {mounted && (
              <div className="grid grid-cols-1 gap-4 pt-1">
                <div
                  className="p-4 rounded-2xl border flex items-center gap-3 text-left transition-all"
                  style={{
                    backgroundColor: "#EFF6FF",
                    border: "2px solid #2563FF",
                    boxShadow: "0 2px 8px rgba(37,99,255,0.15)",
                  }}
                >
                  <div className="p-2.5 rounded-xl bg-white text-zinc-900 shadow-sm" style={{ border: "1px solid rgba(15,23,42,0.1)" }}>
                    <Sun className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: 800, color: "#0F172A" }}>Travel Guardian Light Theme (Active)</h4>
                    <p style={{ fontSize: "11px", color: "#2563FF", fontWeight: 600 }}>Curated daylight travel design (#2563FF Primary • #F8FAFC Clean Canvas)</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Safety & Protocol Preferences */}
          <div className="rounded-3xl p-6 space-y-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 2px 8px rgba(37,99,255,0.06)" }}>
            <div className="flex items-center gap-2.5 pb-3" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
              <div className="p-2 rounded-xl" style={{ backgroundColor: "#FEF2F2", color: "#EF4444" }}>
                <Shield className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Safety Defaults &amp; Route Prioritization
                </h3>
                <p style={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>Global rules applied to journey planning</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>Prioritize Women Safety Corridors</h4>
                  <p style={{ fontSize: "11px", color: "#64748B", fontWeight: 400 }}>Filter routes favoring 24/7 lit tollways and highway police booths</p>
                </div>
                <input
                  type="checkbox"
                  checked={womenSafetyDefault}
                  onChange={(e) => setWomenSafetyDefault(e.target.checked)}
                  className="rounded h-4.5 w-4.5 accent-blue-600"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>Live Telemetry Sharing in SOS</h4>
                  <p style={{ fontSize: "11px", color: "#64748B", fontWeight: 400 }}>Automatically attach GPS coordinates to emergency SMS dispatches</p>
                </div>
                <input
                  type="checkbox"
                  checked={liveGpsTelemetry}
                  onChange={(e) => setLiveGpsTelemetry(e.target.checked)}
                  className="rounded h-4.5 w-4.5 accent-blue-600"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>Auto-Cache 6-City Offline Pack</h4>
                  <p style={{ fontSize: "11px", color: "#64748B", fontWeight: 400 }}>Pre-cache coordinates for Chennai, Mumbai, Delhi, Hyderabad, Bangalore, Vizag</p>
                </div>
                <input
                  type="checkbox"
                  checked={offlinePackSync}
                  onChange={(e) => setOfflinePackSync(e.target.checked)}
                  className="rounded h-4.5 w-4.5 accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Cache & Diagnostics */}
          <div className="rounded-3xl p-6 space-y-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 2px 8px rgba(37,99,255,0.06)" }}>
            <div className="flex items-center gap-2.5 pb-3" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
              <div className="p-2 rounded-xl" style={{ backgroundColor: "#EFF6FF", color: "#2563FF" }}>
                <Database className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Storage &amp; Diagnostics
                </h3>
                <p style={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>Manage offline cache and local testing state</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-2xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>Reset Local Demo Storage</h4>
                <p style={{ fontSize: "11px", color: "#64748B", fontWeight: 400 }}>Clears cached checklists and assessment history</p>
              </div>
              <button
                onClick={handleResetCache}
                className="px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.12)", color: "#0F172A", fontSize: "12px", fontWeight: 700 }}
              >
                <RefreshCw className="h-3.5 w-3.5" style={{ color: "#2563FF" }} />
                <span>Reset Demo Cache</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
