/**
 * @fileoverview Camada de persistência do WealthState.
 *
 * Chave: "vyta.wealth.v2"
 * Schema version: 2
 *
 * Estratégia de compatibilidade:
 *   • Se a chave não existir → retorna estado vazio
 *   • Se schemaVersion divergir → retorna estado vazio (não migra aqui)
 *   • A migração v1→v2 é responsabilidade de storage/migration.js
 *
 * Chaves legadas (preservadas até clearAll):
 *   "financial-dashboard.importedData.v1"
 *   "financial-dashboard.investments.v2"
 *   "financial-dashboard.investmentImages.v1"
 *
 * @module storage/wealthStorage
 */

export const WEALTH_STORAGE_KEY = "vyta.wealth.v2";
export const SCHEMA_VERSION = 2;

// Chaves legadas — referenciadas aqui para evitar strings mágicas espalhadas
export const LEGACY_DATA_KEY       = "financial-dashboard.importedData.v1";
export const LEGACY_INVESTMENTS_KEY = "financial-dashboard.investments.v2";
export const LEGACY_IMAGES_KEY     = "financial-dashboard.investmentImages.v1";
export const LEGACY_ONBOARDING_KEY = "auren.onboarding.v1";
export const MIGRATION_FLAG_KEY    = "vyta.migration.v2.completed";

/** @type {import("../domain/types.js").WealthState} */
export const EMPTY_WEALTH_STATE = {
  schemaVersion: SCHEMA_VERSION,
  migratedAt: null,
  holdings: [],
  cashBalances: [],
  snapshots: [],
  transactions: [],
  passiveIncome: [],
  goals: [],
  imageRegistry: [],
};

/**
 * Garante que o estado carregado tenha todos os campos esperados.
 * Protege contra versões antigas do schema que não tinham algum campo.
 *
 * @param {unknown} raw
 * @returns {import("../domain/types.js").WealthState}
 */
const ensureShape = (raw) => {
  if (!raw || typeof raw !== "object") return EMPTY_WEALTH_STATE;
  return {
    schemaVersion: SCHEMA_VERSION,
    migratedAt:    raw.migratedAt    ?? null,
    holdings:      Array.isArray(raw.holdings)      ? raw.holdings      : [],
    cashBalances:  Array.isArray(raw.cashBalances)  ? raw.cashBalances  : [],
    snapshots:     Array.isArray(raw.snapshots)     ? raw.snapshots     : [],
    transactions:  Array.isArray(raw.transactions)  ? raw.transactions  : [],
    passiveIncome: Array.isArray(raw.passiveIncome) ? raw.passiveIncome : [],
    goals:         Array.isArray(raw.goals)         ? raw.goals         : [],
    imageRegistry: Array.isArray(raw.imageRegistry) ? raw.imageRegistry : [],
  };
};

/**
 * Carrega o WealthState do localStorage.
 * @returns {import("../domain/types.js").WealthState}
 */
export const loadWealthState = () => {
  if (typeof window === "undefined") return EMPTY_WEALTH_STATE;
  try {
    const raw = window.localStorage.getItem(WEALTH_STORAGE_KEY);
    if (!raw) return EMPTY_WEALTH_STATE;
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== SCHEMA_VERSION) return EMPTY_WEALTH_STATE;
    return ensureShape(parsed);
  } catch {
    return EMPTY_WEALTH_STATE;
  }
};

/**
 * Persiste o WealthState no localStorage.
 * Silencia erros (localStorage pode estar cheio ou desabilitado).
 *
 * @param {import("../domain/types.js").WealthState} state
 * @returns {boolean} Sucesso
 */
export const saveWealthState = (state) => {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(WEALTH_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};

/**
 * Remove as chaves legadas do localStorage.
 * Chamado APENAS em clearAll — nunca automaticamente.
 */
export const clearLegacyStorage = () => {
  if (typeof window === "undefined") return;
  const keys = [
    LEGACY_DATA_KEY,
    LEGACY_INVESTMENTS_KEY,
    LEGACY_IMAGES_KEY,
    MIGRATION_FLAG_KEY,
  ];
  keys.forEach((k) => {
    try { window.localStorage.removeItem(k); } catch {}
  });
};

/**
 * Verifica se há dados legados que ainda não foram migrados.
 * @returns {boolean}
 */
export const hasLegacyData = () => {
  if (typeof window === "undefined") return false;
  try {
    const hasMigrated = Boolean(window.localStorage.getItem(MIGRATION_FLAG_KEY));
    if (hasMigrated) return false;
    const hasData = Boolean(window.localStorage.getItem(LEGACY_DATA_KEY));
    const hasInvest = Boolean(window.localStorage.getItem(LEGACY_INVESTMENTS_KEY));
    return hasData || hasInvest;
  } catch {
    return false;
  }
};
