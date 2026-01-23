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
fiscal_years_collection = db["fiscal_years"]

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
    entity_type: str = "private_company"  # private_company, public_admin, association, foundation, other
    employees: int
    surface_area: float
    revenue: Optional[float] = None  # Only for private companies
    consolidation_approach: Optional[str] = None  # Only for private companies
    excluded_categories: List[str] = []
    fiscal_year_start_month: int = 1  # Janvier par défaut

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    sector: Optional[str] = None
    entity_type: Optional[str] = None
    employees: Optional[int] = None
    surface_area: Optional[float] = None
    revenue: Optional[float] = None
    consolidation_approach: Optional[str] = None
    excluded_categories: Optional[List[str]] = None
    fiscal_year_start_month: Optional[int] = None

# ==================== FISCAL YEAR MODELS ====================

class FiscalYearCreate(BaseModel):
    name: str  # Ex: "Exercice 2024"
    start_date: str  # ISO format: "2024-04-01"
    end_date: str  # ISO format: "2025-03-31"

class FiscalYearClose(BaseModel):
    pass  # Pas de paramètres, juste confirmation

class FiscalYearRectify(BaseModel):
    reason: str  # Justification obligatoire

class FiscalYearDuplicate(BaseModel):
    new_name: str
    new_start_date: str
    new_end_date: str
    duplicate_activities: bool = False  # Si True, copie les activités
    activity_ids_to_duplicate: List[str] = []  # IDs spécifiques à copier (si duplicate_activities=False)

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
    fiscal_year_id: Optional[str] = None  # Link to fiscal year
    subcategory_id: Optional[str] = None

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
    fiscal_year_id: Optional[str] = None

# ==================== PRODUCT MODELS (Enhanced) ====================

class MaterialComposition(BaseModel):
    """Composition d'une matière dans le produit"""
    material_name: str  # Nom de la matière
    emission_factor_id: Optional[str] = None  # Référence au facteur d'émission pour la matière
    weight_kg: float  # Poids en kg
    treatment_type: str  # recyclage, incineration, enfouissement
    treatment_emission_factor_id: Optional[str] = None  # Facteur pour le traitement fin de vie
    recyclability_percent: float = 0  # % recyclabilité

class TransformationEnergy(BaseModel):
    """Énergie nécessaire à la transformation (si semi-fini)"""
    electricity_kwh: float = 0  # Électricité par unité
    electricity_factor_id: Optional[str] = None
    fuel_kwh: float = 0  # Combustible (gaz, fioul) par unité
    fuel_factor_id: Optional[str] = None
    region: str = "France"  # Pour le facteur d'émission électricité

class UsageEnergy(BaseModel):
    """Consommation par cycle d'utilisation"""
    electricity_kwh_per_cycle: float = 0
    electricity_factor_id: Optional[str] = None
    fuel_kwh_per_cycle: float = 0  # Combustible (gaz naturel, fioul)
    fuel_factor_id: Optional[str] = None
    carburant_l_per_cycle: float = 0  # Carburant (essence, diesel)
    carburant_factor_id: Optional[str] = None
    refrigerant_kg_per_cycle: float = 0  # Réfrigérants (fuites)
    refrigerant_factor_id: Optional[str] = None
    cycles_per_year: int = 1  # Nombre de cycles par an

class ProductCreateEnhanced(BaseModel):
    """Modèle enrichi pour la création de produit"""
    # Infos générales
    name: str
    description: Optional[str] = None
    product_type: str = "finished"  # "finished" ou "semi_finished"
    unit: str = "unit"
    lifespan_years: float = 1  # Durée de vie en années
    
    # Composition matières (pour fin de vie)
    materials: List[MaterialComposition] = []
    
    # Transformation (si semi-fini)
    transformation: Optional[TransformationEnergy] = None
    
    # Utilisation
    usage: Optional[UsageEnergy] = None

class ProductSale(BaseModel):
    product_id: str
    quantity: int
    year: Optional[int] = None  # Année de référence pour le bilan
    date: Optional[str] = None

class ProductSaleFromCategory(BaseModel):
    """Pour saisie depuis les catégories Scope 3 Aval"""
    product_id: str
    quantity: int
    year: Optional[int] = None

# Legacy model for backward compatibility
class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    manufacturing_emissions: float = 0
    usage_emissions: float = 0
    disposal_emissions: float = 0
    unit: str = "unit"

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

@api_router.post("/auth/register")
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

@api_router.post("/auth/login")
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

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.put("/auth/language")
async def update_language(language: dict, current_user: dict = Depends(get_current_user)):
    users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"language": language.get("language", "fr")}}
    )
    return {"message": "Language updated"}

# ==================== COMPANY ENDPOINTS ====================

@api_router.post("/companies")
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

@api_router.get("/companies")
async def get_company(current_user: dict = Depends(get_current_user)):
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    if not company:
        return None
    return serialize_doc(company)

@api_router.put("/companies/{company_id}")
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

@api_router.get("/categories")
async def get_categories():
    """Get all emission categories organized by scope"""
    categories = list(categories_collection.find({}))
    if not categories:
        # Seed default categories
        default_categories = get_default_categories()
        categories_collection.insert_many(default_categories)
        categories = list(categories_collection.find({}))
    return [serialize_doc(c) for c in categories]

@api_router.get("/subcategories")
async def get_subcategories(category: Optional[str] = None):
    """Get subcategories, optionally filtered by parent category"""
    query = {}
    if category:
        query["parent_category"] = category
    subcategories = list(db.subcategories.find(query).sort("order", 1))
    return [serialize_doc(s) for s in subcategories]

@api_router.get("/emission-factors/search")
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

@api_router.post("/activities")
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

@api_router.get("/activities")
async def get_activities(scope: Optional[str] = None, category_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"tenant_id": current_user["id"]}
    if scope:
        query["scope"] = scope
    if category_id:
        query["category_id"] = category_id
    
    activities = list(activities_collection.find(query))
    return [serialize_doc(a) for a in activities]

@api_router.put("/activities/{activity_id}")
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

@api_router.delete("/activities/{activity_id}")
async def delete_activity(activity_id: str, current_user: dict = Depends(get_current_user)):
    result = activities_collection.delete_one({"_id": ObjectId(activity_id), "tenant_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"message": "Activity deleted"}

# ==================== PRODUCTS ENDPOINTS (Enhanced) ====================

def calculate_product_emissions(product_doc: dict) -> dict:
    """Calculate emissions breakdown for a product"""
    transformation_emissions = 0
    usage_emissions = 0
    disposal_emissions = 0
    
    # Transformation emissions (if semi-finished)
    if product_doc.get("product_type") == "semi_finished" and product_doc.get("transformation"):
        transfo = product_doc["transformation"]
        # Electricity
        elec_factor = 0.0569  # Default France
        if transfo.get("electricity_factor_id"):
            ef = emission_factors_collection.find_one({"_id": ObjectId(transfo["electricity_factor_id"])})
            if ef:
                elec_factor = ef.get("value", 0.0569)
        transformation_emissions += transfo.get("electricity_kwh", 0) * elec_factor
        
        # Fuel (combustible)
        fuel_factor = 0.205  # Default gaz naturel kWh
        if transfo.get("fuel_factor_id"):
            ef = emission_factors_collection.find_one({"_id": ObjectId(transfo["fuel_factor_id"])})
            if ef:
                fuel_factor = ef.get("value", 0.205)
        transformation_emissions += transfo.get("fuel_kwh", 0) * fuel_factor
    
    # Usage emissions
    if product_doc.get("usage"):
        usage = product_doc["usage"]
        lifespan = product_doc.get("lifespan_years", 1)
        cycles_per_year = usage.get("cycles_per_year", 1)
        total_cycles = lifespan * cycles_per_year
        
        # Electricity per cycle
        elec_factor = 0.0569
        if usage.get("electricity_factor_id"):
            ef = emission_factors_collection.find_one({"_id": ObjectId(usage["electricity_factor_id"])})
            if ef:
                elec_factor = ef.get("value", 0.0569)
        usage_emissions += usage.get("electricity_kwh_per_cycle", 0) * elec_factor * total_cycles
        
        # Fuel (combustible) per cycle
        fuel_factor = 0.205
        if usage.get("fuel_factor_id"):
            ef = emission_factors_collection.find_one({"_id": ObjectId(usage["fuel_factor_id"])})
            if ef:
                fuel_factor = ef.get("value", 0.205)
        usage_emissions += usage.get("fuel_kwh_per_cycle", 0) * fuel_factor * total_cycles
        
        # Carburant per cycle
        carbu_factor = 2.68  # Default diesel
        if usage.get("carburant_factor_id"):
            ef = emission_factors_collection.find_one({"_id": ObjectId(usage["carburant_factor_id"])})
            if ef:
                carbu_factor = ef.get("value", 2.68)
        usage_emissions += usage.get("carburant_l_per_cycle", 0) * carbu_factor * total_cycles
        
        # Refrigerants per cycle
        refrig_factor = 1430  # Default R-134a
        if usage.get("refrigerant_factor_id"):
            ef = emission_factors_collection.find_one({"_id": ObjectId(usage["refrigerant_factor_id"])})
            if ef:
                refrig_factor = ef.get("value", 1430)
        usage_emissions += usage.get("refrigerant_kg_per_cycle", 0) * refrig_factor * total_cycles
    
    # Disposal emissions (end of life)
    if product_doc.get("materials"):
        for material in product_doc["materials"]:
            weight = material.get("weight_kg", 0)
            treatment_factor = 0.51  # Default incineration
            if material.get("treatment_emission_factor_id"):
                ef = emission_factors_collection.find_one({"_id": ObjectId(material["treatment_emission_factor_id"])})
                if ef:
                    treatment_factor = ef.get("value", 0.51)
            disposal_emissions += weight * treatment_factor
    
    return {
        "transformation_emissions": round(transformation_emissions, 4),
        "usage_emissions": round(usage_emissions, 4),
        "disposal_emissions": round(disposal_emissions, 4),
        "total_emissions_per_unit": round(transformation_emissions + usage_emissions + disposal_emissions, 4)
    }

@api_router.post("/products/enhanced")
async def create_product_enhanced(product: ProductCreateEnhanced, current_user: dict = Depends(get_current_user)):
    """Create a product with full lifecycle emissions calculation"""
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    if not company:
        raise HTTPException(status_code=400, detail="Please create a company first")
    
    product_doc = {
        "tenant_id": current_user["id"],
        "company_id": str(company["_id"]),
        "name": product.name,
        "description": product.description,
        "product_type": product.product_type,
        "unit": product.unit,
        "lifespan_years": product.lifespan_years,
        "materials": [m.model_dump() for m in product.materials],
        "transformation": product.transformation.model_dump() if product.transformation else None,
        "usage": product.usage.model_dump() if product.usage else None,
        "sales": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_enhanced": True
    }
    
    # Calculate emissions
    emissions = calculate_product_emissions(product_doc)
    product_doc.update(emissions)
    
    result = products_collection.insert_one(product_doc)
    product_doc["id"] = str(result.inserted_id)
    return serialize_doc(product_doc)

@api_router.put("/products/enhanced/{product_id}")
async def update_product_enhanced(product_id: str, product: ProductCreateEnhanced, current_user: dict = Depends(get_current_user)):
    """Update an enhanced product"""
    existing = products_collection.find_one({"_id": ObjectId(product_id), "tenant_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {
        "name": product.name,
        "description": product.description,
        "product_type": product.product_type,
        "unit": product.unit,
        "lifespan_years": product.lifespan_years,
        "materials": [m.model_dump() for m in product.materials],
        "transformation": product.transformation.model_dump() if product.transformation else None,
        "usage": product.usage.model_dump() if product.usage else None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Recalculate emissions
    temp_doc = {**existing, **update_data}
    emissions = calculate_product_emissions(temp_doc)
    update_data.update(emissions)
    
    products_collection.update_one({"_id": ObjectId(product_id)}, {"$set": update_data})
    updated = products_collection.find_one({"_id": ObjectId(product_id)})
    return serialize_doc(updated)

@api_router.get("/products/{product_id}")
async def get_product(product_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single product by ID"""
    product = products_collection.find_one({"_id": ObjectId(product_id), "tenant_id": current_user["id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return serialize_doc(product)

@api_router.post("/products/{product_id}/sales/enhanced")
async def add_product_sale_enhanced(product_id: str, sale: ProductSaleFromCategory, current_user: dict = Depends(get_current_user)):
    """Record a sale and create corresponding activities in Scope 3 Aval categories"""
    product = products_collection.find_one({"_id": ObjectId(product_id), "tenant_id": current_user["id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    if not company:
        raise HTTPException(status_code=400, detail="Company not found")
    
    quantity = sale.quantity
    year = sale.year or datetime.now(timezone.utc).year
    
    # Calculate emissions for this sale
    transformation_total = quantity * product.get("transformation_emissions", 0)
    usage_total = quantity * product.get("usage_emissions", 0)
    disposal_total = quantity * product.get("disposal_emissions", 0)
    
    created_activities = []
    
    # Create activity for Transformation (if applicable)
    if transformation_total > 0:
        activity_transfo = {
            "tenant_id": current_user["id"],
            "company_id": str(company["_id"]),
            "category_id": "transformation_produits",
            "scope": "scope3_aval",
            "name": f"{product['name']} - Transformation",
            "description": f"Transformation de {quantity} unités vendues",
            "quantity": quantity,
            "unit": product.get("unit", "unit"),
            "emissions": transformation_total * 1000,  # Convert to gCO2e for storage
            "product_id": product_id,
            "product_name": product["name"],
            "year": year,
            "date": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        result = activities_collection.insert_one(activity_transfo)
        activity_transfo["id"] = str(result.inserted_id)
        created_activities.append(activity_transfo)
    
    # Create activity for Usage
    if usage_total > 0:
        activity_usage = {
            "tenant_id": current_user["id"],
            "company_id": str(company["_id"]),
            "category_id": "utilisation_produits",
            "scope": "scope3_aval",
            "name": f"{product['name']} - Utilisation",
            "description": f"Utilisation de {quantity} unités sur {product.get('lifespan_years', 1)} ans",
            "quantity": quantity,
            "unit": product.get("unit", "unit"),
            "emissions": usage_total * 1000,
            "product_id": product_id,
            "product_name": product["name"],
            "year": year,
            "date": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        result = activities_collection.insert_one(activity_usage)
        activity_usage["id"] = str(result.inserted_id)
        created_activities.append(activity_usage)
    
    # Create activity for End of Life
    if disposal_total > 0:
        activity_disposal = {
            "tenant_id": current_user["id"],
            "company_id": str(company["_id"]),
            "category_id": "fin_vie_produits",
            "scope": "scope3_aval",
            "name": f"{product['name']} - Fin de vie",
            "description": f"Traitement fin de vie de {quantity} unités",
            "quantity": quantity,
            "unit": product.get("unit", "unit"),
            "emissions": disposal_total * 1000,
            "product_id": product_id,
            "product_name": product["name"],
            "year": year,
            "date": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        result = activities_collection.insert_one(activity_disposal)
        activity_disposal["id"] = str(result.inserted_id)
        created_activities.append(activity_disposal)
    
    # Record the sale on the product
    sale_doc = {
        "quantity": quantity,
        "year": year,
        "transformation_emissions": transformation_total,
        "usage_emissions": usage_total,
        "disposal_emissions": disposal_total,
        "total_emissions": transformation_total + usage_total + disposal_total,
        "date": datetime.now(timezone.utc).isoformat()
    }
    
    products_collection.update_one(
        {"_id": ObjectId(product_id)},
        {"$push": {"sales": sale_doc}}
    )
    
    return {
        "message": f"Sale recorded with {len(created_activities)} activities created",
        "sale": sale_doc,
        "activities_created": [serialize_doc(a) for a in created_activities]
    }

@api_router.get("/emission-factors/by-category/{category}")
async def get_emission_factors_by_category(category: str):
    """Get emission factors filtered by category (materiaux, fin_vie_produits, refrigerants, electricite, etc.)"""
    factors = list(emission_factors_collection.find({"category": category}))
    if not factors:
        # Seed the new emission factors if they don't exist
        new_factors = [f for f in get_default_emission_factors() if f.get("category") == category]
        if new_factors:
            for factor in new_factors:
                # Check if factor already exists by name
                existing = emission_factors_collection.find_one({"name": factor["name"]})
                if not existing:
                    emission_factors_collection.insert_one(factor)
            factors = list(emission_factors_collection.find({"category": category}))
    return [serialize_doc(f) for f in factors]

@api_router.post("/emission-factors/seed-new")
async def seed_new_emission_factors():
    """Seed all new emission factors (materials, treatments, refrigerants)"""
    new_categories = ["materiaux", "fin_vie_produits", "refrigerants"]
    new_factors = [f for f in get_default_emission_factors() if f.get("category") in new_categories]
    
    inserted = 0
    for factor in new_factors:
        existing = emission_factors_collection.find_one({"name": factor["name"]})
        if not existing:
            emission_factors_collection.insert_one(factor)
            inserted += 1
    
    return {"message": f"Seeded {inserted} new emission factors", "total_new_factors": len(new_factors)}

@api_router.get("/emission-factors/by-tags")
async def get_emission_factors_by_tags(tags: str):
    """Get emission factors filtered by tags (comma-separated)"""
    tag_list = [t.strip().lower() for t in tags.split(",")]
    factors = list(emission_factors_collection.find({"tags": {"$in": tag_list}}))
    return [serialize_doc(f) for f in factors]

# Legacy endpoints for backward compatibility
@api_router.post("/products")
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
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_enhanced": False
    }
    result = products_collection.insert_one(product_doc)
    product_doc["id"] = str(result.inserted_id)
    return serialize_doc(product_doc)

@api_router.get("/products")
async def get_products(current_user: dict = Depends(get_current_user)):
    products = list(products_collection.find({"tenant_id": current_user["id"]}))
    return [serialize_doc(p) for p in products]

@api_router.post("/products/{product_id}/sales")
async def add_product_sale(product_id: str, sale: ProductSale, current_user: dict = Depends(get_current_user)):
    product = products_collection.find_one({"_id": ObjectId(product_id), "tenant_id": current_user["id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    sale_doc = {
        "quantity": sale.quantity,
        "emissions": sale.quantity * product.get("total_emissions_per_unit", 0),
        "date": sale.date or datetime.now(timezone.utc).isoformat()
    }
    
    products_collection.update_one(
        {"_id": ObjectId(product_id)},
        {"$push": {"sales": sale_doc}}
    )
    
    return {"message": "Sale recorded", "emissions": sale_doc["emissions"]}

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    result = products_collection.delete_one({"_id": ObjectId(product_id), "tenant_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ==================== FISCAL YEARS ENDPOINTS ====================

@api_router.get("/fiscal-years")
async def get_fiscal_years(current_user: dict = Depends(get_current_user)):
    """Get all fiscal years for the current tenant"""
    fiscal_years = list(fiscal_years_collection.find({"tenant_id": current_user["id"]}).sort("start_date", -1))
    return [serialize_doc(fy) for fy in fiscal_years]

@api_router.get("/fiscal-years/current")
async def get_current_fiscal_year(current_user: dict = Depends(get_current_user)):
    """Get the current active fiscal year (most recent draft, or most recent if all closed)"""
    # First try to find a draft fiscal year
    draft = fiscal_years_collection.find_one(
        {"tenant_id": current_user["id"], "status": "draft"},
        sort=[("start_date", -1)]
    )
    if draft:
        return serialize_doc(draft)
    
    # Otherwise return the most recent one
    recent = fiscal_years_collection.find_one(
        {"tenant_id": current_user["id"]},
        sort=[("start_date", -1)]
    )
    if recent:
        return serialize_doc(recent)
    
    return None

@api_router.get("/fiscal-years/{fiscal_year_id}")
async def get_fiscal_year(fiscal_year_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific fiscal year with its summary"""
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    return serialize_doc(fy)

@api_router.post("/fiscal-years")
async def create_fiscal_year(fy: FiscalYearCreate, current_user: dict = Depends(get_current_user)):
    """Create a new fiscal year"""
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    if not company:
        raise HTTPException(status_code=400, detail="Please create a company first")
    
    # Check for overlapping fiscal years
    existing = fiscal_years_collection.find_one({
        "tenant_id": current_user["id"],
        "$or": [
            {"start_date": {"$lte": fy.end_date}, "end_date": {"$gte": fy.start_date}}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="This period overlaps with an existing fiscal year")
    
    fy_doc = {
        "tenant_id": current_user["id"],
        "company_id": str(company["_id"]),
        "name": fy.name,
        "start_date": fy.start_date,
        "end_date": fy.end_date,
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "summary": None
    }
    
    result = fiscal_years_collection.insert_one(fy_doc)
    fy_doc["id"] = str(result.inserted_id)
    return serialize_doc(fy_doc)

@api_router.post("/fiscal-years/{fiscal_year_id}/close")
async def close_fiscal_year(fiscal_year_id: str, current_user: dict = Depends(get_current_user)):
    """Close a fiscal year - locks data and generates summary"""
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    if fy.get("status") == "closed":
        raise HTTPException(status_code=400, detail="Fiscal year is already closed")
    
    # Calculate summary from activities in this period
    activities = list(activities_collection.find({
        "tenant_id": current_user["id"],
        "fiscal_year_id": fiscal_year_id
    }))
    
    # Also include activities without fiscal_year_id but within date range
    if fy.get("start_date") and fy.get("end_date"):
        activities_by_date = list(activities_collection.find({
            "tenant_id": current_user["id"],
            "fiscal_year_id": {"$exists": False},
            "date": {"$gte": fy["start_date"], "$lte": fy["end_date"]}
        }))
        activities.extend(activities_by_date)
    
    # Calculate totals
    total_emissions = sum(a.get("emissions", 0) for a in activities) / 1000  # Convert to tCO2e
    by_scope = {}
    by_category = {}
    
    for a in activities:
        scope = a.get("scope", "unknown")
        cat = a.get("category_id", "unknown")
        emissions = a.get("emissions", 0) / 1000
        
        by_scope[scope] = by_scope.get(scope, 0) + emissions
        by_category[cat] = by_category.get(cat, 0) + emissions
    
    summary = {
        "total_emissions_tco2e": round(total_emissions, 4),
        "by_scope": {k: round(v, 4) for k, v in by_scope.items()},
        "by_category": {k: round(v, 4) for k, v in by_category.items()},
        "activities_count": len(activities),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update fiscal year
    fiscal_years_collection.update_one(
        {"_id": ObjectId(fiscal_year_id)},
        {"$set": {
            "status": "closed",
            "closed_at": datetime.now(timezone.utc).isoformat(),
            "closed_by": current_user["id"],
            "summary": summary
        }}
    )
    
    updated = fiscal_years_collection.find_one({"_id": ObjectId(fiscal_year_id)})
    return serialize_doc(updated)

@api_router.post("/fiscal-years/{fiscal_year_id}/rectify")
async def rectify_fiscal_year(fiscal_year_id: str, rectify: FiscalYearRectify, current_user: dict = Depends(get_current_user)):
    """Reopen a closed fiscal year with justification"""
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    if fy.get("status") != "closed":
        raise HTTPException(status_code=400, detail="Only closed fiscal years can be rectified")
    
    if not rectify.reason or len(rectify.reason.strip()) < 10:
        raise HTTPException(status_code=400, detail="Please provide a detailed justification (at least 10 characters)")
    
    # Store rectification history
    rectifications = fy.get("rectifications", [])
    rectifications.append({
        "previous_summary": fy.get("summary"),
        "reopened_at": datetime.now(timezone.utc).isoformat(),
        "reopened_by": current_user["id"],
        "reason": rectify.reason.strip()
    })
    
    fiscal_years_collection.update_one(
        {"_id": ObjectId(fiscal_year_id)},
        {"$set": {
            "status": "rectified",
            "rectifications": rectifications,
            "summary": None  # Will be recalculated on next close
        }}
    )
    
    updated = fiscal_years_collection.find_one({"_id": ObjectId(fiscal_year_id)})
    return serialize_doc(updated)

@api_router.post("/fiscal-years/{fiscal_year_id}/duplicate")
async def duplicate_to_new_fiscal_year(fiscal_year_id: str, dup: FiscalYearDuplicate, current_user: dict = Depends(get_current_user)):
    """Create a new fiscal year, optionally duplicating selected activities"""
    source_fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    if not source_fy:
        raise HTTPException(status_code=404, detail="Source fiscal year not found")
    
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    
    # Check for overlapping fiscal years
    existing = fiscal_years_collection.find_one({
        "tenant_id": current_user["id"],
        "$or": [
            {"start_date": {"$lte": dup.new_end_date}, "end_date": {"$gte": dup.new_start_date}}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="This period overlaps with an existing fiscal year")
    
    # Create new fiscal year
    new_fy_doc = {
        "tenant_id": current_user["id"],
        "company_id": str(company["_id"]) if company else None,
        "name": dup.new_name,
        "start_date": dup.new_start_date,
        "end_date": dup.new_end_date,
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "duplicated_from": fiscal_year_id,
        "summary": None
    }
    
    result = fiscal_years_collection.insert_one(new_fy_doc)
    new_fy_id = str(result.inserted_id)
    
    duplicated_activities = []
    
    # Duplicate activities if requested
    if dup.duplicate_activities or dup.activity_ids_to_duplicate:
        if dup.activity_ids_to_duplicate:
            # Duplicate specific activities
            source_activities = list(activities_collection.find({
                "_id": {"$in": [ObjectId(aid) for aid in dup.activity_ids_to_duplicate]},
                "tenant_id": current_user["id"]
            }))
        else:
            # Duplicate all activities from source fiscal year
            source_activities = list(activities_collection.find({
                "tenant_id": current_user["id"],
                "fiscal_year_id": fiscal_year_id
            }))
        
        for activity in source_activities:
            new_activity = {**activity}
            del new_activity["_id"]
            new_activity["fiscal_year_id"] = new_fy_id
            new_activity["duplicated_from"] = str(activity["_id"])
            new_activity["created_at"] = datetime.now(timezone.utc).isoformat()
            # Reset date to new period start
            new_activity["date"] = dup.new_start_date
            
            result = activities_collection.insert_one(new_activity)
            duplicated_activities.append(str(result.inserted_id))
    
    new_fy_doc["id"] = new_fy_id
    return {
        "fiscal_year": serialize_doc(new_fy_doc),
        "duplicated_activities_count": len(duplicated_activities),
        "duplicated_activity_ids": duplicated_activities
    }

@api_router.get("/fiscal-years/{fiscal_year_id}/activities")
async def get_fiscal_year_activities(fiscal_year_id: str, current_user: dict = Depends(get_current_user)):
    """Get all activities for a specific fiscal year"""
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    # Get activities linked to this fiscal year
    activities = list(activities_collection.find({
        "tenant_id": current_user["id"],
        "fiscal_year_id": fiscal_year_id
    }))
    
    # Also get activities within date range without explicit fiscal_year_id
    if fy.get("start_date") and fy.get("end_date"):
        activities_by_date = list(activities_collection.find({
            "tenant_id": current_user["id"],
            "fiscal_year_id": {"$exists": False},
            "date": {"$gte": fy["start_date"], "$lte": fy["end_date"]}
        }))
        activities.extend(activities_by_date)
    
    return [serialize_doc(a) for a in activities]

@api_router.get("/fiscal-years/{fiscal_year_id}/activities-for-duplication")
async def get_activities_for_duplication(fiscal_year_id: str, current_user: dict = Depends(get_current_user)):
    """Get activities that can be duplicated to a new fiscal year (grouped by category)"""
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    activities = list(activities_collection.find({
        "tenant_id": current_user["id"],
        "fiscal_year_id": fiscal_year_id
    }))
    
    # Group by category for easier selection
    by_category = {}
    for a in activities:
        cat = a.get("category_id", "unknown")
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(serialize_doc(a))
    
    return {
        "total_activities": len(activities),
        "by_category": by_category
    }

@api_router.get("/emission-factors")
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

@api_router.post("/emission-factors")
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
        {"name": "Diesel - Véhicules légers", "category": "combustion_mobile", "scope": "scope1", "value": 2.68, "unit": "kgCO2e/L", "source": "OFEV", "tags": ["diesel", "transport", "véhicule", "carburant"], "region": "Suisse"},
        {"name": "Essence - Véhicules légers", "category": "combustion_mobile", "scope": "scope1", "value": 2.28, "unit": "kgCO2e/L", "source": "OFEV", "tags": ["essence", "transport", "véhicule", "carburant"], "region": "Suisse"},
        {"name": "GPL - Véhicules", "category": "combustion_mobile", "scope": "scope1", "value": 1.66, "unit": "kgCO2e/L", "source": "OFEV", "tags": ["gpl", "transport", "carburant"], "region": "Suisse"},
        
        # Scope 1 - Combustion fixe
        {"name": "Gaz naturel - Chauffage", "category": "combustion_fixe", "scope": "scope1", "value": 2.04, "unit": "kgCO2e/m³", "source": "OFEV", "tags": ["gaz", "chauffage", "combustible"], "region": "Suisse"},
        {"name": "Gaz naturel - kWh PCI", "category": "combustion_fixe", "scope": "scope1", "value": 0.205, "unit": "kgCO2e/kWh", "source": "OFEV", "tags": ["gaz", "combustible", "énergie"], "region": "Suisse"},
        {"name": "Fioul domestique", "category": "combustion_fixe", "scope": "scope1", "value": 3.25, "unit": "kgCO2e/L", "source": "OFEV", "tags": ["fioul", "chauffage", "combustible"], "region": "Suisse"},
        {"name": "Fioul lourd", "category": "combustion_fixe", "scope": "scope1", "value": 3.24, "unit": "kgCO2e/kg", "source": "OFEV", "tags": ["fioul", "combustible", "industrie"], "region": "Suisse"},
        
        # Scope 2 - Électricité
        {"name": "Électricité - Suisse", "category": "electricite", "scope": "scope2", "value": 0.128, "unit": "kgCO2e/kWh", "source": "OFEV", "tags": ["électricité", "énergie"], "region": "Suisse"},
        {"name": "Électricité - Allemagne", "category": "electricite", "scope": "scope2", "value": 0.485, "unit": "kgCO2e/kWh", "source": "OFEV", "tags": ["électricité", "énergie"], "region": "Allemagne"},
        {"name": "Électricité - Europe moyenne", "category": "electricite", "scope": "scope2", "value": 0.420, "unit": "kgCO2e/kWh", "source": "OFEV", "tags": ["électricité", "énergie"], "region": "Europe"},
        {"name": "Électricité - France", "category": "electricite", "scope": "scope2", "value": 0.0569, "unit": "kgCO2e/kWh", "source": "OFEV", "tags": ["électricité", "énergie"], "region": "France"},
        
        # Scope 2 - Chaleur
        {"name": "Réseau de chaleur - Suisse", "category": "chaleur_vapeur", "scope": "scope2", "value": 0.109, "unit": "kgCO2e/kWh", "source": "OFEV", "tags": ["chaleur", "réseau"], "region": "Suisse"},
        
        # Scope 3 - Transport
        {"name": "Avion court-courrier", "category": "deplacements_professionnels", "scope": "scope3_amont", "value": 0.258, "unit": "kgCO2e/km/passager", "source": "OFEV", "tags": ["avion", "voyage", "déplacement"], "region": "Global"},
        {"name": "Avion long-courrier", "category": "deplacements_professionnels", "scope": "scope3_amont", "value": 0.195, "unit": "kgCO2e/km/passager", "source": "OFEV", "tags": ["avion", "voyage", "déplacement"], "region": "Global"},
        {"name": "Train", "category": "deplacements_professionnels", "scope": "scope3_amont", "value": 0.00173, "unit": "kgCO2e/km/passager", "source": "OFEV", "tags": ["train", "déplacement"], "region": "Suisse"},
        {"name": "Voiture - Domicile-travail", "category": "deplacements_domicile_travail", "scope": "scope3_amont", "value": 0.193, "unit": "kgCO2e/km", "source": "OFEV", "tags": ["voiture", "trajet", "pendulaire"], "region": "Suisse"},
        
        # Scope 3 - Achats
        {"name": "Papier - Bureau", "category": "biens_services_achetes", "scope": "scope3_amont", "value": 0.919, "unit": "kgCO2e/kg", "source": "OFEV", "tags": ["papier", "bureau", "fournitures"], "region": "Suisse"},
        {"name": "Ordinateur portable", "category": "biens_equipement", "scope": "scope3_amont", "value": 156, "unit": "kgCO2e/unité", "source": "OFEV", "tags": ["informatique", "équipement", "ordinateur"], "region": "Global"},
        {"name": "Smartphone", "category": "biens_equipement", "scope": "scope3_amont", "value": 39.1, "unit": "kgCO2e/unité", "source": "OFEV", "tags": ["informatique", "téléphone", "équipement"], "region": "Global"},
        
        # Scope 3 - Déchets
        {"name": "Déchets ménagers - Incinération", "category": "dechets_operations", "scope": "scope3_amont", "value": 0.51, "unit": "kgCO2e/kg", "source": "OFEV", "tags": ["déchets", "incinération"], "region": "Suisse"},
        {"name": "Déchets ménagers - Enfouissement", "category": "dechets_operations", "scope": "scope3_amont", "value": 0.69, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["déchets", "enfouissement"], "region": "France"},
        
        # ==================== MATÉRIAUX (pour composition produits) ====================
        {"name": "Acier", "category": "materiaux", "scope": "scope3_aval", "value": 1.92, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["matériau", "métal", "acier", "composition"], "region": "Global"},
        {"name": "Aluminium primaire", "category": "materiaux", "scope": "scope3_aval", "value": 9.89, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["matériau", "métal", "aluminium", "composition"], "region": "Global"},
        {"name": "Aluminium recyclé", "category": "materiaux", "scope": "scope3_aval", "value": 0.52, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["matériau", "métal", "aluminium", "recyclé", "composition"], "region": "Global"},
        {"name": "Cuivre", "category": "materiaux", "scope": "scope3_aval", "value": 3.81, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["matériau", "métal", "cuivre", "composition"], "region": "Global"},
        {"name": "Plastique PP (Polypropylène)", "category": "materiaux", "scope": "scope3_aval", "value": 1.98, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["matériau", "plastique", "pp", "composition"], "region": "Global"},
        {"name": "Plastique PE (Polyéthylène)", "category": "materiaux", "scope": "scope3_aval", "value": 1.89, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["matériau", "plastique", "pe", "composition"], "region": "Global"},
        {"name": "Plastique PVC", "category": "materiaux", "scope": "scope3_aval", "value": 2.41, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["matériau", "plastique", "pvc", "composition"], "region": "Global"},
        {"name": "Plastique ABS", "category": "materiaux", "scope": "scope3_aval", "value": 3.27, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["matériau", "plastique", "abs", "composition"], "region": "Global"},
        {"name": "Verre", "category": "materiaux", "scope": "scope3_aval", "value": 0.87, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["matériau", "verre", "composition"], "region": "Global"},
        {"name": "Bois", "category": "materiaux", "scope": "scope3_aval", "value": 0.13, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["matériau", "bois", "composition"], "region": "Global"},
        {"name": "Caoutchouc", "category": "materiaux", "scope": "scope3_aval", "value": 2.89, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["matériau", "caoutchouc", "composition"], "region": "Global"},
        {"name": "Textile coton", "category": "materiaux", "scope": "scope3_aval", "value": 5.35, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["matériau", "textile", "coton", "composition"], "region": "Global"},
        {"name": "Textile synthétique", "category": "materiaux", "scope": "scope3_aval", "value": 6.40, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["matériau", "textile", "synthétique", "composition"], "region": "Global"},
        {"name": "Électronique (circuits)", "category": "materiaux", "scope": "scope3_aval", "value": 52.0, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["matériau", "électronique", "circuit", "composition"], "region": "Global"},
        {"name": "Batterie lithium-ion", "category": "materiaux", "scope": "scope3_aval", "value": 73.0, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["matériau", "batterie", "lithium", "composition"], "region": "Global"},
        
        # ==================== TRAITEMENTS FIN DE VIE ====================
        {"name": "Recyclage acier", "category": "fin_vie_produits", "scope": "scope3_aval", "value": -1.54, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["traitement", "recyclage", "acier", "fin de vie"], "region": "France"},
        {"name": "Recyclage aluminium", "category": "fin_vie_produits", "scope": "scope3_aval", "value": -8.14, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["traitement", "recyclage", "aluminium", "fin de vie"], "region": "France"},
        {"name": "Recyclage cuivre", "category": "fin_vie_produits", "scope": "scope3_aval", "value": -2.89, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["traitement", "recyclage", "cuivre", "fin de vie"], "region": "France"},
        {"name": "Recyclage plastique", "category": "fin_vie_produits", "scope": "scope3_aval", "value": -1.20, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["traitement", "recyclage", "plastique", "fin de vie"], "region": "France"},
        {"name": "Recyclage verre", "category": "fin_vie_produits", "scope": "scope3_aval", "value": -0.45, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["traitement", "recyclage", "verre", "fin de vie"], "region": "France"},
        {"name": "Recyclage papier/carton", "category": "fin_vie_produits", "scope": "scope3_aval", "value": -0.65, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["traitement", "recyclage", "papier", "fin de vie"], "region": "France"},
        {"name": "Incinération avec valorisation", "category": "fin_vie_produits", "scope": "scope3_aval", "value": 0.35, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["traitement", "incinération", "valorisation", "fin de vie"], "region": "France"},
        {"name": "Incinération sans valorisation", "category": "fin_vie_produits", "scope": "scope3_aval", "value": 0.51, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["traitement", "incinération", "fin de vie"], "region": "France"},
        {"name": "Enfouissement", "category": "fin_vie_produits", "scope": "scope3_aval", "value": 0.69, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["traitement", "enfouissement", "fin de vie"], "region": "France"},
        {"name": "Traitement DEEE", "category": "fin_vie_produits", "scope": "scope3_aval", "value": 1.20, "unit": "kgCO2e/kg", "source": "ADEME Base Carbone", "tags": ["traitement", "deee", "électronique", "fin de vie"], "region": "France"},
        
        # ==================== RÉFRIGÉRANTS ====================
        {"name": "R-134a (HFC)", "category": "refrigerants", "scope": "scope1", "value": 1430, "unit": "kgCO2e/kg", "source": "GIEC", "tags": ["réfrigérant", "hfc", "climatisation"], "region": "Global"},
        {"name": "R-410A (HFC)", "category": "refrigerants", "scope": "scope1", "value": 2088, "unit": "kgCO2e/kg", "source": "GIEC", "tags": ["réfrigérant", "hfc", "climatisation"], "region": "Global"},
        {"name": "R-32 (HFC)", "category": "refrigerants", "scope": "scope1", "value": 675, "unit": "kgCO2e/kg", "source": "GIEC", "tags": ["réfrigérant", "hfc", "climatisation"], "region": "Global"},
        {"name": "R-404A (HFC)", "category": "refrigerants", "scope": "scope1", "value": 3922, "unit": "kgCO2e/kg", "source": "GIEC", "tags": ["réfrigérant", "hfc", "froid commercial"], "region": "Global"},
        {"name": "R-290 (Propane)", "category": "refrigerants", "scope": "scope1", "value": 3, "unit": "kgCO2e/kg", "source": "GIEC", "tags": ["réfrigérant", "naturel", "propane"], "region": "Global"},
        {"name": "R-744 (CO2)", "category": "refrigerants", "scope": "scope1", "value": 1, "unit": "kgCO2e/kg", "source": "GIEC", "tags": ["réfrigérant", "naturel", "co2"], "region": "Global"},
    ]

# ==================== DASHBOARD/SUMMARY ENDPOINTS ====================

@api_router.get("/dashboard/summary")
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

@api_router.get("/dashboard/category-stats")
async def get_category_stats(current_user: dict = Depends(get_current_user)):
    activities = list(activities_collection.find({"tenant_id": current_user["id"]}))
    
    # Count activities per category
    category_counts = {}
    for activity in activities:
        cat_id = activity.get("category_id", "")
        category_counts[cat_id] = category_counts.get(cat_id, 0) + 1
    
    return category_counts

@api_router.get("/dashboard/fiscal-comparison")
async def get_fiscal_comparison(current_user: dict = Depends(get_current_user)):
    """Get emissions comparison across all fiscal years"""
    fiscal_years = list(fiscal_years_collection.find(
        {"tenant_id": current_user["id"]},
        {"_id": 1, "name": 1, "start_date": 1, "end_date": 1, "status": 1, "summary": 1}
    ).sort("start_date", 1))
    
    comparison_data = []
    
    for fy in fiscal_years:
        fy_id = str(fy["_id"])
        
        # If fiscal year is closed and has summary, use it
        if fy.get("status") == "closed" and fy.get("summary"):
            summary = fy["summary"]
            comparison_data.append({
                "id": fy_id,
                "name": fy.get("name", ""),
                "year": fy.get("start_date", "")[:4] if fy.get("start_date") else "",
                "status": fy.get("status"),
                "total": summary.get("total_emissions", 0),
                "scope1": summary.get("scope_emissions", {}).get("scope1", 0),
                "scope2": summary.get("scope_emissions", {}).get("scope2", 0),
                "scope3_amont": summary.get("scope_emissions", {}).get("scope3_amont", 0),
                "scope3_aval": summary.get("scope_emissions", {}).get("scope3_aval", 0)
            })
        else:
            # Calculate from activities
            activities = list(activities_collection.find({
                "tenant_id": current_user["id"],
                "fiscal_year_id": fy_id
            }))
            
            scope_totals = {"scope1": 0, "scope2": 0, "scope3_amont": 0, "scope3_aval": 0}
            for activity in activities:
                scope = activity.get("scope", "scope1")
                emissions = activity.get("emissions", 0)
                scope_totals[scope] = scope_totals.get(scope, 0) + emissions
            
            comparison_data.append({
                "id": fy_id,
                "name": fy.get("name", ""),
                "year": fy.get("start_date", "")[:4] if fy.get("start_date") else "",
                "status": fy.get("status", "draft"),
                "total": round(sum(scope_totals.values()), 2),
                "scope1": round(scope_totals["scope1"], 2),
                "scope2": round(scope_totals["scope2"], 2),
                "scope3_amont": round(scope_totals["scope3_amont"], 2),
                "scope3_aval": round(scope_totals["scope3_aval"], 2)
            })
    
    return comparison_data

@api_router.get("/dashboard/scope-breakdown/{fiscal_year_id}")
async def get_scope_breakdown(fiscal_year_id: str, current_user: dict = Depends(get_current_user)):
    """Get detailed breakdown by scope and category for a specific fiscal year"""
    
    # Handle 'current' as special case
    if fiscal_year_id == "current":
        current_fy = fiscal_years_collection.find_one({
            "tenant_id": current_user["id"],
            "status": "draft"
        })
        if current_fy:
            fiscal_year_id = str(current_fy["_id"])
        else:
            # Return empty data if no current fiscal year
            return {
                "scope_data": [],
                "category_data": {}
            }
    
    # Get activities for this fiscal year
    activities = list(activities_collection.find({
        "tenant_id": current_user["id"],
        "fiscal_year_id": fiscal_year_id
    }))
    
    # Get all categories for names
    categories = {str(c.get("code", "")): c.get("name", "") for c in categories_collection.find({})}
    
    # Calculate by scope
    scope_totals = {"scope1": 0, "scope2": 0, "scope3_amont": 0, "scope3_aval": 0}
    category_by_scope = {
        "scope1": {},
        "scope2": {},
        "scope3_amont": {},
        "scope3_aval": {}
    }
    
    for activity in activities:
        scope = activity.get("scope", "scope1")
        emissions = activity.get("emissions", 0)
        cat_id = activity.get("category_id", "other")
        
        scope_totals[scope] = scope_totals.get(scope, 0) + emissions
        
        if cat_id not in category_by_scope[scope]:
            category_by_scope[scope][cat_id] = {
                "name": categories.get(cat_id, cat_id),
                "emissions": 0,
                "count": 0
            }
        category_by_scope[scope][cat_id]["emissions"] += emissions
        category_by_scope[scope][cat_id]["count"] += 1
    
    # Format scope data for chart
    scope_names = {
        "scope1": "Scope 1",
        "scope2": "Scope 2", 
        "scope3_amont": "Scope 3 Amont",
        "scope3_aval": "Scope 3 Aval"
    }
    
    scope_colors = {
        "scope1": "#3b82f6",  # blue
        "scope2": "#06b6d4",  # cyan
        "scope3_amont": "#8b5cf6",  # purple
        "scope3_aval": "#6366f1"  # indigo
    }
    
    scope_data = []
    for scope_key in ["scope1", "scope2", "scope3_amont", "scope3_aval"]:
        scope_data.append({
            "scope": scope_key,
            "name": scope_names[scope_key],
            "emissions": round(scope_totals[scope_key], 2),
            "color": scope_colors[scope_key]
        })
    
    # Format category data for drill-down
    category_data = {}
    for scope_key, cats in category_by_scope.items():
        category_data[scope_key] = sorted(
            [
                {
                    "id": cat_id,
                    "name": data["name"],
                    "emissions": round(data["emissions"], 2),
                    "count": data["count"]
                }
                for cat_id, data in cats.items()
            ],
            key=lambda x: x["emissions"],
            reverse=True
        )
    
    return {
        "scope_data": scope_data,
        "category_data": category_data
    }

@api_router.get("/dashboard/kpis")
async def get_dashboard_kpis(current_user: dict = Depends(get_current_user)):
    """Get key performance indicators for the dashboard"""
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    
    # Get all fiscal years
    fiscal_years = list(fiscal_years_collection.find(
        {"tenant_id": current_user["id"]}
    ).sort("start_date", -1))
    
    # Get current and previous fiscal year
    current_fy = None
    previous_fy = None
    
    for fy in fiscal_years:
        if fy.get("status") == "draft" and not current_fy:
            current_fy = fy
        elif current_fy and not previous_fy:
            previous_fy = fy
            break
    
    # Calculate current emissions
    current_emissions = 0
    current_activities_count = 0
    if current_fy:
        activities = list(activities_collection.find({
            "tenant_id": current_user["id"],
            "fiscal_year_id": str(current_fy["_id"])
        }))
        current_emissions = sum(a.get("emissions", 0) for a in activities)
        current_activities_count = len(activities)
    
    # Calculate previous emissions
    previous_emissions = 0
    if previous_fy:
        if previous_fy.get("summary"):
            previous_emissions = previous_fy["summary"].get("total_emissions", 0)
        else:
            activities = list(activities_collection.find({
                "tenant_id": current_user["id"],
                "fiscal_year_id": str(previous_fy["_id"])
            }))
            previous_emissions = sum(a.get("emissions", 0) for a in activities)
    
    # Calculate variation
    variation_percent = 0
    variation_absolute = 0
    if previous_emissions > 0:
        variation_absolute = current_emissions - previous_emissions
        variation_percent = round((variation_absolute / previous_emissions) * 100, 1)
    
    # Emissions per employee
    emissions_per_employee = 0
    if company and company.get("employees", 0) > 0:
        emissions_per_employee = current_emissions / company["employees"]
    
    # Emissions per revenue (intensity)
    emissions_intensity = 0
    if company and company.get("revenue", 0) > 0:
        emissions_intensity = current_emissions / company["revenue"]
    
    # Products count
    products_count = products_collection.count_documents({"tenant_id": current_user["id"]})
    
    return {
        "current_emissions": round(current_emissions, 2),
        "previous_emissions": round(previous_emissions, 2),
        "variation_percent": variation_percent,
        "variation_absolute": round(variation_absolute, 2),
        "activities_count": current_activities_count,
        "products_count": products_count,
        "emissions_per_employee": round(emissions_per_employee, 2) if emissions_per_employee else None,
        "emissions_intensity": round(emissions_intensity, 6) if emissions_intensity else None,
        "fiscal_years_count": len(fiscal_years),
        "current_fiscal_year": current_fy.get("name") if current_fy else None,
        "employees": company.get("employees") if company else None,
        "revenue": company.get("revenue") if company else None
    }

# ==================== IMPORT/EXPORT ENDPOINTS ====================

@api_router.post("/import/csv")
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

@api_router.get("/export/csv")
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

@api_router.get("/export/json")
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

@api_router.post("/import/json")
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

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the API router
app.include_router(api_router)

# Root health check (without /api prefix)
@app.get("/")
async def root():
    return {"message": "Carbon Footprint Calculator API", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
