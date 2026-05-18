import {
  EMPTY_IMPORTED_DATA,
  ensureImportedDataShape,
} from "../parsers/normalizeData.js";

export const STORAGE_KEY = "financial-dashboard.importedData.v1";
export const STORAGE_VERSION = 1;

const createEnvelope = (data) => ({
  version: STORAGE_VERSION,
  savedAt: new Date().toISOString(),
  data: ensureImportedDataShape(data),
});

const migratePersistedValue = (value) => {
  if (!value || typeof value !== "object") return EMPTY_IMPORTED_DATA;

  if (value.version === STORAGE_VERSION && value.data) {
    return ensureImportedDataShape(value.data);
  }

  // Backward compatibility: previous builds persisted the raw dataset object.
  if (
    Array.isArray(value.transacoes) ||
    Array.isArray(value.patrimonio) ||
    Array.isArray(value.classe) ||
    Array.isArray(value.banco) ||
    Array.isArray(value.rendaPassiva)
  ) {
    return ensureImportedDataShape(value);
  }

  return EMPTY_IMPORTED_DATA;
};

export const loadFinancialData = () => {
  if (typeof window === "undefined") return EMPTY_IMPORTED_DATA;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? migratePersistedValue(JSON.parse(raw)) : EMPTY_IMPORTED_DATA;
  } catch {
    return EMPTY_IMPORTED_DATA;
  }
};

export const saveFinancialData = (data) => {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(createEnvelope(data)),
    );
    return true;
  } catch {
    // localStorage can be unavailable, disabled or full; keep the app usable in-memory.
    return false;
  }
};

export const __privateStorageForTests = {
  createEnvelope,
  migratePersistedValue,
};
