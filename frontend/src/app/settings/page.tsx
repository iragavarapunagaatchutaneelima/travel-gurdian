"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { 
  Settings, Moon, Sun, Shield, Bell, Wifi, 
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
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      <Header />

      <div className="w-full max-w-4xl px-4 md:px-8 py-6 space-y-6 text-left animate-slideUp">
        
        {/* Header */}
        <div className="border-b border-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black text-primary-accent uppercase tracking-widest block">
              SYSTEM CONFIGURATION
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mt-1">
              Application Settings
            </h1>
            <p className="text-xs text-muted font-semibold mt-0.5">
              Configure appearance themes, telemetry feeds, and safety preferences.
            </p>
          </div>
        </div>

        {clearedDataMessage && (
          <div className="p-4 rounded-2xl bg-success/10 border border-success/30 text-success text-xs font-bold flex items-center gap-2 shadow-sm">
            <Check className="h-4 w-4" />
            <span>Local demo cache and route history reset successfully!</span>
          </div>
        )}

        <div className="space-y-6">
          
          {/* Appearance / Theme Settings */}
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <div className="p-2 rounded-xl bg-primary-accent/10 text-primary-accent">
                {theme === "dark" ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5 text-amber-500" />}
              </div>
              <div>
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                  Theme & Appearance (Default: Dark Mode)
                </h3>
                <p className="text-[9px] text-muted font-bold">Switch between high-contrast Dark and Light themes</p>
              </div>
            </div>

            {mounted && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-4 rounded-2xl border flex items-center gap-3 text-left transition-all ${
                    theme === "dark" 
                      ? "border-primary-accent bg-primary-accent/10 ring-1 ring-primary-accent text-foreground shadow-sm" 
                      : "border-border bg-elevated-surface text-muted hover:border-border"
                  }`}
                >
                  <div className="p-2.5 rounded-xl bg-zinc-900 text-white border border-zinc-700">
                    <Moon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-foreground">Dark Mode (Default)</h4>
                    <p className="text-[10px] text-muted font-bold">Optimized for night travel & OLED displays</p>
                  </div>
                </button>

                <button
                  onClick={() => setTheme("light")}
                  className={`p-4 rounded-2xl border flex items-center gap-3 text-left transition-all ${
                    theme === "light" 
                      ? "border-primary-accent bg-primary-accent/10 ring-1 ring-primary-accent text-foreground shadow-sm" 
                      : "border-border bg-elevated-surface text-muted hover:border-border"
                  }`}
                >
                  <div className="p-2.5 rounded-xl bg-white text-zinc-900 border border-zinc-300 shadow-sm">
                    <Sun className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-foreground">Light Mode</h4>
                    <p className="text-[10px] text-muted font-bold">High visibility daytime readability</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Safety & Protocol Preferences */}
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <div className="p-2 rounded-xl bg-danger/10 text-danger">
                <Shield className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                  Safety Defaults & Route Prioritization
                </h3>
                <p className="text-[9px] text-muted font-bold">Global rules applied to journey planning</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-elevated-surface border border-border">
                <div>
                  <h4 className="text-xs font-black text-foreground">Prioritize Women Safety Corridors</h4>
                  <p className="text-[10px] text-muted font-bold">Filter routes favoring 24/7 lit tollways and highway police booths</p>
                </div>
                <input
                  type="checkbox"
                  checked={womenSafetyDefault}
                  onChange={(e) => setWomenSafetyDefault(e.target.checked)}
                  className="rounded h-4 w-4 text-primary-accent"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-elevated-surface border border-border">
                <div>
                  <h4 className="text-xs font-black text-foreground">Live Telemetry Sharing in SOS</h4>
                  <p className="text-[10px] text-muted font-bold">Automatically attach GPS coordinates to emergency SMS dispatches</p>
                </div>
                <input
                  type="checkbox"
                  checked={liveGpsTelemetry}
                  onChange={(e) => setLiveGpsTelemetry(e.target.checked)}
                  className="rounded h-4 w-4 text-primary-accent"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-elevated-surface border border-border">
                <div>
                  <h4 className="text-xs font-black text-foreground">Auto-Cache 6-City Offline Pack</h4>
                  <p className="text-[10px] text-muted font-bold">Pre-cache coordinates for Chennai, Mumbai, Delhi, Hyderabad, Bangalore, Vizag</p>
                </div>
                <input
                  type="checkbox"
                  checked={offlinePackSync}
                  onChange={(e) => setOfflinePackSync(e.target.checked)}
                  className="rounded h-4 w-4 text-primary-accent"
                />
              </div>
            </div>
          </div>

          {/* Cache & Diagnostics */}
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <div className="p-2 rounded-xl bg-muted/10 text-muted">
                <Database className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                  Storage & Diagnostics
                </h3>
                <p className="text-[9px] text-muted font-bold">Manage offline cache and local testing state</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-2xl bg-elevated-surface border border-border">
              <div>
                <h4 className="text-xs font-black text-foreground">Reset Local Demo Storage</h4>
                <p className="text-[10px] text-muted font-bold">Clears cached checklists and assessment history</p>
              </div>
              <button
                onClick={handleResetCache}
                className="px-4 py-2 rounded-xl bg-surface border border-border hover:bg-border text-foreground text-xs font-black transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5 text-muted" />
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
