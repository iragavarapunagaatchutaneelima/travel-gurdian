"use client";

import React from "react";
import Link from "next/link";
import { Shield, Compass, MapPin, LifeBuoy, ArrowLeft, Home } from "lucide-react";
import Header from "./components/Header";

export default function NotFound() {
  return (
    <div 
      className="min-h-screen flex flex-col bg-background text-foreground"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="max-w-lg w-full text-center space-y-6 animate-slideUp">
          
          {/* Visual Icon Badge */}
          <div className="relative inline-block">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-linear-to-tr from-(--primary) to-(--secondary) flex items-center justify-center text-white shadow-xl shadow-(--primary)/20">
              <Compass className="w-12 h-12 animate-pulse" />
            </div>
            <span className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-full bg-danger text-white text-[10px] font-extrabold shadow-md uppercase tracking-wider">
              404
            </span>
          </div>

          {/* Heading and Explanation */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-(--primary) uppercase tracking-widest">
              OFF-ROUTE CORRIDOR
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              Route Corridor Not Found
            </h1>
            <p className="text-xs md:text-sm text-(--muted-foreground) leading-relaxed max-w-md mx-auto">
              The page you are looking for has moved, expired, or doesn't exist. Your safety systems, journey maps, and emergency hotline (112) remain operational.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => window.history.back()}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-border bg-surface text-foreground text-xs font-bold flex items-center justify-center gap-2 hover:bg-elevated-surface shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-(--muted-foreground)" />
              <span>Go Back</span>
            </button>

            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-linear-to-tr from-(--primary) to-(--secondary) text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-(--primary)/25 hover:opacity-90 transition-opacity"
            >
              <Home className="w-4 h-4" />
              <span>Return to Safety (Home)</span>
            </Link>
          </div>

          {/* Quick Safe Nav Links */}
          <div className="pt-6 border-t border-border">
            <p className="text-[11px] font-bold text-(--muted-foreground) uppercase tracking-wider mb-3">
              Quick Safe Destinations
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/plan"
                className="p-3 rounded-2xl bg-surface border border-border text-center hover:border-(--primary) transition-all group"
              >
                <Compass className="w-4 h-4 mx-auto text-(--primary) group-hover:scale-110 transition-transform" />
                <span className="block text-xs font-bold text-foreground mt-1.5">Plan Trip</span>
              </Link>

              <Link
                href="/map"
                className="p-3 rounded-2xl bg-surface border border-border text-center hover:border-(--primary) transition-all group"
              >
                <MapPin className="w-4 h-4 mx-auto text-(--primary) group-hover:scale-110 transition-transform" />
                <span className="block text-xs font-bold text-foreground mt-1.5">Live Map</span>
              </Link>

              <Link
                href="/emergency"
                className="p-3 rounded-2xl bg-surface border border-border text-center hover:border-danger transition-all group"
              >
                <LifeBuoy className="w-4 h-4 mx-auto text-danger group-hover:scale-110 transition-transform" />
                <span className="block text-xs font-bold text-foreground mt-1.5">Emergency</span>
              </Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
