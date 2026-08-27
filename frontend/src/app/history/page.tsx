"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { Calendar, Clock, Navigation } from "lucide-react";

export default function MyJourneysScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Completed");

  const journeys = [
    {
      from: "Kakinada, Andhra Pradesh",
      to: "Rajahmundry, Andhra Pradesh",
      date: "25 Aug 2026 - 10:30 AM",
      stats: "65 km • 1h 45m",
      status: "Completed",
      badgeColor: "bg-emerald-50 border border-emerald-250 text-emerald-600"
    },
    {
      from: "Mumbai, Maharashtra",
      to: "Pune, Maharashtra",
      date: "8 May 2024 - 10:30 AM",
      stats: "165 km • 3h 15m",
      status: "Completed",
      badgeColor: "bg-emerald-50 border border-emerald-250 text-emerald-600"
    },
    {
      from: "Mumbai, Maharashtra",
      to: "Lonavala, Maharashtra",
      date: "2 May 2024 - 9:20 AM",
      stats: "83 km • 2h 05m",
      status: "Completed",
      badgeColor: "bg-emerald-50 border border-emerald-250 text-emerald-600"
    },
    {
      from: "Pune, Maharashtra",
      to: "Mumbai, Maharashtra",
      date: "28 Apr 2024 - 6:45 PM",
      stats: "165 km • 3h 20m",
      status: "Cancelled",
      badgeColor: "bg-zinc-100 border border-zinc-250 text-zinc-500"
    }
  ];

  const filteredJourneys = journeys.filter(j => j.status === activeTab);

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 md:pb-8 flex flex-col items-center">
      
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6 flex flex-col items-center">
        
        <div className="text-center max-w-xl space-y-2">
          <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block">History Database</span>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">My Journeys</h2>
          <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
            Access previous risk calculations, offline packages compilation logs, and travel vectors history details.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl flex justify-around text-xs font-black text-zinc-500 overflow-hidden shadow-sm">
          {["Upcoming", "Completed", "Cancelled"].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 flex-1 text-center transition-all ${
                  isActive
                    ? "text-indigo-600 bg-indigo-50/40 font-black border-b-2 border-indigo-650"
                    : "hover:text-zinc-800"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* List of Journeys Cards */}
        <div className="w-full max-w-md space-y-4">
          {filteredJourneys.length === 0 ? (
            <div className="text-center text-xs text-zinc-400 py-12 font-bold bg-white border border-zinc-200 rounded-3xl shadow-sm">
              No logged journeys in this category.
            </div>
          ) : (
            filteredJourneys.map((j, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4 text-left flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  
                  {/* Route Label */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-black text-zinc-900">
                      <Navigation className="h-3.5 w-3.5 text-indigo-600 rotate-45" />
                      <span>{j.from.split(",")[0]} ➔ {j.to.split(",")[0]}</span>
                    </div>
                    
                    {/* Date details */}
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{j.date}</span>
                    </div>
                    
                    {/* Stats details */}
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
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
                <div className="border-t border-zinc-150 pt-3">
                  <button
                    onClick={() => router.push(`/map?from=${encodeURIComponent(j.from)}&dest=${encodeURIComponent(j.to)}&route=safer`)}
                    className="w-full rounded-xl bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 py-2.5 text-[10px] font-black text-zinc-700 transition-colors"
                  >
                    View Route Information
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
