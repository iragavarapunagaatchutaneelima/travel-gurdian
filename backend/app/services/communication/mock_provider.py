from typing import Any, Dict, Optional

from app.services.communication.phone_utils import mask_phone_number, normalize_phone_number
from app.services.communication.provider import EmergencyCommunicationProvider


class MockProvider(EmergencyCommunicationProvider):
    """
    Always-simulated provider for automated tests and Safety Check demo mode.
    Never makes a network call and never claims success/failure as if it were
    a real vendor -- every result is explicitly labeled "simulated" so it can
    never be mistaken for a real dispatch by the UI or a log reader.
    """

    name = "mock"

    def validate_configuration(self, require_sender: bool = False) -> tuple[bool, Optional[str]]:
        return True, None

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
            masked_target = mask_phone_number(normalize_phone_number(to_phone))
        except ValueError as ve:
            return {
                "success": False, "status": "failed", "sid": None,
                "message": "Simulated communication failed.",
                "safe_message": f"SIMULATION: Invalid recipient phone number ({ve}).",
                "error": str(ve), "provider": "mock",
            }
        return {
            "success": False, "status": "simulated", "sid": None,
            "message": "Simulated SMS: not actually sent (demo/test mode).",
            "safe_message": f"SIMULATED: Emergency SMS would be sent to {masked_target}. No real message was sent (demo mode).",
            "error": None, "provider": "mock", "dry_run": True,
        }

    def make_voice_call(self, to_phone: str, user_name: str = "Traveler") -> Dict[str, Any]:
        try:
            masked_target = mask_phone_number(normalize_phone_number(to_phone))
        except ValueError as ve:
            return {
                "success": False, "status": "failed", "sid": None,
                "message": "Simulated communication failed.",
                "safe_message": f"SIMULATION: Invalid recipient phone number ({ve}).",
                "error": str(ve), "provider": "mock",
            }
        return {
            "success": False, "status": "simulated", "sid": None,
            "message": "Simulated call: not actually placed (demo/test mode).",
            "safe_message": f"SIMULATED: Emergency call would be placed to {masked_target}. No real call was made (demo mode).",
            "error": None, "provider": "mock", "dry_run": True,
        }

    def test_authentication(self) -> Dict[str, Any]:
        return {
            "provider": "mock",
            "is_configured": True,
            "dry_run": True,
            "authenticated": False,
            "safe_message": "Mock provider active: demo/test mode, no real vendor is configured.",
        }
