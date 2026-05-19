import { createContext, useContext, useMemo, useState } from "react";
import { loadOnboarding, saveOnboarding } from "../storage/onboardingStorage";
import { loadGoals, saveGoals } from "../storage/goalsStorage";
import { getDashboardConfig } from "../services/goalEngine";
import { saveUserLocale, getLocaleForCountry } from "../services/localeService";

const AppContext = createContext(null);

const DEFAULT_ONBOARDING = { completed: false, profile: null, institutions: [] };

export function AppProvider({ children }) {
  const [onboarding, setOnboarding] = useState(() => loadOnboarding() ?? DEFAULT_ONBOARDING);
  const [goals, setGoals]           = useState(loadGoals);

  const completeOnboarding = (data) => {
    const updated = { ...data, completed: true };
    setOnboarding(updated);
    saveOnboarding(updated);
    if (data.profile?.country) {
      const localeConfig = getLocaleForCountry(data.profile.country, data.profile.currency);
      saveUserLocale(localeConfig);
    }
  };

  const updateGoals = (newGoals) => {
    setGoals(newGoals);
    saveGoals(newGoals);
  };

  const resetOnboarding = () => {
    setOnboarding(DEFAULT_ONBOARDING);
    saveOnboarding(DEFAULT_ONBOARDING);
  };

  const dashboardConfig = useMemo(
    () => getDashboardConfig(
      onboarding.profile?.primaryGoal,
      onboarding.profile?.secondaryGoals,
    ),
    [onboarding.profile?.primaryGoal, onboarding.profile?.secondaryGoals]
  );

  return (
    <AppContext.Provider value={{
      isOnboardingComplete: onboarding.completed,
      profile: onboarding.profile,
      institutions: onboarding.institutions ?? [],
      goals,
      dashboardConfig,
      completeOnboarding,
      updateGoals,
      resetOnboarding,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
