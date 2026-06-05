/**
 * @fileoverview ImportReviewFlow — staging area before committing imported data.
 *
 * DESIGN INTENT:
 *   "O app entendeu meus dados." — the user should feel in control, not overwhelmed.
 *
 *   • Confidence is shown as friendly language (Confirmado / Verificar / Atenção),
 *     never as raw percentages or technical terms.
 *   • Category can be corrected inline before commit — no post-import cleanup needed.
 *   • Each item can be individually rejected (strikethrough + recoverable).
 *   • The confirm CTA shows the live count of accepted items.
 *   • The flow is cancellable at any point — no data is committed until Salvar.
 *
 * CONFIDENCE DERIVATION:
 *   Real scores come from the ingestion pipeline (entity.confidenceScore).
 *   For legacy shape (categorySource field), scores are inferred:
 *     auto/imported → 0.75–0.90   (green  · Confirmado)
 *     fallback      → 0.35        (amber  · Verificar)
 *     user          → 1.00        (green  · Confirmado)
 *     unknown       → 0.60        (yellow · Verificar)
 *
 * PROPS:
 *   pending    — { data, summary, logItems, fileName }
 *   onConfirm  — (approvedData: LegacyImportedData) => void
 *   onCancel   — () => void
 */

import { useMemo, useState } from "react";
import { ALL_CATEGORIES }       from "../../services/categoryEngine.js";
import { formatCurrencyFull }   from "../../services/formattingService.js";

// ── Confidence helpers ────────────────────────────────────────────────────────

const scoreFor = (tx) => {
  if (typeof tx.confidence === "number") return tx.confidence;
  switch (tx.categorySource) {
    case "user":     return 1.00;
    case "imported": return 0.90;
    case "auto":     return 0.75;
    case "fallback": return 0.35;
    default:         return 0.60;
  }
};

const levelOf = (score) =>
  score >= 0.75 ? "high" : score >= 0.45 ? "medium" : "low";

const CONF = {
  high:   { dot: "#34d399", pill: "#34d39920", pillBorder: "#34d39940", text: "#34d399", cardBg: "transparent",  cardBorder: "#1e293b"   },
  medium: { dot: "#fbbf24", pill: "#fbbf2420", pillBorder: "#fbbf2440", text: "#fbbf24", cardBg: "#fbbf2406",   cardBorder: "#fbbf2428" },
  low:    { dot: "#f87171", pill: "#f8717120", pillBorder: "#f8717140", text: "#f87171", cardBg: "#f8717106",   cardBorder: "#f8717128" },
};

// ── OCR UI label filter ───────────────────────────────────────────────────────
// Screenshots from Nubank, XP, BTG etc. contain metadata labels that the OCR
// reads as text. These are never assets — filter them before showing in review.

const OCR_UI_LABEL_TOKENS = new Set([
  "vencimento", "rendeu em", "aplicação", "aplicacao", "saldo",
  "rentabilidade", "resgate", "rendimento", "disponível", "disponivel",
  "total", "data", "valor", "tipo", "histórico", "historico",
  "extrato", "período", "periodo", "proteção", "protecao",
  "liquidez", "prazo", "indexador", "taxa", "cdi", "ipca",
  "categoria", "produto", "carência", "carencia", "modalidade",
  "vence em", "aplicado em", "resgatável", "resgatavel",
  "movimentação", "movimentacao", "lançamento", "lancamento",
]);

const isOCRUiLabel = (name) => {
  if (!name || typeof name !== "string") return false;
  const lower = name.toLowerCase().trim();
  if (lower.length <= 2) return true;
  // Exact match against known labels
  if (OCR_UI_LABEL_TOKENS.has(lower)) return true;
  // Starts with a known label (e.g. "Vencimento em 12/2026")
  for (const token of OCR_UI_LABEL_TOKENS) {
    if (lower.startsWith(token + " ") || lower.startsWith(token + ":")) return true;
  }
  return false;
};

// ── Data normalization ────────────────────────────────────────────────────────

const CONF_LABEL = { high: "Confirmado", medium: "Verificar", low: "Atenção" };

/**
 * @param {object} data         - pending.data (legacy shape)
 * @param {string[]} [dupeIds]  - ids detected as likely duplicates
 */
const toReviewItems = (data, dupeIds = []) => {
  const dupeSet = new Set(dupeIds);
  const items = [];

  (data.transacoes ?? []).forEach((tx) => {
    const score = scoreFor(tx);
    const isDuplicate = dupeSet.has(tx.id);
    items.push({
      id: tx.id, type: "transaction",
      desc: tx.desc || "Sem descrição",
      category: tx.cat || "Outros",
      institution: tx.conta || "",
      value: tx.valor ?? 0,
      date: tx.data || "",
      score, level: levelOf(score),
      accepted: !isDuplicate, // pre-deselect likely duplicates
      isDuplicate,
      raw: tx,
    });
  });

  (data.classe ?? []).forEach((c) => {
    // Skip items that look like OCR-extracted UI labels (e.g. "Vencimento", "Rendeu em")
    const candidateName = c.rawImport?.nome || c.classe || "";
    if (isOCRUiLabel(candidateName)) return;

    const isDuplicate = dupeSet.has(c.id);
    // Image-extracted items carry rawImport.confianca; legacy items default to high
    const CONF_MAP = { alta: 0.85, media: 0.65, baixa: 0.40 };
    const score = c.rawImport?.confianca
      ? (CONF_MAP[c.rawImport.confianca] ?? 0.90)
      : 0.90;
    items.push({
      id: c.id, type: "holding",
      // Show individual asset name (from image OCR) when available, otherwise class label
      desc:        c.rawImport?.nome || c.classe || "Classe de ativo",
      category:    "Investimentos",
      institution: c.rawImport?.instituicao || "",
      value:       c.valor ?? 0,
      date:        c.rawImport?.data || null,
      score, level: levelOf(score),
      accepted: !isDuplicate,
      isDuplicate,
      raw: c,
    });
  });

  (data.banco ?? []).forEach((b) => {
    const isDuplicate = dupeSet.has(b.id);
    items.push({
      id: b.id, type: "cashBalance",
      desc: b.banco || "Banco",
      category: "Liquidez",
      institution: b.banco || "",
      value: b.valor ?? 0,
      date: null,
      score: 0.95, level: "high",
      accepted: !isDuplicate,
      isDuplicate,
      raw: b,
    });
  });

  return items;
};

const buildApprovedData = (items, original) => ({
  transacoes:  items.filter((i) => i.type === "transaction"  && i.accepted).map((i) => ({ ...i.raw, cat: i.category })),
  classe:      items.filter((i) => i.type === "holding"      && i.accepted).map((i) => i.raw),
  banco:       items.filter((i) => i.type === "cashBalance"  && i.accepted).map((i) => i.raw),
  rendaPassiva: original.rendaPassiva ?? [],
  patrimonio:   original.patrimonio   ?? [],
});

// ── Section labels ────────────────────────────────────────────────────────────

const SECTION_LABEL = {
  transaction:  "Transações",
  holding:      "Classes de Ativo",
  cashBalance:  "Saldos por Banco",
};

// ── ItemCard ──────────────────────────────────────────────────────────────────

function ItemCard({ item, onUpdate, onToggle }) {
  const [editingCat, setEditingCat] = useState(false);
  const c = CONF[item.level];
  const isIncome = item.value > 0 && item.type === "transaction";
  const isAsset  = item.type !== "transaction";
  const amtColor = isAsset ? "#60a5fa" : isIncome ? "#34d399" : "#f87171";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "11px 14px",
      background: item.accepted ? c.cardBg : "#0f172a",
      border: `1px solid ${item.isDuplicate && item.accepted
        ? "#f59e0b60"
        : item.accepted ? c.cardBorder : "#334155"}`,
      borderRadius: 10,
      opacity: item.accepted ? 1 : 0.45,
      transition: "opacity 0.15s, border-color 0.15s",
    }}>

      {/* Confidence dot */}
      <span style={{
        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
        background: item.accepted ? c.dot : "#334155",
        transition: "background 0.15s",
      }} />

      {/* Description + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <p style={{
            color: item.accepted ? "#e2e8f0" : "#475569",
            fontSize: 13, fontWeight: 500, margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            textDecoration: item.accepted ? "none" : "line-through",
            flexShrink: 1, minWidth: 0,
          }}>
            {item.desc}
          </p>
          {item.isDuplicate && (
            <span style={{
              background: "#f59e0b18", border: "1px solid #f59e0b40",
              borderRadius: 10, color: "#f59e0b",
              padding: "1px 7px", fontSize: 10,
              fontFamily: "'DM Mono',monospace", flexShrink: 0,
              whiteSpace: "nowrap",
            }}>
              duplicata
            </span>
          )}
        </div>
        {(item.date || item.institution) && (
          <p style={{ color: "#475569", fontSize: 10, margin: "2px 0 0",
            fontFamily: "'DM Mono',monospace" }}>
            {[item.date, item.institution].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* Category pill — editable for transactions */}
      {item.type === "transaction" && item.accepted && (
        editingCat ? (
          <select
            autoFocus
            value={item.category}
            onChange={(e) => { onUpdate(item.id, { category: e.target.value }); setEditingCat(false); }}
            onBlur={() => setEditingCat(false)}
            style={{
              background: "#020617", border: `1px solid ${c.dot}`,
              borderRadius: 6, padding: "4px 8px",
              color: "#e2e8f0", fontSize: 11,
              fontFamily: "'DM Mono',monospace", outline: "none", cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {ALL_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
          </select>
        ) : (
          <button
            onClick={() => setEditingCat(true)}
            style={{
              background: c.pill, border: `1px solid ${c.pillBorder}`,
              borderRadius: 20, color: item.level === "high" ? "#94a3b8" : c.text,
              padding: "3px 10px", fontSize: 11, cursor: "pointer",
              fontFamily: "'DM Mono',monospace", flexShrink: 0,
              maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: "nowrap", transition: "background 0.1s",
            }}
          >
            {item.category} ✏
          </button>
        )
      )}

      {/* Value */}
      <span style={{
        color: amtColor, fontFamily: "'DM Mono',monospace",
        fontSize: 13, fontWeight: 700, flexShrink: 0,
        minWidth: 76, textAlign: "right",
      }}>
        {isIncome ? "+" : item.type === "transaction" ? "−" : ""}
        {formatCurrencyFull(Math.abs(item.value))}
      </span>

      {/* Accept/reject toggle */}
      <button
        onClick={() => onToggle(item.id)}
        title={item.accepted ? "Excluir este item" : "Incluir novamente"}
        style={{
          background: "transparent", border: "none",
          color: item.accepted ? "#334155" : "#34d399",
          cursor: "pointer", fontSize: 16, padding: "2px 4px",
          lineHeight: 1, flexShrink: 0,
          transition: "color 0.15s",
        }}
      >
        {item.accepted ? "×" : "↩"}
      </button>
    </div>
  );
}

// ── ImportReviewFlow ──────────────────────────────────────────────────────────

export default function ImportReviewFlow({ pending, onConfirm, onCancel }) {
  const dupeIds = pending.duplicateIds ?? [];
  const [items, setItems] = useState(() => toReviewItems(pending.data, dupeIds));

  // Detect if this import came from an image (any holding has rawImport.source === "image")
  const isImageImport = (pending.data.classe ?? []).some(
    (c) => c.rawImport?.source === "image",
  );

  // Institution override — lets the user label "all from XP" before confirming
  const [institution, setInstitution] = useState(() => {
    if (!isImageImport) return "";
    const detected = (pending.data.classe ?? []).find(
      (c) => c.rawImport?.instituicao && c.rawImport.instituicao !== "Desconhecido",
    );
    return detected?.rawImport?.instituicao ?? "";
  });

  // Default to "Verificar" tab if any items need review or are duplicates
  const [filter, setFilter] = useState(() => {
    const init = toReviewItems(pending.data, dupeIds);
    const hasReview = init.some((i) => i.level !== "high" || i.isDuplicate);
    return hasReview ? "review" : "all";
  });

  const update = (id, patch) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...patch } : i));

  const toggle = (id) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, accepted: !i.accepted } : i));

  // ── Derived stats ──────────────────────────────────────────────────────────
  const acceptedCount  = items.filter((i) => i.accepted).length;
  const rejectedCount  = items.length - acceptedCount;
  const dupeCount      = items.filter((i) => i.isDuplicate).length;
  // "Verificar" tab = low/medium confidence OR detected duplicates
  const reviewCount    = items.filter((i) => i.level !== "high" || i.isDuplicate).length;
  const confirmedCount = items.filter((i) => i.level === "high" && !i.isDuplicate).length;
  const avgScore       = items.length
    ? Math.round(items.reduce((s, i) => s + i.score, 0) / items.length * 100)
    : 0;

  // ── Filtered + grouped items ───────────────────────────────────────────────
  const displayed = useMemo(() => {
    if (filter === "review")    return items.filter((i) => i.level !== "high" || i.isDuplicate);
    if (filter === "confirmed") return items.filter((i) => i.level === "high" && !i.isDuplicate);
    return items;
  }, [items, filter]);

  const groups = useMemo(() => {
    const map = new Map();
    // Preserve insertion order: transactions first, then holdings, then cash
    ["transaction", "holding", "cashBalance"].forEach((t) => {
      const group = displayed.filter((i) => i.type === t);
      if (group.length) map.set(t, group);
    });
    return map;
  }, [displayed]);

  const handleConfirm = () => {
    // For image imports, propagate the institution name into each holding's rawImport
    // so classeToHolding picks it up as institutionLabel.
    const enrichedItems = (isImageImport && institution)
      ? items.map((i) =>
          i.type === "holding"
            ? { ...i, raw: { ...i.raw, rawImport: { ...i.raw.rawImport, instituicao: institution } } }
            : i,
        )
      : items;
    onConfirm(buildApprovedData(enrichedItems, pending.data));
  };

  // ── Confidence bar color ───────────────────────────────────────────────────
  const barColor = avgScore >= 75 ? "#34d399" : avgScore >= 45 ? "#fbbf24" : "#f87171";

  return (
    <div style={{
      background: "#0a0f1a",
      border: "1px solid #334155",
      borderRadius: 16,
      marginBottom: 22,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* ── Header ── */}
      <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid #1e293b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ color: "#f1f5f9", fontWeight: 800, margin: "0 0 2px", fontSize: 15 }}>
              Revisar antes de salvar
            </p>
            <p style={{ color: "#475569", fontSize: 12, margin: 0, fontFamily: "'DM Mono',monospace" }}>
              {pending.fileName} · {items.length} item{items.length !== 1 ? "s" : ""} encontrado{items.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onCancel}
            style={{ background: "transparent", border: "none", color: "#475569",
              cursor: "pointer", fontSize: 20, padding: "2px 6px", lineHeight: 1 }}
          >×</button>
        </div>

        {/* Confidence bar */}
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, background: "#1e293b", borderRadius: 4, height: 5, overflow: "hidden" }}>
            <div style={{
              width: `${avgScore}%`, height: "100%", borderRadius: 4,
              background: barColor, transition: "width 0.6s ease",
            }} />
          </div>
          <span style={{ color: barColor, fontSize: 11, fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
            {avgScore}% confiança
          </span>
        </div>

        {/* Confidence legend chips */}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {Object.entries(CONF_LABEL).map(([level, label]) => {
            const count = items.filter((i) => i.level === level && !i.isDuplicate).length;
            if (!count) return null;
            const c = CONF[level];
            return (
              <span key={level} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: c.pill, border: `1px solid ${c.pillBorder}`,
                borderRadius: 20, padding: "3px 10px",
                color: c.text, fontSize: 11, fontFamily: "'DM Mono',monospace",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
                {label} {count}
              </span>
            );
          })}
          {dupeCount > 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "#f59e0b18", border: "1px solid #f59e0b40",
              borderRadius: 20, padding: "3px 10px",
              color: "#f59e0b", fontSize: 11, fontFamily: "'DM Mono',monospace",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
              Duplicata {dupeCount}
            </span>
          )}
        </div>

        {/* Duplicate warning banner */}
        {dupeCount > 0 && (
          <div style={{
            marginTop: 12,
            background: "#f59e0b0c", border: "1px solid #f59e0b30",
            borderRadius: 8, padding: "9px 12px",
            display: "flex", alignItems: "flex-start", gap: 8,
          }}>
            <span style={{ fontSize: 14, lineHeight: 1.3, flexShrink: 0 }}>⚠</span>
            <p style={{ color: "#d97706", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
              <strong>{dupeCount} item{dupeCount !== 1 ? "s" : ""} ja existem</strong> nos seus dados e foram desmarcados automaticamente.
              {" "}Revise em <em>Verificar</em> e inclua apenas o que for novo.
            </p>
          </div>
        )}
      </div>

      {/* ── Institution input (image imports only) ── */}
      {isImageImport && (
        <div style={{
          padding: "12px 20px",
          borderTop: "1px solid #1e293b",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}>
          <span style={{ color: "#64748b", fontSize: 12, fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
            Instituição
          </span>
          <input
            type="text"
            placeholder="XP, BTG, Nubank, Inter…"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            style={{
              flex: 1, minWidth: 160,
              background: "#020617", border: "1px solid #334155",
              borderRadius: 8, color: "#e2e8f0",
              padding: "6px 10px", fontSize: 12,
              fontFamily: "'DM Mono',monospace", outline: "none",
            }}
          />
          {!institution && (
            <span style={{ color: "#f59e0b", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>
              ⚠ Sem instituição os ativos ficam sem origem
            </span>
          )}
        </div>
      )}

      {/* ── Filter tabs ── */}
      <div style={{
        display: "flex", gap: 0, borderBottom: "1px solid #1e293b",
        padding: "0 20px", overflowX: "auto", scrollbarWidth: "none",
      }}>
        {[
          { key: "all",       label: "Todos",        count: items.length   },
          { key: "review",    label: "◐ Verificar",  count: reviewCount,    urgent: reviewCount > 0 },
          { key: "confirmed", label: "✓ Confirmados", count: confirmedCount },
        ].map(({ key, label, count, urgent }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            background: "transparent", border: "none",
            borderBottom: filter === key ? "2px solid #60a5fa" : "2px solid transparent",
            color: filter === key ? "#60a5fa" : urgent ? "#fbbf24" : "#64748b",
            padding: "10px 14px", fontSize: 12,
            fontFamily: "'Syne',sans-serif",
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {label} <span style={{ opacity: 0.65 }}>{count}</span>
          </button>
        ))}
      </div>

      {/* ── Item list — clamp height for small viewports ── */}
      <div style={{ maxHeight: "clamp(220px, 48vh, 480px)", overflowY: "auto", padding: "12px 20px" }}>
        {groups.size === 0 ? (
          <p style={{ color: "#475569", textAlign: "center", padding: "24px 0", fontSize: 13 }}>
            Nenhum item neste filtro.
          </p>
        ) : (
          Array.from(groups.entries()).map(([type, typeItems]) => (
            <div key={type} style={{ marginBottom: 18 }}>
              <p style={{
                color: "#475569", fontSize: 10, textTransform: "uppercase",
                letterSpacing: 1.2, margin: "0 0 8px",
                fontFamily: "'DM Mono',monospace",
              }}>
                {SECTION_LABEL[type]} ({typeItems.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {typeItems.map((item) => (
                  <ItemCard key={item.id} item={item} onUpdate={update} onToggle={toggle} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: "14px 20px",
        borderTop: "1px solid #1e293b",
        display: "flex", justifyContent: "space-between",
        alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        {rejectedCount > 0 ? (
          <span style={{ color: "#475569", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
            {rejectedCount} item{rejectedCount !== 1 ? "s" : ""} excluído{rejectedCount !== 1 ? "s" : ""}
          </span>
        ) : (
          <span style={{ color: "#334155", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
            Todos incluídos
          </span>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={onCancel}
            style={{
              background: "transparent", border: "1px solid #334155",
              borderRadius: 10, color: "#64748b",
              padding: "10px 16px", fontSize: 13, cursor: "pointer",
              fontFamily: "'Syne',sans-serif",
            }}
          >
            Descartar
          </button>
          <button
            onClick={handleConfirm}
            disabled={acceptedCount === 0}
            style={{
              background: acceptedCount > 0 ? "#34d399" : "#1e293b",
              border: "none", borderRadius: 10,
              color: acceptedCount > 0 ? "#020617" : "#475569",
              padding: "10px 22px", fontSize: 13, fontWeight: 700,
              cursor: acceptedCount > 0 ? "pointer" : "not-allowed",
              fontFamily: "'Syne',sans-serif",
              transition: "background 0.15s",
            }}
          >
            ✓ Salvar {acceptedCount} item{acceptedCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
