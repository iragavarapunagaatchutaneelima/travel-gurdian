"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Navigation, Bot, MapPin, AlertTriangle, ShieldCheck, WifiOff } from "lucide-react";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  // Primary navigation: Plan Journey, Live Maps, Offline Maps, AI Guardian, Safety Check, Emergency.
  const navItems = [
    { name: "Plan", href: "/plan", icon: Navigation },
    { name: "Live Map", href: "/map", icon: MapPin },
    { name: "Offline", href: "/offline", icon: WifiOff },
    { name: "AI Guide", href: "/assist", icon: Bot },
    { name: "Safety", href: "/safety-check", icon: ShieldCheck },
    { name: "SOS", href: "/emergency", icon: AlertTriangle, isEmergency: true },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-1 md:hidden"
      style={{
        height: "64px",
        backgroundColor: "var(--tg-surface)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid var(--tg-border)",
        boxShadow: "0 -4px 16px var(--tg-surface-soft)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <button
            key={item.name}
            onClick={() => router.push(item.href)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 relative rounded-xl transition-all min-h-[44px]"
            style={{
              color: item.isEmergency
                ? "var(--tg-danger)"
                : isActive
                  ? "var(--tg-primary)"
                  : "var(--tg-muted)",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: isActive ? 700 : 500,
            }}
          >
            {/* Active indicator dot */}
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full"
                style={{ backgroundColor: item.isEmergency ? "var(--tg-danger)" : "var(--tg-primary)" }}
              />
            )}

            <div
              className="p-1.5 rounded-xl transition-all"
              style={{
                backgroundColor: isActive
                  ? item.isEmergency
                    ? "var(--tg-danger-light)"
                    : "var(--tg-surface-soft)"
                  : "transparent",
                transform: isActive ? "scale(1.1)" : "scale(1)",
              }}
            >
              <Icon className="h-5 w-5" />
            </div>

            <span
              className="leading-none"
              style={{ fontSize: "9.5px", letterSpacing: "0.02em" }}
            >
              {item.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
