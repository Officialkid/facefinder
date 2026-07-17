"""Standalone FaceFinder AI worker process."""

from __future__ import annotations

import logging
import signal
import time

from app.services.processing_queue import start_processing_worker, stop_processing_worker

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

_running = True


def _handle_shutdown(_signum, _frame):
    global _running
    logger.info("Received shutdown signal. Stopping FaceFinder AI worker.")
    _running = False


def main() -> None:
    signal.signal(signal.SIGINT, _handle_shutdown)
    signal.signal(signal.SIGTERM, _handle_shutdown)

    logger.info("Starting standalone FaceFinder AI worker.")
    start_processing_worker()
    try:
        while _running:
            time.sleep(1)
    finally:
        stop_processing_worker()
        logger.info("Standalone FaceFinder AI worker stopped.")


if __name__ == "__main__":
    main()
