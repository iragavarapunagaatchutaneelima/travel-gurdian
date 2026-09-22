"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Compass, Navigation, Bot, MapPin, AlertTriangle } from "lucide-react";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/dashboard", icon: Compass },
    { name: "Plan", href: "/plan", icon: Navigation },
    { name: "Live Map", href: "/map", icon: MapPin },
    { name: "AI Guide", href: "/assist", icon: Bot },
    { name: "SOS", href: "/emergency", icon: AlertTriangle, isEmergency: true },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 md:hidden"
      style={{
        height: "64px",
        backgroundColor: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 -4px 16px rgba(37,99,255,0.08)",
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
                ? "#EF4444"
                : isActive
                  ? "#2563FF"
                  : "#94A3B8",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: isActive ? 700 : 500,
            }}
          >
            {/* Active indicator dot */}
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full"
                style={{ backgroundColor: item.isEmergency ? "#EF4444" : "#2563FF" }}
              />
            )}

            <div
              className="p-1.5 rounded-xl transition-all"
              style={{
                backgroundColor: isActive
                  ? item.isEmergency
                    ? "rgba(239,68,68,0.10)"
                    : "rgba(37,99,255,0.10)"
                  : "transparent",
                transform: isActive ? "scale(1.1)" : "scale(1)",
              }}
            >
              <Icon className="h-5 w-5" />
            </div>

            <span
              className="leading-none"
              style={{ fontSize: "10px", letterSpacing: "0.04em" }}
            >
              {item.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
