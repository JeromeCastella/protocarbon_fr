"""
Routes package initialization
"""
from fastapi import APIRouter

# Import all route modules
from .auth import router as auth_router
from .companies import router as companies_router
from .activities import router as activities_router
from .objectives import router as objectives_router
from .dashboard import router as dashboard_router
from .fiscal_years import router as fiscal_years_router
from .products import router as products_router
from .reference_data import router as reference_data_router
from .admin import router as admin_router
from .export import router as export_router
from .units import router as units_router
from .scenarios import router as scenarios_router

# Create main API router
api_router = APIRouter(prefix="/api")

# Include all sub-routers
api_router.include_router(auth_router)
api_router.include_router(companies_router)
api_router.include_router(activities_router)
api_router.include_router(objectives_router)
api_router.include_router(dashboard_router)
api_router.include_router(fiscal_years_router)
api_router.include_router(products_router)
api_router.include_router(reference_data_router)
api_router.include_router(admin_router)
api_router.include_router(export_router)
api_router.include_router(units_router)
api_router.include_router(scenarios_router)

# Export for use in main app
__all__ = ["api_router"]
