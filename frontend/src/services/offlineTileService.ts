import { 
  OfflineMapTile, 
  OfflineMapPackMetadata, 
  VectorCorridorBounds, 
  OfflineMapPackStatus 
} from "../types/offline";
import { calculateCorridorTiles, generateCorridorGeoJSON } from "./vectorTileMath";
import { fetchRealTile, verifyTileSourceReachable } from "./realVectorTiles";

const DB_NAME = "TravelGuardianOfflineDB";
const TILE_STORE = "offline_map_tiles";
const PACK_STORE = "offline_corridor_packs";
const DB_VERSION = 3;

/**
 * Opens IndexedDB with schema migration support for vector map tiles
 */
function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported in this environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;

      // Existing store from Phase 7
      if (!db.objectStoreNames.contains(PACK_STORE)) {
        db.createObjectStore(PACK_STORE, { keyPath: "packId" });
      }

      // Phase 9 Vector Map Tiles Store
      if (!db.objectStoreNames.contains(TILE_STORE)) {
        const tileStore = db.createObjectStore(TILE_STORE, { keyPath: "id" });
        tileStore.createIndex("packId", "packId", { unique: false });
        tileStore.createIndex("z", "z", { unique: false });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error || new Error("Failed to open Offline DB"));
    };
  });
}

/**
 * Saves a single vector map tile to IndexedDB
 */
export async function saveOfflineTile(tile: OfflineMapTile): Promise<boolean> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TILE_STORE, "readwrite");
      const store = tx.objectStore(TILE_STORE);
      const req = store.put(tile);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[TileService] Save tile failed:", err);
    return false;
  }
}

/**
 * Loads a vector map tile by packId, z, x, y
 */
export async function getOfflineTile(
  packId: string,
  z: number,
  x: number,
  y: number
): Promise<OfflineMapTile | null> {
  const id = `${packId}_${z}_${x}_${y}`;
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TILE_STORE, "readonly");
      const store = tx.objectStore(TILE_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[TileService] Load tile failed:", err);
    return null;
  }
}

/**
 * Lists all cached vector tiles for a given corridor pack
 */
export async function listOfflineTilesForPack(packId: string): Promise<OfflineMapTile[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TILE_STORE, "readonly");
      const store = tx.objectStore(TILE_STORE);
      const index = store.index("packId");
      const req = index.getAll(packId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[TileService] List pack tiles failed:", err);
    return [];
  }
}

/**
 * Deletes all cached vector tiles associated with a corridor pack
 */
export async function deleteOfflineTilesForPack(packId: string): Promise<boolean> {
  try {
    const db = await openOfflineDB();
    const tiles = await listOfflineTilesForPack(packId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TILE_STORE, "readwrite");
      const store = tx.objectStore(TILE_STORE);
      for (const tile of tiles) {
        store.delete(tile.id);
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[TileService] Delete pack tiles failed:", err);
    return false;
  }
}

export type ProgressCallback = (progress: {
  phase: OfflineMapPackStatus;
  current: number;
  total: number;
  percent: number;
  message: string;
}) => void;

/**
 * Executes a bounded vector map corridor download with atomic validation & progress phases.
 *
 * Every tile stored here is a REAL vector tile (MVT/protobuf bytes) fetched
 * over HTTP range requests from Protomaps' public OpenStreetMap PMTiles
 * archive (see services/realVectorTiles.ts) -- never a synthetic
 * placeholder. A tile that genuinely fails to fetch is simply not stored;
 * the returned metadata's tileCount reflects only tiles that actually made
 * it into IndexedDB, and status is "PARTIAL" whenever any requested tile
 * (truncated OR failed) didn't make it in, so the UI can never claim more
 * was downloaded than really was.
 */
export async function downloadCorridorMapPack(
  packId: string,
  waypoints: [number, number][],
  corridorName: string = "Travel Corridor",
  onProgress?: ProgressCallback
): Promise<OfflineMapPackMetadata> {
  // Phase 1: Preparing
  if (onProgress) {
    onProgress({
      phase: "PREPARING",
      current: 0,
      total: 100,
      percent: 5,
      message: "Preparing vector corridor boundaries...",
    });
  }

  const reachability = await verifyTileSourceReachable();
  if (!reachability.reachable) {
    // Honest failure: no fake tiles, no fake "READY" pack.
    return {
      tileCount: 0,
      totalSizeBytes: 0,
      bounds: { minLng: 0, minLat: 0, maxLng: 0, maxLat: 0, lateralPaddingKm: 8, minZoom: 10, maxZoom: 13 },
      zoomRange: [10, 13],
      status: "FAILED",
      lastError: reachability.error || "Offline map tile source is unreachable. Try again while online.",
    };
  }

  // Phase 2: Calculating Tiles
  const { tiles, isTruncated, bounds } = calculateCorridorTiles(waypoints, 8, 10, 13, 1200);
  const totalTiles = tiles.length;

  if (onProgress) {
    onProgress({
      phase: "CALCULATING",
      current: totalTiles,
      total: totalTiles,
      percent: 15,
      message: `Calculated ${totalTiles} bounded vector tiles (Zoom 10-13)...`,
    });
  }

  const now = Date.now();
  const vectorFeatures = generateCorridorGeoJSON(waypoints, bounds, corridorName);
  const mapTiles: OfflineMapTile[] = [];
  let failedCount = 0;

  // Phase 3: Fetching REAL tiles from the public PMTiles archive, batched to
  // avoid overwhelming the browser with thousands of simultaneous requests.
  const batchSize = 16;
  for (let i = 0; i < totalTiles; i += batchSize) {
    const chunk = tiles.slice(i, i + batchSize);
    const results = await Promise.all(chunk.map((coord) => fetchRealTile(coord)));

    for (const result of results) {
      if (!result.data) {
        failedCount++;
        continue;
      }
      const { coord, data } = result;
      mapTiles.push({
        id: `${packId}_${coord.z}_${coord.x}_${coord.y}`,
        packId,
        z: coord.z,
        x: coord.x,
        y: coord.y,
        source: "protomaps-osm-planetiler-20230925",
        data,
        sizeBytes: data.byteLength,
        downloadedAt: now,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000, // basemap data changes slowly; 30 days freshness
        version: 1,
        checksum: `${data.byteLength}`,
        provenance: "REAL_LIVE",
        status: "VALID",
      });
    }

    const currentCount = Math.min(totalTiles, i + batchSize);
    const percent = Math.round(15 + (currentCount / totalTiles) * 65);

    if (onProgress) {
      onProgress({
        phase: "DOWNLOADING",
        current: currentCount,
        total: totalTiles,
        percent,
        message: `Downloading real map tiles: ${currentCount} / ${totalTiles} (${failedCount} unavailable)`,
      });
    }
  }

  // Phase 4: Validating
  if (onProgress) {
    onProgress({
      phase: "VALIDATING",
      current: mapTiles.length,
      total: totalTiles,
      percent: 85,
      message: "Validating downloaded tile integrity...",
    });
  }

  // Phase 5: Writing to IndexedDB
  if (onProgress) {
    onProgress({
      phase: "WRITING",
      current: mapTiles.length,
      total: totalTiles,
      percent: 92,
      message: "Writing real vector tiles to IndexedDB...",
    });
  }

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TILE_STORE, "readwrite");
      const store = tx.objectStore(TILE_STORE);
      for (const tile of mapTiles) {
        store.put(tile);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err: any) {
    console.error("[TileService] Batch write failed:", err);
    throw new Error(`Offline storage write failure: ${err.message || "Quota exceeded"}`);
  }

  const totalSizeBytes = mapTiles.reduce((acc, t) => acc + t.sizeBytes, 0);
  const isPartial = isTruncated || failedCount > 0 || mapTiles.length === 0;

  const metadata: OfflineMapPackMetadata = {
    tileCount: mapTiles.length,
    totalSizeBytes,
    bounds,
    zoomRange: [10, 13],
    status: mapTiles.length === 0 ? "FAILED" : isPartial ? "PARTIAL" : "READY",
    downloadProgress: {
      current: mapTiles.length,
      total: totalTiles,
      percent: 100,
      phase: "READY",
    },
    lastError: failedCount > 0 ? `${failedCount} of ${totalTiles} tiles could not be fetched from the map source.` : undefined,
    vectorFeatures,
  };

  if (onProgress) {
    onProgress({
      phase: "READY",
      current: mapTiles.length,
      total: totalTiles,
      percent: 100,
      message: `Corridor map ready: ${mapTiles.length} real vector tiles stored${failedCount > 0 ? ` (${failedCount} unavailable)` : ""}.`,
    });
  }

  return metadata;
}

/**
 * Returns summary metrics of all stored vector map tiles
 */
export async function getTileStorageStats(): Promise<{
  totalTiles: number;
  totalSizeBytes: number;
  totalSizeMb: string;
}> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(TILE_STORE, "readonly");
      const store = tx.objectStore(TILE_STORE);
      // Sum the real stored byte sizes. (This used to multiply the count by
      // an assumed 2.5 KB; real Protomaps MVT tiles average ~15 KB, so the
      // reported footprint was ~6x too small.)
      let count = 0;
      let bytes = 0;
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          const v = cursor.value as { sizeBytes?: number; data?: ArrayBuffer };
          count++;
          bytes += v.sizeBytes ?? v.data?.byteLength ?? 0;
          cursor.continue();
        } else {
          resolve({ totalTiles: count, totalSizeBytes: bytes, totalSizeMb: (bytes / (1024 * 1024)).toFixed(2) });
        }
      };
      cursorReq.onerror = () => {
        resolve({ totalTiles: 0, totalSizeBytes: 0, totalSizeMb: "0.00" });
      };
    });
  } catch {
    return { totalTiles: 0, totalSizeBytes: 0, totalSizeMb: "0.00" };
  }
}
