"""
Services package initialization
"""
from .auth import (
    hash_password,
    verify_password,
    create_access_token,
    verify_token,
    get_current_user,
    require_admin
)

from .emissions import (
    calculate_emissions_for_activity,
    get_factor_valid_for_year,
    get_emissions_summary_for_fiscal_year,
    create_factor_snapshot
)

__all__ = [
    # Auth
    "hash_password",
    "verify_password", 
    "create_access_token",
    "verify_token",
    "get_current_user",
    "require_admin",
    # Emissions
    "calculate_emissions_for_activity",
    "get_factor_valid_for_year",
    "get_emissions_summary_for_fiscal_year",
    "create_factor_snapshot"
]
