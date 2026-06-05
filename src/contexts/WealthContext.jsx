/**
 * @fileoverview Context React do domínio de patrimônio.
 *
 * WealthContext é o único ponto de verdade para o estado financeiro.
 * Substitui useFinancialData + useInvestments como store de domínio.
 *
 * O que vive aqui:
 *   • WealthState (holdings, cashBalances, snapshots, transactions, goals, etc.)
 *   • Todas as mutações do domínio
 *
 * O que NÃO vive aqui (fica nos hooks de bridge):
 *   • Estado de UI da sessão de import (isImporting, importLog, etc.)
 *   • Estado de UI do review de categorias (showReview)
 *   • Lógica específica de cada tab
 *
 * @module contexts/WealthContext
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  EMPTY_WEALTH_STATE,
} from "../storage/wealthStorage.js";
import { defaultWealthRepository } from "../storage/wealthRepository.js";
import {
  mergeHoldings,
  mergeCashBalances,
  mergeTransactions,
  mergePassiveIncome,
} from "../storage/migration.js";
import {
  upsertSnapshot,
  mergeSnapshots,
} from "../domain/snapshotStrategy.js";
import {
  classeToHolding,
  bancoToCashBalance,
  patrimonioToSnapshot,
  transacaoToTransaction,
  rendaPassivaToRecord,
  ocrItemToHolding,
} from "../domain/converters.js";
import { resolveAssetClass } from "../domain/assetClassRegistry.js";
import { resolveInstitutionId } from "../domain/institutionRegistry.js";
import { todayIso, nowIso } from "../domain/dateUtils.js";

// ── Context ────────────────────────────────────────────────────────────────

const WealthContext = createContext(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function WealthProvider({ children, repository = defaultWealthRepository }) {
  const [state, setState] = useState(() => repository.load());

  // Persiste sempre que o state muda
  useEffect(() => {
    repository.save(state);
  }, [state, repository]);

  // ── Holdings ─────────────────────────────────────────────────────────────

  const addHolding = useCallback((holding) => {
    const now = nowIso();
    const complete = {
      id: holding.id || crypto.randomUUID(),
      holdingKind: holding.holdingKind,          // "allocation" | "position" | undefined
      assetClassId: holding.assetClassId || resolveAssetClass(holding.label),
      label: holding.label || "Sem nome",
      ticker: holding.ticker,
      institutionId: holding.institutionId || resolveInstitutionId(holding.institutionLabel) || "unknown",
      institutionLabel: holding.institutionLabel || holding.label || "Desconhecida",
      quantity: holding.quantity,
      pricePerUnit: holding.pricePerUnit,
      value: holding.value || 0,
      currency: holding.currency || "BRL",
      valueBRL: holding.valueBRL ?? (holding.currency === "BRL" || !holding.currency ? holding.value || 0 : 0),
      fxRateUsed: holding.fxRateUsed,
      source: holding.source || "manual",
      snapshotDate: holding.snapshotDate || todayIso(),
      datePrecision: holding.datePrecision || "day",
      createdAt: holding.createdAt || now,
      updatedAt: now,
      ocrConfidence: holding.ocrConfidence,
      notes: holding.notes,
      rawImport: holding.rawImport,
    };
    setState((s) => ({ ...s, holdings: [...s.holdings, complete] }));
  }, []);

  const updateHolding = useCallback((id, changes) => {
    setState((s) => ({
      ...s,
      holdings: s.holdings.map((h) =>
        h.id === id ? { ...h, ...changes, updatedAt: nowIso() } : h,
      ),
    }));
  }, []);

  const removeHolding = useCallback((id) => {
    setState((s) => ({ ...s, holdings: s.holdings.filter((h) => h.id !== id) }));
  }, []);

  // ── CashBalances ──────────────────────────────────────────────────────────

  const addCashBalance = useCallback((balance) => {
    const now = nowIso();
    const complete = {
      id: balance.id || crypto.randomUUID(),
      institutionId: balance.institutionId || resolveInstitutionId(balance.institutionLabel) || "unknown",
      institutionLabel: balance.institutionLabel || "Desconhecida",
      accountType: balance.accountType || "checking",
      label: balance.label,
      balance: balance.balance || 0,
      currency: balance.currency || "BRL",
      balanceBRL: balance.balanceBRL ?? (balance.currency === "BRL" || !balance.currency ? balance.balance || 0 : 0),
      fxRateUsed: balance.fxRateUsed,
      source: balance.source || "manual",
      snapshotDate: balance.snapshotDate || todayIso(),
      datePrecision: balance.datePrecision || "day",
      createdAt: balance.createdAt || now,
      updatedAt: now,
    };
    setState((s) => ({ ...s, cashBalances: [...s.cashBalances, complete] }));
  }, []);

  const updateCashBalance = useCallback((id, changes) => {
    setState((s) => ({
      ...s,
      cashBalances: s.cashBalances.map((b) =>
        b.id === id ? { ...b, ...changes, updatedAt: nowIso() } : b,
      ),
    }));
  }, []);

  const removeCashBalance = useCallback((id) => {
    setState((s) => ({ ...s, cashBalances: s.cashBalances.filter((b) => b.id !== id) }));
  }, []);

  // ── Import em bulk (resultado do pipeline de importação) ──────────────────
  //
  // Recebe o shape legado { transacoes, patrimonio, classe, banco, rendaPassiva }
  // do importPipeline e converte + mergeia no novo schema.
  // Snapshots usam mergeSnapshots com política de prioridade (snapshotStrategy).

  const mergeImportResult = useCallback((importData) => {
    setState((prev) => {
      const newHoldings   = (importData.classe       || []).map(classeToHolding);
      const newBalances   = (importData.banco        || []).map(bancoToCashBalance);
      const newSnapshots  = (importData.patrimonio   || []).map(patrimonioToSnapshot);
      const newTxs        = (importData.transacoes   || []).map(transacaoToTransaction);
      const newPassive    = (importData.rendaPassiva || []).map(rendaPassivaToRecord);

      return {
        ...prev,
        holdings:      mergeHoldings(prev.holdings, newHoldings),
        cashBalances:  mergeCashBalances(prev.cashBalances, newBalances),
        snapshots:     mergeSnapshots(prev.snapshots, newSnapshots),   // priority-aware
        transactions:  mergeTransactions(prev.transactions, newTxs),
        passiveIncome: mergePassiveIncome(prev.passiveIncome, newPassive),
      };
    });
  }, []);

  // ── Transações ────────────────────────────────────────────────────────────

  const updateTransactionCategory = useCallback((id, category, subcategory = "") => {
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) =>
        t.id === id
          ? { ...t, category, subcategory, categorySource: "user" }
          : t,
      ),
    }));
  }, []);

  // ── Snapshots ─────────────────────────────────────────────────────────────
  //
  // upsertSnapshot aplica a política de prioridade:
  //   manual(3) > imported(2) = migrated(2) > auto(1) > derived(0)
  // Um snapshot de menor prioridade nunca sobrescreve um de maior.

  const addSnapshot = useCallback((snapshot) => {
    const complete = {
      id: snapshot.id || crypto.randomUUID(),
      date: snapshot.date || todayIso(),
      totalBRL: snapshot.totalBRL || 0,
      byAssetClass: snapshot.byAssetClass || {},
      byInstitution: snapshot.byInstitution || {},
      source: snapshot.source || "manual",
      datePrecision: snapshot.datePrecision || "day",
      createdAt: snapshot.createdAt || nowIso(),
    };
    setState((s) => ({
      ...s,
      snapshots: upsertSnapshot(s.snapshots, complete),
    }));
  }, []);

  // ── Goals ─────────────────────────────────────────────────────────────────

  const upsertGoal = useCallback((goal) => {
    setState((s) => {
      const exists = s.goals.find((g) => g.id === goal.id);
      if (exists) {
        return {
          ...s,
          goals: s.goals.map((g) => g.id === goal.id ? { ...g, ...goal } : g),
        };
      }
      const newGoal = {
        id: goal.id || crypto.randomUUID(),
        kind: goal.kind || "custom",
        label: goal.label || "",
        icon: goal.icon,
        targetAmountBRL: goal.targetAmountBRL || 0,
        targetDate: goal.targetDate,
        isPrimary: goal.isPrimary ?? false,
        status: goal.status || "active",
        currency: goal.currency || "BRL",
        createdAt: goal.createdAt || nowIso(),
      };
      return { ...s, goals: [...s.goals, newGoal] };
    });
  }, []);

  // ── OCR image registry ────────────────────────────────────────────────────

  const addImageFingerprint = useCallback((fp) => {
    setState((s) => ({
      ...s,
      imageRegistry: s.imageRegistry.includes(fp)
        ? s.imageRegistry
        : [...s.imageRegistry, fp],
    }));
  }, []);

  const hasImageFingerprint = useCallback((fp) =>
    state.imageRegistry.includes(fp),
  [state.imageRegistry]);

  // ── OCR confirm ───────────────────────────────────────────────────────────

  const confirmOcrItems = useCallback((items, imageFp) => {
    const newHoldings = items.map(ocrItemToHolding);
    setState((s) => ({
      ...s,
      holdings: mergeHoldings(s.holdings, newHoldings),
      imageRegistry: imageFp && !s.imageRegistry.includes(imageFp)
        ? [...s.imageRegistry, imageFp]
        : s.imageRegistry,
    }));
  }, []);

  // ── Clear holdings only (atomic — single setState, single localStorage write)
  // Used by the Investments tab "limpar tudo" action. CashBalances, snapshots,
  // transactions, and goals are intentionally preserved.

  const clearHoldings = useCallback(() => {
    setState((s) => ({ ...s, holdings: [], imageRegistry: [] }));
  }, []);

  // ── Clear all ─────────────────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    setState({ ...EMPTY_WEALTH_STATE });
    repository.clearLegacy();
  }, [repository]);

  // ── Context value ─────────────────────────────────────────────────────────

  const value = {
    state,

    // Holdings
    addHolding,
    updateHolding,
    removeHolding,

    // CashBalances
    addCashBalance,
    updateCashBalance,
    removeCashBalance,

    // Import
    mergeImportResult,

    // Transactions
    updateTransactionCategory,

    // Snapshots
    addSnapshot,

    // Goals
    upsertGoal,

    // OCR
    addImageFingerprint,
    hasImageFingerprint,
    confirmOcrItems,

    // Partial clear
    clearHoldings,

    // Nuclear
    clearAll,
  };

  return (
    <WealthContext.Provider value={value}>
      {children}
    </WealthContext.Provider>
  );
}

// ── Hook de acesso ─────────────────────────────────────────────────────────

/**
 * Acessa o WealthContext.
 * Deve ser usado dentro de WealthProvider.
 * @returns {ReturnType<typeof WealthProvider>["props"]["value"]} — TypeScript inferido
 */
export const useWealth = () => {
  const ctx = useContext(WealthContext);
  if (!ctx) throw new Error("useWealth deve ser usado dentro de <WealthProvider>");
  return ctx;
};

export { WealthContext };
