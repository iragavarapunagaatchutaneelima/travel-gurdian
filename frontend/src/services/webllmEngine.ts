/**
 * Browser-local LLM engine (mentor Section 23): WebLLM running on WebGPU
 * when available, with an explicit, honest failure signal otherwise so
 * callers fall back to the deterministic offline assistant rather than
 * silently pretending a local model is answering.
 *
 * This module never fabricates a "GPU inference" result: if WebGPU isn't
 * present, the model fails to download (no network / genuinely offline for
 * the very first load), or generation throws, callers get a clear error
 * and must use offlineAI.ts's deterministic fallback instead.
 */
import type { MLCEngine } from "@mlc-ai/web-llm";

// Smallest widely-available prebuilt WebLLM model -- chosen to make a
// browser download at all realistic (~600MB-1GB range for most models is
// too large for a "download once, use offline forever" safety app; this is
// still substantial, and devices/networks that can't fetch it at all should
// simply stay on the deterministic assistant, never a fabricated substitute).
const MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

let enginePromise: Promise<MLCEngine> | null = null;
let engineReady = false;

export interface EngineLoadProgress {
  text: string;
  progress: number; // 0-1
}

export function isWebGPUSupported(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export function isOfflineEngineReady(): boolean {
  return engineReady;
}

export const OFFLINE_MODEL_LABEL = "Qwen2.5 0.5B Instruct (q4f16, WebLLM)";

/** True if the model weights are already in this browser's Cache Storage. */
export async function isModelCached(): Promise<boolean> {
  try {
    const webllm = await import("@mlc-ai/web-llm");
    return await webllm.hasModelInCache(MODEL_ID);
  } catch {
    return false;
  }
}

/** Frees the device storage used by the model. The deterministic engine keeps working. */
export async function deleteCachedModel(): Promise<void> {
  const webllm = await import("@mlc-ai/web-llm");
  if (enginePromise) {
    try {
      (await enginePromise).unload();
    } catch {}
  }
  enginePromise = null;
  engineReady = false;
  await webllm.deleteModelAllInfoInCache(MODEL_ID);
}

/**
 * Loads the WebLLM engine. Throws with an honest message on any failure
 * (no WebGPU, model fetch failed, WebGPU context creation failed) --
 * callers must catch this and use the deterministic fallback, never
 * pretend the local LLM initialized when it didn't.
 */
export async function loadOfflineEngine(onProgress?: (p: EngineLoadProgress) => void): Promise<MLCEngine> {
  if (!isWebGPUSupported()) {
    throw new Error("WebGPU is not available in this browser. Local LLM inference requires WebGPU support.");
  }
  if (enginePromise) return enginePromise;

  enginePromise = (async () => {
    const webllm = await import("@mlc-ai/web-llm");
    const engine = await webllm.CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (report) => {
        onProgress?.({ text: report.text, progress: report.progress });
      },
    });
    engineReady = true;
    return engine;
  })();

  try {
    return await enginePromise;
  } catch (err) {
    enginePromise = null; // allow retry on a later call
    throw err;
  }
}

/**
 * Generates a response constrained by a system prompt that must include all
 * real, verified data the model is allowed to reference. The model is
 * instructed never to state a fact not present in that data.
 */
export async function generateOfflineCompletion(
  systemPrompt: string,
  userPrompt: string,
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const engine = await loadOfflineEngine();
  const result = await engine.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 256,
  });
  const text = result.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Local LLM returned an empty response.");
  }
  return text;
}
