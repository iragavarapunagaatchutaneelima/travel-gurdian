import datetime
import time
import unittest
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.models import SafeCheckIn, EmergencyContact, EmergencyEventLog
from app.schemas.schemas import SafeCheckInCreate, SafeCheckInLocationUpdate
from app.services import assist, exotel_service, checkin_scheduler


class TestDeadMansSwitchEscalation(unittest.TestCase):
    """
    Rigorously tests the Travel Guardian Dead-Man's Switch / Safe Check-In escalation architecture:
    1. Normal confirmation (no escalation)
    2. Timer expiry detection
    3. No confirmation (triggers escalation)
    4. Duplicate trigger / Idempotency guard (zero duplicate dispatches)
    5. No trusted contact handling
    6. Exotel failure handling & truthful error reporting
    7. Successful Exotel dispatch & SID auditing
    8. Server restart recovery
    """

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.Session()
        self.db.query(SafeCheckIn).delete()
        self.db.query(EmergencyContact).delete()
        self.db.query(EmergencyEventLog).delete()
        self.db.commit()
        assist._active_escalating_ids.clear()
        exotel_service._emergency_request_locks.clear()

    def tearDown(self):
        self.db.close()

    # =========================================================================
    # SCENARIO 1: NORMAL CONFIRMATION
    # =========================================================================
    @patch("app.services.exotel_service.send_emergency_sms")
    @patch("app.services.exotel_service.make_emergency_call")
    def test_normal_confirmation_prevents_escalation(self, mock_call, mock_sms):
        """
        User creates a check-in and confirms safety before expiry.
        Even after target_time has passed, no emergency calls or SMS are dispatched.
        """
        # 1. Add active contact
        contact = EmergencyContact(
            name="Alice Guardian",
            phone="+919876543210",
            relation="Parent",
            user_id="traveler_1",
            is_enabled=True
        )
        self.db.add(contact)
        self.db.commit()

        # 2. Create check-in with target_time in the near future (normalized naive UTC)
        now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        checkin_req = SafeCheckInCreate(
            target_time=now_utc + datetime.timedelta(seconds=2),
            checkin_text="Hiking Mount Fuji trail",
            latitude=35.3606,
            longitude=138.7274
        )
        chk = assist.set_safe_checkin(self.db, checkin_req, user_id="traveler_1")
        self.assertEqual(chk.escalation_status, "pending")
        self.assertFalse(chk.is_completed)
        self.assertFalse(chk.is_triggered)

        # 3. User confirms safety
        confirmed = assist.confirm_safe_checkin(self.db, user_id="traveler_1")
        self.assertTrue(confirmed.is_completed)
        self.assertEqual(confirmed.escalation_status, "confirmed_safe")

        # 4. Advance target_time to past to simulate time passing
        confirmed.target_time = now_utc - datetime.timedelta(seconds=10)
        self.db.commit()

        # 5. Run scheduler / overdue evaluation
        escalated = assist.check_pending_checkins(self.db)
        self.assertEqual(len(escalated), 0, "Confirmed check-in must never be escalated!")

        # 6. Verify zero Exotel calls or SMS
        mock_sms.assert_not_called()
        mock_call.assert_not_called()

        # 7. Check database state
        refreshed = self.db.query(SafeCheckIn).filter(SafeCheckIn.id == confirmed.id).first()
        self.assertTrue(refreshed.is_completed)
        self.assertFalse(refreshed.is_triggered)
        self.assertEqual(refreshed.escalation_status, "confirmed_safe")

    # =========================================================================
    # SCENARIO 2: TIMER EXPIRY DETECTION
    # =========================================================================
    @patch("app.services.exotel_service.send_emergency_sms")
    @patch("app.services.exotel_service.make_emergency_call")
    def test_timer_expiry_detection(self, mock_call, mock_sms):
        """
        Backend accurately identifies expired check-ins whose target_time <= now.
        """
        mock_sms.return_value = {"status": "sent", "sid": "SM_exp_1", "success": True}
        mock_call.return_value = {"status": "initiated", "sid": "CA_exp_1", "success": True}

        contact = EmergencyContact(
            name="Bob Guardian",
            phone="+919876543211",
            relation="Spouse",
            user_id="traveler_2",
            is_enabled=True
        )
        self.db.add(contact)

        # Active future checkin (should NOT be detected)
        now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        future_chk = SafeCheckIn(
            user_id="traveler_2",
            target_time=now_utc + datetime.timedelta(hours=1),
            is_completed=False,
            is_triggered=False,
            escalation_status="pending"
        )
        # Expired checkin (MUST be detected)
        expired_chk = SafeCheckIn(
            user_id="traveler_2",
            target_time=now_utc - datetime.timedelta(minutes=5),
            is_completed=False,
            is_triggered=False,
            escalation_status="pending"
        )
        self.db.add_all([future_chk, expired_chk])
        self.db.commit()

        # Run detection
        escalated = assist.check_pending_checkins(self.db)
        self.assertEqual(len(escalated), 1)
        self.assertEqual(escalated[0].id, expired_chk.id)
        self.assertTrue(escalated[0].is_triggered)

        # Future check-in remains pending
        f_refreshed = self.db.query(SafeCheckIn).filter(SafeCheckIn.id == future_chk.id).first()
        self.assertFalse(f_refreshed.is_triggered)
        self.assertEqual(f_refreshed.escalation_status, "pending")

    # =========================================================================
    # SCENARIO 3: NO CONFIRMATION (AUTOMATIC ESCALATION)
    # =========================================================================
    @patch("app.services.exotel_service.send_emergency_sms")
    @patch("app.services.exotel_service.make_emergency_call")
    def test_no_confirmation_triggers_automatic_escalation(self, mock_call, mock_sms):
        """
        When user abandons check-in without confirming, backend escalates to trusted contact with GPS.
        """
        mock_sms.return_value = {"status": "sent", "sid": "SM_no_conf", "success": True}
        mock_call.return_value = {"status": "initiated", "sid": "CA_no_conf", "success": True}

        contact = EmergencyContact(
            name="Charlie Contact",
            phone="+919876543212",
            relation="Friend",
            user_id="traveler_3",
            is_enabled=True
        )
        self.db.add(contact)

        now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        chk = SafeCheckIn(
            user_id="traveler_3",
            target_time=now_utc - datetime.timedelta(minutes=1),
            checkin_text="Walking through dark alleyway near station",
            last_known_latitude=12.9716,
            last_known_longitude=77.5946,
            is_completed=False,
            is_triggered=False,
            escalation_status="pending"
        )
        self.db.add(chk)
        self.db.commit()

        # Background escalation execution
        results = assist.check_pending_checkins(self.db)
        self.assertEqual(len(results), 1)
        res = results[0]

        # Verify state transitions
        self.assertFalse(res.is_completed)
        self.assertTrue(res.is_triggered)
        self.assertEqual(res.escalation_status, "escalated")
        self.assertIsNotNone(res.dispatched_at)
        self.assertEqual(res.dispatch_sms_sid, "SM_no_conf")
        self.assertEqual(res.dispatch_call_sid, "CA_no_conf")
        self.assertEqual(res.dispatch_recipient_name, "Charlie Contact")

        # Verify Exotel was invoked with correct parameters
        mock_sms.assert_called_once()
        sms_kwargs = mock_sms.call_args[1]
        self.assertEqual(sms_kwargs["to_phone"], "+919876543212")
        self.assertIn("DEAD-MAN'S SWITCH EMERGENCY ALERT", sms_kwargs["custom_message"])
        self.assertIn("Walking through dark alleyway", sms_kwargs["custom_message"])
        self.assertIn("12.971600,77.594600", sms_kwargs["custom_message"])

        mock_call.assert_called_once_with(
            to_phone="+919876543212",
            user_name="Charlie Contact"
        )

    # =========================================================================
    # SCENARIO 4: DUPLICATE TRIGGER / IDEMPOTENCY
    # =========================================================================
    @patch("app.services.exotel_service.send_emergency_sms")
    @patch("app.services.exotel_service.make_emergency_call")
    def test_duplicate_trigger_idempotency(self, mock_call, mock_sms):
        """
        Ensures the same expired check-in cannot trigger repeated emergency calls or SMS.
        Subsequent evaluation polls or concurrent calls must not re-dispatch.
        """
        mock_sms.return_value = {"status": "sent", "sid": "SM_idem_1", "success": True}
        mock_call.return_value = {"status": "initiated", "sid": "CA_idem_1", "success": True}

        contact = EmergencyContact(
            name="David Contact",
            phone="+919876543213",
            relation="Sibling",
            user_id="traveler_4",
            is_enabled=True
        )
        self.db.add(contact)

        now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        chk = SafeCheckIn(
            user_id="traveler_4",
            target_time=now_utc - datetime.timedelta(minutes=2),
            is_completed=False,
            is_triggered=False,
            escalation_status="pending"
        )
        self.db.add(chk)
        self.db.commit()

        # First trigger
        res1 = assist.check_pending_checkins(self.db)
        self.assertEqual(len(res1), 1)
        self.assertEqual(mock_sms.call_count, 1)
        self.assertEqual(mock_call.call_count, 1)
        first_idempotency_key = res1[0].idempotency_key
        self.assertIsNotNone(first_idempotency_key)

        # Second trigger (e.g. next scheduler tick)
        res2 = assist.check_pending_checkins(self.db)
        self.assertEqual(len(res2), 0, "Second poll must ignore already triggered check-in!")
        self.assertEqual(mock_sms.call_count, 1, "Exotel SMS must NOT be called again!")
        self.assertEqual(mock_call.call_count, 1, "Exotel Call must NOT be called again!")

        # Third direct call to escalate_checkin on the same checkin object
        chk_refreshed = self.db.query(SafeCheckIn).filter(SafeCheckIn.id == chk.id).first()
        res3 = assist.escalate_checkin(self.db, chk_refreshed)
        self.assertEqual(res3.idempotency_key, first_idempotency_key)
        self.assertEqual(mock_sms.call_count, 1, "Direct invocation must be blocked by idempotency guard!")
        self.assertEqual(mock_call.call_count, 1)

    # =========================================================================
    # SCENARIO 5: NO TRUSTED CONTACT
    # =========================================================================
    @patch("app.services.exotel_service.send_emergency_sms")
    @patch("app.services.exotel_service.make_emergency_call")
    def test_no_trusted_contact_handling(self, mock_call, mock_sms):
        """
        When check-in expires but user has zero active emergency contacts,
        the system handles it gracefully: records 'no_trusted_contact', logs failure,
        does not crash with 500, and does not retry infinitely.
        """
        now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        chk = SafeCheckIn(
            user_id="user_no_contacts",
            target_time=now_utc - datetime.timedelta(minutes=1),
            is_completed=False,
            is_triggered=False,
            escalation_status="pending"
        )
        self.db.add(chk)
        self.db.commit()

        results = assist.check_pending_checkins(self.db)
        self.assertEqual(len(results), 1)
        res = results[0]

        # Verify truthful status
        self.assertTrue(res.is_triggered)
        self.assertEqual(res.escalation_status, "no_trusted_contact")
        self.assertIn("No active trusted contact configured", res.dispatch_error)

        # Exotel should not have been called
        mock_sms.assert_not_called()
        mock_call.assert_not_called()

        # Audit log written with failure
        log = self.db.query(EmergencyEventLog).filter(
            EmergencyEventLog.user_id == "user_no_contacts"
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, "failed")
        self.assertEqual(log.event_type, "dead_man_switch_escalation")

    # =========================================================================
    # SCENARIO 6: EXOTEL FAILURE HANDLING
    # =========================================================================
    @patch("app.services.exotel_service.send_emergency_sms")
    @patch("app.services.exotel_service.make_emergency_call")
    def test_exotel_failure_handling(self, mock_call, mock_sms):
        """
        If Exotel fails (e.g., auth failure, 403, network drop), backend records
        escalation_status='exotel_failure', records error details truthfully,
        and does not get stuck in an endless retry loop.
        """
        mock_sms.return_value = {
            "status": "failed",
            "sid": None,
            "success": False,
            "error": "Exotel API 403 Forbidden (KYC pending)",
            "safe_message": "Exotel credentials active but SMS capability requires verification."
        }
        mock_call.return_value = {
            "status": "failed",
            "sid": None,
            "success": False,
            "error": "Exotel API 403 Forbidden",
            "safe_message": "Voice call failed."
        }

        contact = EmergencyContact(
            name="Eve Guardian",
            phone="+919876543215",
            relation="Parent",
            user_id="traveler_fail",
            is_enabled=True
        )
        self.db.add(contact)

        now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        chk = SafeCheckIn(
            user_id="traveler_fail",
            target_time=now_utc - datetime.timedelta(minutes=1),
            is_completed=False,
            is_triggered=False,
            escalation_status="pending"
        )
        self.db.add(chk)
        self.db.commit()

        results = assist.check_pending_checkins(self.db)
        self.assertEqual(len(results), 1)
        res = results[0]

        # Status must reflect truthful failure
        self.assertTrue(res.is_triggered)
        self.assertEqual(res.escalation_status, "exotel_failure")
        self.assertIn("Exotel credentials active but SMS capability requires verification", res.dispatch_error)

        # Audit log written with failed status
        logs = self.db.query(EmergencyEventLog).filter(EmergencyEventLog.user_id == "traveler_fail").all()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].status, "failed")

        # Next poll cycle: does not loop or re-dispatch
        next_poll = assist.check_pending_checkins(self.db)
        self.assertEqual(len(next_poll), 0)

    # =========================================================================
    # SCENARIO 7: SUCCESSFUL EXOTEL DISPATCH
    # =========================================================================
    @patch("app.services.exotel_service.send_emergency_sms")
    @patch("app.services.exotel_service.make_emergency_call")
    def test_successful_exotel_dispatch(self, mock_call, mock_sms):
        """
        When Exotel accepts both SMS and call, backend records:
        - escalation_status='escalated'
        - SMS SID and Call SID
        - recipient masked phone & name
        - dispatches emergency audit event with status='completed'
        """
        mock_sms.return_value = {
            "status": "sent",
            "sid": "SM_live_success_999",
            "success": True
        }
        mock_call.return_value = {
            "status": "initiated",
            "sid": "CA_live_success_888",
            "success": True
        }

        contact = EmergencyContact(
            name="Frank Guardian",
            phone="+919876543216",
            relation="Partner",
            user_id="traveler_success",
            is_enabled=True
        )
        self.db.add(contact)

        now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        chk = SafeCheckIn(
            user_id="traveler_success",
            target_time=now_utc - datetime.timedelta(seconds=30),
            checkin_text="Night train to Kyoto",
            last_known_latitude=34.9858,
            last_known_longitude=135.7588,
            is_completed=False,
            is_triggered=False,
            escalation_status="pending"
        )
        self.db.add(chk)
        self.db.commit()

        results = assist.check_pending_checkins(self.db)
        self.assertEqual(len(results), 1)
        res = results[0]

        self.assertTrue(res.is_triggered)
        self.assertEqual(res.escalation_status, "escalated")
        self.assertEqual(res.dispatch_sms_sid, "SM_live_success_999")
        self.assertEqual(res.dispatch_call_sid, "CA_live_success_888")
        self.assertEqual(res.dispatch_recipient_name, "Frank Guardian")
        self.assertEqual(res.dispatch_recipient_phone, exotel_service.mask_phone_number("+919876543216"))
        self.assertIsNone(res.dispatch_error)

        # Audit log verification
        log = self.db.query(EmergencyEventLog).filter(EmergencyEventLog.user_id == "traveler_success").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, "completed")
        self.assertEqual(log.sid, "CA_live_success_888")

    # =========================================================================
    # SCENARIO 8: SERVER RESTART
    # =========================================================================
    @patch("app.services.exotel_service.send_emergency_sms")
    @patch("app.services.exotel_service.make_emergency_call")
    def test_server_restart_detects_overdue_checkins(self, mock_call, mock_sms):
        """
        Check-in was created before a simulated server shutdown/restart.
        While server was offline, target_time expired.
        Upon server startup (scheduler re-initialization), the background worker
        immediately discovers and escalates the overdue check-in from persistent database.
        """
        mock_sms.return_value = {"status": "sent", "sid": "SM_restart", "success": True}
        mock_call.return_value = {"status": "initiated", "sid": "CA_restart", "success": True}

        contact = EmergencyContact(
            name="Grace Guardian",
            phone="+919876543217",
            relation="Parent",
            user_id="traveler_restart",
            is_enabled=True
        )
        self.db.add(contact)

        # 1. Check-in created with past expiration (as if it expired during downtime)
        now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        chk = SafeCheckIn(
            user_id="traveler_restart",
            target_time=now_utc - datetime.timedelta(minutes=15),
            checkin_text="Pre-restart trip to destination",
            is_completed=False,
            is_triggered=False,
            escalation_status="pending"
        )
        self.db.add(chk)
        self.db.commit()

        # 2. Simulate server restart:
        # Stop scheduler if active, reset in-memory caches, and launch single poll as done upon startup
        checkin_scheduler.stop_scheduler()
        assist._active_escalating_ids.clear()

        # 3. Simulate startup poll cycle (as executed in lifespan or startup worker)
        escalated = assist.check_pending_checkins(self.db)
        self.assertEqual(len(escalated), 1)
        self.assertEqual(escalated[0].user_id, "traveler_restart")
        self.assertEqual(escalated[0].escalation_status, "escalated")
        self.assertTrue(escalated[0].is_triggered)

        mock_sms.assert_called_once()
        mock_call.assert_called_once()


if __name__ == "__main__":
    unittest.main()
