"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import { useSharedLocation } from "../../hooks/useSharedLocation";
import { getTrustedContacts, refreshTrustedContactsFromBackend } from "../../services/trustedContactService";
import { getActiveOfflinePack } from "../../services/offlineStorageService";
import { TravelGuardianAPI } from "../../services/api";
import { TrustedContact } from "../../types/safetyCheckIn";
import {
  Shield,
  MapPin,
  Compass,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Navigation,
  Users,
  Download
} from "lucide-react";

export default function DashboardScreen() {
  const router = useRouter();

  const [greeting, setGreeting] = useState("Good Day");
  const [userName, setUserName] = useState("Traveler");
  const [currentSlide, setCurrentSlide] = useState(0);

  // Real overview state (Section 4: overview, never fabricated widgets).
  const { hasLocation, permissionStatus } = useSharedLocation();
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
  const [hasOfflinePack, setHasOfflinePack] = useState(false);
  const [activeCheckIn, setActiveCheckIn] = useState<boolean | null>(null);

  useEffect(() => {
    setTrustedContacts(getTrustedContacts());
    refreshTrustedContactsFromBackend().then(setTrustedContacts).catch(() => {});
    getActiveOfflinePack().then(pack => setHasOfflinePack(!!pack)).catch(() => setHasOfflinePack(false));
    TravelGuardianAPI.getActiveCheckin()
      .then(active => setActiveCheckIn(!!active && !active.is_completed && !active.is_triggered))
      .catch(() => setActiveCheckIn(false));
  }, []);

  const primaryContact = trustedContacts.find(c => c.enabled) || trustedContacts[0] || null;

  const slides = [
    {
      title: "AI Route Safety Fit",
      subtitle: "Deterministic scoring across national corridors based on road lighting, crime indices, and verified trauma centers.",
      badge: "Real-Time Intelligence",
    },
    {
      title: "Fail-Safe Check-In Timers",
      subtitle: "Dead-man countdown timers with automated SMS and voice alerts dispatched via Twilio to trusted guardians.",
      badge: "Automated Escalation",
    },
    {
      title: "Zero-Signal Vector Guardian",
      subtitle: "Offline vector map corridors and printable PDF survival cards for uninterrupted highway safety.",
      badge: "Offline Ready",
    },
  ];

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      className="min-h-screen flex flex-col bg-background text-foreground"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* ============================================================
            WELCOME HERO CARD with Scenic Background Image (Section 28)
            ============================================================ */}
        <div 
          className="rounded-3xl p-6 md:p-8 relative overflow-hidden text-white shadow-xl shadow-black/10 border border-white/15 backdrop-blur-xs"
          style={{
            backgroundImage: "linear-gradient(135deg, rgba(15, 23, 42, 0.72) 0%, rgba(30, 58, 138, 0.62) 50%, rgba(15, 23, 42, 0.78) 100%), url('/hero1.png')",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-15 bg-blue-400 blur-xl pointer-events-none" />
          <div className="absolute bottom-0 right-16 w-24 h-24 rounded-full opacity-15 bg-indigo-500 blur-xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <span className="text-blue-300 font-bold text-xs tracking-wider uppercase block drop-shadow-sm">
                Travel Safety Suite
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-md">
                {greeting}, {userName}! 👋
              </h1>
              <p className="text-blue-100 flex items-center gap-1.5 text-xs md:text-sm font-medium pt-1 drop-shadow-sm">
                <MapPin className="h-4 w-4 shrink-0 text-blue-300" />
                <span>
                  {hasLocation ? "GPS Active" : permissionStatus === "denied" ? "GPS Permission Denied" : "GPS Not Yet Enabled"}
                  {" • Real Google Places Safety Engine"}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => router.push("/plan")}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white text-blue-600 text-xs md:text-sm font-extrabold shadow-xl hover:bg-blue-50 hover:shadow-2xl transition-all active:scale-95 cursor-pointer shrink-0 border border-white/40"
              >
                <Navigation className="h-4 w-4 text-blue-600 fill-blue-600/20 shrink-0" />
                <span className="text-blue-600 font-extrabold tracking-wide">Plan Journey</span>
              </button>
              <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl bg-black/30 text-white text-xs font-semibold backdrop-blur-md border border-white/20`}>
                <span className={`h-2 w-2 rounded-full ${hasLocation ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />
                <span>GPS: {hasLocation ? "Live" : "Off"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            CAROUSEL BANNER with Subtle Scenic Texture
            ============================================================ */}
        <div 
          className="rounded-3xl overflow-hidden relative border border-border shadow-sm bg-surface"
          style={{
            backgroundImage: "linear-gradient(to right, var(--surface) 60%, transparent), url('/hero2.png')",
            backgroundSize: "cover",
            backgroundPosition: "right center"
          }}
        >
          <div className="p-6 md:p-8 relative z-10 bg-linear-to-r from-surface via-(--surface)/95 to-transparent">
            <div className="flex items-start justify-between">
              <div className="space-y-2 max-w-lg">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--primary)/10 text-(--primary) text-[10px] font-bold tracking-wider uppercase">
                  <Sparkles className="h-3 w-3" />
                  <span>{slides[currentSlide].badge}</span>
                </div>
                <h3 className="text-lg md:text-xl font-extrabold text-foreground">
                  {slides[currentSlide].title}
                </h3>
                <p className="text-xs md:text-sm text-(--muted-foreground) leading-relaxed">
                  {slides[currentSlide].subtitle}
                </p>
              </div>
              <div className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl bg-(--primary)/10 text-(--primary) shrink-0 border border-(--primary)/20 shadow-sm">
                <Shield className="h-10 w-10" />
              </div>
            </div>
            {/* Dots */}
            <div className="flex gap-2 mt-5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`rounded-full transition-all h-2 ${i === currentSlide ? "w-6 bg-(--primary)" : "w-2 bg-border"}`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================
            OVERVIEW: real status only — GPS, trusted contact, safety
            check, offline pack. Never a duplicate of primary nav cards,
            never a fabricated value (Section 4 / Section 51).
            ============================================================ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-(--muted-foreground)">
              Journey &amp; Safety Overview
            </h3>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* GPS status */}
            <button
              onClick={() => router.push("/map")}
              className="rounded-3xl p-5 text-left flex flex-col justify-between transition-all bg-surface border border-border hover:border-(--primary)/40 hover:shadow-lg shadow-sm min-h-32 group"
            >
              <div className="flex justify-between items-start">
                <div className={`rounded-2xl p-3 flex items-center justify-center ${hasLocation ? "bg-emerald-500/10" : "bg-slate-500/10"}`}>
                  <MapPin className={`h-5 w-5 ${hasLocation ? "text-emerald-500" : "text-slate-400"}`} />
                </div>
                <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-all text-(--muted-foreground)" />
              </div>
              <div className="mt-3">
                <h4 className="font-bold text-sm text-foreground">GPS Status</h4>
                <span className="text-[11px] text-(--muted-foreground) block mt-0.5">
                  {hasLocation ? "Live and available" : permissionStatus === "denied" ? "Permission denied" : "Not yet enabled"}
                </span>
              </div>
            </button>

            {/* Trusted contact status */}
            <button
              onClick={() => router.push("/emergency")}
              className="rounded-3xl p-5 text-left flex flex-col justify-between transition-all bg-surface border border-border hover:border-(--primary)/40 hover:shadow-lg shadow-sm min-h-32 group"
            >
              <div className="flex justify-between items-start">
                <div className={`rounded-2xl p-3 flex items-center justify-center ${primaryContact ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                  <Users className={`h-5 w-5 ${primaryContact ? "text-emerald-500" : "text-amber-500"}`} />
                </div>
                <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-all text-(--muted-foreground)" />
              </div>
              <div className="mt-3">
                <h4 className="font-bold text-sm text-foreground">Trusted Contact</h4>
                <span className="text-[11px] text-(--muted-foreground) block mt-0.5 truncate">
                  {primaryContact ? primaryContact.name : "Not configured yet"}
                </span>
              </div>
            </button>

            {/* Safety Check status */}
            <button
              onClick={() => router.push("/safety-check")}
              className="rounded-3xl p-5 text-left flex flex-col justify-between transition-all bg-surface border border-border hover:border-(--primary)/40 hover:shadow-lg shadow-sm min-h-32 group"
            >
              <div className="flex justify-between items-start">
                <div className={`rounded-2xl p-3 flex items-center justify-center ${activeCheckIn ? "bg-emerald-500/10" : "bg-slate-500/10"}`}>
                  <ShieldCheck className={`h-5 w-5 ${activeCheckIn ? "text-emerald-500" : "text-slate-400"}`} />
                </div>
                <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-all text-(--muted-foreground)" />
              </div>
              <div className="mt-3">
                <h4 className="font-bold text-sm text-foreground">Safety Check</h4>
                <span className="text-[11px] text-(--muted-foreground) block mt-0.5">
                  {activeCheckIn === null ? "Checking..." : activeCheckIn ? "Timer active" : "Not running"}
                </span>
              </div>
            </button>

            {/* Offline pack status */}
            <button
              onClick={() => router.push("/offline-mode")}
              className="rounded-3xl p-5 text-left flex flex-col justify-between transition-all bg-surface border border-border hover:border-(--primary)/40 hover:shadow-lg shadow-sm min-h-32 group"
            >
              <div className="flex justify-between items-start">
                <div className={`rounded-2xl p-3 flex items-center justify-center ${hasOfflinePack ? "bg-emerald-500/10" : "bg-slate-500/10"}`}>
                  <Download className={`h-5 w-5 ${hasOfflinePack ? "text-emerald-500" : "text-slate-400"}`} />
                </div>
                <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-all text-(--muted-foreground)" />
              </div>
              <div className="mt-3">
                <h4 className="font-bold text-sm text-foreground">Offline Pack</h4>
                <span className="text-[11px] text-(--muted-foreground) block mt-0.5">
                  {hasOfflinePack ? "Downloaded" : "None downloaded"}
                </span>
              </div>
            </button>
          </div>

          {/* Single, non-duplicated quick action — the rest live in primary nav */}
          <button
            onClick={() => router.push("/plan")}
            className="w-full rounded-3xl p-5 flex items-center justify-between transition-all bg-(--primary)/10 border border-(--primary)/20 hover:bg-(--primary)/15 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl p-3 bg-(--primary)/15 text-(--primary)">
                <Compass className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-sm text-foreground">Plan a new journey</h4>
                <span className="text-[11px] text-(--muted-foreground) block mt-0.5">Compare safety-scored corridors for your route</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-(--primary)" />
          </button>
        </div>
      </main>

      <Footer />

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
