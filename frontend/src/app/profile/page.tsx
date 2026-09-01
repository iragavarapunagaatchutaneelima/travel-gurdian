"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { User, Mail, Phone, Shield, ShieldCheck, MapPin, Heart, Clock, Award, Key, Save } from "lucide-react";

export default function ProfilePage() {
  const [name, setName] = useState("Traveler");
  const [email, setEmail] = useState("traveler@guardian.org");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [homeCity, setHomeCity] = useState("Mumbai");
  const [emergencyRelation, setEmergencyRelation] = useState("Spouse/Partner");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user_identity");
      if (stored) {
        let clean = stored;
        if (stored.includes("@")) {
          clean = stored.split("@")[0];
          setEmail(stored);
        }
        setName(clean.charAt(0).toUpperCase() + clean.slice(1));
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("user_identity", name);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      <Header />

      <div className="w-full max-w-4xl px-4 md:px-8 py-6 space-y-6 text-left animate-slideUp">
        
        {/* Header */}
        <div className="border-b border-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black text-primary-accent uppercase tracking-widest block">
              USER PROFILE & CREDENTIALS
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mt-1">
              Traveler Profile
            </h1>
            <p className="text-xs text-muted font-semibold mt-0.5">
              Manage personal emergency identification, home base hub, and safety preferences.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase px-3 py-1.5 rounded-full bg-success/10 border border-success/30 text-success">
              Verified Guardian Account
            </span>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-success/10 border border-success/30 text-success text-xs font-bold flex items-center gap-2 shadow-sm">
            <ShieldCheck className="h-4 w-4" />
            <span>Profile information updated successfully!</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Avatar card */}
          <div className="md:col-span-4 rounded-3xl border border-border bg-surface p-6 text-center space-y-4 shadow-sm transition-colors">
            <div className="h-24 w-24 mx-auto rounded-full bg-primary-accent/10 border-2 border-primary-accent/30 flex items-center justify-center text-primary-accent font-black text-3xl shadow-inner">
              {name.charAt(0).toUpperCase()}
            </div>

            <div>
              <h3 className="text-lg font-black text-foreground">{name}</h3>
              <p className="text-xs text-muted font-semibold">{email}</p>
            </div>

            <div className="pt-4 border-t border-border space-y-2 text-xs font-bold text-muted text-left">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary-accent" /> Base Hub:</span>
                <span className="text-foreground">{homeCity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-success" /> Trust Level:</span>
                <span className="text-success font-black">Level 3 (Safe Traveler)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-warning" /> Badges:</span>
                <span className="text-foreground">Highway Scout</span>
              </div>
            </div>
          </div>

          {/* Edit form */}
          <div className="md:col-span-8 rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-5 transition-colors">
            <h3 className="text-xs font-black text-muted uppercase tracking-widest border-b border-border pb-3">
              Personal Information
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted uppercase">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-2xl bg-elevated-surface border border-border pl-10 pr-4 py-3 text-xs text-foreground font-bold focus:outline-none focus:border-primary-accent"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted uppercase">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl bg-elevated-surface border border-border pl-10 pr-4 py-3 text-xs text-foreground font-bold focus:outline-none focus:border-primary-accent"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted uppercase">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-2xl bg-elevated-surface border border-border pl-10 pr-4 py-3 text-xs text-foreground font-bold focus:outline-none focus:border-primary-accent"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted uppercase">Home Base City</label>
                  <select
                    value={homeCity}
                    onChange={(e) => setHomeCity(e.target.value)}
                    className="w-full rounded-2xl bg-elevated-surface border border-border px-4 py-3 text-xs text-foreground font-bold focus:outline-none focus:border-primary-accent"
                  >
                    <option value="Chennai">Chennai, Tamil Nadu</option>
                    <option value="Mumbai">Mumbai, Maharashtra</option>
                    <option value="Delhi">Delhi, Delhi NCR</option>
                    <option value="Hyderabad">Hyderabad, Telangana</option>
                    <option value="Bangalore">Bangalore, Karnataka</option>
                    <option value="Visakhapatnam">Visakhapatnam, Andhra Pradesh</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-primary-accent hover:bg-primary-accent-hover py-3.5 text-xs font-black text-white transition-all shadow-md flex items-center justify-center gap-2 mt-4"
              >
                <Save className="h-4 w-4" />
                <span>Save Profile Settings</span>
              </button>
            </form>
          </div>

        </div>

      </div>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
