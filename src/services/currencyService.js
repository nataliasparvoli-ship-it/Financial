import { getUserLocale } from "./localeService.js";

/* ─── Symbol extraction ───────────────────────────────────────────────────── */

const symbolCache = {};

const getCurrencySymbol = (locale, currency) => {
  const key = `${locale}:${currency}`;
  if (symbolCache[key]) return symbolCache[key];
  try {
    const parts = new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0);
    const sym = parts.find((p) => p.type === "currency")?.value ?? currency;
    symbolCache[key] = sym;
    return sym;
  } catch {
    symbolCache[key] = currency;
    return currency;
  }
};

/* ─── Formatting ──────────────────────────────────────────────────────────── */

/**
 * Full precision currency — e.g. "R$ 1.250" / "AED 1,250" / "$ 1,250"
 */
export const formatCurrency = (value, localeConfig = null) => {
  const { locale, currency } = localeConfig ?? getUserLocale();
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(0)}`;
  }
};

/**
 * Full precision with cents — e.g. "R$ 1.250,90" / "AED 1,250.90"
 */
export const formatCurrencyFull = (value, localeConfig = null) => {
  const { locale, currency } = localeConfig ?? getUserLocale();
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
};

/**
 * Compact — e.g. "R$ 1.5M" / "AED 500K" / "$ 1.2K"
 */
export const formatCurrencyK = (value, localeConfig = null) => {
  const config = localeConfig ?? getUserLocale();
  const { locale, currency } = config;
  const n = Number(value || 0);
  const abs = Math.abs(n);
  const sym = getCurrencySymbol(locale, currency);

  if (abs >= 1e6) return `${sym} ${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sym} ${(n / 1e3).toFixed(0)}K`;
  return formatCurrency(n, config);
};
