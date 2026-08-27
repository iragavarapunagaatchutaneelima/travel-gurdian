"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Activity, Calculator, BookOpen, HeartHandshake, Menu, X, AlertTriangle } from "lucide-react";

interface SidebarProps {
  onSOSClick: () => void;
}

export default function Sidebar({ onSOSClick }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Shield },
    { name: "Sense Alerts", href: "/sense", icon: Activity },
    { name: "Assess Risk", href: "/assess", icon: Calculator },
    { name: "Safety Guide", href: "/guide", icon: BookOpen },
    { name: "Assist Hub", href: "/assist", icon: HeartHandshake },
  ];

  return (
    <>
      {/* Mobile Header */}
      <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-emerald-500" />
          <span className="font-bold text-white tracking-wider">TRAVEL GUARDIAN</span>
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed bottom-0 top-16 z-40 flex w-64 flex-col border-r border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md transition-transform duration-300 md:top-0 md:h-screen md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* App Logo Desktop */}
        <div className="hidden h-20 items-center gap-3 border-b border-zinc-800/80 px-6 md:flex">
          <Shield className="h-8 w-8 text-emerald-500 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
          <div>
            <h1 className="font-extrabold text-white text-lg tracking-wider">TRAVEL</h1>
            <p className="text-[10px] font-bold text-emerald-500 tracking-[0.25em] -mt-1.5">GUARDIAN</p>
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
                className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/5 text-emerald-400 border-l-2 border-emerald-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                    : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* SOS Panel Button */}
        <div className="p-4 border-t border-zinc-900">
          <button
            onClick={() => {
              setIsOpen(false);
              onSOSClick();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600/90 py-3.5 text-sm font-black text-white shadow-lg shadow-red-950/20 transition-all duration-200 hover:bg-red-500 hover:shadow-red-950/40 active:scale-95 animate-pulse"
          >
            <AlertTriangle className="h-5 w-5" />
            TRIGGER SOS
          </button>
        </div>
      </aside>
    </>
  );
}
