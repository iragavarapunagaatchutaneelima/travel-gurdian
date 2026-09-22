import { VectorTileCoordinate, VectorCorridorBounds } from "../types/offline";

/**
 * Converts Longitude/Latitude in WGS84 degrees to Slippy Tile coordinates (X, Y) at zoom level Z
 */
export function lonLatToTile(lon: number, lat: number, zoom: number): VectorTileCoordinate {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );

  // Clamp to valid range [0, 2^zoom - 1]
  const clampedX = Math.max(0, Math.min(n - 1, x));
  const clampedY = Math.max(0, Math.min(n - 1, y));

  return { z: zoom, x: clampedX, y: clampedY };
}

/**
 * Converts Slippy Tile (X, Y, Z) to WGS84 geographic bounding box [minLng, minLat, maxLng, maxLat]
 */
export function tileToLonLatBounds(x: number, y: number, z: number): [number, number, number, number] {
  const n = Math.pow(2, z);
  const minLng = (x / n) * 360 - 180;
  const maxLng = ((x + 1) / n) * 360 - 180;
  
  const latRad1 = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const maxLat = (latRad1 * 180) / Math.PI;

  const latRad2 = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
  const minLat = (latRad2 * 180) / Math.PI;

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Computes bounding box and lateral padding around route waypoints
 */
export function calculateCorridorBounds(
  waypoints: [number, number][], // [[lng, lat], ...]
  lateralPaddingKm: number = 8,
  minZoom: number = 10,
  maxZoom: number = 13
): VectorCorridorBounds {
  if (!waypoints || waypoints.length === 0) {
    return {
      minLng: 77.0,
      minLat: 12.0,
      maxLng: 81.0,
      maxLat: 14.0,
      lateralPaddingKm,
      minZoom,
      maxZoom,
    };
  }

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of waypoints) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  // 1 km ≈ 0.009 degrees latitude; 0.009 / cos(lat) degrees longitude
  const avgLat = (minLat + maxLat) / 2;
  const latPaddingDeg = lateralPaddingKm * 0.009;
  const lngPaddingDeg = (lateralPaddingKm * 0.009) / Math.max(0.2, Math.cos((avgLat * Math.PI) / 180));

  return {
    minLng: Math.max(-180, minLng - lngPaddingDeg),
    minLat: Math.max(-85, minLat - latPaddingDeg),
    maxLng: Math.min(180, maxLng + lngPaddingDeg),
    maxLat: Math.min(85, maxLat + latPaddingDeg),
    lateralPaddingKm,
    minZoom,
    maxZoom,
  };
}

/**
 * Calculates a deduplicated list of vector tile coordinates along route corridor
 * Enforces maximum tile count to protect device memory and storage limits
 */
export function calculateCorridorTiles(
  waypoints: [number, number][],
  lateralPaddingKm: number = 8,
  minZoom: number = 10,
  maxZoom: number = 13,
  maxTileLimit: number = 1200
): { tiles: VectorTileCoordinate[]; isTruncated: boolean; bounds: VectorCorridorBounds } {
  const bounds = calculateCorridorBounds(waypoints, lateralPaddingKm, minZoom, maxZoom);
  const tileMap = new Map<string, VectorTileCoordinate>();

  // Iterate over constrained zoom levels
  for (let z = minZoom; z <= maxZoom; z++) {
    // Convert bounding envelope to tile limits
    const nwTile = lonLatToTile(bounds.minLng, bounds.maxLat, z);
    const seTile = lonLatToTile(bounds.maxLng, bounds.minLat, z);

    const minX = Math.min(nwTile.x, seTile.x);
    const maxX = Math.max(nwTile.x, seTile.x);
    const minY = Math.min(nwTile.y, seTile.y);
    const maxY = Math.max(nwTile.y, seTile.y);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${z}/${x}/${y}`;
        if (!tileMap.has(key)) {
          tileMap.set(key, { z, x, y });
          if (tileMap.size >= maxTileLimit) {
            return {
              tiles: Array.from(tileMap.values()),
              isTruncated: true,
              bounds,
            };
          }
        }
      }
    }
  }

  return {
    tiles: Array.from(tileMap.values()),
    isTruncated: false,
    bounds,
  };
}

/**
 * Generates an offline GeoJSON vector feature collection for the corridor
 */
export function generateCorridorGeoJSON(
  routeWaypoints: [number, number][],
  bounds: VectorCorridorBounds,
  corridorName: string = "Active Corridor"
): any {
  return {
    type: "FeatureCollection",
    properties: {
      corridorName,
      createdAt: Date.now(),
      bounds,
    },
    features: [
      {
        type: "Feature",
        properties: {
          type: "corridor_bounding_box",
          name: `${corridorName} Coverage Area`,
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [bounds.minLng, bounds.minLat],
              [bounds.maxLng, bounds.minLat],
              [bounds.maxLng, bounds.maxLat],
              [bounds.minLng, bounds.maxLat],
              [bounds.minLng, bounds.minLat],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: {
          type: "corridor_route_line",
          name: corridorName,
        },
        geometry: {
          type: "LineString",
          coordinates: routeWaypoints,
        },
      },
    ],
  };
}
