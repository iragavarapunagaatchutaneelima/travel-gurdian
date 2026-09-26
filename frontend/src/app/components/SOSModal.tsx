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
  // Opening the modal NEVER starts a countdown to real dispatch by itself --
  // the user must explicitly tap "Send SOS Now" first. Only after that
  // explicit confirmation does a short, cancellable countdown run.
  const [confirmed, setConfirmed] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [sosResult, setSosResult] = useState<SOSResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setConfirmed(false);
      setCountdown(null);
      setSosResult(null);
      setError(null);
    }
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

  const handleConfirmSend = () => {
    setConfirmed(true);
    setCountdown(5);
  };

  const sendSOS = () => {
    setLoading(true);
    setError(null);

    // Get current coordinates. If GPS is unavailable, dispatch WITHOUT a
    // fabricated location rather than sending a fake 0,0 ("Null Island")
    // coordinate -- the backend already handles a missing location honestly.
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
            setError("Emergency communication failed. Please dial 112 directly.");
          } finally {
            setLoading(false);
          }
        },
        async (err) => {
          console.warn("Geolocation unavailable or denied.", err);
          try {
            const res = await TravelGuardianAPI.triggerSOS({
              custom_message: "SOS! Urgent assistance requested. Live GPS coordinates unavailable."
            });
            setSosResult(res);
          } catch (e) {
            setError("Emergency communication failed. Please dial 112 directly.");
          } finally {
            setLoading(false);
          }
        }
      );
    } else {
      TravelGuardianAPI.triggerSOS({
        custom_message: "Emergency broadcast activated. Live GPS coordinates unavailable."
      })
        .then(setSosResult)
        .catch(() => setError("Emergency communication failed. Dispatch systems offline. Please dial 112 directly."))
        .finally(() => setLoading(false));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md" style={{ backgroundColor: "rgba(15,23,42,0.4)", fontFamily: "'Poppins',sans-serif" }}>
      {/* Modal Card */}
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl p-6 md:p-8 shadow-2xl animate-slideUp text-left"
        style={{
          backgroundColor: "#FFFFFF",
          border: "2px solid #EF4444",
          boxShadow: "0 20px 40px rgba(239,68,68,0.12)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
          <div className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-6 w-6 animate-pulse" />
            <h2 style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "0.04em", color: "#DC2626" }}>EMERGENCY SOS PORTAL</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors"
            style={{ backgroundColor: "#F1F5F9", color: "#64748B" }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 0. Explicit confirmation screen -- shown first, always. Opening
             this modal must never by itself start a countdown to real
             dispatch. */}
        {!confirmed && !loading && !sosResult && !error && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: "#FEF2F2", border: "3px solid #EF4444" }}
            >
              <ShieldAlert className="h-9 w-9" style={{ color: "#DC2626" }} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", marginTop: "20px" }}>Send SOS Broadcast?</h3>
            <p style={{ fontSize: "13px", color: "#64748B", maxWidth: "360px", marginTop: "8px", lineHeight: 1.5 }}>
              This will attempt to send your live GPS coordinates and an emergency SMS/call to your configured trusted contact via Exotel. Nothing is sent until you confirm.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="rounded-xl px-6 py-2.5 text-xs font-bold transition-all"
                style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.12)", color: "#0F172A" }}
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmSend}
                className="rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all"
                style={{ backgroundColor: "#EF4444" }}
              >
                SEND SOS NOW
              </button>
            </div>
          </div>
        )}

        {/* 1. Countdown screen (only after explicit confirmation above) */}
        {countdown !== null && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div
              className="relative flex h-32 w-32 items-center justify-center rounded-full animate-pulse"
              style={{ backgroundColor: "#FEF2F2", border: "4px solid #EF4444" }}
            >
              <span style={{ fontSize: "56px", fontWeight: 900, color: "#DC2626", lineHeight: 1 }}>{countdown}</span>
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", marginTop: "24px" }}>Broadcasting Emergency Alert...</h3>
            <p style={{ fontSize: "13px", color: "#64748B", maxWidth: "340px", marginTop: "8px", lineHeight: 1.5 }}>
              Press cancel below immediately if this is a false alarm. Otherwise, we will notify your guardians and query safe havens.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-xl px-6 py-2.5 text-xs font-bold transition-all"
              style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.12)", color: "#0F172A" }}
            >
              CANCEL BROADCAST
            </button>
          </div>
        )}

        {/* 2. Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Loader className="h-12 w-12 animate-spin" style={{ color: "#EF4444" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", marginTop: "16px" }}>Broadcasting Live Coordinates...</h3>
          </div>
        )}

        {/* 3. Error state */}
        {error && !loading && !sosResult && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="h-12 w-12" style={{ color: "#EF4444" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", marginTop: "16px" }}>Transmission Error</h3>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "8px" }}>{error}</p>
            <button
              onClick={sendSOS}
              className="mt-6 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all"
              style={{ backgroundColor: "#EF4444" }}
            >
              RETRY BROADCAST
            </button>
          </div>
        )}

        {/* 4. SOS Dispatch Results */}
        {sosResult && !loading && (
          <div className="mt-5 space-y-5">
            {sosResult.success ? (
              <div className="flex items-center gap-3.5 rounded-2xl p-4" style={{ backgroundColor: "#DCFCE7", border: "1px solid #86EFAC", color: "#16A34A" }}>
                <CheckCircle className="h-6 w-6 flex-shrink-0" />
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase" }}>GUARDIAN ALERTS DISPATCHED</h4>
                  <p style={{ fontSize: "11px", color: "#15803D", marginTop: "2px" }}>{sosResult.message}</p>
                  {sosResult.transaction_id && (
                    <p className="font-mono mt-1" style={{ fontSize: "10px", color: "#166534" }}>Call/SMS SID: {sosResult.transaction_id}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3.5 rounded-2xl p-4" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#DC2626" }}>
                <AlertCircle className="h-6 w-6 flex-shrink-0" />
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase" }}>EMERGENCY COMMUNICATION FAILED</h4>
                  <p style={{ fontSize: "11px", color: "#B91C1C", marginTop: "2px" }}>
                    {sosResult.message || "Exotel emergency communication failed. Please dial 112 directly if in danger."}
                  </p>
                </div>
              </div>
            )}

            {/* Telemetry info */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
              <h4 style={{ fontSize: "11px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Transmitted Location Telemetry</h4>
              <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                <div>
                  <span style={{ fontSize: "11px", color: "#64748B" }}>Latitude</span>
                  <p className="font-mono mt-0.5" style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                    {sosResult.latitude && sosResult.latitude !== 0 ? sosResult.latitude.toFixed(6) : "Unavailable (0.000000)"}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748B" }}>Longitude</span>
                  <p className="font-mono mt-0.5" style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                    {sosResult.longitude && sosResult.longitude !== 0 ? sosResult.longitude.toFixed(6) : "Unavailable (0.000000)"}
                  </p>
                </div>
              </div>
            </div>

            {/* Verified Emergency Lifelines & Safe Havens */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 style={{ fontSize: "11px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Verified Emergency Response Nodes
                </h4>
                <span style={{ fontSize: "9px", fontWeight: 800, color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  OFFICIAL 24/7 NETWORK
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sosResult.nearest_havens.map((haven, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl p-3.5 transition-colors"
                    style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}
                  >
                    <div className="flex items-start gap-3">
                      <Navigation className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "#EF4444" }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}>{haven.name}</h5>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              padding: "2px 6px",
                              borderRadius: "6px",
                              backgroundColor: haven.is_demo ? "#FEF3C7" : "#FEF2F2",
                              color: haven.is_demo ? "#B45309" : "#DC2626",
                            }}
                          >
                            {haven.is_demo ? "DEMO DATA" : haven.type}
                          </span>
                          <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 500 }}>
                            {haven.distance_km !== undefined && haven.distance_km !== null
                              ? `${haven.distance_km} km away`
                              : (haven.data_source || "National Emergency ERSS")}
                          </span>
                        </div>
                        {haven.note && (
                          <p style={{ fontSize: "10px", color: "#94A3B8", marginTop: "2px" }}>{haven.note}</p>
                        )}
                      </div>
                    </div>
                    
                    <a
                      href={`tel:${haven.phone}`}
                      className="rounded-full p-2.5 transition-colors flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
                      title={`Call ${haven.name}`}
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct 112 calling as final fallback */}
            <div className="flex gap-3 mt-6">
              <a
                href="tel:112"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3.5 text-white font-bold text-xs shadow-md transition-all active:scale-98"
                style={{ backgroundColor: "#DC2626" }}
              >
                <Phone className="h-4 w-4" />
                <span>CALL 112 NATIONAL EMERGENCY DIRECTLY</span>
              </a>
              <button
                onClick={onClose}
                className="rounded-xl px-6 py-3.5 font-bold text-xs transition-colors"
                style={{ backgroundColor: "#F1F5F9", color: "#0F172A" }}
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
