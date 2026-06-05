/**
 * @fileoverview DomainConverter — ValidatedRecord[] → DomainEntity[].
 *
 * RESPONSABILIDADE ÚNICA:
 *   Converter ValidatedRecord para a entidade de domínio correspondente.
 *   Pura conversão: sem inferência, sem categorização, sem enriquecimento.
 *
 * PRECONDIÇÕES:
 *   - enriched.institutionId foi preenchido pelo institutionEnricher
 *   - enriched.category foi preenchido pelo categoryEnricher
 *   - enriched.confidence.overall foi computado pelo confidenceEnricher
 *   - ValidatedRecord.isValid === true (o stage filtra os inválidos)
 *
 * DEDUPLICAÇÃO:
 *   O DomainConverter NÃO deduplica — apenas converte.
 *   Deduplicação acontece no IngestionEngine após a conversão,
 *   usando fingerprint.js com a estratégia explícita por entidade.
 *
 * @module ingestion/converters/DomainConverter
 */

import { nowIso, todayIso, MONTH_LABELS } from "../../domain/dateUtils.js";
import { parseCurrency }                  from "../../utils/formatters.js";

// ── Helpers internos ──────────────────────────────────────────────────────────

/** @returns {string} "2026-01-15" para hoje */
const safeDate = (isoDate) => isoDate || todayIso();

/** Extrai year + month de uma ISO date string. */
const dateComponents = (isoDate) => {
  const d = new Date(safeDate(isoDate));
  const year  = d.getFullYear();
  const month = d.getMonth() + 1; // 1-based
  return { year, month, monthLabel: MONTH_LABELS[d.getMonth()] ?? "Jan" };
};

/** Acessa rawData do ExtractedRecord a partir de ValidatedRecord. */
const rawOf = (vr) => vr.source.source.source.rawData;

// ── Conversores por datasetType ───────────────────────────────────────────────

/** @param {import("../models/ingestionTypes.js").ValidatedRecord} vr */
const toTransaction = (vr) => {
  const norm     = vr.source.source;  // NormalizedRecord
  const enriched = vr.source.enriched;
  const fields   = norm.fields;
  const raw      = rawOf(vr);
  const now      = nowIso();
  const { year, month, monthLabel } = dateComponents(fields.date);

  return /** @type {import("../../domain/types.js").Transaction} */ ({
    id:                 crypto.randomUUID(),
    date:               safeDate(fields.date),
    year,
    month,
    monthLabel,
    amount:             fields.amount ?? 0,
    currency:           "BRL",
    amountBRL:          fields.amount ?? 0,
    kind:               enriched.transactionKind ?? "expense",
    category:           enriched.category || "Outros",
    subcategory:        undefined,
    description:        fields.description || raw.desc || raw.descricao || "Sem descrição",
    institutionId:      enriched.institutionId,
    accountRef:         fields.accountRef || undefined,
    categorySource:     "auto",
    normalizedMerchant: undefined,
    categoryRuleId:     undefined,
    createdAt:          now,
    sourceId:           norm.source.id,
    importedAt:         now,
    lastSyncedAt:       undefined,
    confidenceScore:    enriched.confidence?.overall,
  });
};

/** @param {import("../models/ingestionTypes.js").ValidatedRecord} vr */
const toHolding = (vr) => {
  const norm     = vr.source.source;
  const enriched = vr.source.enriched;
  const fields   = norm.fields;
  const now      = nowIso();

  return /** @type {import("../../domain/types.js").Holding} */ ({
    id:               crypto.randomUUID(),
    assetClassId:     "custom",  // assetClassEnricher futuro irá resolver
    label:            fields.assetLabelRaw || enriched.ticker || "Desconhecido",
    ticker:           enriched.ticker || undefined,
    canonicalAssetId: enriched.canonicalAssetId || undefined,
    institutionId:    enriched.institutionId,
    institutionLabel: enriched.institutionLabel,
    quantity:         undefined,
    pricePerUnit:     undefined,
    value:            fields.amount ?? 0,
    currency:         "BRL",
    valueBRL:         fields.amount ?? 0,
    fxRateUsed:       undefined,
    source:           norm.source.meta.sourceType === "ocr" ? "ocr" : "imported",
    snapshotDate:     safeDate(fields.date),
    datePrecision:    "month",
    createdAt:        now,
    updatedAt:        now,
    ocrConfidence:    undefined,
    notes:            undefined,
    rawImport:        undefined,
    sourceId:         norm.source.id,
    importedAt:       now,
    lastSyncedAt:     undefined,
    confidenceScore:  enriched.confidence?.overall,
  });
};

/** @param {import("../models/ingestionTypes.js").ValidatedRecord} vr */
const toCashBalance = (vr) => {
  const norm     = vr.source.source;
  const enriched = vr.source.enriched;
  const fields   = norm.fields;
  const now      = nowIso();

  return /** @type {import("../../domain/types.js").CashBalance} */ ({
    id:               crypto.randomUUID(),
    institutionId:    enriched.institutionId,
    institutionLabel: enriched.institutionLabel,
    accountType:      "checking",
    label:            undefined,
    balance:          fields.amount ?? 0,
    currency:         "BRL",
    balanceBRL:       fields.amount ?? 0,
    fxRateUsed:       undefined,
    source:           "imported",
    snapshotDate:     safeDate(fields.date),
    datePrecision:    "month",
    createdAt:        now,
    updatedAt:        now,
    sourceId:         norm.source.id,
    importedAt:       now,
    lastSyncedAt:     undefined,
    confidenceScore:  enriched.confidence?.overall,
  });
};

/** @param {import("../models/ingestionTypes.js").ValidatedRecord} vr */
const toSnapshot = (vr) => {
  const norm   = vr.source.source;
  const fields = norm.fields;

  return /** @type {import("../../domain/types.js").PortfolioSnapshot} */ ({
    id:            crypto.randomUUID(),
    date:          safeDate(fields.date),
    totalBRL:      fields.amount ?? 0,
    byAssetClass:  {},
    byInstitution: {},
    source:        "imported",
    datePrecision: "month",
    createdAt:     nowIso(),
  });
};

/** @param {import("../models/ingestionTypes.js").ValidatedRecord} vr */
const toPassiveIncome = (vr) => {
  const norm   = vr.source.source;
  const fields = norm.fields;
  const raw    = rawOf(vr);
  const { year, month, monthLabel } = dateComponents(fields.date);

  const dividends = parseCurrency(raw.dividendos || raw.dividends || "0");
  const interest  = parseCurrency(raw.juros      || raw.interest  || "0");
  const coupons   = parseCurrency(raw.cupom      || raw.coupons   || "0");
  const other     = parseCurrency(raw.outros     || raw.other     || "0");

  return /** @type {import("../../domain/types.js").PassiveIncomeRecord} */ ({
    id:         crypto.randomUUID(),
    date:       safeDate(fields.date),
    year,
    month,
    monthLabel,
    dividends,
    interest,
    coupons,
    other,
    total:      dividends + interest + coupons + other || fields.amount || 0,
    currency:   "BRL",
    source:     "imported",
    sourceId:   norm.source.id,
    importedAt: nowIso(),
    lastSyncedAt: undefined,
    confidenceScore: vr.source.enriched?.confidence?.overall,
  });
};

// ── Stage ─────────────────────────────────────────────────────────────────────

/**
 * Input:  ValidatedRecord[]
 * Output: DomainEntity[]   (somente registros com isValid === true)
 *
 * @type {import("../pipeline/PipelineStage.js").PipelineStage}
 */
export const domainConverterStage = {
  name:      "converter",
  enabled:   true,
  retryable: false,

  /**
   * @param {import("../models/ingestionTypes.js").ValidatedRecord[]} records
   * @param {import("../pipeline/PipelineStage.js").PipelineContext} context
   * @returns {Promise<import("../../domain/types.js").DomainEntity[]>}
   */
  async run(records, context) {
    /** @type {import("../../domain/types.js").DomainEntity[]} */
    const entities = [];

    for (const vr of records) {
      if (!vr.isValid) {
        context.logger?.rowsIgnored?.(1, "validation_fatal");
        continue;
      }

      const datasetType = vr.source.source.datasetType;
      let entity = null;

      switch (datasetType) {
        case "transaction":   entity = toTransaction(vr);   break;
        case "holding":       entity = toHolding(vr);       break;
        case "cashBalance":   entity = toCashBalance(vr);   break;
        case "snapshot":      entity = toSnapshot(vr);      break;
        case "passiveIncome": entity = toPassiveIncome(vr); break;
        default:
          context.logger?.warn?.(`datasetType desconhecido: "${datasetType}"`, { datasetType });
          continue;
      }

      if (entity) {
        context.logger?.entityCreated?.(datasetType, /** @type {any} */ (entity).id);
        entities.push(entity);
      }
    }

    return entities;
  },
};

// ── API funcional pura (sem stage wrapper — para uso direto em testes) ────────

export const DomainConverter = {
  /** @param {import("../models/ingestionTypes.js").ValidatedRecord} vr */
  convert(vr) {
    if (!vr.isValid) return null;
    switch (vr.source.source.datasetType) {
      case "transaction":   return toTransaction(vr);
      case "holding":       return toHolding(vr);
      case "cashBalance":   return toCashBalance(vr);
      case "snapshot":      return toSnapshot(vr);
      case "passiveIncome": return toPassiveIncome(vr);
      default:              return null;
    }
  },
};
