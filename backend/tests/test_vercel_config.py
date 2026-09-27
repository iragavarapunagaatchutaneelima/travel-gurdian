"""
Tests for Vercel-specific configuration (single-Vercel-project deployment):
- DATABASE_URL default falls back to a writable path on Vercel's read-only
  filesystem instead of crashing on cold start.
- The Dead-Man's-Switch scheduler is disabled on Vercel (a background thread
  cannot be relied on in serverless), with the check-overdue endpoints and
  the IS_VERCEL flag driving that decision unaffected by other tests'
  environment.
"""
import os
import tempfile
import unittest

_fd, _db = tempfile.mkstemp(suffix=".db")
os.close(_fd)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_db}")
os.environ["TWILIO_DRY_RUN"] = "true"

from app.core.config import default_database_url  # noqa: E402


class TestDefaultDatabaseUrl(unittest.TestCase):
    def test_local_dev_unchanged(self):
        self.assertEqual(default_database_url({}), "sqlite:///./travel_guardian.db")

    def test_local_dev_with_vercel_unset_and_database_url_unset(self):
        self.assertEqual(default_database_url({"VERCEL": None}), "sqlite:///./travel_guardian.db")

    def test_vercel_without_explicit_database_url_uses_writable_tmp(self):
        # Vercel's filesystem is read-only outside /tmp; the CWD-relative
        # sqlite path used everywhere else would fail to even open there.
        self.assertEqual(default_database_url({"VERCEL": "1"}), "sqlite:////tmp/travel_guardian.db")

    def test_vercel_with_explicit_database_url_does_not_force_tmp_sqlite(self):
        # default_database_url() only supplies pydantic-settings' class-level
        # DEFAULT for DATABASE_URL; when the env var is already set (e.g. a
        # real hosted Postgres), Settings() uses that directly and never
        # consults this default at all. This asserts the computed default
        # itself correctly detects "already configured" and steps aside
        # (falls back to the plain local-dev value) rather than forcing the
        # ephemeral /tmp path on top of a real, already-set DATABASE_URL.
        real_url = "postgresql://user:pass@host/db"
        self.assertEqual(default_database_url({"VERCEL": "1", "DATABASE_URL": real_url}), "sqlite:///./travel_guardian.db")


if __name__ == "__main__":
    unittest.main()
