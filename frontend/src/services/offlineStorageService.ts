import { 
  OfflineCorridorPack, 
  CacheFreshness, 
  OfflineStorageUsage, 
  CachedTurnInstruction, 
  CachedSafeHaven 
} from "../types/offline";
import { CITIES, generateRoutes } from "../data/routeData";
import { calculateCorridorBounds, generateCorridorGeoJSON } from "./vectorTileMath";
import { deleteOfflineTilesForPack, getTileStorageStats } from "./offlineTileService";

const DB_NAME = "TravelGuardianOfflineDB";
const STORE_NAME = "offline_corridor_packs";
const ACTIVE_PACK_KEY = "tg_active_offline_pack_id";
const SCHEMA_VERSION = "1.0.0";

// Memory / LocalStorage fallback storage key
const FALLBACK_KEY = "tg_offline_packs_fallback";

/**
 * Calculates freshness of a cached pack based on elapsed time
 */
export function getPackFreshness(pack: OfflineCorridorPack): CacheFreshness {
  const now = Date.now();
  const ageMs = now - pack.updatedAt;
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;

  if (ageMs <= oneDayMs) {
    return "FRESH";
  } else if (ageMs <= sevenDaysMs) {
    return "STALE";
  } else {
    return "EXPIRED";
  }
}

/**
 * Creates default sample corridor packs for out-of-the-box offline demonstration
 */
export function createDefaultCorridorPacks(): OfflineCorridorPack[] {
  const origin = CITIES["chennai"];
  const dest = CITIES["bangalore"];
  const routes = generateRoutes(origin.id, dest.id, "Car");
  const mainRoute = routes[0];

  const turnInstructions: CachedTurnInstruction[] = [
    { stepIndex: 1, instruction: "Head north on Grand Southern Trunk Rd (GST Rd / NH 48)", distanceText: "2.4 km", durationText: "5 mins", maneuverType: "straight" },
    { stepIndex: 2, instruction: "Take Kathipara Flyover ramp toward Poonamallee High Rd", distanceText: "1.2 km", durationText: "3 mins", maneuverType: "turn-slight-left" },
    { stepIndex: 3, instruction: "Merge onto Chennai - Bangalore Expressway (NH 48)", distanceText: "140 km", durationText: "2h 15m", maneuverType: "straight" },
    { stepIndex: 4, instruction: "Pass through Sriperumbudur Industrial Corridor Toll Plaza", distanceText: "45 km", durationText: "40 mins", maneuverType: "straight" },
    { stepIndex: 5, instruction: "Continue on Vellore Bypass toward Krishnagiri Interchange", distanceText: "95 km", durationText: "1h 30m", maneuverType: "straight" },
    { stepIndex: 6, instruction: "Take exit toward Electronic City Flyover / Hosur Rd", distanceText: "32 km", durationText: "35 mins", maneuverType: "turn-slight-right" },
    { stepIndex: 7, instruction: "Arrive at Bangalore City Center", distanceText: "8 km", durationText: "15 mins", maneuverType: "arrive" }
  ];

  const safeHavens: CachedSafeHaven[] = [
    { id: "h1", name: "Apollo Emergency Care Center", type: "Hospital", distanceAheadText: "12 km ahead", phone: "044-28290200", notes: "24/7 Trauma Emergency Unit" },
    { id: "h2", name: "Government General Hospital & Trauma Center", type: "Hospital", distanceAheadText: "45 km ahead", phone: "108", notes: "Public emergency facility" },
    { id: "h3", name: "Manipal Highway Medical Haven", type: "Hospital", distanceAheadText: "120 km ahead", phone: "080-25024444", notes: "ICU & Ambulance dispatch" },
    { id: "p1", name: "Highway Patrol Control Post #4", type: "Police Station", distanceAheadText: "18 km ahead", phone: "112", notes: "Active 24/7 patrol booth" },
    { id: "p2", name: "Krishnagiri District Police Sub-Station", type: "Police Station", distanceAheadText: "165 km ahead", phone: "100", notes: "Highway security post" },
    { id: "f1", name: "HP 24/7 National Highway Oasis", type: "Fuel Stop", distanceAheadText: "35 km ahead", amenities: "Fuel, Clean Restrooms, Food Court, EV Fast Charger" },
    { id: "f2", name: "IndianOil COCO Highway Plaza", type: "Fuel Stop", distanceAheadText: "85 km ahead", amenities: "24/7 CCTV, Rest Area, Air/Nitrogen" },
    { id: "r1", name: "Highway Travelers Safe Plaza", type: "Rest Stop", distanceAheadText: "70 km ahead", amenities: "24/7 Security, Food Court, Well-lit Parking" }
  ];

  const now = Date.now();
  const bounds = calculateCorridorBounds(mainRoute.waypoints, 8, 10, 13);
  const vectorFeatures = generateCorridorGeoJSON(mainRoute.waypoints, bounds, "Chennai ➔ Bangalore (NH 48 Corridor)");

  const defaultPack: OfflineCorridorPack = {
    packId: "pack_chennai_bangalore_nh48",
    packName: "Chennai ➔ Bangalore (NH 48 Corridor)",
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    origin,
    destination: dest,
    travelMode: "Car",
    route: mainRoute,
    turnInstructions,
    safeHavens,
    emergencyInfo: {
      nationalEmergencyNumber: "112",
      womenHelpline: "1091",
      ambulanceNumber: "108",
      consularHelpline: "+91 11 2419 8000",
      sourceCachedAt: now,
      disclaimer: "Cached static emergency intelligence. Offline availability cannot be verified in real time."
    },
    createdAt: now,
    updatedAt: now,
    approxSizeKb: 64,
    provenance: "CACHED",
    mapPack: {
      tileCount: 420,
      totalSizeBytes: 420 * 2500,
      bounds,
      zoomRange: [10, 13],
      status: "READY",
      downloadProgress: {
        current: 420,
        total: 420,
        percent: 100,
        phase: "READY"
      },
      vectorFeatures
    }
  };

  return [defaultPack];
}

/**
 * Internal helper to open IndexedDB
 */
const DB_VERSION = 3;

/**
 * Internal helper to open IndexedDB with unified store definitions
 */
export function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not available in this environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "packId" });
      }
      if (!db.objectStoreNames.contains("offline_map_tiles")) {
        const tileStore = db.createObjectStore("offline_map_tiles", { keyPath: "id" });
        tileStore.createIndex("packId", "packId", { unique: false });
        tileStore.createIndex("z", "z", { unique: false });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error || new Error("Failed to open IndexedDB"));
    };
  });
}

/**
 * Saves an offline corridor pack to IndexedDB with localStorage fallback
 */
export async function saveOfflinePack(
  pack: OfflineCorridorPack
): Promise<{ success: boolean; error?: string }> {
  const updatedPack: OfflineCorridorPack = {
    ...pack,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: Date.now()
  };

  // 1. Try IndexedDB
  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(updatedPack);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Mark as active pack if none currently set
    const currentActive = getActiveOfflinePackId();
    if (!currentActive) {
      setActiveOfflinePackId(updatedPack.packId);
    }

    return { success: true };
  } catch (err: any) {
    console.warn("IndexedDB save failed, attempting localStorage fallback:", err);

    // 2. LocalStorage Fallback (strip heavy vector features to prevent QuotaExceededError)
    try {
      if (typeof window !== "undefined") {
        const lightweightPack: OfflineCorridorPack = {
          ...updatedPack,
          mapPack: updatedPack.mapPack ? {
            ...updatedPack.mapPack,
            vectorFeatures: undefined // Omit heavy GeoJSON from localStorage to respect 5MB limit
          } : undefined
        };
        const existing = listFallbackPacks();
        const filtered = existing.filter(p => p.packId !== lightweightPack.packId);
        filtered.push(lightweightPack);
        localStorage.setItem(FALLBACK_KEY, JSON.stringify(filtered));
        setActiveOfflinePackId(lightweightPack.packId);
        return { success: true };
      }
    } catch (lsErr: any) {
      console.error("LocalStorage fallback failed as well:", lsErr);
      return { success: false, error: "Storage quota exceeded or storage unavailable." };
    }
  }

  return { success: true };
}

/**
 * Loads a single offline corridor pack by ID
 */
export async function loadOfflinePack(packId: string): Promise<OfflineCorridorPack | null> {
  try {
    const db = await openIndexedDB();
    const pack = await new Promise<OfflineCorridorPack | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(packId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (pack) return pack;
  } catch (err) {
    console.warn("IndexedDB load failed, checking fallback:", err);
  }

  // Check fallback
  const fallbackList = listFallbackPacks();
  const found = fallbackList.find(p => p.packId === packId);
  if (found) return found;

  // Check default packs
  const defaults = createDefaultCorridorPacks();
  return defaults.find(p => p.packId === packId) || null;
}

/**
 * Lists all stored offline corridor packs
 */
export async function listOfflinePacks(): Promise<OfflineCorridorPack[]> {
  let list: OfflineCorridorPack[] = [];

  try {
    const db = await openIndexedDB();
    list = await new Promise<OfflineCorridorPack[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB list failed, loading fallback:", err);
  }

  if (list.length === 0) {
    list = listFallbackPacks();
  }

  if (list.length === 0) {
    const defaults = createDefaultCorridorPacks();
    // Auto-populate default pack
    if (typeof window !== "undefined") {
      saveOfflinePack(defaults[0]).catch(() => {});
    }
    return defaults;
  }

  return list;
}

/**
 * Deletes an offline corridor pack by ID and purges its vector tiles
 */
export async function deleteOfflinePack(packId: string): Promise<boolean> {
  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(packId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB delete failed, deleting from fallback:", err);
  }

  // Delete associated vector tiles
  await deleteOfflineTilesForPack(packId);

  if (typeof window !== "undefined") {
    const fallbackList = listFallbackPacks().filter(p => p.packId !== packId);
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(fallbackList));

    if (getActiveOfflinePackId() === packId) {
      localStorage.removeItem(ACTIVE_PACK_KEY);
    }
  }

  return true;
}

/**
 * Returns the currently active offline corridor pack
 */
export async function getActiveOfflinePack(): Promise<OfflineCorridorPack | null> {
  const activeId = getActiveOfflinePackId();
  if (activeId) {
    const pack = await loadOfflinePack(activeId);
    if (pack) return pack;
  }

  const all = await listOfflinePacks();
  return all.length > 0 ? all[0] : null;
}

export function getActiveOfflinePackId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_PACK_KEY);
}

export function setActiveOfflinePackId(packId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ACTIVE_PACK_KEY, packId);
  }
}

/**
 * Returns overall storage usage estimate including vector tile footprints
 */
export async function getStorageUsage(): Promise<OfflineStorageUsage> {
  const packs = await listOfflinePacks();
  const totalKb = packs.reduce((acc, p) => acc + (p.approxSizeKb || 50), 0);
  const tileStats = await getTileStorageStats();

  return {
    totalPacks: packs.length,
    estimatedSizeKb: totalKb + Math.round(tileStats.totalSizeBytes / 1024),
    activePackId: getActiveOfflinePackId(),
    totalTilesCount: tileStats.totalTiles,
    tilesStorageKb: Math.round(tileStats.totalSizeBytes / 1024),
  };
}

function listFallbackPacks(): OfflineCorridorPack[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const offlineStorageService = {
  saveOfflinePack,
  loadOfflinePack,
  listOfflinePacks,
  deleteOfflinePack,
  getActiveOfflinePack,
  getActiveOfflinePackId,
  setActiveOfflinePackId,
  getStorageUsage,
  getPackFreshness,
  createDefaultCorridorPacks,
};
