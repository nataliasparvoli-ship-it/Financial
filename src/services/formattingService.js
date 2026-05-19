/**
 * Unified formatting entry point.
 * Import from here for any display formatting need.
 */
import { getUserLocale } from "./localeService.js";
export { formatCurrency, formatCurrencyFull, formatCurrencyK } from "./currencyService.js";

/* ─── Date formatting ─────────────────────────────────────────────────────── */

export const formatDate = (date, localeConfig = null) => {
  const { locale } = localeConfig ?? getUserLocale();
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale).format(d);
  } catch {
    return String(date);
  }
};

export const formatDateToday = (localeConfig = null) => {
  const { locale } = localeConfig ?? getUserLocale();
  try {
    return new Date().toLocaleDateString(locale);
  } catch {
    return new Date().toLocaleDateString();
  }
};

/* ─── Number formatting ───────────────────────────────────────────────────── */

export const formatNumber = (value, decimals = 0, localeConfig = null) => {
  const { locale } = localeConfig ?? getUserLocale();
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  } catch {
    return n.toFixed(decimals);
  }
};
