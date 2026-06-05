const LANGUAGE_KEY = "auren.language.v1";

export const SUPPORTED_LANGUAGES = [
  { code: "pt-BR", label: "Português" },
  { code: "en",    label: "English"   },
];

export const DEFAULT_LANGUAGE = "pt-BR";

export const saveLanguage = (code) => {
  try { localStorage.setItem(LANGUAGE_KEY, code); } catch {}
};

export const getLanguage = () => {
  try { return localStorage.getItem(LANGUAGE_KEY) ?? DEFAULT_LANGUAGE; } catch { return DEFAULT_LANGUAGE; }
};
