import unittest
import json
import socket
import urllib.request
import urllib.error
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.models import Base, EmergencyContact, EmergencyEventLog
from app.schemas.schemas import EmergencyActionRequest, SOSRequest
from app.services import comms_service, assist
from app.services.communication import phone_utils
from fastapi import HTTPException


class TestSOSAuditScenarios(unittest.TestCase):
    """
    Rigorously tests the 10 SOS Audit Scenarios specified in the requirements:
    1. No trusted contact
    2. Invalid number
    3. Valid number
    4. Twilio success
    5. Twilio authentication failure
    6. Twilio timeout
    7. Twilio API failure (400, 403 trial-restricted, 429, 500)
    8. Network failure (URLError, gaierror)
    9. Partial SMS/call success
    10. Complete success

    Also verifies the core safety rules:
    - Never return success=true for a simulated or failed emergency dispatch.
    - If Twilio fails, clearly show "Emergency communication failed".
    - Always provide direct 112 calling as the final fallback.
    - Never fabricate hospitals, police stations, or emergency contacts.
    - Clearly distinguish demo data from live verified data.
    - Log emergency transaction ID / call SID when available.
    - Preserve the user's trusted contact configuration.
    """

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        # These tests exercise the mocked HTTP request/response plumbing in
        # the Twilio provider, not real Twilio network calls
        # (urllib.request.urlopen is patched per-test). Dry-run is a safety
        # gate that sits ABOVE that plumbing, so it must be disabled here to
        # actually reach the mocks, and real-looking (but fake) credentials
        # must be present since the live code path now requires them.
        settings.TWILIO_DRY_RUN = False
        settings.TWILIO_ACCOUNT_SID = "AC00000000000000000000000000000000"
        settings.TWILIO_AUTH_TOKEN = "test_auth_token_0000000000000000"
        settings.TWILIO_PHONE_NUMBER = "+15005550006"
        Base.metadata.create_all(cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.Session()
        self.db.query(EmergencyEventLog).delete()
        self.db.query(EmergencyContact).delete()
        self.db.commit()
        phone_utils._emergency_request_locks.clear()

    def tearDown(self):
        self.db.close()

    # =========================================================================
    # TEST 1: NO TRUSTED CONTACT
    # =========================================================================
    def test_scenario_01_no_trusted_contact(self):
        """
        Scenario 1: No trusted contact is configured in database.
        - SOS trigger must return success=False, status='no_trusted_contact'.
        - Response message must advise dialing 112 directly.
        - Safe havens must list verified 112, 108, 100 without fabricated data.
        - SMS & Call endpoints must raise HTTP 400 Bad Request.
        """
        self.assertEqual(self.db.query(EmergencyContact).count(), 0)

        sos_req = SOSRequest(latitude=12.9716, longitude=77.5946, custom_message="Help!")
        sos_res = assist.trigger_sos(self.db, sos_req, user_id="user_no_contact")

        self.assertFalse(sos_res.success, "SOS must never return success=True when no contacts exist")
        self.assertEqual(sos_res.overall_status, "no_trusted_contact")
        self.assertIn("No trusted emergency contact is registered", sos_res.message)
        self.assertIn("112", sos_res.message)

        self.assertGreaterEqual(len(sos_res.nearest_havens), 3)
        for haven in sos_res.nearest_havens:
            self.assertTrue(haven.is_verified)
            self.assertFalse(haven.is_demo)
            self.assertIn(haven.phone, ["112", "108", "100"])

        sms_req = EmergencyActionRequest()
        with self.assertRaises(HTTPException) as cm:
            assist.send_trusted_contact_sms(self.db, sms_req, user_id="user_no_contact")
        self.assertEqual(cm.exception.status_code, 400)
        self.assertIn("No trusted emergency contact is configured", cm.exception.detail)

        call_req = EmergencyActionRequest()
        with self.assertRaises(HTTPException) as cm_call:
            assist.make_trusted_contact_call(self.db, call_req, user_id="user_no_contact")
        self.assertEqual(cm_call.exception.status_code, 400)

        logs = self.db.query(EmergencyEventLog).all()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].status, "no_trusted_contact")
        self.assertEqual(logs[0].recipient_phone_masked, "112")

    # =========================================================================
    # TEST 2: INVALID NUMBER
    # =========================================================================
    def test_scenario_02_invalid_number(self):
        """
        Scenario 2: Contact number is invalid (fictional 555, repeated digits, national shortcode, malformed).
        """
        invalid_numbers = [
            "+1-555-0199", "5550123", "1111111111", "0000000000",
            "112", "911", "12345", "+01234567890", "abcdefghij",
        ]

        for inv in invalid_numbers:
            with self.subTest(number=inv):
                with self.assertRaises(ValueError):
                    comms_service.normalize_phone_number(inv)

                res = comms_service.send_emergency_sms(to_phone=inv, user_name="Test")
                self.assertFalse(res["success"], f"Expected success=False for {inv}")
                self.assertEqual(res["status"], "failed")
                self.assertIn("Emergency communication failed", res["message"])
                self.assertIn("Emergency communication failed", res["safe_message"])
                self.assertIsNone(res["sid"])

    # =========================================================================
    # TEST 3: VALID NUMBER
    # =========================================================================
    def test_scenario_03_valid_number(self):
        valid_pairs = [
            ("9876543210", "+919876543210"),
            ("+919876543210", "+919876543210"),
            ("09876543210", "+919876543210"),
            ("+447911123456", "+447911123456"),
            ("+14155552671", "+14155552671"),
        ]

        for raw, expected in valid_pairs:
            with self.subTest(raw=raw):
                norm = comms_service.normalize_phone_number(raw)
                self.assertEqual(norm, expected)

        masked = comms_service.mask_phone_number("+919876543210")
        self.assertTrue(masked.startswith("+9198"))
        self.assertTrue(masked.endswith("210"))
        self.assertIn("*", masked)
        self.assertNotIn("7654", masked)

    # =========================================================================
    # TEST 4: TWILIO SUCCESS
    # =========================================================================
    def test_scenario_04_twilio_success(self):
        """
        Scenario 4: Twilio API returns HTTP 201 with valid SID.
        """
        contact = EmergencyContact(name="Priya", phone="+919876543210", relation="Family", user_id="u4")
        self.db.add(contact)
        self.db.commit()

        mock_body = json.dumps({"sid": "SM44444444444444444444444444444444", "status": "queued", "to": "+919876543210"}).encode()

        mock_resp = MagicMock()
        mock_resp.getcode.return_value = 201
        mock_resp.read.return_value = mock_body
        mock_resp.__enter__.return_value = mock_resp

        with patch("urllib.request.urlopen", return_value=mock_resp):
            res = comms_service.send_emergency_sms(
                to_phone="+919876543210",
                user_name="Priya",
                latitude=12.9716,
                longitude=77.5946
            )

        self.assertTrue(res["success"])
        self.assertEqual(res["status"], "sent")
        self.assertEqual(res["sid"], "SM44444444444444444444444444444444")
        self.assertIn("sent successfully", res["message"])
        self.assertIn("+9198", res["safe_message"])

    # =========================================================================
    # TEST 5: TWILIO AUTHENTICATION FAILURE
    # =========================================================================
    def test_scenario_05_twilio_authentication_failure(self):
        mock_err = urllib.error.HTTPError(
            url="https://api.twilio.com/2010-04-01/Accounts/test/Messages.json",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=MagicMock(read=lambda: json.dumps({"code": 20003, "message": "Authentication Error"}).encode())
        )

        with patch("urllib.request.urlopen", side_effect=mock_err):
            res = comms_service.send_emergency_sms(to_phone="+919876543210", user_name="AuthTest")

        self.assertFalse(res["success"], "Must return success=False on HTTP 401")
        self.assertEqual(res["status"], "failed")
        self.assertIn("Emergency communication failed", res["message"])
        self.assertIn("Authentication failure with Twilio API", res["safe_message"])
        self.assertIsNone(res["sid"])

    # =========================================================================
    # TEST 6: TWILIO TIMEOUT
    # =========================================================================
    def test_scenario_06_twilio_timeout(self):
        timeout_err = socket.timeout("Connection timed out")

        with patch("urllib.request.urlopen", side_effect=timeout_err):
            res = comms_service.send_emergency_sms(to_phone="+919876543210", user_name="TimeoutTest")

        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "failed")
        self.assertIn("Emergency communication failed", res["message"])
        self.assertIn("timed out", res["safe_message"].lower())
        self.assertIn("112", res["safe_message"])
        self.assertIsNone(res["sid"])

    # =========================================================================
    # TEST 7: TWILIO API FAILURE
    # =========================================================================
    def test_scenario_07_twilio_api_failure(self):
        """
        Scenario 7: Twilio API returns HTTP 400, HTTP 403 (trial restricted, code 21608),
        HTTP 429, or HTTP 500.
        """
        failure_cases = [
            (400, {"code": 21211, "message": "Invalid 'To' phone number"}, "invalid"),
            (403, {"code": 21608, "message": "The number is unverified. Trial accounts cannot send messages to unverified numbers"}, "trial"),
            (429, {"code": 20429, "message": "Too many requests"}, "rate limit"),
            (500, {"code": 20500, "message": "Internal server error"}, "500"),
        ]

        for code, body, hint in failure_cases:
            with self.subTest(code=code):
                mock_err = urllib.error.HTTPError(
                    url="https://api.twilio.com/2010-04-01/Accounts/test/Messages.json",
                    code=code,
                    msg=f"HTTP {code}",
                    hdrs={},
                    fp=MagicMock(read=lambda b=json.dumps(body).encode(): b)
                )

                with patch("urllib.request.urlopen", side_effect=mock_err):
                    res = comms_service.send_emergency_sms(to_phone="+919876543210", user_name="ApiFailTest")

                self.assertFalse(res["success"], f"Must return success=False on HTTP {code}")
                self.assertEqual(res["status"], "failed")
                self.assertIn("Emergency communication failed", res["message"])
                self.assertIn(hint.lower(), res["safe_message"].lower())
                self.assertIsNone(res["sid"])

    # =========================================================================
    # TEST 8: NETWORK FAILURE
    # =========================================================================
    def test_scenario_08_network_failure(self):
        network_err = urllib.error.URLError(socket.gaierror("getaddrinfo failed"))

        with patch("urllib.request.urlopen", side_effect=network_err):
            res = comms_service.send_emergency_sms(to_phone="+919876543210", user_name="NetTest")

        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "failed")
        self.assertIn("Emergency communication failed", res["message"])
        self.assertIn("Network connection error", res["safe_message"])
        self.assertIn("112", res["safe_message"])
        self.assertIsNone(res["sid"])

    # =========================================================================
    # TEST 9: PARTIAL SMS/CALL SUCCESS
    # =========================================================================
    def test_scenario_09_partial_sms_call_success(self):
        contact = EmergencyContact(name="Rahul", phone="+919876543210", relation="Friend", user_id="u9")
        self.db.add(contact)
        self.db.commit()

        def side_effect(req, *args, **kwargs):
            if "Messages" in req.full_url:
                mock_ok = MagicMock()
                mock_ok.getcode.return_value = 201
                mock_ok.read.return_value = json.dumps({"sid": "SMS_PARTIAL_999", "status": "queued"}).encode()
                mock_ok.__enter__.return_value = mock_ok
                return mock_ok
            else:
                raise urllib.error.HTTPError(
                    url=req.full_url,
                    code=403,
                    msg="Forbidden",
                    hdrs={},
                    fp=MagicMock(read=lambda: json.dumps({"code": 21215, "message": "Trial call restricted"}).encode())
                )

        with patch("urllib.request.urlopen", side_effect=side_effect):
            notify_req = EmergencyActionRequest(
                latitude=13.0827,
                longitude=80.2707,
                custom_message="Emergency partial test"
            )
            res = assist.notify_trusted_contact(self.db, notify_req, user_id="u9")

        self.assertTrue(res.success, "Partial delivery should have success=True as alert reached contact")
        self.assertEqual(res.overall_status, "partially_completed")
        self.assertEqual(res.sms_status, "sent")
        self.assertEqual(res.call_status, "failed")
        self.assertEqual(res.sms_sid, "SMS_PARTIAL_999")
        self.assertIsNone(res.call_sid)
        self.assertIn("partially dispatched", res.message)
        self.assertIn("One channel failed", res.message)

    # =========================================================================
    # TEST 10: COMPLETE SUCCESS
    # =========================================================================
    def test_scenario_10_complete_success(self):
        contact = EmergencyContact(name="Ananya", phone="+919876543210", relation="Family", user_id="u10")
        self.db.add(contact)
        self.db.commit()

        def side_effect(req, *args, **kwargs):
            mock_res = MagicMock()
            mock_res.getcode.return_value = 201
            if "Messages" in req.full_url:
                mock_res.read.return_value = json.dumps({"sid": "SMS_FULL_SUCCESS_111", "status": "queued"}).encode()
            else:
                mock_res.read.return_value = json.dumps({"sid": "CALL_FULL_SUCCESS_222", "status": "queued"}).encode()
            mock_res.__enter__.return_value = mock_res
            return mock_res

        with patch("urllib.request.urlopen", side_effect=side_effect):
            notify_req = EmergencyActionRequest(
                latitude=19.0760,
                longitude=72.8777,
                custom_message="Full emergency dispatch"
            )
            res = assist.notify_trusted_contact(self.db, notify_req, user_id="u10")

        self.assertTrue(res.success)
        self.assertEqual(res.overall_status, "completed")
        self.assertEqual(res.sms_status, "sent")
        self.assertEqual(res.call_status, "initiated")
        self.assertEqual(res.sms_sid, "SMS_FULL_SUCCESS_111")
        self.assertEqual(res.call_sid, "CALL_FULL_SUCCESS_222")
        self.assertIn("dispatched successfully", res.message)

        logs = self.db.query(EmergencyEventLog).filter(EmergencyEventLog.user_id == "u10").all()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].status, "completed")
        self.assertIn(logs[0].sid, ["CALL_FULL_SUCCESS_222", "SMS_FULL_SUCCESS_111"])

        stored_contact = self.db.query(EmergencyContact).filter(EmergencyContact.user_id == "u10").first()
        self.assertIsNotNone(stored_contact)
        self.assertEqual(stored_contact.name, "Ananya")
        self.assertEqual(stored_contact.phone, "+919876543210")

    # =========================================================================
    # TEST FAIL-SAFE RULES: NO FABRICATED DATA & ZERO MOCK POIs
    # =========================================================================
    def test_fail_safe_zero_fabrication_and_direct_112_fallback(self):
        """
        Verify that trigger_sos:
        - NEVER fabricates fake hospitals with random coordinate offsets.
        - Clearly flags verified vs demo data.
        - Always includes National Emergency Response Center (112), Ambulance (108), Police (100).
        - If Twilio fails, returns success=False and 'Emergency communication failed'.
        """
        contact = EmergencyContact(name="Neha", phone="+919876543210", relation="Family", user_id="u_failsafe")
        self.db.add(contact)
        self.db.commit()

        mock_err = urllib.error.HTTPError(
            url="https://api.twilio.com", code=503, msg="Service Unavailable", hdrs={},
            fp=MagicMock(read=lambda: json.dumps({"code": 20500, "message": "Service Unavailable"}).encode())
        )

        with patch("urllib.request.urlopen", side_effect=mock_err):
            sos_req = SOSRequest(latitude=17.3850, longitude=78.4867, custom_message="Help")
            res = assist.trigger_sos(self.db, sos_req, user_id="u_failsafe")

        self.assertFalse(res.success, "Never return success=True when Twilio fails")
        self.assertEqual(res.overall_status, "failed")
        self.assertIn("Emergency communication failed", res.message)
        self.assertIn("112", res.message)

        self.assertEqual(len(res.nearest_havens), 3)
        for h in res.nearest_havens:
            self.assertTrue(h.is_verified)
            self.assertFalse(h.is_demo)
            self.assertIn("ERSS 112" if h.phone == "112" else "National", h.data_source)


if __name__ == "__main__":
    unittest.main()
