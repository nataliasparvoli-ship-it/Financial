/**
 * @fileoverview Local API key storage — Anthropic key for image import.
 *
 * Stored in localStorage so the user only has to paste it once.
 * Falls back to VITE_ANTHROPIC_API_KEY env var (for CI / Vercel deployments).
 * Never sent anywhere except api.anthropic.com.
 */

const STORAGE_KEY = "auren.anthropic.apiKey.v1";

export const getApiKey = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_ANTHROPIC_API_KEY || "";
  } catch {
    return import.meta.env.VITE_ANTHROPIC_API_KEY || "";
  }
};

export const setApiKey = (key) => {
  try {
    if (key) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* storage full or blocked */ }
};

export const hasApiKey = () => Boolean(getApiKey());

export const clearApiKey = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
};
