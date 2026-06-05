/**
 * @fileoverview institutionEnricher — resolução de identidade de instituição.
 *
 * RESPONSABILIDADE:
 *   Preenche enriched.institutionId e enriched.institutionLabel em cada record.
 *
 * ESTRATÉGIA (em ordem de prioridade):
 *   1. profile.id !== "unknown" → usa o ID do profile detectado (alta confiança)
 *   2. fields.institutionRaw → resolveInstitutionId fuzzy match
 *   3. Fallback: "unknown"
 *
 * PRODUZ O PRIMEIRO EnrichedRecord:
 *   Este é o primeiro enricher na cadeia — ele inicializa o EnrichedRecord
 *   com campos vazios para os demais enrichers preencherem.
 *
 * PURO:
 *   Sem chamadas de rede. Usa o institutionRegistry local.
 *   Mesma entrada → mesma saída garantida.
 *
 * @module ingestion/enrichers/institutionEnricher
 */

import { resolveInstitutionId, getInstitution } from "../../domain/institutionRegistry.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve institutionId + confidence a partir do profile e do campo raw.
 *
 * @param {import("../models/ingestionTypes.js").NormalizedRecord} record
 * @returns {{ id: string, label: string, confidence: number }}
 */
const resolveInstitution = (record) => {
  const profile = record.profile;

  // Prioridade 1: profile conhecido (alta confiança)
  if (profile.id !== "unknown") {
    const inst = getInstitution(profile.id);
    return { id: profile.id, label: inst.label, confidence: 0.95 };
  }

  // Prioridade 2: institutionRaw com fuzzy match
  const raw = record.fields.institutionRaw;
  if (raw) {
    const id = resolveInstitutionId(raw);
    if (id !== "unknown") {
      const inst = getInstitution(id);
      return { id, label: inst.label, confidence: 0.75 };
    }
  }

  // Fallback
  return { id: "unknown", label: "Desconhecida", confidence: 0 };
};

// ── Stage ─────────────────────────────────────────────────────────────────────

/**
 * Input:  NormalizedRecord[]
 * Output: EnrichedRecord[]  (instância inicial com institution preenchida)
 *
 * @type {import("../pipeline/PipelineStage.js").PipelineStage}
 */
export const institutionEnricherStage = {
  name:      "institutionEnricher",
  enabled:   true,
  retryable: false,

  /**
   * @param {import("../models/ingestionTypes.js").NormalizedRecord[]} records
   * @param {import("../pipeline/PipelineStage.js").PipelineContext} context
   * @returns {Promise<import("../models/ingestionTypes.js").EnrichedRecord[]>}
   */
  async run(records, context) {
    return records.map((record) => {
      const { id, label, confidence } = resolveInstitution(record);

      context.logger?.institutionInferred?.(id, confidence);

      return {
        source: record,
        enriched: {
          institutionId:     id,
          institutionLabel:  label,
          canonicalAssetId:  null,   // assetIdentityEnricher preenche
          ticker:            null,   // assetIdentityEnricher preenche
          category:          record.fields.category || "",  // categoryEnricher atualiza
          transactionKind:   undefined,  // categoryEnricher preenche
          enrichmentSources: ["institutionEnricher"],
          confidence: {
            institution:  confidence,
            overall:      0,  // confidenceEnricher computa
          },
        },
      };
    });
  },
};
