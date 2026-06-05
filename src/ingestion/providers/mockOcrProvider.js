/**
 * @fileoverview Mock OCR provider — determinístico para testes e dev.
 *
 * PROPRIEDADES:
 *   - Determinístico: mesma entrada → mesma saída garantida
 *   - Sem rede: não chama APIs externas
 *   - Configurável: permite injetar dados de teste via factory
 *   - Representa casos reais: inclui campos que chegam via OCR real
 *
 * USO:
 *   // Provider padrão (dados fixos)
 *   const extractor = createOcrExtractor(mockOcrProvider);
 *
 *   // Provider configurado (testes específicos)
 *   const extractor = createOcrExtractor(createMockOcrProvider([
 *     { text: '{"instituicao":"XP","nome":"IVVB11",...}', confidence: 0.95 }
 *   ]));
 *
 * @module ingestion/providers/mockOcrProvider
 */

import { OCR_PROVIDER_IDS } from "./ocrProvider.js";

// ── Dados de mock padrão ──────────────────────────────────────────────────────

/** @type {Array<Omit<import("../models/ingestionTypes.js").OcrTextBlock, "boundingBox">>} */
const DEFAULT_MOCK_BLOCKS = [
  {
    text: JSON.stringify({
      instituicao: "Nubank",
      nome: "CDB Nubank 104% CDI",
      tipo: "Renda Fixa",
      valor: 5420.00,
      data: "01/05/2026",
      rentabilidade: 0.04,
      confianca: "alta",
      source: "ocr",
      rawFile: "mock.jpg",
    }),
    confidence: 0.95,
    fieldHint: undefined,
  },
  {
    text: JSON.stringify({
      instituicao: "XP Investimentos",
      nome: "PETR4",
      tipo: "Ações",
      valor: 12350.50,
      data: "01/05/2026",
      rentabilidade: 0.12,
      confianca: "alta",
      source: "ocr",
      rawFile: "mock.jpg",
    }),
    confidence: 0.95,
    fieldHint: undefined,
  },
  {
    text: JSON.stringify({
      instituicao: "BTG Pactual",
      nome: "KNRI11",
      tipo: "FII",
      valor: 8800.00,
      data: "01/05/2026",
      rentabilidade: 0.08,
      confianca: "media",
      source: "ocr",
      rawFile: "mock.jpg",
    }),
    confidence: 0.70,
    fieldHint: undefined,
  },
];

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Cria um mock provider com blocos personalizados.
 * Útil para testes com dados específicos.
 *
 * @param {import("../models/ingestionTypes.js").OcrTextBlock[]} [blocks]
 * @returns {import("./ocrProvider.js").OcrProvider}
 */
export const createMockOcrProvider = (blocks = null) => ({
  providerId: OCR_PROVIDER_IDS.MOCK,

  async extract(file, _opts = {}) {
    const activeBlocks = (blocks ?? DEFAULT_MOCK_BLOCKS).map((b, i) => ({
      ...b,
      boundingBox: {
        x: 0,
        y: i * 60,
        width: 400,
        height: 50,
        page: 1,
      },
    }));

    const overallConfidence = activeBlocks.length > 0
      ? activeBlocks.reduce((sum, b) => sum + b.confidence, 0) / activeBlocks.length
      : 0;

    return {
      provider:          "mock",
      blocks:            activeBlocks,
      fullText:          activeBlocks.map((b) => b.text).join("\n"),
      pageCount:         1,
      overallConfidence: Math.round(overallConfidence * 100) / 100,
      institutionHint:   undefined,
    };
  },
});

/**
 * Provider mock padrão (singleton).
 * Instância pronta para uso imediato sem configuração.
 *
 * @type {import("./ocrProvider.js").OcrProvider}
 */
export const mockOcrProvider = createMockOcrProvider();
