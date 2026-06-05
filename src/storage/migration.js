/**
 * @fileoverview Migração v1 → v2 do schema de dados financeiros.
 *
 * PRINCÍPIOS:
 *   • Não-destrutiva: chaves legadas preservadas até clearAll
 *   • Idempotente: rodar duas vezes produz o mesmo resultado
 *   • Fail-safe: qualquer erro → app inicia com estado limpo, nunca quebra
 *   • Rastreável: source: "migrated", migratedAt gravado
 *
 * FONTES:
 *   "financial-dashboard.importedData.v1"
 *     → transacoes[]   → Transaction[]
 *     → patrimonio[]   → PortfolioSnapshot[]
 *     → classe[]       → Holding[]
 *     → banco[]        → CashBalance[]
 *     → rendaPassiva[] → PassiveIncomeRecord[]
 *
 *   "financial-dashboard.investments.v2"
 *     → Investment[]   → Holding[]  (merge com classe[])
 *
 *   "auren.onboarding.v1"
 *     → profile.primaryGoal → Goal
 *
 * @module storage/migration
 */

import {
  WEALTH_STORAGE_KEY,
  SCHEMA_VERSION,
  EMPTY_WEALTH_STATE,
  LEGACY_DATA_KEY,
  LEGACY_INVESTMENTS_KEY,
  LEGACY_ONBOARDING_KEY,
  MIGRATION_FLAG_KEY,
  loadWealthState,
  saveWealthState,
  hasLegacyData,
} from "./wealthStorage.js";

import {
  classeToHolding,
  bancoToCashBalance,
  patrimonioToSnapshot,
  transacaoToTransaction,
  rendaPassivaToRecord,
  legacyInvestmentToHolding,
} from "../domain/converters.js";

import { nowIso } from "../domain/dateUtils.js";

import {
  holdingFingerprint,
  cashBalanceFingerprint,
  transactionFingerprint,
  snapshotFingerprint,
  passiveIncomeFingerprint,
  mergeByFingerprint,
} from "../domain/fingerprint.js";

// ── Loaders das chaves legadas ────────────────────────────────────────────

const loadLegacyImportedData = () => {
  try {
    const raw = localStorage.getItem(LEGACY_DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Suporta envelope { version, savedAt, data: {...} } e shape raw
    const data = parsed?.data ?? parsed;
    return {
      transacoes:   Array.isArray(data?.transacoes)   ? data.transacoes   : [],
      patrimonio:   Array.isArray(data?.patrimonio)   ? data.patrimonio   : [],
      classe:       Array.isArray(data?.classe)       ? data.classe       : [],
      banco:        Array.isArray(data?.banco)        ? data.banco        : [],
      rendaPassiva: Array.isArray(data?.rendaPassiva) ? data.rendaPassiva : [],
    };
  } catch {
    return null;
  }
};

const loadLegacyInvestments = () => {
  try {
    const raw = localStorage.getItem(LEGACY_INVESTMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadLegacyOnboarding = () => {
  try {
    const raw = localStorage.getItem(LEGACY_ONBOARDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const loadLegacyImageRegistry = () => {
  try {
    const raw = localStorage.getItem("financial-dashboard.investmentImages.v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// ── Deduplicação por fingerprint determinística ───────────────────────────
//
// Cada função delega para mergeByFingerprint com a função de fingerprint
// correta da entidade. Adiciona apenas itens cujo fingerprint ainda não
// existe no array existente — sem substituição (merge não-destrutivo).

/**
 * Merge de holdings por fingerprint determinística.
 * fingerprint = "h::{institutionId}::{normalizedLabel}::{YYYY-MM}"
 */
const mergeHoldings = (existing, incoming) =>
  mergeByFingerprint(existing, incoming, holdingFingerprint);

/**
 * Merge de CashBalances por fingerprint determinística.
 * fingerprint = "cb::{institutionId}::{accountType}::{YYYY-MM}"
 */
const mergeCashBalances = (existing, incoming) =>
  mergeByFingerprint(existing, incoming, cashBalanceFingerprint);

/**
 * Merge de snapshots por fingerprint determinística.
 * fingerprint = "ss::{date}" ou "ss::{YYYY-MM}" para datePrecision=month
 */
const mergeSnapshots = (existing, incoming) =>
  mergeByFingerprint(existing, incoming, snapshotFingerprint);

/**
 * Merge de transações por fingerprint determinística.
 * fingerprint = "tx::{date}::{normalizedDesc}::{centavos}"
 */
const mergeTransactions = (existing, incoming) =>
  mergeByFingerprint(existing, incoming, transactionFingerprint);

/**
 * Merge de PassiveIncomeRecords por fingerprint determinística.
 * fingerprint = "pi::{YYYY-MM}"
 */
const mergePassiveIncome = (existing, incoming) =>
  mergeByFingerprint(existing, incoming, passiveIncomeFingerprint);

// ── Goal migration ────────────────────────────────────────────────────────

const GOAL_KIND_MAP = {
  control: "custom",
  invest:  "net_worth",
  wealth:  "net_worth",
  save:    "savings_rate",
  freedom: "passive_income",
};

const GOAL_TARGET_MAP = {
  net_worth:      1_000_000,
  passive_income: 5_000,
  savings_rate:   50,
  custom:         0,
};

const migrateGoal = (onboarding) => {
  if (!onboarding?.profile?.primaryGoal) return [];

  const goalId = onboarding.profile.primaryGoal;
  const kind = GOAL_KIND_MAP[goalId] ?? "custom";

  return [{
    id: crypto.randomUUID(),
    kind,
    label: onboarding.profile.primaryGoalLabel || goalId,
    icon: undefined,
    targetAmountBRL: GOAL_TARGET_MAP[kind] ?? 1_000_000,
    targetDate: undefined,
    isPrimary: true,
    createdAt: nowIso(),
  }];
};

// ── Migração principal ────────────────────────────────────────────────────

/**
 * Executa a migração v1 → v2 se necessário.
 * Idempotente: verifica o flag antes de rodar.
 * Fail-safe: erro em qualquer passo não quebra o app.
 *
 * @returns {{ migrated: boolean, reason: string }}
 */
export const runMigration = () => {
  if (typeof window === "undefined") {
    return { migrated: false, reason: "no-window" };
  }

  // Já foi migrado
  if (localStorage.getItem(MIGRATION_FLAG_KEY)) {
    return { migrated: false, reason: "already-migrated" };
  }

  // Novo usuário: não tem dados legados
  if (!hasLegacyData()) {
    try {
      localStorage.setItem(MIGRATION_FLAG_KEY, nowIso());
    } catch {}
    return { migrated: false, reason: "no-legacy-data" };
  }

  try {
    const legacyData     = loadLegacyImportedData();
    const legacyInvest   = loadLegacyInvestments();
    const legacyOnboard  = loadLegacyOnboarding();
    const legacyImages   = loadLegacyImageRegistry();

    // Carrega estado atual (pode já ter dados de sessões parciais)
    const current = loadWealthState();

    // ── Converter e mergear cada dataset ───────────────────────────────
    let holdings     = [...current.holdings];
    let cashBalances = [...current.cashBalances];
    let snapshots    = [...current.snapshots];
    let transactions = [...current.transactions];
    let passiveIncome = [...current.passiveIncome];
    let goals        = [...current.goals];

    if (legacyData) {
      // classe[] → Holding[]
      const fromClasse = (legacyData.classe || []).map(classeToHolding);
      holdings = mergeHoldings(holdings, fromClasse);

      // banco[] → CashBalance[]
      const fromBanco = (legacyData.banco || []).map(bancoToCashBalance);
      cashBalances = mergeCashBalances(cashBalances, fromBanco);

      // patrimonio[] → PortfolioSnapshot[]
      const fromPatrimonio = (legacyData.patrimonio || []).map(patrimonioToSnapshot);
      snapshots = mergeSnapshots(snapshots, fromPatrimonio);

      // transacoes[] → Transaction[]
      const fromTransacoes = (legacyData.transacoes || []).map(transacaoToTransaction);
      transactions = mergeTransactions(transactions, fromTransacoes);

      // rendaPassiva[] → PassiveIncomeRecord[]
      const fromRendaPassiva = (legacyData.rendaPassiva || []).map(rendaPassivaToRecord);
      passiveIncome = mergePassiveIncome(passiveIncome, fromRendaPassiva);
    }

    // investments[] → Holding[] (merge com classe[])
    if (legacyInvest.length > 0) {
      const fromInvest = legacyInvest.map(legacyInvestmentToHolding);
      holdings = mergeHoldings(holdings, fromInvest);
    }

    // Goal da onboarding
    if (goals.length === 0 && legacyOnboard) {
      goals = migrateGoal(legacyOnboard);
    }

    // ── Gravar estado migrado ───────────────────────────────────────────
    const migratedState = {
      schemaVersion: SCHEMA_VERSION,
      migratedAt: nowIso(),
      holdings,
      cashBalances,
      snapshots,
      transactions,
      passiveIncome,
      goals,
      imageRegistry: legacyImages,
    };

    const saved = saveWealthState(migratedState);
    if (!saved) throw new Error("saveWealthState falhou");

    // Marcar migração como concluída
    localStorage.setItem(MIGRATION_FLAG_KEY, nowIso());

    return { migrated: true, reason: "success" };

  } catch (err) {
    // Fail-safe: log e deixa app iniciar com estado vazio
    console.warn("[migration] Erro na migração v1→v2:", err.message);
    try {
      localStorage.setItem(MIGRATION_FLAG_KEY, `error:${nowIso()}`);
    } catch {}
    return { migrated: false, reason: `error:${err.message}` };
  }
};

// ── Export de helpers de merge (reutilizados em WealthContext) ────────────

export {
  mergeHoldings,
  mergeCashBalances,
  mergeSnapshots,
  mergeTransactions,
  mergePassiveIncome,
};
