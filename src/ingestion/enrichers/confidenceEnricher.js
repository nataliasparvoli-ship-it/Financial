/**
 * @fileoverview confidenceEnricher — computa enriched.confidence.overall.
 *
 * RESPONSABILIDADE:
 *   Último enricher na cadeia.
 *   Coleta todos os confidence scores parciais e computa o overall
 *   usando computeOverallConfidence (weighted average com redistribuição).
 *
 * DEVE RODAR POR ÚLTIMO:
 *   Precisa dos valores de institution, assetIdentity, category já preenchidos
 *   pelos enrichers anteriores.
 *
 * PURO:
 *   computeOverallConfidence é pura — determinística, sem rede.
 *
 * @module ingestion/enrichers/confidenceEnricher
 */

import { computeOverallConfidence } from "../../domain/assetIdentityEngine.js";

// ── Stage ─────────────────────────────────────────────────────────────────────

/**
 * Input:  EnrichedRecord[]  (após todos os enrichers de conteúdo)
 * Output: EnrichedRecord[]  (com confidence.overall computado)
 *
 * @type {import("../pipeline/PipelineStage.js").PipelineStage}
 */
export const confidenceEnricherStage = {
  name:      "confidenceEnricher",
  enabled:   true,
  retryable: false,

  /**
   * @param {import("../models/ingestionTypes.js").EnrichedRecord[]} records
   * @param {import("../pipeline/PipelineStage.js").PipelineContext} _context
   * @returns {Promise<import("../models/ingestionTypes.js").EnrichedRecord[]>}
   */
  async run(records, _context) {
    return records.map((record) => {
      const { source, enriched } = record;
      const breakdown = enriched.confidence;

      // OCR confidence vem do meta do ExtractedRecord original
      const ocrConfidence = source.source.meta?.ocrConfidence;

      const fullBreakdown = {
        ...breakdown,
        ocr: ocrConfidence,  // undefined se não é OCR — peso redistribuído
      };

      const overall = computeOverallConfidence(fullBreakdown);

      return {
        source,
        enriched: {
          ...enriched,
          enrichmentSources: [...enriched.enrichmentSources, "confidenceEnricher"],
          confidence: {
            ...fullBreakdown,
            overall,
          },
        },
      };
    });
  },
};
