"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { History, Navigation, Download, MapPin, Loader2 } from "lucide-react";
import { listOfflinePacks } from "../../services/offlineStorageService";
import { loadActiveJourney, ActiveJourney } from "../../services/activeJourney";
import { OfflineCorridorPack } from "../../types/offline";

/**
 * My Journeys: only journeys that really exist on this device -- the one
 * currently selected on Live Map, and Journey Safety Packs downloaded for
 * offline use. The previous version listed four invented "Completed" trips
 * with made-up dates and safety scores. There is no server-side trip log
 * yet; the page says so instead of pretending.
 */
export default function MyJourneysScreen() {
  const [loading, setLoading] = useState(true);
  const [packs, setPacks] = useState<OfflineCorridorPack[]>([]);
  const [active, setActive] = useState<ActiveJourney | null>(null);

  useEffect(() => {
    setActive(loadActiveJourney());
    listOfflinePacks()
      .then(setPacks)
      .catch(() => setPacks([]))
      .finally(() => setLoading(false));
  }, []);

  const empty = !loading && !active && packs.length === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-8 pb-28 md:pb-10 space-y-6">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-(--primary)/10 text-(--primary) border border-(--primary)/30 mb-3">
            <History className="h-3 w-3" /> Saved on this device
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">My Journeys</h1>
          <p className="text-sm text-(--muted-foreground) mt-1">
            Your current journey and the Journey Safety Packs you've downloaded. Travel Guardian doesn't keep a trip
            history on a server yet, so past trips aren't listed.
          </p>
        </div>

        {loading && <div className="flex items-center gap-2 text-xs text-(--muted-foreground)"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}

        {active && (
          <section className="rounded-3xl border border-(--primary)/30 bg-surface p-5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-(--primary) mb-1">Current journey</div>
            <div className="text-base font-extrabold">{active.originName || "Origin"} → {active.destinationName || "Destination"}</div>
            <div className="text-xs text-(--muted-foreground) mt-1">
              {active.route.name} · {active.route.distance} · {active.route.time} · Safety Fit {active.route.safetyScore}/100 · selected {new Date(active.savedAt).toLocaleString()}
            </div>
            <Link href="/map" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl bg-(--primary) text-white text-xs font-bold">
              <Navigation className="h-4 w-4" /> Open on Live Map
            </Link>
          </section>
        )}

        {packs.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-(--muted-foreground)">Downloaded Journey Safety Packs</h2>
            {packs.map((p) => (
              <div key={p.packId} className="rounded-2xl border border-border bg-surface p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold">{p.packName}</div>
                  <div className="text-xs text-(--muted-foreground)">
                    {p.route.distance} · {p.turnInstructions.length} turns · {p.safeHavens.length} safe havens · {p.mapPack?.tileCount ?? 0} map tiles ({p.mapPack?.status ?? "no map"}) · downloaded {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <Link href="/offline-mode" className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-(--primary)"><Download className="h-3.5 w-3.5" /> Open</Link>
              </div>
            ))}
          </section>
        )}

        {empty && (
          <section className="rounded-3xl border border-dashed border-border bg-surface p-8 text-center space-y-3">
            <MapPin className="h-10 w-10 mx-auto text-(--muted-foreground)" />
            <div className="text-sm font-extrabold">No journeys yet</div>
            <p className="text-xs text-(--muted-foreground) max-w-sm mx-auto">
              Plan a journey to see it here, and download its Journey Safety Pack to keep it available offline.
            </p>
            <Link href="/plan" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-(--primary) text-white text-xs font-bold">
              <Navigation className="h-4 w-4" /> Plan a journey
            </Link>
          </section>
        )}
      </main>
      <div className="md:hidden"><BottomNav /></div>
    </div>
  );
}
