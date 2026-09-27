"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { BookOpen, PhoneCall, CheckCircle2, Circle, Bot, MapPin, Plus, ShieldCheck, Loader2 } from "lucide-react";
import { listOfflinePacks } from "../../services/offlineStorageService";
import { refreshTrustedContactsFromBackend } from "../../services/trustedContactService";

/**
 * Safety Guide. Contains only verifiable information:
 *  - India's official national helpline numbers
 *  - a pre-trip checklist whose app-related items are checked against real
 *    app state (never pre-ticked)
 *  - pointers to LIVE Google Places search for hospitals/police
 * The previous version showed invented per-city safety scores, unverified
 * local police/hospital phone numbers, and fabricated user reviews; all of
 * that was removed. Local facilities come from live search, not a hardcoded
 * directory that can silently go stale.
 */

const HELPLINES = [
  { number: "112", label: "National Emergency Response (police, fire, ambulance)" },
  { number: "100", label: "Police" },
  { number: "101", label: "Fire" },
  { number: "108", label: "Ambulance / medical emergency" },
  { number: "1091", label: "Women's helpline" },
  { number: "1033", label: "NHAI national highway emergency" },
];

type AutoStatus = "checking" | "done" | "not_done" | "unknown";

interface ManualItem { id: string; text: string; done: boolean }

const MANUAL_KEY = "tg_manual_checklist";
const DEFAULT_MANUAL: ManualItem[] = [
  { id: "tyres", text: "Check tyre pressure and spare wheel", done: false },
  { id: "fuel", text: "Start with enough fuel / charge for the first leg", done: false },
  { id: "toll", text: "Check FASTag / toll balance for interstate travel", done: false },
  { id: "share", text: "Tell someone your route and expected arrival time", done: false },
];

export default function SafetyGuidePage() {
  const [packStatus, setPackStatus] = useState<AutoStatus>("checking");
  const [contactStatus, setContactStatus] = useState<AutoStatus>("checking");
  const [gpsStatus, setGpsStatus] = useState<AutoStatus>("checking");
  const [manual, setManual] = useState<ManualItem[]>(DEFAULT_MANUAL);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    listOfflinePacks()
      .then((packs) => setPackStatus(packs.length > 0 ? "done" : "not_done"))
      .catch(() => setPackStatus("unknown"));
    refreshTrustedContactsFromBackend()
      .then((cs) => setContactStatus(cs.some((c) => c.enabled) ? "done" : "not_done"))
      .catch(() => setContactStatus("unknown"));
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((p) => setGpsStatus(p.state === "granted" ? "done" : "not_done"))
        .catch(() => setGpsStatus("unknown"));
    } else {
      setGpsStatus("unknown");
    }
    try {
      const saved = localStorage.getItem(MANUAL_KEY);
      if (saved) setManual(JSON.parse(saved));
    } catch {}
  }, []);

  const saveManual = (items: ManualItem[]) => {
    setManual(items);
    try {
      localStorage.setItem(MANUAL_KEY, JSON.stringify(items));
    } catch {}
  };

  const autoItems: { label: string; status: AutoStatus; href: string; action: string }[] = [
    { label: "Journey Safety Pack downloaded for offline use", status: packStatus, href: "/plan", action: "Plan & download" },
    { label: "Trusted contact configured", status: contactStatus, href: "/emergency", action: "Add contact" },
    { label: "Location permission granted", status: gpsStatus, href: "/map", action: "Open Live Map" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-8 pb-28 md:pb-10 space-y-6">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-(--primary)/10 text-(--primary) border border-(--primary)/30 mb-3">
            <BookOpen className="h-3 w-3" /> Before you go
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Safety Guide</h1>
          <p className="text-sm text-(--muted-foreground) mt-1">
            Official helplines, a pre-trip checklist checked against your actual setup, and live search for help nearby.
          </p>
        </div>

        <section className="rounded-3xl border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-extrabold mb-3"><PhoneCall className="h-4 w-4 text-rose-600" /> Official national helplines (India)</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {HELPLINES.map((h) => (
              <div key={h.number} className="flex items-center gap-3 p-3 rounded-2xl bg-elevated-surface border border-border">
                <span className="text-lg font-black text-rose-600 w-14">{h.number}</span>
                <span className="text-xs font-semibold">{h.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-(--muted-foreground) mt-3">
            Government of India national numbers. Dial them from your phone's own dialer. For emergency calling from
            this app, use the Emergency page, where 112 stays locked until you deliberately enable it.
          </p>
        </section>

        <section className="rounded-3xl border border-border bg-surface p-5 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-extrabold"><ShieldCheck className="h-4 w-4 text-(--primary)" /> Pre-trip checklist</h2>
          <ul className="space-y-2">
            {autoItems.map((it) => (
              <li key={it.label} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-elevated-surface border border-border text-xs">
                <span className="flex items-center gap-2 font-semibold">
                  {it.status === "checking" ? <Loader2 className="h-4 w-4 animate-spin text-(--muted-foreground)" />
                    : it.status === "done" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    : <Circle className="h-4 w-4 text-(--muted-foreground)" />}
                  {it.label}
                  <span className="text-[10px] font-bold text-(--muted-foreground)">
                    {it.status === "unknown" ? "(couldn't check)" : "(checked automatically)"}
                  </span>
                </span>
                {it.status !== "done" && it.status !== "checking" && (
                  <Link href={it.href} className="text-(--primary) font-bold whitespace-nowrap">{it.action}</Link>
                )}
              </li>
            ))}
            {manual.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => saveManual(manual.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)))}
                  className="w-full flex items-center gap-2 p-3 rounded-2xl bg-elevated-surface border border-border text-xs font-semibold text-left"
                >
                  {m.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-(--muted-foreground)" />}
                  <span className={m.done ? "line-through text-(--muted-foreground)" : ""}>{m.text}</span>
                </button>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newItem.trim()) return;
              saveManual([...manual, { id: Date.now().toString(), text: newItem.trim(), done: false }]);
              setNewItem("");
            }}
            className="flex gap-2"
          >
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add your own item"
              className="flex-1 rounded-xl px-3 py-2 text-xs bg-elevated-surface border border-border outline-none"
            />
            <button className="px-3 py-2 rounded-xl bg-(--primary) text-white" aria-label="Add checklist item"><Plus className="h-4 w-4" /></button>
          </form>
        </section>

        <section className="rounded-3xl border border-border bg-surface p-5">
          <h2 className="text-sm font-extrabold mb-2">Find help near you</h2>
          <p className="text-xs text-(--muted-foreground) mb-3">
            Hospitals, police stations and fuel are looked up live (Google Places) for where you actually are, rather
            than from a fixed directory that can go out of date.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/assist" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-(--primary) text-white text-xs font-bold"><Bot className="h-4 w-4" /> Ask AI Guardian: "hospital near me"</Link>
            <Link href="/map" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-bold"><MapPin className="h-4 w-4" /> Live Map safety layers</Link>
          </div>
        </section>
      </main>
      <div className="md:hidden"><BottomNav /></div>
    </div>
  );
}
