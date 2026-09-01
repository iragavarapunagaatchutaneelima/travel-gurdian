"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight, Sun, Moon, Sparkles, Navigation, AlertTriangle, Download, HeartHandshake } from "lucide-react";
import { useTheme } from "next-themes";

export default function LandingScreen() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGetStarted = () => {
    router.push("/dashboard");
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center relative flex flex-col justify-between font-sans transition-colors duration-300"
      style={{ backgroundImage: `url('/hero1.png')` }}
    >
      {/* Background shadow overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90 z-10" />

      {/* Top Header Bar with Theme Toggle */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/10 p-2.5 backdrop-blur-md border border-white/20 shadow-lg">
            <Shield className="h-6 w-6 text-primary-accent" />
          </div>
          <div className="text-left">
            <h2 className="font-black text-white text-base tracking-widest leading-none">TRAVEL GUARDIAN</h2>
            <p className="text-[9px] font-black text-primary-accent-hover tracking-[0.2em] uppercase mt-0.5">
              AI Safety Companion
            </p>
          </div>
        </div>

        {/* Top Right: Theme Switcher & Status */}
        <div className="flex items-center gap-3">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold transition-all hover:scale-105 shadow-md"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4 text-amber-400" />
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-indigo-400" />
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleGetStarted}
            className="px-4 py-2 rounded-full bg-primary-accent hover:bg-primary-accent-hover text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-primary-accent/30"
          >
            Enter App →
          </button>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="relative z-20 w-full max-w-5xl mx-auto flex flex-col items-center justify-center text-center gap-8 py-8 px-4 md:px-8">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black text-white/90 uppercase tracking-widest shadow-md">
          <Sparkles className="h-3.5 w-3.5 text-primary-accent-hover" />
          <span>Next-Gen Travel Safety & Guidance</span>
        </div>

        {/* Slogan & Intro */}
        <div className="space-y-6 max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight text-white drop-shadow-2xl">
            Travel Safer. <br />
            <span className="text-primary-accent-hover">Travel Smarter.</span>
          </h1>
          <p className="text-base md:text-xl text-zinc-250 font-semibold leading-relaxed max-w-2xl mx-auto">
            AI-powered travel safety companion. Real-time threat diagnostics, 6-city cross-compatible safe routing, interactive living maps, and instant emergency SOS telemetry.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="pt-2">
          <button
            onClick={handleGetStarted}
            className="group flex items-center gap-3.5 rounded-full bg-primary-accent hover:bg-primary-accent-hover px-10 py-5 text-base md:text-lg font-black text-white transition-all shadow-2xl hover:shadow-primary-accent/40 hover:-translate-y-1 active:translate-y-0"
          >
            <span>GET STARTED</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
          </button>
        </div>

        {/* Translucent Features Bar */}
        <div className="mt-6 w-full max-w-4xl bg-black/40 backdrop-blur-md border border-white/15 rounded-3xl p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center shadow-xl">
          <div className="space-y-2">
            <div className="text-primary-accent-hover text-2xl">🛡️</div>
            <h4 className="font-extrabold text-xs md:text-sm text-white uppercase tracking-wider">AI Guardian</h4>
            <p className="text-[11px] text-zinc-300 font-semibold leading-relaxed">Real-time threat diagnostics</p>
          </div>

          <div className="space-y-2 md:border-l border-white/15 md:pl-6">
            <div className="text-primary-accent-hover text-2xl">🧭</div>
            <h4 className="font-extrabold text-xs md:text-sm text-white uppercase tracking-wider">Route Intelligence</h4>
            <p className="text-[11px] text-zinc-300 font-semibold leading-relaxed">Multi-profile route scoring</p>
          </div>

          <div className="space-y-2 border-t md:border-t-0 md:border-l border-white/15 pt-6 md:pt-0 md:pl-6">
            <div className="text-primary-accent-hover text-2xl">🚨</div>
            <h4 className="font-extrabold text-xs md:text-sm text-white uppercase tracking-wider">Emergency / SOS</h4>
            <p className="text-[11px] text-zinc-300 font-semibold leading-relaxed">Instant 112 hotline & telemetry</p>
          </div>

          <div className="space-y-2 border-t md:border-t-0 md:border-l border-white/15 pt-6 md:pt-0 md:pl-6">
            <div className="text-primary-accent-hover text-2xl">📍</div>
            <h4 className="font-extrabold text-xs md:text-sm text-white uppercase tracking-wider">Living Maps</h4>
            <p className="text-[11px] text-zinc-300 font-semibold leading-relaxed">Interactive POIs & GPS markers</p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-20 w-full py-4 text-center text-xs font-semibold text-zinc-400">
        Travel Guardian • Hackathon Travel Safety & Guidance Platform • Default Dark Theme
      </footer>
    </div>
  );
}
