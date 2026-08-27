"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, Mail, Lock } from "lucide-react";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Initialize mock credentials database on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user_identity");
      
      const defaultUsers = [
        { email: "keerthi@gmail.com", password: "password123", name: "Keerthi" },
        { email: "ril@gmail.com", password: "password123", name: "Ril" }
      ];
      const existing = localStorage.getItem("registered_users");
      if (!existing) {
        localStorage.setItem("registered_users", JSON.stringify(defaultUsers));
      }

      // Prefill remembered credentials if available
      const savedEmail = localStorage.getItem("remembered_email");
      const savedPassword = localStorage.getItem("remembered_password");
      if (savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("registered_users");
      const usersList = stored ? JSON.parse(stored) : [];
      
      const matched = usersList.find(
        (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (!matched) {
        alert("Error: Invalid email or password. If you don't have an account, please click 'Create Account' below to sign up first.");
        return;
      }

      localStorage.setItem("user_identity", matched.name);

      // Handle Remember Me credentials saving
      if (rememberMe) {
        localStorage.setItem("remembered_email", email);
        localStorage.setItem("remembered_password", password);
      } else {
        localStorage.removeItem("remembered_email");
        localStorage.removeItem("remembered_password");
      }
    }
    router.push("/dashboard");
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center relative flex items-center justify-center p-4 md:p-8 font-sans"
      style={{ backgroundImage: `url('/hero1.png')` }}
    >
      {/* Background shadow overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/80 via-indigo-900/40 to-black/50 z-10" />

      {/* Main Grid Wrapper floating on top of the background image */}
      <div className="relative z-20 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Logo, Slogan & Features (Visible on large viewports) */}
        <div className="hidden lg:flex flex-col justify-between h-[600px] flex-1 text-left text-white max-w-xl py-6">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/20 p-2.5 backdrop-blur-md">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="font-black tracking-widest text-md leading-none text-white">TRAVEL GUARDIAN</h1>
              <p className="text-[8px] font-black text-indigo-200 tracking-widest mt-0.5 uppercase">
                SENSE • ASSESS • GUIDE • ASSIST
              </p>
            </div>
          </div>

          {/* Slogan */}
          <div className="space-y-4 my-auto">
            <h2 className="text-5xl font-black tracking-tight leading-tight">
              Travel Safer. <br />
              <span className="text-indigo-300">Travel Smarter.</span>
            </h2>
            <p className="text-sm text-zinc-200 font-bold leading-relaxed">
              AI-powered travel safety and convenience companion for every journey.
            </p>
          </div>

          {/* Translucent Features Bar */}
          <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-5 grid grid-cols-5 gap-3 text-center">
            <div className="space-y-1">
              <div className="text-indigo-300 text-xs">🛡️</div>
              <h4 className="font-extrabold text-[9px] text-white">Safety First</h4>
              <p className="text-[7px] text-zinc-300 font-semibold leading-tight">Real-time alerts & updates.</p>
            </div>

            <div className="space-y-1 border-l border-white/10 pl-2">
              <div className="text-indigo-300 text-xs">🧭</div>
              <h4 className="font-extrabold text-[9px] text-white">Smart Plan</h4>
              <p className="text-[7px] text-zinc-300 font-semibold leading-tight">AI safe route guides.</p>
            </div>

            <div className="space-y-1 border-l border-white/10 pl-2">
              <div className="text-indigo-300 text-xs">☁️</div>
              <h4 className="font-extrabold text-[9px] text-white">Live Context</h4>
              <p className="text-[7px] text-zinc-300 font-semibold leading-tight">Weather, AQI & traffic.</p>
            </div>

            <div className="space-y-1 border-l border-white/10 pl-2">
              <div className="text-indigo-300 text-xs">🚨</div>
              <h4 className="font-extrabold text-[9px] text-white">SOS Help</h4>
              <p className="text-[7px] text-zinc-300 font-semibold leading-tight">One-tap emergency hotlines.</p>
            </div>

            <div className="space-y-1 border-l border-white/10 pl-2">
              <div className="text-indigo-300 text-xs">💾</div>
              <h4 className="font-extrabold text-[9px] text-white">Offline</h4>
              <p className="text-[7px] text-zinc-300 font-semibold leading-tight">Cached maps download.</p>
            </div>
          </div>

        </div>

        {/* Right Side: Float-positioned White Login Card (Overlaying the background photo) */}
        <div className="w-full lg:max-w-md rounded-[32px] border border-zinc-200 bg-white p-8 md:p-10 shadow-2xl text-left space-y-6 lg:ml-auto">
          
          {/* Logo (Shown on mobile inside card instead) */}
          <div className="flex items-center gap-2 justify-center lg:hidden">
            <Shield className="h-6 w-6 text-indigo-600" />
            <h1 className="font-black text-indigo-900 text-sm tracking-wider leading-none">TRAVEL GUARDIAN</h1>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Welcome Back</h2>
            <p className="text-xs text-zinc-500 font-bold">Login to continue your safe journey</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wide block">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-4 h-4 w-4 text-zinc-400" />
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-200 pl-11 pr-4 py-3.5 text-xs text-zinc-800 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-400 font-bold"
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wide block">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 h-4 w-4 text-zinc-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-200 pl-11 pr-11 py-3.5 text-xs text-zinc-800 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-400 font-bold"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-zinc-400 hover:text-zinc-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between text-xs font-bold pt-1">
              <label className="flex items-center gap-2 text-zinc-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Remember me</span>
              </label>
              <span 
                onClick={() => alert("Simulating forgot credentials retrieval links.")}
                className="text-indigo-600 hover:underline cursor-pointer"
              >
                Forgot Password?
              </span>
            </div>

            {/* Login button */}
            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3.5 text-xs font-black text-white transition-colors shadow-md shadow-indigo-650/10"
            >
              Login
            </button>

          </form>

          {/* Separation line */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-200 w-full" />
            <span className="absolute bg-white px-3 text-[10px] font-bold text-zinc-550 uppercase tracking-widest">
              or continue with
            </span>
          </div>

          {/* Social icons */}
          <div className="grid grid-cols-2 gap-3 text-xs font-bold text-zinc-700">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3 hover:bg-zinc-50 transition-colors"
            >
              Google
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3 hover:bg-zinc-50 transition-colors"
            >
              Apple
            </button>
          </div>

          {/* Signup trigger links */}
          <div className="text-center text-xs font-bold text-zinc-500 pt-2 border-t border-zinc-150">
            <span>Don't have an account? </span>
            <span
              onClick={() => router.push("/signup")}
              className="text-indigo-600 hover:text-indigo-500 hover:underline cursor-pointer"
            >
              Create Account
            </span>
          </div>

          {/* Shield Footer */}
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-450 pt-1">
            <Shield className="h-3.5 w-3.5 text-zinc-400" />
            <span>Your journey. Your data. Your control.</span>
          </div>

        </div>

      </div>

    </div>
  );
}
