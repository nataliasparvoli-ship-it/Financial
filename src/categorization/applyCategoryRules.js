import {
  CATEGORY_ALIASES,
  INVALID_CATEGORY_ALIASES,
} from "./categoryAliases.js";
import { CATEGORY_RULES } from "./categoryRules.js";
import { normalizeMerchant } from "./normalizeMerchant.js";

const normalizeCategoryKey = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, "_")
    .replace(/^_|_$/g, "");

export const normalizeCategory = (category, aliases = CATEGORY_ALIASES) => {
  const raw = String(category || "").trim();
  const key = normalizeCategoryKey(raw);

  if (
    INVALID_CATEGORY_ALIASES.has(key) ||
    INVALID_CATEGORY_ALIASES.has(raw.toLowerCase())
  ) {
    return "";
  }

  return aliases[key] || raw;
};

const normalizePattern = (pattern, matchType) =>
  matchType === "regex" ? pattern : normalizeMerchant(pattern);

const matchesRule = (merchant, rule) =>
  rule.match.some((pattern) => {
    if (rule.matchType === "regex") {
      return new RegExp(pattern, "i").test(merchant);
    }

    const normalizedPattern = normalizePattern(pattern, rule.matchType);

    if (rule.matchType === "exact") {
      return merchant === normalizedPattern;
    }

    return merchant.includes(normalizedPattern);
  });

const prepareRules = (rules) =>
  [...rules].sort(
    (a, b) => b.priority - a.priority || a.id.localeCompare(b.id),
  );

export const applyCategoryRules = ({
  category,
  description,
  rules = CATEGORY_RULES,
  aliases = CATEGORY_ALIASES,
}) => {
  const importedCategory = normalizeCategory(category, aliases);

  if (importedCategory) {
    return {
      category: importedCategory,
      source: "imported",
      ruleId: null,
      normalizedMerchant: normalizeMerchant(description),
      matched: true,
    };
  }

  const normalizedMerchant = normalizeMerchant(description);
  const matchedRule = prepareRules(rules).find((rule) =>
    matchesRule(normalizedMerchant, rule),
  );

  if (matchedRule) {
    return {
      category: matchedRule.category,
      source: "auto",
      ruleId: matchedRule.id,
      normalizedMerchant,
      matched: true,
    };
  }

  return {
    category: "Outros",
    source: "fallback",
    ruleId: null,
    normalizedMerchant,
    matched: false,
  };
};
