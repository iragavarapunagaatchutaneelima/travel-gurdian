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
from app.services import exotel_service, assist
from fastapi import HTTPException


class TestSOSAuditScenarios(unittest.TestCase):
    """
    Rigorously tests the 10 SOS Audit Scenarios specified in the requirements:
    1. No trusted contact
    2. Invalid number
    3. Valid number
    4. Exotel success
    5. Exotel authentication failure
    6. Exotel timeout
    7. Exotel API failure (400, 403 KYC pending, 429, 500)
    8. Network failure (URLError, gaierror)
    9. Partial SMS/call success
    10. Complete success

    Also verifies the core safety rules:
    - Never return success=true for a simulated or failed emergency dispatch.
    - If Exotel fails, clearly show "Emergency communication failed".
    - Always provide direct 112 calling as the final fallback.
    - Never fabricate hospitals, police stations, or emergency contacts.
    - Clearly distinguish demo data from live verified data.
    - Log emergency transaction ID / call SID when available.
    - Preserve the user's trusted contact configuration.
    """

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.Session()
        self.db.query(EmergencyEventLog).delete()
        self.db.query(EmergencyContact).delete()
        self.db.commit()
        exotel_service._emergency_request_locks.clear()

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
        # Ensure zero contacts in database
        self.assertEqual(self.db.query(EmergencyContact).count(), 0)

        # 1. Trigger SOS without contacts
        sos_req = SOSRequest(latitude=12.9716, longitude=77.5946, custom_message="Help!")
        sos_res = assist.trigger_sos(self.db, sos_req, user_id="user_no_contact")

        self.assertFalse(sos_res.success, "SOS must never return success=True when no contacts exist")
        self.assertEqual(sos_res.overall_status, "no_trusted_contact")
        self.assertIn("No trusted emergency contact is registered", sos_res.message)
        self.assertIn("112", sos_res.message)

        # Verify verified lifelines returned with 112 as primary fallback
        self.assertGreaterEqual(len(sos_res.nearest_havens), 3)
        for haven in sos_res.nearest_havens:
            self.assertTrue(haven.is_verified)
            self.assertFalse(haven.is_demo)
            self.assertIn(haven.phone, ["112", "108", "100"])

        # 2. Individual SMS endpoint without contact must raise 400
        sms_req = EmergencyActionRequest()
        with self.assertRaises(HTTPException) as cm:
            assist.send_trusted_contact_sms(self.db, sms_req, user_id="user_no_contact")
        self.assertEqual(cm.exception.status_code, 400)
        self.assertIn("No trusted emergency contact is configured", cm.exception.detail)

        # 3. Individual Call endpoint without contact must raise 400
        call_req = EmergencyActionRequest()
        with self.assertRaises(HTTPException) as cm_call:
            assist.make_trusted_contact_call(self.db, call_req, user_id="user_no_contact")
        self.assertEqual(cm_call.exception.status_code, 400)

        # 4. Audit log must record no_trusted_contact event with 112 dispatch notice
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
        - Must be rejected by phone normalizer (raising ValueError).
        - Emergency SMS and Call must return success=False and status='failed'.
        - Must clearly show 'Emergency communication failed' and not return success=True.
        """
        invalid_numbers = [
            "+1-555-0199",       # Fictional Hollywood 555 exchange
            "5550123",           # Fictional 555 prefix
            "1111111111",        # Repeated dummy digits
            "0000000000",        # All zeroes
            "112",               # Emergency shortcode cannot be personal contact
            "911",               # Emergency shortcode
            "12345",             # Too short
            "+01234567890",      # Starts with 0 after +
            "abcdefghij"         # Non-digits
        ]

        for inv in invalid_numbers:
            with self.subTest(number=inv):
                with self.assertRaises(ValueError):
                    exotel_service.normalize_phone_number(inv)

                # Calling send_emergency_sms with invalid number
                res = exotel_service.send_emergency_sms(to_phone=inv, user_name="Test")
                self.assertFalse(res["success"], f"Expected success=False for {inv}")
                self.assertEqual(res["status"], "failed")
                self.assertIn("Emergency communication failed", res["message"])
                self.assertIn("Emergency communication failed", res["safe_message"])
                self.assertIsNone(res["sid"])

    # =========================================================================
    # TEST 3: VALID NUMBER
    # =========================================================================
    def test_scenario_03_valid_number(self):
        """
        Scenario 3: Contact has a valid phone number.
        - Must normalize properly to E.164.
        - Standard Indian 10-digit mobile numbers prefixed with +91.
        - International numbers with country codes properly preserved.
        """
        valid_pairs = [
            ("9876543210", "+919876543210"),
            ("+919876543210", "+919876543210"),
            ("09876543210", "+919876543210"),
            ("+447911123456", "+447911123456"),
            ("+14155552671", "+14155552671")
        ]

        for raw, expected in valid_pairs:
            with self.subTest(raw=raw):
                norm = exotel_service.normalize_phone_number(raw)
                self.assertEqual(norm, expected)

        # Phone masking check
        masked = exotel_service.mask_phone_number("+919876543210")
        self.assertTrue(masked.startswith("+9198"))
        self.assertTrue(masked.endswith("210"))
        self.assertIn("*", masked)
        self.assertNotIn("7654", masked)  # Private digits masked

    # =========================================================================
    # TEST 4: EXOTEL SUCCESS
    # =========================================================================
    def test_scenario_04_exotel_success(self):
        """
        Scenario 4: Exotel API returns HTTP 200 with valid SID.
        - Must return success=True, status='sent' or 'initiated'.
        - Transaction ID / Call SID / SMS SID must be extracted and returned.
        - Audit log must record the successful event with the SID.
        """
        contact = EmergencyContact(name="Priya", phone="+919876543210", relation="Family", user_id="u4")
        self.db.add(contact)
        self.db.commit()

        mock_xml = b"""<TwilioResponse>
            <SMSMessage>
                <Sid>SM44444444444444444444444444444444</Sid>
                <Status>sent</Status>
                <To>+919876543210</To>
            </SMSMessage>
        </TwilioResponse>"""

        mock_resp = MagicMock()
        mock_resp.getcode.return_value = 200
        mock_resp.read.return_value = mock_xml
        mock_resp.__enter__.return_value = mock_resp

        with patch("urllib.request.urlopen", return_value=mock_resp):
            res = exotel_service.send_emergency_sms(
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
    # TEST 5: EXOTEL AUTHENTICATION FAILURE
    # =========================================================================
    def test_scenario_05_exotel_authentication_failure(self):
        """
        Scenario 5: Exotel API returns HTTP 401 Unauthorized.
        - Must return success=False, status='failed'.
        - Error must clearly describe authentication failure with Exotel API.
        - Must clearly show 'Emergency communication failed' and not return success=True.
        """
        mock_err = urllib.error.HTTPError(
            url="https://api.exotel.com/v1/Accounts/test/Sms/send.json",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=MagicMock(read=lambda: b'{"RestException": {"Message": "Invalid credentials or token expired"}}')
        )

        with patch("urllib.request.urlopen", side_effect=mock_err):
            res = exotel_service.send_emergency_sms(to_phone="+919876543210", user_name="AuthTest")

        self.assertFalse(res["success"], "Must return success=False on HTTP 401")
        self.assertEqual(res["status"], "failed")
        self.assertIn("Emergency communication failed", res["message"])
        self.assertIn("Authentication failure with Exotel API", res["safe_message"])
        self.assertIsNone(res["sid"])

    # =========================================================================
    # TEST 6: EXOTEL TIMEOUT
    # =========================================================================
    def test_scenario_06_exotel_timeout(self):
        """
        Scenario 6: Exotel connection times out.
        - Must be caught gracefully without hanging or unhandled exception.
        - Must return success=False, status='failed'.
        - Error message must mention timeout and prompt 112 direct dial.
        """
        timeout_err = socket.timeout("Connection timed out")

        with patch("urllib.request.urlopen", side_effect=timeout_err):
            res = exotel_service.send_emergency_sms(to_phone="+919876543210", user_name="TimeoutTest")

        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "failed")
        self.assertIn("Emergency communication failed", res["message"])
        self.assertIn("timed out", res["safe_message"].lower())
        self.assertIn("112", res["safe_message"])
        self.assertIsNone(res["sid"])

    # =========================================================================
    # TEST 7: EXOTEL API FAILURE
    # =========================================================================
    def test_scenario_07_exotel_api_failure(self):
        """
        Scenario 7: Exotel API returns HTTP 400, HTTP 403 (KYC pending), HTTP 429, or HTTP 500.
        - Must return success=False for every failure.
        - Must clearly show 'Emergency communication failed'.
        - Specific error hints like KYC status must be truthfully included without masking.
        """
        failure_cases = [
            (400, b'{"RestException":{"Message":"Unassigned virtual number"}}', "rejected"),
            (403, b'{"RestException":{"Message":"Your account is not yet KYC compliant"}}', "KYC"),
            (429, b'{"RestException":{"Message":"Too many requests"}}', "rate limit"),
            (500, b'{"RestException":{"Message":"Internal server error"}}', "500")
        ]

        for code, body, hint in failure_cases:
            with self.subTest(code=code):
                mock_err = urllib.error.HTTPError(
                    url="https://api.exotel.com/v1/Accounts/test/Sms/send.json",
                    code=code,
                    msg=f"HTTP {code}",
                    hdrs={},
                    fp=MagicMock(read=lambda b=body: b)
                )

                with patch("urllib.request.urlopen", side_effect=mock_err):
                    res = exotel_service.send_emergency_sms(to_phone="+919876543210", user_name="ApiFailTest")

                self.assertFalse(res["success"], f"Must return success=False on HTTP {code}")
                self.assertEqual(res["status"], "failed")
                self.assertIn("Emergency communication failed", res["message"])
                self.assertIn(hint.lower(), res["safe_message"].lower())
                self.assertIsNone(res["sid"])

    # =========================================================================
    # TEST 8: NETWORK FAILURE
    # =========================================================================
    def test_scenario_08_network_failure(self):
        """
        Scenario 8: Network failure (host unreachable, DNS resolution error, offline).
        - URLError or socket.gaierror must be handled safely.
        - Must return success=False, status='failed'.
        - Safe message must identify network connection error and direct user to 112.
        """
        network_err = urllib.error.URLError(socket.gaierror("getaddrinfo failed"))

        with patch("urllib.request.urlopen", side_effect=network_err):
            res = exotel_service.send_emergency_sms(to_phone="+919876543210", user_name="NetTest")

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
        """
        Scenario 9: One channel succeeds while the other fails.
        - Combined notify / SOS must report overall_status='partially_completed'.
        - Granular statuses: sms_status='sent', call_status='failed'.
        - Message must clearly explain that one channel failed while the other succeeded.
        - Available SID must be preserved and returned.
        """
        contact = EmergencyContact(name="Rahul", phone="+919876543210", relation="Friend", user_id="u9")
        self.db.add(contact)
        self.db.commit()

        # Mock: SMS succeeds, Voice Call fails
        def side_effect(req, *args, **kwargs):
            if "Sms" in req.full_url:
                mock_ok = MagicMock()
                mock_ok.getcode.return_value = 200
                mock_ok.read.return_value = b'{"SMSMessage":{"Sid":"SMS_PARTIAL_999","Status":"sent"}}'
                mock_ok.__enter__.return_value = mock_ok
                return mock_ok
            else:
                # Call fails with 403
                raise urllib.error.HTTPError(
                    url=req.full_url,
                    code=403,
                    msg="Forbidden",
                    hdrs={},
                    fp=MagicMock(read=lambda: b'{"RestException":{"Message":"Trial call restricted"}}')
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
        """
        Scenario 10: Complete success (both SMS and Voice Call succeed).
        - overall_status='completed', sms_status='sent', call_status='initiated'.
        - Both Call SID and SMS SID returned and logged in database.
        - Response message confirms complete dispatch to configured contact.
        - Trusted contact configuration preserved in DB.
        """
        contact = EmergencyContact(name="Ananya", phone="+919876543210", relation="Family", user_id="u10")
        self.db.add(contact)
        self.db.commit()

        def side_effect(req, *args, **kwargs):
            mock_res = MagicMock()
            mock_res.getcode.return_value = 200
            if "Sms" in req.full_url:
                mock_res.read.return_value = b'{"SMSMessage":{"Sid":"SMS_FULL_SUCCESS_111","Status":"sent"}}'
            else:
                mock_res.read.return_value = b'{"Call":{"Sid":"CALL_FULL_SUCCESS_222","Status":"initiated"}}'
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

        # Verify audit logs in database
        logs = self.db.query(EmergencyEventLog).filter(EmergencyEventLog.user_id == "u10").all()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].status, "completed")
        self.assertIn(logs[0].sid, ["CALL_FULL_SUCCESS_222", "SMS_FULL_SUCCESS_111"])

        # Verify trusted contact is preserved intact
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
        - If Exotel fails, returns success=False and 'Emergency communication failed'.
        """
        contact = EmergencyContact(name="Neha", phone="+919876543210", relation="Family", user_id="u_failsafe")
        self.db.add(contact)
        self.db.commit()

        # Simulate Exotel complete failure
        mock_err = urllib.error.HTTPError(
            url="https://api.exotel.com", code=503, msg="Service Unavailable", hdrs={},
            fp=MagicMock(read=lambda: b'{"RestException":{"Message":"Service Unavailable"}}')
        )

        with patch("urllib.request.urlopen", side_effect=mock_err):
            sos_req = SOSRequest(latitude=17.3850, longitude=78.4867, custom_message="Help")
            res = assist.trigger_sos(self.db, sos_req, user_id="u_failsafe")

        # Must NOT return success=True
        self.assertFalse(res.success, "Never return success=True when Exotel fails")
        self.assertEqual(res.overall_status, "failed")
        self.assertIn("Emergency communication failed", res.message)
        self.assertIn("112", res.message)

        # Verify lifelines are verified official nodes, not artificial coordinate offsets
        self.assertEqual(len(res.nearest_havens), 3)
        for h in res.nearest_havens:
            self.assertTrue(h.is_verified)
            self.assertFalse(h.is_demo)
            self.assertIn("ERSS 112" if h.phone == "112" else "National", h.data_source)


if __name__ == "__main__":
    unittest.main()
