/**
 * @fileoverview TransactionsTab — lista filtrada de transações.
 *
 * ISOLAMENTO:
 *   Estado local: filtroTipo.
 *   Trocar filtro re-renderiza APENAS este tab — não afeta nenhum outro.
 *   filterTransactions memoizado localmente.
 */

import { useMemo, useState } from "react";
import EmptyState from "../../components/EmptyState.jsx";
import { filterTransactions } from "../../utils/deriveMetrics.js";
import { fmt } from "../../utils/formatters.js";

const FILTROS = ["Todos", "Receita", "Despesa", "Investimento"];

/**
 * @param {{
 *   transactions: import("../../domain/types.js").LegacyTransacao[],
 *   needsReview:  number,
 *   onShowReview: () => void,
 * }} props
 */
export default function TransactionsTab({ transactions, needsReview, onShowReview }) {
  // ── Local state: filter is scoped to this tab only ─────────────────────────
  const [filtroTipo, setFiltroTipo] = useState("Todos");

  const txFiltradas = useMemo(
    () => filterTransactions(transactions, filtroTipo),
    [transactions, filtroTipo],
  );

  return (
    <>
      {/* ── Filter pills ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {FILTROS.map((f) => (
          <button key={f} onClick={() => setFiltroTipo(f)} style={{
            background:   filtroTipo === f ? "#1e293b" : "transparent",
            border:       filtroTipo === f ? "1px solid #a78bfa" : "1px solid #1e293b",
            borderRadius: 8,
            color:        filtroTipo === f ? "#a78bfa" : "#64748b",
            padding:      "6px 12px",
            fontSize:     12,
            cursor:       "pointer",
            fontFamily:   "'Syne',sans-serif",
          }}>{f}</button>
        ))}
        {needsReview > 0 && (
          <button onClick={onShowReview} style={{
            background: "#fbbf2411", border: "1px solid #fbbf2440",
            borderRadius: 8, color: "#fbbf24", padding: "6px 12px",
            fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono',monospace",
          }}>
            ⚠ {needsReview} para revisar
          </button>
        )}
      </div>

      {/* ── Transaction list ── */}
      {txFiltradas.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {txFiltradas.map((t) => {
            const isRec  = t.valor > 0;
            const isInv  = t.tipo === "Investimento";
            const cor    = isInv ? "#60a5fa" : isRec ? "#34d399" : "#f87171";
            const flagged = t.categorySource === "fallback" || (t.confidence ?? 1) < 0.5;
            return (
              <div key={t.id} style={{
                background: "#0f172a",
                border: `1px solid ${flagged ? "#fbbf2430" : "#1e293b"}`,
                borderRadius: 10, padding: "11px 14px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0, flex: 1 }}>
                  {/* Type icon */}
                  <div style={{
                    background: `${cor}22`, border: `1px solid ${cor}44`,
                    borderRadius: 8, width: 34, height: 34, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
                  }}>
                    {isInv ? "📈" : isRec ? "↑" : "↓"}
                  </div>
                  {/* Description + meta */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      color: "#e2e8f0", fontSize: 13, fontWeight: 600, margin: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {t.desc}
                    </p>
                    <p style={{ color: "#475569", fontSize: 10, margin: "1px 0 0",
                      fontFamily: "'DM Mono',monospace" }}>
                      {t.data} · {t.cat}{flagged && " ⚠"}
                    </p>
                  </div>
                </div>
                {/* Amount */}
                <span style={{
                  color: cor, fontFamily: "'DM Mono',monospace",
                  fontSize: 13, fontWeight: 700, flexShrink: 0, marginLeft: 8,
                }}>
                  {t.valor > 0 ? "+" : ""}{fmt(Math.abs(t.valor))}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Sem transações">
          Importe um CSV ou PDF do seu banco.
        </EmptyState>
      )}
    </>
  );
}
