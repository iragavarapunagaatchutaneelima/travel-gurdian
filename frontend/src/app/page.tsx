"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight, Navigation, AlertTriangle, Download, Compass, MapPin, Bot, ShieldCheck, Sparkles } from "lucide-react";

export default function LandingScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/dashboard");
  };

  const features = [
    {
      icon: Bot,
      title: "AI Guardian",
      desc: "Context-aware safety insights powered by Gemini AI",
      color: "#2563FF",
      bgColor: "#EFF6FF",
      href: "/assist",
    },
    {
      icon: Compass,
      title: "Route Intelligence",
      desc: "Multi-profile Safety Fit scoring on real Google routes",
      color: "#2563FF",
      bgColor: "#EFF6FF",
      href: "/plan",
    },
    {
      icon: AlertTriangle,
      title: "Emergency SOS",
      desc: "Direct 112 hotline & trusted contact escalation",
      color: "#EF4444",
      bgColor: "#FEF2F2",
      href: "/emergency",
    },
    {
      icon: MapPin,
      title: "Live Navigation",
      desc: "Safe havens, turn guidance & offline vector maps",
      color: "#22C55E",
      bgColor: "#F0FDF4",
      href: "/map",
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ backgroundColor: "#F8FAFC", fontFamily: "'Poppins', sans-serif" }}
    >
      {/* ============================================================
          TOP NAVIGATION BAR
          ============================================================ */}
      <header
        className="w-full sticky top-0 z-40"
        style={{
          backgroundColor: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 2px 8px rgba(37,99,255,0.06)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #2563FF 0%, #1E40AF 100%)", padding: "9px" }}
            >
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: "16px", color: "#0F172A", letterSpacing: "0.02em", margin: 0 }}>
                Travel Guardian
              </h1>
              <p style={{ fontWeight: 500, fontSize: "9px", color: "#2563FF", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>
                Your Smart Travel Companion
              </p>
            </div>
          </div>

          {/* Nav right */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, #2563FF 0%, #1E40AF 100%)",
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: "13px",
                boxShadow: "0 4px 12px rgba(37,99,255,0.25)",
              }}
            >
              <span>Launch App</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================
          HERO SECTION — Light blue gradient, clean mobile-app style
          ============================================================ */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 40%, #E0F2FE 70%, #F0F9FF 100%)" }}>
        {/* Decorative circles */}
        <div
          className="absolute -top-24 -right-24 rounded-full opacity-30"
          style={{ width: "400px", height: "400px", background: "radial-gradient(circle, #2563FF 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-16 -left-16 rounded-full opacity-20"
          style={{ width: "300px", height: "300px", background: "radial-gradient(circle, #00D4FF 0%, transparent 70%)" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left text */}
            <div className="flex-1 text-center lg:text-left space-y-6">
              {/* Tag */}
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                style={{ backgroundColor: "rgba(37,99,255,0.1)", color: "#2563FF", fontWeight: 600, fontSize: "12px" }}
              >
                <Sparkles className="h-4 w-4" />
                <span>AI-Powered Travel Safety</span>
              </div>

              {/* Heading */}
              <h1
                className="leading-tight"
                style={{ fontWeight: 800, fontSize: "clamp(32px,5vw,56px)", color: "#0F172A", lineHeight: 1.15 }}
              >
                Travel Safe.{" "}
                <span style={{ background: "linear-gradient(135deg, #2563FF 0%, #00D4FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Explore More.
                </span>
                <br />Stay Together.
              </h1>

              <p style={{ fontWeight: 400, fontSize: "16px", color: "#64748B", lineHeight: 1.7, maxWidth: "480px" }}>
                Your personal AI travel guardian. Real-time route safety scoring, fail-safe check-in timers, emergency SOS, and offline survival intelligence — all in one app.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 items-center lg:items-start justify-center lg:justify-start">
                <button
                  onClick={handleGetStarted}
                  className="flex items-center gap-2.5 px-8 py-4 rounded-2xl text-white font-semibold text-base transition-all active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #2563FF 0%, #1E40AF 100%)",
                    fontWeight: 700,
                    fontSize: "15px",
                    boxShadow: "0 6px 24px rgba(37,99,255,0.30)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(37,99,255,0.40)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(37,99,255,0.30)";
                  }}
                >
                  <span>Start Your Journey</span>
                  <ArrowRight className="h-5 w-5" />
                </button>

                <button
                  onClick={() => router.push("/offline-mode")}
                  className="flex items-center gap-2.5 px-7 py-4 rounded-2xl font-semibold transition-all"
                  style={{
                    backgroundColor: "#FFFFFF",
                    color: "#2563FF",
                    border: "1.5px solid rgba(37,99,255,0.25)",
                    fontWeight: 600,
                    fontSize: "15px",
                    boxShadow: "0 2px 8px rgba(37,99,255,0.08)",
                  }}
                >
                  <Download className="h-4 w-4" />
                  <span>Offline Guardian</span>
                </button>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-4 items-center justify-center lg:justify-start pt-2">
                {[
                  { label: "Real Google Routes", icon: "✓" },
                  { label: "Gemini AI Powered", icon: "✓" },
                  { label: "Works Offline", icon: "✓" },
                  { label: "112 Emergency Ready", icon: "✓" },
                ].map((b) => (
                  <div key={b.label} className="flex items-center gap-1.5" style={{ color: "#64748B", fontSize: "12px", fontWeight: 500 }}>
                    <span style={{ color: "#22C55E", fontWeight: 700 }}>{b.icon}</span>
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right illustration — visual phone mockup */}
            <div className="flex-shrink-0">
              <div
                className="relative rounded-3xl overflow-hidden flex items-center justify-center animate-float"
                style={{
                  width: "280px",
                  height: "380px",
                  background: "linear-gradient(145deg, #FFFFFF 0%, #EFF6FF 100%)",
                  boxShadow: "0 24px 64px rgba(37,99,255,0.15), 0 8px 24px rgba(15,23,42,0.08)",
                  border: "1px solid rgba(37,99,255,0.12)",
                }}
              >
                {/* Mock UI inside card */}
                <div className="p-6 space-y-4 w-full">
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-2xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #2563FF, #1E40AF)", padding: "10px" }}
                    >
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "13px", color: "#0F172A" }}>Travel Guardian</p>
                      <p style={{ fontWeight: 500, fontSize: "10px", color: "#22C55E" }}>● Active & Monitoring</p>
                    </div>
                  </div>

                  <div className="rounded-2xl p-4 space-y-2" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
                    <p style={{ fontSize: "10px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em" }}>Current Route</p>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>Chennai → Bangalore</p>
                    <div className="flex justify-between">
                      <span style={{ fontSize: "11px", color: "#64748B" }}>5h 20m • 350 km</span>
                      <span
                        className="rounded-full px-2 py-0.5"
                        style={{ fontSize: "10px", fontWeight: 700, backgroundColor: "#DCFCE7", color: "#16A34A" }}
                      >
                        94/100 Safe
                      </span>
                    </div>
                  </div>

                  {[
                    { label: "Safety Check-In", status: "Active", color: "#22C55E" },
                    { label: "AI Guardian", status: "Online", color: "#2563FF" },
                    { label: "Emergency 112", status: "Ready", color: "#EF4444" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.06)" }}>
                      <span style={{ fontSize: "11px", fontWeight: 500, color: "#374151" }}>{item.label}</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: item.color }}>● {item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURES GRID — White cards
          ============================================================ */}
      <section className="py-16 md:py-20" style={{ backgroundColor: "#F8FAFC" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Section Header */}
          <div className="text-center mb-12 space-y-2">
            <p style={{ fontWeight: 700, fontSize: "12px", color: "#2563FF", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Everything You Need
            </p>
            <h2 style={{ fontWeight: 800, fontSize: "clamp(24px,4vw,36px)", color: "#0F172A" }}>
              Your Complete Travel Safety Suite
            </h2>
            <p style={{ fontWeight: 400, fontSize: "15px", color: "#64748B", maxWidth: "480px", margin: "8px auto 0" }}>
              Phases 0–9 of intelligent safety infrastructure, always with you.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <button
                  key={feat.title}
                  onClick={() => router.push(feat.href)}
                  className="p-6 rounded-3xl text-left transition-all group"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid rgba(15,23,42,0.08)",
                    boxShadow: "0 2px 8px rgba(37,99,255,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(37,99,255,0.14)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(37,99,255,0.06)";
                  }}
                >
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: feat.bgColor }}
                  >
                    <Icon className="h-6 w-6" style={{ color: feat.color }} />
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: "15px", color: "#0F172A", marginBottom: "6px" }}>{feat.title}</h3>
                  <p style={{ fontWeight: 400, fontSize: "13px", color: "#64748B", lineHeight: 1.6 }}>{feat.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          BOTTOM CTA STRIP
          ============================================================ */}
      <section
        className="py-16"
        style={{ background: "linear-gradient(135deg, #2563FF 0%, #1E40AF 100%)" }}
      >
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="rounded-2xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(24px,4vw,36px)", color: "#FFFFFF" }}>
            Ready to Travel Safer?
          </h2>
          <p style={{ fontWeight: 400, fontSize: "16px", color: "rgba(255,255,255,0.80)", lineHeight: 1.7 }}>
            Join thousands of travelers using Travel Guardian for AI-powered route safety, emergency readiness, and offline-first protection.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-semibold transition-all"
            style={{
              backgroundColor: "#FFFFFF",
              color: "#2563FF",
              fontWeight: 700,
              fontSize: "15px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.20)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
            }}
          >
            <span>Get Started — It's Free</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-6 text-center"
        style={{
          backgroundColor: "#F1F5F9",
          borderTop: "1px solid rgba(15,23,42,0.08)",
          fontFamily: "'Poppins',sans-serif",
          fontSize: "12px",
          fontWeight: 500,
          color: "#94A3B8",
        }}
      >
        Travel Guardian • Travel Safe • Explore More • Stay Together
      </footer>
    </div>
  );
}
