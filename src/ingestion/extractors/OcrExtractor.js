/**
 * @fileoverview OcrExtractor — extrator OCR provider-agnostic.
 *
 * DESIGN:
 *   O extractor delega completamente ao OcrProvider injetado.
 *   Ele mesmo é "dumb": recebe OcrExtractionResult e mapeia para ExtractedRecord[].
 *   Nenhuma lógica de domínio aqui.
 *
 * PROVIDER-AGNOSTIC:
 *   O OcrExtractor não sabe se está usando Claude, Tesseract ou mock.
 *   Para trocar de provider: new IngestionEngine({ ocrProvider: tesseractOcrProvider }).
 *
 * RAW FIDELITY:
 *   meta.rawText  = block.text original do provider (nunca descartado)
 *   meta.ocrConfidence = confidence por bloco (0-1)
 *   meta.boundingBox   = posição visual no documento (quando disponível)
 *
 *   rawText é crítico para:
 *     - Debug de problemas de reconhecimento
 *     - Review UI (mostrar ao usuário o que foi reconhecido)
 *     - Correções humanas (comparar raw vs interpretado)
 *     - Troca de provider (re-processar sem re-chamar a API)
 *
 * BRIDGE (claudeOcrProvider atual):
 *   block.text contém JSON serializado do item Claude.
 *   O extractor tenta parsear como JSON para montar rawData com campos individuais.
 *   Se não for JSON, usa { text: block.text } como rawData.
 *   Em ambos os casos, meta.rawText = block.text (original preservado).
 *
 * @module ingestion/extractors/OcrExtractor
 */

import { buildMeta, buildRecord, computeSourceFingerprint } from "./extractorUtils.js";

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Cria um OcrExtractor configurado com o provider fornecido.
 * Cada IngestionEngine instancia seu próprio OcrExtractor com o provider escolhido.
 *
 * @param {import("../providers/ocrProvider.js").OcrProvider} provider
 * @returns {{ providerId: string, extract: (file: File, opts?: import("../providers/ocrProvider.js").OcrProviderOptions) => Promise<import("../models/ingestionTypes.js").ExtractedRecord[]> }}
 */
export const createOcrExtractor = (provider) => ({
  providerId: provider.providerId,

  /**
   * Extrai registros de uma imagem ou arquivo OCR.
   * Delega ao provider, mapeia OcrExtractionResult → ExtractedRecord[].
   *
   * @param {File} file
   * @param {import("../providers/ocrProvider.js").OcrProviderOptions} [opts]
   * @returns {Promise<import("../models/ingestionTypes.js").ExtractedRecord[]>}
   */
  async extract(file, opts = {}) {
    const result = await provider.extract(file, opts);

    return result.blocks.map((block, rowIndex) => {
      // rawData: tenta extrair campos individuais do block.text.
      // Bridge (claudeOcrProvider): block.text é JSON de um item estruturado.
      // Provider real futuro: block.text é texto OCR puro → { text: block.text }.
      const rawData = parseBlockToRawData(block.text);

      // sourceFingerprint usa rawText para identificar o bloco pelo seu conteúdo OCR.
      const fingerprint = computeSourceFingerprint(
        file.name,
        rowIndex,
        { _rawText: block.text }, // chave prefixada para não colidir com campos de rawData
      );

      return buildRecord({
        rawData,
        meta: buildMeta({
          fileName:      file.name,
          sourceType:    "ocr",
          rowIndex,
          pageNumber:    block.boundingBox?.page,
          boundingBox:   block.boundingBox,
          ocrConfidence: block.confidence,
          rawText:       block.text,   // ← NUNCA descartado — crítico para debug/review/replay
        }),
        sourceFingerprint: fingerprint,
      });
    });
  },
});

// ── Helpers internos ──────────────────────────────────────────────────────────

/**
 * Converte block.text para rawData (Record<string, string>).
 *
 * Bridge mode (JSON): extrai campos individuais como strings.
 * Texto OCR puro:     usa { text: rawText }.
 *
 * Todos os valores são convertidos para string — contrato do rawData.
 *
 * @param {string} text
 * @returns {Record<string, string>}
 */
const parseBlockToRawData = (text) => {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      // Converte todos os valores para string (contrato ExtractedRecord.rawData)
      return Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, v == null ? "" : String(v)]),
      );
    }
  } catch {
    // Não é JSON — texto OCR puro
  }

  // Texto puro: preserva intacto como campo "text"
  return { text: String(text || "") };
};
