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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-12 flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Banner / Title */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Verified Guardian
              </span>
              <span className="text-xs font-medium text-slate-400">ID: TRV-8942-X</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Traveler Profile
            </h1>
            <p className="text-sm text-slate-500">
              Manage personal emergency identification, home base hub, and safety preferences.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl shadow-inner">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-slate-900">{name}</div>
              <div className="text-xs text-slate-500">{homeCity} Base</div>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {savedSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 text-sm font-medium shadow-sm animate-fadeIn">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Profile information updated successfully!</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Left Column: Quick Stats & Badge */}
          <div className="md:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
              <div className="text-center space-y-3 pb-6 border-b border-slate-100">
                <div className="relative inline-block">
                  <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-md">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-xs">
                    ✓
                  </span>
                </div>
                <div>
                  <h2 className="font-bold text-lg text-slate-900">{name}</h2>
                  <p className="text-xs text-slate-500">{email}</p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-medium text-slate-600">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="flex items-center gap-2 text-slate-500">
                    <MapPin className="h-4 w-4 text-indigo-500" /> Base Hub
                  </span>
                  <span className="font-bold text-slate-900">{homeCity}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Shield className="h-4 w-4 text-emerald-500" /> Trust Level
                  </span>
                  <span className="font-bold text-emerald-600">Level 3 (Safe)</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Award className="h-4 w-4 text-amber-500" /> Badge
                  </span>
                  <span className="font-bold text-slate-900">Highway Scout</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Edit Form */}
          <div className="md:col-span-8">
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Personal Information</h3>
                  <p className="text-xs text-slate-500">Update your verified contact and location details.</p>
                </div>
                <Key className="h-5 w-5 text-slate-400" />
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-2xl bg-slate-50 border border-slate-200 pl-10 pr-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-2xl bg-slate-50 border border-slate-200 pl-10 pr-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-2xl bg-slate-50 border border-slate-200 pl-10 pr-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Home Base City</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <select
                        value={homeCity}
                        onChange={(e) => setHomeCity(e.target.value)}
                        className="w-full rounded-2xl bg-slate-50 border border-slate-200 pl-10 pr-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
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
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Profile Settings</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>

      </main>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
