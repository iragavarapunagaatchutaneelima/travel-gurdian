"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { Calendar, Clock, Navigation, History, MapPin, ArrowRight } from "lucide-react";

export default function MyJourneysScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Completed");

  const journeys = [
    {
      from: "Chennai, Tamil Nadu",
      to: "Bangalore, Karnataka",
      fromKey: "chennai",
      toKey: "bangalore",
      date: "28 Aug 2026 - 08:30 AM",
      stats: "350 km • 5h 20m",
      status: "Completed",
      routeProfile: "Safe Corridor (NH 48)",
      safetyScore: 94,
      badgeColor: "bg-success/10 border border-success/30 text-success"
    },
    {
      from: "Mumbai, Maharashtra",
      to: "Hyderabad, Telangana",
      fromKey: "mumbai",
      toKey: "hyderabad",
      date: "14 Aug 2026 - 06:15 AM",
      stats: "710 km • 10h 30m",
      status: "Completed",
      routeProfile: "Highway Express (NH 65)",
      safetyScore: 86,
      badgeColor: "bg-success/10 border border-success/30 text-success"
    },
    {
      from: "Delhi, Delhi NCR",
      to: "Hyderabad, Telangana",
      fromKey: "delhi",
      toKey: "hyderabad",
      date: "05 Sep 2026 - 06:00 AM",
      stats: "1550 km • 22h 10m",
      status: "Upcoming",
      routeProfile: "National Corridor (NH 44)",
      safetyScore: 91,
      badgeColor: "bg-info/10 border border-info/30 text-info"
    },
    {
      from: "Chennai, Tamil Nadu",
      to: "Visakhapatnam, Andhra Pradesh",
      fromKey: "chennai",
      toKey: "vizag",
      date: "20 Jul 2026 - 09:45 PM",
      stats: "800 km • 13h 15m",
      status: "Cancelled",
      routeProfile: "East Coast Highway (NH 16)",
      safetyScore: 78,
      badgeColor: "bg-elevated-surface border border-border text-muted"
    }
  ];

  const filteredJourneys = journeys.filter(j => j.status === activeTab);

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ backgroundColor: "#F8FAFC", fontFamily: "'Poppins',sans-serif" }}>
      
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 flex flex-col items-center animate-slideUp">
        
        <div className="text-center max-w-xl space-y-2">
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563FF", textTransform: "uppercase", letterSpacing: "0.12em", display: "block" }}>
            Saved Routes &amp; Logs
          </span>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(20px,4vw,28px)", color: "#0F172A" }}>
            My Journeys
          </h2>
          <p style={{ fontSize: "13px", color: "#64748B", fontWeight: 400, lineHeight: 1.6 }}>
            Access previous safety calculations, logged travel vectors, and telemetry reports.
          </p>
        </div>

        {/* Tab Selection */}
        <div
          className="w-full max-w-md rounded-2xl flex justify-around overflow-hidden p-1"
          style={{ backgroundColor: "#F1F5F9", border: "1px solid rgba(15,23,42,0.06)" }}
        >
          {["Upcoming", "Completed", "Cancelled"].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="py-2.5 flex-1 text-center rounded-xl transition-all"
                style={{
                  fontFamily: "'Poppins',sans-serif",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  backgroundColor: isActive ? "#2563FF" : "transparent",
                  color: isActive ? "#FFFFFF" : "#64748B",
                  boxShadow: isActive ? "0 2px 8px rgba(37,99,255,0.25)" : "none",
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Journey Cards */}
        <div className="w-full max-w-lg space-y-4">
          {filteredJourneys.length === 0 ? (
            <div
              className="text-center py-12 rounded-3xl"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)", fontSize: "13px", fontWeight: 500, color: "#94A3B8" }}
            >
              No logged journeys in this category.
            </div>
          ) : (
            filteredJourneys.map((j, idx) => (
              <div
                key={idx}
                className="rounded-3xl p-5 space-y-4 text-left flex flex-col justify-between transition-all"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(15,23,42,0.08)",
                  boxShadow: "0 2px 8px rgba(37,99,255,0.06)",
                }}
              >
                <div className="flex items-start justify-between">
                  
                  {/* Route Label */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2" style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                      <Navigation className="h-3.5 w-3.5 rotate-45" style={{ color: "#2563FF" }} />
                      <span>{j.from.split(",")[0]} ➔ {j.to.split(",")[0]}</span>
                    </div>
                    
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "#2563FF" }}>
                      {j.routeProfile} • Safety: {j.safetyScore}/100
                    </p>

                    {/* Date details */}
                    <div className="flex items-center gap-1.5" style={{ fontSize: "11px", fontWeight: 500, color: "#64748B" }}>
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{j.date}</span>
                    </div>
                    
                    {/* Stats details */}
                    <div className="flex items-center gap-1.5" style={{ fontSize: "11px", fontWeight: 500, color: "#64748B" }}>
                      <Clock className="h-3.5 w-3.5" />
                      <span>{j.stats}</span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className="rounded-xl px-3 py-1.5"
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      backgroundColor: j.status === "Completed" ? "#DCFCE7" : j.status === "Upcoming" ? "#EFF6FF" : "#F1F5F9",
                      color: j.status === "Completed" ? "#16A34A" : j.status === "Upcoming" ? "#2563FF" : "#64748B",
                    }}
                  >
                    {j.status}
                  </span>

                </div>

                {/* Action */}
                <div className="pt-3" style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}>
                  <button
                    onClick={() => router.push(`/map?from=${j.fromKey}&dest=${j.toKey}&mode=Car&routeId=A`)}
                    className="w-full rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all"
                    style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.08)", fontSize: "12px", fontWeight: 600, color: "#374151", fontFamily: "'Poppins',sans-serif" }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#EFF6FF"}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#F8FAFC"}
                  >
                    <span>View Living Map &amp; Route Details</span>
                    <ArrowRight className="h-3.5 w-3.5" style={{ color: "#2563FF" }} />
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

      </div>

      {/* Bottom Nav */}
      <div className="md:hidden">
        <BottomNav />
      </div>

    </div>
  );
}
