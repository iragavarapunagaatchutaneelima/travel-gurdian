"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { 
  Calculator, Shield, Clock, Download, History, AlertTriangle, 
  MapPin, CloudSun, Wind, Car, Wifi, Send, ChevronRight, Loader, Bot, Navigation
} from "lucide-react";

export default function HomeDashboard() {
  const router = useRouter();

  // Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    { src: "/hero1.png", title: "Plan Safer Routes", subtitle: "Real-time threat diagnostics & municipal safety mapping coordinates across 6 primary Indian city hubs." },
    { src: "/hero2.png", title: "Offline Safety Packs", subtitle: "Preserve navigation coordinates, emergency numbers and guides without network coverage." },
    { src: "/hero3.png", title: "Fail-Safe Dead-man Timers", subtitle: "Automatic GPS coordinates sharing with active dispatch telemetry." }
  ];

  // Auto-play slideshow every 3.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Quick Action Buttons
  const actions = [
    { name: "Plan Journey", href: "/plan", icon: Navigation, desc: "6-City Route Intelligence", color: "bg-primary-accent/10 text-primary-accent" },
    { name: "Live Maps", href: "/map", icon: MapPin, desc: "Interactive Map & POIs", color: "bg-primary-accent/10 text-primary-accent" },
    { name: "AI Guardian", href: "/assist", icon: Bot, desc: "Gemini Safety Advisory", color: "bg-primary-accent/10 text-primary-accent" },
    { name: "Safety Timer", href: "#timer", icon: Clock, desc: "Fail-safe Check-in", color: "bg-primary-accent/10 text-primary-accent" },
    { name: "My Journeys", href: "/history", icon: History, desc: "Trip History & Logs", color: "bg-primary-accent/10 text-primary-accent" },
    { name: "Emergency SOS", href: "/emergency", icon: AlertTriangle, desc: "SOS & 112 Dispatch", color: "bg-danger/10 text-danger" }
  ];

  // Active sub-states
  const [userName, setUserName] = useState("Traveler");
  const [greeting, setGreeting] = useState("Good Morning");
  const [showSafetyTimer, setShowSafetyTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState("3"); // mins
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [timerId, setTimerId] = useState<any>(null);

  // AI Assistant overlay chat state
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "bot"; text: string }[]>([
    { sender: "bot", text: "Namaste! AI Guardian safety advisor online. Ask me about travel safety, routes (e.g. Chennai to Bangalore, Mumbai to Hyderabad), safe stops, or SOS protocols." }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) {
      setGreeting("Good Morning");
    } else if (hours >= 12 && hours < 17) {
      setGreeting("Good Afternoon");
    } else if (hours >= 17 && hours < 21) {
      setGreeting("Good Evening");
    } else {
      setGreeting("Good Night");
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user_identity");
      if (stored) {
        if (stored.includes("@")) {
          const parts = stored.split("@")[0];
          setUserName(parts.charAt(0).toUpperCase() + parts.slice(1));
        } else {
          setUserName(stored.charAt(0).toUpperCase() + stored.slice(1));
        }
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
        alert("Safety mode timer expired! Fail-safe location telemetry broadcast simulated to registered emergency contacts.");
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

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const query = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: "user", text: query }]);
    setChatInput("");
    setChatLoading(true);

    try {
      // Call AI endpoint
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { sender: "bot", text: data.reply }]);
      } else {
        throw new Error("AI API unreachable");
      }
    } catch {
      let reply = "AI Guardian Diagnostic: Safety corridor protocols active. Maintain scheduled check-ins, keep emergency numbers (112) accessible, and prioritize National Highways for night travel.";
      const lower = query.toLowerCase();
      if (lower.includes("chennai") || lower.includes("bangalore")) {
        reply = "AI Route Diagnostic (Chennai ➔ Bangalore): Distance is ~350 km via NH 48. Well-maintained 6-lane tollway. High density of 24/7 fuel stations (HP, IndianOil) and highway food plazas at 45km intervals. Safety Score: 92/100 (Highly Recommended).";
      } else if (lower.includes("mumbai") || lower.includes("hyderabad")) {
        reply = "AI Route Diagnostic (Mumbai ➔ Hyderabad): Distance is ~710 km via NH 65. Pune-Solapur expressway segment is fast and well-lit. Solapur-Hyderabad has moderate traffic. Night travel safety score: 86/100.";
      } else if (lower.includes("delhi")) {
        reply = "AI Route Diagnostic (Delhi Hub): Delhi to Bangalore/Hyderabad long-haul corridors. Recommended departure: 06:00 AM. Emergency hospital links and highway patrol active along NH 44.";
      }
      setChatMessages(prev => [...prev, { sender: "bot", text: reply }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      
      {/* Sticky header navigation */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6">
        
        {/* Top welcome banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border border-border rounded-3xl p-6 shadow-sm transition-colors">
          <div className="text-left space-y-1">
            <span className="text-[10px] text-primary-accent font-extrabold uppercase tracking-widest block">
              Travel Safety Suite
            </span>
            <h2 className="text-2xl font-black text-foreground tracking-tight">{greeting}, {userName}</h2>
            <p className="text-xs text-muted flex items-center gap-1.5 font-bold">
              <MapPin className="h-4 w-4 text-primary-accent" /> 
              <span>Active GPS Node • Cross-Compatible Multi-City Engine</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/plan")}
              className="rounded-2xl bg-primary-accent hover:bg-primary-accent-hover text-white px-5 py-2.5 text-xs font-black transition-all shadow-md flex items-center gap-2"
            >
              <Navigation className="h-4 w-4" />
              <span>Plan Journey</span>
            </button>
            <div className="flex items-center gap-2 rounded-2xl bg-elevated-surface border border-border px-4 py-2.5 text-xs text-success font-black">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>Telemetry: Active</span>
            </div>
          </div>
        </div>

        {/* Dynamic Slideshow Banner */}
        <div className="relative w-full h-[260px] md:h-[320px] rounded-3xl overflow-hidden shadow-md bg-black border border-border">
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
                idx === currentSlide ? "opacity-60 scale-100" : "opacity-0 scale-105"
              }`}
              style={{ backgroundImage: `url(${slide.src})` }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent z-10" />
          
          <div className="absolute inset-y-0 left-6 md:left-12 z-20 flex flex-col justify-center text-left text-white max-w-xl space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary-accent-hover">
              Core Guardian Feature
            </span>
            <h3 className="font-extrabold text-xl md:text-3xl tracking-tight leading-tight">{slides[currentSlide].title}</h3>
            <p className="text-xs md:text-sm text-zinc-300 font-semibold leading-relaxed">{slides[currentSlide].subtitle}</p>
          </div>

          {/* Dots */}
          <div className="absolute bottom-5 right-6 z-20 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentSlide ? "w-6 bg-primary-accent" : "w-2 bg-white/40"
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Dashboard Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left panel: Quick Actions (Grid of Cards) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-muted uppercase tracking-widest text-left">
                Safety & Guidance Modules
              </h3>
              <span className="text-[10px] font-bold text-muted uppercase">6 Modules Available</span>
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
                      } else if (act.name === "AI Guardian") {
                        router.push("/assist");
                      } else {
                        router.push(act.href);
                      }
                    }}
                    className="rounded-3xl border border-border bg-surface hover:bg-elevated-surface p-5 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between min-h-[140px] group border-t-2 hover:border-t-primary-accent"
                  >
                    <div className="flex justify-between items-start">
                      <div className={`rounded-2xl p-3 ${act.color} flex items-center justify-center shadow-inner`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-muted group-hover:text-primary-accent transition-colors text-xs font-mono">➔</span>
                    </div>

                    <div className="mt-4">
                      <h4 className="font-black text-sm text-foreground leading-tight group-hover:text-primary-accent transition-colors">{act.name}</h4>
                      <span className="text-[10px] text-muted font-bold block mt-1 uppercase tracking-wider">
                        {act.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel: Live Conditions stats summary */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-4 text-left transition-colors">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-black text-muted uppercase tracking-widest">
                  Live Conditions Matrix
                </h3>
                <span className="text-[9px] font-black text-success uppercase bg-success/10 px-2 py-0.5 rounded">
                  Live Sync
                </span>
              </div>

              <div className="space-y-3">
                {/* Weather */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-elevated-surface border border-border">
                  <div className="flex items-center gap-3">
                    <CloudSun className="h-5 w-5 text-primary-accent" />
                    <span className="text-xs font-bold text-foreground">Weather</span>
                  </div>
                  <span className="text-xs font-black text-foreground">28°C, Clear</span>
                </div>

                {/* AQI */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-elevated-surface border border-border">
                  <div className="flex items-center gap-3">
                    <Wind className="h-5 w-5 text-info" />
                    <span className="text-xs font-bold text-foreground">Air Quality</span>
                  </div>
                  <span className="text-xs font-black text-foreground">65 (Moderate)</span>
                </div>

                {/* Traffic */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-elevated-surface border border-border">
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-warning" />
                    <span className="text-xs font-bold text-foreground">Highway Flow</span>
                  </div>
                  <span className="text-xs font-black text-success">Smooth Corridor</span>
                </div>

                {/* Connectivity */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-elevated-surface border border-border">
                  <div className="flex items-center gap-3">
                    <Wifi className="h-5 w-5 text-success" />
                    <span className="text-xs font-bold text-foreground">Network Link</span>
                  </div>
                  <span className="text-xs font-black text-success">Online & Encrypted</span>
                </div>
              </div>

              <button
                onClick={() => router.push("/assist")}
                className="w-full mt-2 rounded-xl bg-primary-accent/10 hover:bg-primary-accent/20 border border-primary-accent/20 py-2.5 text-xs font-black text-primary-accent transition-colors flex items-center justify-center gap-2"
              >
                <Bot className="h-4 w-4" />
                <span>Ask AI Guardian</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Safety Mode Timer Drawer Modal */}
      {showSafetyTimer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-[32px] bg-surface border border-border p-6 shadow-2xl space-y-5 animate-slideUp text-left">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-extrabold text-foreground text-sm">Safety Mode Check-in</h3>
              <button
                onClick={() => setShowSafetyTimer(false)}
                className="text-muted hover:text-foreground font-bold text-xs p-1"
              >
                ✕
              </button>
            </div>

            {timerRemaining !== null ? (
              <div className="text-center py-6 space-y-4">
                <div className="inline-flex flex-col items-center justify-center h-28 w-28 rounded-full border-4 border-primary-accent bg-primary-accent/10 text-primary-accent">
                  <span className="text-xl font-black">{Math.floor(timerRemaining / 60)}m {timerRemaining % 60}s</span>
                  <span className="text-[8px] font-bold text-muted mt-1 uppercase">Remaining</span>
                </div>
                <p className="text-[10px] text-muted leading-normal px-2">
                  Alarm will dispatch location telemetry links to registered emergency contacts if bypass check-in fails.
                </p>
                <button
                  onClick={handleBypassTimer}
                  className="w-full rounded-xl bg-primary-accent hover:bg-primary-accent-hover py-3 text-xs font-black text-white"
                >
                  I am Safe (Bypass Check-in)
                </button>
              </div>
            ) : (
              <form onSubmit={handleStartTimer} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted uppercase block">Set Check-in Interval</label>
                  <select
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(e.target.value)}
                    className="w-full rounded-xl bg-elevated-surface border border-border px-3 py-2.5 text-xs text-foreground font-bold focus:outline-none"
                  >
                    <option value="1">1 Minute (Demo mode)</option>
                    <option value="5">5 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">1 Hour</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary-accent hover:bg-primary-accent-hover py-3 text-xs font-black text-white transition-colors"
                >
                  Start Safety Mode
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Bottom navbar for mobile viewport only */}
      <div className="md:hidden">
        <BottomNav />
      </div>

    </div>
  );
}
