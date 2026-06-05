/**
 * @fileoverview Interface e registry para providers OCR.
 *
 * DESIGN:
 *   OcrProvider é um adapter: recebe um File, retorna OcrExtractionResult.
 *   O OcrExtractor consome um OcrProvider — nunca conhece Claude, Tesseract
 *   ou qualquer provider específico diretamente.
 *
 *   providers/
 *     claudeOcrProvider.js    ← bridge: imageParser.js + normalização para OcrExtractionResult
 *     tesseractOcrProvider.js ← futuro: Tesseract.js (browser WASM)
 *     mockOcrProvider.js      ← determinístico: testes e dev sem API key
 *
 * TROCA DE PROVIDER:
 *   IngestionEngine recebe o provider como dependência.
 *   Para trocar de Claude para Tesseract: new IngestionEngine({ ocrProvider: tesseractOcrProvider }).
 *   O domínio nunca sabe qual provider está ativo.
 *
 * @module ingestion/providers/ocrProvider
 */

// ── Tipos ─────────────────────────────────────────────────────────────────────

/**
 * Opções passadas ao provider durante a extração.
 * Cada provider pode ignorar opções que não suporta.
 *
 * @typedef {Object} OcrProviderOptions
 * @property {number|undefined}  maxPages   Limite de páginas (0 = sem limite)
 * @property {string|undefined}  language   Hint de idioma, ex: "pt-BR"
 * @property {boolean|undefined} includeConfidence  Se false, provider pode omitir confidence por bloco
 */

/**
 * Contrato do adapter OCR.
 * Cada implementação deve satisfazer esta interface.
 *
 * Garantias exigidas:
 *   - providerId é estável e único (usado em logs e diagnósticos)
 *   - extract é puro em termos de domínio (não persiste estado entre chamadas)
 *   - Se a extração falhar, deve lançar Error (não retornar resultado parcial silencioso)
 *
 * @typedef {Object} OcrProvider
 * @property {string} providerId                  Ex: "claude" | "tesseract" | "mock"
 * @property {(
 *   file: File,
 *   opts?: OcrProviderOptions
 * ) => Promise<import("../models/ingestionTypes.js").OcrExtractionResult>} extract
 */

// ── Registry de providers disponíveis ────────────────────────────────────────

/**
 * IDs canônicos de providers OCR suportados.
 * Usar estas constantes em logs e configuração — nunca strings mágicas.
 */
export const OCR_PROVIDER_IDS = Object.freeze({
  CLAUDE:     "claude",
  TESSERACT:  "tesseract",
  MOCK:       "mock",
});

export {};
