from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from pymongo import MongoClient
from bson import ObjectId
import os
import csv
import io
import json

app = FastAPI(title="Carbon Footprint Calculator - GHG Protocol")

# Create API router with /api prefix
api_router = APIRouter(prefix="/api")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Config
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "carbon_tracker")
JWT_SECRET = os.environ.get("JWT_SECRET", "carbon_tracker_secret_key_2024")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

# MongoDB
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Collections
users_collection = db["users"]
companies_collection = db["companies"]
activities_collection = db["activities"]
products_collection = db["products"]
emission_factors_collection = db["emission_factors"]
categories_collection = db["categories"]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ==================== PYDANTIC MODELS ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    language: str = "fr"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    language: str
    company_id: Optional[str] = None
    created_at: str

class CompanyCreate(BaseModel):
    name: str
    location: str
    sector: str
    reference_year: int
    employees: int
    surface_area: float
    revenue: float
    consolidation_approach: str
    excluded_categories: List[str] = []

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    sector: Optional[str] = None
    reference_year: Optional[int] = None
    employees: Optional[int] = None
    surface_area: Optional[float] = None
    revenue: Optional[float] = None
    consolidation_approach: Optional[str] = None
    excluded_categories: Optional[List[str]] = None

class ActivityCreate(BaseModel):
    category_id: str
    scope: str
    name: str
    description: Optional[str] = None
    quantity: float
    unit: str
    emission_factor_id: Optional[str] = None
    manual_emission_factor: Optional[float] = None
    date: Optional[str] = None
    source: Optional[str] = None
    comments: Optional[str] = None

class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    emission_factor_id: Optional[str] = None
    manual_emission_factor: Optional[float] = None
    date: Optional[str] = None
    source: Optional[str] = None
    comments: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    manufacturing_emissions: float = 0
    usage_emissions: float = 0
    disposal_emissions: float = 0
    unit: str = "unit"

class ProductSale(BaseModel):
    product_id: str
    quantity: int
    date: Optional[str] = None

class EmissionFactorCreate(BaseModel):
    name: str
    category: str
    scope: str
    value: float
    unit: str
    source: str
    tags: List[str] = []
    description: Optional[str] = None
    region: Optional[str] = None
    year: Optional[int] = None

# ==================== HELPER FUNCTIONS ====================

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(user_id: str = Depends(verify_token)):
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "language": user.get("language", "fr"),
        "company_id": user.get("company_id"),
        "created_at": user.get("created_at", "")
    }

def serialize_doc(doc):
    """Serialize MongoDB document to JSON-safe dict"""
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result

# ==================== AUTH ENDPOINTS ====================

@app.post("/auth/register")
async def register(user: UserRegister):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = pwd_context.hash(user.password)
    user_doc = {
        "email": user.email,
        "password": hashed_password,
        "name": user.name,
        "language": user.language,
        "company_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = users_collection.insert_one(user_doc)
    
    token = create_access_token({"sub": str(result.inserted_id)})
    return {
        "token": token,
        "user": {
            "id": str(result.inserted_id),
            "email": user.email,
            "name": user.name,
            "language": user.language,
            "company_id": None
        }
    }

@app.post("/auth/login")
async def login(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": str(db_user["_id"])})
    return {
        "token": token,
        "user": {
            "id": str(db_user["_id"]),
            "email": db_user["email"],
            "name": db_user["name"],
            "language": db_user.get("language", "fr"),
            "company_id": db_user.get("company_id")
        }
    }

@app.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.put("/auth/language")
async def update_language(language: dict, current_user: dict = Depends(get_current_user)):
    users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"language": language.get("language", "fr")}}
    )
    return {"message": "Language updated"}

# ==================== COMPANY ENDPOINTS ====================

@app.post("/companies")
async def create_company(company: CompanyCreate, current_user: dict = Depends(get_current_user)):
    company_doc = {
        "tenant_id": current_user["id"],
        "name": company.name,
        "location": company.location,
        "sector": company.sector,
        "reference_year": company.reference_year,
        "employees": company.employees,
        "surface_area": company.surface_area,
        "revenue": company.revenue,
        "consolidation_approach": company.consolidation_approach,
        "excluded_categories": company.excluded_categories,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = companies_collection.insert_one(company_doc)
    
    # Update user with company_id
    users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"company_id": str(result.inserted_id)}}
    )
    
    company_doc["id"] = str(result.inserted_id)
    company_doc.pop("_id", None)
    return company_doc

@app.get("/companies")
async def get_company(current_user: dict = Depends(get_current_user)):
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    if not company:
        return None
    return serialize_doc(company)

@app.put("/companies/{company_id}")
async def update_company(company_id: str, company: CompanyUpdate, current_user: dict = Depends(get_current_user)):
    existing = companies_collection.find_one({"_id": ObjectId(company_id), "tenant_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Company not found")
    
    update_data = {k: v for k, v in company.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    companies_collection.update_one({"_id": ObjectId(company_id)}, {"$set": update_data})
    updated = companies_collection.find_one({"_id": ObjectId(company_id)})
    return serialize_doc(updated)

# ==================== CATEGORIES ENDPOINTS ====================

@app.get("/categories")
async def get_categories():
    """Get all emission categories organized by scope"""
    categories = list(categories_collection.find({}))
    if not categories:
        # Seed default categories
        default_categories = get_default_categories()
        categories_collection.insert_many(default_categories)
        categories = list(categories_collection.find({}))
    return [serialize_doc(c) for c in categories]

@app.get("/subcategories")
async def get_subcategories(category: Optional[str] = None):
    """Get subcategories, optionally filtered by parent category"""
    query = {}
    if category:
        query["parent_category"] = category
    subcategories = list(db.subcategories.find(query).sort("order", 1))
    return [serialize_doc(s) for s in subcategories]

@app.get("/emission-factors/search")
async def search_emission_factors(
    subcategory: Optional[str] = None,
    unit: Optional[str] = None,
    search: Optional[str] = None,
    category: Optional[str] = None
):
    """Search emission factors with filters"""
    query = {}
    
    if subcategory:
        query["subcategory"] = subcategory
    
    if category:
        query["impacts.category"] = category
    
    if unit:
        query["input_units"] = unit
    
    factors = list(emission_factors_collection.find(query))
    
    # Filter by search term (name + tags)
    if search:
        search_lower = search.lower()
        factors = [
            f for f in factors
            if search_lower in f.get("name", "").lower() 
            or any(search_lower in tag for tag in f.get("tags", []))
        ]
    
    return [serialize_doc(f) for f in factors]

def get_default_categories():
    return [
        # Scope 1 - Direct Emissions
        {"scope": "scope1", "code": "combustion_mobile", "name_fr": "Combustion mobile", "name_de": "Mobile Verbrennung", "icon": "truck", "color": "#3B82F6"},
        {"scope": "scope1", "code": "combustion_fixe", "name_fr": "Combustion fixe", "name_de": "Stationäre Verbrennung", "icon": "flame", "color": "#F97316"},
        {"scope": "scope1", "code": "emissions_procedes", "name_fr": "Émissions de procédés", "name_de": "Prozessemissionen", "icon": "factory", "color": "#64748B"},
        {"scope": "scope1", "code": "emissions_fugitives", "name_fr": "Émissions fugitives", "name_de": "Flüchtige Emissionen", "icon": "wind", "color": "#8B5CF6"},
        
        # Scope 2 - Indirect Energy Emissions
        {"scope": "scope2", "code": "electricite", "name_fr": "Électricité", "name_de": "Elektrizität", "icon": "zap", "color": "#EAB308"},
        {"scope": "scope2", "code": "chaleur_vapeur", "name_fr": "Chaleur et vapeur", "name_de": "Wärme und Dampf", "icon": "thermometer", "color": "#EF4444"},
        {"scope": "scope2", "code": "refroidissement", "name_fr": "Refroidissement", "name_de": "Kühlung", "icon": "snowflake", "color": "#06B6D4"},
        
        # Scope 3 Amont - Upstream
        {"scope": "scope3_amont", "code": "biens_services_achetes", "name_fr": "Biens et services achetés", "name_de": "Gekaufte Waren und Dienstleistungen", "icon": "shopping-cart", "color": "#8B5CF6"},
        {"scope": "scope3_amont", "code": "biens_equipement", "name_fr": "Biens d'équipement", "name_de": "Investitionsgüter", "icon": "tool", "color": "#3B82F6"},
        {"scope": "scope3_amont", "code": "activites_combustibles_energie", "name_fr": "Activités liées aux combustibles et à l'énergie", "name_de": "Brennstoff- und energiebezogene Aktivitäten", "icon": "fuel", "color": "#F97316"},
        {"scope": "scope3_amont", "code": "transport_distribution_amont", "name_fr": "Transport et distribution amont", "name_de": "Vorgelagerter Transport und Verteilung", "icon": "truck", "color": "#22C55E"},
        {"scope": "scope3_amont", "code": "dechets_operations", "name_fr": "Déchets générés par les opérations", "name_de": "Abfälle aus dem Betrieb", "icon": "trash", "color": "#EF4444"},
        {"scope": "scope3_amont", "code": "deplacements_professionnels", "name_fr": "Déplacements professionnels", "name_de": "Geschäftsreisen", "icon": "plane", "color": "#8B5CF6"},
        {"scope": "scope3_amont", "code": "deplacements_domicile_travail", "name_fr": "Déplacements pendulaires des employés", "name_de": "Pendeln der Mitarbeiter", "icon": "car", "color": "#06B6D4"},
        {"scope": "scope3_amont", "code": "actifs_loues_amont", "name_fr": "Actifs loués en amont", "name_de": "Vorgelagerte Leasinggüter", "icon": "building", "color": "#8B5CF6"},
        
        # Scope 3 Aval - Downstream
        {"scope": "scope3_aval", "code": "transport_distribution_aval", "name_fr": "Transport et distribution aval", "name_de": "Nachgelagerter Transport und Verteilung", "icon": "truck", "color": "#22C55E"},
        {"scope": "scope3_aval", "code": "transformation_produits", "name_fr": "Transformation des produits vendus", "name_de": "Verarbeitung verkaufter Produkte", "icon": "settings", "color": "#3B82F6"},
        {"scope": "scope3_aval", "code": "utilisation_produits", "name_fr": "Utilisation des produits vendus", "name_de": "Nutzung verkaufter Produkte", "icon": "power", "color": "#F97316"},
        {"scope": "scope3_aval", "code": "fin_vie_produits", "name_fr": "Traitement en fin de vie des produits vendus", "name_de": "Entsorgung verkaufter Produkte", "icon": "recycle", "color": "#22C55E"},
        {"scope": "scope3_aval", "code": "actifs_loues_aval", "name_fr": "Actifs loués en aval", "name_de": "Nachgelagerte Leasinggüter", "icon": "home", "color": "#22C55E"},
        {"scope": "scope3_aval", "code": "franchises", "name_fr": "Franchises", "name_de": "Franchise", "icon": "store", "color": "#EC4899"},
        {"scope": "scope3_aval", "code": "investissements", "name_fr": "Investissements", "name_de": "Investitionen", "icon": "trending-up", "color": "#06B6D4"},
    ]

# ==================== ACTIVITIES ENDPOINTS ====================

class ActivityCreateMultiScope(BaseModel):
    category_id: str
    subcategory_id: Optional[str] = None
    scope: str
    name: str
    description: Optional[str] = None
    quantity: float
    unit: str
    emission_factor_id: Optional[str] = None
    manual_emission_factor: Optional[float] = None
    date: Optional[str] = None
    source: Optional[str] = None
    comments: Optional[str] = None

@app.post("/activities")
async def create_activity(activity: ActivityCreateMultiScope, current_user: dict = Depends(get_current_user)):
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    if not company:
        raise HTTPException(status_code=400, detail="Please create a company first")
    
    created_activities = []
    
    if activity.emission_factor_id:
        ef = emission_factors_collection.find_one({"_id": ObjectId(activity.emission_factor_id)})
        if ef and "impacts" in ef:
            # Create an activity for each impact (multi-scope)
            for impact in ef["impacts"]:
                # Handle unit conversion if needed
                quantity = activity.quantity
                if activity.unit != ef.get("default_unit") and "unit_conversions" in ef:
                    conversion = ef["unit_conversions"].get(activity.unit)
                    if conversion:
                        quantity = activity.quantity * conversion.get("factor", 1)
                
                emissions = quantity * impact["value"]
                
                activity_doc = {
                    "tenant_id": current_user["id"],
                    "company_id": str(company["_id"]),
                    "category_id": impact["category"],
                    "subcategory_id": activity.subcategory_id,
                    "scope": impact["scope"],
                    "name": activity.name,
                    "description": activity.description,
                    "quantity": activity.quantity,
                    "original_unit": activity.unit,
                    "converted_quantity": quantity,
                    "unit": ef.get("default_unit", activity.unit),
                    "emission_factor_id": activity.emission_factor_id,
                    "emission_factor_name": ef.get("name"),
                    "emission_factor_value": impact["value"],
                    "emission_factor_unit": impact["unit"],
                    "impact_type": impact.get("type", "direct"),
                    "emissions": emissions,
                    "date": activity.date or datetime.now(timezone.utc).isoformat(),
                    "source": activity.source,
                    "comments": activity.comments,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "linked_group_id": None  # Will be set after first insert
                }
                created_activities.append(activity_doc)
            
            # Insert all and link them together
            if created_activities:
                # Insert first activity
                first_result = activities_collection.insert_one(created_activities[0])
                group_id = str(first_result.inserted_id)
                created_activities[0]["id"] = group_id
                created_activities[0]["linked_group_id"] = group_id
                activities_collection.update_one(
                    {"_id": first_result.inserted_id},
                    {"$set": {"linked_group_id": group_id}}
                )
                
                # Insert remaining activities with the same group_id
                for act in created_activities[1:]:
                    act["linked_group_id"] = group_id
                    result = activities_collection.insert_one(act)
                    act["id"] = str(result.inserted_id)
                
                return {
                    "message": f"Created {len(created_activities)} linked activities",
                    "activities": [serialize_doc(a) for a in created_activities],
                    "total_emissions": sum(a["emissions"] for a in created_activities)
                }
    
    # Fallback: manual emission factor or no factor
    emissions = 0
    if activity.manual_emission_factor:
        emissions = activity.quantity * activity.manual_emission_factor
    
    activity_doc = {
        "tenant_id": current_user["id"],
        "company_id": str(company["_id"]),
        "category_id": activity.category_id,
        "subcategory_id": activity.subcategory_id,
        "scope": activity.scope,
        "name": activity.name,
        "description": activity.description,
        "quantity": activity.quantity,
        "unit": activity.unit,
        "emission_factor_id": activity.emission_factor_id,
        "manual_emission_factor": activity.manual_emission_factor,
        "emissions": emissions,
        "date": activity.date or datetime.now(timezone.utc).isoformat(),
        "source": activity.source,
        "comments": activity.comments,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = activities_collection.insert_one(activity_doc)
    activity_doc["id"] = str(result.inserted_id)
    return serialize_doc(activity_doc)

@app.get("/activities")
async def get_activities(scope: Optional[str] = None, category_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"tenant_id": current_user["id"]}
    if scope:
        query["scope"] = scope
    if category_id:
        query["category_id"] = category_id
    
    activities = list(activities_collection.find(query))
    return [serialize_doc(a) for a in activities]

@app.put("/activities/{activity_id}")
async def update_activity(activity_id: str, activity: ActivityUpdate, current_user: dict = Depends(get_current_user)):
    existing = activities_collection.find_one({"_id": ObjectId(activity_id), "tenant_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    update_data = {k: v for k, v in activity.model_dump().items() if v is not None}
    
    # Recalculate emissions if quantity or emission factor changed
    if "quantity" in update_data or "emission_factor_id" in update_data or "manual_emission_factor" in update_data:
        quantity = update_data.get("quantity", existing["quantity"])
        ef_id = update_data.get("emission_factor_id", existing.get("emission_factor_id"))
        manual_ef = update_data.get("manual_emission_factor", existing.get("manual_emission_factor"))
        
        if ef_id:
            ef = emission_factors_collection.find_one({"_id": ObjectId(ef_id)})
            if ef:
                update_data["emissions"] = quantity * ef["value"]
        elif manual_ef:
            update_data["emissions"] = quantity * manual_ef
    
    activities_collection.update_one({"_id": ObjectId(activity_id)}, {"$set": update_data})
    updated = activities_collection.find_one({"_id": ObjectId(activity_id)})
    return serialize_doc(updated)

@app.delete("/activities/{activity_id}")
async def delete_activity(activity_id: str, current_user: dict = Depends(get_current_user)):
    result = activities_collection.delete_one({"_id": ObjectId(activity_id), "tenant_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"message": "Activity deleted"}

# ==================== PRODUCTS ENDPOINTS ====================

@app.post("/products")
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    if not company:
        raise HTTPException(status_code=400, detail="Please create a company first")
    
    total_emissions = product.manufacturing_emissions + product.usage_emissions + product.disposal_emissions
    
    product_doc = {
        "tenant_id": current_user["id"],
        "company_id": str(company["_id"]),
        "name": product.name,
        "description": product.description,
        "manufacturing_emissions": product.manufacturing_emissions,
        "usage_emissions": product.usage_emissions,
        "disposal_emissions": product.disposal_emissions,
        "total_emissions_per_unit": total_emissions,
        "unit": product.unit,
        "sales": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = products_collection.insert_one(product_doc)
    product_doc["id"] = str(result.inserted_id)
    return serialize_doc(product_doc)

@app.get("/products")
async def get_products(current_user: dict = Depends(get_current_user)):
    products = list(products_collection.find({"tenant_id": current_user["id"]}))
    return [serialize_doc(p) for p in products]

@app.post("/products/{product_id}/sales")
async def add_product_sale(product_id: str, sale: ProductSale, current_user: dict = Depends(get_current_user)):
    product = products_collection.find_one({"_id": ObjectId(product_id), "tenant_id": current_user["id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    sale_doc = {
        "quantity": sale.quantity,
        "emissions": sale.quantity * product["total_emissions_per_unit"],
        "date": sale.date or datetime.now(timezone.utc).isoformat()
    }
    
    products_collection.update_one(
        {"_id": ObjectId(product_id)},
        {"$push": {"sales": sale_doc}}
    )
    
    return {"message": "Sale recorded", "emissions": sale_doc["emissions"]}

@app.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    result = products_collection.delete_one({"_id": ObjectId(product_id), "tenant_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ==================== EMISSION FACTORS ENDPOINTS ====================

@app.get("/emission-factors")
async def get_emission_factors(category: Optional[str] = None, scope: Optional[str] = None, search: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    if scope:
        query["scope"] = scope
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search.lower()]}}
        ]
    
    factors = list(emission_factors_collection.find(query))
    if not factors and not category and not scope and not search:
        # Seed default emission factors
        default_factors = get_default_emission_factors()
        emission_factors_collection.insert_many(default_factors)
        factors = list(emission_factors_collection.find({}))
    
    return [serialize_doc(f) for f in factors]

@app.post("/emission-factors")
async def create_emission_factor(factor: EmissionFactorCreate, current_user: dict = Depends(get_current_user)):
    factor_doc = {
        "name": factor.name,
        "category": factor.category,
        "scope": factor.scope,
        "value": factor.value,
        "unit": factor.unit,
        "source": factor.source,
        "tags": [t.lower() for t in factor.tags],
        "description": factor.description,
        "region": factor.region,
        "year": factor.year,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = emission_factors_collection.insert_one(factor_doc)
    factor_doc["id"] = str(result.inserted_id)
    return serialize_doc(factor_doc)

def get_default_emission_factors():
    return [
        # Scope 1 - Combustion mobile
        {"name": "Diesel - Véhicules légers", "category": "combustion_mobile", "scope": "scope1", "value": 2.68, "unit": "kgCO2e/L", "source": "ADEME Base Carbone", "tags": ["diesel", "transport", "véhicule"], "region": "France"},
        {"name": "Essence - Véhicules légers", "category": "combustion_mobile", "scope": "scope1", "value": 2.28, "unit": "kgCO2e/L", "source": "ADEME Base Carbone", "tags": ["essence", "transport", "véhicule"], "region": "France"},
        {"name": "GPL - Véhicules", "category": "combustion_mobile", "scope": "scope1", "value": 1.66, "unit": "kgCO2e/L", "source": "ADEME Base Carbone", "tags": ["gpl", "transport"], "region": "France"},
        
        # Scope 1 - Combustion fixe
        {"name": "Gaz naturel - Chauffage", "category": "combustion_fixe", "scope": "scope1", "value": 2.04, "unit": "kgCO2e/m³", "source": "ADEME Base Carbone", "tags": ["gaz", "chauffage"], "region": "France"},
        {"name": "Fioul domestique", "category": "combustion_fixe", "scope": "scope1", "value": 3.25, "unit": "kgCO2e/L", "source": "ADEME Base Carbone", "tags": ["fioul", "chauffage"], "region": "France"},
        
        # Scope 2 - Électricité
        {"name": "Électricité - France", "category": "electricite", "scope": "scope2", "value": 0.0569, "unit": "kgCO2e/kWh", "source": "ADEME Base Carbone", "tags": ["électricité", "énergie"], "region": "France"},
        {"name": "Électricité - Allemagne", "category": "electricite", "scope": "scope2", "value": 0.485, "unit": "kgCO2e/kWh", "source": "ADEME Base Carbone", "tags": ["électricité", "énergie"], "region": "Allemagne"},
        {"name": "Électricité - Europe moyenne", "category": "electricite", "scope": "scope2", "value": 0.420, "unit": "kgCO2e/kWh", "source": "ADEME Base Carbone", "tags": ["électricité", "énergie"], "region": "Europe"},
        
        # Scope 2 - Chaleur
        {"name": "Réseau de chaleur - France", "category": "chaleur_vapeur", "scope": "scope2", "value": 0.109, "unit": "kgCO2e/kWh", "source": "ADEME Base Carbone", "tags": ["chaleur", "réseau"], "region": "France"},
        
        # Scope 3 - Transport
        {"name": "Avion court-courrier", "category": "deplacements_professionnels", "scope": "scope3_amont", "value": 0.258, "unit": "kgCO2e/km/passager", "source": "ADEME Base Carbone", "tags": ["avion", "voyage", "déplacement"], "region": "Global"},
        {"name": "Avion long-courrier", "category": "deplacements_professionnels", "scope": "scope3_amont", "value": 0.195, "unit": "kgCO2e/km/passager", "source": "ADEME Base Carbone", "tags": ["avion", "voyage", "déplacement"], "region": "Global"},
        {"name": "TGV", "category": "deplacements_professionnels", "scope": "scope3_amont", "value": 0.00173, "unit": "kgCO2e/km/passager", "source": "ADEME Base Carbone", "tags": ["train", "tgv", "déplacement"], "region": "France"},
        {"name": "Voiture - Domicile-travail", "category": "deplacements_domicile_travail", "scope": "scope3_amont", "value": 0.193, "unit": "kgCO2e/km", "source": "ADEME Base Carbone", "tags": ["voiture", "trajet", "pendulaire"], "region": "France"},
        
        # Scope 3 - Achats
        {"name": "Papier - Bureau", "category": "biens_services_achetes", "scope": "scope3_amont", "value": 0.919, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["papier", "bureau", "fournitures"], "region": "France"},
        {"name": "Ordinateur portable", "category": "biens_equipement", "scope": "scope3_amont", "value": 156, "unit": "kgCO2e/unité", "source": "ADEME Base Carbone", "tags": ["informatique", "équipement", "ordinateur"], "region": "Global"},
        {"name": "Smartphone", "category": "biens_equipement", "scope": "scope3_amont", "value": 39.1, "unit": "kgCO2e/unité", "source": "ADEME Base Carbone", "tags": ["informatique", "téléphone", "équipement"], "region": "Global"},
        
        # Scope 3 - Déchets
        {"name": "Déchets ménagers - Incinération", "category": "dechets_operations", "scope": "scope3_amont", "value": 0.51, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["déchets", "incinération"], "region": "France"},
        {"name": "Déchets ménagers - Enfouissement", "category": "dechets_operations", "scope": "scope3_amont", "value": 0.69, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["déchets", "enfouissement"], "region": "France"},
    ]

# ==================== DASHBOARD/SUMMARY ENDPOINTS ====================

@app.get("/dashboard/summary")
async def get_dashboard_summary(current_user: dict = Depends(get_current_user)):
    activities = list(activities_collection.find({"tenant_id": current_user["id"]}))
    products = list(products_collection.find({"tenant_id": current_user["id"]}))
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    
    # Get excluded categories from company settings
    excluded_categories = company.get("excluded_categories", []) if company else []
    
    # Calculate totals by scope (only for non-excluded categories)
    scope_totals = {
        "scope1": 0,
        "scope2": 0,
        "scope3_amont": 0,
        "scope3_aval": 0
    }
    
    scope_categories = {
        "scope1": set(),
        "scope2": set(),
        "scope3_amont": set(),
        "scope3_aval": set()
    }
    
    for activity in activities:
        # Skip activities in excluded categories
        if activity.get("category_id") in excluded_categories:
            continue
        scope = activity.get("scope", "scope1")
        emissions = activity.get("emissions", 0)
        scope_totals[scope] = scope_totals.get(scope, 0) + emissions
        scope_categories[scope].add(activity.get("category_id", ""))
    
    # Add product emissions to scope3_aval
    for product in products:
        for sale in product.get("sales", []):
            scope_totals["scope3_aval"] += sale.get("emissions", 0)
    
    total_emissions = sum(scope_totals.values())
    
    # Get category counts (excluding excluded categories)
    categories = list(categories_collection.find({}))
    active_categories = [c for c in categories if c.get("code") not in excluded_categories]
    
    scope_category_counts = {
        "scope1": len([c for c in active_categories if c.get("scope") == "scope1"]),
        "scope2": len([c for c in active_categories if c.get("scope") == "scope2"]),
        "scope3_amont": len([c for c in active_categories if c.get("scope") == "scope3_amont"]),
        "scope3_aval": len([c for c in active_categories if c.get("scope") == "scope3_aval"]),
    }
    
    # Calculate completion percentage (only for active categories)
    def calc_completion(scope):
        total = scope_category_counts.get(scope, 1)
        filled = len(scope_categories.get(scope, set()))
        return int((filled / total) * 100) if total > 0 else 0
    
    return {
        "total_emissions": round(total_emissions, 2),
        "scope_emissions": {k: round(v, 2) for k, v in scope_totals.items()},
        "scope_completion": {
            "scope1": {"categories_filled": len(scope_categories["scope1"]), "total_categories": scope_category_counts["scope1"], "percentage": calc_completion("scope1")},
            "scope2": {"categories_filled": len(scope_categories["scope2"]), "total_categories": scope_category_counts["scope2"], "percentage": calc_completion("scope2")},
            "scope3_amont": {"categories_filled": len(scope_categories["scope3_amont"]), "total_categories": scope_category_counts["scope3_amont"], "percentage": calc_completion("scope3_amont")},
            "scope3_aval": {"categories_filled": len(scope_categories["scope3_aval"]), "total_categories": scope_category_counts["scope3_aval"], "percentage": calc_completion("scope3_aval")},
        },
        "activities_count": len(activities),
        "products_count": len(products),
        "excluded_categories": excluded_categories
    }

@app.get("/dashboard/category-stats")
async def get_category_stats(current_user: dict = Depends(get_current_user)):
    activities = list(activities_collection.find({"tenant_id": current_user["id"]}))
    
    # Count activities per category
    category_counts = {}
    for activity in activities:
        cat_id = activity.get("category_id", "")
        category_counts[cat_id] = category_counts.get(cat_id, 0) + 1
    
    return category_counts

# ==================== IMPORT/EXPORT ENDPOINTS ====================

@app.post("/import/csv")
async def import_csv(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    imported_count = 0
    errors = []
    
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    if not company:
        raise HTTPException(status_code=400, detail="Please create a company first")
    
    for row in reader:
        try:
            activity_doc = {
                "tenant_id": current_user["id"],
                "company_id": str(company["_id"]),
                "category_id": row.get("category_id", ""),
                "scope": row.get("scope", "scope1"),
                "name": row.get("name", ""),
                "description": row.get("description", ""),
                "quantity": float(row.get("quantity", 0)),
                "unit": row.get("unit", ""),
                "manual_emission_factor": float(row.get("emission_factor", 0)) if row.get("emission_factor") else None,
                "emissions": float(row.get("quantity", 0)) * float(row.get("emission_factor", 0)) if row.get("emission_factor") else 0,
                "date": row.get("date", datetime.now(timezone.utc).isoformat()),
                "source": row.get("source", "CSV Import"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            activities_collection.insert_one(activity_doc)
            imported_count += 1
        except Exception as e:
            errors.append(f"Row error: {str(e)}")
    
    return {"imported": imported_count, "errors": errors}

@app.get("/export/csv")
async def export_csv(current_user: dict = Depends(get_current_user)):
    activities = list(activities_collection.find({"tenant_id": current_user["id"]}))
    
    output = io.StringIO()
    fieldnames = ["name", "scope", "category_id", "quantity", "unit", "emissions", "date", "source", "comments"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    for activity in activities:
        writer.writerow({
            "name": activity.get("name", ""),
            "scope": activity.get("scope", ""),
            "category_id": activity.get("category_id", ""),
            "quantity": activity.get("quantity", 0),
            "unit": activity.get("unit", ""),
            "emissions": activity.get("emissions", 0),
            "date": activity.get("date", ""),
            "source": activity.get("source", ""),
            "comments": activity.get("comments", "")
        })
    
    return {"csv_content": output.getvalue(), "filename": f"carbon_data_export_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"}

@app.get("/export/json")
async def export_json(current_user: dict = Depends(get_current_user)):
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    activities = list(activities_collection.find({"tenant_id": current_user["id"]}))
    products = list(products_collection.find({"tenant_id": current_user["id"]}))
    
    export_data = {
        "company": serialize_doc(company) if company else None,
        "activities": [serialize_doc(a) for a in activities],
        "products": [serialize_doc(p) for p in products],
        "exported_at": datetime.now(timezone.utc).isoformat()
    }
    
    return export_data

@app.post("/import/json")
async def import_json(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    content = await file.read()
    data = json.loads(content.decode('utf-8'))
    
    imported = {"company": False, "activities": 0, "products": 0}
    
    # Import company
    if data.get("company"):
        company_data = data["company"]
        company_data["tenant_id"] = current_user["id"]
        company_data.pop("id", None)
        company_data["created_at"] = datetime.now(timezone.utc).isoformat()
        
        existing = companies_collection.find_one({"tenant_id": current_user["id"]})
        if existing:
            companies_collection.update_one({"_id": existing["_id"]}, {"$set": company_data})
        else:
            result = companies_collection.insert_one(company_data)
            users_collection.update_one(
                {"_id": ObjectId(current_user["id"])},
                {"$set": {"company_id": str(result.inserted_id)}}
            )
        imported["company"] = True
    
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    
    # Import activities
    for activity in data.get("activities", []):
        activity["tenant_id"] = current_user["id"]
        activity["company_id"] = str(company["_id"]) if company else None
        activity.pop("id", None)
        activities_collection.insert_one(activity)
        imported["activities"] += 1
    
    # Import products
    for product in data.get("products", []):
        product["tenant_id"] = current_user["id"]
        product["company_id"] = str(company["_id"]) if company else None
        product.pop("id", None)
        products_collection.insert_one(product)
        imported["products"] += 1
    
    return imported

# ==================== HEALTH CHECK ====================

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
