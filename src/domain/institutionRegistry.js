/**
 * @fileoverview Registry centralizado de instituições financeiras.
 *
 * Constrói sobre o institutionService existente e adiciona:
 *   • Resolução fuzzy por nome livre (ex: "xp", "XP Investimentos", "xp invest" → "xp")
 *   • Fallback seguro para instituição desconhecida
 *   • Suporte multi-país (BR, AE, EC)
 *
 * @module institutionRegistry
 */

import { INSTITUTIONS_BY_COUNTRY } from "../services/institutionService.js";

// ── Aliases adicionais não cobertos pelos labels/initials do service ────────

const EXTRA_ALIASES = {
  // XP group
  "xp": "xp",
  "xp investimentos": "xp",
  "xp invest": "xp",
  "rico": "xp",          // Rico é do grupo XP
  "clear": "xp",         // Clear é do grupo XP
  "xp corretora": "xp",

  // Nubank / NuInvest
  "nu": "nubank",
  "nuinvest": "nubank",
  "nu invest": "nubank",
  "nubankk": "nubank",   // typo comum

  // BTG
  "btg": "btg",
  "btg pactual": "btg",
  "btg pactual digital": "btg",
  "banco btg": "btg",

  // Banco do Brasil
  "bb": "bb",
  "banco do brasil": "bb",
  "banco brasil": "bb",

  // Itaú
  "itaú": "itau",
  "itau": "itau",
  "itaú unibanco": "itau",
  "itau unibanco": "itau",
  "iinvestimentos": "itau", // Itaú Investimentos

  // Bradesco
  "bradesco": "bradesco",
  "banco bradesco": "bradesco",
  "next": "bradesco",    // Next é do grupo Bradesco

  // Santander
  "santander": "santander",
  "banco santander": "santander",

  // Inter
  "inter": "outro_br",
  "banco inter": "outro_br",
  "interinvest": "outro_br",

  // C6
  "c6": "c6",
  "c6 bank": "c6",
  "c6bank": "c6",

  // Caixa
  "caixa": "caixa",
  "caixa econômica": "caixa",
  "caixa economica": "caixa",
  "caixa econômica federal": "caixa",
  "cef": "caixa",

  // AE institutions
  "emirates nbd": "enbd",
  "emirates": "enbd",
  "enbd": "enbd",
  "adcb": "adcb",
  "fab": "fab",
  "first abu dhabi": "fab",
  "mashreq": "mashreq",
  "hsbc": "hsbc",
  "hsbc uae": "hsbc",
  "dib": "dib",
  "dubai islamic": "dib",
  "sarwa": "sarwa",

  // EC institutions
  "pichincha": "pichincha",
  "banco pichincha": "pichincha",
  "guayaquil": "guayaquil",
  "banco guayaquil": "guayaquil",
  "produbanco": "produbanco",

  // Genéricos
  "desconhecido": "unknown",
  "desconhecida": "unknown",
  "outro": "unknown",
  "other": "unknown",
};

// ── Construção do registry ─────────────────────────────────────────────────

/** @type {Map<string, import("../services/institutionService.js").Institution>} */
const REGISTRY = new Map();

/** @type {Map<string, string>} label normalizado → institutionId */
const ALIAS_MAP = new Map();

// Popula o registry a partir do institutionService
Object.values(INSTITUTIONS_BY_COUNTRY).flat().forEach((inst) => {
  REGISTRY.set(inst.id, inst);

  // Adiciona label e initials como aliases
  ALIAS_MAP.set(inst.label.toLowerCase(), inst.id);
  ALIAS_MAP.set(inst.id.toLowerCase(), inst.id);
  ALIAS_MAP.set(inst.initials.toLowerCase(), inst.id);
});

// Adiciona aliases extras
Object.entries(EXTRA_ALIASES).forEach(([alias, id]) => {
  ALIAS_MAP.set(alias.toLowerCase(), id);
});

// ── Helpers de resolução ───────────────────────────────────────────────────

/**
 * Resolve um nome livre de instituição para um institutionId canônico.
 * Tenta match exato, depois substring.
 * Retorna "unknown" se não encontrar.
 *
 * @param {string|null|undefined} rawName
 * @returns {string}
 */
export const resolveInstitutionId = (rawName) => {
  if (!rawName || typeof rawName !== "string") return "unknown";
  const normalized = rawName.toLowerCase().trim();
  if (!normalized) return "unknown";

  // 1. Match exato
  if (ALIAS_MAP.has(normalized)) return ALIAS_MAP.get(normalized);

  // 2. Substring match (nome parcial)
  for (const [alias, id] of ALIAS_MAP) {
    if (normalized.includes(alias) && alias.length >= 3) return id;
  }

  // 3. Inverso: algum alias contém o nome buscado
  for (const [alias, id] of ALIAS_MAP) {
    if (alias.includes(normalized) && normalized.length >= 3) return id;
  }

  return "unknown";
};

/**
 * Retorna a definição de uma instituição pelo ID.
 * Fallback seguro: nunca retorna undefined.
 *
 * @param {string} id
 * @returns {{ id: string, label: string, color: string, initials: string }}
 */
export const getInstitution = (id) =>
  REGISTRY.get(id) ?? {
    id: "unknown",
    label: id && id !== "unknown" ? id : "Desconhecida",
    color: "#475569",
    initials: "?",
  };

/**
 * Retorna todas as instituições registradas.
 * @returns {Array}
 */
export const getAllInstitutions = () => Array.from(REGISTRY.values());
