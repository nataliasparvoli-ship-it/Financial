/**
 * @fileoverview Bridge: useFinancialData → WealthStore + import session UI.
 *
 * RESPONSABILIDADES:
 *   • Domínio: delegado 100% ao WealthContext (via useWealthStore)
 *   • UI da sessão de import: gerenciado localmente aqui
 *     (isImporting, importLog, importSummary, duplicateAlert, showReview)
 *
 * A API pública é preservada para compatibilidade com DashboardPage.
 * No Sprint 3, DashboardPage consumirá seletores diretamente e
 * este hook será simplificado ou removido.
 *
 * @module hooks/useFinancialData
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { importFiles, clearImportedFileRegistry } from "../import/importPipeline.js";
import { learnRule } from "../storage/userRulesStorage.js";
import { useWealthStore, selectLegacyImportedData } from "./useWealthStore.js";
import { resolveAssetClass } from "../domain/assetClassRegistry.js";
import { resolveInstitutionId } from "../domain/institutionRegistry.js";
import { todayIso, nowIso } from "../domain/dateUtils.js";

// ── Duplicate detection ───────────────────────────────────────────────────────
// Content-based matching: incoming vs already-committed legacy data.
// Returns an array of IDs (from `incoming`) that likely already exist.
// This is a UX hint — the domain fingerprint logic is the authoritative guard.
//
// DESIGN NOTES:
//
// Holdings (classe[]) are intentionally NOT checked here.
// The previous implementation compared by asset class label (e.g., "Renda Fixa"),
// which flagged every new "Renda Fixa" item as a duplicate the moment any existing
// "Renda Fixa" holding was present — false-positive rate ~100% for portfolios with
// multiple products in the same class.
// The authoritative guard (holdingFingerprint = institutionId + normalizedLabel + month
// in fingerprint.js / mergeHoldings) correctly prevents true duplicates at commit time.
// The UX hint has no reliable per-item signal in the legacy shape, so it stays silent.
//
// CashBalances (banco[]) are checked by institution name: reasonable since you typically
// have one account entry per institution in a custódia import.
//
// Transactions are checked by desc+date+amount: high specificity, low false-positive rate.

const detectPotentialDuplicates = (incoming, existing) => {
  const ids = [];

  // Transactions: exact match on description + date + amount
  const existingTxKeys = new Set(
    (existing.transacoes || []).map((t) => `${t.desc}|${t.data}|${t.valor}`),
  );
  (incoming.transacoes || []).forEach((t) => {
    if (existingTxKeys.has(`${t.desc}|${t.data}|${t.valor}`)) ids.push(t.id);
  });

  // Holdings (classe[]): intentionally skipped — see design notes above.
  // holdingFingerprint in fingerprint.js is the authoritative guard.

  // CashBalances: same institution name (UX hint — domain guard is cashBalanceFingerprint)
  const existingBancos = new Set(
    (existing.banco || []).map((b) => (b.banco || "").toLowerCase().trim()),
  );
  (incoming.banco || []).forEach((b) => {
    if (b.banco && existingBancos.has(b.banco.toLowerCase().trim())) ids.push(b.id);
  });

  return ids;
};

export const useFinancialData = () => {
  // ── Domain state (fonte de verdade) ───────────────────────────────────────
  const {
    state,
    mergeImportResult,
    updateTransactionCategory: storeUpdateCategory,
    addHolding,
    addCashBalance,
    removeHolding,
    removeCashBalance,
    clearAll: storeClearAll,
  } = useWealthStore();

  // ── UI state da sessão de import (local, não persiste) ────────────────────
  const [importLog,      setImportLog]      = useState([]);
  const [importSummary,  setImportSummary]  = useState(null);
  const [isImporting,    setIsImporting]    = useState(false);
  const [duplicateAlert, setDuplicateAlert] = useState(null);
  const [showReview,     setShowReview]     = useState(false);

  // ── Staging area: data awaiting user confirmation ─────────────────────────
  // pendingImport holds an import result BEFORE it's committed to WealthState.
  // Cleared either by confirmImport (commit) or cancelImport (discard).
  const [pendingImport, setPendingImport] = useState(null);

  // ── importedData: shape legado derivado do WealthState ────────────────────
  // Memoizado sobre state inteiro — recomputa apenas quando dados mudam.
  // No Sprint 3 será substituído por seletores granulares por tab.
  const importedData = useMemo(
    () => selectLegacyImportedData(state),
    [state],
  );

  // Ref so handleFilesImported always reads latest importedData without
  // needing to be recreated on every state change (stable callback reference).
  const importedDataRef = useRef(importedData);
  useEffect(() => { importedDataRef.current = importedData; }, [importedData]);

  // ── handleFilesImported ───────────────────────────────────────────────────
  // Stages the import result for user review instead of committing immediately.
  // If zero rows, shows summary directly (nothing to review).

  const handleFilesImported = useCallback(async (files) => {
    setIsImporting(true);
    setDuplicateAlert(null);

    try {
      const result = await importFiles(files);

      if (result.hasDuplicates) {
        setDuplicateAlert({ files: result.duplicateFiles });
      }

      if (result.summary.rowsImported > 0) {
        // ── Detect content-based duplicates against already-committed data ─
        // This is a UX hint (pre-deselect likely dupes); domain fingerprinting
        // is the authoritative guard at commit time.
        const duplicateIds = detectPotentialDuplicates(
          result.data,
          importedDataRef.current,
        );

        // ── Stage for review — do NOT commit yet ───────────────────────────
        setPendingImport({
          data:         result.data,
          summary:      result.summary,
          logItems:     result.logItems,
          fileName:     files.map((f) => f.name).join(", "),
          duplicateIds, // ids pre-deselected in ImportReviewFlow
        });
      } else {
        // Nothing to review — just surface the summary
        setImportSummary(result.summary);
        setImportLog((prev) => [...result.logItems, ...prev]);
      }

    } catch (error) {
      setImportLog((prev) => [{
        id: crypto.randomUUID(),
        file: "importação",
        error: true,
        message: `Não foi possível importar os arquivos. ${error.message}`,
      }, ...prev]);
    } finally {
      setIsImporting(false);
    }
  }, []);

  // ── confirmImport ─────────────────────────────────────────────────────────
  // Called by ImportReviewFlow when the user approves (possibly edited) items.
  // approvedData is the filtered + category-corrected legacy shape.

  const confirmImport = useCallback((approvedData) => {
    if (!pendingImport) return;
    mergeImportResult(approvedData);
    setImportSummary(pendingImport.summary);
    setImportLog((prev) => [...pendingImport.logItems, ...prev]);
    if ((pendingImport.summary?.categorization?.unmatched ?? 0) > 0) {
      setShowReview(true);
    }
    setPendingImport(null);
  }, [pendingImport, mergeImportResult]);

  // ── cancelImport ──────────────────────────────────────────────────────────
  // Discards the staged import — nothing is committed to WealthState.

  const cancelImport = useCallback(() => {
    if (pendingImport) {
      // Still surface the log entries so the user knows what was attempted
      setImportLog((prev) => [...pendingImport.logItems, ...prev]);
    }
    setPendingImport(null);
  }, [pendingImport]);

  // ── handleCategoryChange ──────────────────────────────────────────────────

  const handleCategoryChange = useCallback((txId, newCategory, newSubcategory = "") => {
    // Aprende a regra para o merchant (side effect: persiste em userRulesStorage)
    const tx = state.transactions.find((t) => t.id === txId);
    if (tx?.normalizedMerchant) {
      learnRule(tx.normalizedMerchant, newCategory, newSubcategory);
    }
    storeUpdateCategory(txId, newCategory, newSubcategory);
  }, [state.transactions, storeUpdateCategory]);

  // ── addManualAsset ────────────────────────────────────────────────────────
  // Single entry point for manual wealth tracking.
  // Replaces the old addManualClasse / addManualBanco split.
  //
  // Entity routing:
  //   assetClassId === "caixa"  → CashBalance (liquid money in an account)
  //   any other class           → Holding     (investment position)
  //
  // This ensures "Bradesco Previdência R$257k" becomes a Holding with
  // assetClassId "previdencia", NOT a checking-account CashBalance.

  const addManualAsset = useCallback(({
    institutionId,
    institutionLabel,
    assetClassId,
    classeLabel,
    valor,
  }) => {
    if (assetClassId === "caixa") {
      addCashBalance({
        institutionId:    institutionId    || resolveInstitutionId(institutionLabel) || "unknown",
        institutionLabel: institutionLabel || "Desconhecida",
        accountType:      "checking",
        balance:          valor,
        currency:         "BRL",
        balanceBRL:       valor,
        source:           "manual",
        snapshotDate:     todayIso(),
        datePrecision:    "day",
      });
    } else {
      addHolding({
        holdingKind:      "allocation",
        assetClassId:     assetClassId || resolveAssetClass(classeLabel),
        label:            classeLabel,
        institutionId:    institutionId    || resolveInstitutionId(institutionLabel) || "unknown",
        institutionLabel: institutionLabel || "Desconhecida",
        value:            valor,
        currency:         "BRL",
        valueBRL:         valor,
        source:           "manual",
        snapshotDate:     todayIso(),
        datePrecision:    "day",
      });
    }
  }, [addHolding, addCashBalance]);

  // ── Legacy handlers (kept for backward compatibility) ────────────────────
  // No longer called by the main UI. Will be removed in Sprint 3.

  const addManualClasse = useCallback(({ classeLabel, valor, cor }) => {
    addHolding({
      assetClassId: resolveAssetClass(classeLabel),
      label: classeLabel,
      institutionId: "unknown",
      institutionLabel: classeLabel,
      value: valor,
      currency: "BRL",
      valueBRL: valor,
      source: "manual",
      snapshotDate: todayIso(),
      datePrecision: "day",
      rawImport: cor ? { cor } : undefined,
    });
  }, [addHolding]);

  const addManualBanco = useCallback(({ banco, valor }) => {
    addCashBalance({
      institutionId: resolveInstitutionId(banco),
      institutionLabel: banco,
      accountType: "checking",
      balance: valor,
      currency: "BRL",
      balanceBRL: valor,
      source: "manual",
      snapshotDate: todayIso(),
      datePrecision: "day",
    });
  }, [addCashBalance]);

  // ── removeManualItem ──────────────────────────────────────────────────────
  // Remove de holdings OU cashBalances (não sabemos de qual sem buscar)

  const removeManualItem = useCallback((id) => {
    removeHolding(id);
    removeCashBalance(id);
  }, [removeHolding, removeCashBalance]);

  // ── clearAll ──────────────────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    storeClearAll();
    setImportLog([]);
    setImportSummary(null);
    setDuplicateAlert(null);
    setShowReview(false);
    clearImportedFileRegistry();
  }, [storeClearAll]);

  const dismissDuplicateAlert = useCallback(() => setDuplicateAlert(null), []);

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    // Shape legado — compatível com DashboardPage, deriveDashboardData etc.
    importedData,

    // UI state
    importLog,
    importSummary,
    isImporting,
    duplicateAlert,
    dismissDuplicateAlert,
    showReview,
    setShowReview,

    // Import review staging
    pendingImport,
    confirmImport,
    cancelImport,

    // Handlers
    handleFilesImported,
    handleCategoryChange,
    addManualClasse,   // @deprecated Sprint 3
    addManualBanco,    // @deprecated Sprint 3
    addManualAsset,
    removeManualItem,
    clearAll,
  };
};
