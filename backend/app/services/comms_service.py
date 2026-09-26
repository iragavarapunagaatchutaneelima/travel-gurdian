"""
Emergency communication facade.

Callers (API routes, the check-in scheduler) never talk to a vendor SDK
directly -- they call the functions in this module, which delegate to
whichever EmergencyCommunicationProvider is active. This is the
EmergencyCommunicationProvider abstraction: Twilio is the real vendor,
MockProvider is used only for the Safety Check demo mode and automated
tests, and a future provider can be added without touching any call site.
"""
from typing import Any, Dict, Optional

from app.core.config import settings
from app.services.communication.mock_provider import MockProvider
from app.services.communication.phone_utils import (
    _emergency_request_locks,
    check_and_acquire_emergency_lock,
    mask_phone_number,
    normalize_phone_number,
)
from app.services.communication.provider import EmergencyCommunicationProvider
from app.services.communication.twilio_provider import TwilioProvider

__all__ = [
    "normalize_phone_number",
    "mask_phone_number",
    "check_and_acquire_emergency_lock",
    "validate_configuration",
    "test_authentication",
    "send_emergency_sms",
    "make_emergency_call",
    "get_active_provider",
]

_twilio_provider = TwilioProvider()
_mock_provider = MockProvider()


def get_active_provider(demo_mode: bool = False) -> EmergencyCommunicationProvider:
    """
    Returns the provider that should handle this request. `demo_mode=True`
    (Safety Check demo/presentation mode) always uses the mock provider,
    regardless of Twilio configuration, so a demo can never send a real alert.
    """
    if demo_mode:
        return _mock_provider
    return _twilio_provider


def validate_configuration(require_sender: bool = False, demo_mode: bool = False) -> tuple[bool, Optional[str]]:
    return get_active_provider(demo_mode).validate_configuration(require_sender=require_sender)


def test_authentication(demo_mode: bool = False) -> Dict[str, Any]:
    return get_active_provider(demo_mode).test_authentication()


def send_emergency_sms(
    to_phone: str,
    user_name: str = "Traveler",
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_name: Optional[str] = None,
    custom_message: Optional[str] = None,
    demo_mode: bool = False,
) -> Dict[str, Any]:
    return get_active_provider(demo_mode).send_sms(
        to_phone=to_phone,
        user_name=user_name,
        latitude=latitude,
        longitude=longitude,
        location_name=location_name,
        custom_message=custom_message,
    )


def make_emergency_call(
    to_phone: str,
    user_name: str = "Traveler",
    demo_mode: bool = False,
    **_ignored_legacy_kwargs: Any,
) -> Dict[str, Any]:
    return get_active_provider(demo_mode).make_voice_call(to_phone=to_phone, user_name=user_name)
