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
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6 flex flex-col items-center animate-slideUp">
        
        <div className="text-center max-w-xl space-y-2">
          <span className="text-[10px] text-primary-accent font-extrabold uppercase tracking-widest block">
            SAVED VECTORS & LOGS
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            My Journeys
          </h2>
          <p className="text-xs text-muted font-semibold leading-relaxed">
            Access previous safety calculations, logged travel vectors across Indian metro corridors, and telemetry reports.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="w-full max-w-md bg-surface border border-border rounded-2xl flex justify-around text-xs font-black text-muted overflow-hidden shadow-sm p-1">
          {["Upcoming", "Completed", "Cancelled"].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2.5 flex-1 text-center rounded-xl transition-all ${
                  isActive
                    ? "text-white bg-primary-accent shadow-sm"
                    : "hover:text-foreground text-muted"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* List of Journeys Cards */}
        <div className="w-full max-w-lg space-y-4">
          {filteredJourneys.length === 0 ? (
            <div className="text-center text-xs text-muted py-12 font-bold bg-surface border border-border rounded-3xl shadow-sm">
              No logged journeys in this category.
            </div>
          ) : (
            filteredJourneys.map((j, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-border bg-surface p-5 shadow-sm space-y-4 text-left flex flex-col justify-between transition-colors hover:border-primary-accent/40"
              >
                <div className="flex items-start justify-between">
                  
                  {/* Route Label */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-black text-foreground">
                      <Navigation className="h-3.5 w-3.5 text-primary-accent rotate-45" />
                      <span>{j.from.split(",")[0]} ➔ {j.to.split(",")[0]}</span>
                    </div>
                    
                    <p className="text-[10px] font-bold text-primary-accent">
                      {j.routeProfile} • Safety: {j.safetyScore}/100
                    </p>

                    {/* Date details */}
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{j.date}</span>
                    </div>
                    
                    {/* Stats details */}
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{j.stats}</span>
                    </div>
                  </div>

                  {/* Status tag */}
                  <span className={`rounded-xl px-3 py-1.5 text-[9px] font-extrabold uppercase ${j.badgeColor}`}>
                    {j.status}
                  </span>

                </div>

                {/* Details actions */}
                <div className="border-t border-border pt-3">
                  <button
                    onClick={() => router.push(`/map?from=${j.fromKey}&dest=${j.toKey}&mode=Car&routeId=A`)}
                    className="w-full rounded-xl bg-elevated-surface border border-border hover:bg-border py-2.5 text-xs font-black text-foreground transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>View Living Map & Route Details</span>
                    <ArrowRight className="h-3.5 w-3.5 text-primary-accent" />
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
