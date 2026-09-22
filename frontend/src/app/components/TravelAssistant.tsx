"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  AssistantMessage, 
  LiveTravelContext, 
  ActionProposal 
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
  ShieldAlert, 
  Compass, 
  X, 
  Minimize2, 
  Maximize2,
  Wrench,
  HelpCircle,
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

export default function TravelAssistant({
  context = {},
  isOpen = true,
  onClose,
  isFloating = false,
  onApplyInterval,
  onSelectRoute,
  onTriggerAlert
}: TravelAssistantProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "initial_welcome",
      role: "assistant",
      content: "Namaste! I am your AI Travel Guardian Assistant. I observe your verified navigation progress, safety scores, check-in status, and safe havens. How can I help with your journey?",
      timestamp: Date.now(),
      mode: "CONNECTED"
    }
  ]);
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

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim() || loading) return;

    const userMsg: AssistantMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: promptText.trim(),
      timestamp: Date.now()
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
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendPrompt(input);
  };

  if (!isOpen) return null;

  const content = (
    <div className={`flex flex-col bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden transition-all ${
      isFloating 
        ? "fixed bottom-6 right-4 md:right-8 z-50 w-[92vw] max-w-lg h-[580px] backdrop-blur-md" 
        : "w-full h-full min-h-[540px]"
    }`}>
      
      {/* Header */}
      <div className="p-4 border-b border-border bg-elevated-surface flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-primary-accent/15 text-primary-accent border border-primary-accent/30">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-foreground">Travel Guardian Assistant</h3>
              <Sparkles className="h-3.5 w-3.5 text-primary-accent animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${intelligenceMode === "CONNECTED" ? "bg-success" : "bg-warning"}`} />
              <span className="text-[9px] font-black uppercase text-muted tracking-wider">
                {intelligenceMode === "CONNECTED" ? "Gemini 1.5 Flash Tools" : "Deterministic Tools Engine"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-border text-muted hover:text-foreground transition-colors"
              title="Close Assistant"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Action Chips Bar */}
      <div className="p-2.5 bg-surface border-b border-border overflow-x-auto flex gap-1.5 scrollbar-none">
        {QUICK_ACTIONS.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendPrompt(action.prompt)}
              disabled={loading}
              className="py-1.5 px-3 rounded-xl bg-elevated-surface hover:bg-border border border-border text-[11px] font-bold text-foreground shrink-0 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Icon className="h-3.5 w-3.5 text-primary-accent" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`space-y-2.5 max-w-[88%] ${
              msg.role === "user" ? "ml-auto" : "mr-auto"
            }`}
          >
            {/* Tool badges if executed */}
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {msg.toolCalls.map((tc) => (
                  <span
                    key={tc.id}
                    className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-elevated-surface border border-primary-accent/30 text-primary-accent"
                  >
                    <Wrench className="h-2.5 w-2.5" />
                    <span>Tool: {tc.name} (Verified)</span>
                  </span>
                ))}
              </div>
            )}

            {/* Bubble content */}
            <div
              className={`p-4 rounded-3xl text-xs font-semibold leading-relaxed shadow-sm ${
                msg.role === "user"
                  ? "bg-primary-accent text-white rounded-br-none"
                  : "bg-elevated-surface text-foreground border border-border rounded-bl-none"
              }`}
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

            <span className="text-[8px] font-bold text-muted block px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}

        {loading && (
          <div className="mr-auto p-4 rounded-3xl bg-elevated-surface border border-border text-muted flex items-center gap-2.5 text-xs font-bold animate-pulse">
            <Loader className="h-4 w-4 animate-spin text-primary-accent" />
            <span>Consulting verified safety tools...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Strip */}
      <form onSubmit={handleFormSubmit} className="p-3 border-t border-border bg-surface flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask e.g. 'Safety score?', 'Find hospital', 'When is next check-in?'..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 rounded-2xl bg-elevated-surface border border-border px-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:border-primary-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3 rounded-2xl bg-primary-accent hover:bg-primary-accent-hover text-white transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          title="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

    </div>
  );

  return content;
}
