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
cors_origins_raw = os.environ.get("CORS_ORIGINS", "*")
if cors_origins_raw == "*":
    cors_origins = ["*"]
else:
    cors_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routes from modular router
app.include_router(api_router)

# Health check endpoint (outside /api prefix)
@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes probes"""
    return {"status": "healthy"}
