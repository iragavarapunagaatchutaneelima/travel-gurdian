import { PMTiles } from "pmtiles";
import { VectorTileCoordinate } from "../types/offline";

/**
 * Real offline map tile source: Protomaps' publicly hosted, OpenStreetMap-
 * derived global PMTiles archive (planetiler build, MIT/ODbL data). PMTiles
 * is a single-file archive queried via HTTP range requests, so fetching one
 * z/x/y tile only downloads that tile's few KB, never the whole ~114GB file.
 *
 * Fetched through our own same-origin proxy (app/api/pmtiles-proxy), not
 * directly -- build.protomaps.com's CORS allowlist only includes
 * http://localhost:3000 (verified directly with curl), so a real deployed
 * domain's browser gets silently CORS-blocked fetching it directly. That
 * exactly matched "downloads work when I test locally, fail for judges."
 * The proxy forwards the same range requests server-side (no CORS applies
 * between servers) and streams back the identical real bytes -- see that
 * file for the full explanation.
 *
 * This is real, non-fabricated map data (the actual OSM road/building/water
 * network) -- the opposite of an earlier implementation, which stored a
 * synthetic `{z,x,y,packId,cachedAt}` JSON blob and called it a downloaded
 * map tile. If this archive is unreachable, callers must report that
 * honestly (skip the tile / mark the pack PARTIAL) rather than substitute
 * anything fake.
 */
export const PUBLIC_PMTILES_URL = "/api/pmtiles-proxy";

let pmtilesInstance: PMTiles | null = null;

function getPMTiles(): PMTiles {
  if (!pmtilesInstance) {
    pmtilesInstance = new PMTiles(PUBLIC_PMTILES_URL);
  }
  return pmtilesInstance;
}

export interface RealTileResult {
  coord: VectorTileCoordinate;
  data: Uint8Array | null; // MVT (protobuf) bytes, or null if genuinely unavailable
  error?: string;
}

/**
 * Fetches ONE real vector tile's raw MVT bytes. Returns null (never
 * fabricated bytes) if the archive has no data at that coordinate or the
 * network request fails.
 */
export async function fetchRealTile(coord: VectorTileCoordinate): Promise<RealTileResult> {
  try {
    const pmtiles = getPMTiles();
    const result = await pmtiles.getZxy(coord.z, coord.x, coord.y);
    if (!result || !result.data) {
      return { coord, data: null };
    }
    return { coord, data: new Uint8Array(result.data) };
  } catch (err: any) {
    return { coord, data: null, error: err?.message || "Tile fetch failed" };
  }
}

/** Confirms the public archive is actually reachable before a bulk download starts. */
export async function verifyTileSourceReachable(): Promise<{ reachable: boolean; error?: string }> {
  try {
    const pmtiles = getPMTiles();
    const header = await pmtiles.getHeader();
    return { reachable: !!header && header.maxZoom >= 0 };
  } catch (err: any) {
    return { reachable: false, error: err?.message || "Tile source unreachable" };
  }
}
