"""
Carbon Footprint Calculator - GHG Protocol
Point d'entrée principal de l'API FastAPI
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import the modular API router
from routes import api_router

app = FastAPI(title="Carbon Footprint Calculator - GHG Protocol")

# CORS Configuration
# Note: avec allow_origins=["*"] + allow_credentials=True,
# FastAPI/Starlette reflète l'origine exacte de la requête (pas "*" littéral),
# ce qui est compatible avec les requêtes authentifiées.
cors_origins_raw = os.environ.get("CORS_ORIGINS", "*")
cors_origins_list = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]
if "*" in cors_origins_list:
    cors_origins = ["*"]
else:
    cors_origins = cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routes from modular router
app.include_router(api_router)

# Health check endpoint (outside /api prefix for direct pod access)
@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes probes - must respond instantly"""
    return {"status": "healthy"}

# Also expose under /api prefix for ingress routing
@app.get("/api/health")
async def api_health_check():
    """Health check accessible through ingress"""
    return {"status": "healthy"}
