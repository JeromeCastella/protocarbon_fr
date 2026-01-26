"""
Configuration et connexion à la base de données
"""
import os
from pymongo import MongoClient
from passlib.context import CryptContext

# Environment variables
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "carbon_tracker")
JWT_SECRET = os.environ.get("JWT_SECRET", "carbon_tracker_secret_key_2024")
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
