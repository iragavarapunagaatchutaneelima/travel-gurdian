"use client";

import React, { useState } from "react";
import { Bot, Send, Cpu, CircleAlert } from "lucide-react";
import { answerOffline, isWebGPUSupported, OfflineAnswer } from "../../services/offlineAI";
import { OfflineCorridorPack } from "../../types/offline";

interface OfflineAIChatProps {
  pack: OfflineCorridorPack | null;
  currentPosition: { latitude: number; longitude: number; accuracy?: number } | null;
}

interface ChatEntry {
  role: "user" | "assistant";
  text: string;
  mode?: "LOCAL_LLM" | "DETERMINISTIC";
}

/**
 * Offline AI Guardian chat UI. Honestly labels which engine actually
 * answered each message (WebGPU local LLM vs. the deterministic assistant)
 * rather than implying every reply came from "AI" indiscriminately -- the
 * deterministic engine is always available even with no WebGPU support.
 */
export default function OfflineAIChat({ pack, currentPosition }: OfflineAIChatProps) {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const webgpu = isWebGPUSupported();

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setLoading(true);
    try {
      const answer: OfflineAnswer = await answerOffline(prompt, pack, currentPosition);
      setMessages((m) => [...m, { role: "assistant", text: answer.reply, mode: answer.mode }]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", text: `Offline assistant error: ${err?.message || "unknown error"}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-surface overflow-hidden">
      <div className="px-4 py-2.5 bg-elevated-surface border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-extrabold text-foreground">
          <Bot className="h-4 w-4 text-(--primary)" /> Offline AI Guardian
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${webgpu ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
          <Cpu className="h-3 w-3" />
          {webgpu ? "WebGPU available" : "Deterministic mode (no WebGPU)"}
        </span>
      </div>

      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-xs text-(--muted-foreground)">
            Ask about your cached route, offline map, safe havens, or check-in status. This works with zero
            connectivity — every answer is grounded in what was actually downloaded, never invented.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-xs ${m.role === "user" ? "text-right" : "text-left"}`}>
            <div className={`inline-block px-3 py-2 rounded-2xl max-w-[85%] ${m.role === "user" ? "bg-(--primary) text-white" : "bg-elevated-surface text-foreground"}`}>
              {m.text}
            </div>
            {m.mode && (
              <div className="text-[9px] text-(--muted-foreground) mt-0.5 font-bold uppercase">
                {m.mode === "LOCAL_LLM" ? "Answered by on-device LLM" : "Answered by deterministic offline engine"}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="text-xs text-(--muted-foreground)">Thinking...</div>}
      </div>

      <div className="p-3 border-t border-border flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="e.g. Where is the nearest fuel station?"
          className="flex-1 rounded-xl px-3 py-2 text-xs bg-elevated-surface border border-border outline-none text-foreground"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="p-2.5 rounded-xl bg-(--primary) text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {!pack && (
        <div className="px-4 pb-3 flex items-center gap-1.5 text-[10px] text-amber-600 font-semibold">
          <CircleAlert className="h-3 w-3" /> No offline pack downloaded — answers will be limited to GPS-only queries.
        </div>
      )}
    </div>
  );
}
