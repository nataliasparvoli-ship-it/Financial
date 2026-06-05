/**
 * @fileoverview Adapter localStorage para o repositório de domínio.
 *
 * Implementa a interface StorageAdapter.
 * Isola todo acesso ao localStorage neste arquivo.
 *
 * Para migrar para IndexedDB, Firebase ou outro backend:
 *   → criar novo adapter implementando a mesma interface
 *   → trocar a instância passada para createWealthRepository()
 *   → WealthContext não muda
 *
 * @typedef {Object} StorageAdapter
 * @property {(key: string) => unknown} read       Lê e parseia JSON. Null se ausente/erro.
 * @property {(key: string, value: unknown) => boolean} write  Serializa e grava. False se falhar.
 * @property {(key: string) => boolean}  remove    Remove a chave. False se falhar.
 * @property {(key: string) => boolean}  has       Verifica se a chave existe.
 *
 * @module storage/adapters/localStorageAdapter
 */

const isAvailable = () => typeof window !== "undefined" && window.localStorage != null;

/** @type {StorageAdapter} */
export const localStorageAdapter = {
  read(key) {
    if (!isAvailable()) return null;
    try {
      const raw = window.localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  write(key, value) {
    if (!isAvailable()) return false;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    if (!isAvailable()) return false;
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  has(key) {
    if (!isAvailable()) return false;
    try {
      return window.localStorage.getItem(key) != null;
    } catch {
      return false;
    }
  },
};
