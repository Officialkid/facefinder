"""
FaceFinder AI - AI-Powered Image Recognition and Sorting System
Daniel Mwalili Mutinda | SCT221-C004-0765/2022 | JKUAT
Supervisor: Dr. Judy Gateri
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging
import os

from app.routers import upload, process, results
from app.services.cleanup import start_cleanup_scheduler
from app.services.processing_queue import (
    get_worker_snapshot,
    start_processing_worker,
    stop_processing_worker,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)
RUN_EMBEDDED_WORKER = os.environ.get("IMAGE_SORTER_RUN_EMBEDDED_WORKER", "true").lower() == "true"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle events."""
    logger.info("Starting FaceFinder AI API...")
    if RUN_EMBEDDED_WORKER:
        start_processing_worker()
    # Start background cleanup task
    cleanup_task = asyncio.create_task(start_cleanup_scheduler())
    yield
    # Shutdown: cancel cleanup task
    cleanup_task.cancel()
    if RUN_EMBEDDED_WORKER:
        stop_processing_worker()
    logger.info("FaceFinder AI API shutting down.")


app = FastAPI(
    title="FaceFinder AI API",
    description="AI-Powered Image Recognition and Sorting System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3003",
        "http://127.0.0.1:3003",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(process.router, prefix="/api/process", tags=["Processing"])
app.include_router(results.router, prefix="/api/results", tags=["Results"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "system": "FaceFinder AI",
        "version": "1.0.0",
        "status": "running",
        "author": "Daniel Mwalili Mutinda",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "healthy",
        "worker": get_worker_snapshot(),
    }
