import { City, RouteOption } from "../data/routeData";
import { LocationDetails } from "./location";
import { ManeuverType } from "./navigation";

export type NetworkConnectivityStatus = "ONLINE" | "OFFLINE" | "RECONNECTING";

export type GPSNetworkState = 
  | "GPS_ONLINE_NET_ONLINE"
  | "GPS_ONLINE_NET_OFFLINE"
  | "GPS_OFFLINE_NET_ONLINE"
  | "GPS_OFFLINE_NET_OFFLINE";

export type CacheFreshness = "FRESH" | "STALE" | "EXPIRED";

export type DataProvenance = 
  | "REAL_LIVE"
  | "CACHED"
  | "STALE_CACHED"
  | "UNAVAILABLE"
  | "NOT_CONFIGURED"
  | "DEV_SIMULATED";

export interface CachedTurnInstruction {
  stepIndex: number;
  instruction: string;
  distanceText: string;
  durationText: string;
  maneuverType: ManeuverType;
}

export interface CachedSafeHaven {
  id: string;
  name: string;
  type: "Hospital" | "Police Station" | "Fuel Stop" | "Rest Stop";
  distanceAheadText: string;
  phone?: string;
  amenities?: string;
  notes?: string;
}

export interface CachedEmergencyInfo {
  nationalEmergencyNumber: string; // "112"
  womenHelpline: string; // "1091"
  ambulanceNumber: string; // "108"
  consularHelpline?: string;
  sourceCachedAt: number;
  disclaimer: string;
}

// Phase 9: Vector Corridor & Offline Map Types
export interface VectorTileCoordinate {
  z: number;
  x: number;
  y: number;
}

export interface OfflineMapTile {
  id: string; // `${packId}_${z}_${x}_${y}`
  packId: string;
  z: number;
  x: number;
  y: number;
  source: string;
  data?: string; // Base64 or GeoJSON string
  sizeBytes: number;
  downloadedAt: number;
  expiresAt: number;
  version: number;
  checksum: string;
  provenance: DataProvenance;
  status: "VALID" | "CORRUPTED" | "MISSING";
}

export interface VectorCorridorBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  lateralPaddingKm: number;
  minZoom: number;
  maxZoom: number;
}

export type OfflineMapPackStatus = 
  | "PREPARING"
  | "CALCULATING"
  | "DOWNLOADING"
  | "VALIDATING"
  | "WRITING"
  | "READY"
  | "PARTIAL"
  | "FAILED";

export interface OfflineMapPackMetadata {
  tileCount: number;
  totalSizeBytes: number;
  bounds: VectorCorridorBounds;
  zoomRange: [number, number]; // e.g. [10, 13]
  status: OfflineMapPackStatus;
  downloadProgress?: {
    current: number;
    total: number;
    percent: number;
    phase: string;
  };
  lastError?: string;
  vectorFeatures?: any; // GeoJSON feature collection for corridor rendering
}

export interface OfflineCorridorPack {
  packId: string;
  packName: string;
  schemaVersion: string;
  version: number;
  origin: City | LocationDetails;
  destination: City | LocationDetails;
  travelMode: "Car" | "Bike" | "Walk";
  route: RouteOption;
  turnInstructions: CachedTurnInstruction[];
  safeHavens: CachedSafeHaven[];
  emergencyInfo: CachedEmergencyInfo;
  createdAt: number;
  updatedAt: number;
  approxSizeKb: number;
  provenance: DataProvenance;
  mapPack?: OfflineMapPackMetadata;
}

export interface OfflineStorageUsage {
  totalPacks: number;
  estimatedSizeKb: number;
  activePackId: string | null;
  totalTilesCount?: number;
  tilesStorageKb?: number;
}
