"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Activity, Calculator, BookOpen, HeartHandshake, Menu, X, AlertTriangle, Compass, Navigation, MapPin, Bot } from "lucide-react";

interface SidebarProps {
  onSOSClick: () => void;
}

export default function Sidebar({ onSOSClick }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Compass },
    { name: "Plan Journey", href: "/plan", icon: Navigation },
    { name: "Live Map", href: "/map", icon: MapPin },
    { name: "Sense Alerts", href: "/sense", icon: Activity },
    { name: "Assess Risk", href: "/assess", icon: Calculator },
    { name: "Safety Guide", href: "/guide", icon: BookOpen },
    { name: "AI Guardian", href: "/assist", icon: Bot },
  ];

  return (
    <>
      {/* Mobile Header */}
      <header className="flex h-16 items-center justify-between px-4 md:hidden" style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid rgba(15,23,42,0.08)", fontFamily: "'Poppins',sans-serif" }}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="rounded-xl p-1.5 text-white shadow-sm" style={{ backgroundColor: "#2563FF" }}>
            <Shield className="h-5 w-5" />
          </div>
          <span style={{ fontWeight: 800, fontSize: "14px", color: "#0F172A", letterSpacing: "0.04em" }}>TRAVEL GUARDIAN</span>
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-xl p-2 transition-colors"
          style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.1)", color: "#0F172A" }}
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Sidebar overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm md:hidden"
          style={{ backgroundColor: "rgba(15,23,42,0.4)" }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed bottom-0 top-16 z-40 flex w-64 flex-col transition-transform duration-300 md:top-0 md:h-screen md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          backgroundColor: "#FFFFFF",
          borderRight: "1px solid rgba(15,23,42,0.08)",
          fontFamily: "'Poppins',sans-serif",
          boxShadow: "2px 0 12px rgba(15,23,42,0.03)",
        }}
      >
        {/* App Logo Desktop */}
        <div className="hidden h-20 items-center gap-3 px-6 md:flex" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
          <div className="rounded-2xl p-2 text-white shadow-sm" style={{ backgroundColor: "#2563FF" }}>
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 style={{ fontSize: "15px", fontWeight: 800, color: "#0F172A", letterSpacing: "0.04em", lineHeight: 1 }}>TRAVEL GUARDIAN</h1>
            <p style={{ fontSize: "9px", fontWeight: 700, color: "#2563FF", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "4px" }}>Safety Intelligence</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-4 py-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3.5 rounded-2xl px-4 py-3 text-xs transition-all"
                style={{
                  fontWeight: isActive ? 700 : 500,
                  backgroundColor: isActive ? "#2563FF" : "transparent",
                  color: isActive ? "#FFFFFF" : "#64748B",
                  boxShadow: isActive ? "0 2px 8px rgba(37,99,255,0.25)" : "none",
                }}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" style={{ color: isActive ? "#FFFFFF" : "#2563FF" }} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* SOS Panel Button */}
        <div className="p-4" style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}>
          <button
            onClick={() => {
              setIsOpen(false);
              onSOSClick();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold text-white shadow-sm transition-all animate-pulse"
            style={{ backgroundColor: "#EF4444" }}
          >
            <AlertTriangle className="h-4.5 w-4.5" />
            <span>TRIGGER SOS (112)</span>
          </button>
        </div>
      </aside>
    </>
  );
}
