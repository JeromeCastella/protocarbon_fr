# Cahier des charges — Modernisation des graphiques Dashboard

**Fichier cible :** `frontend/src/components/DashboardResultsTab.js`
**Objectif :** Rendre la vue tableau de bord plus légère et épurée, sans perte fonctionnelle.

---

## Contexte et principes directeurs

Le tableau de bord affiche actuellement 3 graphiques :

1. **Émissions par Scope** — BarChart vertical avec drill-down
2. **Top 10 sous-catégories** — liste de barres horizontales HTML custom
3. **Évolution des émissions** — BarChart empilé (stacked)

Les changements visent à :

- Adoucir la palette de couleurs (tons plus doux, moins saturés)
- Alléger les graphiques (grilles discrètes, barres plus fines)
- Remplacer le stacked BarChart par un AreaChart avec gradients (plus moderne)
- Traduire les libellés bruts des catégories (ex: `electricite` → `Électricité`)
- Réduire les ombres des cartes en mode clair (moins de profondeur visuelle)

---

## Changement 1 — Palette de couleurs (lignes 27–47)

### Avant

```js
const SCOPE_COLORS = {
  scope1: '#F97316', // Orange vif
  scope2: '#3B82F6', // Bleu vif
  scope3_amont: '#8B5CF6', // Violet vif
  scope3_aval: '#EC4899', // Rose vif
  scope3: '#8B5CF6'
};

const CATEGORY_COLORS = [
  '#8B5CF6', '#3B82F6', '#06B6D4', '#10B981',
  '#F59E0B', '#EF4444', '#EC4899', '#6366F1',
  '#84CC16', '#F97316'
];
```

### Après

Remplacer par des tons plus doux (opacité ~70%, pastel) :

```js
const SCOPE_COLORS = {
  scope1: '#FB923C', // Orange doux
  scope2: '#60A5FA', // Bleu ciel
  scope3_amont: '#A78BFA', // Violet doux
  scope3_aval: '#F9A8D4', // Rose poudré
  scope3: '#A78BFA'
};

const CATEGORY_COLORS = [
  '#A78BFA', '#60A5FA', '#34D399', '#6EE7B7',
  '#FCD34D', '#FCA5A5', '#F9A8D4', '#818CF8',
  '#BEF264', '#FB923C'
];
```

**Résultat attendu :** Les barres et courbes ont un aspect plus "pastel/moderne", moins agressif visuellement.

---

## Changement 2 — Graphique 1 : Émissions par Scope (lignes 354–393)

### 2a — Grille : rendre la grille quasi invisible

```jsx
// Avant (ligne 360)
<CartesianGrid strokeDasharray="3 3" opacity={0.2} />

// Après
<CartesianGrid strokeDasharray="2 4" stroke={isDark ? '#334155' : '#f1f5f9'} vertical={false} />
```

Supprimer les lignes verticales (`vertical={false}`) pour alléger l'œil.

### 2b — Barres : réduire la largeur et arrondir davantage

```jsx
// Avant (ligne 374–380)
<Bar
  dataKey="emissions"
  cursor={drillDownScope ? 'default' : 'pointer'}
  radius={[4, 4, 0, 0]}
  ...
>

// Après
<Bar
  dataKey="emissions"
  barSize={36}
  cursor={drillDownScope ? 'default' : 'pointer'}
  radius={[6, 6, 0, 0]}
  ...
>
```

**Résultat attendu :** Barres moins « lourdes », coins plus arrondis.

---

## Changement 3 — Graphique 2 : Top 10 sous-catégories (lignes 396–447)

### 3a — Traduire les libellés de catégories (ligne 420–422)

Actuellement, `item.name` contient le code brut (ex: `electricite`, `combustion_fixe`).
Il faut utiliser les traductions disponibles dans `fr.json` à la clé `"categories"`.

Le composant reçoit déjà `useLanguage()`. Importer `t` et l'utiliser :

```jsx
// Ajouter en haut du composant (si pas déjà présent)
const { language, t } = useLanguage();

// Avant (ligne 421)
<span className={`text-sm truncate max-w-[180px] ...`}>
  {item.name}
</span>

// Après
<span className={`text-sm truncate max-w-[180px] ...`}>
  {t ? t(`categories.${item.name}`) || item.name : item.name}
</span>
```

> **Note :** Vérifier que `useLanguage` expose bien une fonction `t()`. Sinon, importer `i18next` ou `useTranslation` selon la lib utilisée dans le projet.

### 3b — Épaisseur des barres (ligne 427)

```jsx
// Avant
<div className={`h-2 rounded-full ...`}>

// Après
<div className={`h-1.5 rounded-full ...`}>
```

Barres légèrement plus fines pour un rendu plus délicat.

### 3c — Limiter à Top 5 par défaut (optionnel)

Si la liste de 10 items paraît trop longue, réduire dans `useMemo` (ligne 166) :

```js
// Avant
.slice(0, 10);

// Après
.slice(0, 7);
```

---

## Changement 4 — Graphique 3 : Évolution → AreaChart avec gradients (lignes 450–515)

C'est le changement le plus structurant. Remplacer le `BarChart` empilé par un `AreaChart` avec des zones de couleur dégradées.

### 4a — Imports (lignes 14–24)

Ajouter les nouveaux composants Recharts :

```js
// Avant
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

// Après
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
```

### 4b — Remplacement du JSX du graphique (lignes 461–514)

```jsx
// Avant (BarChart empilé)
<div className="h-72">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={evolutionData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
      <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
      <XAxis dataKey="year" tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }} ... />
      <YAxis tickFormatter={(value) => `${value.toFixed(0)}`} tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }} ... />
      <Tooltip ... />
      <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
      <Bar dataKey="scope1" name="Scope 1" stackId="stack" fill={SCOPE_COLORS.scope1} radius={[0,0,0,0]} />
      <Bar dataKey="scope2" name="Scope 2" stackId="stack" fill={SCOPE_COLORS.scope2} radius={[0,0,0,0]} />
      <Bar dataKey="scope3" name="Scope 3" stackId="stack" fill={SCOPE_COLORS.scope3} radius={[4,4,0,0]} />
    </BarChart>
  </ResponsiveContainer>
</div>

// Après (AreaChart avec gradients)
<div className="h-72">
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={evolutionData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
      <defs>
        <linearGradient id="gradScope1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={SCOPE_COLORS.scope1} stopOpacity={0.35} />
          <stop offset="95%" stopColor={SCOPE_COLORS.scope1} stopOpacity={0.05} />
        </linearGradient>
        <linearGradient id="gradScope2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={SCOPE_COLORS.scope2} stopOpacity={0.35} />
          <stop offset="95%" stopColor={SCOPE_COLORS.scope2} stopOpacity={0.05} />
        </linearGradient>
        <linearGradient id="gradScope3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={SCOPE_COLORS.scope3} stopOpacity={0.35} />
          <stop offset="95%" stopColor={SCOPE_COLORS.scope3} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="2 4" stroke={isDark ? '#334155' : '#f1f5f9'} vertical={false} />
      <XAxis
        dataKey="year"
        tick={{ fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12 }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tickFormatter={(v) => `${v.toFixed(0)}t`}
        tick={{ fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12 }}
        axisLine={false}
        tickLine={false}
        width={40}
      />
      <Tooltip
        formatter={(value, name) => [`${value.toFixed(1)} tCO₂e`, name]}
        contentStyle={{
          backgroundColor: isDark ? '#1e293b' : '#fff',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}
        cursor={{ stroke: isDark ? '#475569' : '#cbd5e1', strokeWidth: 1 }}
      />
      <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="circle" iconSize={8} />
      <Area
        type="monotone"
        dataKey="scope1"
        name="Scope 1"
        stroke={SCOPE_COLORS.scope1}
        strokeWidth={2}
        fill="url(#gradScope1)"
        dot={false}
        activeDot={{ r: 4, strokeWidth: 0 }}
      />
      <Area
        type="monotone"
        dataKey="scope2"
        name="Scope 2"
        stroke={SCOPE_COLORS.scope2}
        strokeWidth={2}
        fill="url(#gradScope2)"
        dot={false}
        activeDot={{ r: 4, strokeWidth: 0 }}
      />
      <Area
        type="monotone"
        dataKey="scope3"
        name="Scope 3"
        stroke={SCOPE_COLORS.scope3}
        strokeWidth={2}
        fill="url(#gradScope3)"
        dot={false}
        activeDot={{ r: 4, strokeWidth: 0 }}
      />
    </AreaChart>
  </ResponsiveContainer>
</div>
```

**Résultat attendu :** Courbes lisses avec zones remplies en dégradé, aspect "analytics dashboard" moderne.

---

## Changement 5 — Cartes : ombres plus légères en mode clair (lignes 327, 401, 455)

Les 3 cartes graphiques utilisent `shadow-lg`. Adoucir en `shadow-sm` pour un rendu plus plat.

```jsx
// Avant (x3 occurrences)
className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}

// Après
className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
```

Même changement pour les cartes KPI (lignes 213, 240, 269) :

```jsx
// Avant
className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}

// Après
className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
```

---

## Récapitulatif des modifications

| # | Description | Lignes concernées | Priorité |
|---|-------------|-------------------|----------|
| 1 | Adoucir la palette de couleurs | 27–47 | Haute |
| 2a | Grille quasi invisible dans le graphique Scope | 360 | Haute |
| 2b | Barres plus fines et arrondies (graphique Scope) | 374–380 | Haute |
| 3a | Traduire les libellés catégories dans le Top 10 | 420–422 | Haute |
| 3b | Barres horizontales Top 10 plus fines | 427 | Moyenne |
| 3c | Limiter Top 10 à 7 entrées (optionnel) | 166 | Basse |
| 4a | Ajouter imports `AreaChart`, `Area` | 14–24 | Haute |
| 4b | Remplacer BarChart empilé par AreaChart gradients | 461–514 | Haute |
| 5 | Ombres légères + bordure fine sur les cartes | 213, 240, 269, 327, 401, 455 | Moyenne |

---

## Notes techniques

- **Recharts version :** `3.7.0` — `AreaChart`, `Area`, `linearGradient` via `<defs>` sont supportés.
- **Framer Motion :** aucun changement nécessaire, les animations existantes sont conservées.
- **Tailwind JIT :** les nouvelles classes utilisées (`shadow-sm`, `border-gray-100`) sont des classes standard Tailwind — aucun risque de purge.
- **Traductions :** vérifier que `useLanguage()` expose `t()` ou adapter selon le système i18n du projet (voir `frontend/src/context/LanguageContext.js`).
