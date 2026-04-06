import {
  Rocket, BarChart3, Factory, Package, Zap, Truck, Leaf
} from 'lucide-react';

export const faqCategories = [
  {
    id: 'getting-started',
    icon: Rocket,
    title_fr: 'Premiers pas',
    title_de: 'Erste Schritte',
    color: 'blue',
    questions: [
      {
        id: 'gs-1',
        question_fr: 'Comment cr\u00e9er mon premier exercice fiscal ?',
        question_de: 'Wie erstelle ich mein erstes Gesch\u00e4ftsjahr?',
        answer_fr: 'Placeholder : Explication de la cr\u00e9ation d\'un exercice fiscal avec les \u00e9tapes d\u00e9taill\u00e9es.',
        answer_de: 'Placeholder: Erkl\u00e4rung zur Erstellung eines Gesch\u00e4ftsjahres mit detaillierten Schritten.'
      },
      {
        id: 'gs-2',
        question_fr: 'Comment saisir ma premi\u00e8re activit\u00e9 ?',
        question_de: 'Wie gebe ich meine erste Aktivit\u00e4t ein?',
        answer_fr: 'Placeholder : Guide pas \u00e0 pas pour la saisie d\'une activit\u00e9 via le formulaire guid\u00e9.',
        answer_de: 'Placeholder: Schritt-f\u00fcr-Schritt-Anleitung zur Eingabe einer Aktivit\u00e4t \u00fcber das gef\u00fchrte Formular.'
      },
      {
        id: 'gs-3',
        question_fr: 'Qu\'est-ce qu\'un p\u00e9rim\u00e8tre de bilan carbone ?',
        question_de: 'Was ist ein CO2-Bilanzperimeter?',
        answer_fr: 'Placeholder : Explication du concept de p\u00e9rim\u00e8tre et comment le configurer dans l\'application.',
        answer_de: 'Placeholder: Erkl\u00e4rung des Perimeterkonzepts und wie man es in der Anwendung konfiguriert.'
      }
    ]
  },
  {
    id: 'dashboard',
    icon: BarChart3,
    title_fr: 'Tableau de bord',
    title_de: 'Dashboard',
    color: 'purple',
    questions: [
      {
        id: 'db-1',
        question_fr: 'Comment interpr\u00e9ter les KPIs affich\u00e9s ?',
        question_de: 'Wie interpretiere ich die angezeigten KPIs?',
        answer_fr: 'Placeholder : Description des diff\u00e9rents indicateurs (\u00e9missions totales, par kCHF, variation N-1) et leur signification.',
        answer_de: 'Placeholder: Beschreibung der verschiedenen Indikatoren (Gesamtemissionen, pro kCHF, Variation N-1) und ihre Bedeutung.'
      },
      {
        id: 'db-2',
        question_fr: 'Comment fonctionne la comparaison entre exercices ?',
        question_de: 'Wie funktioniert der Vergleich zwischen Gesch\u00e4ftsjahren?',
        answer_fr: 'Placeholder : Explication du graphique d\'\u00e9volution et des variations ann\u00e9e par ann\u00e9e.',
        answer_de: 'Placeholder: Erkl\u00e4rung des Entwicklungsdiagramms und der j\u00e4hrlichen Variationen.'
      },
      {
        id: 'db-3',
        question_fr: 'Comment d\u00e9finir un objectif SBTi ?',
        question_de: 'Wie definiere ich ein SBTi-Ziel?',
        answer_fr: 'Placeholder : Guide pour configurer un objectif de r\u00e9duction align\u00e9 sur les Science Based Targets.',
        answer_de: 'Placeholder: Anleitung zur Konfiguration eines Reduktionsziels gem\u00e4\u00df den Science Based Targets.'
      }
    ]
  },
  {
    id: 'scopes',
    icon: Factory,
    title_fr: 'Scopes & Cat\u00e9gories',
    title_de: 'Scopes & Kategorien',
    color: 'amber',
    questions: [
      {
        id: 'sc-1',
        question_fr: 'Quelle est la diff\u00e9rence entre Scope 1, 2 et 3 ?',
        question_de: 'Was ist der Unterschied zwischen Scope 1, 2 und 3?',
        answer_fr: 'Placeholder : Explication des 3 scopes selon le GHG Protocol avec des exemples concrets.',
        answer_de: 'Placeholder: Erkl\u00e4rung der 3 Scopes gem\u00e4\u00df dem GHG Protocol mit konkreten Beispielen.'
      },
      {
        id: 'sc-2',
        question_fr: 'Qu\'est-ce qu\'un facteur multi-impacts ?',
        question_de: 'Was ist ein Multi-Impact-Faktor?',
        answer_fr: 'Placeholder : Explication des facteurs qui g\u00e9n\u00e8rent des \u00e9missions sur plusieurs scopes (ex: combustibles).',
        answer_de: 'Placeholder: Erkl\u00e4rung der Faktoren, die Emissionen in mehreren Scopes erzeugen (z.B. Brennstoffe).'
      },
      {
        id: 'sc-3',
        question_fr: 'Comment sont calcul\u00e9es les \u00e9missions du Scope 3.3 ?',
        question_de: 'Wie werden die Emissionen von Scope 3.3 berechnet?',
        answer_fr: 'Placeholder : D\u00e9tail du calcul automatique des \u00e9missions amont li\u00e9es aux combustibles et \u00e0 l\'\u00e9nergie.',
        answer_de: 'Placeholder: Details zur automatischen Berechnung der vorgelagerten Emissionen aus Brennstoffen und Energie.'
      }
    ]
  },
  {
    id: 'products',
    icon: Package,
    title_fr: 'Produits vendus',
    title_de: 'Verkaufte Produkte',
    color: 'green',
    questions: [
      {
        id: 'pr-1',
        question_fr: 'Comment cr\u00e9er une fiche produit ?',
        question_de: 'Wie erstelle ich eine Produktkarte?',
        answer_fr: 'Placeholder : Guide pour cr\u00e9er une fiche produit avec les mati\u00e8res, la dur\u00e9e de vie et les param\u00e8tres de fin de vie.',
        answer_de: 'Placeholder: Anleitung zur Erstellung einer Produktkarte mit Materialien, Lebensdauer und End-of-Life-Parametern.'
      },
      {
        id: 'pr-2',
        question_fr: 'Comment enregistrer des ventes ?',
        question_de: 'Wie erfasse ich Verk\u00e4ufe?',
        answer_fr: 'Placeholder : Explication du processus d\'enregistrement des ventes et de leur impact sur le bilan carbone.',
        answer_de: 'Placeholder: Erkl\u00e4rung des Verkaufserfassungsprozesses und seiner Auswirkungen auf die CO2-Bilanz.'
      },
      {
        id: 'pr-3',
        question_fr: 'Comment fonctionnent les profils d\'\u00e9mission par exercice ?',
        question_de: 'Wie funktionieren Emissionsprofile pro Gesch\u00e4ftsjahr?',
        answer_fr: 'Placeholder : Explication du syst\u00e8me de versioning des profils produits par exercice fiscal.',
        answer_de: 'Placeholder: Erkl\u00e4rung des Versionierungssystems f\u00fcr Produktprofile pro Gesch\u00e4ftsjahr.'
      }
    ]
  }
];

export const scopeConfig = {
  scope1: { color: 'blue', label_fr: 'Scope 1', label_de: 'Scope 1', icon: Factory },
  scope2: { color: 'cyan', label_fr: 'Scope 2', label_de: 'Scope 2', icon: Zap },
  scope3_amont: { color: 'amber', label_fr: 'Scope 3 Amont', label_de: 'Scope 3 Upstream', icon: Truck },
  scope3_aval: { color: 'indigo', label_fr: 'Scope 3 Aval', label_de: 'Scope 3 Downstream', icon: Leaf },
  scope3_3: { color: 'orange', label_fr: 'Scope 3.3', label_de: 'Scope 3.3', icon: Zap },
  scope3: { color: 'purple', label_fr: 'Scope 3', label_de: 'Scope 3', icon: Truck }
};
