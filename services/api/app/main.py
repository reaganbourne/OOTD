from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers import auth, health, outfits, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="OOTD API",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(outfits.router)
app.include_router(users.router)
