import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import auth, boards, health, notifications, outfits, users
from app.services.storage import LOCAL_UPLOADS_DIR

logger = logging.getLogger("ootd.api")

SLOW_REQUEST_MS = 500


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="OOTD API",
    version="0.1.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def log_request_duration(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    log = logger.warning if duration_ms > SLOW_REQUEST_MS else logger.info
    log(
        "%s %s %d %.0fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(outfits.router)
app.include_router(users.router)
app.include_router(boards.router)
app.include_router(notifications.router)

# Dev-mode local file storage — only mounted when S3 is not configured.
# In production S3_BUCKET is set so this block is skipped.
if not settings.s3_bucket:
    LOCAL_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(LOCAL_UPLOADS_DIR)), name="uploads")
