/**
 * @fileoverview rowNormalizer — ExtractedRecord[] → NormalizedRecord[].
 *
 * RESPONSABILIDADE:
 *   Mapear campos brutos (rawData) para NormalizedFields canônicos.
 *   Aplicar sign convention do profile.
 *   Detectar datasetType por registro.
 *
 * NÃO FAZ:
 *   ✗ Categorizar transações
 *   ✗ Resolver instituição (preserva rawData.institutionRaw)
 *   ✗ Resolver ativo (preserva rawData.tickerRaw / assetLabelRaw)
 *
 * DETECÇÃO DE PROFILE:
 *   Feita uma vez para o batch (a partir dos headers do primeiro record).
 *   Se os headers mudarem no meio do arquivo: comportamento indefinido.
 *   Arquivos multi-dataset (com coluna "dataset") são suportados.
 *
 * @module ingestion/normalizers/rowNormalizer
 */

import { parseCurrency }      from "../../utils/formatters.js";
import { parseDateToISO, inferIsoDateFromMonth } from "../../domain/dateUtils.js";
import { normalizeKey }       from "../../parsers/csvParser.js";
import { detectProfile }      from "../../import/institutionDetector.js";
import { GENERIC_COLS }       from "../../import/institutionProfiles.js";
import { detectDataset }      from "../../parsers/normalizeData.js";

// ── Helpers internos ──────────────────────────────────────────────────────────

/** Retorna o primeiro valor não-vazio da row para as chaves fornecidas. */
const getFirst = (row, keys) => {
  for (const key of keys) {
    const v = row[normalizeKey(key)];
    if (v !== undefined && v !== "") return v;
  }
  return "";
};

/** Une colunas do profile com fallback genérico, sem duplicatas. */
const mergeCols = (profileCols = [], fallbackCols = []) => {
  const seen = new Set(profileCols);
  return [...profileCols, ...fallbackCols.filter((c) => !seen.has(c))];
};

/** Coluna do dataset para detectar tipo da linha. */
const getDatasetValue = (rawData) =>
  rawData.dataset || rawData.arquivo || rawData.tipo_dado || rawData["tipo_de_dado"];

/** Mapeia chave de dataset para NormalizedRecord.datasetType. */
const DATASET_TYPE_MAP = {
  transacoes:    "transaction",
  patrimonio:    "snapshot",
  classe:        "holding",
  banco:         "cashBalance",
  renda_passiva: "passiveIncome",
};

// ── Extratores por dataset ────────────────────────────────────────────────────

const extractTransaction = (rawData, profile) => {
  const cols = profile.columns;

  const dateCols  = mergeCols(cols.date,  GENERIC_COLS.date);
  const amtCols   = mergeCols(cols.amount, GENERIC_COLS.amount);
  const descCols  = mergeCols(cols.description, GENERIC_COLS.description);
  const catCols   = mergeCols(cols.category, GENERIC_COLS.category);
  const accCols   = mergeCols(cols.account, GENERIC_COLS.account);

  const rawDate   = getFirst(rawData, dateCols);
  let amount      = parseCurrency(getFirst(rawData, amtCols));

  // Sign convention aplicada pelo profile
  if (profile.signConvention === "debit_credit") {
    const creditCols = mergeCols(cols.credit, GENERIC_COLS.credit ?? []);
    const debitCols  = mergeCols(cols.debit,  GENERIC_COLS.debit  ?? []);
    const credit     = parseCurrency(getFirst(rawData, creditCols));
    const debit      = parseCurrency(getFirst(rawData, debitCols));
    amount = credit > 0 ? credit : debit > 0 ? -debit : 0;
  } else if (profile.signConvention === "expenses_positive" && amount > 0) {
    amount = -amount;
  }

  return {
    date:           parseDateToISO(rawDate) || undefined,
    amount,
    description:    getFirst(rawData, descCols) || undefined,
    category:       getFirst(rawData, catCols)  || undefined,
    accountRef:     getFirst(rawData, accCols)  || undefined,
    institutionRaw: profile.id !== "unknown" ? profile.name : undefined,
  };
};

const extractHolding = (rawData) => {
  const labelCols = ["classe", "ativo", "nome", "label", "asset", "name"];
  const valueCols = mergeCols([], GENERIC_COLS.amount);
  const tickerCols = ["ticker", "codigo", "symbol", "code"];

  return {
    assetLabelRaw: getFirst(rawData, labelCols)  || undefined,
    tickerRaw:     getFirst(rawData, tickerCols) || undefined,
    amount:        parseCurrency(getFirst(rawData, valueCols)),
    institutionRaw: getFirst(rawData, ["instituicao", "institution", "banco", "broker"]) || undefined,
  };
};

const extractCashBalance = (rawData) => {
  const valueCols = mergeCols([], GENERIC_COLS.amount);
  return {
    institutionRaw: getFirst(rawData, ["banco", "instituicao", "institution", "banco_"]) || undefined,
    amount:         parseCurrency(getFirst(rawData, valueCols)),
  };
};

const extractSnapshot = (rawData) => {
  const monthCols = mergeCols([], GENERIC_COLS.month ?? ["mes", "month", "competencia"]);
  const valueCols = ["total", ...GENERIC_COLS.amount];
  const rawMonth  = getFirst(rawData, monthCols);

  return {
    date:   parseDateToISO(rawMonth) || inferIsoDateFromMonth(rawMonth) || undefined,
    amount: parseCurrency(getFirst(rawData, valueCols)),
  };
};

const extractPassiveIncome = (rawData) => {
  const monthCols  = ["mes", "month", "competencia"];
  const rawMonth   = getFirst(rawData, monthCols);
  const dividendos = parseCurrency(rawData.dividendos || rawData.dividends || "0");
  const juros      = parseCurrency(rawData.juros      || rawData.interest  || "0");
  const cupom      = parseCurrency(rawData.cupom      || rawData.coupons   || "0");
  const outros     = parseCurrency(rawData.outros     || rawData.other     || "0");

  return {
    date:   parseDateToISO(rawMonth) || inferIsoDateFromMonth(rawMonth) || undefined,
    amount: dividendos + juros + cupom + outros,  // total para NormalizedFields.amount
    description: `Renda passiva ${rawMonth || ""}`.trim(),
  };
};

// ── Stage ─────────────────────────────────────────────────────────────────────

/**
 * Stage de normalização.
 * Input:  ExtractedRecord[]
 * Output: NormalizedRecord[]
 *
 * @type {import("../pipeline/PipelineStage.js").PipelineStage}
 */
export const rowNormalizerStage = {
  name:      "normalizer",
  enabled:   true,
  retryable: false,

  /**
   * @param {import("../models/ingestionTypes.js").ExtractedRecord[]} records
   * @param {import("../pipeline/PipelineStage.js").PipelineContext} context
   * @returns {Promise<import("../models/ingestionTypes.js").NormalizedRecord[]>}
   */
  async run(records, context) {
    if (!records.length) return [];

    // Detecta profile uma vez para o batch (headers do primeiro record)
    const firstHeaders = Object.keys(records[0].rawData);
    const profile = detectProfile(firstHeaders);

    context.logger?.institutionDetected?.(
      profile.id,
      profile.id !== "unknown" ? 1.0 : 0.3,
      profile.name,
    );

    return records.map((record) => {
      const rawData    = record.rawData;
      const datasetKey = detectDataset(getDatasetValue(rawData));
      const datasetType = /** @type {import("../models/ingestionTypes.js").NormalizedRecord["datasetType"]} */ (
        DATASET_TYPE_MAP[datasetKey] ?? "transaction"
      );

      let fields = {};
      const warnings = [];

      try {
        switch (datasetType) {
          case "transaction":   fields = extractTransaction(rawData, profile);  break;
          case "holding":       fields = extractHolding(rawData);                break;
          case "cashBalance":   fields = extractCashBalance(rawData);            break;
          case "snapshot":      fields = extractSnapshot(rawData);               break;
          case "passiveIncome": fields = extractPassiveIncome(rawData);          break;
        }
      } catch (err) {
        warnings.push({
          level:       "error",
          code:        "NORMALIZATION_FAILED",
          message:     err instanceof Error ? err.message : String(err),
          field:       undefined,
          rawValue:    undefined,
          coercedValue: undefined,
          recoverable: false,
          ruleId:      "rowNormalizer",
        });
      }

      // OCR confidence from meta (preserved if source is OCR)
      if (record.meta.ocrConfidence !== undefined) {
        fields.ocrConfidence = record.meta.ocrConfidence;
      }

      return {
        source:      record,
        datasetType,
        profile,
        fields,
        warnings:    [...record.warnings, ...warnings],
      };
    });
  },
};
