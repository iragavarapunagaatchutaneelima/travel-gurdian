"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { 
  Calculator, Shield, Clock, Download, History, AlertTriangle, 
  MapPin, CloudSun, Wind, Car, Wifi, Bell, Send, User, ChevronLeft, ChevronRight, Check, Loader
} from "lucide-react";

export default function HomeDashboard() {
  const router = useRouter();

  // Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    { src: "/hero1.png", title: "Plan Safer Routes", subtitle: "Real-time threat diagnostics & municipal safety mapping coordinates." },
    { src: "/hero2.png", title: "Offline Safety Packs", subtitle: "Preserve navigation coordinates, emergency numbers and guides without network coverage." },
    { src: "/hero3.png", title: "Fail-Safe Dead-man Timers", subtitle: "Automatic GPS coordinates sharing with active dispatch telemetry." }
  ];

  // Auto-play slideshow every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Quick Action Buttons
  const actions = [
    { name: "Plan Journey", href: "/plan", icon: Calculator, desc: "Find safest paths", color: "bg-indigo-50 text-indigo-600" },
    { name: "AI Guardian", href: "/plan", icon: Shield, desc: "Safety advisory", color: "bg-indigo-50 text-indigo-600" },
    { name: "Safety Mode", href: "#", icon: Clock, desc: "Check-in timer", color: "bg-indigo-50 text-indigo-600" },
    { name: "Offline Guardian", href: "/offline", icon: Download, desc: "Save safety pack", color: "bg-indigo-50 text-indigo-600" },
    { name: "My Journeys", href: "/history", icon: History, desc: "History & Logs", color: "bg-indigo-50 text-indigo-600" },
    { name: "Emergency", href: "/emergency", icon: AlertTriangle, desc: "SOS dispatch", color: "bg-red-50 text-red-650" }
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
    { sender: "bot", text: "Namaste! AI GuardBot safety advisor online. Ask me about routes, safe stops, or crime warnings (e.g. Kakinada to Rajahmundry)." }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    // Dynamic Greeting based on time of day
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
        alert("Safety mode timer expired! Location telemetry broadcast simulated.");
        clearInterval(id);
        setTimerRemaining(null);
      }
    }, 1000);
    setTimerId(id);
  };

  const handleBypassTimer = () => {
    if (timerId) clearInterval(timerId);
    setTimerRemaining(null);
    alert("Check-in bypass completed. Status secure.");
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const query = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: "user", text: query }]);
    setChatInput("");
    setChatLoading(true);

    let reply = "I am evaluating safety feeds along your queried route corridors. Avoid travel on unlit sections after dark. Emergency hospital links remain active.";
    const lower = query.toLowerCase();
    
    if (lower.includes("kakinada") && lower.includes("rajahmundry")) {
      reply = "AI Route Diagnostic (Kakinada ➔ Rajahmundry): Route distance is ~65 km via NH 16. It is a well-lit, risk-mitigated corridor. Multiple Reliance and HP Petrol Bunks are active along the route at 12km, 28km, and 45km intervals (with clean restrooms). Weather is cloudy, AQI 54 (Good). Risk score: 92/100 (Safer).";
    } else if (lower.includes("pune") || lower.includes("mumbai")) {
      reply = "AI Route Diagnostic (Mumbai ➔ Pune): Distance is ~165 km via Mumbai-Pune Expressway. Heavy rain warnings active. High risk of waterlogging. Traffic is slow. Safe stops: HP Petrol Bunk 35km, Food Plaza 75km. Safety Score: 78/100 (Caution advised).";
    } else if (lower.includes("women") || lower.includes("female") || lower.includes("solo")) {
      reply = "Solo Safety Guide: Share your live GPS tracking telemetry via 'Emergency Assistance' module. Avoid stopping on quiet street shoulders. HP/Reliance petrol stations are verified municipal CCTV check-in nodes.";
    }

    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: "bot", text: reply }]);
      setChatLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 md:pb-8 flex flex-col items-center">
      
      {/* Sticky header navigation */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6">
        
        {/* Top welcome banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
          <div className="text-left space-y-1">
            <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block">Travel Safety Suite</span>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{greeting}, {userName}</h2>
            <p className="text-xs text-zinc-500 flex items-center gap-1 font-bold">
              <MapPin className="h-4 w-4 text-indigo-600" /> Mumbai, Maharashtra, India
            </p>
          </div>
          
          <div className="flex items-center gap-2 rounded-2xl bg-indigo-50 border border-indigo-150 px-4 py-2.5 text-xs text-indigo-600 font-black">
            <span>Network Link: Online</span>
          </div>
        </div>

        {/* Dynamic Slideshow Banner (Fits full desktop screen width elegantly) */}
        <div className="relative w-full h-[260px] md:h-[350px] rounded-3xl overflow-hidden shadow-sm bg-black border border-zinc-200">
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 bg-cover bg-[position:center_15%] transition-opacity duration-1000 ${
                idx === currentSlide ? "opacity-60 scale-100" : "opacity-0 scale-105"
              }`}
              style={{ backgroundImage: `url(${slide.src})` }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent z-10" />
          
          <div className="absolute inset-y-0 left-8 md:left-12 z-20 flex flex-col justify-center text-left text-white max-w-xl space-y-2">
            <h3 className="font-extrabold text-lg md:text-2xl tracking-tight leading-tight">{slides[currentSlide].title}</h3>
            <p className="text-xs md:text-sm text-zinc-250 font-bold leading-relaxed">{slides[currentSlide].subtitle}</p>
          </div>

          {/* Dots */}
          <div className="absolute bottom-6 right-8 z-20 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentSlide ? "w-6 bg-indigo-600" : "w-2 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Dashboard Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left panel: 6 Quick Actions (Grid of Cards) */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest text-left">
              Quick safety modules
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {actions.map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.name}
                    onClick={() => {
                      if (act.name === "Safety Mode") {
                        setShowSafetyTimer(true);
                      } else if (act.name === "AI Guardian") {
                        setShowAIChat(true);
                      } else {
                        router.push(act.href);
                      }
                    }}
                    className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between min-h-[140px] group"
                  >
                    <div className="flex justify-between items-start">
                      <div className={`rounded-2xl p-3 ${act.color} flex items-center justify-center shadow-inner`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-zinc-300 font-bold group-hover:text-indigo-600 transition-colors text-xs font-mono">➔</span>
                    </div>

                    <div className="mt-4">
                      <h4 className="font-black text-sm text-zinc-900 leading-tight group-hover:text-indigo-600 transition-colors">{act.name}</h4>
                      <span className="text-[10px] text-zinc-400 font-bold block mt-1 uppercase tracking-wider">
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
            
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5 text-left">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                Live Conditions Matrix
              </h3>

              <div className="space-y-4">
                
                {/* Weather */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-150">
                  <div className="flex items-center gap-3">
                    <CloudSun className="h-6 w-6 text-indigo-500" />
                    <span className="text-xs font-bold text-zinc-700">Weather Forecast</span>
                  </div>
                  <span className="text-xs font-black text-zinc-900">26°C, Cloudy</span>
                </div>

                {/* AQI */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-150">
                  <div className="flex items-center gap-3">
                    <Wind className="h-6 w-6 text-cyan-500" />
                    <span className="text-xs font-bold text-zinc-700">Air Quality Index</span>
                  </div>
                  <span className="text-xs font-black text-zinc-900">82 (Fair)</span>
                </div>

                {/* Traffic */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-150">
                  <div className="flex items-center gap-3">
                    <Car className="h-6 w-6 text-amber-500" />
                    <span className="text-xs font-bold text-zinc-700">Traffic Congestion</span>
                  </div>
                  <span className="text-xs font-black text-zinc-900">High Delays</span>
                </div>

                {/* Connectivity */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-150">
                  <div className="flex items-center gap-3">
                    <Wifi className="h-6 w-6 text-emerald-500" />
                    <span className="text-xs font-bold text-zinc-700">System Link</span>
                  </div>
                  <span className="text-xs font-black text-zinc-900">Online</span>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Safety Mode Timer Drawer Modal */}
      {showSafetyTimer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-[32px] bg-white border border-zinc-200 p-6 shadow-2xl space-y-5 animate-slideUp text-left">
            <div className="flex justify-between items-center border-b border-zinc-150 pb-3">
              <h3 className="font-extrabold text-zinc-900 text-sm">Safety Mode Check-in</h3>
              <button
                onClick={() => setShowSafetyTimer(false)}
                className="text-zinc-400 hover:text-zinc-800 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {timerRemaining !== null ? (
              <div className="text-center py-6 space-y-4">
                <div className="inline-flex flex-col items-center justify-center h-28 w-28 rounded-full border-4 border-indigo-500 bg-indigo-50 text-indigo-600">
                  <span className="text-xl font-black">{Math.floor(timerRemaining / 60)}m {timerRemaining % 60}s</span>
                  <span className="text-[8px] font-bold text-zinc-500 mt-1 uppercase">Remaining</span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal px-2">
                  Alarm will dispatch location telemetry links to Sarah Miller if bypass check-in fails.
                </p>
                <button
                  onClick={handleBypassTimer}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-black text-white hover:bg-indigo-500"
                >
                  I am Safe (Bypass)
                </button>
              </div>
            ) : (
              <form onSubmit={handleStartTimer} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase block">Set Check-in Interval</label>
                  <select
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(e.target.value)}
                    className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2.5 text-xs text-zinc-800 font-bold focus:outline-none"
                  >
                    <option value="1">1 Minute (Demo mode)</option>
                    <option value="5">5 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">1 Hour</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-black text-white hover:bg-indigo-500"
                >
                  Start Safety Mode
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* AI Guardian Chat Drawer Modal */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-[32px] bg-white border border-zinc-200 p-6 shadow-2xl space-y-4 flex flex-col max-h-[85vh] animate-slideUp text-left">
            <div className="flex justify-between items-center border-b border-zinc-150 pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-indigo-50 p-2 text-indigo-650">
                  <Shield className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-zinc-900 text-sm">AI GuardBot Assistant</h3>
                  <span className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wide">Contextual Safety Feeds Active</span>
                </div>
              </div>
              <button
                onClick={() => setShowAIChat(false)}
                className="text-zinc-400 hover:text-zinc-800 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[50vh] min-h-[300px]">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs max-w-[85%] font-bold leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-100 text-zinc-850"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-zinc-100 px-4 py-2.5 text-xs text-zinc-455 font-bold flex items-center gap-2">
                    <Loader className="h-3.5 w-3.5 animate-spin" />
                    <span>GuardBot is analyzing safety feeds...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChat} className="flex gap-2 border-t border-zinc-150 pt-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask e.g. Kakinada to Rajahmundry..."
                className="flex-1 rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-xs text-zinc-800 focus:outline-none focus:border-indigo-500 font-bold"
              />
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 text-white px-4 hover:bg-indigo-500 flex items-center justify-center"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
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
