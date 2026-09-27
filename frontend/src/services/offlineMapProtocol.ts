import * as maplibregl from "maplibre-gl";
import { config as maplibreConfig } from "maplibre-gl";
import { getOfflineTile } from "./offlineTileService";

/**
 * Registers a MapLibre custom protocol ("tg-offline://") that serves real
 * vector tiles (MVT bytes) out of IndexedDB instead of the network. Tiles
 * are only ever the real ones downloaded by downloadCorridorMapPack() (see
 * services/realVectorTiles.ts) -- if a requested tile was never downloaded,
 * this honestly reports it as missing to MapLibre rather than fabricating
 * blank/placeholder tile data.
 *
 * URL scheme: tg-offline://<packId>/{z}/{x}/{y}.mvt
 */
const PROTOCOL_SCHEME = "tg-offline";
let registered = false;

export function registerOfflineMapProtocol() {
  if (registered || typeof window === "undefined") return;
  registered = true;

  // MapLibre's bundled tile-parsing web worker doesn't resolve correctly
  // through Next.js/Turbopack's bundler (the worker script 404s and MapLibre
  // silently fails to render any vector layer as a result). Point it at a
  // self-hosted static copy instead -- avoids both the bundler issue and any
  // extra external CSP allowance.
  maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
  maplibreConfig.WORKER_URL = "/maplibre-gl-worker.mjs";

  maplibregl.addProtocol(PROTOCOL_SCHEME, async (params: maplibregl.RequestParameters) => {
    const match = params.url.match(/^tg-offline:\/\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\.mvt$/);
    if (!match) {
      throw new Error(`Malformed offline tile URL: ${params.url}`);
    }
    const [, packId, zStr, xStr, yStr] = match;
    const tile = await getOfflineTile(packId, Number(zStr), Number(xStr), Number(yStr));
    if (!tile || !tile.data) {
      // Real, honest "not found" -- MapLibre renders this cell blank rather
      // than the app inventing tile content that was never downloaded.
      throw new Error("Tile not available offline");
    }
    const buffer = tile.data instanceof Uint8Array ? tile.data.buffer : tile.data;
    return { data: buffer as ArrayBuffer };
  });
}

export function buildOfflineTileUrl(packId: string): string {
  return `${PROTOCOL_SCHEME}://${packId}/{z}/{x}/{y}.mvt`;
}
