"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Compass, Navigation, Bot, MapPin, User } from "lucide-react";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/dashboard", icon: Compass },
    { name: "Plan", href: "/plan", icon: Navigation },
    { name: "AI Guardian", href: "/assist", icon: Bot },
    { name: "Live Map", href: "/map", icon: MapPin },
    { name: "Profile", href: "/profile", icon: User }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center justify-around px-2 z-40 shadow-lg md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <button
            key={item.name}
            onClick={() => router.push(item.href)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
              isActive ? "text-primary-accent" : "text-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-black tracking-wider uppercase">
              {item.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
