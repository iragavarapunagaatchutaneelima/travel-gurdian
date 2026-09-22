"use client";

import React, { useState } from "react";
import { ActionProposal } from "../../types/gemini";
import { 
  PhoneCall, 
  Clock, 
  Route, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  ShieldAlert, 
  Check, 
  ArrowRight,
  ShieldCheck
} from "lucide-react";

interface AssistantToolConfirmationProps {
  proposal: ActionProposal;
  onApplyInterval?: (minutes: number) => void;
  onSelectRoute?: (routeId: string) => void;
  onTriggerAlert?: (message?: string) => void;
}

export default function AssistantToolConfirmation({
  proposal,
  onApplyInterval,
  onSelectRoute,
  onTriggerAlert
}: AssistantToolConfirmationProps) {
  const [status, setStatus] = useState<"PENDING" | "EXECUTED" | "CANCELLED">(proposal.status as any || "PENDING");
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleConfirm = () => {
    switch (proposal.toolName) {
      case "proposeCall112": {
        setStatus("EXECUTED");
        setFeedback("Opening device phone dialer to 112...");
        if (typeof window !== "undefined") {
          window.location.href = "tel:112";
        }
        break;
      }

      case "proposeCheckInInterval": {
        const mins = Number(proposal.payload?.intervalMinutes) || 15;
        onApplyInterval?.(mins);
        setStatus("EXECUTED");
        setFeedback(`Safety Check-In interval updated to ${mins} minutes.`);
        break;
      }

      case "proposeAlternativeRoute": {
        const routeId = String(proposal.payload?.routeId || "B");
        onSelectRoute?.(routeId);
        setStatus("EXECUTED");
        setFeedback(`Alternative route applied: ${routeId}.`);
        break;
      }

      case "proposeTrustedContactAlert": {
        const msg = proposal.payload?.customMessage;
        onTriggerAlert?.(msg);
        setStatus("EXECUTED");
        setFeedback("Trusted contact alert prepared (DEV_SIMULATED / NOT_CONFIGURED).");
        break;
      }

      default:
        setStatus("EXECUTED");
        setFeedback("Action confirmed by user.");
    }
  };

  const handleCancel = () => {
    setStatus("CANCELLED");
    setFeedback("Action cancelled by user.");
  };

  if (status === "EXECUTED") {
    return (
      <div className="p-3.5 rounded-2xl bg-success/15 border border-success/30 text-success text-xs font-bold flex items-center justify-between animate-fadeIn">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback || "Action confirmed and executed."}</span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-success/20">
          Executed
        </span>
      </div>
    );
  }

  if (status === "CANCELLED") {
    return (
      <div className="p-3 rounded-2xl bg-elevated-surface border border-border text-muted text-xs font-bold flex items-center justify-between opacity-70">
        <div className="flex items-center gap-2">
          <X className="h-4 w-4 shrink-0" />
          <span>{feedback || "Proposal dismissed."}</span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider">Cancelled</span>
      </div>
    );
  }

  // Icons based on action
  const renderIcon = () => {
    switch (proposal.toolName) {
      case "proposeCall112":
        return <PhoneCall className="h-5 w-5 text-danger animate-pulse" />;
      case "proposeCheckInInterval":
        return <Clock className="h-5 w-5 text-primary-accent" />;
      case "proposeAlternativeRoute":
        return <Route className="h-5 w-5 text-info" />;
      case "proposeTrustedContactAlert":
        return <ShieldAlert className="h-5 w-5 text-warning" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-primary-accent" />;
    }
  };

  return (
    <div
      className="p-4 rounded-3xl shadow-sm space-y-3 animate-slideUp text-left"
      style={{
        backgroundColor: "#FFFFFF",
        border: "2px solid rgba(37,99,255,0.3)",
        fontFamily: "'Poppins',sans-serif",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-2xl shrink-0 mt-0.5" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
            {renderIcon()}
          </div>
          <div>
            <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#2563FF", letterSpacing: "0.08em", display: "block" }}>
              User Action Proposal
            </span>
            <h4 style={{ fontSize: "13px", fontWeight: 800, color: "#0F172A", marginTop: "2px" }}>
              {proposal.title}
            </h4>
            <p style={{ fontSize: "12px", color: "#64748B", fontWeight: 400, marginTop: "4px", lineHeight: 1.5 }}>
              {proposal.description}
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation & Cancel Buttons */}
      <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}>
        <button
          onClick={handleCancel}
          className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition-colors"
          style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.1)", color: "#64748B", fontFamily: "'Poppins',sans-serif" }}
        >
          Cancel
        </button>

        <button
          onClick={handleConfirm}
          className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95"
          style={{
            backgroundColor: proposal.toolName === "proposeCall112" ? "#EF4444" : "#2563FF",
            fontFamily: "'Poppins',sans-serif",
          }}
        >
          <span>{proposal.toolName === "proposeCall112" ? "Tap to Call 112" : "Confirm Action"}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
