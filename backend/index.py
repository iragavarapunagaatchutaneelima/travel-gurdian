"""
Vercel Python Functions entrypoint. Vercel's Python runtime detects and
serves an ASGI application exported as `app` from the file its build config
points at (see /vercel.json). This file adds no logic of its own -- it only
re-exports the real FastAPI app so app/main.py stays the single source of
truth, unchanged for local `uvicorn app.main:app` development.
"""
from app.main import app  # noqa: F401
