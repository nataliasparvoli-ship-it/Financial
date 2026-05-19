const KEY = "auren.onboarding.v1";

export const saveOnboarding = (data) => {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
};

export const loadOnboarding = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
};

export const isOnboardingComplete = () => loadOnboarding()?.completed === true;

export const clearOnboarding = () => {
  try { localStorage.removeItem(KEY); } catch {}
};
