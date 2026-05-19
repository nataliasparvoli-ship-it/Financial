import { formatCurrency, formatCurrencyK } from "../services/currencyService.js";

/** Short currency — "R$ 1.250" / "AED 1,250" / "$ 1,250" */
export const fmt = (value) => formatCurrency(value);

/** Compact currency — "R$ 1.5M" / "AED 500K" */
export const fmtK = (value) => formatCurrencyK(value);

/**
 * Parse a currency string to float.
 * Handles pt-BR (1.250,90), en-US/AED (1,250.90), EUR (1.250,90).
 */
export const parseCurrency = (value) => {
  if (typeof value === "number") return value;

  const cleaned = String(value || "")
    .replace(/[A-Z]{2,4}/gi, "")  // remove currency codes (BRL, USD, AED, EUR…)
    .replace(/R\$/gi, "")          // explicit R$
    .replace(/\s/g, "")
    .replace(/\((.*)\)/, "-$1")
    .replace(/[^0-9,.-]/g, "");

  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot   = cleaned.lastIndexOf(".");
  const decimalSep = lastComma > lastDot ? "," : ".";
  const normalized = cleaned
    .replace(new RegExp(`\\${decimalSep === "," ? "." : ","}`, "g"), "")
    .replace(decimalSep, ".");

  return Number(normalized) || 0;
};
