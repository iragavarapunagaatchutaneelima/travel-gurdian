import unittest
import base64
import json
import urllib.request
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.models import Base, EmergencyContact, EmergencyEventLog
from app.schemas.schemas import EmergencyActionRequest, SOSRequest
from app.services import exotel_service, assist


class TestExotelComprehensiveValidation(unittest.TestCase):
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

    # 1. Environment variables load correctly
    def test_req1_environment_variables_loading(self):
        self.assertIsNotNone(settings.PROJECT_NAME)
        self.assertIsNotNone(settings.API_V1_STR)
        self.assertEqual(settings.EXOTEL_SUBDOMAIN, "api.exotel.com")
        self.assertEqual(settings.EXOTEL_ACCOUNT_SID, "senapathiyaswanth1")

    # 2 & 3. Exotel authentication & backend communication
    def test_req2_and_3_authentication_and_communication(self):
        with patch.object(settings, "EXOTEL_API_KEY", "mock_key"), \
             patch.object(settings, "EXOTEL_API_TOKEN", "mock_token"), \
             patch.object(settings, "EXOTEL_ACCOUNT_SID", "senapathiyaswanth1"):

            mock_resp = MagicMock()
            mock_resp.getcode.return_value = 200
            mock_resp.read.return_value = b'{"Account": {"Balance": "100.00", "Currency": "INR"}}'
            mock_resp.__enter__.return_value = mock_resp

            with patch("urllib.request.urlopen", return_value=mock_resp) as mock_urlopen:
                diag = exotel_service.test_exotel_authentication()
                self.assertTrue(diag["is_configured"])
                self.assertTrue(diag["authenticated"])
                self.assertEqual(diag["account_sid"], "senapathiyaswanth1")
                self.assertEqual(diag["currency"], "INR")

                # Verify URL uses Singapore host and Balance.json
                req = mock_urlopen.call_args[0][0]
                self.assertEqual(req.full_url, "https://api.exotel.com/v1/Accounts/senapathiyaswanth1/Balance.json")
                self.assertTrue(req.has_header("Authorization"))

    # 4. Correct Singapore API host is being used
    def test_req4_singapore_api_host(self):
        with patch.object(settings, "EXOTEL_SUBDOMAIN", "api.exotel.com"):
            self.assertEqual(exotel_service._get_exotel_host(), "api.exotel.com")
        with patch.object(settings, "EXOTEL_SUBDOMAIN", "https://api.exotel.com/"):
            self.assertEqual(exotel_service._get_exotel_host(), "api.exotel.com")
        with patch.object(settings, "EXOTEL_SUBDOMAIN", "api"):
            self.assertEqual(exotel_service._get_exotel_host(), "api.exotel.com")

    # 5. Correct Account SID is being used
    def test_req5_account_sid(self):
        self.assertEqual(settings.EXOTEL_ACCOUNT_SID, "senapathiyaswanth1")

    # 6 & 7. API Token is loaded securely, never leaked
    def test_req6_and_7_api_key_and_token_security(self):
        secret_token = "ultra_secret_production_token_12345"
        with patch.object(settings, "EXOTEL_API_KEY", "travel-guardian"), \
             patch.object(settings, "EXOTEL_API_TOKEN", secret_token), \
             patch.object(settings, "EXOTEL_ACCOUNT_SID", "senapathiyaswanth1"), \
             patch.object(settings, "EXOTEL_EXOPHONE", "08012345678"):

            # Test safe response does NOT contain secret token
            diag = exotel_service.test_exotel_authentication()
            diag_str = json.dumps(diag)
            self.assertNotIn(secret_token, diag_str)

            # Test error responses do NOT contain secret token
            mock_err = urllib.error.HTTPError(
                url="https://api.exotel.com/v1/Accounts/senapathiyaswanth1/Calls/connect.json",
                code=401,
                msg="Unauthorized",
                hdrs={},
                fp=MagicMock(read=lambda: b'{"RestException": {"Message": "Invalid credentials"}}')
            )
            with patch("urllib.request.urlopen", side_effect=mock_err):
                res = exotel_service.make_emergency_call(to_phone="+919876543210")
                res_str = json.dumps(res)
                self.assertNotIn(secret_token, res_str)
                self.assertFalse(res["success"])
                self.assertEqual(res["status"], "failed")

    # 8. SOS request reaches backend and triggers dispatch
    def test_req8_sos_request_reaches_backend(self):
        contact = EmergencyContact(
            name="Priya Guardian",
            phone="+919876543210",
            relation="Family",
            user_id="sos_user"
        )
        self.db.add(contact)
        self.db.commit()

        req = SOSRequest(latitude=17.3850, longitude=78.4867, custom_message="SOS Help!")
        with patch.object(exotel_service, "send_emergency_sms", return_value={"status": "sent", "success": True, "sid": "sms_sos_1"}), \
             patch.object(exotel_service, "make_emergency_call", return_value={"status": "initiated", "success": True, "sid": "call_sos_1"}):
            
            sos_res = assist.trigger_sos(self.db, req, user_id="sos_user")
            self.assertTrue(sos_res.success)
            self.assertEqual(sos_res.sms_status, "sent")
            self.assertEqual(sos_res.call_status, "initiated")
            self.assertEqual(sos_res.overall_status, "completed")
            self.assertEqual(sos_res.recipient_name, "Priya Guardian")

    # 9. Phone number validation
    def test_req9_phone_number_validation(self):
        # Valid 10-digit Indian numbers normalize to +91
        self.assertEqual(exotel_service.normalize_phone_number("9876543210"), "+919876543210")
        self.assertEqual(exotel_service.normalize_phone_number("09876543210"), "+919876543210")
        self.assertEqual(exotel_service.normalize_phone_number("919876543210"), "+919876543210")
        self.assertEqual(exotel_service.normalize_phone_number("+919876543210"), "+919876543210")
        # International numbers with +
        self.assertEqual(exotel_service.normalize_phone_number("+14155552671"), "+14155552671")
        # Clearly invalid numbers are rejected
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("123")  # too short
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("0000000000")  # identical repeating
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("not_a_number")
        with self.assertRaises(ValueError):
            exotel_service.normalize_phone_number("112")  # emergency dispatch, not personal mobile

    # 10. Backend sends call request to Exotel
    def test_req10_backend_sends_call_request(self):
        with patch.object(settings, "EXOTEL_API_KEY", "travel-guardian"), \
             patch.object(settings, "EXOTEL_API_TOKEN", "token_xyz"), \
             patch.object(settings, "EXOTEL_ACCOUNT_SID", "senapathiyaswanth1"), \
             patch.object(settings, "EXOTEL_EXOPHONE", "08045678901"):

            mock_resp = MagicMock()
            mock_resp.getcode.return_value = 200
            mock_resp.read.return_value = b'{"Call": {"Sid": "c_call_12345", "Status": "in-progress"}}'
            mock_resp.__enter__.return_value = mock_resp

            with patch("urllib.request.urlopen", return_value=mock_resp) as mock_urlopen:
                res = exotel_service.make_emergency_call(to_phone="+919876543210", user_name="Test Traveler")
                self.assertTrue(res["success"])
                self.assertEqual(res["status"], "initiated")
                self.assertEqual(res["sid"], "c_call_12345")

                # Verify request object
                req_obj = mock_urlopen.call_args[0][0]
                self.assertEqual(req_obj.full_url, "https://api.exotel.com/v1/Accounts/senapathiyaswanth1/Calls/connect.json")
                # Verify Basic auth credentials encoding
                expected_auth = "Basic " + base64.b64encode(b"travel-guardian:token_xyz").decode("ascii")
                self.assertEqual(req_obj.get_header("Authorization"), expected_auth)

    # 11 & 12. Exotel response handling and Call SID extraction
    def test_req11_and_12_exotel_response_handling_and_sid(self):
        with patch.object(settings, "EXOTEL_API_KEY", "key"), \
             patch.object(settings, "EXOTEL_API_TOKEN", "token"), \
             patch.object(settings, "EXOTEL_ACCOUNT_SID", "senapathiyaswanth1"), \
             patch.object(settings, "EXOTEL_EXOPHONE", "08012345678"):

            # 200 success with Call SID
            mock_resp = MagicMock()
            mock_resp.getcode.return_value = 200
            mock_resp.read.return_value = b'{"Call": {"Sid": "call_sid_exact_999"}}'
            mock_resp.__enter__.return_value = mock_resp
            with patch("urllib.request.urlopen", return_value=mock_resp):
                call_res = exotel_service.make_emergency_call(to_phone="+919876543210")
                self.assertEqual(call_res["sid"], "call_sid_exact_999")
                self.assertEqual(call_res["status"], "initiated")

            # 429 rate limit
            mock_429 = urllib.error.HTTPError(
                url="https://api.exotel.com/v1/Accounts/senapathiyaswanth1/Calls/connect.json",
                code=429,
                msg="Too Many Requests",
                hdrs={},
                fp=MagicMock(read=lambda: b'Rate limited')
            )
            with patch("urllib.request.urlopen", side_effect=mock_429):
                res_429 = exotel_service.make_emergency_call(to_phone="+919876543210")
                self.assertFalse(res_429["success"])
                self.assertIn("rate limit", res_429["safe_message"].lower())

            # 500 server error
            mock_500 = urllib.error.HTTPError(
                url="https://api.exotel.com/v1/Accounts/senapathiyaswanth1/Calls/connect.json",
                code=500,
                msg="Internal Error",
                hdrs={},
                fp=MagicMock(read=lambda: b'Internal Error')
            )
            with patch("urllib.request.urlopen", side_effect=mock_500):
                res_500 = exotel_service.make_emergency_call(to_phone="+919876543210")
                self.assertFalse(res_500["success"])
                self.assertIn("gateway server error", res_500["safe_message"].lower())

    # 13. Frontend receives only safe response information
    def test_req13_frontend_safe_response_sanitization(self):
        contact = EmergencyContact(name="Mom", phone="+919876543210", relation="Mother", user_id="safe_user")
        self.db.add(contact)
        self.db.commit()

        req = EmergencyActionRequest(latitude=12.9716, longitude=77.5946)
        with patch.object(exotel_service, "send_emergency_sms", return_value={"status": "sent", "success": True, "sid": "s1"}), \
             patch.object(exotel_service, "make_emergency_call", return_value={"status": "initiated", "success": True, "sid": "c1"}):

            resp = assist.notify_trusted_contact(self.db, req, user_id="safe_user")
            resp_dict = resp.model_dump()

            # Phone number must be masked in response
            self.assertEqual(resp_dict["recipient_phone_masked"], "+9198*****210")
            # No credentials or auth details in payload
            self.assertNotIn("token", resp_dict)
            self.assertNotIn("api_key", resp_dict)


    # 14. Existing SOS functionality still works and truthfulness is maintained
    def test_req14_existing_sos_functionality_preserved(self):
        # 14a. With zero contacts: fails truthfully, but still provides nearest safe havens
        req = SOSRequest(latitude=28.6139, longitude=77.2090)
        sos_res_empty = assist.trigger_sos(self.db, req, user_id="sos_preservation_empty")
        self.assertFalse(sos_res_empty.success)
        self.assertEqual(sos_res_empty.overall_status, "no_trusted_contact")
        self.assertGreater(len(sos_res_empty.nearest_havens), 0)
        self.assertIn("112", [h.phone for h in sos_res_empty.nearest_havens])

        # 14b. With registered contact: dispatches via Exotel and reports success
        contact = EmergencyContact(name="Haven Contact", phone="+919876543210", relation="Guardian", user_id="sos_preservation_test")
        self.db.add(contact)
        self.db.commit()

        with patch.object(exotel_service, "send_emergency_sms", return_value={"status": "sent", "success": True, "sid": "s1"}), \
             patch.object(exotel_service, "make_emergency_call", return_value={"status": "initiated", "success": True, "sid": "c1"}):
            sos_res = assist.trigger_sos(self.db, req, user_id="sos_preservation_test")
            self.assertTrue(sos_res.success)
            self.assertEqual(sos_res.overall_status, "completed")
            self.assertGreater(len(sos_res.nearest_havens), 0)
            self.assertEqual(sos_res.nearest_havens[0].type, "National Emergency Service")
            self.assertTrue(sos_res.nearest_havens[0].is_verified)
            self.assertIn("112", [h.phone for h in sos_res.nearest_havens])

    # 15. Emergency event logging in database
    def test_req15_emergency_event_logging(self):
        contact = EmergencyContact(name="Dad", phone="+919876543210", relation="Father", user_id="log_user")
        self.db.add(contact)
        self.db.commit()

        req = EmergencyActionRequest(latitude=13.0827, longitude=80.2707)
        with patch.object(exotel_service, "make_emergency_call", return_value={"status": "initiated", "success": True, "sid": "log_sid_777"}):
            assist.make_trusted_contact_call(self.db, req, user_id="log_user")

        logs = assist.get_emergency_event_logs(self.db, user_id="log_user")
        self.assertGreater(len(logs), 0)
        self.assertEqual(logs[0].event_type, "voice_call")
        self.assertEqual(logs[0].sid, "log_sid_777")
        self.assertEqual(logs[0].status, "initiated")


if __name__ == "__main__":
    unittest.main()
