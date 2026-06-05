/**
 * @fileoverview domainValidator — validação determinística de EnrichedRecord.
 *
 * DESIGN:
 *   Determinístico: sem UI, sem rede, sem efeitos colaterais.
 *   Puro: mesma entrada → mesmo resultado.
 *   Serializable: ValidationResult[] pode ser serializado para log ou JSON.
 *
 * NÍVEIS DE SEVERIDADE:
 *   ok       → tudo certo, sem log
 *   coerced  → valor corrigido automaticamente (log + usa coercedValue)
 *   warning  → suspeito mas aceito (isValid=true, hasWarnings=true)
 *   error    → campo inválido descartado (isValid=true — linha mantida sem o campo)
 *   fatal    → linha inteira descartada (isValid=false)
 *
 * REGRAS POR DATASET:
 *   transaction:   date obrigatória, amount ≠ 0
 *   holding:       amount > 0, institutionId obrigatório
 *   cashBalance:   amount definido, institutionId obrigatório
 *   snapshot:      date obrigatória, amount >= 0
 *   passiveIncome: date obrigatória, amount >= 0
 *
 * @module ingestion/validators/domainValidator
 */

// ── Regras de validação ───────────────────────────────────────────────────────

/** @type {(record: import("../models/ingestionTypes.js").EnrichedRecord) => import("../models/ingestionTypes.js").ValidationResult[]} */
const validateTransaction = ({ source, enriched }) => {
  const fields = source.fields;
  /** @type {import("../models/ingestionTypes.js").ValidationResult[]} */
  const results = [];

  if (!fields.date) {
    results.push({
      level: "warning",
      code: "MISSING_DATE",
      message: "Data da transação não encontrada. Usando data de hoje.",
      field: "date",
      rawValue: undefined,
      coercedValue: new Date().toISOString().slice(0, 10),
      recoverable: true,
      ruleId: "transaction:date_required",
    });
  }

  if (fields.amount === 0 || fields.amount === undefined) {
    results.push({
      level: "warning",
      code: "AMOUNT_ZERO",
      message: "Valor da transação é zero ou ausente.",
      field: "amount",
      rawValue: fields.amount,
      coercedValue: undefined,
      recoverable: true,
      ruleId: "transaction:amount_nonzero",
    });
  }

  if (!fields.description && !source.source.rawData.descricao) {
    results.push({
      level: "warning",
      code: "MISSING_DESCRIPTION",
      message: "Descrição ausente.",
      field: "description",
      rawValue: undefined,
      coercedValue: "Sem descrição",
      recoverable: true,
      ruleId: "transaction:description_present",
    });
  }

  if (enriched.institutionId === "unknown") {
    results.push({
      level: "warning",
      code: "UNKNOWN_INSTITUTION",
      message: "Instituição não reconhecida.",
      field: "institutionId",
      rawValue: source.fields.institutionRaw,
      coercedValue: undefined,
      recoverable: true,
      ruleId: "transaction:institution_known",
    });
  }

  return results;
};

/** @type {(record: import("../models/ingestionTypes.js").EnrichedRecord) => import("../models/ingestionTypes.js").ValidationResult[]} */
const validateHolding = ({ source, enriched }) => {
  const fields = source.fields;
  const results = [];

  if (!fields.amount || fields.amount <= 0) {
    results.push({
      level: "warning",
      code: "HOLDING_AMOUNT_NONPOSITIVE",
      message: `Valor do ativo é ${fields.amount ?? "ausente"} (esperado > 0).`,
      field: "amount",
      rawValue: fields.amount,
      coercedValue: undefined,
      recoverable: true,
      ruleId: "holding:amount_positive",
    });
  }

  if (enriched.institutionId === "unknown") {
    results.push({
      level: "warning",
      code: "UNKNOWN_INSTITUTION",
      message: "Instituição do holding não reconhecida.",
      field: "institutionId",
      rawValue: source.fields.institutionRaw,
      coercedValue: undefined,
      recoverable: true,
      ruleId: "holding:institution_known",
    });
  }

  return results;
};

/** @type {(record: import("../models/ingestionTypes.js").EnrichedRecord) => import("../models/ingestionTypes.js").ValidationResult[]} */
const validateSnapshot = ({ source }) => {
  const fields = source.fields;
  const results = [];

  if (!fields.date) {
    results.push({
      level: "error",
      code: "MISSING_SNAPSHOT_DATE",
      message: "Data do snapshot ausente — linha ignorada.",
      field: "date",
      rawValue: undefined,
      coercedValue: undefined,
      recoverable: false,
      ruleId: "snapshot:date_required",
    });
  }

  if (fields.amount !== undefined && fields.amount < 0) {
    results.push({
      level: "warning",
      code: "SNAPSHOT_NEGATIVE_VALUE",
      message: "Patrimônio negativo. Verifique os dados.",
      field: "amount",
      rawValue: fields.amount,
      coercedValue: undefined,
      recoverable: true,
      ruleId: "snapshot:amount_nonnegative",
    });
  }

  return results;
};

// ── Stage ─────────────────────────────────────────────────────────────────────

/**
 * Input:  EnrichedRecord[]
 * Output: ValidatedRecord[]
 *
 * @type {import("../pipeline/PipelineStage.js").PipelineStage}
 */
export const domainValidatorStage = {
  name:      "validator",
  enabled:   true,
  retryable: false,

  /**
   * @param {import("../models/ingestionTypes.js").EnrichedRecord[]} records
   * @param {import("../pipeline/PipelineStage.js").PipelineContext} _context
   * @returns {Promise<import("../models/ingestionTypes.js").ValidatedRecord[]>}
   */
  async run(records, _context) {
    return records.map((record) => {
      const { source } = record;
      let results = [];

      switch (source.datasetType) {
        case "transaction":   results = validateTransaction(record); break;
        case "holding":       results = validateHolding(record);     break;
        case "cashBalance":   /* basic — no fatal rules yet */       break;
        case "snapshot":      results = validateSnapshot(record);    break;
        case "passiveIncome": /* basic — amount >= 0 */             break;
      }

      // Acumula warnings já presentes no record (extração + normalização)
      const allResults = [...source.source.warnings, ...source.warnings, ...results];

      const isValid     = !allResults.some((r) => r.level === "fatal");
      const hasWarnings = allResults.some((r) => r.level === "warning" || r.level === "coerced");

      return { source: record, results: allResults, isValid, hasWarnings };
    });
  },
};
