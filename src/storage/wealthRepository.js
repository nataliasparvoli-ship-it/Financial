/**
 * @fileoverview Repositório do WealthState — camada entre domínio e storage.
 *
 * WealthContext usa este repositório, nunca o adapter diretamente.
 * Isso permite:
 *   • Trocar o backend de storage sem tocar no domínio
 *   • Testar WealthContext com um adapter in-memory
 *   • Migrar para Firebase/IndexedDB/sync trocando apenas o adapter injetado
 *
 * Interface do repositório:
 *   load()       → WealthState | EMPTY_WEALTH_STATE
 *   save(state)  → boolean
 *   clearLegacy() → void   (remove chaves legadas — apenas em clearAll)
 *
 * @module storage/wealthRepository
 */

import { localStorageAdapter } from "./adapters/localStorageAdapter.js";
import {
  WEALTH_STORAGE_KEY,
  SCHEMA_VERSION,
  EMPTY_WEALTH_STATE,
  LEGACY_DATA_KEY,
  LEGACY_INVESTMENTS_KEY,
  LEGACY_IMAGES_KEY,
  MIGRATION_FLAG_KEY,
  hasLegacyData,
} from "./wealthStorage.js";

// ── Shape guard ───────────────────────────────────────────────────────────

/** @param {unknown} raw @returns {import("../domain/types.js").WealthState} */
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

// ── Factory ───────────────────────────────────────────────────────────────

/**
 * Cria um WealthRepository usando o adapter fornecido.
 * Padrão: localStorage. Em testes: adapter in-memory.
 *
 * @param {import("./adapters/localStorageAdapter.js").StorageAdapter} adapter
 * @returns {{ load: () => import("../domain/types.js").WealthState, save: (state: any) => boolean, clearLegacy: () => void, hasLegacy: () => boolean }}
 */
export const createWealthRepository = (adapter) => ({
  load() {
    const raw = adapter.read(WEALTH_STORAGE_KEY);
    if (!raw) return { ...EMPTY_WEALTH_STATE };
    if (raw.schemaVersion !== SCHEMA_VERSION) return { ...EMPTY_WEALTH_STATE };
    return ensureShape(raw);
  },

  save(state) {
    return adapter.write(WEALTH_STORAGE_KEY, state);
  },

  clearLegacy() {
    [LEGACY_DATA_KEY, LEGACY_INVESTMENTS_KEY, LEGACY_IMAGES_KEY, MIGRATION_FLAG_KEY]
      .forEach((key) => adapter.remove(key));
  },

  hasLegacy: () => hasLegacyData(),
});

// ── Instância padrão (localStorage) ───────────────────────────────────────

export const defaultWealthRepository = createWealthRepository(localStorageAdapter);

// ── Adapter in-memory para testes ─────────────────────────────────────────

/**
 * Cria um adapter in-memory, sem side effects.
 * Útil para unit tests e storybook.
 *
 * @param {Record<string, unknown>} [initialData]
 * @returns {import("./adapters/localStorageAdapter.js").StorageAdapter}
 */
export const createInMemoryAdapter = (initialData = {}) => {
  const store = { ...initialData };
  return {
    read: (key) => store[key] ?? null,
    write: (key, value) => { store[key] = value; return true; },
    remove: (key) => { delete store[key]; return true; },
    has: (key) => key in store,
  };
};
