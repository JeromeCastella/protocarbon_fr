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
cors_origins_raw = os.environ.get("CORS_ORIGINS", "")
frontend_url = os.environ.get("FRONTEND_URL", "")

# Build explicit origins list for credential-safe CORS
cors_origins_list = [o.strip() for o in cors_origins_raw.split(",") if o.strip() and o.strip() != "*"]
if frontend_url and frontend_url not in cors_origins_list:
    cors_origins_list.append(frontend_url)

# When credentials=True, origins must be explicit (not "*")
# If no specific origins configured, allow common dev origins
if not cors_origins_list:
    cors_origins_list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins_list,
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
