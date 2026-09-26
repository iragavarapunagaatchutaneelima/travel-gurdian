"""
Real HTTP-layer integration tests using FastAPI's TestClient.

Every other test file in this suite calls service-layer functions directly
(e.g. `assist.send_trusted_contact_sms(db, request, user_id)`), which never
exercises FastAPI's own routing, dependency injection, request validation,
or -- critically -- the device-identity cookie mechanism added to close the
`?user_id=` trust boundary. These tests hit the actual app over HTTP via
TestClient so that layer is verified too.

Uses its own isolated SQLite file (not the real travel_guardian.db) and
forces EXOTEL_DRY_RUN so no test here can ever trigger a real Exotel call
even if something regresses.
"""
import os
import tempfile
import unittest

# Force a throwaway database and dry-run mode BEFORE importing app.main,
# since Settings() and the SQLAlchemy engine are both constructed at import
# time.
_tmp_db_fd, _tmp_db_path = tempfile.mkstemp(suffix=".db")
os.close(_tmp_db_fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db_path}"
os.environ["EXOTEL_DRY_RUN"] = "true"
os.environ["SEED_RESET"] = "false"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402


class TestApiIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        try:
            os.remove(_tmp_db_path)
        except OSError:
            pass

    def test_root_endpoint_reports_online(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "online")

    def test_device_identity_cookie_is_set_and_isolates_contacts(self):
        """
        Two clients with no shared cookies must never see each other's
        contacts, proving the ?user_id= query param can no longer be used
        to read/write another user's data.
        """
        client_a = TestClient(app)
        client_b = TestClient(app)

        res_a = client_a.get("/api/assist/contacts")
        self.assertEqual(res_a.status_code, 200)
        self.assertEqual(res_a.json(), [])
        self.assertIn("tg_device_id", res_a.cookies)

        create_res = client_a.post(
            "/api/assist/contacts",
            json={"name": "Integration Test Contact", "phone": "+919000000099", "relation": "Friend", "is_enabled": True},
        )
        self.assertEqual(create_res.status_code, 201)
        contact_id = create_res.json()["id"]
        self.assertTrue(create_res.json()["is_primary"], "First contact created for a device is automatically primary")

        # Same client (same cookie jar) sees the contact it just created.
        res_a_again = client_a.get("/api/assist/contacts")
        self.assertEqual(len(res_a_again.json()), 1)

        # A different client (no cookie shared) sees NOTHING, even though it
        # could previously pass ?user_id=default_user to read someone else's
        # contacts.
        res_b = client_b.get("/api/assist/contacts")
        self.assertEqual(res_b.json(), [])

        res_b_forged = client_b.get("/api/assist/contacts?user_id=default_user")
        self.assertEqual(res_b_forged.json(), [], "A forged ?user_id= query param must not grant access to another device's contacts")

        # Clean up so this test is order-independent.
        client_a.delete(f"/api/assist/contacts/{contact_id}")

    def test_exotel_dry_run_never_reports_success_over_http(self):
        client = TestClient(app)
        create_res = client.post(
            "/api/assist/contacts",
            json={"name": "Dry Run Contact", "phone": "+919000000098", "relation": "Friend", "is_enabled": True},
        )
        self.assertEqual(create_res.status_code, 201)

        sms_res = client.post("/api/emergency/sms", json={"custom_message": "integration test"})
        self.assertEqual(sms_res.status_code, 200)
        body = sms_res.json()
        self.assertFalse(body["success"], "Dry-run must never report success")
        self.assertEqual(body["status"], "dry_run")
        self.assertIsNone(body.get("sid"))

    def test_config_status_reports_dry_run_flag(self):
        client = TestClient(app)
        res = client.get("/api/emergency/config-status")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["dry_run"])

    def test_no_trusted_contact_configured_blocks_emergency_sms(self):
        client = TestClient(app)  # fresh device identity, zero contacts
        res = client.post("/api/emergency/sms", json={"custom_message": "should fail"})
        self.assertEqual(res.status_code, 400)

    def test_contact_phone_validation_rejects_invalid_number(self):
        client = TestClient(app)
        res = client.post(
            "/api/assist/contacts",
            json={"name": "Bad Number", "phone": "123", "relation": "Friend", "is_enabled": True},
        )
        self.assertEqual(res.status_code, 400)

    def test_docs_endpoint_available_by_default(self):
        # DISABLE_API_DOCS defaults to false; this documents the current
        # (open) behavior so a future change to the default is caught here.
        res = self.client.get("/docs")
        self.assertEqual(res.status_code, 200)


if __name__ == "__main__":
    unittest.main()
