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
  PhoneCall,
  Coffee,
  Navigation,
  Phone
} from "lucide-react";

interface TravelAssistantProps {
  context?: LiveTravelContext;
  isOpen?: boolean;
  onClose?: () => void;
  isFloating?: boolean;
  onApplyInterval?: (minutes: number) => void;
  onSelectRoute?: (routeId: string) => void;
  onTriggerAlert?: (message?: string) => void;
  onPlacesDiscovered?: (places: any[]) => void;
  onSelectPlace?: (place: any) => void;
}

const QUICK_ACTIONS = [
  { label: "What's Near Me?", prompt: "What safe havens and verified places are near my current location?", icon: MapPin },
  { label: "Safe Cafe Near Me", prompt: "Find a safe cafe or rest stop near my current position.", icon: Coffee },
  { label: "Nearby Hospital", prompt: "Find the nearest verified hospital along my corridor.", icon: Hospital },
  { label: "Current Safety Fit", prompt: "What is my current safety score and corridor risk evaluation?", icon: ShieldCheck },
  { label: "Next Check-In", prompt: "When is my next Safety Check-In scheduled and what is the countdown?", icon: Compass },
  { label: "Dynamic ETA", prompt: "How long until I reach my destination and what is my progress?", icon: Clock },
  { label: "Call 112 Protocol", prompt: "How do I call 112 emergency services?", icon: PhoneCall }
];

const INITIAL_MESSAGES: AssistantMessage[] = [
  {
    id: "initial_welcome",
    role: "assistant",
    content: "Namaste! I am your AI Travel Guardian. I monitor your live telemetry, verified corridor safety fit, next check-in countdown, and safe havens. Ask me 'What's near me?' or check any journey parameter.",
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
  onTriggerAlert,
  onPlacesDiscovered,
  onSelectPlace
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

    // Inspect if nearby places tool executed and sync with map
    if (assistantMsg.toolResults && assistantMsg.toolResults.length > 0) {
      for (const res of assistantMsg.toolResults) {
        if (res.toolName === "findNearbyPlace" && res.data?.places && onPlacesDiscovered) {
          onPlacesDiscovered(res.data.places);
        }
      }
    }

    setLoading(false);
  }, [loading, context, onPlacesDiscovered]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendPrompt(input);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`flex flex-col min-h-0 overflow-hidden rounded-3xl border border-border bg-surface text-foreground transition-all ${
        isFloating 
          ? "fixed bottom-6 right-4 md:right-8 z-50 w-[92vw] max-w-lg h-145 shadow-2xl" 
          : "w-full h-full shadow-sm"
      }`}
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Header */}
      <div className="p-3.5 px-4 flex items-center justify-between border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-linear-to-tr from-(--primary) to-(--secondary) text-white shadow-sm">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-foreground">Travel Guardian Assistant</h3>
              <Sparkles className="h-3.5 w-3.5 text-(--primary) animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${intelligenceMode === "CONNECTED" ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-[10px] font-bold text-(--muted-foreground) uppercase tracking-wider">
                {intelligenceMode === "CONNECTED" ? "Gemini 1.5 Flash + Tools" : "Deterministic Safety Engine"}
              </span>
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-(--muted-foreground) hover:bg-elevated-surface transition-colors"
            title="Close Assistant"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Quick Action Chips Bar */}
      <div className="p-2 overflow-x-auto flex gap-1.5 scrollbar-none border-b border-border bg-(--elevated-surface)/60 shrink-0">
        {QUICK_ACTIONS.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendPrompt(action.prompt)}
              disabled={loading}
              className="py-1.5 px-2.5 rounded-xl shrink-0 flex items-center gap-1.5 text-xs font-semibold bg-surface text-(--primary) border border-(--primary)/20 hover:bg-(--primary)/10 transition-colors disabled:opacity-50"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Message Stream: Independent Scroll Container */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-(--surface)/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`space-y-2.5 max-w-[90%] md:max-w-[85%] ${msg.role === "user" ? "ml-auto" : "mr-auto"}`}
          >
            {/* Tool execution badges */}
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {msg.toolCalls.map((tc) => (
                  <span
                    key={tc.id}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase bg-(--primary)/10 text-(--primary) border border-(--primary)/20"
                  >
                    <Wrench className="h-2.5 w-2.5" />
                    <span>Tool: {tc.name}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Bubble content */}
            <div
              className={`p-3.5 md:p-4 rounded-3xl text-xs md:text-[13px] font-medium leading-relaxed shadow-sm ${
                msg.role === "user"
                  ? "bg-linear-to-tr from-(--primary) to-(--secondary) text-white rounded-br-none"
                  : "bg-elevated-surface text-foreground border border-border rounded-bl-none"
              }`}
            >
              <div className="whitespace-pre-line">{msg.content}</div>

              {/* Render place cards if tool result has places */}
              {msg.toolResults?.some(tr => tr.toolName === "findNearbyPlace" && tr.data?.places?.length > 0) && (
                <div className="mt-3 space-y-2 pt-2 border-t border-(--border)/70">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-(--primary) block">
                    Verified Safe Havens Nearby:
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {msg.toolResults
                      .find(tr => tr.toolName === "findNearbyPlace")
                      ?.data.places.map((place: any, pIdx: number) => (
                        <div
                          key={pIdx}
                          className="p-2.5 rounded-2xl bg-surface border border-border flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-(--primary)/10 text-(--primary) shrink-0">
                              {place.category === "hospital" && <Hospital className="h-3.5 w-3.5" />}
                              {place.category === "cafe" && <Coffee className="h-3.5 w-3.5" />}
                              {place.category !== "hospital" && place.category !== "cafe" && <MapPin className="h-3.5 w-3.5" />}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-foreground truncate">{place.name}</p>
                              <p className="text-[10px] text-(--muted-foreground)">{place.distance} away</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {onSelectPlace && (
                              <button
                                type="button"
                                onClick={() => onSelectPlace(place)}
                                className="py-1 px-2 rounded-lg bg-(--primary) text-white text-[11px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1"
                              >
                                <Navigation className="h-3 w-3" />
                                <span>View</span>
                              </button>
                            )}
                            {place.phone && (
                              <a
                                href={`tel:${place.phone}`}
                                className="p-1 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:opacity-80 transition-opacity"
                                title={`Call ${place.phone}`}
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action proposals (user confirmed) */}
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

            <span className="text-[10px] font-semibold text-(--muted-foreground) block px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}

        {loading && (
          <div className="mr-auto p-3.5 rounded-3xl flex items-center gap-2.5 bg-elevated-surface text-foreground border border-border text-xs font-semibold animate-pulse">
            <Loader className="h-4 w-4 animate-spin text-(--primary)" />
            <span>Consulting verified safety tools &amp; live GPS...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Strip: Pinned bottom bar */}
      <form
        onSubmit={handleFormSubmit}
        className="p-3 flex items-center gap-2 border-t border-border bg-surface shrink-0"
      >
        <input
          type="text"
          placeholder="Ask e.g. 'What's near me?', 'Find safe cafe', 'Safety score'..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 rounded-2xl bg-elevated-surface border border-border px-4 py-2.5 text-xs md:text-sm font-medium text-foreground placeholder-(--muted-foreground) outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 md:p-3 rounded-2xl bg-linear-to-tr from-(--primary) to-(--secondary) text-white shadow-md transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
