import base64
import json
import logging
import socket
import urllib.error
import urllib.parse
import urllib.request
import xml.sax.saxutils as saxutils
from typing import Any, Dict, Optional

from app.core.config import settings
from app.services.communication.phone_utils import (
    format_emergency_sms,
    mask_phone_number,
    normalize_phone_number,
)
from app.services.communication.provider import EmergencyCommunicationProvider

logger = logging.getLogger("travel_guardian.twilio")

TWILIO_API_BASE = "https://api.twilio.com/2010-04-01"
DEFAULT_TWILIO_TIMEOUT_SECONDS = 15

_PLACEHOLDER_INDICATORS = [
    "YOUR_", "your_", "PASTE_", "paste_", "your_twilio",
    "<TRAVEL_GUARDIAN", "your_travel_guardian", "placeholder", "xxx",
]


def _is_placeholder(value: Optional[str]) -> bool:
    return bool(value) and any(ind in str(value) for ind in _PLACEHOLDER_INDICATORS)


def _user_safe_config_message(cfg_err: Optional[str]) -> str:
    """
    validate_configuration()'s raw error text can name internal env vars
    (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN). It must never reach an end user
    verbatim. The TWILIO_PHONE_NUMBER-specific message is safe to pass
    through: it does not name the auth-token/SID variables.
    """
    if not cfg_err:
        return "Emergency communication service is not configured on the server."
    if "TWILIO_ACCOUNT_SID" in cfg_err or "TWILIO_AUTH_TOKEN" in cfg_err:
        return "Emergency communication service is not configured on the server."
    return cfg_err


def _build_dry_run_result(entity_type: str, masked_target: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    safe_payload = {k: (mask_phone_number(v) if k in ("To", "From") else v) for k, v in payload.items()}
    logger.info(f"[TWILIO DRY_RUN] {entity_type} request built and validated but NOT sent: {safe_payload}")
    return {
        "success": False,
        "status": "dry_run",
        "sid": None,
        "message": f"Twilio {entity_type} dry-run: request validated but not sent (TWILIO_DRY_RUN=true).",
        "safe_message": f"DRY RUN: Emergency {entity_type} was validated for {masked_target} but not actually sent because TWILIO_DRY_RUN is enabled on the server.",
        "error": None,
        "dry_run": True,
        "provider": "twilio",
    }


class TwilioProvider(EmergencyCommunicationProvider):
    """
    Real Twilio REST API implementation (SMS + Voice), Basic Auth
    (Account SID : Auth Token), no twilio SDK dependency required.
    """

    name = "twilio"

    def validate_configuration(self, require_sender: bool = False) -> tuple[bool, Optional[str]]:
        sid = settings.TWILIO_ACCOUNT_SID
        token = settings.TWILIO_AUTH_TOKEN
        sender = settings.TWILIO_PHONE_NUMBER

        if not sid or not token:
            missing = []
            if not sid:
                missing.append("TWILIO_ACCOUNT_SID")
            if not token:
                missing.append("TWILIO_AUTH_TOKEN")
            return False, f"Twilio credentials are not fully configured in backend environment ({', '.join(missing)} required)."

        for label, val in [("TWILIO_ACCOUNT_SID", sid), ("TWILIO_AUTH_TOKEN", token)]:
            if _is_placeholder(val):
                return False, f"Twilio configuration for {label} contains a placeholder value. Real credentials required."

        if sid and not sid.startswith("AC"):
            return False, "TWILIO_ACCOUNT_SID does not look like a valid Twilio Account SID (must start with 'AC')."

        if require_sender:
            if not sender or _is_placeholder(sender):
                return False, (
                    "TWILIO_PHONE_NUMBER (your Twilio sending number) is not configured. "
                    "It is required as the caller ID for outbound calls and as the sender "
                    "number for SMS. Buy or port a number in the Twilio Console under "
                    "Phone Numbers, then set TWILIO_PHONE_NUMBER before enabling live dispatch."
                )

        return True, None

    def _request(self, path: str, payload: Dict[str, Any]) -> tuple[int, Dict[str, Any], Optional[str]]:
        is_valid, cfg_err = self.validate_configuration()
        if not is_valid:
            return 0, {}, cfg_err or "Twilio credentials missing."

        sid = settings.TWILIO_ACCOUNT_SID
        url = f"{TWILIO_API_BASE}/Accounts/{sid}/{path}"

        auth_str = f"{sid}:{settings.TWILIO_AUTH_TOKEN}"
        b64_auth = base64.b64encode(auth_str.encode("utf-8")).decode("ascii")
        headers = {
            "Authorization": f"Basic {b64_auth}",
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = urllib.parse.urlencode(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=DEFAULT_TWILIO_TIMEOUT_SECONDS) as response:
                status_code = response.getcode()
                body = json.loads(response.read().decode("utf-8"))
                return status_code, body, None

        except urllib.error.HTTPError as he:
            status_code = he.code
            try:
                body = json.loads(he.read().decode("utf-8"))
            except Exception:
                body = {}
            twilio_msg = body.get("message")
            twilio_code = body.get("code")
            logger.warning(f"Twilio API returned HTTP {status_code} (code {twilio_code}) on {path}")

            if status_code == 401:
                err_msg = "Authentication failure with Twilio API. Please verify Account SID and Auth Token."
            elif twilio_code == 21608:
                err_msg = (
                    "Twilio trial account restriction: the recipient number is not "
                    "verified. Trial accounts can only send to numbers verified in the "
                    "Twilio Console under Verified Caller IDs, or you must upgrade the account."
                )
            elif twilio_code == 21211:
                err_msg = "Twilio rejected the recipient phone number as invalid."
            elif twilio_code == 21606:
                err_msg = "TWILIO_PHONE_NUMBER is not a valid, owned Twilio sending number."
            elif status_code == 400:
                err_msg = f"Twilio request rejected: {twilio_msg or 'Invalid parameters.'}"
            elif status_code == 404:
                err_msg = f"Twilio resource not found: {twilio_msg or 'Account SID not found.'}"
            elif status_code == 429:
                err_msg = "Twilio rate limit reached. Please wait before retrying."
            elif status_code >= 500:
                err_msg = f"Twilio gateway server error (HTTP {status_code}). Please retry or dial 112 directly."
            else:
                err_msg = f"Twilio HTTP {status_code}: {twilio_msg or 'Request could not be completed.'}"

            return status_code, body, err_msg

        except (urllib.error.URLError, socket.gaierror) as ue:
            reason = getattr(ue, "reason", str(ue))
            logger.error(f"Twilio network connection error on {path}: {reason}")
            return 0, {}, "Network connection error while reaching Twilio API. Check internet connectivity or dial 112 directly."

        except (TimeoutError, socket.timeout):
            logger.error(f"Twilio request timed out on {path} after {DEFAULT_TWILIO_TIMEOUT_SECONDS}s")
            return 0, {}, f"Twilio API connection timed out after {DEFAULT_TWILIO_TIMEOUT_SECONDS} seconds. Please dial 112 directly."

        except Exception as exc:
            logger.error(f"Unexpected Twilio request error: {type(exc).__name__}")
            return 0, {}, f"Unexpected communication error with Twilio: {type(exc).__name__}. Please dial 112 directly."

    def send_sms(
        self,
        to_phone: str,
        user_name: str = "Traveler",
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_name: Optional[str] = None,
        custom_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            normalized_to = normalize_phone_number(to_phone)
        except ValueError as ve:
            return {
                "success": False, "status": "failed", "sid": None,
                "message": "Emergency communication failed.",
                "safe_message": f"Emergency communication failed: Invalid recipient phone number ({ve}). Please dial 112 directly.",
                "error": str(ve), "provider": "twilio",
            }

        sms_body = format_emergency_sms(
            user_name=user_name, latitude=latitude, longitude=longitude,
            location_name=location_name, custom_message=custom_message,
        )

        masked_target = mask_phone_number(normalized_to)

        # Dry-run never requires real credentials: the whole point is to let
        # the flow be built and exercised locally before a Twilio account
        # exists. Credentials are only required once TWILIO_DRY_RUN=false.
        if settings.TWILIO_DRY_RUN:
            payload = {"From": settings.TWILIO_PHONE_NUMBER or "(TWILIO_PHONE_NUMBER not yet configured)", "To": normalized_to, "Body": sms_body}
            return _build_dry_run_result("SMS", masked_target, payload)

        is_valid, cfg_err = self.validate_configuration(require_sender=True)
        if not is_valid:
            logger.warning("Twilio SMS requested but configuration is invalid or missing.")
            return {
                "success": False, "status": "failed", "sid": None,
                "message": "Emergency communication failed.",
                "safe_message": f"Emergency communication failed: {_user_safe_config_message(cfg_err)} Please dial 112 directly.",
                "error": cfg_err, "provider": "twilio",
            }

        payload = {"From": settings.TWILIO_PHONE_NUMBER, "To": normalized_to, "Body": sms_body}
        status_code, res_dict, err_msg = self._request("Messages.json", payload)

        if status_code in (200, 201):
            sid = res_dict.get("sid")
            twilio_status = res_dict.get("status", "queued")
            if sid:
                logger.info(f"Twilio emergency SMS accepted with SID: {sid} (status: {twilio_status})")
                return {
                    "success": True, "status": "sent", "sid": sid,
                    "message": "Emergency alert SMS sent successfully.",
                    "safe_message": f"Emergency alert SMS dispatched to your trusted contact ({masked_target}).",
                    "error": None, "provider": "twilio",
                }

        return {
            "success": False, "status": "failed", "sid": None,
            "message": "Emergency communication failed.",
            "safe_message": f"Emergency communication failed: {err_msg}" if err_msg else "Emergency communication failed. Please dial 112 directly.",
            "error": err_msg, "provider": "twilio",
        }

    def make_voice_call(self, to_phone: str, user_name: str = "Traveler") -> Dict[str, Any]:
        try:
            normalized_to = normalize_phone_number(to_phone)
        except ValueError as ve:
            return {
                "success": False, "status": "failed", "sid": None,
                "message": "Emergency communication failed.",
                "safe_message": f"Emergency communication failed: Invalid recipient phone number ({ve}). Please dial 112 directly.",
                "error": str(ve), "provider": "twilio",
            }

        clean_name = saxutils.escape((user_name or "Traveler").strip() or "Traveler")
        # Inline TwiML: announces the alert without needing a hosted callback URL.
        twiml = (
            "<Response><Say voice=\"alice\">"
            f"This is an automated emergency alert from Travel Guardian. {clean_name} has triggered an "
            "emergency alert and may need assistance. Please check the emergency SMS for their live location, "
            "or contact them directly."
            "</Say></Response>"
        )

        masked_target = mask_phone_number(normalized_to)

        if settings.TWILIO_DRY_RUN:
            payload = {"From": settings.TWILIO_PHONE_NUMBER or "(TWILIO_PHONE_NUMBER not yet configured)", "To": normalized_to, "Twiml": twiml}
            return _build_dry_run_result("call", masked_target, payload)

        is_valid, cfg_err = self.validate_configuration(require_sender=True)
        if not is_valid:
            logger.warning("Twilio voice call requested but configuration is invalid or missing.")
            return {
                "success": False, "status": "failed", "sid": None,
                "message": "Emergency communication failed.",
                "safe_message": f"Emergency communication failed: {_user_safe_config_message(cfg_err)} Please dial 112 directly.",
                "error": cfg_err, "provider": "twilio",
            }

        payload = {"From": settings.TWILIO_PHONE_NUMBER, "To": normalized_to, "Twiml": twiml}
        status_code, res_dict, err_msg = self._request("Calls.json", payload)

        if status_code in (200, 201):
            sid = res_dict.get("sid")
            if sid:
                logger.info(f"Twilio voice call initiated with SID: {sid}")
                return {
                    "success": True, "status": "initiated", "sid": sid,
                    "message": "Emergency call initiated.",
                    "safe_message": f"Emergency voice call initiated to your trusted contact ({masked_target}).",
                    "error": None, "provider": "twilio",
                }

        return {
            "success": False, "status": "failed", "sid": None,
            "message": "Emergency communication failed.",
            "safe_message": f"Emergency communication failed: {err_msg}" if err_msg else "Emergency communication failed. Please dial 112 directly.",
            "error": err_msg, "provider": "twilio",
        }

    def test_authentication(self) -> Dict[str, Any]:
        is_valid, cfg_err = self.validate_configuration()
        sid = settings.TWILIO_ACCOUNT_SID or "unconfigured"

        result: Dict[str, Any] = {
            "provider": "twilio",
            "is_configured": is_valid,
            "dry_run": settings.TWILIO_DRY_RUN,
            "account_sid": sid,
            "host": "api.twilio.com",
            "account_sid_configured": bool(settings.TWILIO_ACCOUNT_SID and not _is_placeholder(settings.TWILIO_ACCOUNT_SID)),
            "auth_token_configured": bool(settings.TWILIO_AUTH_TOKEN and not _is_placeholder(settings.TWILIO_AUTH_TOKEN)),
            "sender_configured": bool(settings.TWILIO_PHONE_NUMBER),
            "sender_masked": mask_phone_number(settings.TWILIO_PHONE_NUMBER) if settings.TWILIO_PHONE_NUMBER else None,
            "authenticated": False,
            "status_code": None,
            "safe_message": cfg_err or "Checking Twilio credentials...",
        }

        if not is_valid:
            return result

        # Fetch the account resource itself as a safe, side-effect-free auth check.
        url = f"{TWILIO_API_BASE}/Accounts/{sid}.json"
        auth_str = f"{sid}:{settings.TWILIO_AUTH_TOKEN}"
        b64_auth = base64.b64encode(auth_str.encode("utf-8")).decode("ascii")
        req = urllib.request.Request(url, headers={"Authorization": f"Basic {b64_auth}", "Accept": "application/json"}, method="GET")

        try:
            with urllib.request.urlopen(req, timeout=DEFAULT_TWILIO_TIMEOUT_SECONDS) as response:
                status_code = response.getcode()
                body = json.loads(response.read().decode("utf-8"))
                result["status_code"] = status_code
                if status_code in (200, 201):
                    result["authenticated"] = True
                    result["safe_message"] = "Authentication successful with Twilio."
                    result["account_status"] = body.get("status")
        except urllib.error.HTTPError as he:
            result["status_code"] = he.code
            result["safe_message"] = "Authentication failed (HTTP %d)." % he.code
            result["error"] = "Twilio authentication check failed."
        except Exception as exc:
            result["safe_message"] = f"Could not reach Twilio: {type(exc).__name__}."
            result["error"] = type(exc).__name__

        return result
