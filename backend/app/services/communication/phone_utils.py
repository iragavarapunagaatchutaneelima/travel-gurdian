import re
import time
from typing import Dict, Optional, Tuple

# In-memory debounce lock to prevent duplicate emergency requests (user_id -> timestamp)
_emergency_request_locks: Dict[str, float] = {}


def normalize_phone_number(phone: str) -> str:
    """
    Normalizes and validates phone numbers according to E.164.
    Preserves leading '+' and digits.
    Converts 10-digit Indian numbers starting with 6-9 to +91... format.
    Rejects clearly invalid, mock (e.g. 555 exchange), or emergency dispatch numbers.
    Does NOT silently corrupt invalid numbers.
    Raises ValueError on invalid formats.
    """
    if not phone or not isinstance(phone, str):
        raise ValueError("Phone number is required.")

    stripped = phone.strip()
    cleaned = re.sub(r"[^\d+]", "", stripped)
    if not cleaned:
        raise ValueError("Phone number contains no valid digits.")

    if cleaned.count("+") > 1:
        cleaned = "+" + cleaned.replace("+", "")

    digits_only = cleaned.replace("+", "")

    if len(digits_only) < 10 or len(digits_only) > 15:
        raise ValueError(f"Phone number must contain between 10 and 15 digits (got {len(digits_only)}).")

    if len(set(digits_only)) == 1:
        raise ValueError("Phone number cannot consist of identical repeating digits.")

    emergency_shortcodes = {"112", "911", "100", "101", "102", "108", "999"}
    if digits_only in emergency_shortcodes:
        raise ValueError(f"{digits_only} is a national emergency service hotline and cannot be registered as a personal trusted contact.")

    if digits_only.startswith("555") or "55501" in digits_only or "155501" in digits_only:
        raise ValueError("Fictional 555 numbers are not permitted for live emergency contact dispatch.")

    if cleaned.startswith("+"):
        if digits_only.startswith("0"):
            raise ValueError("Country code in E.164 format cannot start with 0.")
        return cleaned

    if len(cleaned) == 10 and cleaned[0] in "6789":
        return f"+91{cleaned}"

    if len(cleaned) == 11 and cleaned.startswith("0") and cleaned[1] in "6789":
        return f"+91{cleaned[1:]}"

    if len(cleaned) == 12 and cleaned.startswith("91") and cleaned[2] in "6789":
        return f"+{cleaned}"

    if not cleaned.startswith("0"):
        return f"+{cleaned}"

    raise ValueError("Phone number format is invalid. Please include international country code (e.g. +91 for India).")


def mask_phone_number(phone: Optional[str]) -> str:
    """Masks a phone number for safe display and logging (e.g. +91 98****3210)."""
    if not phone:
        return "****"
    try:
        norm = normalize_phone_number(phone)
        if len(norm) > 8:
            prefix = norm[:5]
            suffix = norm[-3:]
            masked_middle = "*" * (len(norm) - 8)
            return f"{prefix}{masked_middle}{suffix}"
        elif len(norm) > 4:
            return norm[:3] + ("*" * (len(norm) - 3))
        return "****"
    except Exception:
        stripped = re.sub(r"[^\d+]", "", str(phone))
        if len(stripped) > 6:
            return stripped[:3] + ("*" * (len(stripped) - 5)) + stripped[-2:]
        return "****"


def format_emergency_sms(
    user_name: str = "Traveler",
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_name: Optional[str] = None,
    custom_message: Optional[str] = None
) -> str:
    """Constructs the emergency SMS alert body: alert, location, coordinates, maps link."""
    clean_name = user_name.strip() if user_name and user_name.strip() else "Traveler"

    if latitude is not None and longitude is not None:
        try:
            lat_f = float(latitude)
            lon_f = float(longitude)
            if -90.0 <= lat_f <= 90.0 and -180.0 <= lon_f <= 180.0:
                location_section = f"Location: https://www.google.com/maps?q={lat_f:.5f},{lon_f:.5f}"
            else:
                location_section = "Location: unavailable"
        except (ValueError, TypeError):
            location_section = "Location: unavailable"
    else:
        location_section = "Location: unavailable"

    # Short and direct, as a real emergency text should be -- not a long
    # formatted report. Guardians need three things fast: that it's real,
    # who it's from, and where.
    body = f"EMERGENCY! Please help. {clean_name} needs help.\n{location_section}"

    if custom_message and custom_message.strip():
        body += f"\n{custom_message.strip()}"

    return body


def check_and_acquire_emergency_lock(user_id: str = "default_user", cooldown_seconds: int = 5) -> Tuple[bool, Optional[str]]:
    """Guards against rapid repeated emergency button clicks (debouncing/request lock)."""
    now = time.time()
    last_time = _emergency_request_locks.get(user_id, 0.0)
    elapsed = now - last_time

    if elapsed < cooldown_seconds:
        remaining = int(cooldown_seconds - elapsed) + 1
        return False, f"Emergency action was recently triggered. Please wait {remaining}s before retrying."

    _emergency_request_locks[user_id] = now
    return True, None
