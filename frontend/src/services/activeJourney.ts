import { RouteOption } from "../data/routeData";

/**
 * The journey currently selected on Live Map, shared (per browser tab via
 * sessionStorage) with AI Guardian so answers like "how will the weather
 * affect my journey?" use the real planned route instead of a placeholder.
 * Only the fields AI Guardian and the Digital Twin need are kept.
 */
const KEY = "tg_active_journey";

export interface ActiveJourney {
  route: RouteOption;
  originName: string | null;
  destinationName: string | null;
  travelMode: string | null;
  savedAt: number;
}

export function saveActiveJourney(route: RouteOption, originName: string | null, destinationName: string | null, travelMode: string | null) {
  try {
    const slim: RouteOption = {
      ...route,
      steps: undefined,
      legs: undefined,
    };
    sessionStorage.setItem(KEY, JSON.stringify({ route: slim, originName, destinationName, travelMode, savedAt: Date.now() }));
  } catch {
    // Storage unavailable/full: AI Guardian simply won't know the journey.
  }
}

export function loadActiveJourney(): ActiveJourney | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.route?.waypoints?.length >= 2 ? parsed : null;
  } catch {
    return null;
  }
}
