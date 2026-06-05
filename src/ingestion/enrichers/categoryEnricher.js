/**
 * @fileoverview categoryEnricher — inferência de categoria e transactionKind.
 *
 * RESPONSABILIDADE:
 *   Preenche enriched.category e enriched.transactionKind usando as regras
 *   existentes de categorização (applyCategoryRules.js + mapTransactionKind).
 *
 * APENAS PARA TRANSAÇÕES:
 *   Holdings, snapshots, cashBalances e passiveIncome pulam este enricher.
 *
 * PURO:
 *   categorizeTransaction é pura — sem rede, determinística.
 *   Mesma entrada → mesma saída.
 *
 * @module ingestion/enrichers/categoryEnricher
 */

import { categorizeTransaction } from "../../utils/categorizeTransaction.js";
import { mapTransactionKind }    from "../../domain/converters.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Confidence de categoria baseada na fonte de categorização.
 * @param {"auto"|"fallback"|"user"} source
 * @returns {number}
 */
const categoryConfidenceFor = (source) => {
  if (source === "auto")     return 0.90;
  if (source === "user")     return 1.00;
  return 0.40; // fallback
};

// ── Stage ─────────────────────────────────────────────────────────────────────

/**
 * Input:  EnrichedRecord[]  (saída do assetIdentityEnricher)
 * Output: EnrichedRecord[]  (com category + transactionKind preenchidos para transactions)
 *
 * @type {import("../pipeline/PipelineStage.js").PipelineStage}
 */
export const categoryEnricherStage = {
  name:      "categoryEnricher",
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

      // Categorização só faz sentido para transações
      if (datasetType !== "transaction") {
        return record;
      }

      const categorization = categorizeTransaction({
        category:    fields.category    || enriched.category || "",
        description: fields.description || "",
      });

      const categoryConfidence = categoryConfidenceFor(categorization.source);

      // transactionKind: usa tipo da fonte raw como hint para mapTransactionKind
      const tipoRaw = source.source.rawData.tipo || source.source.rawData.type || "";
      const transactionKind = mapTransactionKind(tipoRaw);

      return {
        source,
        enriched: {
          ...enriched,
          category:        categorization.category || enriched.category || "Outros",
          transactionKind,
          enrichmentSources: [...enriched.enrichmentSources, "categoryEnricher"],
          confidence: {
            ...enriched.confidence,
            category: categoryConfidence,
          },
        },
      };
    });
  },
};
