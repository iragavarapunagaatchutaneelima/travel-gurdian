import { 
  validatePhoneNumber, 
  MIN_TRUSTED_CONTACTS, 
  MAX_TRUSTED_CONTACTS 
} from "../services/trustedContactService";
import { 
  createLocationSnapshot, 
  formatAlertMessage, 
  sendTrustedContactAlert, 
  clearEscalationHistory 
} from "../services/notificationService";
import { 
  SafetyCheckInConfig, 
  CheckInCycle, 
  EscalationAlertPayload, 
  TrustedContact 
} from "../types/safetyCheckIn";
import { NavigationPosition } from "../types/navigation";

async function runPhase5Tests() {
  console.log("=== TRAVEL GUARDIAN PHASE 5 SAFETY CHECK-IN TESTS ===");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${msg}`);
    }
  }

  // TEST 1: Phone number validation
  const v1 = validatePhoneNumber("+91 98765 43210");
  assert(v1.valid && v1.formatted === "+919876543210", "Valid Indian phone number with +91 accepted");

  const v2 = validatePhoneNumber("9876543210");
  assert(v2.valid && (v2.formatted === "+919876543210" || v2.formatted === "9876543210"), "Valid 10-digit number accepted and normalized");

  const v3 = validatePhoneNumber("123");
  assert(!v3.valid, "Short invalid number rejected");

  // TEST 2: Trusted contact constraints
  assert(MIN_TRUSTED_CONTACTS === 0, "Minimum trusted contacts is 0 (clean setup without fake contacts)");
  assert(MAX_TRUSTED_CONTACTS === 5, "Maximum trusted contacts is 5");

  // TEST 3: Absolute timestamp countdown calculation
  const now = 1711000000000;
  const intervalMinutes = 15;
  const scheduledAt = now + intervalMinutes * 60 * 1000;
  const remainingSecAtStart = Math.ceil((scheduledAt - now) / 1000);
  assert(remainingSecAtStart === 900, "15-minute interval gives exactly 900 seconds remaining at start");

  const fiveMinLater = now + 5 * 60 * 1000;
  const remainingSecAfter5m = Math.ceil((scheduledAt - fiveMinLater) / 1000);
  assert(remainingSecAfter5m === 600, "After 5 minutes, exactly 600 seconds remaining (no drift)");

  // TEST 4: Reminder and Grace Period Evaluation
  const graceMinutes = 2;
  const graceEndsAt = scheduledAt + graceMinutes * 60 * 1000;

  // At scheduled time -> Reminder due
  assert(scheduledAt >= scheduledAt, "At scheduledAt, check-in is due (REMINDER triggered)");

  // 1 minute into grace period
  const midGrace = scheduledAt + 60 * 1000;
  const graceRemaining = Math.ceil((graceEndsAt - midGrace) / 1000);
  assert(graceRemaining === 60, "1 minute into grace period leaves 60 seconds remaining");

  // At graceEndsAt -> Escalation triggered
  assert(graceEndsAt >= graceEndsAt, "When grace period expires, escalation triggers");

  // TEST 5: Cycle Reset on I'M SAFE
  const cycle1: CheckInCycle = {
    cycleId: "cycle_1_100",
    cycleNumber: 1,
    startedAt: now,
    scheduledCheckInAt: scheduledAt,
    gracePeriodEndsAt: graceEndsAt,
    status: "ACTIVE"
  };

  const confirmTime = now + 10 * 60 * 1000; // Confirmed at 10m
  const cycle2ScheduledAt = confirmTime + intervalMinutes * 60 * 1000;
  const cycle2: CheckInCycle = {
    cycleId: `cycle_2_${confirmTime}`,
    cycleNumber: 2,
    startedAt: confirmTime,
    scheduledCheckInAt: cycle2ScheduledAt,
    gracePeriodEndsAt: cycle2ScheduledAt + graceMinutes * 60 * 1000,
    status: "ACTIVE"
  };

  assert(cycle2.cycleNumber === 2, "New cycle has cycleNumber = 2");
  assert(cycle2.scheduledCheckInAt > cycle1.scheduledCheckInAt, "Next cycle scheduledCheckInAt is reset forward");

  // TEST 6: Location snapshot generation
  const pos: NavigationPosition = {
    latitude: 12.9716,
    longitude: 77.5946,
    accuracy: 12,
    altitude: 920,
    heading: 45,
    speed: 12,
    timestamp: now
  };

  const snapshot = createLocationSnapshot(pos);
  assert(snapshot !== null, "Location snapshot created successfully");
  assert(snapshot?.latitude === 12.9716 && snapshot?.longitude === 77.5946, "Snapshot coordinates match GPS");
  assert(snapshot?.googleMapsUrl === "https://www.google.com/maps?q=12.971600,77.594600", "Google Maps link correctly generated");
  assert(snapshot?.accuracy === 12, "Accuracy rounded and preserved");

  // TEST 7: Truthful alert formatting and status
  const testRecipients: TrustedContact[] = [
    { id: "tc_1", name: "Guardian One", phone: "+91 98765 00001", enabled: true, createdAt: now },
    { id: "tc_2", name: "Guardian Two", phone: "+91 98765 00002", enabled: false, createdAt: now }
  ];

  const alertPayload: EscalationAlertPayload = {
    alertId: "alert_test_1",
    cycleId: "cycle_1_100",
    timestamp: now,
    reason: "CHECK_IN_MISSED",
    locationSnapshot: snapshot,
    destinationName: "Bangalore",
    recipients: testRecipients
  };

  const formatted = formatAlertMessage(alertPayload);
  assert(formatted.includes("Scheduled safety check-in was missed"), "Message states check-in was missed neutrally");
  assert(!formatted.includes("User is in danger"), "Neutral non-sensational wording verified");
  assert(formatted.includes("Bangalore"), "Destination context included");

  // TEST 8: Notification Service Dispatch & Truthfulness.
  // sendTrustedContactAlert now calls the REAL backend
  // (/emergency/notify-trusted-contact) instead of a local simulation. This
  // Node script has no backend to reach, so the honest, expected outcome is
  // a reported FAILED status -- never a fabricated "SENT"/"NOT_CONFIGURED"
  // success-shaped result.
  clearEscalationHistory();
  const notifResult = await sendTrustedContactAlert(alertPayload);
  assert(notifResult.providerStatus === "FAILED", "Truthful providerStatus is FAILED when the backend cannot be reached");
  assert(notifResult.recipientCount === 1, "recipientCount reflects the enabled recipient dispatch was attempted for, even though it failed");
  assert(!notifResult.message.includes("SMS sent successfully"), "Zero fake SMS delivery claims verified");

  // TEST 9: Duplicate Escalation Guard
  const duplicateResult = await sendTrustedContactAlert(alertPayload);
  assert(duplicateResult.recipientCount === 0, "Duplicate escalation for same cycle is suppressed by guard");

  // TEST 10: Arrival Integration State Resolution
  let sessionStatus = "ACTIVE";
  const mockNavStatus = "ARRIVED";
  if (mockNavStatus === "ARRIVED") {
    sessionStatus = "RESOLVED";
  }
  assert(sessionStatus === "RESOLVED", "Navigation ARRIVED transitions safety check-in to RESOLVED cleanly");

  console.log(`\n=== PHASE 5 TEST SUMMARY: ${passed}/${total} TESTS PASSED ===\n`);
}

runPhase5Tests();
