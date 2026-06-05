/**
 * @fileoverview Conversores entre schema legado e novo domínio.
 *
 * DIREÇÕES:
 *   legacy → domain  (import de arquivos, migração de localStorage)
 *   domain → legacy  (bridge para componentes ainda não migrados)
 *
 * Toda lógica de mapeamento de campo fica aqui.
 * Componentes e hooks não devem saber de schemas legados.
 *
 * @module converters
 */

import { resolveAssetClass, getAssetClass } from "./assetClassRegistry.js";
import { resolveInstitutionId } from "./institutionRegistry.js";
import {
  inferIsoDateFromMonth,
  parseDateToISO,
  monthLabelFromIso,
  todayIso,
  nowIso,
  MONTH_LABELS,
} from "./dateUtils.js";
import { normalizeAssetLabel, resolveCanonicalTicker } from "./assetNormalizer.js";
import { resolveAssetIdentity } from "./assetIdentityEngine.js";

// ── Mapa de kind legado → TransactionKind ─────────────────────────────────

const TIPO_TO_KIND = {
  "investimento": "investment",
  "aporte": "investment",
  "aplicacao": "investment",
  "aplicação": "investment",
  "receita": "income",
  "salário": "income",
  "salario": "income",
  "renda": "income",
  "transferência": "transfer",
  "transferencia": "transfer",
  "transfer": "transfer",
  "renda passiva": "passive_income",
  "dividendo": "passive_income",
  "dividendos": "passive_income",
  "juros": "passive_income",
  "cupom": "passive_income",
  "despesa": "expense",
  "despesa variável": "expense",
  "despesa variavel": "expense",
  "débito": "expense",
  "debito": "expense",
};

/**
 * @param {string|undefined} tipo
 * @returns {import("./types.js").TransactionKind}
 */
export const mapTransactionKind = (tipo) => {
  if (!tipo) return "expense";
  const key = tipo.toLowerCase().trim();
  if (TIPO_TO_KIND[key]) return TIPO_TO_KIND[key];
  // Substring fallbacks
  if (key.includes("invest") || key.includes("aporte")) return "investment";
  if (key.includes("receita") || key.includes("renda") || key.includes("salário")) return "income";
  if (key.includes("transf")) return "transfer";
  if (key.includes("dividend") || key.includes("juros") || key.includes("cupom")) return "passive_income";
  return "expense";
};

/** @returns {string} Tipo legado a partir de TransactionKind */
const KIND_TO_TIPO = {
  income: "Receita",
  expense: "Despesa variável",
  investment: "Investimento",
  transfer: "Transferência",
  passive_income: "Receita",
};
export const kindToLegacyTipo = (kind) => KIND_TO_TIPO[kind] ?? "Despesa variável";

/**
 * @param {string|undefined} confianca  "alta"|"media"|"baixa"
 * @returns {import("./types.js").OcrConfidence}
 */
export const mapOcrConfidence = (confianca) => {
  const map = { alta: "high", media: "medium", média: "medium", baixa: "low" };
  return map[(confianca || "").toLowerCase()] ?? "medium";
};

const mapConfidenceToLegacy = (confidence) => {
  const map = { high: "alta", medium: "media", low: "baixa" };
  return map[confidence] ?? "media";
};

/**
 * Converte OcrConfidence para score numérico 0–1.
 * @param {import("./types.js").OcrConfidence|undefined} confidence
 * @returns {number|undefined}
 */
const ocrConfidenceToScore = (confidence) => {
  if (!confidence) return undefined;
  return { high: 0.95, medium: 0.70, low: 0.40 }[confidence];
};

// ── legacy → domain ────────────────────────────────────────────────────────

/**
 * Converte item de `importedData.classe[]` para Holding.
 * @param {{ id?: string, classe: string, valor: number, cor?: string, source?: string }} item
 * @returns {import("./types.js").Holding}
 */
export const classeToHolding = (item) => {
  const now = nowIso();
  const today = todayIso();
  return {
    id: item.id || crypto.randomUUID(),
    assetClassId: resolveAssetClass(item.classe),
    label: item.classe || "Desconhecido",
    ticker: undefined,
    institutionId: item.rawImport?.instituicao
      ? resolveInstitutionId(item.rawImport.instituicao)
      : "unknown",
    institutionLabel: item.rawImport?.instituicao || item.classe || "Desconhecido",
    quantity: undefined,
    pricePerUnit: undefined,
    value: item.valor || 0,
    currency: "BRL",
    valueBRL: item.valor || 0,
    fxRateUsed: undefined,
    source: item.source === "manual" ? "manual" : "imported",
    snapshotDate: item.rawImport?.data
      ? (() => {
          // Convert DD/MM/YYYY → YYYY-MM-DD if present
          const [d, m, y] = (item.rawImport.data || "").split("/");
          return y && m && d ? `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}` : today;
        })()
      : today,
    datePrecision: item.rawImport?.data ? "day" : "month",
    createdAt: now,
    updatedAt: now,
    ocrConfidence: item.rawImport?.score ?? undefined,
    notes: item.rawImport?.nome !== item.classe ? item.rawImport?.nome : undefined,
    rawImport: item.rawImport ?? (item.cor ? { cor: item.cor } : undefined),
    // Eventual consistency
    sourceId: item.id || undefined,
    importedAt: now,
    lastSyncedAt: undefined,
    confidenceScore: undefined,
  };
};

/**
 * Converte item de `importedData.banco[]` para CashBalance.
 * @param {{ id?: string, banco: string, valor: number, source?: string }} item
 * @returns {import("./types.js").CashBalance}
 */
export const bancoToCashBalance = (item) => {
  const now = nowIso();
  const today = todayIso();
  return {
    id: item.id || crypto.randomUUID(),
    institutionId: resolveInstitutionId(item.banco),
    institutionLabel: item.banco || "Desconhecida",
    accountType: "checking",
    label: undefined,
    balance: item.valor || 0,
    currency: "BRL",
    balanceBRL: item.valor || 0,
    fxRateUsed: undefined,
    source: item.source === "manual" ? "manual" : "imported",
    snapshotDate: today,
    datePrecision: "month",
    createdAt: now,
    updatedAt: now,
    // Eventual consistency
    sourceId: item.id || undefined,
    importedAt: now,
    lastSyncedAt: undefined,
    confidenceScore: undefined,
  };
};

/**
 * Converte item de `importedData.patrimonio[]` para PortfolioSnapshot.
 * @param {{ id?: string, mes: string, total: number }} item
 * @returns {import("./types.js").PortfolioSnapshot}
 */
export const patrimonioToSnapshot = (item) => ({
  id: item.id || crypto.randomUUID(),
  date: inferIsoDateFromMonth(item.mes),
  totalBRL: item.total || 0,
  byAssetClass: {},
  byInstitution: {},
  source: "migrated",
  datePrecision: "month",
  createdAt: nowIso(),
});

/**
 * Converte item de `importedData.transacoes[]` para Transaction.
 * @param {Object} item
 * @returns {import("./types.js").Transaction}
 */
export const transacaoToTransaction = (item) => {
  const isoDate = parseDateToISO(item.data) || inferIsoDateFromMonth(item.mes);
  const dateObj = new Date(isoDate);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;

  return {
    id: item.id || crypto.randomUUID(),
    date: isoDate,
    year,
    month,
    monthLabel: item.mes || MONTH_LABELS[month - 1] || "Jan",
    amount: item.valor || 0,
    currency: "BRL",
    amountBRL: item.valor || 0,
    kind: mapTransactionKind(item.tipo),
    category: item.cat || "Outros",
    subcategory: item.subcat || undefined,
    description: item.desc || item.descricao || "Sem descrição",
    institutionId: resolveInstitutionId(item.conta) || undefined,
    accountRef: item.conta || undefined,
    categorySource: item.categorySource || "fallback",
    normalizedMerchant: item.normalizedMerchant || undefined,
    categoryRuleId: item.categoryRuleId || undefined,
    createdAt: nowIso(),
    // Eventual consistency
    sourceId: item.id || undefined,
    importedAt: nowIso(),
    lastSyncedAt: undefined,
    confidenceScore: undefined,
  };
};

/**
 * Converte item de `importedData.rendaPassiva[]` para PassiveIncomeRecord.
 * @param {{ id?: string, mes: string, dividendos?: number, juros?: number, cupom?: number, outros?: number }} item
 * @returns {import("./types.js").PassiveIncomeRecord}
 */
export const rendaPassivaToRecord = (item) => {
  const isoDate = inferIsoDateFromMonth(item.mes);
  const dateObj = new Date(isoDate);
  const dividends = item.dividendos || 0;
  const interest = item.juros || 0;
  const coupons = item.cupom || 0;
  const other = item.outros || 0;

  return {
    id: item.id || crypto.randomUUID(),
    date: isoDate,
    year: dateObj.getFullYear(),
    month: dateObj.getMonth() + 1,
    monthLabel: item.mes || "",
    dividends,
    interest,
    coupons,
    other,
    total: dividends + interest + coupons + other,
    currency: "BRL",
    source: "imported",
    // Eventual consistency
    sourceId: item.id || undefined,
    importedAt: nowIso(),
    lastSyncedAt: undefined,
    confidenceScore: undefined,
  };
};

/**
 * Converte item de `investments[]` (useInvestments legacy) para Holding.
 * @param {{ id?: string, nome?: string, tipo?: string, valor?: number, instituicao?: string, data?: string, source?: string, confianca?: string, rentabilidade?: number }} item
 * @returns {import("./types.js").Holding}
 */
export const legacyInvestmentToHolding = (item) => {
  const isoDate = parseDateToISO(item.data);
  const now = nowIso();
  const instId = resolveInstitutionId(item.instituicao);
  const ocrConf = item.confianca ? mapOcrConfidence(item.confianca) : undefined;

  // Resolve identity: prefer explicit ticker, fall back to label/name
  const resolution = resolveAssetIdentity(item.ticker) ?? resolveAssetIdentity(item.nome);

  return {
    id: item.id || crypto.randomUUID(),
    assetClassId: resolveAssetClass(item.tipo),
    label: item.nome || item.tipo || "Desconhecido",
    ticker: resolution?.ticker ?? resolveCanonicalTicker(item.nome, item.ticker) ?? undefined,
    canonicalAssetId: resolution?.canonicalId ?? undefined,
    institutionId: instId,
    institutionLabel: item.instituicao || "Desconhecida",
    quantity: undefined,
    pricePerUnit: undefined,
    value: item.valor || 0,
    currency: "BRL",
    valueBRL: item.valor || 0,
    fxRateUsed: undefined,
    source: item.source === "ocr" ? "ocr" : "manual",
    snapshotDate: isoDate || todayIso(),
    datePrecision: isoDate && !isoDate.endsWith("01") ? "day" : "month",
    createdAt: now,
    updatedAt: now,
    ocrConfidence: ocrConf,
    notes: undefined,
    rawImport: {
      tipo: item.tipo,
      rentabilidade: item.rentabilidade != null ? String(item.rentabilidade) : undefined,
      rawFile: item.rawFile,
    },
    // Eventual consistency
    sourceId: item.id || undefined,
    importedAt: now,
    lastSyncedAt: undefined,
    confidenceScore: ocrConfidenceToScore(ocrConf),
  };
};

/**
 * Converte item extraído pelo OCR (imageParser) para Holding.
 * @param {Object} ocrItem
 * @returns {import("./types.js").Holding}
 */
export const ocrItemToHolding = (ocrItem) => legacyInvestmentToHolding(ocrItem);

// ── domain → legacy (bridge para componentes não migrados) ────────────────

/**
 * Converte Holding para shape legado de `classe[]`.
 * @param {import("./types.js").Holding} holding
 * @returns {import("./types.js").LegacyAsset}
 */
export const holdingToLegacyClasse = (holding) => ({
  id: holding.id,
  classe: holding.label,
  valor: holding.valueBRL,
  cor: getAssetClass(holding.assetClassId).color,
  source: holding.source,
});

/**
 * Converte CashBalance para shape legado de `banco[]`.
 * @param {import("./types.js").CashBalance} balance
 * @returns {import("./types.js").LegacyBankBalance}
 */
export const cashBalanceToLegacyBanco = (balance) => ({
  id: balance.id,
  banco: balance.institutionLabel,
  valor: balance.balanceBRL,
  source: balance.source,
});

/**
 * Converte PortfolioSnapshot para shape legado de `patrimonio[]`.
 * @param {import("./types.js").PortfolioSnapshot} snapshot
 * @returns {import("./types.js").LegacyPatrimonioPoint}
 */
export const snapshotToLegacyPatrimonio = (snapshot) => ({
  id: snapshot.id,
  mes: monthLabelFromIso(snapshot.date),
  total: snapshot.totalBRL,
});

/**
 * Converte Transaction para shape legado de `transacoes[]`.
 * @param {import("./types.js").Transaction} tx
 * @returns {Object}
 */
export const transactionToLegacyTransacao = (tx) => ({
  id: tx.id,
  data: tx.date,
  mes: tx.monthLabel,
  cat: tx.category,
  subcat: tx.subcategory,
  desc: tx.description,
  tipo: kindToLegacyTipo(tx.kind),
  valor: tx.amount,
  conta: tx.accountRef || "Importado",
  categorySource: tx.categorySource,
  normalizedMerchant: tx.normalizedMerchant,
  categoryRuleId: tx.categoryRuleId,
  categoryMatched: tx.categorySource === "auto",
  // confidence preservado para needsReview check no DashboardPage
  confidence: tx.categorySource === "auto" ? 1 : tx.categorySource === "fallback" ? 0.3 : 0.8,
});

/**
 * Converte PassiveIncomeRecord para shape legado de `rendaPassiva[]`.
 * @param {import("./types.js").PassiveIncomeRecord} record
 * @returns {Object}
 */
export const passiveIncomeToLegacy = (record) => ({
  id: record.id,
  mes: record.monthLabel,
  dividendos: record.dividends,
  juros: record.interest,
  cupom: record.coupons,
  outros: record.other,
  total: record.total,
});

/**
 * Converte Holding para o shape legado do `investments[]` (useInvestments).
 * @param {import("./types.js").Holding} holding
 * @returns {Object}
 */
export const holdingToLegacyInvestment = (holding) => ({
  id: holding.id,
  instituicao: holding.institutionLabel,
  nome: holding.label,
  tipo: getAssetClass(holding.assetClassId).label,   // "Renda Fixa", "FIIs" etc
  valor: holding.valueBRL,
  data: holding.snapshotDate,
  source: holding.source,
  rentabilidade: holding.rawImport?.rentabilidade
    ? parseFloat(holding.rawImport.rentabilidade)
    : null,
  confianca: mapConfidenceToLegacy(holding.ocrConfidence),
});
