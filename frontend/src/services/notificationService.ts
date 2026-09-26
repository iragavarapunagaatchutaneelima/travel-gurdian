import { 
  EscalationAlertPayload, 
  NotificationResult, 
  NotificationProviderStatus,
  LocationSnapshot,
  TrustedContact 
} from "../types/safetyCheckIn";
import { NavigationPosition } from "../types/navigation";
import { TravelGuardianAPI } from "./api";

// Set of cycle IDs that have already been escalated to prevent duplicate alerts
const escalatedCycleIds = new Set<string>();

/**
 * Creates a clean LocationSnapshot from NavigationPosition
 */
export function createLocationSnapshot(
  position: NavigationPosition | null,
  maxAgeMs = 120000 // 2 minutes staleness threshold
): LocationSnapshot | null {
  if (!position) return null;

  const now = Date.now();
  const isStale = (now - position.timestamp) > maxAgeMs;
  const lat = position.latitude;
  const lng = position.longitude;

  return {
    latitude: lat,
    longitude: lng,
    accuracy: Math.round(position.accuracy || 0),
    timestamp: position.timestamp,
    isStale,
    googleMapsUrl: `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`,
    formattedText: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} (±${Math.round(position.accuracy || 0)}m)`
  };
}

/**
 * Builds the truthful alert message text
 */
export function formatAlertMessage(payload: EscalationAlertPayload): string {
  const timeStr = new Date(payload.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  let msg = "";

  if (payload.reason === "USER_REQUESTED_HELP") {
    msg = `[TRAVEL GUARDIAN] User requested emergency assistance at ${timeStr}.`;
  } else {
    msg = `[TRAVEL GUARDIAN] Scheduled safety check-in was missed at ${timeStr}.`;
  }

  if (payload.destinationName) {
    msg += ` Journey destination: ${payload.destinationName}.`;
  }

  if (payload.locationSnapshot) {
    msg += ` Last known location: ${payload.locationSnapshot.formattedText} (recorded ${new Date(payload.locationSnapshot.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}). Maps: ${payload.locationSnapshot.googleMapsUrl}`;
  } else {
    msg += ` Location telemetry: Currently unavailable.`;
  }

  if (payload.userMessage) {
    msg += ` Note: ${payload.userMessage}`;
  }

  return msg;
}

/**
 * Sends a trusted contact alert THROUGH THE REAL BACKEND (which resolves the
 * backend's own primary trusted contact and dispatches via Exotel, honoring
 * EXOTEL_DRY_RUN). This never fabricates a "SENT" result client-side: the
 * providerStatus returned always reflects what the backend actually did.
 */
export async function sendTrustedContactAlert(
  payload: EscalationAlertPayload
): Promise<NotificationResult> {
  // 1. Guard against duplicate escalation for the exact same check-in cycle
  if (escalatedCycleIds.has(payload.cycleId)) {
    return {
      alertId: payload.alertId,
      providerStatus: "DEV_SIMULATED",
      message: `Alert already evaluated for cycle ${payload.cycleId}. Suppressing duplicate transmission.`,
      timestamp: Date.now(),
      recipientCount: 0,
      recipients: []
    };
  }

  escalatedCycleIds.add(payload.cycleId);

  const activeRecipients = payload.recipients.filter(r => r.enabled);
  const formattedMessage = formatAlertMessage(payload);

  try {
    const res = await TravelGuardianAPI.notifyTrustedContact({
      latitude: payload.locationSnapshot?.latitude,
      longitude: payload.locationSnapshot?.longitude,
      location_name: payload.locationSnapshot?.formattedText,
      custom_message: payload.userMessage || formattedMessage
    });

    let providerStatus: NotificationProviderStatus;
    if (res.overall_status === "dry_run") {
      providerStatus = "DRY_RUN";
    } else if (res.success) {
      providerStatus = "SENT";
    } else {
      providerStatus = "FAILED";
    }

    return {
      alertId: payload.alertId,
      providerStatus,
      message: res.safe_message || res.message || formattedMessage,
      timestamp: Date.now(),
      recipientCount: activeRecipients.length,
      recipients: activeRecipients.map(r => ({
        contactId: r.id,
        phone: r.phone,
        status: providerStatus
      }))
    };
  } catch (err: any) {
    // Backend unreachable or no trusted contact configured: report honestly,
    // never as SENT.
    const detail = err?.detail || err?.message || "Backend emergency service unreachable.";
    return {
      alertId: payload.alertId,
      providerStatus: "FAILED",
      message: `Emergency alert could not be dispatched: ${detail}. Please dial 112 directly if in immediate danger.`,
      timestamp: Date.now(),
      recipientCount: 0,
      recipients: []
    };
  }
}

/**
 * Resets the escalation guard when starting a new session
 */
export function clearEscalationHistory() {
  escalatedCycleIds.clear();
}
