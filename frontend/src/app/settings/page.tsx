"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import { 
  Settings, Sun, Moon, Laptop, Shield, Bell, Wifi, 
  MapPin, Eye, Smartphone, Database, Check, RefreshCw, Users, PhoneCall, ArrowRight
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { getTrustedContacts } from "../../services/trustedContactService";
import { TrustedContact } from "../../types/safetyCheckIn";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);

  // Settings states
  const [womenSafetyDefault, setWomenSafetyDefault] = useState(true);
  const [offlinePackSync, setOfflinePackSync] = useState(true);
  const [liveGpsTelemetry, setLiveGpsTelemetry] = useState(true);
  const [sosAutoDial, setSosAutoDial] = useState(true);
  const [clearedDataMessage, setClearedDataMessage] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTrustedContacts(getTrustedContacts());
  }, []);

  const handleResetCache = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tg_checklist");
      localStorage.removeItem("tg_assess_history");
    }
    setClearedDataMessage(true);
    setTimeout(() => setClearedDataMessage(false), 3000);
  };

  const themesList = [
    {
      id: "light",
      name: "Light Theme",
      desc: "High-contrast daylight navigation (#2563FF primary)",
      icon: Sun,
      iconColor: "text-amber-500"
    },
    {
      id: "dark",
      name: "Dark Theme",
      desc: "Deep night corridor protection (#090D16 canvas)",
      icon: Moon,
      iconColor: "text-blue-400"
    },
    {
      id: "system",
      name: "System Default",
      desc: "Automatically adapts to your device preferences",
      icon: Laptop,
      iconColor: "text-zinc-500 dark:text-zinc-400"
    }
  ];

  return (
    <div 
      className="min-h-screen flex flex-col bg-background text-foreground"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="pb-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-(--primary) uppercase tracking-widest block">
              SYSTEM CONFIGURATION
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mt-1">
              Application Settings
            </h1>
            <p className="text-xs md:text-sm text-(--muted-foreground) mt-1">
              Configure appearance themes, telemetry feeds, and safety preferences.
            </p>
          </div>
        </div>

        {clearedDataMessage && (
          <div className="p-4 rounded-2xl flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-fadeIn">
            <Check className="h-4 w-4" />
            <span>Local demo cache and route history reset successfully!</span>
          </div>
        )}

        <div className="space-y-6">
          
          {/* Appearance / Theme Settings */}
          <div className="rounded-3xl p-6 space-y-4 bg-surface border border-border shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border">
              <div className="p-2 rounded-xl bg-(--primary)/10 text-(--primary)">
                <Sun className="h-4.5 w-4.5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Theme &amp; Visual Appearance
                </h3>
                <p className="text-xs text-(--muted-foreground)">Select your preferred viewing mode</p>
              </div>
            </div>

            {mounted && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {themesList.map((t) => {
                  const Icon = t.icon;
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-3 ${
                        isSelected 
                          ? "bg-(--primary)/10 border-(--primary) shadow-md shadow-(--primary)/10" 
                          : "bg-elevated-surface border-border hover:border-(--primary)/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-xl bg-surface border border-border shadow-sm ${t.iconColor}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-(--primary)">
                            <Check className="h-3.5 w-3.5" />
                            <span>Active</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-foreground">{t.name}</h4>
                        <p className="text-[11px] text-(--muted-foreground) leading-snug mt-0.5">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trusted Contacts Quick Summary */}
          <div className="rounded-3xl p-6 space-y-4 bg-surface border border-border shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Trusted Contacts &amp; Guardians
                  </h3>
                  <p className="text-xs text-(--muted-foreground)">Recipients for emergency SMS and missed check-in alerts</p>
                </div>
              </div>

              <Link
                href="/emergency"
                className="text-xs font-bold text-(--primary) hover:underline flex items-center gap-1"
              >
                <span>Manage Contacts</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trustedContacts.map((contact) => (
                <div 
                  key={contact.id}
                  className="p-3.5 rounded-2xl bg-elevated-surface border border-border flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-(--primary)/10 text-(--primary) font-bold text-xs flex items-center justify-center">
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-foreground">{contact.name}</h5>
                      <p className="text-[11px] text-(--muted-foreground)">{contact.relationship || "Guardian"}</p>
                    </div>
                  </div>
                  <a
                    href={`tel:${contact.phone}`}
                    className="p-1.5 rounded-xl bg-surface border border-border text-(--primary) hover:opacity-80 transition-opacity"
                    title={`Call ${contact.name}`}
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Safety & Protocol Preferences */}
          <div className="rounded-3xl p-6 space-y-4 bg-surface border border-border shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border">
              <div className="p-2 rounded-xl bg-red-500/10 text-danger">
                <Shield className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Safety Defaults &amp; Route Prioritization
                </h3>
                <p className="text-xs text-(--muted-foreground)">Global rules applied to journey planning</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-elevated-surface border border-border">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Prioritize Well-Lit Corridors</h4>
                  <p className="text-[11px] text-(--muted-foreground)">Favor 24/7 lit tollways and verified highway safety stations</p>
                </div>
                <input
                  type="checkbox"
                  checked={womenSafetyDefault}
                  onChange={(e) => setWomenSafetyDefault(e.target.checked)}
                  className="rounded h-4 w-4 accent-(--primary)"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-elevated-surface border border-border">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Live GPS Telemetry Sharing in SOS</h4>
                  <p className="text-[11px] text-(--muted-foreground)">Automatically attach coordinates to emergency SMS dispatches</p>
                </div>
                <input
                  type="checkbox"
                  checked={liveGpsTelemetry}
                  onChange={(e) => setLiveGpsTelemetry(e.target.checked)}
                  className="rounded h-4 w-4 accent-(--primary)"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-elevated-surface border border-border">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Auto-Cache Regional Offline Packs</h4>
                  <p className="text-[11px] text-(--muted-foreground)">Pre-cache coordinates for Chennai, Mumbai, Delhi, Hyderabad, Bangalore, Vizag</p>
                </div>
                <input
                  type="checkbox"
                  checked={offlinePackSync}
                  onChange={(e) => setOfflinePackSync(e.target.checked)}
                  className="rounded h-4 w-4 accent-(--primary)"
                />
              </div>
            </div>
          </div>

          {/* Storage & Diagnostics */}
          <div className="rounded-3xl p-6 space-y-4 bg-surface border border-border shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border">
              <div className="p-2 rounded-xl bg-(--primary)/10 text-(--primary)">
                <Database className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Storage &amp; Diagnostics
                </h3>
                <p className="text-xs text-(--muted-foreground)">Manage offline cache and local testing state</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-2xl bg-elevated-surface border border-border">
              <div>
                <h4 className="text-xs font-bold text-foreground">Reset Local Demo Storage</h4>
                <p className="text-[11px] text-(--muted-foreground)">Clears cached checklists and assessment history</p>
              </div>
              <button
                onClick={handleResetCache}
                className="px-4 py-2 rounded-xl bg-surface border border-border text-foreground hover:bg-elevated-surface text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5 text-(--primary)" />
                <span>Reset Demo Cache</span>
              </button>
            </div>
          </div>

        </div>

      </main>

      <Footer />

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
