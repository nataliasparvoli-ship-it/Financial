/**
 * @fileoverview assetIdentityEnricher — resolução de identidade de ativo.
 *
 * RESPONSABILIDADE:
 *   Preenche enriched.canonicalAssetId e enriched.ticker usando o assetIdentityEngine.
 *
 * ESTRATÉGIA:
 *   1. Tenta resolveAssetIdentity(fields.tickerRaw) — ticker explícito
 *   2. Tenta resolveAssetIdentity(fields.assetLabelRaw) — nome/label do ativo
 *   3. Se não resolvido → canonicalAssetId = null, ticker = null (enriquecimento skipped)
 *
 * SKIP AUTOMÁTICO:
 *   Records de datasetType "transaction", "snapshot", "cashBalance" geralmente
 *   não têm ativo associado. O enricher pula esses sem erro.
 *
 * PURO:
 *   resolveAssetIdentity é pura — sem rede, idempotente.
 *
 * @module ingestion/enrichers/assetIdentityEnricher
 */

import { resolveAssetIdentity } from "../../domain/assetIdentityEngine.js";

// ── Stage ─────────────────────────────────────────────────────────────────────

/**
 * Input:  EnrichedRecord[]  (saída do institutionEnricher)
 * Output: EnrichedRecord[]  (com canonicalAssetId + ticker preenchidos quando resolvíveis)
 *
 * @type {import("../pipeline/PipelineStage.js").PipelineStage}
 */
export const assetIdentityEnricherStage = {
  name:      "assetIdentityEnricher",
  enabled:   true,
  retryable: false,

  /**
   * @param {import("../models/ingestionTypes.js").EnrichedRecord[]} records
   * @param {import("../pipeline/PipelineStage.js").PipelineContext} context
   * @returns {Promise<import("../models/ingestionTypes.js").EnrichedRecord[]>}
   */
  async run(records, context) {
    return records.map((record) => {
      const { source, enriched } = record;
      const { fields, datasetType } = source;

      // Tipos sem ativo associado → skip explícito
      const hasAsset = datasetType === "holding" || datasetType === "transaction";
      if (!hasAsset) {
        context.logger?.enrichmentSkipped?.(
          "assetIdentityEnricher",
          `datasetType "${datasetType}" não requer resolução de ativo`,
        );
        return record;
      }

      // Sem dados para resolver
      const rawInput = fields.tickerRaw || fields.assetLabelRaw;
      if (!rawInput) {
        context.logger?.enrichmentSkipped?.(
          "assetIdentityEnricher",
          "sem tickerRaw nem assetLabelRaw",
        );
        return record;
      }

      // Resolução: ticker primeiro (mais específico), depois label
      const resolution =
        resolveAssetIdentity(fields.tickerRaw) ??
        resolveAssetIdentity(fields.assetLabelRaw);

      if (!resolution) {
        context.logger?.enrichmentSkipped?.(
          "assetIdentityEnricher",
          `ativo não encontrado no registry: "${rawInput}"`,
        );
        return record;
      }

      context.logger?.assetIdentityLinked?.(
        resolution.canonicalId,
        resolution.ticker,
        resolution.matchType,
        resolution.confidence,
      );

      return {
        source,
        enriched: {
          ...enriched,
          canonicalAssetId:  resolution.canonicalId,
          ticker:            resolution.ticker,
          enrichmentSources: [...enriched.enrichmentSources, "assetIdentityEnricher"],
          confidence: {
            ...enriched.confidence,
            assetIdentity: resolution.confidence,
          },
        },
      };
    });
  },
};
