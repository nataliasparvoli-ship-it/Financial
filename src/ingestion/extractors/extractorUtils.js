/**
 * @fileoverview Utilitários compartilhados pelos extractors.
 *
 * RESPONSABILIDADES:
 *   - Computar sourceFingerprint determinística para deduplicação pré-normalização
 *   - Construir ExtractionMeta com defaults corretos
 *
 * DESIGN:
 *   sourceFingerprint usa djb2 — sync, sem crypto.subtle (async), browser-safe.
 *   Não é criptográfico, mas é determinístico e suficiente para deduplicação.
 *
 * @module ingestion/extractors/extractorUtils
 */

// ── Hash djb2 ─────────────────────────────────────────────────────────────────

/**
 * djb2 hash — determinístico, síncrono, browser-compatible.
 * Não criptográfico. Adequado para fingerprinting de conteúdo.
 *
 * @param {string} str
 * @returns {string}  8 hex chars
 */
const djb2 = (str) => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // hash * 33 XOR charCode — clássico djb2
    hash = (((hash << 5) + hash) ^ str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

// ── sourceFingerprint ─────────────────────────────────────────────────────────

/**
 * Computa uma sourceFingerprint estável para um registro extraído.
 *
 * A fingerprint é determinística: a mesma entrada sempre produz o mesmo hash.
 * Usada para deduplicação pré-normalização (antes de criar entidades de domínio).
 *
 * Formato: "src::{djb2_hex}"
 *
 * Estratégia de chaves: os campos de rawData são ordenados alfabeticamente
 * para garantir estabilidade independente da ordem original das colunas.
 *
 * @param {string} fileName
 * @param {number} rowIndex
 * @param {Record<string, string>} rawData
 * @returns {string}  Ex: "src::4a3f9b2c"
 */
export const computeSourceFingerprint = (fileName, rowIndex, rawData) => {
  // Ordena chaves para estabilidade — mesma linha com colunas em ordem diferente
  // deve produzir a mesma fingerprint.
  const sortedKeys = Object.keys(rawData).sort();
  const stable = JSON.stringify(rawData, sortedKeys);
  const content = `${fileName}\x00${rowIndex}\x00${stable}`;
  return `src::${djb2(content)}`;
};

// ── ExtractionMeta builder ────────────────────────────────────────────────────

/**
 * Constrói um ExtractionMeta com todos os campos explicitamente definidos.
 * Campos ausentes no opts ficam como undefined (não omitidos — contrato explícito).
 *
 * @param {{
 *   fileName:      string,
 *   sourceType:    "csv"|"pdf"|"ocr"|"manual"|"api"|"sync",
 *   rowIndex:      number,
 *   pageNumber?:   number,
 *   boundingBox?:  import("../models/ingestionTypes.js").BoundingBox,
 *   ocrConfidence?: number,
 *   rawText?:      string,
 * }} opts
 * @returns {import("../models/ingestionTypes.js").ExtractionMeta}
 */
export const buildMeta = (opts) => ({
  fileName:      opts.fileName,
  sourceType:    opts.sourceType,
  rowIndex:      opts.rowIndex,
  pageNumber:    opts.pageNumber    ?? undefined,
  boundingBox:   opts.boundingBox   ?? undefined,
  ocrConfidence: opts.ocrConfidence ?? undefined,
  rawText:       opts.rawText       ?? undefined,
});

// ── Record builder ────────────────────────────────────────────────────────────

/**
 * Constrói um ExtractedRecord com todos os campos corretos.
 * Centraliza a criação para garantir o contrato do tipo.
 *
 * @param {{
 *   rawData:         Record<string, string>,
 *   meta:            import("../models/ingestionTypes.js").ExtractionMeta,
 *   sourceFingerprint?: string,
 *   warnings?:       import("../models/ingestionTypes.js").ValidationResult[],
 * }} opts
 * @returns {import("../models/ingestionTypes.js").ExtractedRecord}
 */
export const buildRecord = ({ rawData, meta, sourceFingerprint, warnings = [] }) => ({
  id: crypto.randomUUID(),
  rawData,
  meta,
  sourceFingerprint:
    sourceFingerprint ?? computeSourceFingerprint(meta.fileName, meta.rowIndex, rawData),
  warnings,
});
