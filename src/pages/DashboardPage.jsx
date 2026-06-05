/**
 * @fileoverview DashboardPage — shell de navegação por tabs.
 *
 * RESPONSABILIDADES:
 *   • Header sticky com título, badge de saldo e tab bar
 *   • UploadPanel + CategoryReviewPanel (sempre montados, tab-agnósticos)
 *   • Review nudge no header (needsReview compartilhado com TransactionsTab)
 *   • Instanciar o tab ativo — cada tab é isolado e gerencia seu próprio estado
 *
 * O QUE NÃO ESTÁ AQUI:
 *   Seleção de mês (ExpensesTab), filtro de tipo (TransactionsTab),
 *   KPIs mensais (OverviewTab), breakdown por banco (WealthTab).
 *   Cada tab computa suas próprias derivações com useMemo sobre a fatia
 *   de dados que realmente precisa.
 */

import { useMemo, useState } from "react";
import { useApp } from "../contexts/AppContext";
import { MONTHS } from "../utils/deriveMetrics.js";
import CategoryReviewPanel from "../components/CategoryReviewPanel.jsx";
import InvestmentsTab      from "../components/InvestmentsTab.jsx";
import UploadPanel         from "../components/UploadPanel.jsx";
import { deriveDashboardData } from "../utils/deriveMetrics.js";
import { fmtK }            from "../utils/formatters.js";
import { useFinancialData } from "../hooks/useFinancialData.js";
import { useInvestments }   from "../hooks/useInvestments.js";
import { useWealthStore, selectTotalNetWorth } from "../hooks/useWealthStore.js";
import ImportReviewFlow from "../features/importReview/ImportReviewFlow.jsx";
import OverviewTab      from "./tabs/OverviewTab.jsx";
import WealthTab        from "./tabs/WealthTab.jsx";
import ExpensesTab      from "./tabs/ExpensesTab.jsx";
import TransactionsTab  from "./tabs/TransactionsTab.jsx";

const TABS = ["Visão Geral", "Patrimônio", "Despesas", "Transações", "Investimentos"];

export default function DashboardPage() {
  const { profile, dashboardConfig, referenceMonth, setReferenceMonth } = useApp();

  const stepMonth = (delta) => {
    const idx = MONTHS.indexOf(referenceMonth.month);
    let newIdx = idx + delta;
    let newYear = referenceMonth.year;
    if (newIdx < 0)  { newIdx = 11; newYear -= 1; }
    if (newIdx > 11) { newIdx = 0;  newYear += 1; }
    setReferenceMonth({ month: MONTHS[newIdx], year: newYear });
  };

  // ── Shell state ───────────────────────────────────────────────────────────
  const [tab, setTab] = useState(() => dashboardConfig?.initialTab ?? 0);

  // ── Domain data ───────────────────────────────────────────────────────────
  const {
    importedData, importLog, importSummary, isImporting,
    duplicateAlert, dismissDuplicateAlert,
    // Import review staging
    pendingImport, confirmImport, cancelImport,
    // Category review (post-commit)
    showReview, setShowReview,
    // Handlers
    handleFilesImported, handleCategoryChange,
    addManualAsset, removeManualItem,
    clearAll,
  } = useFinancialData();

  // P0: canonical net worth for the header badge
  const { state: wealthState } = useWealthStore();

  const investHook = useInvestments();

  // ── Shared derivation ─────────────────────────────────────────────────────
  // dashboard é passado para os tabs que precisam — cada um extrai apenas
  // sua fatia e memoiza suas próprias derivações secundárias.
  const dashboard = useMemo(
    () => deriveDashboardData(importedData),
    [importedData],
  );

  // ── Review badge (compartilhado: header + TransactionsTab) ────────────────
  const transacoes  = importedData.transacoes;
  const needsReview = transacoes.filter(
    (t) => t.categorySource === "fallback" || (t.confidence ?? 1) < 0.5,
  ).length;

  // ── Total para o badge do header ──────────────────────────────────────────
  // P0: use canonical net worth selector — shows actual holdings + cash total,
  // not a transaction sum (which was misleading for the "net worth" concept).
  const totalBadge = useMemo(() => selectTotalNetWorth(wealthState), [wealthState]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#020617",
      fontFamily: "'Syne', sans-serif",
      color: "#e2e8f0",
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ── HEADER ── */}
      <div style={{
        padding: "16px 16px 0",
        borderBottom: "1px solid #1e293b",
        position: "sticky", top: 0, zIndex: 50,
        backdropFilter: "blur(12px)",
        background: "#020617ee",
      }}>
        {/* Title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f1f5f9", letterSpacing: -0.5 }}>
              Auren
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              {profile?.name && (
                <span style={{ color: "#475569", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>
                  {profile.name} ·
                </span>
              )}
              {/* Global month navigator */}
              <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
                <button
                  onClick={() => stepMonth(-1)}
                  style={{
                    background: "transparent", border: "none", color: "#334155",
                    cursor: "pointer", fontSize: 12, padding: "0 4px", lineHeight: 1,
                    fontFamily: "'DM Mono',monospace",
                  }}
                  aria-label="Mês anterior"
                >◀</button>
                <span style={{
                  color: "#64748b", fontSize: 11,
                  fontFamily: "'DM Mono',monospace",
                  minWidth: 58, textAlign: "center",
                  userSelect: "none",
                }}>
                  {referenceMonth.month}/{referenceMonth.year}
                </span>
                <button
                  onClick={() => stepMonth(1)}
                  style={{
                    background: "transparent", border: "none", color: "#334155",
                    cursor: "pointer", fontSize: 12, padding: "0 4px", lineHeight: 1,
                    fontFamily: "'DM Mono',monospace",
                  }}
                  aria-label="Próximo mês"
                >▶</button>
              </div>
              {dashboardConfig?.primaryGoalLabel && (
                <span style={{
                  background: "#34d39911", border: "1px solid #34d39930",
                  borderRadius: 10, padding: "1px 7px",
                  color: "#34d399", fontSize: 10,
                  fontFamily: "'DM Mono',monospace",
                }}>
                  {dashboardConfig.primaryGoalIcon} {dashboardConfig.primaryGoalLabel}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isImporting && (
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 11, color: "#60a5fa",
                fontFamily: "'DM Mono',monospace",
              }}>
                <span style={{
                  display: "inline-block", width: 10, height: 10,
                  border: "2px solid #60a5fa44",
                  borderTopColor: "#60a5fa",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
                Importando
              </div>
            )}
            <div style={{
              background: "#0f172a", border: "1px solid #1e293b", borderRadius: 20,
              padding: "5px 12px", fontSize: 12, color: "#34d399",
              fontFamily: "'DM Mono',monospace",
            }}>
              {totalBadge > 0 ? fmtK(totalBadge) : "—"}
            </div>
          </div>
        </div>

        {/* Review nudge */}
        {needsReview > 0 && !showReview && (
          <button
            onClick={() => setShowReview(true)}
            style={{
              width: "100%", background: "#fbbf2411", border: "1px solid #fbbf2440",
              borderRadius: 8, color: "#fbbf24", padding: "8px 12px",
              fontSize: 12, cursor: "pointer", marginBottom: 8, textAlign: "left",
              fontFamily: "'DM Mono',monospace",
            }}
          >
            ⚠ {needsReview} transações precisam de revisão → Categorizar agora
          </button>
        )}

        {/* Tab bar — horizontal scroll no mobile */}
        <div style={{
          display: "flex", gap: 0, overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none", msOverflowStyle: "none",
        }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              background:   "transparent",
              border:       "none",
              borderBottom: tab === i ? "2px solid #34d399" : "2px solid transparent",
              color:        tab === i ? "#34d399" : "#64748b",
              padding:      "10px 14px",
              fontSize:     13,
              fontFamily:   "'Syne',sans-serif",
              fontWeight:   tab === i ? 600 : 400,
              cursor:       "pointer",
              whiteSpace:   "nowrap",
              flexShrink:   0,
              transition:   "all 0.15s",
            }}>
              {t}{t === "Investimentos" && investHook.investments.length > 0
                ? ` (${investHook.investments.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding: "16px", maxWidth: 900, margin: "0 auto" }}>

        {/* Import review — shown when user needs to act (staging area) */}
        {pendingImport && (
          <ImportReviewFlow
            pending={pendingImport}
            onConfirm={confirmImport}
            onCancel={cancelImport}
          />
        )}

        {/* Category review — post-commit cleanup */}
        {showReview && !pendingImport && (
          <CategoryReviewPanel
            transactions={transacoes}
            onCategoryChange={handleCategoryChange}
            onClose={() => setShowReview(false)}
          />
        )}

        {/* ── Active tab — primary content ── */}
        {tab === 0 && (
          <OverviewTab
            dashboard={dashboard}
            investTotalValue={investHook.totalValue}
            transacaoCount={transacoes.length}
          />
        )}
        {tab === 1 && (
          <WealthTab
            dashboard={dashboard}
            onAddAsset={addManualAsset}
            onRemoveItem={removeManualItem}
          />
        )}
        {tab === 2 && (
          <ExpensesTab dashboard={dashboard} />
        )}
        {tab === 3 && (
          <TransactionsTab
            transactions={transacoes}
            needsReview={needsReview}
            onShowReview={() => setShowReview(true)}
          />
        )}
        {tab === 4 && (
          <InvestmentsTab hook={investHook} />
        )}

        {/* ── Upload panel — below content so wealth is primary ── */}
        {/* Always accessible but never competing with the hero */}
        <div style={{ marginTop: 8 }}>
          <UploadPanel
            importLog={importLog}
            importSummary={importSummary}
            isImporting={isImporting}
            onFilesImported={handleFilesImported}
            onClearAll={clearAll}
            duplicateAlert={duplicateAlert}
            onDismissDuplicate={dismissDuplicateAlert}
          />
        </div>
      </div>
    </div>
  );
}
