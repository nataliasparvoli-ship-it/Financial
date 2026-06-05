/**
 * @fileoverview Claude OCR provider — adapter para imageParser.js.
 *
 * BRIDGE (estado atual):
 *   Este provider é um adapter de compatibilidade sobre o imageParser.js existente.
 *   O imageParser.js chama Claude Vision API e retorna itens JÁ INTERPRETADOS
 *   (com nome, tipo, valor, instituicao...). Este adapter os converte para
 *   OcrExtractionResult preservando o JSON bruto em block.text.
 *
 * LIMITAÇÕES DO BRIDGE:
 *   - Não há bounding boxes reais (o prompt atual não solicita posição visual)
 *   - O bloco.text é o JSON serializado do item Claude — não é OCR texto puro
 *   - institutionHint vem do primeiro item da lista
 *
 * EVOLUÇÃO FUTURA:
 *   Quando o pipeline OCR for refatorado:
 *   1. Criar um prompt que retorne blocos de texto com posição real
 *   2. Substituir este adapter por uma implementação direta de Claude Vision
 *   3. O OcrExtractor e o normalizer downstream não precisam mudar
 *
 * @module ingestion/providers/claudeOcrProvider
 */

import { extractInvestmentsFromImage } from "../../parsers/imageParser.js";
import { OCR_PROVIDER_IDS } from "./ocrProvider.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converte string de confiança OCR legada para score numérico.
 * @param {"alta"|"media"|"baixa"|string} confianca
 * @returns {number}  0-1
 */
const confiancaToScore = (confianca) => {
  const map = { alta: 0.95, media: 0.70, média: 0.70, baixa: 0.40 };
  return map[String(confianca || "").toLowerCase()] ?? 0.70;
};

/**
 * Cria uma bounding box sintética para o bridge.
 * O imageParser atual não retorna posição visual — criamos uma posição sequencial.
 * Futuramente substituída por coordenadas reais.
 *
 * @param {number} index  Índice do item (0-based)
 * @returns {import("../models/ingestionTypes.js").BoundingBox}
 */
const syntheticBoundingBox = (index) => ({
  x: 0,
  y: index * 60,
  width: 400,
  height: 50,
  page: 1,
});

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * Adapter Claude OCR.
 * Satisfaz a interface OcrProvider do ocrProvider.js.
 *
 * @type {import("./ocrProvider.js").OcrProvider}
 */
export const claudeOcrProvider = {
  providerId: OCR_PROVIDER_IDS.CLAUDE,

  /**
   * @param {File} file
   * @param {import("./ocrProvider.js").OcrProviderOptions} [_opts]  Ignorado no bridge atual
   * @returns {Promise<import("../models/ingestionTypes.js").OcrExtractionResult>}
   */
  async extract(file, _opts = {}) {
    // Delega ao imageParser existente (chama Claude Vision API)
    const items = await extractInvestmentsFromImage(file);

    // Converte cada item Claude para OcrTextBlock
    // block.text = JSON serializado do item bruto (preserve para rawText no ExtractedRecord)
    const blocks = items.map((item, index) => ({
      text:        JSON.stringify(item),
      confidence:  confiancaToScore(item.confianca),
      boundingBox: syntheticBoundingBox(index),
      fieldHint:   undefined,
    }));

    const overallConfidence = blocks.length > 0
      ? blocks.reduce((sum, b) => sum + b.confidence, 0) / blocks.length
      : 0;

    return {
      provider:           "claude",
      blocks,
      fullText:           items.map((i) => JSON.stringify(i)).join("\n"),
      pageCount:          1,
      overallConfidence:  Math.round(overallConfidence * 100) / 100,
      institutionHint:    items[0]?.instituicao,
    };
  },
};
