"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("registered_users");
      const usersList = stored ? JSON.parse(stored) : [];
      
      const emailExists = usersList.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        alert("An account with this email already exists. Please login instead.");
        return;
      }

      // Add new account to list
      const newUser = { email, password, name };
      usersList.push(newUser);
      localStorage.setItem("registered_users", JSON.stringify(usersList));
      localStorage.setItem("user_identity", name);
    }
    // Redirect to dashboard (Screen 2)
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[32px] border border-zinc-200 bg-white shadow-xl overflow-hidden flex flex-col">
        
        {/* Top Banner (Purple) */}
        <div className="bg-indigo-600 p-8 text-center text-white flex flex-col items-center justify-center gap-3">
          <div className="rounded-full bg-white/20 p-3">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight leading-none">Travel Guardian</h1>
            <p className="text-[10px] font-bold text-white/80 tracking-wider mt-1.5 uppercase">
              AI-Powered Travel Safety & Convenience Platform
            </p>
          </div>
        </div>

        {/* Form area */}
        <div className="p-8 space-y-6 flex-1 bg-white">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-black text-zinc-900">Create Account</h2>
            <p className="text-xs text-zinc-500 font-bold">Register to start your safe travel vectors.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4 text-left">
            {/* Full Name */}
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3.5 text-xs text-zinc-800 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-400 font-bold"
                required
              />
            </div>

            {/* Email/Phone */}
            <div className="space-y-1">
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3.5 text-xs text-zinc-800 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-400 font-bold"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3.5 text-xs text-zinc-800 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-400 font-bold"
                required
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3.5 text-xs text-zinc-800 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-400 font-bold"
                required
              />
            </div>

            {/* Register button */}
            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-3.5 text-xs font-black text-white hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/10"
            >
              Sign Up
            </button>
          </form>

          {/* Social separator */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-200 w-full" />
            <span className="absolute bg-white px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              or continue with
            </span>
          </div>

          {/* Social login buttons */}
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

          {/* Already have an account link */}
          <div className="text-center text-xs font-bold text-zinc-550 pt-2 border-t border-zinc-150">
            <span>Already have an account? </span>
            <span
              onClick={() => router.push("/")}
              className="text-indigo-600 hover:text-indigo-500 hover:underline cursor-pointer"
            >
              Login
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
