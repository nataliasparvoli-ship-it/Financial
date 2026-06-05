/**
 * @fileoverview Detecção de institution profile a partir de headers CSV.
 *
 * Itera os profiles em ordem de especificidade (mais específico primeiro).
 * O profile "Generic" é sempre o último e sempre dá match — garante fallback.
 *
 * USO:
 *   const profile = detectProfile(Object.keys(rows[0]));
 *   // profile.id, profile.signConvention, profile.columns, ...
 *
 * @module import/institutionDetector
 */

import { normalizeKey } from "../parsers/csvParser.js";
import { INSTITUTION_PROFILES } from "./institutionProfiles.js";

/**
 * Detecta o institution profile mais adequado para um arquivo.
 *
 * @param {string[]} rawHeaders  Headers do CSV no formato bruto (antes de normalizeKey)
 * @returns {import("./institutionProfiles.js").InstitutionProfile}
 */
export const detectProfile = (rawHeaders) => {
  const headers = rawHeaders.map(normalizeKey);

  for (const profile of INSTITUTION_PROFILES) {
    if (profile.detect(headers)) return profile;
  }

  // Nunca deve chegar aqui — Generic sempre dá match
  return INSTITUTION_PROFILES[INSTITUTION_PROFILES.length - 1];
};
