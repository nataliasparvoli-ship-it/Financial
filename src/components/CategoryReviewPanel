import { useState, useMemo } from "react";
import { learnRule } from "../storage/userRulesStorage.js";
 
const CATS = [
  "Alimentação","Assinaturas","Compras","Educação","Fatura Cartão",
  "Investimentos","Lazer","Moradia","Outros","Renda","Renda Ativa",
  "Renda Passiva","Saúde","Transporte","Viagem",
];
 
const SOURCE_LABEL = {
  imported: { label: "Importado",    color: "#34d399" },
  user:     { label: "Aprendido",    color: "#a78bfa" },
  auto:     { label: "Auto",         color: "#60a5fa" },
  fallback: { label: "Sem match",    color: "#f87171" },
};
 
const CONF_COLOR = (c) =>
  c >= 0.8 ? "#34d399" : c >= 0.5 ? "#fbbf24" : "#f87171";
 
function TransactionRow({ tx, onCategoryChange }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(tx.cat);
  const src = SOURCE_LABEL[tx.categorySource] || SOURCE_LABEL.fallback;
  const needsReview = tx.categorySource === "fallback" || (tx.confidence ?? 0) < 0.5;
 
  const confirm = (cat) => {
    if (cat !== tx.cat) {
      learnRule(tx.normalizedMerchant, cat);
      onCategoryChange(tx.id, cat);
    }
    setEditing(false);
  };
 
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px",
      background: needsReview ? "#fbbf2408" : "#0f172a",
      border: `1px solid ${needsReview ? "#fbbf2430" : "#1e293b"}`,
      borderRadius: 10,
    }}>
      {/* Status dot */}
      <div style={{
        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
        background: needsReview ? "#fbbf24" : "#34d399",
      }} />
 
      {/* Description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500, margin: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tx.desc}
        </p>
        <p style={{ color: "#475569", fontSize: 11, margin: "2px 0 0",
          fontFamily: "'DM Mono', monospace" }}>
          {tx.data} · {tx.conta}
        </p>
      </div>
 
      {/* Source badge */}
      <span style={{
        background: src.color + "22", border: `1px solid ${src.color}44`,
        color: src.color, borderRadius: 20, padding: "2px 8px",
        fontSize: 10, fontFamily: "'DM Mono', monospace", flexShrink: 0,
      }}>{src.label}</span>
 
      {/* Confidence bar (only for auto) */}
      {tx.categorySource === "auto" && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <div style={{ width: 32, height: 4, background: "#1e293b", borderRadius: 2 }}>
            <div style={{
              width: `${Math.round((tx.confidence ?? 0) * 100)}%`,
              height: "100%", borderRadius: 2,
              background: CONF_COLOR(tx.confidence ?? 0),
            }} />
          </div>
          <span style={{ color: "#475569", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
            {Math.round((tx.confidence ?? 0) * 100)}%
          </span>
        </div>
      )}
 
      {/* Category editor */}
      {editing ? (
        <select
          autoFocus
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          onBlur={() => confirm(selected)}
          onKeyDown={(e) => { if (e.key === "Enter") confirm(selected); if (e.key === "Escape") setEditing(false); }}
          style={{
            background: "#1e293b", border: "1px solid #60a5fa", borderRadius: 8,
            padding: "4px 8px", color: "#e2e8f0", fontSize: 12,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {CATS.map((c) => <option key={c}>{c}</option>)}
        </select>
      ) : (
        <button
          onClick={() => setEditing(true)}
          style={{
            background: "#1e293b", border: "1px solid #334155",
            borderRadius: 8, color: "#94a3b8",
            padding: "4px 10px", fontSize: 12, cursor: "pointer",
            fontFamily: "'DM Mono', monospace", flexShrink: 0,
          }}
        >
          {tx.cat} ✏️
        </button>
      )}
 
      {/* Amount */}
      <span style={{
        color: tx.valor >= 0 ? "#34d399" : "#f87171",
        fontFamily: "'DM Mono', monospace", fontSize: 13,
        fontWeight: 600, flexShrink: 0, minWidth: 80, textAlign: "right",
      }}>
        {tx.valor >= 0 ? "+" : ""}R$ {Math.abs(tx.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
}
 
export default function CategoryReviewPanel({ transactions, onCategoryChange, onClose }) {
  const [filter, setFilter] = useState("review"); // "review" | "all"
  const [bulkCat, setBulkCat] = useState("");
  const [selected, setSelected] = useState(new Set());
 
  const toReview = useMemo(
    () => transactions.filter(
      (t) => t.categorySource === "fallback" || (t.confidence ?? 1) < 0.5
    ),
    [transactions]
  );
 
  const displayed = filter === "review" ? toReview : transactions;
 
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
 
  const bulkApply = () => {
    if (!bulkCat || !selected.size) return;
    selected.forEach((id) => {
      const tx = transactions.find((t) => t.id === id);
      if (tx) {
        learnRule(tx.normalizedMerchant, bulkCat);
        onCategoryChange(id, bulkCat);
      }
    });
    setSelected(new Set());
    setBulkCat("");
  };
 
  return (
    <div style={{
      background: "#0a0f1a",
      border: "1px solid #334155",
      borderRadius: 16,
      marginBottom: 22,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 20px",
        borderBottom: "1px solid #1e293b",
      }}>
        <div>
          <p style={{ color: "#f1f5f9", fontWeight: 800, margin: 0, fontSize: 15 }}>
            Revisar categorias
          </p>
          <p style={{ color: "#475569", fontSize: 12, margin: "2px 0 0" }}>
            {toReview.length} transações precisam de atenção · {transactions.length} total
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setFilter(filter === "review" ? "all" : "review")}
            style={{
              background: "transparent", border: "1px solid #334155",
              borderRadius: 8, color: "#94a3b8", padding: "7px 14px",
              fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace",
            }}
          >
            {filter === "review" ? "Ver todas" : "Ver pendentes"}
          </button>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none",
              color: "#475569", cursor: "pointer", fontSize: 20, padding: "4px 8px",
            }}
          >×</button>
        </div>
      </div>
 
      {/* Summary badges */}
      <div style={{ display: "flex", gap: 10, padding: "12px 20px", flexWrap: "wrap" }}>
        {Object.entries(SOURCE_LABEL).map(([key, info]) => {
          const count = transactions.filter((t) => t.categorySource === key).length;
          if (!count) return null;
          return (
            <span key={key} style={{
              background: info.color + "22", border: `1px solid ${info.color}44`,
              color: info.color, borderRadius: 20, padding: "3px 10px",
              fontSize: 11, fontFamily: "'DM Mono', monospace",
            }}>
              {info.label}: {count}
            </span>
          );
        })}
      </div>
 
      {/* Bulk edit bar */}
      {selected.size > 0 && (
        <div style={{
          display: "flex", gap: 10, alignItems: "center",
          padding: "10px 20px", background: "#1e293b33",
          borderTop: "1px solid #1e293b",
        }}>
          <span style={{ color: "#94a3b8", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
            {selected.size} selecionadas
          </span>
          <select
            value={bulkCat}
            onChange={(e) => setBulkCat(e.target.value)}
            style={{
              background: "#0f172a", border: "1px solid #334155", borderRadius: 8,
              padding: "6px 10px", color: "#e2e8f0", fontSize: 12,
            }}
          >
            <option value="">Escolher categoria...</option>
            {CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button
            onClick={bulkApply}
            disabled={!bulkCat}
            style={{
              background: bulkCat ? "#60a5fa" : "#1e293b",
              border: "none", borderRadius: 8, color: bulkCat ? "#020617" : "#475569",
              padding: "6px 14px", fontSize: 12, cursor: bulkCat ? "pointer" : "not-allowed",
              fontWeight: 700,
            }}
          >
            Aplicar
          </button>
          <button
            onClick={() => setSelected(new Set())}
            style={{
              background: "transparent", border: "none", color: "#475569",
              cursor: "pointer", fontSize: 12,
            }}
          >
            Limpar seleção
          </button>
        </div>
      )}
 
      {/* List */}
      <div style={{ maxHeight: 420, overflowY: "auto", padding: "12px 20px 20px" }}>
        {displayed.length === 0 ? (
          <p style={{ color: "#475569", textAlign: "center", padding: 32, fontSize: 14 }}>
            ✅ Todas as transações estão categorizadas com boa confiança.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {displayed.map((tx) => (
              <div key={tx.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={selected.has(tx.id)}
                  onChange={() => toggleSelect(tx.id)}
                  style={{ marginTop: 14, flexShrink: 0, accentColor: "#60a5fa" }}
                />
                <div style={{ flex: 1 }}>
                  <TransactionRow
                    tx={tx}
                    onCategoryChange={(id, cat) => {
                      onCategoryChange(id, cat);
                      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
