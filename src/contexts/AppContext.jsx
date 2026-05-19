import { createContext, useContext, useState } from "react";
import { loadOnboarding, saveOnboarding } from "../storage/onboardingStorage";
import { loadGoals, saveGoals } from "../storage/goalsStorage";

const AppContext = createContext(null);

const DEFAULT_ONBOARDING = { completed: false, profile: null, institutions: [] };

export function AppProvider({ children }) {
  const [onboarding, setOnboarding] = useState(() => loadOnboarding() ?? DEFAULT_ONBOARDING);
  const [goals, setGoals] = useState(loadGoals);

  const completeOnboarding = (data) => {
    const updated = { ...data, completed: true };
    setOnboarding(updated);
    saveOnboarding(updated);
  };

  const updateGoals = (newGoals) => {
    setGoals(newGoals);
    saveGoals(newGoals);
  };

  const resetOnboarding = () => {
    setOnboarding(DEFAULT_ONBOARDING);
    saveOnboarding(DEFAULT_ONBOARDING);
  };

  return (
    <AppContext.Provider value={{
      isOnboardingComplete: onboarding.completed,
      profile: onboarding.profile,
      institutions: onboarding.institutions ?? [],
      goals,
      completeOnboarding,
      updateGoals,
      resetOnboarding,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
