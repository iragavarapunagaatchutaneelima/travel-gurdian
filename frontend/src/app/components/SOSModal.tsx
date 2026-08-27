"use client";

import React, { useState, useEffect } from "react";
import { TravelGuardianAPI } from "../../services/api";
import { type SOSResponse } from "../../types/api";
import { AlertCircle, ShieldAlert, Phone, X, Navigation, CheckCircle, Loader } from "lucide-react";

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SOSModal({ isOpen, onClose }: SOSModalProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [sosResult, setSosResult] = useState<SOSResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(null);
      setSosResult(null);
      setError(null);
      return;
    }

    // Start 3-second countdown automatically on trigger
    setCountdown(5);
  }, [isOpen]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      setCountdown(null);
      sendSOS();
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown]);

  const sendSOS = () => {
    setLoading(true);
    setError(null);

    // Get current coordinates
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await TravelGuardianAPI.triggerSOS({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              custom_message: "SOS! Urgent assistance needed. I am broadcasting my live coordinates."
            });
            setSosResult(res);
          } catch (e: any) {
            setError("Failed to reach emergency api. Broadcasting locally.");
            fallbackSOS(position.coords.latitude, position.coords.longitude);
          } finally {
            setLoading(false);
          }
        },
        async (err) => {
          // Geolocation error - fallback to mock coords
          console.warn("Geolocation permission denied. Mocking coordinates.", err);
          try {
            const res = await TravelGuardianAPI.triggerSOS({
              latitude: -22.9068, // Default to mock Rio coordinates
              longitude: -43.1729,
              custom_message: "SOS! Urgent assistance. Location permissions unavailable."
            });
            setSosResult(res);
          } catch (e) {
            setError("Unable to dispatch SOS alert.");
          } finally {
            setLoading(false);
          }
        }
      );
    } else {
      // Geolocation not supported - fallback to mock coords
      fallbackSOS(-22.9068, -43.1729);
    }
  };

  const fallbackSOS = async (lat: number, lon: number) => {
    try {
      const res = await TravelGuardianAPI.triggerSOS({
        latitude: lat,
        longitude: lon,
        custom_message: "Emergency broadcast activated."
      });
      setSosResult(res);
    } catch {
      setError("Critical: Dispatch systems offline.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
      {/* Modal Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-red-500/20 bg-zinc-950 p-8 shadow-2xl shadow-red-950/20">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-2 text-red-500">
            <ShieldAlert className="h-6 w-6 animate-pulse" />
            <h2 className="text-xl font-black tracking-wider">EMERGENCY SOS PORTAL</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-zinc-900 p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1. Countdown screen */}
        {countdown !== null && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-red-950/40 border-4 border-red-500 animate-pulse">
              <span className="text-6xl font-black text-red-500">{countdown}</span>
            </div>
            <h3 className="mt-6 text-xl font-bold text-white">Broadcasting Emergency Alert...</h3>
            <p className="mt-2 text-sm text-zinc-400 max-w-sm">
              Press cancel below immediately if this is a false alarm. Otherwise, we will notify your guardians and query safe havens.
            </p>
            <button
              onClick={onClose}
              className="mt-8 rounded-xl bg-zinc-900 border border-zinc-800 px-6 py-2.5 text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              CANCEL BROADCAST
            </button>
          </div>
        )}

        {/* 2. Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader className="h-12 w-12 text-red-500 animate-spin" />
            <h3 className="mt-4 font-bold text-white text-lg">Broadcasting Live Coordinates...</h3>
          </div>
        )}

        {/* 3. Error state */}
        {error && !loading && !sosResult && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h3 className="mt-4 font-bold text-white text-lg">Transmission Error</h3>
            <p className="mt-2 text-sm text-zinc-400">{error}</p>
            <button
              onClick={sendSOS}
              className="mt-6 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-500"
            >
              RETRY BROADCAST
            </button>
          </div>
        )}

        {/* 4. SOS Dispatch Results */}
        {sosResult && !loading && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 p-4 text-emerald-400">
              <CheckCircle className="h-6 w-6 flex-shrink-0" />
              <div>
                <h4 className="font-black text-sm">GUARDIAN ALERTS DISPATCHED</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Your live telemetry has been sent to emergency contacts.</p>
              </div>
            </div>

            {/* Telemetry info */}
            <div className="rounded-2xl bg-zinc-900/60 p-4 border border-zinc-800/80">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Transmitted Location Info</h4>
              <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                <div>
                  <span className="text-zinc-500 text-xs">Latitude</span>
                  <p className="text-white font-mono mt-0.5">{sosResult.latitude.toFixed(6)}</p>
                </div>
                <div>
                  <span className="text-zinc-500 text-xs">Longitude</span>
                  <p className="text-white font-mono mt-0.5">{sosResult.longitude.toFixed(6)}</p>
                </div>
              </div>
            </div>

            {/* Nearest Safe Havens */}
            <div>
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Nearest Safe Havens (Hospital/Police)</h4>
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {sosResult.nearest_havens.map((haven, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl bg-zinc-900 p-3.5 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Navigation className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h5 className="font-bold text-white text-xs leading-none">{haven.name}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="rounded bg-red-950/40 border border-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
                            {haven.type}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-semibold">{haven.distance_km} km away</span>
                        </div>
                      </div>
                    </div>
                    
                    <a
                      href={`tel:${haven.phone}`}
                      className="rounded-full bg-zinc-800 p-2 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct hotline call */}
            <div className="flex gap-3 mt-6">
              <a
                href="tel:911"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 font-bold text-white hover:bg-red-500 text-sm"
              >
                <Phone className="h-5 w-5" />
                CALL PUBLIC EMERGENCY (911)
              </a>
              <button
                onClick={onClose}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-3.5 font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white text-sm"
              >
                DISMISS
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
