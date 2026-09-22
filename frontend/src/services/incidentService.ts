import { IncidentReport, IncidentType } from "../types/safety";

const INCIDENTS_STORAGE_KEY = "travel_guardian_user_incidents";
const INCIDENT_VALIDITY_HOURS = 6; // Incidents expire 6 hours after report time

/**
 * Retrieve all active community-reported incidents from local storage.
 * Automatically marks incidents older than 6 hours as EXPIRED.
 */
export function getActiveIncidents(): IncidentReport[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(INCIDENTS_STORAGE_KEY);
    if (!raw) return getDefaultSeedIncidents();

    const list: IncidentReport[] = JSON.parse(raw);
    const now = Date.now();
    const expiryMs = INCIDENT_VALIDITY_HOURS * 60 * 60 * 1000;

    let updated = false;
    const active = list.map(item => {
      if (item.status === "ACTIVE" && now - item.timestamp > expiryMs) {
        updated = true;
        return { ...item, status: "EXPIRED" as const };
      }
      return item;
    });

    if (updated) {
      localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(active));
    }

    return active.filter(i => i.status === "ACTIVE");
  } catch (err) {
    console.error("Failed to load user incidents from storage", err);
    return [];
  }
}

/**
 * Submit a new community/user incident report.
 */
export function reportCommunityIncident(
  type: IncidentType,
  latitude: number,
  longitude: number,
  description: string,
  routeCorridor?: string
): IncidentReport {
  const newIncident: IncidentReport = {
    id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    latitude,
    longitude,
    description: description.trim(),
    timestamp: Date.now(),
    status: "ACTIVE",
    source: "USER_REPORT",
    routeCorridor
  };

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(INCIDENTS_STORAGE_KEY);
      const list: IncidentReport[] = raw ? JSON.parse(raw) : getDefaultSeedIncidents();
      list.unshift(newIncident);
      localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error("Failed to persist user incident report", err);
    }
  }

  return newIncident;
}

/**
 * Mark an incident as resolved.
 */
export function resolveIncident(incidentId: string): void {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(INCIDENTS_STORAGE_KEY);
    if (!raw) return;
    const list: IncidentReport[] = JSON.parse(raw);
    const updated = list.map(item => item.id === incidentId ? { ...item, status: "RESOLVED" as const } : item);
    localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to update incident status", err);
  }
}

/**
 * Sample initial community reports clearly marked as USER_REPORT.
 */
function getDefaultSeedIncidents(): IncidentReport[] {
  const now = Date.now();
  return [
    {
      id: "seed_inc_1",
      type: "Road blocked",
      latitude: 12.9850,
      longitude: 78.5500,
      description: "Minor road culvert maintenance along single-lane link near bypass. Slow moving traffic.",
      timestamp: now - (1 * 60 * 60 * 1000), // 1 hour ago
      status: "ACTIVE",
      source: "USER_REPORT",
      routeCorridor: "NH 48"
    }
  ];
}
