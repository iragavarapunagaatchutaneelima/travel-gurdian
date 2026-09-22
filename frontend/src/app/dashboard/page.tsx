"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import {
  Shield, Clock, Download, History, AlertTriangle,
  MapPin, CloudSun, Wind, Car, Wifi, Bot, Navigation,
  ChevronRight, CheckCircle2, ArrowRight, Sparkles
} from "lucide-react";

const S = {
  fontFamily: "'Poppins', system-ui, sans-serif",
};

export default function HomeDashboard() {
  const router = useRouter();

  // Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    { title: "Travel Safely Everywhere", subtitle: "Real-time threat diagnostics & municipal safety mapping across 6 primary Indian city hubs.", accent: "#2563FF" },
    { title: "Offline Safety Packs", subtitle: "Preserve navigation coordinates, emergency numbers and guides without network coverage.", accent: "#22C55E" },
    { title: "Fail-Safe Check-In Timers", subtitle: "Automatic GPS coordinates sharing with active dispatch telemetry to trusted guardians.", accent: "#F59E0B" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Quick Actions
  const actions = [
    { name: "Plan Journey", href: "/plan", icon: Navigation, desc: "6-City Route Intelligence", color: "#2563FF", bg: "#EFF6FF" },
    { name: "Live Maps", href: "/map", icon: MapPin, desc: "Interactive Map & POIs", color: "#2563FF", bg: "#EFF6FF" },
    { name: "AI Guardian", href: "/assist", icon: Bot, desc: "Gemini Safety Advisory", color: "#2563FF", bg: "#EFF6FF" },
    { name: "Safety Check-In", href: "#timer", icon: Clock, desc: "Fail-safe Timer", color: "#22C55E", bg: "#F0FDF4" },
    { name: "My Journeys", href: "/history", icon: History, desc: "Trip History & Logs", color: "#64748B", bg: "#F8FAFC" },
    { name: "Emergency SOS", href: "/emergency", icon: AlertTriangle, desc: "SOS & 112 Dispatch", color: "#EF4444", bg: "#FEF2F2" },
  ];

  const [userName, setUserName] = useState("Traveler");
  const [greeting, setGreeting] = useState("Good Morning");
  const [showSafetyTimer, setShowSafetyTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState("3");
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [timerId, setTimerId] = useState<any>(null);

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) setGreeting("Good Morning");
    else if (hours >= 12 && hours < 17) setGreeting("Good Afternoon");
    else if (hours >= 17 && hours < 21) setGreeting("Good Evening");
    else setGreeting("Good Night");

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user_identity");
      if (stored) {
        const parts = stored.includes("@") ? stored.split("@")[0] : stored;
        setUserName(parts.charAt(0).toUpperCase() + parts.slice(1));
      }
    }
  }, []);

  const handleStartTimer = (e: React.FormEvent) => {
    e.preventDefault();
    if (timerId) clearInterval(timerId);
    let remaining = parseInt(timerDuration) * 60;
    setTimerRemaining(remaining);
    const id = setInterval(() => {
      remaining -= 1;
      setTimerRemaining(remaining);
      if (remaining <= 0) {
        alert("Safety timer expired! Fail-safe location telemetry broadcast simulated to emergency contacts.");
        clearInterval(id);
        setTimerRemaining(null);
      }
    }, 1000);
    setTimerId(id);
  };

  const handleBypassTimer = () => {
    if (timerId) clearInterval(timerId);
    setTimerRemaining(null);
    alert("Check-in confirmed! You are safe.");
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ backgroundColor: "#F8FAFC", ...S }}>
      <Header />

      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* ============================================================
            WELCOME HERO CARD
            ============================================================ */}
        <div
          className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #2563FF 0%, #1E40AF 100%)",
            boxShadow: "0 8px 32px rgba(37,99,255,0.25)",
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: "#FFFFFF" }} />
          <div className="absolute bottom-0 right-16 w-20 h-20 rounded-full opacity-10" style={{ backgroundColor: "#00D4FF" }} />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-blue-200 font-semibold" style={{ fontSize: "12px" }}>
                  Travel Safety Suite
                </span>
              </div>
              <h2 className="text-white" style={{ fontWeight: 800, fontSize: "clamp(20px,4vw,28px)", letterSpacing: "-0.01em" }}>
                {greeting}, {userName}! 👋
              </h2>
              <p className="text-blue-100 flex items-center gap-1.5" style={{ fontSize: "13px", fontWeight: 500 }}>
                <MapPin className="h-4 w-4" />
                <span>Active GPS • Multi-City Safety Engine Online</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/plan")}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: "#FFFFFF",
                  color: "#2563FF",
                  fontWeight: 700,
                  fontSize: "13px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
                }}
              >
                <Navigation className="h-4 w-4" />
                <span>Plan Journey</span>
              </button>
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold"
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                <span className="h-2 w-2 rounded-full bg-green-300 animate-pulse" />
                <span>Telemetry: Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            CAROUSEL BANNER
            ============================================================ */}
        <div
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
            border: "1px solid rgba(37,99,255,0.12)",
            minHeight: "180px",
          }}
        >
          <div className="p-8 relative z-10">
            <div className="flex items-start justify-between">
              <div className="space-y-2 max-w-md">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(37,99,255,0.12)", color: "#2563FF", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
                >
                  <Sparkles className="h-3 w-3" />
                  Core Guardian Feature
                </div>
                <h3 style={{ fontWeight: 800, fontSize: "clamp(18px,3vw,24px)", color: "#0F172A" }}>
                  {slides[currentSlide].title}
                </h3>
                <p style={{ fontWeight: 400, fontSize: "13px", color: "#64748B", lineHeight: 1.6 }}>
                  {slides[currentSlide].subtitle}
                </p>
              </div>
              <div className="hidden md:flex items-center justify-center w-24 h-24 rounded-3xl" style={{ backgroundColor: "rgba(37,99,255,0.08)" }}>
                <Shield className="h-12 w-12 text-blue-300" />
              </div>
            </div>
            {/* Dots */}
            <div className="flex gap-2 mt-5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className="rounded-full transition-all"
                  style={{
                    height: "8px",
                    width: i === currentSlide ? "24px" : "8px",
                    backgroundColor: i === currentSlide ? "#2563FF" : "#CBD5E1",
                  }}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================
            MAIN GRID: Feature Modules + Live Conditions
            ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Feature Modules */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 style={{ fontWeight: 700, fontSize: "12px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Safety & Guidance Modules
              </h3>
              <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600 }}>6 Modules</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {actions.map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.name}
                    onClick={() => {
                      if (act.href === "#timer") {
                        setShowSafetyTimer(true);
                      } else {
                        router.push(act.href);
                      }
                    }}
                    className="rounded-3xl p-5 text-left flex flex-col justify-between transition-all group"
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid rgba(15,23,42,0.08)",
                      boxShadow: "0 2px 8px rgba(37,99,255,0.06)",
                      minHeight: "140px",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(37,99,255,0.14)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(37,99,255,0.06)";
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div
                        className="rounded-2xl p-3 flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: act.bg }}
                      >
                        <Icon className="h-6 w-6" style={{ color: act.color }} />
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-30 group-hover:opacity-70 transition-opacity" style={{ color: act.color }} />
                    </div>
                    <div className="mt-3">
                      <h4 style={{ fontWeight: 700, fontSize: "14px", color: "#0F172A" }}>{act.name}</h4>
                      <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500 }}>{act.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Conditions */}
          <div className="lg:col-span-4">
            <div
              className="rounded-3xl p-6 space-y-4"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 2px 8px rgba(37,99,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                <h3 style={{ fontWeight: 700, fontSize: "12px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Live Conditions
                </h3>
                <span
                  className="flex items-center gap-1"
                  style={{ fontSize: "10px", fontWeight: 700, color: "#22C55E", backgroundColor: "#F0FDF4", padding: "3px 8px", borderRadius: "9999px" }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  { icon: CloudSun, label: "Weather", value: "28°C, Clear", valueColor: "#0F172A" },
                  { icon: Wind, label: "Air Quality", value: "65 (Moderate)", valueColor: "#F59E0B" },
                  { icon: Car, label: "Highway Flow", value: "Smooth", valueColor: "#22C55E" },
                  { icon: Wifi, label: "Network Link", value: "Online", valueColor: "#22C55E" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl px-3 py-2.5"
                      style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.05)" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-lg p-1.5" style={{ backgroundColor: "#EFF6FF" }}>
                          <Icon className="h-4 w-4" style={{ color: "#2563FF" }} />
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{item.label}</span>
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: item.valueColor }}>{item.value}</span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => router.push("/assist")}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 transition-all"
                style={{
                  backgroundColor: "#EFF6FF",
                  border: "1px solid rgba(37,99,255,0.15)",
                  color: "#2563FF",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#DBEAFE"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#EFF6FF"}
              >
                <Bot className="h-4 w-4" />
                <span>Ask AI Guardian</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Timer Modal */}
      {showSafetyTimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,23,42,0.5)", backdropFilter: "blur(8px)" }}>
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-5 animate-slideUp"
            style={{ backgroundColor: "#FFFFFF", boxShadow: "0 24px 64px rgba(15,23,42,0.20)" }}
          >
            <div className="flex justify-between items-center pb-3" style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
              <h3 style={{ fontWeight: 700, fontSize: "16px", color: "#0F172A" }}>Safety Mode Check-in</h3>
              <button
                onClick={() => setShowSafetyTimer(false)}
                className="p-1.5 rounded-xl"
                style={{ backgroundColor: "#F1F5F9", color: "#64748B" }}
              >
                ✕
              </button>
            </div>

            {timerRemaining !== null ? (
              <div className="text-center py-6 space-y-4">
                <div
                  className="inline-flex flex-col items-center justify-center h-28 w-28 rounded-full border-4"
                  style={{ borderColor: "#2563FF", backgroundColor: "#EFF6FF", color: "#2563FF" }}
                >
                  <span style={{ fontSize: "18px", fontWeight: 800 }}>{Math.floor(timerRemaining / 60)}m {timerRemaining % 60}s</span>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>Remaining</span>
                </div>
                <p style={{ fontSize: "12px", color: "#64748B", lineHeight: 1.6 }}>
                  Alarm will dispatch location telemetry to emergency contacts if bypass check-in fails.
                </p>
                <button
                  onClick={handleBypassTimer}
                  className="w-full rounded-2xl py-3 text-white font-bold transition-all"
                  style={{ backgroundColor: "#2563FF", fontSize: "13px", fontWeight: 700 }}
                >
                  I am Safe — Bypass Check-in
                </button>
              </div>
            ) : (
              <form onSubmit={handleStartTimer} className="space-y-4">
                <div className="space-y-1.5">
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Set Check-in Interval
                  </label>
                  <select
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(e.target.value)}
                    className="w-full rounded-2xl px-4 py-3 outline-none"
                    style={{
                      backgroundColor: "#F8FAFC",
                      border: "1.5px solid #E2E8F0",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#0F172A",
                      fontFamily: "'Poppins',sans-serif",
                    }}
                  >
                    <option value="1">1 Minute (Demo mode)</option>
                    <option value="5">5 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">1 Hour</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-2xl py-3 text-white transition-all"
                  style={{
                    background: "linear-gradient(135deg, #2563FF 0%, #1E40AF 100%)",
                    fontSize: "13px",
                    fontWeight: 700,
                    boxShadow: "0 4px 12px rgba(37,99,255,0.25)",
                  }}
                >
                  Start Safety Mode
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
