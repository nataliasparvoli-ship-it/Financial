import { CATEGORY_ALIASES, INVALID_CATEGORY_ALIASES } from "./categoryAliases.js";
import { CATEGORY_RULES } from "./categoryRules.js";
import { normalizeMerchant } from "./normalizeMerchant.js";
import { loadUserRules } from "../storage/userRulesStorage.js";

const STORAGE_KEY = "financial-dashboard.userRules.v1";

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
  if (INVALID_CATEGORY_ALIASES.has(key) || INVALID_CATEGORY_ALIASES.has(raw.toLowerCase())) return "";
  return aliases[key] || raw;
};

const normalizePattern = (pattern, matchType) =>
  matchType === "regex" ? pattern : normalizeMerchant(pattern);

const matchesRule = (merchant, rule) =>
  rule.match.some((pattern) => {
    if (rule.matchType === "regex") return new RegExp(pattern, "i").test(merchant);
    const normalizedPattern = normalizePattern(pattern, rule.matchType);
    if (rule.matchType === "exact") return merchant === normalizedPattern;
    return merchant.includes(normalizedPattern);
  });

// Score based on match quality and rule priority
const computeConfidence = (rule, matchType) => {
  if (matchType === "exact") return 1.0;
  const base = Math.min(rule.priority / 200, 0.95);
  if (rule.source === "user") return Math.min(base + 0.1, 1.0);
  return base;
};

const prepareRules = (rules) =>
  [...rules].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

export const applyCategoryRules = ({
  category,
  description,
  rules = CATEGORY_RULES,
  aliases = CATEGORY_ALIASES,
  userRules = null,
}) => {
  // 1. Use imported category if valid
  const importedCategory = normalizeCategory(category, aliases);
  if (importedCategory) {
    return {
      category: importedCategory,
      source: "imported",
      confidence: 1.0,
      ruleId: null,
      normalizedMerchant: normalizeMerchant(description),
      matched: true,
    };
  }

  const normalizedMerchant = normalizeMerchant(description);

  // 2. User-learned rules have highest priority
  const effectiveUserRules = userRules ?? loadUserRules();
  const matchedUserRule = effectiveUserRules.find((rule) => matchesRule(normalizedMerchant, rule));
  if (matchedUserRule) {
    return {
      category: matchedUserRule.category,
      source: "user",
      confidence: 1.0,
      ruleId: matchedUserRule.id,
      normalizedMerchant,
      matched: true,
    };
  }

  // 3. System rules
  const matchedRule = prepareRules(rules).find((rule) => matchesRule(normalizedMerchant, rule));
  if (matchedRule) {
    return {
      category: matchedRule.category,
      source: "auto",
      confidence: computeConfidence(matchedRule, matchedRule.matchType),
      ruleId: matchedRule.id,
      normalizedMerchant,
      matched: true,
    };
  }

  // 4. Fallback
  return {
    category: "Outros",
    source: "fallback",
    confidence: 0,
    ruleId: null,
    normalizedMerchant,
    matched: false,
  };
};
