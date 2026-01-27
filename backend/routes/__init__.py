"""
Routes package initialization
"""
from fastapi import APIRouter

# Import all route modules
from .auth import router as auth_router
from .companies import router as companies_router
from .activities import router as activities_router
from .objectives import router as objectives_router

# Create main API router
api_router = APIRouter(prefix="/api")

# Include all sub-routers
api_router.include_router(auth_router)
api_router.include_router(companies_router)
api_router.include_router(activities_router)
api_router.include_router(objectives_router)

# Export for use in main app
__all__ = ["api_router"]
