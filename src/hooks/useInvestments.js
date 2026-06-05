/**
 * @fileoverview Bridge: useInvestments → WealthStore + OCR session UI.
 *
 * RESPONSABILIDADES:
 *   • Lê holdings do WealthContext e os expõe no shape legado esperado por InvestmentsTab
 *   • Gerencia estado de UI da sessão OCR localmente (isProcessingImage, ocrResult, ocrError)
 *   • Delega todas as mutações de domínio ao WealthContext
 *
 * A API pública é preservada para compatibilidade com InvestmentsTab.jsx.
 * No Sprint 3, InvestmentsTab consumirá o WealthStore diretamente.
 *
 * @module hooks/useInvestments
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { extractInvestmentsFromImage, getImageFingerprint } from "../parsers/imageParser.js";
import { useWealthStore, selectInvestmentHoldings } from "./useWealthStore.js";
import { getAssetClass, resolveAssetClass } from "../domain/assetClassRegistry.js";
import { holdingToLegacyInvestment } from "../domain/converters.js";
import { resolveInstitutionId } from "../domain/institutionRegistry.js";
import { parseDateToISO, todayIso, nowIso } from "../domain/dateUtils.js";

export const useInvestments = () => {
  // ── Domain state ──────────────────────────────────────────────────────────
  const {
    state,
    addHolding,
    updateHolding,
    removeHolding,
    confirmOcrItems,
    addImageFingerprint,
    hasImageFingerprint,
    clearHoldings,
  } = useWealthStore();

  // ── UI state da sessão OCR (local) ────────────────────────────────────────
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [ocrResult,         setOcrResult]         = useState(null);
  const [ocrError,          setOcrError]          = useState(null);

  // Ref-based lock: prevents concurrent OCR runs from racing each other.
  // A ref (not state) avoids triggering a re-render on acquire/release.
  const ocrLockRef = useRef(false);

  // ── Seletor: holdings filtrados para a view Investimentos ─────────────────
  // Todos os holdings são "investimentos" — CashBalance é separado.
  const investmentHoldings = useMemo(
    () => selectInvestmentHoldings(state),
    [state],
  );

  // Shape legado para InvestmentsTab
  const investments = useMemo(
    () => investmentHoldings.map(holdingToLegacyInvestment),
    [investmentHoldings],
  );

  // ── Aggregações (legado) ──────────────────────────────────────────────────

  const totalValue = useMemo(
    () => investmentHoldings.reduce((s, h) => s + h.valueBRL, 0),
    [investmentHoldings],
  );

  // byType: { "Renda Fixa": 50000, "FIIs": 20000 ... }
  const byType = useMemo(() =>
    investmentHoldings.reduce((acc, h) => {
      const label = getAssetClass(h.assetClassId).label;
      acc[label] = (acc[label] || 0) + h.valueBRL;
      return acc;
    }, {}),
  [investmentHoldings]);

  // byInst: { "XP Investimentos": 80000, ... }
  const byInst = useMemo(() =>
    investmentHoldings.reduce((acc, h) => {
      acc[h.institutionLabel] = (acc[h.institutionLabel] || 0) + h.valueBRL;
      return acc;
    }, {}),
  [investmentHoldings]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addManual = useCallback((inv) => {
    // inv: { instituicao, nome, tipo, valor, data } (shape do ManualForm)
    addHolding({
      holdingKind: "position",
      assetClassId: resolveAssetClass(inv.tipo),
      label: inv.nome || inv.tipo || "Sem nome",
      institutionId: resolveInstitutionId(inv.instituicao),
      institutionLabel: inv.instituicao || "Desconhecida",
      value: inv.valor || 0,
      currency: "BRL",
      valueBRL: inv.valor || 0,
      source: "manual",
      snapshotDate: parseDateToISO(inv.data) || todayIso(),
      datePrecision: inv.data ? "day" : "month",
    });
  }, [addHolding]);

  const update = useCallback((id, changes) => {
    // Mapeia campos legados para novos campos
    const mapped = {};
    if (changes.nome !== undefined)       mapped.label = changes.nome;
    if (changes.tipo !== undefined)       mapped.assetClassId = resolveAssetClass(changes.tipo);
    if (changes.valor !== undefined)      { mapped.value = changes.valor; mapped.valueBRL = changes.valor; }
    if (changes.instituicao !== undefined) {
      mapped.institutionId = resolveInstitutionId(changes.instituicao);
      mapped.institutionLabel = changes.instituicao;
    }
    if (changes.data !== undefined) {
      mapped.snapshotDate = parseDateToISO(changes.data) || todayIso();
    }
    updateHolding(id, mapped);
  }, [updateHolding]);

  const remove = useCallback((id) => removeHolding(id), [removeHolding]);

  // ── OCR ───────────────────────────────────────────────────────────────────

  const processImage = useCallback(async (file) => {
    // Concurrency guard: if a previous OCR is still running, reject immediately.
    // Using a ref so acquire/release doesn't trigger extra renders.
    if (ocrLockRef.current) {
      setOcrError("Aguarde o processamento da imagem anterior antes de enviar outra.");
      return;
    }

    const fp = getImageFingerprint(file);

    if (hasImageFingerprint(fp)) {
      setOcrError("Esta imagem já foi importada anteriormente.");
      return;
    }

    ocrLockRef.current = true;
    setIsProcessingImage(true);
    setOcrError(null);
    setOcrResult(null);

    try {
      const extracted = await extractInvestmentsFromImage(file);
      if (!extracted.length) {
        setOcrError("Não encontrei investimentos nesta imagem. Tente uma captura mais clara.");
      } else {
        setOcrResult({ items: extracted, file: file.name, fp });
      }
    } catch (e) {
      setOcrError(`Erro ao processar imagem: ${e.message}`);
    } finally {
      ocrLockRef.current = false;
      setIsProcessingImage(false);
    }
  }, [hasImageFingerprint]);

  const confirmOcr = useCallback((items) => {
    if (!ocrResult) return;
    confirmOcrItems(items, ocrResult.fp);
    setOcrResult(null);
  }, [ocrResult, confirmOcrItems]);

  const dismissOcr = useCallback(() => setOcrResult(null), []);

  const clearAll = useCallback(() => {
    // Atomic: single setState in WealthContext removes all holdings + imageRegistry
    // in one update — no intermediate renders, no multiple localStorage writes.
    // CashBalances, snapshots, transactions, and goals are preserved.
    clearHoldings();
    setOcrResult(null);
    setOcrError(null);
  }, [clearHoldings]);

  // ── Return (API legada preservada) ───────────────────────────────────────

  return {
    investments,
    totalValue,
    byType,
    byInst,
    isProcessingImage,
    ocrResult,
    ocrError,
    addManual,
    update,
    remove,
    processImage,
    confirmOcr,
    dismissOcr,
    clearAll,
  };
};
