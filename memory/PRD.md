# Proto Carbon - Calculateur d'Empreinte Carbone

## Problème Original
Calculateur d'empreinte carbone pour entreprise suivant le GHG Protocol. Application full-stack React/FastAPI/MongoDB avec saisie de données, curation des facteurs d'émission, gestion multi-exercices, rapports détaillés, Dual Reporting, diagnostics de plausibilité et internationalisation (i18n FR/DE).

## Architecture
```
/app/
├── backend/
│   ├── routes/ (auth.py avec cookies httpOnly, dashboard.py, curation.py, activities.py, ...)
│   ├── services/ (auth.py: verify_token lit cookie en priorité, dashboard_service.py, curation_service.py)
│   ├── models/
│   └── utils/
└── frontend/
    ├── src/
    │   ├── context/ (AuthContext: cookies httpOnly, FiscalYearContext: isAuthenticated)
    │   ├── components/ (tous les fetch() convertis en axios)
    │   ├── hooks/ (tous les hooks nettoyés des tokens)
    │   └── pages/
```

## Fonctionnalités Implémentées

### Sécurité Token Storage (06/04/2026) DONE
- **Migration localStorage/sessionStorage → cookies HTTP-only**
- Frontend : `axios.defaults.withCredentials = true` pour envoyer les cookies automatiquement
- Suppression de tous les `Authorization: Bearer` headers manuels
- Conversion de 16+ appels `fetch()` en `axios` dans 8 fichiers
- Backend : `verify_token()` lit le cookie en priorité, fallback sur header Authorization
- Cookie config : `HttpOnly; Secure; SameSite=Lax; Path=/`
- Tests : iteration_72.json — 100% (18 backend + toutes pages frontend + tests sécurité)

### Phases de Refactoring Complétées
- Phase 1 — Key Props DONE
- Phase 2 — React Hook Dependencies (initial) DONE
- Phase 4 — Backend Service Layer DONE
- Phase 5 — Frontend Component Decomposition DONE
- Phase A — Backend Complexity Refactoring DONE
- Phase B — Frontend Complexity Refactoring DONE
- Phase C — React Hook Dependencies (exhaustive-deps) DONE

## Backlog (P0-P2)
- **P0**: FEAT-CUR-03 — Regroupement par patterns (atelier curation)
- **P1**: Phase D — Ternaires imbriqués (207) + Inline Objects Props (370) + Python `is` vs `==` (139)
- **P1**: FEAT-03 — Gestion multi-utilisateurs (rôles)
- **P1**: Exports PDF/Excel
- **P2**: Type Hints Python progressif
- **P2**: Base de données plan climat cantonal
- **P2**: Logs d'audit, Optimisation DB, Migration TypeScript

## Intégrations 3P
- Google Gemini Pro (Emergent LLM Key) — module de curation

## Problème connu
- Déploiement Production KO : secret FRONTEND_URL manquant (action utilisateur requise)
