"""
Carbon Footprint Calculator - GHG Protocol
Point d'entrée principal de l'API FastAPI
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import the modular API router
from routes import api_router

app = FastAPI(title="Carbon Footprint Calculator - GHG Protocol")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
