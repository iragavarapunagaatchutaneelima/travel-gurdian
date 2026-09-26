import datetime
import logging
import threading
import time
from typing import Dict, Any, List, Optional
from app.core.database import SessionLocal
from app.models import models

logger = logging.getLogger("travel_guardian.scheduler")

_scheduler_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()
_poll_interval = 5
_last_poll_at: Optional[datetime.datetime] = None
_total_evaluations = 0
_total_escalations = 0
_lock = threading.Lock()


def run_single_poll() -> List[models.SafeCheckIn]:
    """
    Executes a single synchronous poll cycle across all overdue check-ins.
    Safely opens and closes a dedicated database session.
    Can be called directly by background thread, API endpoints, or unit tests.
    """
    global _last_poll_at, _total_evaluations, _total_escalations

    # Lazy import to avoid circular dependencies
    from app.services import assist

    escalated_items: List[models.SafeCheckIn] = []
    db = SessionLocal()
    try:
        escalated_items = assist.check_pending_checkins(db)
        with _lock:
            _last_poll_at = datetime.datetime.now(datetime.timezone.utc)
            _total_evaluations += 1
            _total_escalations += len(escalated_items)
            
        if escalated_items:
            logger.warning(
                f"[SCHEDULER] Escalated {len(escalated_items)} overdue safe check-in(s) automatically."
            )
    except Exception as exc:
        logger.error(f"[SCHEDULER] Exception during check-in evaluation poll: {exc}", exc_info=True)
    finally:
        db.close()

    return escalated_items


def _worker_loop():
    """
    Daemon worker thread loop executing poll cycles periodically until stopped.
    """
    logger.info(f"[SCHEDULER] Check-in Dead-Man Switch daemon worker started (poll={_poll_interval}s).")
    while not _stop_event.is_set():
        try:
            run_single_poll()
        except Exception as exc:
            logger.error(f"[SCHEDULER] Worker loop unhandled error: {exc}", exc_info=True)

        # Wait for next poll or until stop is requested
        _stop_event.wait(timeout=_poll_interval)

    logger.info("[SCHEDULER] Check-in Dead-Man Switch daemon worker stopped cleanly.")


def start_scheduler(poll_interval_seconds: int = 5):
    """
    Starts the background scheduler thread if not already running.
    """
    global _scheduler_thread, _poll_interval

    with _lock:
        _poll_interval = max(1, poll_interval_seconds)
        if _scheduler_thread is not None and _scheduler_thread.is_alive():
            logger.info("[SCHEDULER] Scheduler is already active.")
            return

        _stop_event.clear()
        _scheduler_thread = threading.Thread(
            target=_worker_loop,
            name="SafeCheckInSchedulerThread",
            daemon=True
        )
        _scheduler_thread.start()
        logger.info(f"[SCHEDULER] Launched background thread '{_scheduler_thread.name}'.")


def stop_scheduler(timeout: float = 3.0):
    """
    Signals the scheduler thread to stop and waits for termination.
    """
    global _scheduler_thread

    with _lock:
        if _scheduler_thread is None or not _scheduler_thread.is_alive():
            return

        _stop_event.set()

    _scheduler_thread.join(timeout=timeout)
    with _lock:
        _scheduler_thread = None


def is_running() -> bool:
    """
    Returns True if the background scheduler thread is alive.
    """
    with _lock:
        return _scheduler_thread is not None and _scheduler_thread.is_alive()


def get_scheduler_status() -> Dict[str, Any]:
    """
    Returns diagnostic metrics for the check-in scheduler and count of active timers.
    """
    db = SessionLocal()
    pending_count = 0
    try:
        pending_count = db.query(models.SafeCheckIn).filter(
            models.SafeCheckIn.is_completed == False,
            models.SafeCheckIn.is_triggered == False
        ).count()
    except Exception as exc:
        logger.warning(f"Could not count active check-ins: {exc}")
    finally:
        db.close()

    with _lock:
        return {
            "is_running": _scheduler_thread is not None and _scheduler_thread.is_alive(),
            "poll_interval_seconds": _poll_interval,
            "last_poll_at": _last_poll_at,
            "total_evaluations": _total_evaluations,
            "total_escalations": _total_escalations,
            "active_pending_count": pending_count,
            "server_time": datetime.datetime.now(datetime.timezone.utc)
        }
