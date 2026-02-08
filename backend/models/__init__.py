"""
Modèles Pydantic pour l'API Carbon Tracker
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any

# ==================== USER MODELS ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    language: str = "fr"
    role: str = "user"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    language: str
    role: str = "user"
    company_id: Optional[str] = None
    created_at: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    language: Optional[str] = None
    role: Optional[str] = None

# ==================== EMISSION IMPACT MODELS ====================

class EmissionImpact(BaseModel):
    """Un impact individuel d'un facteur d'émission"""
    scope: str
    category: str
    value: float
    unit: str
    type: str = "direct"

class UnitConversion(BaseModel):
    """Conversion d'unité"""
    from_unit: str
    to_unit: str
    factor: float
    description: Optional[str] = None

# ==================== SUBCATEGORY MODELS ====================

class SubcategoryCreate(BaseModel):
    code: str
    name_fr: str
    name_de: str
    categories: List[str]
    icon: str = "circle"
    order: int = 0

class SubcategoryUpdate(BaseModel):
    code: Optional[str] = None
    name_fr: Optional[str] = None
    name_de: Optional[str] = None
    categories: Optional[List[str]] = None
    icon: Optional[str] = None
    order: Optional[int] = None

# ==================== UNIT CONVERSION MODELS ====================

class UnitConversionCreate(BaseModel):
    from_unit: str
    to_unit: str
    factor: float
    description_fr: Optional[str] = None
    description_de: Optional[str] = None

class UnitConversionUpdate(BaseModel):
    from_unit: Optional[str] = None
    to_unit: Optional[str] = None
    factor: Optional[float] = None
    description_fr: Optional[str] = None
    description_de: Optional[str] = None

# ==================== EMISSION FACTOR V2 MODELS ====================

class EmissionFactorV2Create(BaseModel):
    name_fr: str
    name_de: str
    subcategory: str
    input_units: List[str]
    default_unit: str
    impacts: List[EmissionImpact]
    unit_conversions: Dict[str, float] = {}
    tags: List[str] = []
    source: str = "OFEV"
    region: str = "Suisse"
    year: int = 2024

class EmissionFactorV2Update(BaseModel):
    name_fr: Optional[str] = None
    name_de: Optional[str] = None
    subcategory: Optional[str] = None
    input_units: Optional[List[str]] = None
    default_unit: Optional[str] = None
    impacts: Optional[List[EmissionImpact]] = None
    unit_conversions: Optional[Dict[str, float]] = None
    tags: Optional[List[str]] = None
    source: Optional[str] = None
    region: Optional[str] = None
    year: Optional[int] = None

# ==================== VERSIONING MODELS ====================

class EmissionFactorNewVersion(BaseModel):
    impacts: List[EmissionImpact]
    is_correction: bool = False
    change_reason: str
    valid_from_year: Optional[int] = None
    name_fr: Optional[str] = None
    name_de: Optional[str] = None
    subcategory: Optional[str] = None
    input_units: Optional[List[str]] = None
    default_unit: Optional[str] = None
    unit_conversions: Optional[Dict[str, float]] = None
    tags: Optional[List[str]] = None
    source: Optional[str] = None
    region: Optional[str] = None
    year: Optional[int] = None

class FactorSnapshot(BaseModel):
    factor_id: str
    factor_version: int
    name_fr: str
    name_de: str
    subcategory: str
    impacts: List[Dict[str, Any]]
    source: str
    year: int
    valid_from_year: Optional[int] = None
    captured_at: str

class RecalculateRequest(BaseModel):
    activity_ids: Optional[List[str]] = None
    fiscal_year_id: str
    preview_only: bool = True

# ==================== LEGACY EMISSION FACTOR MODELS ====================

class EmissionFactorCreate(BaseModel):
    name: str
    category: str
    scope: str
    value: float
    unit: str
    source: str = "OFEV"
    tags: List[str] = []
    region: str = "Suisse"
    description: Optional[str] = None
    year: Optional[int] = None

class EmissionFactorUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    scope: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    source: Optional[str] = None
    tags: Optional[List[str]] = None
    region: Optional[str] = None

# ==================== COMPANY MODELS ====================

class CompanyCreate(BaseModel):
    name: str
    location: str
    sector: str
    entity_type: str = "private_company"
    employees: int
    surface_area: float
    revenue: Optional[float] = None
    consolidation_approach: Optional[str] = None
    excluded_categories: List[str] = []
    fiscal_year_start_month: int = 1

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

class FiscalYearContext(BaseModel):
    """Données contextuelles évolutives par exercice fiscal"""
    employees: Optional[int] = None
    revenue: Optional[float] = None
    surface_area: Optional[float] = None
    excluded_categories: Optional[List[str]] = None

class FiscalYearContextUpdate(BaseModel):
    """Mise à jour des données contextuelles d'un exercice"""
    employees: Optional[int] = None
    revenue: Optional[float] = None
    surface_area: Optional[float] = None
    excluded_categories: Optional[List[str]] = None

class FiscalYearCreate(BaseModel):
    year: int  # Année de l'exercice (ex: 2026) - génère automatiquement les dates

class FiscalYearClose(BaseModel):
    pass

class FiscalYearRectify(BaseModel):
    reason: str

class FiscalYearDuplicate(BaseModel):
    new_year: int  # Année du nouvel exercice
    duplicate_activities: bool = False
    activity_ids_to_duplicate: List[str] = []

# ==================== ACTIVITY MODELS ====================

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
    fiscal_year_id: Optional[str] = None
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

# ==================== PRODUCT MODELS ====================

class ProductEmissionProfile(BaseModel):
    """Profil d'émissions pour un exercice fiscal spécifique"""
    fiscal_year_id: str
    fiscal_year_name: Optional[str] = None
    manufacturing_emissions: Optional[float] = None  # kgCO2e per unit
    usage_emissions: Optional[float] = None  # kgCO2e per unit
    disposal_emissions: Optional[float] = None  # kgCO2e per unit
    change_reason: Optional[str] = None  # Raison du changement
    created_at: Optional[str] = None

class ProductEmissionProfileCreate(BaseModel):
    """Création d'un nouveau profil d'émissions"""
    fiscal_year_id: str
    manufacturing_emissions: Optional[float] = None
    usage_emissions: Optional[float] = None
    disposal_emissions: Optional[float] = None
    change_reason: Optional[str] = None

class ProductEmissionProfileUpdate(BaseModel):
    """Mise à jour d'un profil d'émissions"""
    manufacturing_emissions: Optional[float] = None
    usage_emissions: Optional[float] = None
    disposal_emissions: Optional[float] = None
    change_reason: Optional[str] = None

class MaterialComposition(BaseModel):
    material_name: str
    emission_factor_id: Optional[str] = None
    weight_kg: float
    treatment_type: str
    treatment_emission_factor_id: Optional[str] = None
    recyclability_percent: float = 0

class TransformationEnergy(BaseModel):
    electricity_kwh: float = 0
    electricity_factor_id: Optional[str] = None
    fuel_kwh: float = 0
    fuel_factor_id: Optional[str] = None
    region: str = "France"

class UsageEnergy(BaseModel):
    electricity_kwh_per_cycle: float = 0
    electricity_factor_id: Optional[str] = None
    fuel_kwh_per_cycle: float = 0
    fuel_factor_id: Optional[str] = None
    carburant_l_per_cycle: float = 0
    carburant_factor_id: Optional[str] = None
    refrigerant_kg_per_cycle: float = 0
    refrigerant_factor_id: Optional[str] = None
    cycles_per_year: int = 1

class ProductCreateEnhanced(BaseModel):
    name: str
    description: Optional[str] = None
    product_type: str = "finished"
    unit: str = "unit"
    lifespan_years: float = 1
    materials: List[MaterialComposition] = []
    transformation: Optional[TransformationEnergy] = None
    usage: Optional[UsageEnergy] = None

class ProductSale(BaseModel):
    product_id: str
    quantity: int
    year: Optional[int] = None
    date: Optional[str] = None
    fiscal_year_id: Optional[str] = None  # ID de l'exercice fiscal (prioritaire sur la date)

class ProductSaleUpdate(BaseModel):
    """Model for updating a product sale and its linked activities"""
    quantity: int
    date: Optional[str] = None

class ProductSaleFromCategory(BaseModel):
    product_id: str
    quantity: int
    year: Optional[int] = None

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    manufacturing_emissions: float = 0
    usage_emissions: float = 0
    disposal_emissions: float = 0
    unit: str = "unit"

# ==================== CARBON OBJECTIVES MODELS ====================

class CarbonObjectiveCreate(BaseModel):
    reference_fiscal_year_id: str
    target_year: int

class CarbonObjectiveUpdate(BaseModel):
    target_year: Optional[int] = None
    status: Optional[str] = None

class TrajectoryPoint(BaseModel):
    year: int
    target_scope1_2: float
    target_scope3: float
    actual_scope1_2: Optional[float] = None
    actual_scope3: Optional[float] = None
