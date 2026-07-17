"""
Automatic Cleanup Scheduler
Runs every 30 minutes to purge expired sessions and their temp files.
This is a core privacy mechanism ensuring no images are permanently stored.
"""

import logging
import asyncio

from app.services.session_store import get_expired_sessions, delete_session
from app.services.dataset_retrieval import cleanup_session_files

logger = logging.getLogger(__name__)

CLEANUP_INTERVAL_SECONDS = 30 * 60  # 30 minutes


async def start_cleanup_scheduler():
    """Background task: periodically clean up expired sessions."""
    logger.info("Cleanup scheduler started.")
    while True:
        try:
            await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
            await run_cleanup()
        except asyncio.CancelledError:
            logger.info("Cleanup scheduler stopped.")
            break
        except Exception as e:
            logger.error(f"Cleanup error: {e}")


async def run_cleanup():
    """Find and purge all expired sessions."""
    expired = get_expired_sessions()
    if not expired:
        logger.info("Cleanup: no expired sessions found.")
        return

    logger.info(f"Cleanup: purging {len(expired)} expired session(s).")
    for session_id in expired:
        cleanup_session_files(session_id)
        delete_session(session_id)

    logger.info("Cleanup complete.")
