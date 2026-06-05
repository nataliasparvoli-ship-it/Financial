/**
 * @fileoverview Seletores puros do domínio de patrimônio.
 *
 * CONTRATOS:
 *   • Funções puras — sem efeitos colaterais, sem imports React.
 *   • Recebem WealthState como primeiro argumento.
 *   • A UI consome APENAS seletores — nunca acessa state diretamente.
 *   • Seletores são memoizáveis com useMemo sem risco de stale closure.
 *
 * @module selectors/wealth
 */

import { getAssetClass } from "../assetClassRegistry.js";
import {
  holdingToLegacyClasse,
  cashBalanceToLegacyBanco,
  snapshotToLegacyPatrimonio,
  transactionToLegacyTransacao,
  passiveIncomeToLegacy,
} from "../converters.js";
import { createSelector, createParametricSelector } from "./createSelector.js";

// ── Helpers internos ───────────────────────────────────────────────────────

const groupBy = (arr, keyFn) =>
  arr.reduce((map, item) => {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());

const sumBy = (arr, valueFn) =>
  arr.reduce((sum, item) => sum + (valueFn(item) || 0), 0);

// ── Patrimônio total ───────────────────────────────────────────────────────

/**
 * Patrimônio líquido total em BRL.
 * Holdings (investimentos) + CashBalances (liquidez).
 *
 * @param {import("../types.js").WealthState} state
 * @returns {number}
 */
export const selectTotalNetWorth = (state) =>
  sumBy(state.holdings, (h) => h.valueBRL) +
  sumBy(state.cashBalances, (b) => b.balanceBRL);

// ── Alocação por classe ────────────────────────────────────────────────────

/**
 * Alocação total por classe de ativo.
 * Inclui holdings e CashBalances (CashBalance mapeia para "caixa").
 * Memoizado: só recomputa quando holdings ou cashBalances mudam (===).
 *
 * @type {(state: import("../types.js").WealthState) => Array<{ assetClassId: string, label: string, color: string, emoji: string, valueBRL: number, pct: number }>}
 */
export const selectAllocationByClass = createSelector(
  [(s) => s.holdings, (s) => s.cashBalances],
  (holdings, cashBalances) => {
    const totals = new Map();

    holdings.forEach((h) => {
      const current = totals.get(h.assetClassId) || 0;
      totals.set(h.assetClassId, current + h.valueBRL);
    });

    // CashBalances contribuem para a classe "caixa"
    const cashTotal = sumBy(cashBalances, (b) => b.balanceBRL);
    if (cashTotal > 0) {
      totals.set("caixa", (totals.get("caixa") || 0) + cashTotal);
    }

    const totalNetWorth =
      sumBy(holdings, (h) => h.valueBRL) + sumBy(cashBalances, (b) => b.balanceBRL);

    return Array.from(totals.entries())
      .map(([assetClassId, valueBRL]) => {
        const cls = getAssetClass(assetClassId);
        return {
          id: assetClassId,
          assetClassId,
          label: cls.label,
          color: cls.color,
          emoji: cls.emoji,
          valueBRL,
          pct: totalNetWorth > 0 ? (valueBRL / totalNetWorth) * 100 : 0,
        };
      })
      .sort((a, b) => b.valueBRL - a.valueBRL);
  },
);

// ── Exposição por instituição ──────────────────────────────────────────────

/**
 * Exposição total por instituição financeira.
 * Inclui holdings e CashBalances.
 * Memoizado: só recomputa quando holdings ou cashBalances mudam (===).
 *
 * @type {(state: import("../types.js").WealthState) => Array<{ institutionId: string, institutionLabel: string, valueBRL: number, pct: number }>}
 */
export const selectInstitutionExposure = createSelector(
  [(s) => s.holdings, (s) => s.cashBalances],
  (holdings, cashBalances) => {
    const totals = new Map();

    const add = (id, label, value) => {
      if (!totals.has(id)) totals.set(id, { institutionId: id, institutionLabel: label, valueBRL: 0 });
      totals.get(id).valueBRL += value;
    };

    holdings.forEach((h) => add(h.institutionId, h.institutionLabel, h.valueBRL));
    cashBalances.forEach((b) => add(b.institutionId, b.institutionLabel, b.balanceBRL));

    const totalNetWorth =
      sumBy(holdings, (h) => h.valueBRL) + sumBy(cashBalances, (b) => b.balanceBRL);

    return Array.from(totals.values())
      .map((entry) => ({
        ...entry,
        pct: totalNetWorth > 0 ? (entry.valueBRL / totalNetWorth) * 100 : 0,
      }))
      .sort((a, b) => b.valueBRL - a.valueBRL);
  },
);

// ── Holdings por categoria ─────────────────────────────────────────────────

/**
 * Returns only investment positions for the Investments tab view.
 * Excludes allocation-level holdings (class buckets entered via PatrimonioPanel
 * or CSV classe[] imports) which have no product-level identity.
 *
 * Exclusion logic — a holding is an allocation if ANY of:
 *   1. holdingKind === "allocation"  (explicit, set since this change)
 *   2. label exactly matches its asset class label AND source is not "ocr"
 *      (heuristic for legacy data created before holdingKind existed:
 *       a real position name like "CDB XP 12%" never equals "Renda Fixa")
 *
 * Allocation holdings still contribute to selectTotalNetWorth,
 * selectAllocationByClass, and selectInstitutionExposure — this filter
 * is only for the Investments position list.
 *
 * @param {import("../types.js").WealthState} state
 * @returns {import("../types.js").Holding[]}
 */
export const selectInvestmentHoldings = (state) =>
  state.holdings.filter((h) => {
    if (h.holdingKind === "allocation") return false;
    if (!h.holdingKind && h.source !== "ocr") {
      const cls = getAssetClass(h.assetClassId);
      if (h.label === cls.label) return false;
    }
    return true;
  });

/**
 * Ativos de liquidez (contas correntes, poupanças etc).
 *
 * @param {import("../types.js").WealthState} state
 * @returns {import("../types.js").CashBalance[]}
 */
export const selectLiquidAssets = (state) => state.cashBalances;

/**
 * Holdings agrupados por classe de ativo.
 *
 * @param {import("../types.js").WealthState} state
 * @returns {Map<string, import("../types.js").Holding[]>}
 */
export const selectHoldingsByAssetClass = (state) =>
  groupBy(state.holdings, (h) => h.assetClassId);

/**
 * Holdings agrupados por instituição.
 *
 * @param {import("../types.js").WealthState} state
 * @returns {Map<string, import("../types.js").Holding[]>}
 */
export const selectHoldingsByInstitution = (state) =>
  groupBy(state.holdings, (h) => h.institutionId);

// ── Histórico patrimonial ──────────────────────────────────────────────────

/**
 * Snapshots ordenados cronologicamente.
 * Para o PatrimonioChart.
 * Memoizado: só recomputa quando snapshots muda (===).
 *
 * @type {(state: import("../types.js").WealthState) => import("../types.js").PortfolioSnapshot[]}
 */
export const selectPortfolioHistory = createSelector(
  [(s) => s.snapshots],
  (snapshots) => [...snapshots].sort((a, b) => a.date.localeCompare(b.date)),
);

// ── Metas ──────────────────────────────────────────────────────────────────

/**
 * Meta financeira primária do usuário.
 *
 * @param {import("../types.js").WealthState} state
 * @returns {import("../types.js").Goal|null}
 */
export const selectPrimaryGoal = (state) =>
  state.goals.find((g) => g.isPrimary) ?? null;

/**
 * Progresso em % em relação à meta primária.
 * Retorna 0 se não há meta.
 *
 * @param {import("../types.js").WealthState} state
 * @returns {number}  0–100
 */
export const selectGoalProgress = (state) => {
  const goal = selectPrimaryGoal(state);
  if (!goal || !goal.targetAmountBRL) return 0;
  const total = selectTotalNetWorth(state);
  return Math.min((total / goal.targetAmountBRL) * 100, 100);
};

// ── Transações ─────────────────────────────────────────────────────────────

/**
 * Transações filtradas por ano e mês.
 * Memoizado por (year, month) — cache de até 12 entradas.
 *
 * @type {(state: import("../types.js").WealthState, year: number, month: number) => import("../types.js").Transaction[]}
 */
export const selectTransactionsByMonth = createParametricSelector(
  [(s) => s.transactions],
  (transactions, year, month) =>
    transactions.filter((t) => t.year === year && t.month === month),
);

// ── Renda passiva ──────────────────────────────────────────────────────────

/**
 * Renda passiva de um mês específico.
 * Memoizado por (year, month).
 *
 * @type {(state: import("../types.js").WealthState, year: number, month: number) => import("../types.js").PassiveIncomeRecord|null}
 */
export const selectPassiveIncomeByMonth = createParametricSelector(
  [(s) => s.passiveIncome],
  (passiveIncome, year, month) =>
    passiveIncome.find((r) => r.year === year && r.month === month) ?? null,
);

// ── Warnings de migração ───────────────────────────────────────────────────

/**
 * Holdings sem instituição definida (migrados de `classe[]` sem banco associado).
 * Usados para exibir prompt de consolidação pós-migração.
 *
 * @param {import("../types.js").WealthState} state
 * @returns {import("../types.js").Holding[]}
 */
export const selectMigrationWarnings = (state) =>
  state.holdings.filter(
    (h) => h.institutionId === "unknown" && h.source === "migrated",
  );

// ── Wealth insights ────────────────────────────────────────────────────────

/**
 * Dados prontos para o InsightStrip do WealthTab.
 * Retorna null se o patrimônio é zero (sem dados).
 *
 * Lógica de visibilidade (max 2 insights, em ordem de prioridade):
 *   1. largestClass     — sempre exibido quando há dados
 *   2. liquidityPct     — exibido quando < 10 %
 *   3. largestInstitution — exibido quando pct > 40 % E cobertura conhecida > 70 %
 *
 * Não usa createSelector pois delega para seletores já memoizados.
 * O componente envolve a chamada em useMemo([state]).
 *
 * @param {import("../types.js").WealthState} state
 * @returns {{ largestClass: object|null, liquidityPct: number, largestInstitution: object|null } | null}
 */
export const selectWealthInsights = (state) => {
  const netWorth = selectTotalNetWorth(state);
  if (netWorth === 0) return null;

  // ── 1. Asset concentration ─────────────────────────────────────────────
  // selectAllocationByClass is already memoized and sorted by valueBRL desc.
  const alloc       = selectAllocationByClass(state);
  const largestClass = alloc[0] ?? null;          // { assetClassId, label, color, pct, valueBRL }

  // ── 2. Liquidity ───────────────────────────────────────────────────────
  const cashTotal    = sumBy(state.cashBalances, (b) => b.balanceBRL);
  const liquidityPct = (cashTotal / netWorth) * 100;

  // ── 3. Institution concentration ───────────────────────────────────────
  // Exclude "unknown" — no institution = no meaningful concentration signal.
  // Gate on knownCoverage > 70 % to avoid misleading understated percentages
  // (CSV custódia imports leave institutionId: "unknown" until P1 pipeline fix).
  const allExposure   = selectInstitutionExposure(state);
  const knownExposure = allExposure.filter((i) => i.institutionId !== "unknown");
  const knownTotal    = sumBy(knownExposure, (i) => i.valueBRL);
  const knownCoverage = netWorth > 0 ? (knownTotal / netWorth) * 100 : 0;

  // knownExposure[0].pct is relative to full netWorth (not just known portion) —
  // the > 40 threshold therefore means "this institution holds > 40 % of ALL tracked wealth".
  const largestInstitution =
    knownCoverage > 70 && (knownExposure[0]?.pct ?? 0) > 40
      ? knownExposure[0]
      : null;

  return { largestClass, liquidityPct, largestInstitution };
};

// ── Bridge: conversão para shape legado ────────────────────────────────────
//
// Esses seletores existem para permitir que componentes ainda não migrados
// continuem funcionando. Serão removidos no Sprint 3.

/**
 * Converte WealthState para o shape `ImportedFinancialData` legado.
 * Usado pelo bridge em useFinancialData.js e por deriveDashboardData.
 *
 * @param {import("../types.js").WealthState} state
 * @returns {import("../types.js").LegacyImportedData}
 */
export const selectLegacyImportedData = (state) => ({
  transacoes: state.transactions.map(transactionToLegacyTransacao),

  patrimonio: selectPortfolioHistory(state).map(snapshotToLegacyPatrimonio),

  // classe[] = todos os holdings (não CashBalance)
  classe: state.holdings.map(holdingToLegacyClasse),

  // banco[] = todos os CashBalances
  banco: state.cashBalances.map(cashBalanceToLegacyBanco),

  rendaPassiva: [...state.passiveIncome]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(passiveIncomeToLegacy),
});
