from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, boards, health, outfits, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="OOTD API",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow requests from the frontend dev server and any configured origin.
# In production set ALLOWED_ORIGINS to your real domain.
_origins = settings.allowed_origins if settings.allowed_origins else [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(outfits.router)
app.include_router(users.router)
app.include_router(boards.router)
