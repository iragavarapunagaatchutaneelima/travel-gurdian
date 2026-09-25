"use client";

import React from "react";
import Link from "next/link";
import { 
  Shield, 
  MapPin, 
  Compass, 
  Bot, 
  LifeBuoy, 
  PhoneCall, 
  Mail, 
  ShieldCheck, 
  Download,
  ExternalLink,
  Heart
} from "lucide-react";

export default function Footer() {
  return (
    <footer 
      className="w-full border-t border-border bg-surface text-foreground transition-colors"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 pb-12 border-b border-border">
          
          {/* Col 1: Brand & Identity */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="p-2 rounded-2xl bg-linear-to-tr from-(--primary) to-(--secondary) text-white shadow-md shadow-(--primary)/20 group-hover:scale-105 transition-transform">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-foreground block">
                  Travel Guardian
                </span>
                <span className="text-[10px] font-bold text-(--primary) uppercase tracking-wider block">
                  Intelligent Travel Safety Platform
                </span>
              </div>
            </Link>

            <p className="text-xs md:text-sm text-(--muted-foreground) leading-relaxed max-w-sm">
              Your real-time travel safety companion. Multi-profile route scoring, fail-safe check-in timers, AI-verified havens, and emergency 112 escalation — online and offline.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>112 Emergency Ready</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-(--primary)/10 text-(--primary) border border-(--primary)/20">
                <span>Gemini AI Verified</span>
              </span>
            </div>
          </div>

          {/* Col 2: Navigation & Planning */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs text-(--muted-foreground)">
              <li>
                <Link href="/plan" className="hover:text-(--primary) transition-colors block py-0.5">
                  Plan Journey &amp; Routes
                </Link>
              </li>
              <li>
                <Link href="/map" className="hover:text-(--primary) transition-colors block py-0.5">
                  Live Corridor Map &amp; GPS
                </Link>
              </li>
              <li>
                <Link href="/assist" className="hover:text-(--primary) transition-colors block py-0.5">
                  AI Guardian Assistant
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-(--primary) transition-colors block py-0.5">
                  Traveler Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Safety & Emergency */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Safety Systems
            </h4>
            <ul className="space-y-2 text-xs text-(--muted-foreground)">
              <li>
                <Link href="/emergency" className="hover:text-danger transition-colors block py-0.5 text-danger font-medium">
                  Emergency Hub &amp; SOS
                </Link>
              </li>
              <li>
                <Link href="/offline-mode" className="hover:text-(--primary) transition-colors block py-0.5">
                  Offline Survival Pack
                </Link>
              </li>
              <li>
                <Link href="/guide" className="hover:text-(--primary) transition-colors block py-0.5">
                  Highway Safety Protocols
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-(--primary) transition-colors block py-0.5">
                  Trusted Contacts &amp; Check-In
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Urgent Contact & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Emergency Hotlines
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a 
                  href="tel:112"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 text-danger font-bold border border-red-500/20 hover:bg-red-500/20 transition-all"
                  aria-label="Call National Emergency Line 112"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  <span>National Emergency: 112</span>
                </a>
              </li>
              <li>
                <a 
                  href="tel:108"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                  aria-label="Call Ambulance Hotline 108"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  <span>Ambulance &amp; Trauma: 108</span>
                </a>
              </li>
              <li className="pt-1">
                <Link 
                  href="/guide"
                  className="inline-flex items-center gap-2 text-(--muted-foreground) hover:text-(--primary) transition-colors"
                  aria-label="Travel Guardian Support & Safety Guidelines"
                >
                  <Mail className="h-3.5 w-3.5 text-(--primary)" />
                  <span>Support &amp; Safety Guidelines</span>
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Principles */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-(--muted-foreground)">
          <p>© {new Date().getFullYear()} Travel Guardian. Built for safe journeys across national corridors.</p>
          <div className="flex items-center gap-4">
            <Link href="/guide" className="hover:text-foreground transition-colors">Safety Guide</Link>
            <span>•</span>
            <Link href="/emergency" className="hover:text-foreground transition-colors">Emergency Protocol</Link>
            <span>•</span>
            <Link href="/settings" className="hover:text-foreground transition-colors">Settings</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
