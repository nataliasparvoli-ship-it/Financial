/**
 * @fileoverview ExpensesTab — despesas por mês e categoria.
 *
 * ISOLAMENTO:
 *   Estado local: mesSel (mesId do mês selecionado pelo usuário).
 *   Trocar de mês re-renderiza APENAS este tab — não afeta nenhum outro.
 *   deriveMonthExpenses computado localmente via useMemo.
 *
 * NOTAS DE INTEGRIDADE HISTÓRICA:
 *   `meses` é agora um array de mesId ("YYYY-MM" ou abreviação legacy).
 *   `mesLabels` mapeia mesId → rótulo de exibição ("Jan" ou "Jan/26").
 *   Botões usam mesId como `key` (único entre anos) e mesLabels para display.
 *   `mesSel` armazena mesId — nunca a abreviação diretamente.
 */

import { useMemo, useState } from "react";
import EmptyState from "../../components/EmptyState.jsx";
import Section    from "../../components/Section.jsx";
import { CORES, deriveMonthExpenses, monthToMesId } from "../../utils/deriveMetrics.js";
import { fmt }    from "../../utils/formatters.js";
import { useApp } from "../../contexts/AppContext.jsx";

/**
 * @param {{
 *   dashboard: ReturnType<import("../../utils/deriveMetrics.js").deriveDashboardData>,
 * }} props
 */
export default function ExpensesTab({ dashboard }) {
  const { meses, activeMonth, despesasCat, mesLabels = {} } = dashboard;
  const { referenceMonth } = useApp();

  // ── Resolve referenceMonth → mesId for initial selection ─────────────────
  // Try the ISO mesId format first (new data), then plain abbreviation (legacy),
  // then fall back to the dataset's most recent month.
  const defaultMesId = useMemo(() => {
    const candidate = monthToMesId(referenceMonth.month, referenceMonth.year);
    if (meses.includes(candidate)) return candidate;
    if (meses.includes(referenceMonth.month)) return referenceMonth.month;
    return activeMonth;
  }, [referenceMonth, meses, activeMonth]);

  // ── Local state: month selection is scoped to this tab only ────────────────
  const [mesSel, setMesSel] = useState(defaultMesId);

  // Guard: if mesSel was set while data had fewer months, fall back gracefully.
  const mesAtual = meses.includes(mesSel) ? mesSel : activeMonth;

  // Human-readable label for the selected month (e.g. "Jan" or "Jan/26").
  const mesAtualLabel = mesLabels[mesAtual] ?? mesAtual;

  const { despesasMes, totalDespMes } = useMemo(
    () => deriveMonthExpenses(despesasCat, mesAtual),
    [despesasCat, mesAtual],
  );

  return (
    <>
      {/* ── Month selector ── */}
      {/* key={m} is a mesId — unique across years, never collides for multi-year data */}
      <div style={{
        display: "flex", gap: 6, marginBottom: 14, overflowX: "auto",
        WebkitOverflowScrolling: "touch", paddingBottom: 4,
      }}>
        {meses.map((m) => (
          <button key={m} onClick={() => setMesSel(m)} style={{
            background:    mesAtual === m ? "#1e293b" : "transparent",
            border:        mesAtual === m ? "1px solid #60a5fa" : "1px solid #1e293b",
            borderRadius:  8,
            color:         mesAtual === m ? "#60a5fa" : "#64748b",
            padding:       "6px 14px",
            fontSize:      12,
            cursor:        "pointer",
            whiteSpace:    "nowrap",
            flexShrink:    0,
            fontFamily:    "'Syne',sans-serif",
          }}>
            {/* Display label: "Jan" for single-year data, "Jan/26" for multi-year */}
            {mesLabels[m] ?? m}
          </button>
        ))}
      </div>

      {/* ── Month totals ── */}
      <div style={{
        background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
        padding: "14px 18px", marginBottom: 14,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <p style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.5, margin: "0 0 3px" }}>Total {mesAtualLabel}</p>
          <p style={{ color: "#f87171", fontSize: 26, fontWeight: 700, margin: 0,
            fontFamily: "'DM Mono',monospace" }}>{fmt(totalDespMes)}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "#64748b", fontSize: 10, margin: "0 0 3px" }}>Categorias</p>
          <p style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, margin: 0 }}>
            {despesasMes.length}
          </p>
        </div>
      </div>

      {/* ── Category breakdown ── */}
      <Section title={`Categorias — ${mesAtualLabel}`}>
        {despesasMes.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {despesasMes.map((e, i) => {
              const pct = totalDespMes
                ? ((e.valor / totalDespMes) * 100).toFixed(1)
                : "0.0";
              const cor = CORES[i % CORES.length];
              return (
                <div key={e.id} style={{
                  background: "#0f172a", border: "1px solid #1e293b",
                  borderRadius: 10, padding: "10px 14px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ color: "#e2e8f0", fontSize: 13 }}>{e.cat}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: "#64748b", fontSize: 11,
                        fontFamily: "'DM Mono',monospace" }}>{pct}%</span>
                      <span style={{ color: cor, fontFamily: "'DM Mono',monospace",
                        fontSize: 14, fontWeight: 600 }}>{fmt(e.valor)}</span>
                    </div>
                  </div>
                  <div style={{ background: "#1e293b", borderRadius: 3, height: 4 }}>
                    <div style={{ width: `${pct}%`, background: cor,
                      height: "100%", borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Sem despesas no mês">
            Importe transações para este mês.
          </EmptyState>
        )}
      </Section>
    </>
  );
}
