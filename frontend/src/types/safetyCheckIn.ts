export type SafetyCheckInStatus = 
  | "DISABLED"
  | "CONFIGURED"
  | "ACTIVE"
  | "REMINDER"
  | "GRACE_PERIOD"
  | "MISSED"
  | "ESCALATING"
  | "RESOLVED"
  | "CANCELLED";

export type NotificationProviderStatus =
  | "SENT"
  | "FAILED"
  | "NOT_CONFIGURED"
  | "DRY_RUN"
  | "DEV_SIMULATED";

export interface TrustedContact {
  id: string;
  backendId?: number;
  name: string;
  phone: string;
  relationship?: string;
  enabled: boolean;
  createdAt: number;
}

export interface SafetyCheckInConfig {
  enabled: boolean;
  intervalMinutes: number;
  gracePeriodMinutes: number;
  customIntervalMinutes?: number;
  autoEscalateToContacts: boolean;
  sendLocationSnapshot: boolean;
}

export interface CheckInCycle {
  cycleId: string;
  cycleNumber: number;
  startedAt: number;
  scheduledCheckInAt: number;
  gracePeriodEndsAt: number;
  confirmedAt?: number;
  missedAt?: number;
  status: SafetyCheckInStatus;
}

export interface LocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  isStale: boolean;
  googleMapsUrl?: string;
  formattedText?: string;
}

export interface EscalationAlertPayload {
  alertId: string;
  cycleId: string;
  timestamp: number;
  reason: "CHECK_IN_MISSED" | "USER_REQUESTED_HELP";
  userMessage?: string;
  locationSnapshot: LocationSnapshot | null;
  destinationName?: string;
  journeyName?: string;
  recipients: TrustedContact[];
}

export interface NotificationResult {
  alertId: string;
  providerStatus: NotificationProviderStatus;
  message: string;
  timestamp: number;
  recipientCount: number;
  recipients: {
    contactId: string;
    phone: string;
    status: NotificationProviderStatus;
  }[];
}

export interface SafetyCheckInSession {
  sessionId: string;
  config: SafetyCheckInConfig;
  status: SafetyCheckInStatus;
  activeCycle: CheckInCycle | null;
  completedCycles: CheckInCycle[];
  lastConfirmedAt: number | null;
  escalationResult: NotificationResult | null;
  destinationName?: string;
  journeyId?: string;
}
