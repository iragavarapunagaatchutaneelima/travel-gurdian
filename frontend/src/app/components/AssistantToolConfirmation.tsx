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
    <div className="p-4 rounded-3xl bg-surface border-2 border-primary-accent/40 shadow-md space-y-3 animate-slideUp text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-2xl bg-elevated-surface border border-border shrink-0 mt-0.5">
            {renderIcon()}
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-primary-accent tracking-widest block">
              User Action Proposal
            </span>
            <h4 className="text-xs font-black text-foreground leading-tight mt-0.5">
              {proposal.title}
            </h4>
            <p className="text-[11px] text-muted font-semibold mt-1 leading-relaxed">
              {proposal.description}
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation & Cancel Buttons */}
      <div className="flex gap-2 pt-1 border-t border-border">
        <button
          onClick={handleCancel}
          className="flex-1 py-2.5 px-3 rounded-xl bg-elevated-surface hover:bg-border text-muted font-black text-xs transition-colors border border-border"
        >
          Cancel
        </button>

        <button
          onClick={handleConfirm}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs text-white flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95 ${
            proposal.toolName === "proposeCall112"
              ? "bg-danger hover:opacity-90"
              : "bg-primary-accent hover:bg-primary-accent-hover"
          }`}
        >
          <span>{proposal.toolName === "proposeCall112" ? "Tap to Call 112" : "Confirm Action"}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
