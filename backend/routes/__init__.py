"""
Routes package initialization
"""
from fastapi import APIRouter

# Import all route modules
from .auth import router as auth_router

# Create main API router
api_router = APIRouter(prefix="/api")

# Include all sub-routers
api_router.include_router(auth_router)

# Export for use in main app
__all__ = ["api_router"]
