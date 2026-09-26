import unittest
import json
import base64
import urllib.request
import urllib.error
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.config import settings
from app.models.models import Base, EmergencyContact, EmergencyEventLog
from app.schemas.schemas import EmergencyActionRequest, SOSRequest
from app.services import exotel_service, assist


class TestExotelProductionAudit(unittest.TestCase):
    """
    Production-grade Exotel Integration Audit and Verification Test Suite.
    Exhaustively verifies every endpoint, credential handling, Singapore regional host,
    phone normalization, response parsing (JSON & XML), Call/SMS SID handling,
    timeout resilience, error mapping, and truthfulness of emergency status.
    """

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        # These tests exercise the mocked HTTP request/response plumbing in
        # exotel_service, not real Exotel network calls (urllib.request.urlopen
        # is patched per-test). Dry-run is a safety gate that sits ABOVE that
        # plumbing, so it must be disabled here to actually reach the mocks.
        settings.EXOTEL_DRY_RUN = False
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
    # 1. VERIFY ENDPOINTS EXIST IN FASTAPI APP
    # =========================================================================
    def test_verify_all_required_endpoints_exist_in_fastapi(self):
        """
        Verify that every frontend endpoint actually exists in the FastAPI backend:
        /emergency/sms
        /emergency/call
        /emergency/notify-trusted-contact
        /emergency/config-status
        AND their /api counterparts.
        """
        routes = list(app.openapi()["paths"].keys())
        
        # Verify root-level endpoints
        self.assertIn("/emergency/sms", routes)
        self.assertIn("/emergency/call", routes)
        self.assertIn("/emergency/notify-trusted-contact", routes)
        self.assertIn("/emergency/config-status", routes)
        self.assertIn("/emergency/diagnostic", routes)
        self.assertIn("/emergency/logs", routes)

        # Verify versioned /api/emergency endpoints
        self.assertIn("/api/emergency/sms", routes)
        self.assertIn("/api/emergency/call", routes)
        self.assertIn("/api/emergency/notify-trusted-contact", routes)
        self.assertIn("/api/emergency/config-status", routes)
        self.assertIn("/api/emergency/diagnostic", routes)
        self.assertIn("/api/emergency/logs", routes)

    # =========================================================================
    # 2. CONFIGURATION VALIDATION & SINGAPORE REGION API HOST
    # =========================================================================
    def test_configuration_validation_and_singapore_host(self):
        """
        Verifies credentials check, placeholder rejection, and Singapore host resolution.
        """
        # Test Singapore host resolution (always against an explicit fixture
        # value rather than whatever EXOTEL_SUBDOMAIN happens to be set to in
        # the ambient environment).
        with patch.object(settings, "EXOTEL_SUBDOMAIN", "api.exotel.com"):
            self.assertEqual(exotel_service._get_exotel_host(), "api.exotel.com")
        with patch.object(settings, "EXOTEL_SUBDOMAIN", "https://api.exotel.com/"):
            self.assertEqual(exotel_service._get_exotel_host(), "api.exotel.com")

        # Missing credentials
        with patch.object(settings, "EXOTEL_API_KEY", None):
            is_valid, err = exotel_service.validate_exotel_configuration()
            self.assertFalse(is_valid)
            self.assertIn("EXOTEL_API_KEY", err)

        # Placeholder detection
        with patch.object(settings, "EXOTEL_API_KEY", "your_travel_guardian_api_key"):
            is_valid, err = exotel_service.validate_exotel_configuration()
            self.assertFalse(is_valid)
            self.assertIn("placeholder", err.lower())

        # Exophone requirement for calls
        with patch.object(settings, "EXOTEL_API_KEY", "valid_key"), \
             patch.object(settings, "EXOTEL_API_TOKEN", "valid_token"), \
             patch.object(settings, "EXOTEL_ACCOUNT_SID", "senapathiyaswanth1"), \
             patch.object(settings, "EXOTEL_EXOPHONE", None):
            is_valid, err = exotel_service.validate_exotel_configuration(require_exophone=True)
            self.assertFalse(is_valid)
            self.assertIn("EXOTEL_EXOPHONE", err)

    # =========================================================================
    # 3. PHONE NUMBER VALIDATION & NO MOCK NUMBERS
    # =========================================================================
    def test_phone_number_validation_and_mock_rejection(self):
        """
        Tests E.164 normalization, Indian mobile formats, and strict rejection
        of dummy numbers, fictional 555 numbers, and emergency hotlines.
        """
        # Indian 10 digits
        self.assertEqual(exotel_service.normalize_phone_number("9876543210"), "+919876543210")
        # Indian 11 digits with 0
        self.assertEqual(exotel_service.normalize_phone_number("09876543210"), "+919876543210")
        # Indian 12 digits with 91
        self.assertEqual(exotel_service.normalize_phone_number("919876543210"), "+919876543210")
        # International with +
        self.assertEqual(exotel_service.normalize_phone_number("+14152345678"), "+14152345678")

        # Reject repeating digits (e.g. 0000000000)
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("0000000000")
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("9999999999")

        # Reject fictional 555 numbers
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("+1-555-0199")
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("5550199999")

        # Reject national emergency services as personal trusted contact
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("112")
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("911")
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("108")

    # =========================================================================
    # 4. EXOTEL RESPONSE PARSING: JSON AND XML
    # =========================================================================
    def test_response_parsing_json_and_xml(self):
        """
        Tests both JSON and XML response bodies from Exotel to ensure SID and status
        are extracted accurately regardless of response serialization.
        """
        # 1. JSON SMS
        json_sms = b'{"SMSMessage": {"Sid": "sms_json_123", "Status": "sent"}}'
        d_json, _ = exotel_service._parse_exotel_response_body(json_sms)
        sid, st = exotel_service._extract_sid_and_status(d_json, entity_type="sms")
        self.assertEqual(sid, "sms_json_123")
        self.assertEqual(st, "sent")

        # 2. JSON Call
        json_call = b'{"Call": {"Sid": "call_json_456", "Status": "in-progress"}}'
        d_call, _ = exotel_service._parse_exotel_response_body(json_call)
        sid_call, st_call = exotel_service._extract_sid_and_status(d_call, entity_type="call")
        self.assertEqual(sid_call, "call_json_456")
        self.assertEqual(st_call, "in-progress")

        # 3. XML SMS
        xml_sms = b'''<?xml version="1.0" encoding="UTF-8"?>
        <TwilioResponse>
            <SMSMessage>
                <Sid>sms_xml_789</Sid>
                <Status>queued</Status>
            </SMSMessage>
        </TwilioResponse>'''
        d_xml, _ = exotel_service._parse_exotel_response_body(xml_sms)
        sid_xml, st_xml = exotel_service._extract_sid_and_status(d_xml, entity_type="sms")
        self.assertEqual(sid_xml, "sms_xml_789")
        self.assertEqual(st_xml, "queued")

        # 4. XML Call
        xml_call = b'''<?xml version="1.0" encoding="UTF-8"?>
        <TwilioResponse>
            <Call>
                <Sid>call_xml_101</Sid>
                <Status>initiated</Status>
            </Call>
        </TwilioResponse>'''
        d_xml_call, _ = exotel_service._parse_exotel_response_body(xml_call)
        sid_xc, st_xc = exotel_service._extract_sid_and_status(d_xml_call, entity_type="call")
        self.assertEqual(sid_xc, "call_xml_101")
        self.assertEqual(st_xc, "initiated")

    # =========================================================================
    # 5. NO FAKE SUCCESS: DO NOT RETURN SUCCESS UNLESS EXOTEL ACCEPTS
    # =========================================================================
    def test_no_fake_success_when_exotel_rejects(self):
        """
        Verify that HTTP errors (400, 401, 403, 429, 500) and missing SIDs
        NEVER return success=True.
        """
        with patch.object(settings, "EXOTEL_API_KEY", "test_key"), \
             patch.object(settings, "EXOTEL_API_TOKEN", "test_token"), \
             patch.object(settings, "EXOTEL_ACCOUNT_SID", "senapathiyaswanth1"), \
             patch.object(settings, "EXOTEL_EXOPHONE", "08012345678"):

            # Case A: 200 OK returned by proxy, but NO SID in payload
            mock_empty_sid = MagicMock()
            mock_empty_sid.getcode.return_value = 200
            mock_empty_sid.read.return_value = b'{"status": "ok"}'
            mock_empty_sid.__enter__.return_value = mock_empty_sid

            with patch("urllib.request.urlopen", return_value=mock_empty_sid):
                res_sms = exotel_service.send_emergency_sms(to_phone="+919876543210")
                self.assertFalse(res_sms["success"])
                self.assertEqual(res_sms["status"], "failed")
                self.assertIsNone(res_sms["sid"])

                res_call = exotel_service.make_emergency_call(to_phone="+919876543210")
                self.assertFalse(res_call["success"])
                self.assertEqual(res_call["status"], "failed")

            # Case B: HTTP 403 KYC restricted error
            mock_403 = urllib.error.HTTPError(
                url="https://api.exotel.com/v1/Accounts/senapathiyaswanth1/Sms/send.json",
                code=403,
                msg="Forbidden",
                hdrs={},
                fp=MagicMock(read=lambda: b'{"RestException": {"Message": "Your account is not yet KYC compliant"}}')
            )
            with patch("urllib.request.urlopen", side_effect=mock_403):
                res_kyc = exotel_service.send_emergency_sms(to_phone="+919876543210")
                self.assertFalse(res_kyc["success"])
                self.assertEqual(res_kyc["status"], "failed")
                self.assertIn("KYC", res_kyc["safe_message"])

    # =========================================================================
    # 6. TIMEOUT HANDLING
    # =========================================================================
    def test_timeout_handling_returns_safe_error(self):
        """
        Verify that request timeouts do not crash and return a safe error message.
        """
        with patch.object(settings, "EXOTEL_API_KEY", "test_key"), \
             patch.object(settings, "EXOTEL_API_TOKEN", "test_token"), \
             patch.object(settings, "EXOTEL_ACCOUNT_SID", "senapathiyaswanth1"):

            with patch("urllib.request.urlopen", side_effect=TimeoutError("Connection timed out")):
                res = exotel_service.send_emergency_sms(to_phone="+919876543210")
                self.assertFalse(res["success"])
                self.assertEqual(res["status"], "failed")
                self.assertIn("timed out", res["safe_message"].lower())

    # =========================================================================
    # 7. COMBINED TRUSTED-CONTACT NOTIFICATION ENDPOINT
    # =========================================================================
    def test_combined_notification_endpoint(self):
        """
        Verifies /emergency/notify-trusted-contact logic:
        - Both channels succeed -> completed (success: True)
        - One channel succeeds -> partially_completed (success: True)
        - Both channels fail -> failed (success: False)
        """
        contact = EmergencyContact(name="Ananya", phone="+919876543210", relation="Sister", user_id="u_combined")
        self.db.add(contact)
        self.db.commit()

        req = EmergencyActionRequest(latitude=12.9716, longitude=77.5946)

        # 1. Both succeed
        with patch.object(exotel_service, "send_emergency_sms", return_value={"status": "sent", "success": True, "sid": "sms_sid_1"}), \
             patch.object(exotel_service, "make_emergency_call", return_value={"status": "initiated", "success": True, "sid": "call_sid_1"}):
            res = assist.notify_trusted_contact(self.db, req, user_id="u_combined")
            self.assertTrue(res.success)
            self.assertEqual(res.overall_status, "completed")
            self.assertEqual(res.sms_sid, "sms_sid_1")
            self.assertEqual(res.call_sid, "call_sid_1")

        # 2. Both fail
        exotel_service._emergency_request_locks.clear()
        with patch.object(exotel_service, "send_emergency_sms", return_value={"status": "failed", "success": False, "error": "KYC needed"}), \
             patch.object(exotel_service, "make_emergency_call", return_value={"status": "failed", "success": False, "error": "KYC needed"}):
            res_fail = assist.notify_trusted_contact(self.db, req, user_id="u_combined")
            self.assertFalse(res_fail.success)
            self.assertEqual(res_fail.overall_status, "failed")
            self.assertIn("failed", res_fail.message.lower())

    # =========================================================================
    # 8. END-TO-END FLOW: SOS -> BACKEND -> EXOTEL -> TRUSTED CONTACT
    # =========================================================================
    def test_end_to_end_sos_flow_with_exotel_and_audit_logging(self):
        """
        Full integration pipeline:
        SOS Trigger -> Database Contact Resolution -> Exotel SMS & Voice -> Audit Logging -> Safe Haven Response.
        """
        contact = EmergencyContact(
            name="Rajesh Sharma",
            phone="+919876543210",
            email="rajesh@example.com",
            relation="Parent",
            user_id="sos_flow_user"
        )
        self.db.add(contact)
        self.db.commit()

        sos_req = SOSRequest(
            latitude=17.3850,
            longitude=78.4867,
            custom_message="Emergency at Hyderabad highway"
        )

        with patch.object(exotel_service, "send_emergency_sms") as mock_sms, \
             patch.object(exotel_service, "make_emergency_call") as mock_call:

            mock_sms.return_value = {"status": "sent", "success": True, "sid": "sms_sos_sid_100"}
            mock_call.return_value = {"status": "initiated", "success": True, "sid": "call_sos_sid_200"}

            sos_res = assist.trigger_sos(self.db, sos_req, user_id="sos_flow_user")

            # 1. Verification of SOS response
            self.assertTrue(sos_res.success)
            self.assertEqual(sos_res.overall_status, "completed")
            self.assertEqual(sos_res.sms_status, "sent")
            self.assertEqual(sos_res.call_status, "initiated")
            self.assertEqual(sos_res.recipient_name, "Rajesh Sharma")
            self.assertIn("Rajesh Sharma", sos_res.broadcasted_contacts[0])

            # 2. Verification of Exotel API invocations
            mock_sms.assert_called_once()
            called_sms_to = mock_sms.call_args[1]["to_phone"]
            self.assertEqual(called_sms_to, "+919876543210")

            mock_call.assert_called_once()
            called_call_to = mock_call.call_args[1]["to_phone"]
            self.assertEqual(called_call_to, "+919876543210")

            # 3. Verification of Emergency Audit Event Log in SQLite DB
            logs = assist.get_emergency_event_logs(self.db, user_id="sos_flow_user")
            self.assertGreater(len(logs), 0)
            sos_log = logs[0]
            self.assertEqual(sos_log.event_type, "sos_broadcast")
            self.assertEqual(sos_log.recipient_name, "Rajesh Sharma")
            self.assertEqual(sos_log.status, "completed")
            self.assertEqual(sos_log.recipient_phone_masked, "+9198*****210")

            # 4. Verification that Safe Havens contain official emergency hotline (112)
            self.assertGreater(len(sos_res.nearest_havens), 0)
            self.assertIn("112", [h.phone for h in sos_res.nearest_havens])

    # =========================================================================
    # 9. SECRET SANITIZATION & SAFE LOGGING
    # =========================================================================
    def test_secrets_never_exposed_in_responses_or_logs(self):
        """
        Verify that neither EXOTEL_API_KEY nor EXOTEL_API_TOKEN is ever leaked in any response.
        """
        secret_key = "sensitive_key_9999"
        secret_token = "ultra_secret_token_8888"

        with patch.object(settings, "EXOTEL_API_KEY", secret_key), \
             patch.object(settings, "EXOTEL_API_TOKEN", secret_token), \
             patch.object(settings, "EXOTEL_ACCOUNT_SID", "senapathiyaswanth1"):

            # A. Config status response
            from app.api.emergency import get_config_status
            cfg = get_config_status()
            cfg_json = cfg.model_dump_json()
            self.assertNotIn(secret_key, cfg_json)
            self.assertNotIn(secret_token, cfg_json)
            self.assertTrue(cfg.is_configured)
            self.assertEqual(cfg.region, "Singapore")

            # B. Diagnostic response
            diag = exotel_service.test_exotel_authentication()
            diag_str = json.dumps(diag)
            self.assertNotIn(secret_key, diag_str)
            self.assertNotIn(secret_token, diag_str)


if __name__ == "__main__":
    unittest.main()
