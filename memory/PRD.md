# Proto Carbon - Calculateur d'Empreinte Carbone

## Problème Original
Calculateur d'empreinte carbone pour entreprise suivant le GHG Protocol. Application full-stack React/FastAPI/MongoDB avec saisie de données, curation des facteurs d'émission, gestion multi-exercices, rapports détaillés, Dual Reporting, diagnostics de plausibilité et internationalisation (i18n FR/DE).

## Architecture
```
/app/
├── backend/
│   ├── routes/ (dashboard.py, curation.py, activities.py, fiscal_years.py, export.py, ...)
│   ├── services/ (dashboard_service.py, curation_service.py)
│   ├── models/
│   └── utils/
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── general-info/ (4 composants)
    │   │   ├── fiscal-years/ (2 composants)
    │   │   ├── data-entry/ (GlobalFactorSearch, TableViewPanel, dataEntryConstants)
    │   │   ├── curation-workbench/ (9 composants)
    │   │   ├── assistance/ (4 composants)
    │   │   └── wizard/ (useProductWizard.js refactorisé)
    │   ├── hooks/ (useGeneralInfo, useFiscalYearsPage, useCurationWorkbench, useAssistance, useDataEntry, useAdminExport, useProductVersions, useProductSale, useDashboard, useGuidedEntry)
    │   ├── pages/
    │   └── context/ (AuthContext refactorisé)
```

## Revue de Code — Phases Complétées

### Phase 1 — Key Props DONE
### Phase 2 — React Hook Dependencies (initial) DONE
### Phase 3 — Sécurité Token Storage → BACKLOG
### Phase 4 — Backend Service Layer DONE
### Phase 5 — Frontend Component Decomposition DONE
### Phase A — Backend Complexity Refactoring DONE
### Phase B — Frontend Complexity Refactoring DONE
### Phase C — React Hook Dependencies (exhaustive-deps) DONE (06/04/2026)
- **18 problèmes corrigés** : 12 warnings ESLint + 6 suppressions `eslint-disable`
- **0 warnings restants**, **0 eslint-disable** dans tout le codebase
- Fichiers modifiés (13) :
  - `AuthContext.js` : `fetchUser`/`logout` → `useCallback`, effect avec deps `[token, fetchUser]`
  - `useDashboard.js` : `fetchAllData`/`fetchObjectiveData`/`fetchScenarioEntities`/`fetchScopeBreakdown` → `useCallback`
  - `useGuidedEntry.js` : `fetchSubcategories`/`fetchFactorsForCategory`/`loadForEditing`/`loadForPreSelectedFactor` → `useCallback`
  - `useProductWizard.js` : `loadEmissionFactors`/`loadProductData`/`calculateEmissionsPreview` → `useCallback`
  - `useAdminExport.js` : `fetchFiscalYears`/`fetchDumpInfo` → `useCallback`
  - `useProductVersions.js` : `fetchData` → `useCallback`
  - `useProductSale.js` : `fetchProducts`/`fetchProductSales` → `useCallback`
  - `useAssistance.js` : `fetchFactors` → `useCallback`
  - `useFiscalYearsPage.js` : deps manquantes ajoutées
  - `OnboardingTour.js` : `steps` array → `useMemo([language])`
  - `SaleEditModal.js` : `fetchSaleDetails` → `useCallback`
  - `GeneralInfo.js` : destructuration propre pour deps correctes
  - `VerifyEmail.js` : ajout de `t` aux deps
- Bug critique corrigé par testing agent : temporal dead zone dans `useProductWizard.js`
- Tests : iteration_71.json — 100% (26 backend + toutes pages frontend)

## Backlog (P0-P2)
- **P1**: Phase D — Ternaires imbriqués (207) + Inline Objects Props (370) + Python `is` vs `==` (139)
- **P0**: FEAT-CUR-03 — Regroupement par patterns (atelier curation)
- **P1**: FEAT-03 — Gestion multi-utilisateurs (rôles)
- **P1**: Exports PDF/Excel
- **P2**: Type Hints Python progressif
- **P2**: Sécurité Token Storage (HTTP-only cookies)
- **P2**: Base de données plan climat cantonal
- **P2**: Logs d'audit, Optimisation DB, Migration TypeScript

## Intégrations 3P
- Google Gemini Pro (Emergent LLM Key) — module de curation

## Problème connu
- Déploiement Production KO : secret FRONTEND_URL manquant (action utilisateur requise)
