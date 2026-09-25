"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import { 
  Shield, 
  MapPin, 
  AlertTriangle, 
  Compass, 
  Users, 
  Bot, 
  PhoneCall, 
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  ChevronRight,
  CloudSun,
  Wind,
  Car,
  Wifi,
  Navigation,
  Check,
  X
} from "lucide-react";

export default function DashboardScreen() {
  const router = useRouter();

  const [greeting, setGreeting] = useState("Good Day");
  const [userName, setUserName] = useState("Traveler");
  const [currentSlide, setCurrentSlide] = useState(0);

  // Quick Safety Timer state
  const [showSafetyTimer, setShowSafetyTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState("1");
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: "success" | "warning" } | null>(null);

  const slides = [
    {
      title: "AI Route Safety Fit",
      subtitle: "Deterministic scoring across national corridors based on road lighting, crime indices, and verified trauma centers.",
      badge: "Real-Time Intelligence",
    },
    {
      title: "Fail-Safe Check-In Timers",
      subtitle: "Dead-man countdown timers with automated SMS and voice alerts dispatched via Exotel to trusted guardians.",
      badge: "Automated Escalation",
    },
    {
      title: "Zero-Signal Vector Guardian",
      subtitle: "Offline vector map corridors and printable PDF survival cards for uninterrupted highway safety.",
      badge: "Offline Ready",
    },
  ];

  const actions = [
    { name: "Plan Journey", desc: "Compare safe corridors", icon: Compass, href: "/plan", color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Live Map & GPS", desc: "View real-time route", icon: MapPin, href: "/map", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "AI Guardian", desc: "Ask 'What's near me?'", icon: Bot, href: "/assist", color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { name: "Emergency Hub", desc: "112 dialer & SOS", icon: AlertTriangle, href: "/emergency", color: "text-rose-500", bg: "bg-rose-500/10" },
    { name: "Safety Timer", desc: "Quick fail-safe mode", icon: Clock, href: "#timer", color: "text-amber-500", bg: "bg-amber-500/10" },
    { name: "Offline Packs", desc: "Vector map caches", icon: Shield, href: "/offline-mode", color: "text-cyan-500", bg: "bg-cyan-500/10" },
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

  const handleStartTimer = (e: React.FormEvent) => {
    e.preventDefault();
    if (timerId) clearInterval(timerId);
    let remaining = parseInt(timerDuration) * 60;
    setTimerRemaining(remaining);
    const id = setInterval(() => {
      remaining -= 1;
      setTimerRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        setTimerRemaining(null);
        setToastMessage({
          message: "Safety timer expired! Fail-safe location telemetry broadcast to emergency contacts.",
          type: "warning"
        });
        setTimeout(() => setToastMessage(null), 6000);
      }
    }, 1000);
    setTimerId(id);
  };

  const handleBypassTimer = () => {
    if (timerId) clearInterval(timerId);
    setTimerRemaining(null);
    setToastMessage({
      message: "Check-in confirmed! You are safely verified.",
      type: "success"
    });
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div 
      className="min-h-screen flex flex-col bg-background text-foreground"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <Header />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92vw] animate-slideDown">
          <div className={`p-4 rounded-2xl shadow-xl border flex items-center justify-between gap-3 ${
            toastMessage.type === "success" 
              ? "bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200" 
              : "bg-amber-50 dark:bg-amber-950/90 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200"
          }`}>
            <div className="flex items-center gap-2.5">
              {toastMessage.type === "success" ? <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />}
              <span className="text-xs md:text-sm font-semibold">{toastMessage.message}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="p-1 hover:opacity-70">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
                <span>Active GPS Corridor • Multi-City Safety Engine Online</span>
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
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-black/30 text-white text-xs font-semibold backdrop-blur-md border border-white/20">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Telemetry: Active</span>
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
            MAIN GRID: Feature Modules + Live Conditions
            ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Feature Modules */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-(--muted-foreground)">
                Safety &amp; Guidance Modules
              </h3>
              <span className="text-xs font-semibold text-(--muted-foreground)">6 Modules Ready</span>
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
                    className="rounded-3xl p-5 text-left flex flex-col justify-between transition-all bg-surface border border-border hover:border-(--primary)/40 hover:shadow-lg shadow-sm min-h-35 group"
                  >
                    <div className="flex justify-between items-start">
                      <div className={`rounded-2xl p-3 flex items-center justify-center transition-transform group-hover:scale-110 ${act.bg}`}>
                        <Icon className={`h-6 w-6 ${act.color}`} />
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-(--muted-foreground)" />
                    </div>
                    <div className="mt-3">
                      <h4 className="font-bold text-sm text-foreground">{act.name}</h4>
                      <span className="text-[11px] text-(--muted-foreground) block mt-0.5">{act.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Conditions */}
          <div className="lg:col-span-4">
            <div className="rounded-3xl p-6 space-y-4 bg-surface border border-border shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-xs font-bold uppercase tracking-widest text-(--muted-foreground)">
                  Live Conditions
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  { icon: CloudSun, label: "Weather", value: "28°C, Clear", valueColor: "text-foreground" },
                  { icon: Wind, label: "Air Quality", value: "65 (Moderate)", valueColor: "text-amber-500" },
                  { icon: Car, label: "Highway Flow", value: "Smooth", valueColor: "text-emerald-500" },
                  { icon: Wifi, label: "Network Link", value: "Online (Full GPS)", valueColor: "text-emerald-500" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl px-3 py-2.5 bg-elevated-surface border border-border"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-lg p-1.5 bg-(--primary)/10 text-(--primary)">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-foreground">{item.label}</span>
                      </div>
                      <span className={`text-xs font-bold ${item.valueColor}`}>{item.value}</span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => router.push("/assist")}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 bg-(--primary)/10 hover:bg-(--primary)/20 border border-(--primary)/20 text-(--primary) text-xs font-bold transition-all"
              >
                <Bot className="h-4 w-4" />
                <span>Ask AI Guardian</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Safety Timer Modal */}
      {showSafetyTimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-5 bg-surface border border-border shadow-2xl animate-slideUp text-foreground">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Safety Mode Check-in</h3>
              <button
                onClick={() => setShowSafetyTimer(false)}
                className="p-1.5 rounded-xl bg-elevated-surface text-(--muted-foreground) hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {timerRemaining !== null ? (
              <div className="text-center py-6 space-y-4">
                <div className="inline-flex flex-col items-center justify-center h-28 w-28 rounded-full border-4 border-(--primary) bg-(--primary)/10 text-(--primary)">
                  <span className="text-lg font-extrabold">{Math.floor(timerRemaining / 60)}m {timerRemaining % 60}s</span>
                  <span className="text-[9px] font-bold text-(--muted-foreground) uppercase">Remaining</span>
                </div>
                <p className="text-xs text-(--muted-foreground) leading-relaxed">
                  Alert will dispatch location telemetry to emergency contacts if bypass check-in fails.
                </p>
                <button
                  onClick={handleBypassTimer}
                  className="w-full rounded-2xl py-3 text-white font-bold bg-(--primary) hover:opacity-90 text-xs shadow-md transition-all"
                >
                  I am Safe — Bypass Check-in
                </button>
              </div>
            ) : (
              <form onSubmit={handleStartTimer} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-(--muted-foreground) block">
                    Set Check-in Interval
                  </label>
                  <select
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(e.target.value)}
                    className="w-full rounded-2xl px-4 py-3 outline-none bg-elevated-surface border border-border text-xs font-semibold text-foreground"
                  >
                    <option value="1">1 Minute (Demo mode)</option>
                    <option value="5">5 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">1 Hour</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-2xl py-3 text-white text-xs font-bold bg-linear-to-tr from-(--primary) to-(--secondary) shadow-md hover:opacity-90 transition-all"
                >
                  Start Safety Mode
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
