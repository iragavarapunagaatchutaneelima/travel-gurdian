"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Shield, LogOut, Menu, X,
  MapPin, Compass, Navigation, AlertTriangle,
  Bot, History, BookOpen, User, Settings, ChevronRight,
  Sun, Moon, Download, Smartphone, CheckCircle2
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePwaManager } from "../../hooks/usePwaManager";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [avatarInitial, setAvatarInitial] = useState("T");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { isInstallable, isInstalled, promptInstall } = usePwaManager();
  const [installMessage, setInstallMessage] = useState<string | null>(null);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await promptInstall();
      if (accepted) {
        setInstallMessage("Installation initiated!");
      }
    } else {
      setInstallMessage("To install: Open browser menu (⋮ or Share) and tap 'Add to Home Screen'.");
      setTimeout(() => setInstallMessage(null), 6000);
    }
  };

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
    setMounted(true);
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

  const toggleTheme = () => {
    const current = resolvedTheme || theme;
    setTheme(current === "dark" ? "light" : "dark");
  };

  const isDarkMode = mounted && (resolvedTheme === "dark" || theme === "dark");

  return (
    <>
      {/* ============================================================
          TOP HEADER — Clean, modern, responsive travel navigation
          ============================================================ */}
      <header
        className="w-full sticky top-0 z-40 transition-colors duration-200"
        style={{
          backgroundColor: isDarkMode ? "rgba(17, 24, 39, 0.92)" : "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(14px)",
          borderBottom: `1px solid var(--border)`,
          boxShadow: isDarkMode ? "0 2px 12px rgba(0, 0, 0, 0.4)" : "0 2px 8px rgba(37,99,255,0.06)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">

          {/* Left: Hamburger + Brand (Logo links to /) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-xl border transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: "var(--elevated-surface)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
              aria-label="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Brand Logo - Phase 7: Clicking logo navigates to / */}
            <button
              className="flex items-center gap-2.5 cursor-pointer select-none group text-left"
              onClick={() => router.push("/")}
              aria-label="Travel Guardian Home"
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
                  <span
                    className="leading-none tracking-wider"
                    style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: "15px", color: "var(--foreground)" }}
                  >
                    Travel Guardian
                  </span>
                </div>
                <p
                  className="mt-0.5 uppercase"
                  style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: "9px", letterSpacing: "0.16em", color: "var(--primary-accent)" }}
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
              backgroundColor: "var(--elevated-surface)",
              border: "1px solid var(--border)",
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
                        : { color: "var(--muted)", backgroundColor: "transparent" }
                    ),
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = item.isEmergency ? "rgba(239,68,68,0.12)" : "var(--soft-blue)";
                      (e.currentTarget as HTMLElement).style.color = item.isEmergency ? "#EF4444" : "var(--primary-accent)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                      (e.currentTarget as HTMLElement).style.color = item.isEmergency ? "#EF4444" : "var(--muted)";
                    }
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Theme Switcher + Avatar + Logout */}
          <div className="flex items-center gap-2">
            
            {/* Phase 50: Theme Toggle Button */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl border transition-all hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: "var(--elevated-surface)",
                  borderColor: "var(--border)",
                  color: isDarkMode ? "#FBBF24" : "#2563FF",
                }}
                aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
                title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}

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
              aria-label="View Profile"
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
              style={{ color: "var(--muted)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--elevated-surface)";
                (e.currentTarget as HTMLElement).style.color = "var(--foreground)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--muted)";
              }}
              title="Return to Landing Page"
              aria-label="Return to Landing Page"
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
          style={{ backgroundColor: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* ============================================================
          NAVIGATION DRAWER (Phase 6)
          ============================================================ */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-out ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "var(--surface)", borderRight: "1px solid var(--border)" }}
        aria-label="Sidebar Navigation"
      >
        {/* Drawer Header */}
        <div
          className="p-5 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: "linear-gradient(135deg, #2563FF 0%, #1E40AF 100%)", padding: "10px" }}
            >
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: "15px", color: "var(--foreground)", letterSpacing: "0.02em" }}>
                Travel Guardian
              </h2>
              <p style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 500, fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                Travel Safe • Explore More • Stay Together
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: "var(--muted)", backgroundColor: "var(--elevated-surface)" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--border)"}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--elevated-surface)"}
            aria-label="Close navigation drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="flex items-center justify-between px-3 mb-3">
            <p
              style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}
            >
              Main Features
            </p>
            {mounted && (
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: "var(--elevated-surface)", border: "1px solid var(--border)", color: isDarkMode ? "#FBBF24" : "#2563FF" }}
              >
                {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                <span style={{ fontSize: "10px" }}>{isDarkMode ? "Light" : "Dark"}</span>
              </button>
            )}
          </div>

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
                      ? { backgroundColor: "rgba(239, 68, 68, 0.2)", color: "#EF4444" }
                      : { backgroundColor: "rgba(239, 68, 68, 0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }
                    : isActive
                      ? { backgroundColor: "var(--soft-blue)", color: "var(--primary-accent)", border: "1px solid rgba(37,99,255,0.25)" }
                      : { color: "var(--foreground)" }
                  ),
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = item.highlight ? "rgba(239,68,68,0.12)" : "var(--elevated-surface)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = item.highlight ? "rgba(239,68,68,0.08)" : "transparent";
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      backgroundColor: item.highlight
                        ? "rgba(239,68,68,0.15)"
                        : isActive
                          ? "rgba(37,99,255,0.15)"
                          : "var(--elevated-surface)",
                      color: item.highlight ? "#EF4444" : isActive ? "var(--primary-accent)" : "var(--muted)",
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

          {/* Phase 15: Offline & Device Tools */}
          <div className="pt-3 pb-1 border-t border-border px-1 mt-2">
            <p
              style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}
              className="mb-2 px-3"
            >
              Offline &amp; Device Tools
            </p>
            
            {/* Download Offline Pack */}
            <button
              onClick={() => navigateTo("/offline")}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-1.5"
              style={{
                backgroundColor: "var(--elevated-surface)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                fontSize: "12px",
                fontWeight: 600
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-(--primary)/10 text-(--primary)">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <p className="leading-tight font-bold">Download Offline Pack</p>
                  <p className="text-[10px] text-muted font-normal">Vector corridors &amp; safe havens</p>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 opacity-40" />
            </button>

            {/* Install Travel Guardian */}
            {isInstalled ? (
              <div
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Travel Guardian Installed</span>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                style={{
                  backgroundColor: "var(--elevated-surface)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                  fontSize: "12px",
                  fontWeight: 600
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-(--primary)/10 text-(--primary)">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="leading-tight font-bold">Install Travel Guardian</p>
                    <p className="text-[10px] text-muted font-normal">
                      {isInstallable ? "Tap to install as Progressive Web App" : "Add to home screen for offline access"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 opacity-40" />
              </button>
            )}

            {installMessage && (
              <p className="text-[10px] font-medium text-(--primary) mt-1.5 px-2 animate-fadeIn">
                {installMessage}
              </p>
            )}
          </div>
        </nav>

        {/* Drawer Footer — SOS Action */}
        <div
          className="p-4 space-y-3"
          style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--elevated-surface)" }}
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
            style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", fontWeight: 500, color: "var(--muted)" }}
          >
            Travel Guardian • Your Smart Travel Companion
          </p>
        </div>
      </aside>
    </>
  );
}
