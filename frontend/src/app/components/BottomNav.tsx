"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Navigation, Sparkles, Bell, User } from "lucide-react";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Route", href: "/plan", icon: Navigation },
    { name: "AI", href: "/dashboard?showAI=true", icon: Sparkles },
    { name: "Alerts", href: "/map", icon: Bell },
    { name: "Profile", href: "/dashboard", icon: User }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-zinc-200 flex items-center justify-around px-4 z-40">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <button
            key={item.name}
            onClick={() => router.push(item.href)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1"
          >
            <Icon className={`h-5 w-5 ${isActive ? "text-indigo-600" : "text-zinc-400"}`} />
            <span className={`text-[10px] font-black ${isActive ? "text-indigo-600" : "text-zinc-400"}`}>
              {item.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
