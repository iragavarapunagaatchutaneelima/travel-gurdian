"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  AssistantMessage, 
  LiveTravelContext 
} from "../../types/gemini";
import { queryTravelAssistant } from "../../services/geminiService";
import AssistantToolConfirmation from "./AssistantToolConfirmation";
import { 
  Bot, 
  Send, 
  Sparkles, 
  Loader, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Hospital, 
  Compass, 
  X, 
  Wrench,
  PhoneCall
} from "lucide-react";

interface TravelAssistantProps {
  context?: LiveTravelContext;
  isOpen?: boolean;
  onClose?: () => void;
  isFloating?: boolean;
  onApplyInterval?: (minutes: number) => void;
  onSelectRoute?: (routeId: string) => void;
  onTriggerAlert?: (message?: string) => void;
}

const QUICK_ACTIONS = [
  { label: "Current Safety Fit", prompt: "What is my current safety score and corridor risk evaluation?", icon: ShieldCheck },
  { label: "Dynamic ETA & Progress", prompt: "How long until I reach my destination and what is my progress?", icon: Clock },
  { label: "Next Check-In", prompt: "When is my next Safety Check-In scheduled and what is the countdown?", icon: Compass },
  { label: "Nearby Hospital", prompt: "Find the nearest verified hospital along my corridor.", icon: Hospital },
  { label: "Am I Off Route?", prompt: "Am I currently on my planned route corridor?", icon: MapPin },
  { label: "Call 112 Protocol", prompt: "How do I call 112 emergency services?", icon: PhoneCall }
];

const INITIAL_MESSAGES: AssistantMessage[] = [
  {
    id: "initial_welcome",
    role: "assistant",
    content: "Namaste! I am your AI Travel Guardian Assistant. I observe your verified navigation progress, safety scores, check-in status, and safe havens. How can I help with your journey?",
    timestamp: 0,
    mode: "CONNECTED"
  }
];

export default function TravelAssistant({
  context = {},
  isOpen = true,
  onClose,
  isFloating = false,
  onApplyInterval,
  onSelectRoute,
  onTriggerAlert
}: TravelAssistantProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [intelligenceMode, setIntelligenceMode] = useState<"CONNECTED" | "DEMO" | "OFFLINE">("CONNECTED");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendPrompt = useCallback(async (promptText: string) => {
    if (!promptText.trim() || loading) return;

    const now = Date.now();
    const userMsg: AssistantMessage = {
      id: `user_${now}`,
      role: "user",
      content: promptText.trim(),
      timestamp: now
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const assistantMsg = await queryTravelAssistant(promptText, context);
    setMessages(prev => [...prev, assistantMsg]);
    if (assistantMsg.mode) {
      setIntelligenceMode(assistantMsg.mode);
    }
    setLoading(false);
  }, [loading, context]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendPrompt(input);
  };

  if (!isOpen) return null;

  const content = (
    <div
      className={`flex flex-col overflow-hidden transition-all ${isFloating ? "fixed bottom-6 right-4 md:right-8 z-50 w-[92vw] max-w-lg h-[580px]" : "w-full h-full min-h-[540px]"}`}
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.08)",
        borderRadius: "24px",
        boxShadow: "0 4px 24px rgba(37,99,255,0.10), 0 1px 6px rgba(15,23,42,0.06)",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(15,23,42,0.08)", backgroundColor: "#F8FAFC" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-2xl"
            style={{ background: "linear-gradient(135deg, #2563FF 0%, #1E40AF 100%)" }}
          >
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 style={{ fontWeight: 700, fontSize: "14px", color: "#0F172A" }}>Travel Guardian Assistant</h3>
              <Sparkles className="h-3.5 w-3.5 animate-pulse" style={{ color: "#2563FF" }} />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${intelligenceMode === "CONNECTED" ? "bg-green-400" : "bg-amber-400"}`} />
              <span style={{ fontSize: "9px", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {intelligenceMode === "CONNECTED" ? "Gemini 1.5 Flash Tools" : "Deterministic Tools Engine"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl transition-colors"
              style={{ color: "#94A3B8", backgroundColor: "#F1F5F9" }}
              title="Close Assistant"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Action Chips Bar */}
      <div
        className="p-2.5 overflow-x-auto flex gap-1.5 scrollbar-none"
        style={{ borderBottom: "1px solid rgba(15,23,42,0.06)", backgroundColor: "#FAFCFF" }}
      >
        {QUICK_ACTIONS.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendPrompt(action.prompt)}
              disabled={loading}
              className="py-1.5 px-3 rounded-xl shrink-0 flex items-center gap-1.5 transition-all disabled:opacity-50"
              style={{
                backgroundColor: "#EFF6FF",
                border: "1px solid rgba(37,99,255,0.15)",
                fontSize: "11px",
                fontWeight: 600,
                color: "#2563FF",
                fontFamily: "'Poppins',sans-serif",
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#DBEAFE"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#EFF6FF"}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: "#F8FAFC" }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`space-y-2.5 max-w-[88%] ${msg.role === "user" ? "ml-auto" : "mr-auto"}`}
          >
            {/* Tool badges if executed */}
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {msg.toolCalls.map((tc) => (
                  <span
                    key={tc.id}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5"
                    style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", backgroundColor: "#EFF6FF", color: "#2563FF", border: "1px solid rgba(37,99,255,0.2)" }}
                  >
                    <Wrench className="h-2.5 w-2.5" />
                    <span>Tool: {tc.name} (Verified)</span>
                  </span>
                ))}
              </div>
            )}

            {/* Bubble content */}
            <div
              className="p-4 rounded-3xl text-xs font-semibold leading-relaxed"
              style={{
                ...(msg.role === "user"
                  ? {
                      background: "linear-gradient(135deg, #2563FF 0%, #1E40AF 100%)",
                      color: "#FFFFFF",
                      borderBottomRightRadius: "4px",
                      boxShadow: "0 2px 8px rgba(37,99,255,0.25)",
                    }
                  : {
                      backgroundColor: "#FFFFFF",
                      color: "#0F172A",
                      border: "1px solid rgba(15,23,42,0.08)",
                      borderBottomLeftRadius: "4px",
                      boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
                    }),
                fontFamily: "'Poppins',sans-serif",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              {msg.content}
            </div>

            {/* Render any Action Proposals with explicit confirmation buttons */}
            {msg.proposals && msg.proposals.length > 0 && (
              <div className="space-y-2 pt-1">
                {msg.proposals.map((prop) => (
                  <AssistantToolConfirmation
                    key={prop.proposalId}
                    proposal={prop}
                    onApplyInterval={onApplyInterval}
                    onSelectRoute={onSelectRoute}
                    onTriggerAlert={onTriggerAlert}
                  />
                ))}
              </div>
            )}

            <span style={{ fontSize: "9px", fontWeight: 600, color: "#94A3B8", display: "block", padding: "0 4px" }}>
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}

        {loading && (
          <div
            className="mr-auto p-4 rounded-3xl flex items-center gap-2.5 animate-pulse"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)", fontSize: "13px", fontWeight: 500, color: "#64748B" }}
          >
            <Loader className="h-4 w-4 animate-spin" style={{ color: "#2563FF" }} />
            <span>Consulting verified safety tools...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Strip */}
      <form
        onSubmit={handleFormSubmit}
        className="p-3 flex items-center gap-2"
        style={{ borderTop: "1px solid rgba(15,23,42,0.08)", backgroundColor: "#FFFFFF" }}
      >
        <input
          type="text"
          placeholder="Ask e.g. 'Safety score?', 'Find hospital', 'Next check-in?'..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          onFocus={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#2563FF";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(37,99,255,0.10)";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#E2E8F0";
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
          style={{
            flex: 1,
            borderRadius: "14px",
            backgroundColor: "#F8FAFC",
            border: "1.5px solid #E2E8F0",
            padding: "10px 16px",
            fontSize: "13px",
            fontWeight: 500,
            color: "#0F172A",
            fontFamily: "'Poppins',sans-serif",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3 rounded-2xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #2563FF 0%, #1E40AF 100%)",
            boxShadow: "0 2px 8px rgba(37,99,255,0.25)",
          }}
          title="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

    </div>
  );

  return content;
}
