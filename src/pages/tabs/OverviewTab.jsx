/**
 * @fileoverview OverviewTab — KPIs, evolução patrimonial e distribuição de ativos.
 *
 * ISOLAMENTO:
 *   Estado local: nenhum.
 *   Re-renderiza apenas quando `dashboard` ou `investTotalValue` mudam.
 *   Derivações computadas localmente com useMemo sobre as fatias necessárias.
 */

import { useMemo } from "react";
import ClassePieChart   from "../../charts/ClassePieChart.jsx";
import FluxoChart       from "../../charts/FluxoChart.jsx";
import PatrimonioChart  from "../../charts/PatrimonioChart.jsx";
import RendaPassivaChart from "../../charts/RendaPassivaChart.jsx";
import EmptyState       from "../../components/EmptyState.jsx";
import KPICard          from "../../components/KPICard.jsx";
import Section          from "../../components/Section.jsx";
import { deriveMonthlyKpis, monthToMesId } from "../../utils/deriveMetrics.js";
import { fmtK }         from "../../utils/formatters.js";
import { useApp }       from "../../contexts/AppContext.jsx";
import { useWealthStore, selectPrimaryGoal } from "../../hooks/useWealthStore.js";

/**
 * @param {{
 *   dashboard:       ReturnType<import("../../utils/deriveMetrics.js").deriveDashboardData>,
 *   investTotalValue: number,
 *   transacaoCount:  number,
 * }} props
 */
export default function OverviewTab({ dashboard, investTotalValue, transacaoCount }) {
  const {
    fluxoData, rendaPassiva,
    totalPatrimonio, classeData, patrimonioData,
    meses, activeMonth,
  } = dashboard;

  const { referenceMonth, goals: appGoals } = useApp();

  // ── kpiMonthId: resolve referenceMonth to the mesId used internally ───────
  // Priority: exact mesId match (new data) → plain abbreviation (legacy data)
  //           → activeMonth (last resort when referenceMonth is outside dataset)
  const kpiMonthId = useMemo(() => {
    const candidate = monthToMesId(referenceMonth.month, referenceMonth.year);
    if (meses.includes(candidate)) return candidate;
    if (meses.includes(referenceMonth.month)) return referenceMonth.month;
    return activeMonth;
  }, [referenceMonth, meses, activeMonth]);

  // Display label: always the short month abbreviation, never the internal key.
  const kpiMonthLabel = referenceMonth.month;

  // Goal target: prefer user-entered patrimony goal from onboarding,
  // then domain goal, then 1M fallback
  const { state: wealthState } = useWealthStore();
  const domainGoal = useMemo(() => selectPrimaryGoal(wealthState), [wealthState]);
  const appPatrimonyGoal = useMemo(
    () => (appGoals ?? []).find((g) => g.id === "patrimony" || g.type === "patrimony"),
    [appGoals],
  );
  const goalTarget = useMemo(() => {
    if (appPatrimonyGoal?.targetValue > 0) return appPatrimonyGoal.targetValue;
    if (domainGoal?.targetAmountBRL > 0) return domainGoal.targetAmountBRL;
    return 1_000_000;
  }, [appPatrimonyGoal, domainGoal]);

  const {
    rendaMes, despesaMes, saldoMes, aporteMes,
    coberturaPassiva,
  } = useMemo(
    () => deriveMonthlyKpis({ fluxoData, rendaPassiva, mesAtual: kpiMonthId, totalPatrimonio }),
    [fluxoData, rendaPassiva, kpiMonthId, totalPatrimonio],
  );

  const totalNetWorth = totalPatrimonio + investTotalValue;
  const overallProgress = goalTarget > 0 ? Math.min((totalNetWorth / goalTarget) * 100, 100) : 0;

  if (transacaoCount === 0 && investTotalValue === 0) {
    return (
      <EmptyState title="Sem dados ainda">
        Importe um CSV ou PDF do seu banco para começar.
      </EmptyState>
    );
  }

  return (
    <>
      {/* ── Wealth hero ── */}
      <div style={{
        background: "linear-gradient(135deg,#0f172a,#1e293b)",
        border: "1px solid #334155", borderRadius: 16,
        padding: "18px 20px", marginBottom: 18,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase",
              letterSpacing: 1.5, margin: "0 0 4px" }}>Patrimônio Total</p>
            <p style={{ color: "#34d399", fontSize: 32, fontWeight: 800, margin: 0,
              fontFamily: "'DM Mono',monospace" }}>{fmtK(totalNetWorth)}</p>
            <p style={{ color: "#475569", fontSize: 11, margin: "3px 0 0" }}>
              Meta {fmtK(goalTarget)} ·{" "}
              <span style={{ color: overallProgress >= 100 ? "#34d399" : "#60a5fa" }}>
                {overallProgress.toFixed(1)}%
              </span>
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#64748b", fontSize: 10, margin: "0 0 3px" }}>Cobertura Passiva</p>
            <p style={{ color: "#fbbf24", fontSize: 24, fontWeight: 700, margin: 0,
              fontFamily: "'DM Mono',monospace" }}>{coberturaPassiva.toFixed(1)}%</p>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 12, background: "#0f172a", borderRadius: 6, height: 6, overflow: "hidden" }}>
          <div style={{
            width: `${Math.min(overallProgress, 100)}%`,
            background: "linear-gradient(90deg,#34d399,#60a5fa)",
            height: "100%", borderRadius: 6, transition: "width 1s ease",
          }} />
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <KPICard label={`Renda ${kpiMonthLabel}`}    value={fmtK(rendaMes)}   sub="Ativa + passiva"   cor="#60a5fa" />
        <KPICard label={`Despesas ${kpiMonthLabel}`} value={fmtK(despesaMes)} sub="Fixas + variáveis"  cor="#f87171" />
        <KPICard label={`Saldo ${kpiMonthLabel}`}    value={fmtK(saldoMes)}   sub="Net balance"        cor="#34d399" />
        <KPICard label={`Aportes ${kpiMonthLabel}`}  value={fmtK(aporteMes)}  sub="Total investido"    cor="#a78bfa" />
      </div>

      {/* ── Monthly flow chart — moved here from WealthTab ── */}
      {fluxoData.length > 0 && (
        <div style={{
          background: "#0f172a", border: "1px solid #1e293b",
          borderRadius: 16, padding: "16px 18px 12px", marginBottom: 18,
        }}>
          <p style={{
            color: "#475569", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.5, margin: "0 0 10px", fontFamily: "'DM Mono',monospace",
          }}>
            Fluxo Mensal
          </p>
          <FluxoChart data={fluxoData} />
        </div>
      )}

      {/* ── Charts ── */}
      <Section title="Evolução do Patrimônio">
        <PatrimonioChart data={patrimonioData} />
      </Section>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Section title="Por Classe de Ativo">
            <ClassePieChart data={classeData} />
          </Section>
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Section title="Renda Passiva Mensal">
            <RendaPassivaChart data={rendaPassiva} />
          </Section>
        </div>
      </div>
    </>
  );
}
