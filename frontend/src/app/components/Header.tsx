"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  Shield, LogOut, Menu, X, Moon, Sun, 
  MapPin, Compass, Navigation, AlertTriangle, 
  Bot, History, BookOpen, User, Settings, PhoneCall
} from "lucide-react";
import { useTheme } from "next-themes";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [avatarInitial, setAvatarInitial] = useState("T");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 9 Navigation Items as required in Phase 3
  const navItems = [
    { name: "Home / Dashboard", href: "/dashboard", icon: Compass },
    { name: "Plan Journey", href: "/plan", icon: Navigation },
    { name: "Live Maps", href: "/map", icon: MapPin },
    { name: "Emergency", href: "/emergency", icon: AlertTriangle },
    { name: "AI Guardian", href: "/assist", icon: Bot },
    { name: "My Journeys", href: "/history", icon: History },
    { name: "Review Session", href: "/guide", icon: BookOpen },
    { name: "Profile", href: "/profile", icon: User },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  // Quick desktop nav links
  const topNavLinks = [
    { name: "Home", href: "/dashboard" },
    { name: "Plan Journey", href: "/plan" },
    { name: "Live Map", href: "/map" },
    { name: "AI Guardian", href: "/assist" },
    { name: "Emergency", href: "/emergency" },
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
      if (e.key === "Escape") {
        setIsDrawerOpen(false);
      }
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
      {/* Top Header Bar */}
      <header className="w-full bg-surface border-b border-border sticky top-0 z-40 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">

          {/* Left side: Hamburger ☰ Button + Logo */}
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-xl bg-elevated-surface hover:bg-border text-foreground transition-all flex items-center justify-center border border-border"
              aria-label="Open Navigation Menu"
              title="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div 
              className="flex items-center gap-2.5 cursor-pointer select-none" 
              onClick={() => router.push("/dashboard")}
            >
              <div className="rounded-xl bg-primary-accent/10 border border-primary-accent/20 p-1.5 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-accent" />
              </div>
              <div className="text-left">
                <h1 className="font-black text-foreground text-sm tracking-wider leading-none">TRAVEL GUARDIAN</h1>
                <p className="text-[8px] font-black text-muted tracking-[0.15em] mt-0.5 uppercase">
                  Sense • Assess • Guide
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-black text-muted uppercase tracking-wider">
            {topNavLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className={`hover:text-primary-accent transition-colors pb-1 border-b-2 font-black ${
                    isActive 
                      ? "text-primary-accent border-primary-accent" 
                      : "border-transparent text-muted"
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </nav>

          {/* Right side tools: Theme toggle, avatar, logout */}
          <div className="flex items-center gap-2 md:gap-3">

            {/* Theme Toggle Button */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-elevated-surface border border-border hover:bg-border text-foreground text-xs font-bold transition-colors"
                title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4 text-amber-400" />
                    <span className="hidden sm:inline text-[11px]">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-indigo-500" />
                    <span className="hidden sm:inline text-[11px]">Dark</span>
                  </>
                )}
              </button>
            )}

            {/* User Profile Avatar */}
            <button 
              onClick={() => router.push("/profile")}
              className="h-8 w-8 rounded-full bg-primary-accent/10 border border-primary-accent/30 flex items-center justify-center text-primary-accent font-black text-xs hover:scale-105 transition-transform"
              title="View Profile"
            >
              {avatarInitial}
            </button>

            {/* Log Out */}
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("user_identity");
                }
                router.push("/");
              }}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-elevated-surface transition-colors"
              title="Return to Landing Page"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity animate-fadeIn"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Collapsible Navigation Drawer */}
      <aside 
        className={`fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-surface border-r border-border z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-out ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Sidebar Menu"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary-accent/10 border border-primary-accent/20 p-2">
              <Shield className="h-6 w-6 text-primary-accent" />
            </div>
            <div>
              <h2 className="font-black text-foreground text-sm tracking-wider leading-none">TRAVEL GUARDIAN</h2>
              <p className="text-[9px] font-bold text-muted tracking-widest mt-0.5 uppercase">Navigation Menu</p>
            </div>
          </div>
          <button 
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 rounded-xl text-muted hover:text-foreground hover:bg-elevated-surface transition-colors"
            title="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items (9 items) */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
          <span className="text-[9px] font-black text-muted uppercase tracking-widest px-3 block mb-2">
            Main Features
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <button
                key={item.name}
                onClick={() => navigateTo(item.href)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-black transition-all text-left ${
                  isActive
                    ? "bg-primary-accent text-white shadow-md shadow-primary-accent/20"
                    : "text-foreground hover:bg-elevated-surface"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 flex-shrink-0 ${isActive ? "text-white" : "text-primary-accent"}`} />
                <span className="tracking-wide">{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Drawer Footer: Theme switch & SOS Button */}
        <div className="p-4 border-t border-border space-y-3 bg-surface">
          {mounted && (
            <div className="flex items-center justify-between px-2 py-1 text-xs text-muted font-bold">
              <span>Theme Preference</span>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-elevated-surface border border-border text-foreground font-black text-xs hover:bg-border transition-colors"
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
                <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
              </button>
            </div>
          )}

          <button
            onClick={() => navigateTo("/emergency")}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-danger hover:opacity-90 py-3.5 text-xs font-black text-white shadow-lg shadow-danger/20 transition-all active:scale-95"
          >
            <AlertTriangle className="h-4.5 w-4.5 animate-pulse" />
            <span>TRIGGER EMERGENCY SOS</span>
          </button>
        </div>
      </aside>
    </>
  );
}
