"use client";

import React, { useEffect, useState } from "react";
import { Bot, Send, Cpu, CircleAlert, Download, Trash2, Loader2 } from "lucide-react";
import { answerOffline, isWebGPUSupported, OfflineAnswer } from "../../services/offlineAI";
import { loadOfflineEngine, isOfflineEngineReady, isModelCached, deleteCachedModel, OFFLINE_MODEL_LABEL } from "../../services/webllmEngine";
import { OfflineCorridorPack } from "../../types/offline";

type EngineState = "checking" | "unsupported" | "not_downloaded" | "cached" | "loading" | "ready" | "error";

interface OfflineAIChatProps {
  pack: OfflineCorridorPack | null;
  currentPosition: { latitude: number; longitude: number; accuracy?: number } | null;
}

interface ChatEntry {
  role: "user" | "assistant";
  text: string;
  mode?: "LOCAL_LLM" | "DETERMINISTIC";
  llmRejectedReason?: string;
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
  // Detected after mount: navigator.gpu doesn't exist during SSR, so reading
  // it at render time made server and client disagree (hydration mismatch).
  const [webgpu, setWebgpu] = useState(false);
  const [engine, setEngine] = useState<EngineState>("checking");
  const [progress, setProgress] = useState<{ text: string; progress: number } | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const gpu = isWebGPUSupported();
    setWebgpu(gpu);
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    if (!gpu) setEngine("unsupported");
    else if (isOfflineEngineReady()) setEngine("ready");
    else isModelCached().then((c) => setEngine(c ? "cached" : "not_downloaded"));
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const loadModel = async () => {
    setEngine("loading");
    setEngineError(null);
    try {
      await loadOfflineEngine((p) => setProgress(p));
      setEngine("ready");
    } catch (err: any) {
      setEngineError(err?.message || "The on-device model failed to load.");
      setEngine("error");
    } finally {
      setProgress(null);
    }
  };

  const removeModel = async () => {
    try {
      await deleteCachedModel();
      setEngine("not_downloaded");
    } catch (err: any) {
      setEngineError(`Couldn't remove the model: ${err?.message || "unknown error"}`);
    }
  };

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setLoading(true);
    try {
      const answer: OfflineAnswer = await answerOffline(prompt, pack, currentPosition);
      setMessages((m) => [...m, { role: "assistant", text: answer.reply, mode: answer.mode, llmRejectedReason: answer.llmRejectedReason }]);
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

      {engine !== "unsupported" && engine !== "checking" && (
        <div className="px-4 py-2.5 border-b border-border text-[11px] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-foreground">
              {engine === "ready" && `On-device LLM ready: ${OFFLINE_MODEL_LABEL}`}
              {engine === "cached" && "On-device LLM is saved on this device (not loaded)"}
              {engine === "not_downloaded" && "Optional on-device LLM for more natural replies"}
              {engine === "loading" && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading on-device LLM…</span>}
              {engine === "error" && "On-device LLM unavailable"}
            </span>
            {(engine === "not_downloaded" || engine === "cached" || engine === "error") && (
              <button
                onClick={loadModel}
                disabled={engine !== "cached" && !online}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-(--primary) text-white font-bold disabled:opacity-50"
              >
                <Download className="h-3 w-3" /> {engine === "cached" ? "Load" : "Download"}
              </button>
            )}
            {(engine === "ready" || engine === "cached") && (
              <button onClick={removeModel} className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border font-bold" aria-label="Remove on-device model">
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            )}
          </div>
          {engine === "not_downloaded" && (
            <p className="text-(--muted-foreground)">
              {online
                ? "One-time download of a few hundred MB, stored in this browser and then usable offline. Without it, answers come from the deterministic engine, which uses the same verified data."
                : "Needs a connection for the one-time download. The deterministic engine is answering in the meantime."}
            </p>
          )}
          {engine === "loading" && progress && (
            <div>
              <div className="h-1.5 rounded-full bg-elevated-surface overflow-hidden">
                <div className="h-full bg-(--primary) transition-all" style={{ width: `${Math.round(progress.progress * 100)}%` }} />
              </div>
              <p className="text-(--muted-foreground) mt-1 truncate">{progress.text}</p>
            </div>
          )}
          {engineError && <p className="text-amber-600 font-semibold">{engineError} The deterministic engine is still answering.</p>}
        </div>
      )}

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
                {m.mode === "LOCAL_LLM" ? "Answered by on-device LLM (grounding-checked)" : "Answered by deterministic offline engine"}
              </div>
            )}
            {m.llmRejectedReason && (
              <div className="text-[9px] text-amber-600 mt-0.5 font-semibold">
                On-device LLM reply discarded: {m.llmRejectedReason}
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
