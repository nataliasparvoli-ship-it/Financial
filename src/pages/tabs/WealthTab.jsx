/**
 * @fileoverview WealthTab — "How much money do I have?"
 *
 * Sprint 3 redesign:
 *   • Hero redesigned: 4-stat grid (Investido, Liquidez, Instituições, Classes)
 *     answers more questions without adding visual weight
 *   • Progress bar inline with its text label (tighter vertical rhythm)
 *   • Section margins tightened: 16 → 12-14px
 *   • All wealth figures from canonical domain selectors (P0)
 *   • No importedData prop — reads WealthStore directly
 *
 * Responsibilities (Part 4):
 *   Wealth = "How much do I have?"
 *   → Net worth, goal progress, allocation by class, institution exposure
 *
 * Investments tab = "What am I invested in?"
 *   → Positions, holdings, product detail, OCR import
 */

import { useMemo, useState } from "react";
import PatrimonioPanel from "../../components/PatrimonioPanel.jsx";
import { CORES } from "../../utils/deriveMetrics.js";
import { fmtK } from "../../utils/formatters.js";
import { useApp } from "../../contexts/AppContext.jsx";
import { nowIso } from "../../domain/dateUtils.js";
import {
  useWealthStore,
  selectTotalNetWorth,
  selectAllocationByClass,
  selectInstitutionExposure,
  selectWealthInsights,
  selectPrimaryGoal,
} from "../../hooks/useWealthStore.js";

// ── Institution card ──────────────────────────────────────────────────────────

function InstitutionCard({ name, value, totalPatrimonio, color }) {
  const pct = totalPatrimonio > 0 ? (value / totalPatrimonio) * 100 : 0;
  return (
    <div style={{
      background: "#0f172a",
      border: `1px solid ${color}22`,
      borderRadius: 12,
      padding: "13px 16px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 70, height: 70,
        background: `radial-gradient(circle at top right, ${color}14 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <p style={{
        color: "#94a3b8", fontSize: 11, margin: "0 0 5px",
        fontFamily: "'Syne',sans-serif", fontWeight: 600,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {name}
      </p>
      <p style={{
        color: color, fontSize: 19, fontWeight: 800, margin: "0 0 8px",
        fontFamily: "'DM Mono',monospace", letterSpacing: -0.5,
      }}>
        {fmtK(value)}
      </p>
      <div style={{ background: "#1e293b", borderRadius: 3, height: 3, marginBottom: 5 }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: 3,
          background: color, transition: "width 0.8s ease",
        }} />
      </div>
      <p style={{ color: "#475569", fontSize: 10, margin: 0, fontFamily: "'DM Mono',monospace" }}>
        {pct.toFixed(1)}%
      </p>
    </div>
  );
}

// ── AllocationRow ─────────────────────────────────────────────────────────────

function AllocationRow({ label, value, totalPatrimonio, color }) {
  const pct = totalPatrimonio > 0 ? (value / totalPatrimonio) * 100 : 0;
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 4,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, flex: 1 }}>
          <span style={{
            width: 7, height: 7, borderRadius: 2, background: color,
            flexShrink: 0, display: "inline-block",
          }} />
          <span style={{
            color: "#e2e8f0", fontSize: 13,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {label}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0, marginLeft: 10 }}>
          <span style={{ color: "#475569", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>
            {pct.toFixed(1)}%
          </span>
          <span style={{
            color: color, fontSize: 13, fontWeight: 600,
            fontFamily: "'DM Mono',monospace", minWidth: 64, textAlign: "right",
          }}>
            {fmtK(value)}
          </span>
        </div>
      </div>
      <div style={{ background: "#1e293b", borderRadius: 3, height: 4, overflow: "hidden" }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: 3,
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
          transition: "width 0.7s ease",
        }} />
      </div>
    </div>
  );
}

// ── InsightStrip ──────────────────────────────────────────────────────────────
// Text-only interpretation layer — no cards, no charts, no icons.
// Appears between the hero and the main data sections.
// Max 2 insights, priority order: asset class → liquidity → institution.

function InsightStrip({ insights }) {
  if (!insights) return null;

  const lines = [];

  // 1. Asset concentration — always shown when data exists
  if (insights.largestClass) {
    const { label, pct } = insights.largestClass;
    lines.push(`${label} representa ${Math.round(pct)}% do patrimônio`);
  }

  // 2. Liquidity — shown when < 10 %
  if (lines.length < 2 && insights.liquidityPct < 10) {
    const rounded = Math.round(insights.liquidityPct);
    lines.push(
      rounded < 1
        ? "Menos de 1% do patrimônio está em liquidez imediata"
        : `Apenas ${rounded}% do patrimônio é líquido`,
    );
  }

  // 3. Institution concentration — shown when > 40 % and known coverage > 70 %
  if (lines.length < 2 && insights.largestInstitution) {
    const { institutionLabel, pct } = insights.largestInstitution;
    lines.push(`${Math.round(pct)}% dos ativos estão na ${institutionLabel}`);
  }

  if (!lines.length) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      {lines.map((line, i) => (
        <p
          key={line}
          style={{
            color: "#475569",
            fontSize: 12,
            margin: i < lines.length - 1 ? "0 0 3px" : 0,
            lineHeight: 1.5,
            fontFamily: "'Syne', sans-serif",
          }}
        >
          {line}
        </p>
      ))}
    </div>
  );
}

// ── WealthTab ─────────────────────────────────────────────────────────────────

export default function WealthTab({ dashboard, onAddAsset, onRemoveItem }) {
  const { rendaPassiva } = dashboard;

  // ── Canonical domain selectors ────────────────────────────────────────────
  const { state } = useWealthStore();

  const totalNetWorth     = useMemo(() => selectTotalNetWorth(state),     [state]);
  const allocationByClass = useMemo(() => selectAllocationByClass(state), [state]);
  const institutionExposure = useMemo(
    () => selectInstitutionExposure(state).filter((i) => i.institutionId !== "unknown"),
    [state],
  );
  const insights = useMemo(() => selectWealthInsights(state), [state]);

  // ── Goal ──────────────────────────────────────────────────────────────────
  // Label:  dashboardConfig is the canonical source — same as the header badge,
  //         formatted by getDashboardConfig from the onboarding profile.
  // Target: domain Goal carries the amount (set during onboarding migration).
  //         Falls back to R$1M when no goal is configured.
  const { dashboardConfig, referenceMonth, goals: appGoals, goalTargetYear, setGoalTargetYear, updateGoals } = useApp();
  const [editingYear, setEditingYear] = useState(false);
  const [yearInput, setYearInput] = useState("");
  const primaryGoal = useMemo(() => selectPrimaryGoal(state), [state]);

  // ── Effective target year ─────────────────────────────────────────────────
  // Source of truth priority:
  //   1. appPatrimonyGoal.targetYear (goal-local, set since this sprint)
  //   2. goalTargetYear (AppContext global fallback — written by older versions)
  // Both are kept in sync on every write so existing users never lose their year.
  const effectiveTargetYear = useMemo(() => {
    const fromGoal = (appGoals ?? []).find((g) => g.id === "patrimony" || g.type === "patrimony")?.targetYear;
    if (fromGoal != null && fromGoal >= 2024 && fromGoal <= 2100) return fromGoal;
    return goalTargetYear;
  }, [appGoals, goalTargetYear]);

  // Write year to both the goal object and the legacy key for backward compat.
  const handleYearSubmit = (y) => {
    setGoalTargetYear(y);
    const updated = (appGoals ?? []).map((g) =>
      g.id === "patrimony" || g.type === "patrimony" ? { ...g, targetYear: y } : g,
    );
    // If no patrimony goal exists yet, create a minimal one so the year is self-contained.
    if (!updated.some((g) => g.id === "patrimony" || g.type === "patrimony")) {
      updated.push({
        id: "patrimony",
        type: "patrimony",
        label: "Patrimônio",
        targetValue: goalTarget,
        targetYear: y,
        status: "active",
        currency: "BRL",
        createdAt: nowIso(),
      });
    }
    updateGoals(updated);
  };
  const goalLabel   = dashboardConfig?.primaryGoalLabel ?? null;

  // Goal target: prefer user-entered patrimony value from onboarding Step 4,
  // then WealthContext domain goal, then 1M fallback.
  const appPatrimonyGoal = useMemo(
    () => (appGoals ?? []).find((g) => g.id === "patrimony" || g.type === "patrimony"),
    [appGoals],
  );
  const goalTarget = useMemo(() => {
    if (appPatrimonyGoal?.targetValue > 0) return appPatrimonyGoal.targetValue;
    if (primaryGoal?.targetAmountBRL > 0) return primaryGoal.targetAmountBRL;
    return 1_000_000;
  }, [appPatrimonyGoal, primaryGoal]);

  // ── Derived values ────────────────────────────────────────────────────────
  const investido = useMemo(
    () => state.holdings.reduce((s, h) => s + h.valueBRL, 0),
    [state.holdings],
  );
  const liquidez = useMemo(
    () => state.cashBalances.reduce((s, b) => s + b.balanceBRL, 0),
    [state.cashBalances],
  );

  const ultimaRenda   = rendaPassiva.at(-1)?.total ?? 0;
  const progresso     = totalNetWorth > 0 ? Math.min((totalNetWorth / goalTarget) * 100, 100) : 0;
  const faltam        = Math.max(goalTarget - totalNetWorth, 0);
  const hasData       = totalNetWorth > 0;
  const progressColor = progresso >= 80 ? "#34d399" : progresso >= 40 ? "#60a5fa" : "#a78bfa";

  // ── Wealth Coach ──────────────────────────────────────────────────────────
  // Pure arithmetic: remaining amount ÷ remaining months.
  // No return assumptions, no forecasting.
  const appMonthlyInvestment = useMemo(
    () => (appGoals ?? []).find((g) => g.id === "monthlyInvestment" || g.type === "monthlyInvestment"),
    [appGoals],
  );
  const monthlyPlanned = appMonthlyInvestment?.targetValue ?? 0;

  const coachData = useMemo(() => {
    if (!effectiveTargetYear || faltam <= 0) return null;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const remainingMonths = Math.max(
      (effectiveTargetYear - currentYear) * 12 - (currentMonth - 1),
      1,
    );
    const monthlyNeeded = faltam / remainingMonths;
    const gap = monthlyPlanned > 0 ? monthlyNeeded - monthlyPlanned : null;
    return { remainingMonths, monthlyNeeded, gap };
  }, [effectiveTargetYear, faltam, monthlyPlanned]);

  // Hero stats grid — always 4 columns, renda/mês added if available
  const heroStats = useMemo(() => {
    const base = [
      { label: "Investido",    value: investido > 0 ? fmtK(investido) : "—", color: "#a78bfa" },
      { label: "Liquidez",     value: liquidez  > 0 ? fmtK(liquidez)  : "—", color: "#60a5fa" },
      { label: "Instituições", value: institutionExposure.length > 0 ? String(institutionExposure.length) : "—", color: "#34d399" },
      { label: "Classes",      value: allocationByClass.length  > 0 ? String(allocationByClass.length)  : "—", color: "#fbbf24" },
    ];
    if (ultimaRenda > 0) base.push({ label: "Renda / mês", value: fmtK(ultimaRenda), color: "#fb923c" });
    return base;
  }, [investido, liquidez, institutionExposure, allocationByClass, ultimaRenda]);

  return (
    <>
      {/* ── Hero card ── */}
      <div style={{
        background: "linear-gradient(160deg, #0a1628 0%, #0f1f35 60%, #0a1628 100%)",
        border: "1px solid #1e3a5f",
        borderRadius: 20,
        padding: "20px 22px 16px",
        marginBottom: 14,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: -60, right: -60,
          width: 240, height: 240, borderRadius: "50%",
          background: "radial-gradient(circle, #34d39908 0%, transparent 65%)",
          pointerEvents: "none",
        }} />

        {/* Section label row: reference month left, goal right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <p style={{
            color: "#334155", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 2, margin: 0, fontFamily: "'DM Mono',monospace",
          }}>
            Patrimônio Líquido · {referenceMonth.month}/{referenceMonth.year}
          </p>
          {goalLabel && (
            <span style={{
              background: "#34d39911", border: "1px solid #34d39928",
              borderRadius: 20, padding: "2px 8px",
              color: "#34d399", fontSize: 9,
              fontFamily: "'DM Mono',monospace",
              letterSpacing: 0.8, textTransform: "uppercase",
              flexShrink: 0,
            }}>
              {goalLabel}
            </span>
          )}
        </div>

        {/* Net worth — primary number */}
        <p style={{
          color: hasData ? "#34d399" : "#334155",
          fontSize: 36, fontWeight: 800, margin: "0 0 10px",
          fontFamily: "'DM Mono',monospace",
          letterSpacing: -1, lineHeight: 1,
        }}>
          {hasData ? fmtK(totalNetWorth) : "—"}
        </p>

        {/* Progress bar + goal horizon */}
        {hasData && (
          <div style={{ marginBottom: 14 }}>
            {/* Bar row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                flex: 1,
                background: "#0f172a40", borderRadius: 3, height: 4, overflow: "hidden",
              }}>
                <div style={{
                  width: `${progresso}%`, height: "100%", borderRadius: 3,
                  background: `linear-gradient(90deg, ${progressColor}, #60a5fa)`,
                  transition: "width 1.2s ease",
                }} />
              </div>
              <p style={{
                color: "#475569", fontSize: 11, margin: 0,
                fontFamily: "'DM Mono',monospace",
                whiteSpace: "nowrap", flexShrink: 0,
              }}>
                <span style={{ color: progressColor }}>{progresso.toFixed(1)}%</span>
                {" "}de {fmtK(goalTarget)}
                {faltam > 0 && (
                  <span style={{ color: "#334155" }}> · faltam {fmtK(faltam)}</span>
                )}
              </p>
            </div>

            {/* Goal horizon row: "até YEAR" with inline edit */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {editingYear ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const y = parseInt(yearInput, 10);
                    if (y >= 2025 && y <= 2100) { handleYearSubmit(y); }
                    setEditingYear(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <span style={{ color: "#334155", fontSize: 10, fontFamily: "'DM Mono',monospace" }}>
                    até
                  </span>
                  <input
                    autoFocus
                    value={yearInput}
                    onChange={(e) => setYearInput(e.target.value)}
                    onBlur={() => setEditingYear(false)}
                    placeholder="2030"
                    inputMode="numeric"
                    maxLength={4}
                    style={{
                      width: 56, background: "#0f172a",
                      border: "1px solid #60a5fa", borderRadius: 6,
                      color: "#60a5fa", fontSize: 12, padding: "2px 6px",
                      fontFamily: "'DM Mono',monospace", outline: "none",
                      textAlign: "center",
                    }}
                  />
                </form>
              ) : (
                <button
                  onClick={() => { setYearInput(effectiveTargetYear ? String(effectiveTargetYear) : ""); setEditingYear(true); }}
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    padding: 0, display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <span style={{ color: "#334155", fontSize: 10, fontFamily: "'DM Mono',monospace" }}>
                    {effectiveTargetYear ? `até ${effectiveTargetYear}` : "+ definir prazo"}
                  </span>
                </button>
              )}

              {/* Coach line — shown when target year is set and there's a gap */}
              {coachData && (
                <span style={{
                  color: "#334155", fontSize: 10,
                  fontFamily: "'DM Mono',monospace",
                }}>
                  · {coachData.remainingMonths} meses ·{" "}
                  <span style={{ color: "#475569" }}>
                    {fmtK(coachData.monthlyNeeded)}/mês necessários
                  </span>
                </span>
              )}
            </div>

            {/* Plan gap — shown when monthly investment was set in onboarding */}
            {coachData?.gap != null && (
              <p style={{
                color: coachData.gap <= 0 ? "#34d399" : "#fbbf24",
                fontSize: 11, margin: "6px 0 0",
                fontFamily: "'DM Mono',monospace",
                lineHeight: 1.4,
              }}>
                {coachData.gap <= 0
                  ? `Plano atual (${fmtK(monthlyPlanned)}/mês) cobre a meta`
                  : `${fmtK(coachData.gap)}/mês abaixo do necessário · você planeja ${fmtK(monthlyPlanned)}/mês`
                }
              </p>
            )}
          </div>
        )}

        {/* Stats grid — answers: invested, liquid, institutions, classes */}
        {hasData ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${heroStats.length}, 1fr)`,
            borderTop: "1px solid #1e293b50",
            paddingTop: 14,
            gap: 0,
          }}>
            {heroStats.map((s) => (
              <div key={s.label}>
                <p style={{
                  color: "#475569", fontSize: 9, textTransform: "uppercase",
                  letterSpacing: 1.5, margin: "0 0 3px",
                  fontFamily: "'DM Mono',monospace",
                }}>
                  {s.label}
                </p>
                <p style={{
                  color: s.color, fontSize: 15, fontWeight: 700, margin: 0,
                  fontFamily: "'DM Mono',monospace",
                }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#334155", fontSize: 13, margin: 0 }}>
            Adicione ativos para começar.
          </p>
        )}
      </div>

      {/* ── Insight strip — interpretive layer, text only ── */}
      <InsightStrip insights={insights} />

      {/* ── Institution exposure ── */}
      {institutionExposure.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{
            color: "#475569", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.5, margin: "0 0 10px", fontFamily: "'DM Mono',monospace",
          }}>
            Por Instituição
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 8,
          }}>
            {institutionExposure.map((inst, i) => (
              <InstitutionCard
                key={inst.institutionId}
                name={inst.institutionLabel}
                value={inst.valueBRL}
                totalPatrimonio={totalNetWorth}
                color={CORES[i % CORES.length]}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Asset allocation ── */}
      {allocationByClass.length > 0 && (
        <div style={{
          background: "#0f172a", border: "1px solid #1e293b",
          borderRadius: 16, padding: "16px 18px",
          marginBottom: 14,
        }}>
          <p style={{
            color: "#475569", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.5, margin: "0 0 14px", fontFamily: "'DM Mono',monospace",
          }}>
            Alocação de Ativos
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {allocationByClass.map((a) => (
              <AllocationRow
                key={a.assetClassId}
                label={a.label}
                value={a.valueBRL}
                totalPatrimonio={totalNetWorth}
                color={a.color}
              />
            ))}
          </div>
          <div style={{
            marginTop: 14, paddingTop: 12,
            borderTop: "1px solid #1e293b",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ color: "#64748b", fontSize: 12, fontFamily: "'Syne',sans-serif" }}>
              Total investido
            </span>
            <span style={{
              color: "#34d399", fontFamily: "'DM Mono',monospace",
              fontSize: 14, fontWeight: 700,
            }}>
              {fmtK(investido)}
            </span>
          </div>
        </div>
      )}

      {/* ── Meus Ativos — always visible ── */}
      {/* Permanently accessible at the bottom; no hero toggle needed. */}
      <PatrimonioPanel
        totalPatrimonio={totalNetWorth}
        onAddAsset={onAddAsset}
        onRemoveItem={onRemoveItem}
      />
    </>
  );
}
