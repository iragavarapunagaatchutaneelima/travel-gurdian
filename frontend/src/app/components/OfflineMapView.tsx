"use client";

import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as protomapsBasemaps from "@protomaps/basemaps";
import { registerOfflineMapProtocol, buildOfflineTileUrl } from "../../services/offlineMapProtocol";
import { OfflineCorridorPack } from "../../types/offline";

/**
 * Real offline map renderer: MapLibre GL JS + real vector tiles (MVT bytes
 * from Protomaps' public OSM archive, downloaded and stored per-corridor in
 * IndexedDB by downloadCorridorMapPack). This is completely independent of
 * Google Maps -- no Google tiles are ever cached, and this component is
 * only ever shown when the device is actually offline with a real
 * downloaded pack, never as a substitute for live Google Maps while online.
 */
interface OfflineMapViewProps {
  pack: OfflineCorridorPack;
  className?: string;
  style?: React.CSSProperties;
}

export default function OfflineMapView({ pack, className = "", style }: OfflineMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !pack.mapPack) return;
    registerOfflineMapProtocol();

    const bounds = pack.mapPack.bounds;
    const routeCoords = pack.route?.waypoints || [];
    // Start centered on the route's own starting point at the most detailed
    // downloaded zoom level, not the whole corridor's bounding-box center at
    // the least detailed zoom. A ±8km-wide corridor is narrow enough that
    // "zoomed out to fit the whole 500km route" (the previous behavior)
    // showed almost no street/building detail -- exactly the "just gray,
    // not a real map" complaint. Real streets, buildings and place names are
    // only visible zoomed in close, which is also the useful view for an
    // actual traveler following the route turn-by-turn.
    const [startLng, startLat] = routeCoords.length > 0
      ? routeCoords[0]
      : [(bounds.minLng + bounds.maxLng) / 2, (bounds.minLat + bounds.maxLat) / 2];

    let layers: any[] = [];
    try {
      layers = protomapsBasemaps.layers("tg-offline-source", protomapsBasemaps.LIGHT, { lang: "en" });
    } catch (err) {
      console.warn("Failed to build offline basemap style layers:", err);
    }

    const style: maplibregl.StyleSpecification = {
      version: 8,
      // Glyphs (text labels) are a soft dependency fetched from Protomaps'
      // public font CDN when reachable. If the device is genuinely offline
      // and this hasn't been cached separately, MapLibre simply renders
      // roads/buildings/water without text labels rather than failing --
      // acceptable for a safety-critical corridor view, and honest (no
      // fabricated place names are drawn).
      glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
      sources: {
        "tg-offline-source": {
          type: "vector",
          tiles: [buildOfflineTileUrl(pack.packId)],
          minzoom: pack.mapPack.zoomRange[0],
          maxzoom: pack.mapPack.zoomRange[1],
          bounds: [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat],
        },
      },
      layers,
    };

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [startLng, startLat],
        // Most detailed downloaded zoom, not least detailed: at the corridor
        // scale (a ±8km-wide strip) this is the zoom level where real
        // streets, buildings and place labels actually render.
        zoom: pack.mapPack.zoomRange[1],
        // Never let the camera zoom out below the vector source's minzoom:
        // MapLibre renders nothing from a vector source once the current
        // zoom is below its `minzoom` (only the flat "background" style
        // layer shows).
        minZoom: pack.mapPack.zoomRange[0],
        maxZoom: pack.mapPack.zoomRange[1] + 1,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      // "Locate Me": centers on the device's real GPS position (offline GPS
      // fixes still work -- only the network tile/geocoding lookups don't).
      // Never fabricates a location; if permission is denied or GPS is
      // unavailable, MapLibre's own control surfaces that honestly.
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserLocation: true,
          showAccuracyCircle: true,
        }),
        "top-right"
      );

      // Route corridor line, from the real downloaded route's waypoints.
      map.on("load", () => {
        if (routeCoords.length < 2) return;
        map.addSource("tg-route-line", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: pack.route.waypoints },
          },
        });
        map.addLayer({
          id: "tg-route-line-layer",
          type: "line",
          source: "tg-route-line",
          paint: { "line-color": "#2563FF", "line-width": 4, "line-opacity": 0.85 },
        });
      });

      map.on("error", (e: maplibregl.ErrorEvent) => {
        // A missing individual tile is expected at the corridor edges and is
        // handled by the protocol (throws "Tile not available offline");
        // only surface genuine style/render errors to the user.
        if (e.error?.message && !e.error.message.includes("Tile not available offline")) {
          console.warn("Offline map render error:", e.error.message);
        }
      });

      mapRef.current = map;
    } catch (err: any) {
      setRenderError(err?.message || "Failed to initialize offline map renderer");
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [pack.packId]);

  if (!pack.mapPack || pack.mapPack.tileCount === 0) {
    return (
      <div className={`flex items-center justify-center bg-elevated-surface text-xs text-(--muted-foreground) font-semibold ${className}`} style={style}>
        No offline map tiles were downloaded for this pack.
      </div>
    );
  }

  if (renderError) {
    return (
      <div className={`flex items-center justify-center bg-elevated-surface text-xs text-rose-600 font-semibold p-4 text-center ${className}`} style={style}>
        Offline map could not be rendered: {renderError}
      </div>
    );
  }

  return <div ref={containerRef} className={className} style={style} />;
}
