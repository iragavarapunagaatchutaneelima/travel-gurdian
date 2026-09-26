"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { 
  Shield, 
  ArrowRight, 
  Navigation, 
  Compass, 
  MapPin, 
  Bot, 
  ShieldCheck, 
  Sparkles,
  PhoneCall,
  Clock,
  WifiOff,
  Users,
  CheckCircle2,
  ChevronRight,
  Coffee,
  Hospital,
  AlertTriangle
} from "lucide-react";

export default function LandingScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/dashboard");
  };

  const coreFeatures = [
    {
      icon: Compass,
      title: "Route Safety Intelligence",
      tag: "Deterministic Scoring",
      desc: "Calculates Safety Fit scores (0–100) using real Google Routes, corridor lighting, crime index data, and road conditions.",
      href: "/plan",
      cta: "Explore Route Planner",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      icon: Bot,
      title: "AI Guardian Assistant",
      tag: "Gemini + Tools",
      desc: "Synchronized chat & map assistant that queries actual GPS coordinates to find verified safe havens without hallucinations.",
      href: "/assist",
      cta: "Open AI Assistant",
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20"
    },
    {
      icon: Clock,
      title: "Safety Check-In & Timers",
      tag: "Automated Escalation",
      desc: "Dead-man's safety timers with configurable intervals, grace periods, and instant alerts to trusted contacts via Exotel.",
      href: "/settings",
      cta: "Configure Check-In",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20"
    },
    {
      icon: AlertTriangle,
      title: "Emergency 112 & SOS Hub",
      tag: "Life Safety Protocol",
      desc: "One-tap direct 112 dialing and multi-channel SMS/Call notifications with exact GPS coordinates sent to trusted contacts.",
      href: "/emergency",
      cta: "Inspect Emergency Hub",
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/20"
    },
    {
      icon: WifiOff,
      title: "Offline Survival Guardian",
      tag: "Zero-Signal Ready",
      desc: "Offline vector map corridors, cached POIs, and downloadable emergency survival cards with turn-by-turn routes.",
      href: "/offline-mode",
      cta: "Download Offline Pack",
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20"
    },
    {
      icon: Users,
      title: "Trusted Guardian Network",
      tag: "Private & Secure",
      desc: "Manage trusted family contacts who receive automatic trip check-in updates and instant escalation during missed intervals.",
      href: "/settings",
      cta: "Manage Guardians",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20"
    }
  ];

  return (
    <div
      className="min-h-screen flex flex-col bg-background text-foreground selection:bg-(--primary) selection:text-white"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <Header />

      {/* ============================================================
          HERO SECTION with Haikei SVG Waves & Glassmorphism
          ============================================================ */}
      <section className="relative overflow-hidden pt-8 pb-16 md:py-24 border-b border-border">
        
        {/* Background Gradients & Haikei SVGs */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20 bg-cover bg-bottom"
          style={{ backgroundImage: "url('/backgrounds/hero-waves.svg')" }}
        />
        <div 
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none bg-(--primary)/10 blur-3xl"
        />
        <div 
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full pointer-events-none bg-(--accent)/15 blur-3xl"
        />

        <div className="relative max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            
            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left space-y-6">
              
              {/* Product Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-(--primary)/10 text-(--primary) border border-(--primary)/20 shadow-sm animate-fadeIn">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Next-Gen Travel Safety &amp; Navigation</span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
                Travel Confidently.{" "}
                <span className="bg-linear-to-r from-(--primary) via-blue-500 to-(--accent) bg-clip-text text-transparent">
                  Stay Protected.
                </span>
                <br />
                Every Mile of the Way.
              </h1>

              {/* Subtitle */}
              <p className="text-sm md:text-base text-(--muted-foreground) leading-relaxed max-w-xl mx-auto lg:mx-0">
                Travel Guardian combines real Google Route telemetry with AI-verified safe havens, dead-man check-in timers, and instant 112 emergency escalation — both online and offline.
              </p>

              {/* CTA Group */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  onClick={handleGetStarted}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-linear-to-tr from-(--primary) to-(--secondary) text-white text-sm font-bold shadow-lg shadow-(--primary)/30 hover:opacity-95 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>Launch Traveler Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <Link
                  href="/plan"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-surface text-foreground border border-border text-sm font-bold hover:bg-elevated-surface hover:border-(--primary)/40 shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Compass className="h-4 w-4 text-(--primary)" />
                  <span>Plan Safe Route</span>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-(--muted-foreground) font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Real Google Routes</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>112 Direct Dial</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Exotel SMS / Voice</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Zero-Signal Offline Mode</span>
                </span>
              </div>

            </div>

            {/* Right Preview Card: Realistic Interactive Mockup */}
            <div className="w-full max-w-md lg:max-w-none lg:w-115 shrink-0">
              <div className="relative rounded-3xl p-6 bg-surface border border-border shadow-2xl shadow-(--primary)/10 space-y-4">
                
                {/* Status Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-linear-to-tr from-(--primary) to-(--secondary) text-white">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Corridor Guardian Active</h4>
                      <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Live GPS Telemetry Sync</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    94/100 Safe
                  </span>
                </div>

                {/* Route Snapshot */}
                <div className="p-3.5 rounded-2xl bg-elevated-surface border border-border space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] uppercase font-bold text-(--muted-foreground) tracking-wider">Active Route</span>
                    <span className="font-bold text-(--primary)">NH 48 National Highway</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span>Chennai (Central)</span>
                    <ArrowRight className="h-3.5 w-3.5 text-(--muted-foreground)" />
                    <span>Bangalore (Whitefield)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-(--muted-foreground) pt-1 border-t border-(--border)/60">
                    <span>Est. 5h 20m (350 km)</span>
                    <span className="text-emerald-500 font-semibold">Lit Corridor • Low Risk</span>
                  </div>
                </div>

                {/* Dynamic Telemetry Rows */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-elevated-surface border border-border">
                    <span className="text-[10px] text-(--muted-foreground) block">Check-In Cycle</span>
                    <span className="font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-(--primary)" />
                      <span>Next in 12m</span>
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-elevated-surface border border-border">
                    <span className="text-[10px] text-(--muted-foreground) block">Emergency Line</span>
                    <span className="font-bold text-danger flex items-center gap-1.5 mt-0.5">
                      <PhoneCall className="h-3.5 w-3.5" />
                      <span>112 Connected</span>
                    </span>
                  </div>
                </div>

                {/* Verified Haven Node */}
                <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hospital className="h-4 w-4 text-(--primary)" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Apollo Emergency Trauma</p>
                      <p className="text-[10px] text-(--muted-foreground)">1.2 km away on route</p>
                    </div>
                  </div>
                  <Link 
                    href="/map"
                    className="text-[11px] font-bold text-(--primary) hover:underline flex items-center gap-1"
                  >
                    <span>View</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>

                {/* Quick Action Button */}
                <button
                  onClick={() => router.push("/assist")}
                  className="w-full py-2.5 rounded-xl bg-elevated-surface hover:bg-(--border)/40 text-foreground border border-border text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Bot className="h-3.5 w-3.5 text-(--primary)" />
                  <span>Ask AI Guardian: &quot;What&apos;s near me?&quot;</span>
                </button>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURES SUITE GRID
          ============================================================ */}
      <section className="py-16 md:py-24 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 md:mb-16">
            <span className="text-xs font-bold text-(--primary) uppercase tracking-widest">
              COMPREHENSIVE SAFETY CAPABILITIES
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Engineered for Real-World Journey Security
            </h2>
            <p className="text-xs md:text-sm text-(--muted-foreground) leading-relaxed">
              Every system is built to provide verifiable, non-hallucinated safety intelligence before, during, and after your trip.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="p-6 rounded-3xl bg-surface border border-border hover:border-(--primary)/40 hover:shadow-xl hover:shadow-(--primary)/5 transition-all group flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-2xl ${feat.bgColor} ${feat.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-elevated-surface text-(--muted-foreground) border border-border">
                        {feat.tag}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-foreground group-hover:text-(--primary) transition-colors">
                      {feat.title}
                    </h3>

                    <p className="text-xs md:text-sm text-(--muted-foreground) leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>

                  <Link
                    href={feat.href}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-(--primary) hover:underline pt-2"
                  >
                    <span>{feat.cta}</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ============================================================
          EMERGENCY CALLOUT BANNER
          ============================================================ */}
      <section className="py-14 bg-linear-to-r from-red-600 via-rose-600 to-red-700 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs uppercase font-extrabold tracking-widest text-red-100">
              NATIONAL EMERGENCY ASSISTANCE
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              In Danger? National Emergency 112 is One Tap Away.
            </h2>
            <p className="text-xs md:text-sm text-red-100 max-w-xl">
              Direct integration launches emergency services. Configured trusted contacts automatically receive your last verified GPS coordinates via SMS.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="tel:112"
              className="px-6 py-3.5 rounded-2xl bg-white text-red-600 text-sm font-extrabold shadow-xl hover:bg-red-50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <PhoneCall className="h-4 w-4" />
              <span>Call 112 Directly</span>
            </a>
            <Link
              href="/emergency"
              className="px-5 py-3.5 rounded-2xl bg-red-800/60 border border-white/20 text-white text-sm font-bold hover:bg-red-800/80 transition-all"
            >
              Emergency Hub
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
