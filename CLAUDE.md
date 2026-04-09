# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Protocarbon** is a SaaS platform for calculating corporate carbon footprints compliant with the GHG Protocol. Companies can enter emissions-generating activities (Scope 1, 2, 3), manage fiscal years, model product lifecycles, and visualize their carbon balance.

**Stack:** FastAPI + MongoDB + React 18 (Create React App)

---

## Development Commands

### Backend (FastAPI, Python)

```bash
cd backend
pip install -r requirements.txt
python server.py                          # Starts FastAPI on port 8001
# or
uvicorn server:app --reload --port 8001
```

**Tests (pytest):**
```bash
python -m pytest backend/tests/ -v                          # All tests
python -m pytest backend/tests/test_auth.py -v             # Single file
python -m pytest backend/tests/ --cov=. --cov-report=html  # With coverage
```

The test suite uses a separate `carbon_tracker_test` MongoDB database (configured in `backend/tests/conftest.py`).

### Frontend (React)

```bash
cd frontend
npm install
npm start    # Dev server on port 3000 (proxies /api/* to localhost:8001)
npm test     # Jest + React Testing Library
npm run build
```

---

## Backend Architecture

**Entry point:** `backend/server.py` — FastAPI app, CORS middleware, health check, mounts all routes under `/api`.

**`backend/config.py`** — MongoDB connection, collection exports (users, companies, activities, products, emission_factors, categories, subcategories, fiscal_years, unit_conversions, carbon_objectives, scenarios), and bcrypt context. All routes import collections from here.

**`backend/models/__init__.py`** — All Pydantic models (User, Company, Activity, Product, EmissionFactor, FiscalYear, Category, Subcategory, EmissionImpact, UnitConversion).

**`backend/routes/__init__.py`** — Central router composing 13 sub-routers:
- `auth.py` — Login, register, password reset, email verification, account lockout
- `activities.py` — Activity CRUD, bulk ops, GHG scope business rules
- `fiscal_years.py` — FY CRUD + close, rectify, duplicate
- `products.py` — Product lifecycle CRUD, sales data
- `dashboard.py` — Aggregated emissions, KPIs, scope breakdown, year-over-year
- `reference_data.py` — Categories, subcategories, emission factors lookup
- `admin.py` — Factor management, subcategories, unit conversions, user admin
- `objectives.py` — SBTi carbon objectives, trajectory calculations
- `scenarios.py`, `curation.py`, `export.py`, `units.py`

**`backend/services/`**:
- `emissions.py` — Core emission calculation logic; snapshot of factor frozen at entry time
- `auth.py` — JWT generation/verification, `get_current_user()` FastAPI dependency
- `scope_mapping.py` — GHG Protocol scope normalization (scope1, scope2, scope3_amont, scope3_aval)
- `email.py` — Password reset, verification, and lockout email notifications

**`backend/utils/__init__.py`** — `serialize_doc()` (ObjectId → JSON), `format_emissions()` (unit conversion), `find_emission_factor()`.

---

## Frontend Architecture

The React SPA uses React Router v6, Context API for global state, and Axios for API calls. All `/api/*` requests are proxied to port 8001.

**Global state (context/):**
- `AuthContext.js` — JWT token, current user, login/logout
- `FiscalYearContext.js` — Currently selected fiscal year
- `LanguageContext.js` — Active language (fr/de)
- `ThemeContext.js` — Dark/light mode

**Pages** map to main navigation sections: Dashboard, DataEntry, Products, FiscalYears, GeneralInfo, EmissionFactors, Admin, Assistance, CurationWorkbench, plus auth pages.

**Key components:**
- `components/wizard/` — 5-step product lifecycle wizard (general info → materials → transformation → usage → end-of-life)
- `components/admin/` — Tabs for factors, units, subcategories, users, exports
- `components/dashboard/` — Charts (Recharts), KPI cards, recommendations

**i18n:** `src/locales/fr.json` and `de.json` — French and German translations, consumed via `LanguageContext`.

**Design system:** Tailwind CSS with custom theme; scope color conventions and component patterns documented in `/design_guidelines.md`.

---

## Domain Logic

### GHG Protocol Scopes
Activities are tagged as scope1, scope2, scope3_amont (upstream), or scope3_aval (downstream). A single emission factor can produce impacts across multiple scopes simultaneously (e.g., a Scope 1 fuel entry can include Scope 3 category 3 impacts). Business rules for which impacts apply live in `backend/services/scope_mapping.py` and `backend/routes/activities.py`.

### Emission Factors v2
Factors have a custom text ID (distinct from MongoDB `_id`), multiple impact objects (each with scope + CO₂e value), source/region/year metadata, and unit conversion support. When an activity is saved, a **factor snapshot** (frozen copy) is stored on the activity — this ensures historical immutability even if the factor is later updated.

### Fiscal Year Lifecycle
FYs can be: open → closed → rectified. Closed FYs can be duplicated for baseline scenarios. Context overrides (employees, revenue, surface area) and excluded categories are per-FY.

### Security
- Account lockout: 5 failed logins → 15-min lockout
- JWT tokens default to 24h expiry (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- Password reset / email verification tokens have short-lived expiry (1h / 24h)

---

## Environment Variables (backend `.env`)

| Variable | Default | Description |
|---|---|---|
| `MONGO_URL` | — | MongoDB connection string |
| `DB_NAME` | `carbon_tracker` | Database name |
| `JWT_SECRET` | — | **Required.** JWT signing key |
| `JWT_ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token TTL |
| `CORS_ORIGINS` | `*` | Allowed origins |
| `COOKIE_SECURE` | `true` | Secure flag on auth cookies |
| `COOKIE_SAMESITE` | `lax` | SameSite cookie policy |

---

## Further Reference

- `/docs/technical-documentation.md` — Full architecture reference including DB schema and all API endpoints
- `/docs/data-model-emission-factors.md` — Emission factor schema, 22 GHG categories, 69 subcategories, 1191+ factors
- `/design_guidelines.md` — Tailwind CSS component patterns and scope color conventions
- `/backend/ARCHITECTURE.md` — Backend module breakdown and route count per router
