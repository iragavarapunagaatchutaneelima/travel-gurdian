"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Shield, LogOut } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [avatarInitial, setAvatarInitial] = useState("T");

  const navItems = [
    { name: "Home", href: "/dashboard" },
    { name: "Plan Journey", href: "/plan" },
    { name: "Live Map", href: "/map" },
    { name: "My Trips", href: "/history" },
    { name: "Emergency Assistance", href: "/emergency" }
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
  }, []);

  return (
    <header className="w-full bg-white border-b border-zinc-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/dashboard")}>
          <Shield className="h-7 w-7 text-indigo-600" />
          <div className="text-left">
            <h1 className="font-black text-indigo-900 text-sm tracking-wider leading-none">TRAVEL GUARDIAN</h1>
            <p className="text-[8px] font-black text-zinc-400 tracking-[0.15em] mt-0.5">SENSE • ASSESS • GUIDE</p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-black text-zinc-550 uppercase tracking-wider">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <span
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`hover:text-indigo-600 cursor-pointer transition-colors pb-1 ${
                  isActive ? "text-indigo-600 border-b-2 border-indigo-600" : ""
                }`}
              >
                {item.name}
              </span>
            );
          })}
        </nav>

        {/* Right side telemetry status */}
        <div className="flex items-center gap-3.5">
          <div className="hidden sm:flex flex-col text-right leading-none">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase">Tracker status</span>
            <span className="text-[10px] font-black text-indigo-600 mt-1">✓ Secure Link</span>
          </div>

          <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-650 font-black text-xs">
            {avatarInitial}
          </div>

          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("user_identity");
              }
              router.push("/");
            }}
            className="text-zinc-400 hover:text-zinc-800 transition-colors"
            title="Log Out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>

      </div>
    </header>
  );
}
