import uuid
from fastapi import Request, Response

# Name of the cookie that carries the per-browser device identity.
DEVICE_COOKIE_NAME = "tg_device_id"
DEVICE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365  # 1 year


def get_device_id(request: Request, response: Response) -> str:
    """
    Resolves a stable per-browser/device identity from an httpOnly cookie,
    generating and setting one on first visit.

    This replaces trusting a client-supplied `?user_id=` query parameter,
    which previously let any caller read or modify any OTHER user's
    contacts, check-ins, SOS state, and emergency audit logs simply by
    changing the value in the URL.

    Travel Guardian has no login/account system, so this is intentionally a
    lightweight "device identity" rather than full authentication: it only
    guarantees that two different browsers/devices do not see or control
    each other's data by default. It does not protect against someone who
    can read the victim's own cookies (e.g. shared/compromised device),
    which is a known, documented limitation (see docs/SECURITY.md).
    """
    existing = request.cookies.get(DEVICE_COOKIE_NAME)
    if existing:
        return existing

    new_id = f"dev_{uuid.uuid4().hex}"
    response.set_cookie(
        key=DEVICE_COOKIE_NAME,
        value=new_id,
        max_age=DEVICE_COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
        secure=request.url.scheme == "https",
        path="/",
    )
    return new_id
