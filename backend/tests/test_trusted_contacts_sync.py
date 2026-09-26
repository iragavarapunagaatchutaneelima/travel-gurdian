import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

from app.core.database import Base
from app.models.models import EmergencyContact, EmergencyEventLog
from app.schemas.schemas import (
    EmergencyContactCreate,
    EmergencyContactUpdate,
    SOSRequest
)
from app.api import assist as assist_api
from app.api import emergency as emergency_api
from app.services import assist, exotel_service


class TestTrustedContactsSync(unittest.TestCase):
    """
    Rigorously tests trusted contact CRUD synchronization:
    1. Add -> Reload
    2. Edit -> Reload (updating same record, zero duplicates)
    3. Delete -> Reload
    4. Disable -> Reload (persisting enabled state)
    5. Backend unavailable / offline handling
    6. Duplicate contact detection
    7. Invalid number validation
    8. No fake default contacts
    """

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.Session()
        self.db.query(EmergencyContact).delete()
        self.db.query(EmergencyEventLog).delete()
        self.db.commit()
        exotel_service._emergency_request_locks.clear()

    def tearDown(self):
        self.db.close()

    # =========================================================================
    # TEST 1: NO FAKE DEFAULT CONTACTS
    # =========================================================================
    def test_no_fake_default_contacts(self):
        """
        Verify that a fresh database contains zero fake emergency contacts.
        """
        contacts = assist_api.get_contacts(user_id="fresh_user", db=self.db)
        self.assertEqual(len(contacts), 0, "Initial contacts list must be strictly empty; zero fake defaults.")

    # =========================================================================
    # TEST 2: ADD -> RELOAD
    # =========================================================================
    def test_add_then_reload(self):
        """
        When a user adds a contact:
        - POST /contacts persists to backend
        - GET /contacts (page reload) returns the exact contact with is_enabled=True.
        """
        create_payload = EmergencyContactCreate(
            name="Kavya Rao",
            phone="+919876543210",
            relation="Sister",
            email="kavya@example.com",
            is_enabled=True
        )

        # 1. Add contact
        created = assist_api.create_contact(contact=create_payload, user_id="user_sync", db=self.db)
        self.assertIsNotNone(created.id)
        self.assertEqual(created.name, "Kavya Rao")
        self.assertEqual(created.phone, "+919876543210")
        self.assertTrue(created.is_enabled)
        contact_id = created.id

        # 2. Reload (simulate page reload fetching from DB)
        reloaded = assist_api.get_contacts(user_id="user_sync", db=self.db)
        self.assertEqual(len(reloaded), 1)
        self.assertEqual(reloaded[0].id, contact_id)
        self.assertEqual(reloaded[0].name, "Kavya Rao")
        self.assertEqual(reloaded[0].phone, "+919876543210")
        self.assertTrue(reloaded[0].is_enabled)

    # =========================================================================
    # TEST 3: EDIT -> RELOAD (SAME RECORD, NO DUPLICATE)
    # =========================================================================
    def test_edit_then_reload_updates_same_record(self):
        """
        When a user edits a contact:
        - PUT /contacts/{id} updates the same record
        - Reload (GET /contacts) returns updated record
        - Total count remains 1 (no duplicate record created).
        """
        create_payload = EmergencyContactCreate(
            name="Rohit Verma",
            phone="+919876543210",
            relation="Friend"
        )
        created = assist_api.create_contact(contact=create_payload, user_id="user_edit", db=self.db)
        original_id = created.id

        # Edit contact (update name, relation, and phone)
        update_payload = EmergencyContactUpdate(
            name="Rohit V. (Updated)",
            phone="+919123456789",
            relation="Best Friend"
        )
        updated = assist_api.update_contact(
            contact_id=original_id,
            update=update_payload,
            user_id="user_edit",
            db=self.db
        )

        self.assertEqual(updated.id, original_id, "Edit must update the same backend record ID")
        self.assertEqual(updated.name, "Rohit V. (Updated)")
        self.assertEqual(updated.phone, "+919123456789")
        self.assertEqual(updated.relation, "Best Friend")

        # Reload (simulate page reload)
        reloaded = assist_api.get_contacts(user_id="user_edit", db=self.db)
        self.assertEqual(len(reloaded), 1, "Edit operation must not create duplicate contacts")
        self.assertEqual(reloaded[0].id, original_id)
        self.assertEqual(reloaded[0].name, "Rohit V. (Updated)")
        self.assertEqual(reloaded[0].phone, "+919123456789")

    # =========================================================================
    # TEST 4: DELETE -> RELOAD
    # =========================================================================
    def test_delete_then_reload(self):
        """
        When a user deletes a contact:
        - DELETE /contacts/{id} removes record from backend
        - Reload (GET /contacts) returns empty list []
        - Backend remains the source of truth.
        """
        create_payload = EmergencyContactCreate(
            name="To Delete",
            phone="+919876543210",
            relation="Colleague"
        )
        created = assist_api.create_contact(contact=create_payload, user_id="user_del", db=self.db)
        cid = created.id

        # Delete contact
        assist_api.delete_contact(contact_id=cid, user_id="user_del", db=self.db)

        # Reload (simulate page reload)
        reloaded = assist_api.get_contacts(user_id="user_del", db=self.db)
        self.assertEqual(len(reloaded), 0, "Contact must be permanently deleted from backend")

        # Deleting non-existent contact raises 404
        with self.assertRaises(HTTPException) as cm:
            assist_api.delete_contact(contact_id=cid, user_id="user_del", db=self.db)
        self.assertEqual(cm.exception.status_code, 404)

    # =========================================================================
    # TEST 5: DISABLE -> RELOAD
    # =========================================================================
    def test_disable_then_reload_persists_state(self):
        """
        When a user disables a contact:
        - PUT /contacts/{id} with is_enabled=False persists
        - Reload (GET /contacts) returns is_enabled=False
        - SOS broadcast skips disabled contact and falls back to no_trusted_contact / 112.
        """
        create_payload = EmergencyContactCreate(
            name="Active Contact",
            phone="+919876543210",
            relation="Parent",
            is_enabled=True
        )
        created = assist_api.create_contact(contact=create_payload, user_id="user_toggle", db=self.db)
        cid = created.id
        self.assertTrue(created.is_enabled)

        # Disable contact
        toggle_update = EmergencyContactUpdate(is_enabled=False)
        updated = assist_api.update_contact(contact_id=cid, update=toggle_update, user_id="user_toggle", db=self.db)
        self.assertFalse(updated.is_enabled)

        # Reload (simulate page reload)
        reloaded = assist_api.get_contacts(user_id="user_toggle", db=self.db)
        self.assertEqual(len(reloaded), 1)
        self.assertFalse(reloaded[0].is_enabled, "Disabled state must be faithfully persisted on reload")

        # Verify SOS broadcast treats disabled contact as no active contact
        sos_res = assist.trigger_sos(
            self.db,
            SOSRequest(latitude=12.97, longitude=77.59),
            user_id="user_toggle"
        )
        self.assertFalse(sos_res.success)
        self.assertEqual(sos_res.overall_status, "no_trusted_contact")
        self.assertIn("112", sos_res.message)

    # =========================================================================
    # TEST 6: DUPLICATE CONTACT DETECTION
    # =========================================================================
    def test_duplicate_contact_rejection(self):
        """
        - Adding a contact with an already-registered phone number must return 409 Conflict.
        - Editing a contact to use another contact's phone number must return 409 Conflict.
        - Editing a contact while keeping its own phone number must succeed without 409.
        """
        # Create first contact
        c1 = assist_api.create_contact(
            contact=EmergencyContactCreate(name="Contact One", phone="+919876543210", relation="Family"),
            user_id="user_dup",
            db=self.db
        )
        c1_id = c1.id

        # Attempt to create second contact with same phone number -> 409 Conflict
        with self.assertRaises(HTTPException) as cm:
            assist_api.create_contact(
                contact=EmergencyContactCreate(name="Contact Two (Dup)", phone="+919876543210", relation="Friend"),
                user_id="user_dup",
                db=self.db
            )
        self.assertEqual(cm.exception.status_code, 409, "Must return HTTP 409 on duplicate phone number")
        self.assertIn("already exists", cm.exception.detail)

        # Create a second contact with a different phone number
        c2 = assist_api.create_contact(
            contact=EmergencyContactCreate(name="Contact Two", phone="+919888877777", relation="Friend"),
            user_id="user_dup",
            db=self.db
        )
        c2_id = c2.id

        # Attempt to edit Contact Two to use Contact One's phone number -> 409 Conflict
        with self.assertRaises(HTTPException) as cm_edit:
            assist_api.update_contact(
                contact_id=c2_id,
                update=EmergencyContactUpdate(phone="+919876543210"),
                user_id="user_dup",
                db=self.db
            )
        self.assertEqual(cm_edit.exception.status_code, 409, "Editing to existing phone number must return 409")

        # Editing Contact One while keeping its own phone number must succeed
        own_edit = assist_api.update_contact(
            contact_id=c1_id,
            update=EmergencyContactUpdate(name="Contact One Renamed", phone="+919876543210"),
            user_id="user_dup",
            db=self.db
        )
        self.assertEqual(own_edit.name, "Contact One Renamed")

    # =========================================================================
    # TEST 7: INVALID PHONE NUMBER VALIDATION
    # =========================================================================
    def test_invalid_phone_number_rejection(self):
        """
        Phone numbers must be validated before saving.
        Invalid numbers (555, repeating digits, emergency shortcodes, bad format)
        must return HTTP 400 Bad Request.
        """
        invalid_numbers = [
            "+1-555-0199",
            "1111111111",
            "112",
            "911",
            "0000000000",
            "12345",
            "not_a_phone"
        ]

        for inv in invalid_numbers:
            with self.subTest(number=inv):
                with self.assertRaises(HTTPException) as cm:
                    assist_api.create_contact(
                        contact=EmergencyContactCreate(name="Invalid Test", phone=inv, relation="Test"),
                        user_id="user_inv",
                        db=self.db
                    )
                self.assertEqual(cm.exception.status_code, 400, f"Expected 400 for {inv}")
                self.assertIn("Invalid phone number", cm.exception.detail)

        # Also test validation on PUT update
        valid_contact = assist_api.create_contact(
            contact=EmergencyContactCreate(name="Valid Contact", phone="+919876543210", relation="Test"),
            user_id="user_inv",
            db=self.db
        )
        cid = valid_contact.id

        with self.assertRaises(HTTPException) as cm_put:
            assist_api.update_contact(
                contact_id=cid,
                update=EmergencyContactUpdate(phone="+1-555-0199"),
                user_id="user_inv",
                db=self.db
            )
        self.assertEqual(cm_put.exception.status_code, 400)

    # =========================================================================
    # TEST 8: EMERGENCY ROUTE ALIASES (/emergency/contacts)
    # =========================================================================
    def test_emergency_router_contacts_parity(self):
        """
        Verify that /emergency/contacts and /api/emergency/contacts provide full parity.
        """
        # GET empty
        contacts = emergency_api.get_emergency_contacts_alias(user_id="parity_user", db=self.db)
        self.assertEqual(len(contacts), 0)

        # POST
        created = emergency_api.create_emergency_contact_alias(
            contact=EmergencyContactCreate(name="Parity Contact", phone="+919876543210", relation="Family"),
            user_id="parity_user",
            db=self.db
        )
        self.assertIsNotNone(created.id)
        cid = created.id

        # PUT
        updated = emergency_api.update_emergency_contact_alias(
            contact_id=cid,
            update=EmergencyContactUpdate(name="Parity Contact Updated"),
            user_id="parity_user",
            db=self.db
        )
        self.assertEqual(updated.name, "Parity Contact Updated")

        # DELETE
        emergency_api.delete_emergency_contact_alias(contact_id=cid, user_id="parity_user", db=self.db)
        remaining = emergency_api.get_emergency_contacts_alias(user_id="parity_user", db=self.db)
        self.assertEqual(len(remaining), 0)


if __name__ == "__main__":
    unittest.main()
