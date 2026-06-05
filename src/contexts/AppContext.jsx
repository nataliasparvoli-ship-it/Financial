import { createContext, useContext, useMemo, useState } from "react";
import { loadOnboarding, saveOnboarding } from "../storage/onboardingStorage";
import { loadGoals, saveGoals } from "../storage/goalsStorage";
import { getDashboardConfig } from "../services/goalEngine";
import { saveUserLocale, getLocaleForCountry } from "../services/localeService";
import { MONTHS } from "../utils/deriveMetrics";

const AppContext = createContext(null);

const DEFAULT_ONBOARDING = { completed: false, profile: null, institutions: [] };

// referenceMonth format: { month: "Jan", year: 2026 }
// Defaults to the current calendar month so new users always see a real date.
function currentCalendarMonth() {
  const now = new Date();
  return { month: MONTHS[now.getMonth()], year: now.getFullYear() };
}

function loadReferenceMonth() {
  try {
    const raw = localStorage.getItem("referenceMonth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && MONTHS.includes(parsed.month) && typeof parsed.year === "number") {
      return parsed;
    }
  } catch (_) {}
  return null;
}

function saveReferenceMonth(value) {
  try { localStorage.setItem("referenceMonth", JSON.stringify(value)); } catch (_) {}
}

// ── Goal target year ───────────────────────────────────────────────────────
function loadGoalTargetYear() {
  try {
    const raw = localStorage.getItem("goalTargetYear");
    if (raw) {
      const n = parseInt(raw, 10);
      if (n >= 2024 && n <= 2100) return n;
    }
  } catch (_) {}
  return null;
}

function saveGoalTargetYear(year) {
  try {
    if (year == null) localStorage.removeItem("goalTargetYear");
    else localStorage.setItem("goalTargetYear", String(year));
  } catch (_) {}
}

export function AppProvider({ children }) {
  const [onboarding, setOnboarding] = useState(() => loadOnboarding() ?? DEFAULT_ONBOARDING);
  const [goals, setGoals]           = useState(loadGoals);
  const [referenceMonth, setReferenceMonthState] = useState(
    () => loadReferenceMonth() ?? currentCalendarMonth(),
  );
  const [goalTargetYear, setGoalTargetYearState] = useState(loadGoalTargetYear);

  const setReferenceMonth = (value) => {
    setReferenceMonthState(value);
    saveReferenceMonth(value);
  };

  const setGoalTargetYear = (year) => {
    setGoalTargetYearState(year);
    saveGoalTargetYear(year);
  };

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
      referenceMonth,
      setReferenceMonth,
      goalTargetYear,
      setGoalTargetYear,
      completeOnboarding,
      updateGoals,
      resetOnboarding,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
