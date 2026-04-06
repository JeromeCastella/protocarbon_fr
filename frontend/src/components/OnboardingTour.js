import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import logger from '../utils/logger';

import { API_URL } from '../utils/apiConfig';

const OnboardingTour = () => {
  const { isDark } = useTheme();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const language = user?.language || 'fr';

  // Define tour steps with bilingual content
  const steps = useMemo(() => [
    {
      target: '[data-testid="fiscal-year-selector"]',
      content: language === 'fr'
        ? 'Sélectionnez ici l\'exercice fiscal sur lequel vous travaillez. Chaque exercice correspond à une année de reporting.'
        : 'Wählen Sie hier das Geschäftsjahr, an dem Sie arbeiten. Jedes Jahr entspricht einem Berichtszeitraum.',
      title: language === 'fr' ? 'Exercice fiscal' : 'Geschäftsjahr',
      disableBeacon: true,
      placement: 'bottom',
      route: '/dashboard'
    },
    {
      target: '[data-testid="nav-data-entry"]',
      content: language === 'fr'
        ? 'C\'est ici que vous saisissez vos données d\'émissions, organisées par scope et catégorie GHG Protocol.'
        : 'Hier geben Sie Ihre Emissionsdaten ein, organisiert nach Scope und GHG-Protokoll-Kategorie.',
      title: language === 'fr' ? 'Saisie des données' : 'Dateneingabe',
      disableBeacon: true,
      placement: 'right',
      route: '/dashboard'
    },
    {
      target: '[data-testid="scope-tab-scope1"]',
      content: language === 'fr'
        ? 'Chaque onglet correspond à un scope du GHG Protocol. Cliquez sur une catégorie pour y ajouter des activités.'
        : 'Jeder Tab entspricht einem Scope des GHG-Protokolls. Klicken Sie auf eine Kategorie, um Aktivitäten hinzuzufügen.',
      title: language === 'fr' ? 'Scopes et catégories' : 'Scopes und Kategorien',
      disableBeacon: true,
      placement: 'bottom',
      route: '/data-entry'
    },
    {
      target: '[data-testid="nav-products"]',
      content: language === 'fr'
        ? 'Créez des fiches produit pour calculer automatiquement les émissions du Scope 3 Aval (cycle de vie).'
        : 'Erstellen Sie Produktblätter zur automatischen Berechnung der Scope-3-Downstream-Emissionen (Lebenszyklus).',
      title: language === 'fr' ? 'Fiches produit' : 'Produktblätter',
      disableBeacon: true,
      placement: 'right',
      route: '/data-entry'
    },
    {
      target: '[data-testid="nav-dashboard"]',
      content: language === 'fr'
        ? 'Consultez vos résultats, définissez des objectifs de réduction et comparez avec des scénarios de décarbonation.'
        : 'Sehen Sie Ihre Ergebnisse ein, setzen Sie Reduktionsziele und vergleichen Sie mit Dekarbonisierungsszenarien.',
      title: language === 'fr' ? 'Tableau de bord' : 'Dashboard',
      disableBeacon: true,
      placement: 'right',
      route: '/data-entry'
    }
  ], [language]);

  // Auto-trigger on first login
  useEffect(() => {
    if (user && user.onboarding_completed === false && !run) {
      // Small delay to let the page render
      const timer = setTimeout(() => setRun(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user, run]);

  // Navigate to correct page before showing step
  const handleStepChange = useCallback((data) => {
    const { index, action, status, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setStepIndex(0);
      // Mark onboarding as completed
      axios.post(`${API_URL}/api/auth/onboarding/complete`).catch(() => {});
      if (setUser && user) {
        setUser({ ...user, onboarding_completed: true });
      }
      return;
    }

    if (type === 'step:after') {
      const nextIndex = action === 'prev' ? index - 1 : index + 1;
      if (nextIndex >= 0 && nextIndex < steps.length) {
        const nextRoute = steps[nextIndex].route;
        if (nextRoute && location.pathname !== nextRoute) {
          navigate(nextRoute);
          // Wait for navigation + render before showing next step
          setTimeout(() => setStepIndex(nextIndex), 400);
          return;
        }
      }
      setStepIndex(nextIndex);
    }
  }, [location.pathname, navigate, steps, user, setUser]);

  // Custom tooltip styles
  const joyrideStyles = {
    options: {
      arrowColor: isDark ? '#1e293b' : '#ffffff',
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      primaryColor: '#6366f1',
      textColor: isDark ? '#e2e8f0' : '#1e293b',
      zIndex: 10000,
    },
    tooltipTitle: {
      fontSize: '15px',
      fontWeight: 600,
    },
    tooltipContent: {
      fontSize: '13px',
      lineHeight: '1.5',
      padding: '8px 0',
    },
    buttonNext: {
      backgroundColor: '#6366f1',
      borderRadius: '8px',
      fontSize: '13px',
      padding: '6px 16px',
    },
    buttonBack: {
      color: isDark ? '#94a3b8' : '#6b7280',
      fontSize: '13px',
    },
    buttonSkip: {
      color: isDark ? '#64748b' : '#9ca3af',
      fontSize: '12px',
    },
    spotlight: {
      borderRadius: '12px',
    },
    tooltip: {
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    }
  };

  const locale = language === 'fr'
    ? { back: 'Retour', close: 'Fermer', last: 'Terminer', next: 'Suivant', skip: 'Passer' }
    : { back: 'Zurück', close: 'Schließen', last: 'Fertig', next: 'Weiter', skip: 'Überspringen' };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      spotlightClicks={false}
      callback={handleStepChange}
      styles={joyrideStyles}
      locale={locale}
      floaterProps={{ disableAnimation: true }}
    />
  );
};

// Export start function for re-triggering
export const useOnboarding = () => {
  const { user, setUser } = useAuth();

  const restartTour = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/onboarding/reset`);
      if (setUser && user) {
        setUser({ ...user, onboarding_completed: false });
      }
    } catch (error) {
      logger.error('Failed to reset onboarding:', error);
    }
  };

  return { restartTour };
};

export default OnboardingTour;
