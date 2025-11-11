"""Main FastAPI application."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ada.config import get_settings
from ada.database.clients import close_all_databases, init_all_databases

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    await init_all_databases()
    yield
    # Shutdown
    await close_all_databases()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "operational",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# API routers
from ada.api import seal

app.include_router(seal.router, prefix="/api/v1/seal", tags=["SEAL"])

# TODO: Add API routers for tenants, fleets, users, cloning operations
# from ada.api import tenants, fleets, users, cloning
# app.include_router(tenants.router, prefix="/api/v1/tenants", tags=["tenants"])
# app.include_router(fleets.router, prefix="/api/v1/fleets", tags=["fleets"])
# app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
# app.include_router(cloning.router, prefix="/api/v1/cloning", tags=["cloning"])
