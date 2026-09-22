import { 
  EscalationAlertPayload, 
  NotificationResult, 
  NotificationProviderStatus,
  LocationSnapshot,
  TrustedContact 
} from "../types/safetyCheckIn";
import { NavigationPosition } from "../types/navigation";

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
 * Sends or simulates trusted contact alert.
 * Returns truthful providerStatus: "NOT_CONFIGURED" or "DEV_SIMULATED".
 * Never claims fake "SENT" unless a real provider integration exists.
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

  // Check if real SMS environment variables exist (server-side check simulation)
  const isRealProviderConfigured = false; // Twilio / SNS not configured in this environment

  const providerStatus: NotificationProviderStatus = isRealProviderConfigured 
    ? "SENT" 
    : "NOT_CONFIGURED";

  const statusExplanation = isRealProviderConfigured
    ? "Live SMS transmitted via gateway."
    : "SMS gateway not configured in environment. Alert prepared truthfully for local review (NOT_CONFIGURED).";

  const result: NotificationResult = {
    alertId: payload.alertId,
    providerStatus,
    message: `${statusExplanation}\n${formattedMessage}`,
    timestamp: Date.now(),
    recipientCount: activeRecipients.length,
    recipients: activeRecipients.map(r => ({
      contactId: r.id,
      phone: r.phone,
      status: providerStatus
    }))
  };

  return result;
}

/**
 * Resets the escalation guard when starting a new session
 */
export function clearEscalationHistory() {
  escalatedCycleIds.clear();
}
