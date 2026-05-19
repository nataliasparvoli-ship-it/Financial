const LOCALE_KEY = "auren.locale.v1";

/* ─── Country / locale config ─────────────────────────────────────────────── */

export const SUPPORTED_COUNTRIES = [
  { id: "BR", name: "Brasil",          flag: "🇧🇷", currency: "BRL", locale: "pt-BR", timezone: "America/Sao_Paulo" },
  { id: "EC", name: "Equador",         flag: "🇪🇨", currency: "USD", locale: "es-EC", timezone: "America/Guayaquil" },
  { id: "AE", name: "Emirados Árabes", flag: "🇦🇪", currency: "AED", locale: "ar-AE", timezone: "Asia/Dubai" },
];

export const SUPPORTED_CURRENCIES = [
  { code: "BRL", label: "R$ · Real Brasileiro" },
  { code: "USD", label: "$ · Dólar Americano" },
  { code: "AED", label: "AED · Dirham Emiratense" },
];

const COUNTRY_MAP = Object.fromEntries(SUPPORTED_COUNTRIES.map((c) => [c.id, c]));

const DEFAULT_LOCALE = COUNTRY_MAP.BR;

/* ─── Storage ─────────────────────────────────────────────────────────────── */

export const saveUserLocale = (config) => {
  try { localStorage.setItem(LOCALE_KEY, JSON.stringify(config)); } catch {}
};

export const getUserLocale = () => {
  try {
    const raw = localStorage.getItem(LOCALE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
};

export const getLocaleForCountry = (countryId, currencyOverride = null) => {
  const base = COUNTRY_MAP[countryId] ?? DEFAULT_LOCALE;
  return currencyOverride ? { ...base, currency: currencyOverride } : base;
};
