import unittest
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

from app.core.config import settings
from app.models.models import Base, EmergencyContact
from app.schemas.schemas import EmergencyActionRequest, SOSRequest
from app.services import exotel_service, assist

class TestExotelEmergencyIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.Session()
        # Clean contacts
        self.db.query(EmergencyContact).delete()
        self.db.commit()
        # Reset locks
        exotel_service._emergency_request_locks.clear()

    def tearDown(self):
        self.db.close()

    # TEST 4: Missing Exotel credentials produce a safe configuration error
    def test_missing_credentials_safe_error(self):
        with patch.object(settings, "EXOTEL_API_KEY", None), \
             patch.object(settings, "EXOTEL_API_TOKEN", None), \
             patch.object(settings, "EXOTEL_ACCOUNT_SID", None), \
             patch.object(settings, "EXOTEL_EXOPHONE", None):
            
            is_valid, err = exotel_service.validate_exotel_configuration()
            self.assertFalse(is_valid)
            self.assertIn("not fully configured", err)

            sms_res = exotel_service.send_emergency_sms(
                to_phone="+919876543210",
                user_name="John Traveler"
            )
            self.assertFalse(sms_res["success"])
            self.assertEqual(sms_res["status"], "failed")
            self.assertIn("not configured", sms_res["safe_message"].lower())
            # Ensure no credentials or keys are exposed
            self.assertNotIn("KEY", sms_res["safe_message"])
            self.assertNotIn("TOKEN", sms_res["safe_message"])

            call_res = exotel_service.make_emergency_call(
                to_phone="+919876543210",
                user_name="John Traveler"
            )
            self.assertFalse(call_res["success"])
            self.assertEqual(call_res["status"], "failed")
            self.assertIn("not configured", call_res["safe_message"].lower())

    # TEST 5: Missing trusted contact is rejected
    def test_missing_trusted_contact_rejected(self):
        # Database has 0 contacts
        req = EmergencyActionRequest(latitude=12.9716, longitude=77.5946)
        
        with self.assertRaises(HTTPException) as cm:
            assist.send_trusted_contact_sms(self.db, req, user_id="user_without_contact")
        self.assertEqual(cm.exception.status_code, 400)
        self.assertIn("No trusted emergency contact is configured", cm.exception.detail)

        with self.assertRaises(HTTPException) as cm_call:
            assist.make_trusted_contact_call(self.db, req, user_id="user_without_contact")
        self.assertEqual(cm_call.exception.status_code, 400)
        self.assertIn("No trusted emergency contact is configured", cm_call.exception.detail)

    # TEST 6: Arbitrary destination number from frontend is rejected / ignored
    def test_arbitrary_destination_rejected_uses_stored_contact_only(self):
        # Store a legitimate contact
        stored = EmergencyContact(
            name="Alice Guardian",
            phone="+919876543210",
            relation="Parent",
            user_id="legit_user"
        )
        self.db.add(stored)
        self.db.commit()

        # Mock exotel_service.send_emergency_sms to inspect destination called
        with patch.object(exotel_service, "send_emergency_sms") as mock_send:
            mock_send.return_value = {
                "success": True,
                "status": "sent",
                "sid": "sms_mock_123",
                "message": "Sent",
                "safe_message": "Sent"
            }

            # Attempt to pass an arbitrary destination in the request payload
            req = EmergencyActionRequest(
                latitude=12.97,
                longitude=77.59,
                custom_message="Testing arbitrary destination rejection"
            )

            res = assist.send_trusted_contact_sms(self.db, req, user_id="legit_user")
            self.assertTrue(res.success)
            # Verify send_emergency_sms was called strictly with the STORED contact's phone
            mock_send.assert_called_once()
            called_to_phone = mock_send.call_args[1]["to_phone"]
            self.assertEqual(called_to_phone, "+919876543210")
            self.assertEqual(res.recipient_name, "Alice Guardian")

    # TEST 8 & 9: Trusted Contact SMS & Voice call use only stored contact
    def test_trusted_contact_voice_call_uses_stored_contact(self):
        stored = EmergencyContact(
            name="Bob Guardian",
            phone="+919812345678",
            relation="Spouse",
            user_id="user_bob"
        )
        self.db.add(stored)
        self.db.commit()

        with patch.object(exotel_service, "make_emergency_call") as mock_call:
            mock_call.return_value = {
                "success": True,
                "status": "initiated",
                "sid": "call_mock_456",
                "message": "Initiated",
                "safe_message": "Initiated"
            }

            req = EmergencyActionRequest(latitude=19.0760, longitude=72.8777)
            res = assist.make_trusted_contact_call(self.db, req, user_id="user_bob")
            self.assertTrue(res.success)
            self.assertEqual(res.status, "initiated")
            mock_call.assert_called_once()
            self.assertEqual(mock_call.call_args[1]["to_phone"], "+919812345678")
            self.assertEqual(res.recipient_name, "Bob Guardian")

    # TEST 10: GPS location is included when available
    def test_gps_location_included_in_sms(self):
        sms_text = exotel_service.format_emergency_sms(
            user_name="Charlie",
            latitude=28.6139,
            longitude=77.2090
        )
        self.assertIn("Charlie", sms_text)
        self.assertIn("https://www.google.com/maps?q=28.613900,77.209000", sms_text)
        self.assertIn("TRAVEL GUARDIAN EMERGENCY ALERT", sms_text)

    # TEST 11: GPS unavailable is handled safely
    def test_gps_unavailable_handled_safely(self):
        sms_text_none = exotel_service.format_emergency_sms(
            user_name="Charlie",
            latitude=None,
            longitude=None
        )
        self.assertIn("Current location is currently unavailable.", sms_text_none)
        self.assertNotIn("https://www.google.com/maps", sms_text_none)

    # TEST 12: Repeated SOS clicks do not create uncontrolled duplicate requests (Debounce lock)
    def test_debounce_repeated_requests(self):
        user = "rapid_user"
        acquired1, _ = exotel_service.check_and_acquire_emergency_lock(user, cooldown_seconds=5)
        self.assertTrue(acquired1)

        # Immediate second attempt within cooldown window
        acquired2, reason = exotel_service.check_and_acquire_emergency_lock(user, cooldown_seconds=5)
        self.assertFalse(acquired2)
        self.assertIn("Please wait", reason)

    # Phone normalization and validation tests
    def test_phone_normalization(self):
        self.assertEqual(exotel_service.normalize_phone_number("9876543210"), "+919876543210")
        self.assertEqual(exotel_service.normalize_phone_number("09876543210"), "+919876543210")
        self.assertEqual(exotel_service.normalize_phone_number("+91 98765 43210"), "+919876543210")
        self.assertEqual(exotel_service.normalize_phone_number("+1-415-234-5678"), "+14152345678")
        
        # Fictional 555 numbers must be rejected
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("+1-555-019900")
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("123")  # Too short
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("abc")  # Not digits

    # Phone masking test
    def test_phone_masking(self):
        masked = exotel_service.mask_phone_number("+919876543210")
        self.assertTrue(masked.startswith("+9198"))
        self.assertTrue(masked.endswith("210"))
        self.assertIn("*", masked)
        self.assertNotIn("9876543210", masked)

    # Unified SOS endpoint test
    def test_trigger_sos_with_exotel_integration(self):
        stored = EmergencyContact(
            name="David Guardian",
            phone="+919876543210",
            relation="Sibling",
            user_id="user_david"
        )
        self.db.add(stored)
        self.db.commit()

        with patch.object(exotel_service, "send_emergency_sms") as mock_sms, \
             patch.object(exotel_service, "make_emergency_call") as mock_call:
            
            mock_sms.return_value = {"success": True, "status": "sent", "sid": "sms_1"}
            mock_call.return_value = {"success": True, "status": "initiated", "sid": "call_1"}

            sos_req = SOSRequest(latitude=12.9716, longitude=77.5946, custom_message="Help needed")
            sos_res = assist.trigger_sos(self.db, sos_req, user_id="user_david")

            self.assertTrue(sos_res.success)
            self.assertEqual(sos_res.sms_status, "sent")
            self.assertEqual(sos_res.call_status, "initiated")
            self.assertEqual(sos_res.overall_status, "completed")
            self.assertEqual(sos_res.recipient_name, "David Guardian")
            self.assertTrue(len(sos_res.nearest_havens) > 0)

    # TEST: Outbound SMS request construction with mocked Exotel API
    def test_outbound_sms_api_construction(self):
        with patch.object(settings, "EXOTEL_API_KEY", "mock_key"), \
             patch.object(settings, "EXOTEL_API_TOKEN", "mock_token"), \
             patch.object(settings, "EXOTEL_ACCOUNT_SID", "mock_account_123"), \
             patch.object(settings, "EXOTEL_EXOPHONE", "08012345678"), \
             patch.object(settings, "EXOTEL_SUBDOMAIN", "api.exotel.com"):

            mock_response = MagicMock()
            mock_response.read.return_value = b'{"SMSMessage": {"Sid": "sms_sid_999", "Status": "queued"}}'
            mock_response.getcode.return_value = 200
            mock_response.__enter__.return_value = mock_response

            with patch("urllib.request.urlopen", return_value=mock_response) as mock_urlopen:
                res = exotel_service.send_emergency_sms(
                    to_phone="+919876543210",
                    user_name="Neelima",
                    latitude=17.3850,
                    longitude=78.4867
                )
                self.assertTrue(res["success"])
                self.assertEqual(res["status"], "sent")
                self.assertEqual(res["sid"], "sms_sid_999")

                # Verify URL opened
                req_obj = mock_urlopen.call_args[0][0]
                self.assertIn("mock_account_123/Sms/send.json", req_obj.full_url)
                # Verify Authorization header is Basic auth
                self.assertTrue(req_obj.has_header("Authorization"))
                self.assertTrue(req_obj.get_header("Authorization").startswith("Basic "))

    # TEST: Outbound Call request construction with mocked Exotel API
    def test_outbound_call_api_construction(self):
        with patch.object(settings, "EXOTEL_API_KEY", "mock_key"), \
             patch.object(settings, "EXOTEL_API_TOKEN", "mock_token"), \
             patch.object(settings, "EXOTEL_ACCOUNT_SID", "mock_account_123"), \
             patch.object(settings, "EXOTEL_EXOPHONE", "08012345678"):

            mock_response = MagicMock()
            mock_response.read.return_value = b'{"Call": {"Sid": "call_sid_888", "Status": "in-progress"}}'
            mock_response.getcode.return_value = 200
            mock_response.__enter__.return_value = mock_response

            with patch("urllib.request.urlopen", return_value=mock_response) as mock_urlopen:
                res = exotel_service.make_emergency_call(
                    to_phone="+919876543210",
                    user_name="Neelima"
                )
                self.assertTrue(res["success"])
                self.assertEqual(res["status"], "initiated")
                self.assertEqual(res["sid"], "call_sid_888")


                req_obj = mock_urlopen.call_args[0][0]
                self.assertIn("mock_account_123/Calls/connect.json", req_obj.full_url)

    # TEST: 112 is rejected if passed to phone normalization or Exotel
    def test_112_not_valid_for_exotel_trusted_contact(self):
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("112")
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("911")

if __name__ == "__main__":
    unittest.main()

