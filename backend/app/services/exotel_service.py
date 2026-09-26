import re
import time
import base64
import json
import logging
import socket
import urllib.request
import urllib.parse
import urllib.error
import xml.etree.ElementTree as ET
from typing import Tuple, Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger("travel_guardian.exotel")

# In-memory debounce lock to prevent duplicate emergency requests (user_id -> timestamp)
_emergency_request_locks: Dict[str, float] = {}

# Timeout for Exotel HTTP API calls in seconds
DEFAULT_EXOTEL_TIMEOUT_SECONDS: int = 15


def _get_exotel_host() -> str:
    """
    Resolves the Exotel API host domain from configuration.
    Official Singapore cluster: api.exotel.com
    Strips protocol schemes and trailing slashes if present in env vars.
    """
    subdomain = settings.EXOTEL_SUBDOMAIN or "api.exotel.com"
    subdomain = subdomain.strip()
    if subdomain.startswith("http://"):
        subdomain = subdomain[7:]
    elif subdomain.startswith("https://"):
        subdomain = subdomain[8:]
    subdomain = subdomain.rstrip("/")

    if "exotel." in subdomain:
        return subdomain
    return f"{subdomain}.exotel.com"


def validate_exotel_configuration(require_exophone: bool = False) -> Tuple[bool, Optional[str]]:
    """
    Validates that Exotel server-side credentials are configured and not placeholders.
    Returns (is_valid, error_description).
    Never exposes actual keys or tokens in returned messages.
    """
    key = settings.EXOTEL_API_KEY
    token = settings.EXOTEL_API_TOKEN
    sid = settings.EXOTEL_ACCOUNT_SID
    exophone = settings.EXOTEL_EXOPHONE

    if not key or not token or not sid:
        missing = []
        if not sid:
            missing.append("EXOTEL_ACCOUNT_SID")
        if not key:
            missing.append("EXOTEL_API_KEY")
        if not token:
            missing.append("EXOTEL_API_TOKEN")
        return False, f"Exotel credentials are not fully configured in backend environment ({', '.join(missing)} required)."

    placeholder_indicators = [
        "YOUR_", "your_", "PASTE_", "paste_", "your_exotel",
        "<TRAVEL_GUARDIAN", "your_travel_guardian", "placeholder", "xxx"
    ]
    for name, val in [("EXOTEL_API_KEY", key), ("EXOTEL_API_TOKEN", token), ("EXOTEL_ACCOUNT_SID", sid)]:
        if any(ind in str(val) for ind in placeholder_indicators):
            return False, f"Exotel configuration for {name} contains placeholder values. Real credentials required."

    if require_exophone:
        if not exophone or any(ind in str(exophone) for ind in placeholder_indicators):
            return False, "EXOTEL_EXOPHONE (Virtual Number) is required as Caller ID for outbound calls."

    return True, None


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

    # Remove duplicate plus signs
    if cleaned.count("+") > 1:
        cleaned = "+" + cleaned.replace("+", "")

    # Extract digits only for length and pattern checks
    digits_only = cleaned.replace("+", "")

    # Check minimum and maximum ITU-T E.164 length
    if len(digits_only) < 10 or len(digits_only) > 15:
        raise ValueError(f"Phone number must contain between 10 and 15 digits (got {len(digits_only)}).")

    # Reject repeating dummy numbers like 0000000000, 1111111111, etc.
    if len(set(digits_only)) == 1:
        raise ValueError("Phone number cannot consist of identical repeating digits.")

    # Reject public emergency hotline numbers as personal contact numbers
    emergency_shortcodes = {"112", "911", "100", "101", "102", "108", "999"}
    if digits_only in emergency_shortcodes:
        raise ValueError(f"{digits_only} is a national emergency service hotline and cannot be registered as a personal trusted contact.")

    # Reject fictional 555 numbers (e.g., 555-0100 through 555-0199 or starting with 555)
    if digits_only.startswith("555") or "55501" in digits_only or "155501" in digits_only:
        raise ValueError("Fictional 555 numbers are not permitted for live emergency contact dispatch.")

    # Handle numbers explicitly starting with +
    if cleaned.startswith("+"):
        if digits_only.startswith("0"):
            raise ValueError("Country code in E.164 format cannot start with 0.")
        return cleaned

    # Number without leading +:
    # 10-digit Indian mobile number starting with 6, 7, 8, 9
    if len(cleaned) == 10 and cleaned[0] in "6789":
        return f"+91{cleaned}"

    # 11-digit starting with 0 (e.g. 09876543210 in India)
    if len(cleaned) == 11 and cleaned.startswith("0") and cleaned[1] in "6789":
        return f"+91{cleaned[1:]}"

    # 12-digit starting with 91 (e.g. 919876543210 in India)
    if len(cleaned) == 12 and cleaned.startswith("91") and cleaned[2] in "6789":
        return f"+{cleaned}"

    # Valid international number entered without + (e.g. 14152223344)
    if not cleaned.startswith("0"):
        return f"+{cleaned}"

    raise ValueError("Phone number format is invalid. Please include international country code (e.g. +91 for India).")


def mask_phone_number(phone: Optional[str]) -> str:
    """
    Masks a phone number for safe display and logging (e.g. +91 98****3210).
    Never logs or exposes the full phone number unnecessarily.
    """
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
        # Fallback masking if normalization fails
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
    """
    Constructs the emergency SMS alert message following Travel Guardian Section 21 specifications:
    1. Emergency alert
    2. User needs help
    3. Current location (human-readable)
    4. Coordinates
    5. Google Maps location link
    """
    clean_name = user_name.strip() if user_name and user_name.strip() else "Traveler"

    if latitude is not None and longitude is not None:
        try:
            lat_f = float(latitude)
            lon_f = float(longitude)
            if -90.0 <= lat_f <= 90.0 and -180.0 <= lon_f <= 180.0:
                loc_display = location_name.strip() if location_name and location_name.strip() else "Current GPS Location"
                location_section = (
                    f"Current location:\n{loc_display}\n\n"
                    f"Coordinates:\n{lat_f:.6f}, {lon_f:.6f}\n\n"
                    f"Google Maps:\nhttps://www.google.com/maps?q={lat_f:.6f},{lon_f:.6f}"
                )
            else:
                location_section = "Current location is currently unavailable."
        except (ValueError, TypeError):
            location_section = "Current location is currently unavailable."
    else:
        location_section = "Current location is currently unavailable."

    body = (
        "TRAVEL GUARDIAN EMERGENCY ALERT\n\n"
        f"I need help. Alert triggered by {clean_name}.\n\n"
        f"{location_section}\n\n"
        "Please check on them or contact emergency services (112) immediately.\n\n"
        "Travel Guardian Emergency Engine"
    )

    if custom_message and custom_message.strip():
        body += f"\n\nMessage: {custom_message.strip()}"

    return body


def check_and_acquire_emergency_lock(user_id: str = "default_user", cooldown_seconds: int = 5) -> Tuple[bool, Optional[str]]:
    """
    Guards against rapid repeated emergency button clicks (debouncing/request lock).
    Returns (acquired: bool, reason: Optional[str]).
    """
    now = time.time()
    last_time = _emergency_request_locks.get(user_id, 0.0)
    elapsed = now - last_time

    if elapsed < cooldown_seconds:
        remaining = int(cooldown_seconds - elapsed) + 1
        return False, f"Emergency action was recently triggered. Please wait {remaining}s before retrying."

    _emergency_request_locks[user_id] = now
    return True, None


def _parse_exotel_response_body(body_bytes: bytes) -> Tuple[Dict[str, Any], Optional[str]]:
    """
    Robust response parser supporting both JSON and XML responses from Exotel.
    Returns (parsed_dict, error_message).
    """
    body_str = body_bytes.decode("utf-8", errors="ignore").strip()
    if not body_str:
        return {}, None

    # Try JSON parsing first
    if body_str.startswith("{") or body_str.startswith("["):
        try:
            parsed_json = json.loads(body_str)
            if isinstance(parsed_json, dict):
                return parsed_json, None
            return {"data": parsed_json}, None
        except json.JSONDecodeError:
            pass

    # Try XML parsing fallback (Exotel XML responses)
    if "<" in body_str and ">" in body_str:
        try:
            root = ET.fromstring(body_str)
            result: Dict[str, Any] = {}
            for child in root:
                # If child has nested children (like Call or SMSMessage)
                if len(child) > 0:
                    sub_dict = {}
                    for sub in child:
                        sub_dict[sub.tag] = sub.text.strip() if sub.text else ""
                    result[child.tag] = sub_dict
                else:
                    result[child.tag] = child.text.strip() if child.text else ""
            return result, None
        except Exception:
            pass

    return {"raw": body_str}, None


def _extract_sid_and_status(res_dict: Dict[str, Any], entity_type: str = "sms") -> Tuple[Optional[str], str]:
    """
    Extracts SID and status string from parsed Exotel response (SMS or Call).
    Handles nested entities (SMSMessage, Call, TwilioResponse) as well as top-level fields.
    """
    sid: Optional[str] = None
    status: str = "unknown"

    if entity_type == "sms":
        sms_obj = res_dict.get("SMSMessage") or res_dict.get("SmsMessage") or res_dict
        sid = sms_obj.get("Sid") or sms_obj.get("sid") or res_dict.get("Sid")
        raw_status = sms_obj.get("Status") or sms_obj.get("status") or "sent"
        status = str(raw_status).lower()
    else:  # call
        call_obj = res_dict.get("Call") or res_dict.get("call") or res_dict
        sid = call_obj.get("Sid") or call_obj.get("sid") or res_dict.get("Sid")
        raw_status = call_obj.get("Status") or call_obj.get("status") or "initiated"
        status = str(raw_status).lower()

    if sid and str(sid).strip():
        sid = str(sid).strip()
    else:
        sid = None

    return sid, status


def _make_exotel_request(
    endpoint: str,
    payload: Optional[Dict[str, Any]] = None,
    method: str = "POST",
    timeout: int = DEFAULT_EXOTEL_TIMEOUT_SECONDS
) -> Tuple[int, Dict[str, Any], Optional[str]]:
    """
    Executes an authenticated HTTP request to Exotel Singapore REST API.
    Uses HTTP Basic Authentication: API_KEY:API_TOKEN.
    Ensures that credentials are NEVER logged or leaked in exceptions.
    Returns (status_code, response_dict, error_message).
    """
    is_valid, cfg_err = validate_exotel_configuration()
    if not is_valid:
        return 0, {}, cfg_err or "Exotel credentials missing."

    host = _get_exotel_host()
    account_sid = settings.EXOTEL_ACCOUNT_SID
    url = f"https://{host}/v1/Accounts/{account_sid}/{endpoint.lstrip('/')}"

    # Construct Basic Auth header
    auth_str = f"{settings.EXOTEL_API_KEY}:{settings.EXOTEL_API_TOKEN}"
    b64_auth = base64.b64encode(auth_str.encode("utf-8")).decode("ascii")

    headers = {
        "Authorization": f"Basic {b64_auth}",
        "Accept": "application/json"
    }

    data: Optional[bytes] = None
    if payload is not None and method == "POST":
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        data = urllib.parse.urlencode(payload).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status_code = response.getcode()
            body_bytes = response.read()
            res_dict, _ = _parse_exotel_response_body(body_bytes)
            return status_code, res_dict, None

    except urllib.error.HTTPError as he:
        status_code = he.code
        err_body = he.read()
        err_dict, _ = _parse_exotel_response_body(err_body)

        parsed_msg = None
        rest_ex = err_dict.get("RestException") or err_dict
        if isinstance(rest_ex, dict):
            parsed_msg = rest_ex.get("Message") or rest_ex.get("message")
        elif "raw" in err_dict:
            parsed_msg = err_dict["raw"]

        # Safe logging without credentials
        logger.warning(f"Exotel API returned HTTP {status_code} on {endpoint}")

        # Precise, production-grade error categorization
        if status_code == 401:
            err_msg = "Authentication failure with Exotel API. Please verify Account SID, API Key, and API Token."
        elif status_code == 403:
            kyc_hint = ""
            if parsed_msg and "kyc" in parsed_msg.lower():
                kyc_hint = f" ({parsed_msg})"
            elif parsed_msg:
                kyc_hint = f" ({parsed_msg})"
            err_msg = f"Forbidden: Exotel account permissions restricted or trial limits active.{kyc_hint}"
        elif status_code == 400:
            err_msg = f"Exotel request rejected: {parsed_msg or 'Invalid parameters or unassigned ExoPhone.'}"
        elif status_code == 404:
            err_msg = f"Exotel resource not found: {parsed_msg or 'Endpoint or Account SID not found.'}"
        elif status_code == 429:
            err_msg = "Exotel rate limit reached. Please wait before retrying."
        elif status_code >= 500:
            err_msg = f"Exotel gateway server error (HTTP {status_code}). Please retry or use direct dial 112."
        else:
            err_msg = f"Exotel HTTP {status_code}: {parsed_msg or 'Request could not be completed.'}"

        return status_code, err_dict, err_msg

    except (urllib.error.URLError, socket.gaierror) as ue:
        reason = getattr(ue, "reason", str(ue))
        logger.error(f"Exotel network connection error on {endpoint}: {reason}")
        return 0, {}, "Network connection error while reaching Exotel API host. Check internet connectivity or dial 112 directly."

    except (TimeoutError, socket.timeout):
        logger.error(f"Exotel request timed out on {endpoint} after {timeout}s")
        return 0, {}, f"Exotel API connection timed out. Gateway did not respond within {timeout} seconds. Please dial 112 directly."

    except Exception as exc:
        logger.error(f"Unexpected Exotel request error: {type(exc).__name__}")
        return 0, {}, f"Unexpected communication error with Exotel: {type(exc).__name__}. Please dial 112 directly."


def send_emergency_sms(
    to_phone: str,
    user_name: str = "Traveler",
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_name: Optional[str] = None,
    custom_message: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sends an outbound emergency SMS to the user's stored Trusted Contact via Exotel REST API.
    Handles credential validation, phone normalization, safe logging, and strict acceptance checking.
    DOES NOT RETURN SUCCESS UNLESS EXOTEL ACCEPTS THE REQUEST (HTTP 200/201 + SID).
    """
    is_valid, cfg_err = validate_exotel_configuration()
    if not is_valid:
        logger.warning("Exotel SMS requested but configuration is invalid or missing.")
        return {
            "success": False,
            "status": "failed",
            "sid": None,
            "message": "Emergency communication failed.",
            "safe_message": "Emergency communication failed: Emergency SMS service is not configured on the server. Please dial 112 directly.",
            "error": cfg_err
        }

    try:
        normalized_to = normalize_phone_number(to_phone)
    except ValueError as ve:
        return {
            "success": False,
            "status": "failed",
            "sid": None,
            "message": "Emergency communication failed.",
            "safe_message": f"Emergency communication failed: Invalid recipient phone number ({ve}). Please dial 112 directly.",
            "error": str(ve)
        }

    sms_body = format_emergency_sms(
        user_name=user_name,
        latitude=latitude,
        longitude=longitude,
        location_name=location_name,
        custom_message=custom_message
    )

    from_sender = settings.EXOTEL_EXOPHONE or "TravelGuard"
    payload = {
        "From": from_sender,
        "To": normalized_to,
        "Body": sms_body
    }

    masked_target = mask_phone_number(normalized_to)
    status_code, res_dict, err_msg = _make_exotel_request("Sms/send.json", payload=payload, method="POST")

    if status_code in [200, 201]:
        sid, exotel_status = _extract_sid_and_status(res_dict, entity_type="sms")
        if sid:
            logger.info(f"Exotel emergency SMS accepted with SID: {sid} (status: {exotel_status})")
            return {
                "success": True,
                "status": "sent",
                "sid": sid,
                "message": "Emergency alert SMS sent successfully.",
                "safe_message": f"Emergency alert SMS dispatched to your trusted contact ({masked_target}).",
                "error": None
            }
        else:
            # 200 returned but no valid SID present
            logger.warning(f"Exotel returned HTTP {status_code} without valid SMS SID: {res_dict}")
            return {
                "success": False,
                "status": "failed",
                "sid": None,
                "message": "Emergency communication failed.",
                "safe_message": "Emergency communication failed: Exotel gateway did not confirm dispatch. Please dial 112 directly.",
                "error": "Missing SID in Exotel response"
            }

    return {
        "success": False,
        "status": "failed",
        "sid": None,
        "message": "Emergency communication failed.",
        "safe_message": f"Emergency communication failed: {err_msg}" if err_msg else "Emergency communication failed. Please dial 112 directly.",
        "error": err_msg
    }


def make_emergency_call(
    to_phone: str,
    user_name: str = "Traveler",
    from_phone: Optional[str] = None,
    app_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Initiates an outbound emergency voice call via Exotel Calls/connect API.
    Strict destination restriction: only stored trusted contact numbers are permitted.
    Canonical endpoint: POST https://api.exotel.com/v1/Accounts/<account_sid>/Calls/connect.json
    DOES NOT RETURN SUCCESS UNLESS EXOTEL ACCEPTS THE REQUEST (HTTP 200/201 + SID).
    """
    is_valid, cfg_err = validate_exotel_configuration()
    if not is_valid:
        logger.warning("Exotel voice call requested but configuration is invalid or missing.")
        return {
            "success": False,
            "status": "failed",
            "sid": None,
            "message": "Emergency communication failed.",
            "safe_message": "Emergency communication failed: Emergency voice service is not configured on the server. Please dial 112 directly.",
            "error": cfg_err
        }

    try:
        normalized_to = normalize_phone_number(to_phone)
    except ValueError as ve:
        return {
            "success": False,
            "status": "failed",
            "sid": None,
            "message": "Emergency communication failed.",
            "safe_message": f"Emergency communication failed: Invalid recipient phone number ({ve}). Please dial 112 directly.",
            "error": str(ve)
        }

    effective_app_id = app_id or settings.EXOTEL_APP_ID
    caller_id = settings.EXOTEL_EXOPHONE or ""

    if effective_app_id:
        account_sid = settings.EXOTEL_ACCOUNT_SID
        payload = {
            "From": normalized_to,
            "CallerId": caller_id,
            "Url": f"http://my.exotel.com/{account_sid}/exoml/start_voice/{effective_app_id}",
            "CallType": "trans"
        }
    else:
        # Connecting user to trusted contact: From is caller, To is contact
        first_leg = normalized_to
        second_leg = normalized_to
        if from_phone:
            try:
                first_leg = normalize_phone_number(from_phone)
                second_leg = normalized_to
            except Exception:
                pass
        elif caller_id:
            first_leg = caller_id

        payload = {
            "From": first_leg,
            "To": second_leg,
            "CallerId": caller_id,
            "CallType": "trans"
        }

    masked_target = mask_phone_number(normalized_to)
    status_code, res_dict, err_msg = _make_exotel_request("Calls/connect.json", payload=payload, method="POST")

    if status_code in [200, 201]:
        sid, exotel_status = _extract_sid_and_status(res_dict, entity_type="call")
        if sid:
            logger.info(f"Exotel voice call initiated with SID: {sid}")
            return {
                "success": True,
                "status": "initiated",
                "sid": sid,
                "message": "Emergency call initiated.",
                "safe_message": f"Emergency voice call initiated to your trusted contact ({masked_target}).",
                "error": None
            }
        else:
            logger.warning(f"Exotel returned HTTP {status_code} without valid Call SID: {res_dict}")
            return {
                "success": False,
                "status": "failed",
                "sid": None,
                "message": "Emergency communication failed.",
                "safe_message": "Emergency communication failed: Exotel gateway did not confirm call. Please dial 112 directly.",
                "error": "Missing Call SID in Exotel response"
            }

    return {
        "success": False,
        "status": "failed",
        "sid": None,
        "message": "Emergency communication failed.",
        "safe_message": f"Emergency communication failed: {err_msg}" if err_msg else "Emergency communication failed. Please dial 112 directly.",
        "error": err_msg
    }


def test_exotel_authentication() -> Dict[str, Any]:
    """
    Validates Exotel credentials and connectivity against the Singapore API host (api.exotel.com).
    Queries the official Exotel Balance API (GET /v1/Accounts/{AccountSid}/Balance.json).
    Safe diagnostic function: verifies credentials without dialing any numbers or sending SMS.
    NEVER logs or exposes API keys or tokens in return payload.
    """
    is_valid, cfg_err = validate_exotel_configuration()
    host = _get_exotel_host()
    sid = settings.EXOTEL_ACCOUNT_SID or "unconfigured"

    result: Dict[str, Any] = {
        "is_configured": is_valid,
        "account_sid": sid,
        "host": host,
        "subdomain": settings.EXOTEL_SUBDOMAIN or "api.exotel.com",
        "cluster": "Singapore (api.exotel.com)",
        "api_key_configured": bool(settings.EXOTEL_API_KEY and not settings.EXOTEL_API_KEY.startswith("<")),
        "api_token_configured": bool(settings.EXOTEL_API_TOKEN and not settings.EXOTEL_API_TOKEN.startswith("<")),
        "exophone_configured": bool(settings.EXOTEL_EXOPHONE),
        "exophone_masked": mask_phone_number(settings.EXOTEL_EXOPHONE) if settings.EXOTEL_EXOPHONE else None,
        "authenticated": False,
        "status_code": None,
        "safe_message": cfg_err or "Checking Exotel credentials..."
    }

    if not is_valid:
        return result

    status_code, res_dict, err_msg = _make_exotel_request("Balance.json", payload=None, method="GET")
    result["status_code"] = status_code

    if status_code in [200, 201]:
        result["authenticated"] = True
        result["safe_message"] = "Authentication successful with Exotel Singapore cluster (api.exotel.com)."
        balance_obj = res_dict.get("Account") or res_dict
        if isinstance(balance_obj, dict) and "Balance" in balance_obj:
            result["currency"] = balance_obj.get("Currency", "INR")
    else:
        result["authenticated"] = False
        result["safe_message"] = err_msg or f"Exotel authentication failed (HTTP {status_code})."
        result["error"] = err_msg

    return result
