from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class EmergencyCommunicationProvider(ABC):
    """
    Abstraction over the emergency SMS/voice-call vendor.

    Every implementation must return the same result shape so callers
    (API routes, the check-in scheduler, tests) never need to know which
    vendor is active:
        {success, status, sid, message, safe_message, error, dry_run?}

    "safe_message" is the ONLY field ever shown to an end user -- it must
    never leak vendor credentials, internal env var names, or user ids.
    """

    name: str = "unknown"

    @abstractmethod
    def validate_configuration(self, require_sender: bool = False) -> tuple[bool, Optional[str]]:
        """Returns (is_valid, error_description). Never exposes secret values."""
        raise NotImplementedError

    @abstractmethod
    def send_sms(
        self,
        to_phone: str,
        user_name: str = "Traveler",
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_name: Optional[str] = None,
        custom_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def make_voice_call(
        self,
        to_phone: str,
        user_name: str = "Traveler",
    ) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def test_authentication(self) -> Dict[str, Any]:
        raise NotImplementedError
