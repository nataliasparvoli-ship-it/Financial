import { useState, useMemo } from "react";
import { learnRule } from "../storage/userRulesStorage.js";
import { ALL_CATEGORIES, getSubcategories, hasSubcategories } from "../services/categoryEngine.js";
import { formatCurrencyFull } from "../services/formattingService.js";

const SOURCE_LABEL = {
  imported: { label: "Importado",  color: "#34d399" },
  user:     { label: "Aprendido",  color: "#a78bfa" },
  auto:     { label: "Auto",       color: "#60a5fa" },
  fallback: { label: "Sem match",  color: "#f87171" },
};

const CONF_COLOR = (c) => c >= 0.8 ? "#34d399" : c >= 0.5 ? "#fbbf24" : "#f87171";

const selectStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  padding: "5px 8px",
  color: "#e2e8f0",
  fontSize: 12,
  fontFamily: "'DM Mono', monospace",
  outline: "none",
  cursor: "pointer",
  width: "100%",
};

/* ─── TransactionRow ───────────────────────────────────────────────────────── */

function TransactionRow({ tx, onCategoryChange }) {
  const [editing, setEditing]   = useState(false);
  const [selCat, setSelCat]     = useState(tx.cat);
  const [selSub, setSelSub]     = useState(tx.subcat || "");
  const src                     = SOURCE_LABEL[tx.categorySource] || SOURCE_LABEL.fallback;
  const needsReview             = tx.categorySource === "fallback" || (tx.confidence ?? 0) < 0.5;
  const showSub                 = hasSubcategories(selCat);
  const subOptions              = getSubcategories(selCat);

  const handleCatChange = (cat) => {
    setSelCat(cat);
    setSelSub("");
  };

  const confirm = () => {
    if (selCat !== tx.cat || selSub !== (tx.subcat || "")) {
      learnRule(tx.normalizedMerchant, selCat, selSub);
      onCategoryChange(tx.id, selCat, selSub);
    }
    setEditing(false);
  };

  const cancel = () => {
    setSelCat(tx.cat);
    setSelSub(tx.subcat || "");
    setEditing(false);
  };

  return (
    <div style={{
      display: "flex", alignItems: editing ? "flex-start" : "center", gap: 10,
      padding: "10px 14px",
      background: needsReview ? "#fbbf2408" : "#0f172a",
      border: `1px solid ${needsReview ? "#fbbf2430" : "#1e293b"}`,
      borderRadius: 10,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: editing ? 6 : 0,
        background: needsReview ? "#fbbf24" : "#34d399",
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500, margin: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tx.desc}
        </p>
        <p style={{ color: "#475569", fontSize: 11, margin: "2px 0 0", fontFamily: "'DM Mono', monospace" }}>
          {tx.data} · {tx.conta}
        </p>
      </div>

      <span style={{
        background: src.color + "22", border: `1px solid ${src.color}44`,
        color: src.color, borderRadius: 20, padding: "2px 8px",
        fontSize: 10, fontFamily: "'DM Mono', monospace", flexShrink: 0,
      }}>{src.label}</span>

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
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, minWidth: 140 }}>
          <select autoFocus value={selCat} onChange={(e) => handleCatChange(e.target.value)} style={selectStyle}>
            {ALL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          {showSub && (
            <select value={selSub} onChange={(e) => setSelSub(e.target.value)} style={selectStyle}>
              <option value="">Subcategoria…</option>
              {subOptions.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={confirm}
              style={{
                flex: 1, background: "#34d399", border: "none", borderRadius: 6,
                color: "#020617", fontWeight: 700, fontSize: 11, padding: "5px 0", cursor: "pointer",
              }}
            >✓</button>
            <button
              onClick={cancel}
              style={{
                flex: 1, background: "#1e293b", border: "none", borderRadius: 6,
                color: "#475569", fontSize: 11, padding: "5px 0", cursor: "pointer",
              }}
            >✕</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          style={{
            background: "#1e293b", border: "1px solid #334155",
            borderRadius: 8, color: "#94a3b8",
            padding: "4px 10px", fontSize: 12, cursor: "pointer",
            fontFamily: "'DM Mono', monospace", flexShrink: 0,
            maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {tx.cat}{tx.subcat && tx.subcat !== "Outros" ? ` · ${tx.subcat}` : ""} ✏️
        </button>
      )}

      <span style={{
        color: tx.valor >= 0 ? "#34d399" : "#f87171",
        fontFamily: "'DM Mono', monospace", fontSize: 13,
        fontWeight: 600, flexShrink: 0, minWidth: 80, textAlign: "right",
      }}>
        {tx.valor >= 0 ? "+" : ""}{formatCurrencyFull(Math.abs(tx.valor))}
      </span>
    </div>
  );
}

/* ─── CategoryReviewPanel ──────────────────────────────────────────────────── */

export default function CategoryReviewPanel({ transactions, onCategoryChange, onClose }) {
  const [filter, setFilter]   = useState("review");
  const [bulkCat, setBulkCat] = useState("");
  const [bulkSub, setBulkSub] = useState("");
  const [selected, setSelected] = useState(new Set());

  const toReview = useMemo(
    () => transactions.filter((t) => t.categorySource === "fallback" || (t.confidence ?? 1) < 0.5),
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
        learnRule(tx.normalizedMerchant, bulkCat, bulkSub);
        onCategoryChange(id, bulkCat, bulkSub);
      }
    });
    setSelected(new Set());
    setBulkCat("");
    setBulkSub("");
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
        padding: "16px 20px", borderBottom: "1px solid #1e293b",
      }}>
        <div>
          <p style={{ color: "#f1f5f9", fontWeight: 800, margin: 0, fontSize: 15 }}>
            Revisar categorias
          </p>
          <p style={{ color: "#475569", fontSize: 12, margin: "2px 0 0" }}>
            {toReview.length} pendentes · {transactions.length} total
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
            style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: 20, padding: "4px 8px" }}
          >×</button>
        </div>
      </div>

      {/* Source badges */}
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

      {/* Bulk edit */}
      {selected.size > 0 && (
        <div style={{
          display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
          padding: "10px 20px", background: "#1e293b33", borderTop: "1px solid #1e293b",
        }}>
          <span style={{ color: "#94a3b8", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
            {selected.size} selecionadas
          </span>
          <select
            value={bulkCat}
            onChange={(e) => { setBulkCat(e.target.value); setBulkSub(""); }}
            style={{ ...selectStyle, width: "auto", minWidth: 130 }}
          >
            <option value="">Categoria…</option>
            {ALL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          {bulkCat && hasSubcategories(bulkCat) && (
            <select
              value={bulkSub}
              onChange={(e) => setBulkSub(e.target.value)}
              style={{ ...selectStyle, width: "auto", minWidth: 130 }}
            >
              <option value="">Subcategoria…</option>
              {getSubcategories(bulkCat).map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          <button
            onClick={bulkApply}
            disabled={!bulkCat}
            style={{
              background: bulkCat ? "#60a5fa" : "#1e293b",
              border: "none", borderRadius: 8, color: bulkCat ? "#020617" : "#475569",
              padding: "6px 14px", fontSize: 12, cursor: bulkCat ? "pointer" : "not-allowed", fontWeight: 700,
            }}
          >Aplicar</button>
          <button
            onClick={() => setSelected(new Set())}
            style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: 12 }}
          >Limpar</button>
        </div>
      )}

      {/* List */}
      <div style={{ maxHeight: 420, overflowY: "auto", padding: "12px 20px 20px" }}>
        {displayed.length === 0 ? (
          <p style={{ color: "#475569", textAlign: "center", padding: 32, fontSize: 14 }}>
            ✓ Todas as transações estão categorizadas.
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
                    onCategoryChange={(id, cat, sub) => {
                      onCategoryChange(id, cat, sub);
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
