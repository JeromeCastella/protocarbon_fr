"""
Configuration et connexion à la base de données
"""
import os
from pathlib import Path
from pymongo import MongoClient
from passlib.context import CryptContext
from dotenv import load_dotenv

# Load .env file for local development (Emergent injects env vars in production)
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

# Environment variables
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "carbon_tracker")
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable is required")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

# MongoDB connection
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Collections
users_collection = db["users"]
companies_collection = db["companies"]
activities_collection = db["activities"]
products_collection = db["products"]
emission_factors_collection = db["emission_factors"]
categories_collection = db["categories"]
fiscal_years_collection = db["fiscal_years"]
subcategories_collection = db["subcategories"]
unit_conversions_collection = db["unit_conversions"]
carbon_objectives_collection = db["carbon_objectives"]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
