"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Shield, LogOut, Menu, X,
  MapPin, Compass, Navigation, AlertTriangle,
  Bot, History, BookOpen, User, Settings, ChevronRight
} from "lucide-react";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [avatarInitial, setAvatarInitial] = useState("T");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 9 Navigation Items
  const navItems = [
    { name: "Home / Dashboard", href: "/dashboard", icon: Compass },
    { name: "Plan Journey", href: "/plan", icon: Navigation },
    { name: "Live Maps", href: "/map", icon: MapPin },
    { name: "Emergency SOS", href: "/emergency", icon: AlertTriangle, highlight: true },
    { name: "AI Guardian", href: "/assist", icon: Bot },
    { name: "My Journeys", href: "/history", icon: History },
    { name: "Review Session", href: "/guide", icon: BookOpen },
    { name: "Profile", href: "/profile", icon: User },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  // Quick desktop nav links
  const topNavLinks = [
    { name: "Dashboard", href: "/dashboard", icon: Compass },
    { name: "Plan Journey", href: "/plan", icon: Navigation },
    { name: "Live Map", href: "/map", icon: MapPin },
    { name: "AI Guardian", href: "/assist", icon: Bot },
    { name: "Emergency", href: "/emergency", icon: AlertTriangle, isEmergency: true },
  ];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user_identity");
      if (stored) {
        let cleanName = stored;
        if (stored.includes("@")) {
          cleanName = stored.split("@")[0];
        }
        if (cleanName.length > 0) {
          setAvatarInitial(cleanName.charAt(0).toUpperCase());
        }
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsDrawerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigateTo = (href: string) => {
    router.push(href);
    setIsDrawerOpen(false);
  };

  return (
    <>
      {/* ============================================================
          TOP HEADER — White, clean, premium travel navigation
          ============================================================ */}
      <header
        className="w-full sticky top-0 z-40 transition-all duration-200"
        style={{
          backgroundColor: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 2px 8px rgba(37,99,255,0.06)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">

          {/* Left: Hamburger + Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-xl border transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: "#F1F5F9",
                borderColor: "rgba(15,23,42,0.08)",
                color: "#0F172A",
              }}
              aria-label="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Brand Logo */}
            <button
              className="flex items-center gap-2.5 cursor-pointer select-none group"
              onClick={() => router.push("/dashboard")}
            >
              <div
                className="rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #2563FF 0%, #1E40AF 100%)",
                  padding: "8px",
                }}
              >
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <h1
                    className="leading-none tracking-wider"
                    style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: "15px", color: "#0F172A" }}
                  >
                    Travel Guardian
                  </h1>
                </div>
                <p
                  className="mt-0.5 uppercase"
                  style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: "9px", letterSpacing: "0.16em", color: "#2563FF" }}
                >
                  Your Smart Travel Companion
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Pills */}
          <nav
            className="hidden lg:flex items-center gap-1 p-1.5 rounded-full"
            style={{
              backgroundColor: "#F1F5F9",
              border: "1px solid rgba(15,23,42,0.06)",
            }}
          >
            {topNavLinks.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all"
                  style={{
                    fontFamily: "'Poppins',sans-serif",
                    fontWeight: 600,
                    fontSize: "12px",
                    ...(item.isEmergency
                      ? isActive
                        ? { backgroundColor: "#EF4444", color: "#FFFFFF", boxShadow: "0 2px 8px rgba(239,68,68,0.25)" }
                        : { color: "#EF4444", backgroundColor: "transparent" }
                      : isActive
                        ? { backgroundColor: "#2563FF", color: "#FFFFFF", boxShadow: "0 2px 8px rgba(37,99,255,0.25)" }
                        : { color: "#64748B", backgroundColor: "transparent" }
                    ),
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = item.isEmergency ? "rgba(239,68,68,0.08)" : "rgba(37,99,255,0.08)";
                      (e.currentTarget as HTMLElement).style.color = item.isEmergency ? "#EF4444" : "#2563FF";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                      (e.currentTarget as HTMLElement).style.color = item.isEmergency ? "#EF4444" : "#64748B";
                    }
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Avatar + Logout */}
          <div className="flex items-center gap-2">
            {/* User Avatar */}
            <button
              onClick={() => router.push("/profile")}
              className="h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md transition-transform hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #2563FF 0%, #00D4FF 100%)",
                fontFamily: "'Poppins',sans-serif",
                fontWeight: 700,
              }}
              title="View Profile"
            >
              {avatarInitial}
            </button>

            {/* Logout */}
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("user_identity");
                }
                router.push("/");
              }}
              className="p-2 rounded-xl transition-all"
              style={{ color: "#94A3B8" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "#F1F5F9";
                (e.currentTarget as HTMLElement).style.color = "#0F172A";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLElement).style.color = "#94A3B8";
              }}
              title="Return to Landing Page"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 animate-fadeIn"
          style={{ backgroundColor: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* ============================================================
          NAVIGATION DRAWER — White, premium travel sidebar
          ============================================================ */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-out ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "#FFFFFF", borderRight: "1px solid rgba(15,23,42,0.08)" }}
        aria-label="Sidebar Navigation"
      >
        {/* Drawer Header */}
        <div
          className="p-5 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #2563FF 0%, #1E40AF 100%)", padding: "10px" }}
            >
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: "15px", color: "#0F172A", letterSpacing: "0.02em" }}>
                Travel Guardian
              </h2>
              <p style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 500, fontSize: "10px", color: "#64748B", marginTop: "2px" }}>
                Travel Safe • Explore More • Stay Together
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: "#64748B", backgroundColor: "#F1F5F9" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#E2E8F0"}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#F1F5F9"}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <p
            className="px-3 mb-3"
            style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "10px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.12em" }}
          >
            Main Features
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <button
                key={item.name}
                onClick={() => navigateTo(item.href)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left transition-all"
                style={{
                  fontFamily: "'Poppins',sans-serif",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "13px",
                  ...(item.highlight
                    ? isActive
                      ? { backgroundColor: "#FEE2E2", color: "#DC2626" }
                      : { backgroundColor: "#FEF2F2", color: "#EF4444", border: "1px solid rgba(239,68,68,0.15)" }
                    : isActive
                      ? { backgroundColor: "#EFF6FF", color: "#2563FF", border: "1px solid rgba(37,99,255,0.15)" }
                      : { color: "#374151" }
                  ),
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = item.highlight ? "#FEF2F2" : "#F8FAFC";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = item.highlight ? "#FEF2F2" : "transparent";
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      backgroundColor: item.highlight
                        ? "rgba(239,68,68,0.12)"
                        : isActive
                          ? "rgba(37,99,255,0.12)"
                          : "#F1F5F9",
                      color: item.highlight ? "#EF4444" : isActive ? "#2563FF" : "#64748B",
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span>{item.name}</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-40" />
              </button>
            );
          })}
        </nav>

        {/* Drawer Footer — SOS */}
        <div
          className="p-4 space-y-3"
          style={{ borderTop: "1px solid rgba(15,23,42,0.08)", backgroundColor: "#FAFAFA" }}
        >
          <button
            onClick={() => navigateTo("/emergency")}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-white font-bold transition-all active:scale-95"
            style={{
              fontFamily: "'Poppins',sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              backgroundColor: "#EF4444",
              boxShadow: "0 4px 16px rgba(239,68,68,0.30)",
            }}
          >
            <AlertTriangle className="h-4 w-4 animate-pulse" />
            <span>EMERGENCY SOS — CALL 112</span>
          </button>
          <p
            className="text-center"
            style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", fontWeight: 500, color: "#94A3B8" }}
          >
            Travel Guardian • Your Smart Travel Companion
          </p>
        </div>
      </aside>
    </>
  );
}
