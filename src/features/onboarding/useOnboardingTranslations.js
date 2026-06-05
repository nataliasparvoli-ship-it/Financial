import { useMemo } from "react";
import { ONBOARDING_TRANSLATIONS, FALLBACK_LANGUAGE } from "./translations.js";

/**
 * Returns the translation object for the current onboarding language.
 *
 * Usage:
 *   const t = useOnboardingTranslations(language);
 *   <h2>{t.welcome.tagline}</h2>
 *
 * Reactivity: because the hook re-runs whenever `language` changes,
 * every component that receives `t` as a prop will re-render instantly
 * with new copy — no reload, no flickering.
 *
 * Scalability: to add a new language, add a new key to ONBOARDING_TRANSLATIONS.
 * No other code changes are required.
 */
export function useOnboardingTranslations(language) {
  return useMemo(
    () => ONBOARDING_TRANSLATIONS[language] ?? ONBOARDING_TRANSLATIONS[FALLBACK_LANGUAGE],
    [language],
  );
}
