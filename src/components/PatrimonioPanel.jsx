/**
 * @fileoverview PatrimonioPanel — manual wealth data entry.
 *
 * P1/P1.1: Unified "Add Asset" flow replaces the old "+ Classe" / "+ Banco" split.
 *   1. Onde está?  — Institution pills (from onboarding) + "Outra" escape hatch
 *   2. O que é?    — Asset class pills (canonical registry)
 *   3. Quanto vale? — Amount input
 *
 * Entity routing is done inside addManualAsset (useFinancialData):
 *   assetClassId === "caixa"  → CashBalance
 *   any other class           → Holding
 *
 * ManualAssetList reads directly from WealthStore — no props needed.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { fmt, parseCurrency } from "../utils/formatters.js";
import { assetClassList, getAssetClass } from "../domain/assetClassRegistry.js";
import { getInstitution } from "../domain/institutionRegistry.js";
import { useApp } from "../contexts/AppContext.jsx";
import { useWealthStore } from "../hooks/useWealthStore.js";

// ── Shared styles ──────────────────────────────────────────────────────────

const CARD = {
  background: "linear-gradient(135deg, #0f172a, #111827)",
  border: "1px solid #1e293b",
  borderRadius: 16,
  padding: "18px 20px",
  marginBottom: 16,
};

const INPUT_STYLE = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 10,
  color: "#f1f5f9",
  fontSize: 14,
  fontFamily: "'Syne', sans-serif",
  padding: "10px 14px",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

const BTN_PRIMARY = {
  background: "#34d399",
  border: "none",
  borderRadius: 10,
  color: "#020617",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  padding: "10px 18px",
  fontFamily: "'Syne', sans-serif",
};

const BTN_GHOST = {
  background: "transparent",
  border: "1px solid #334155",
  borderRadius: 10,
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  padding: "10px 14px",
  fontFamily: "'Syne', sans-serif",
};

const SECTION_LABEL = {
  color: "#64748b",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1.2,
  margin: "0 0 10px",
  fontFamily: "'DM Mono', monospace",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatMonetary(raw) {
  const num = raw.replace(/\D/g, "");
  if (!num) return "";
  const val = parseInt(num, 10) / 100;
  return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseMonetary(formatted) {
  return parseCurrency(formatted);
}

// ── CSV Guide ──────────────────────────────────────────────────────────────

function CsvGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 14 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ ...BTN_GHOST, fontSize: 12, padding: "7px 12px" }}
      >
        {open ? "▲" : "▼"} Formato CSV para importação
      </button>
      {open && (
        <div style={{
          marginTop: 10,
          background: "#020617",
          border: "1px solid #334155",
          borderRadius: 12,
          padding: "16px 18px",
        }}>
          <p style={{ color: "#94a3b8", fontSize: 12, margin: "0 0 12px", lineHeight: 1.6 }}>
            Crie um CSV com as colunas abaixo e importe pelo botão no topo da página.
            A coluna <code style={{ color: "#34d399", fontFamily: "'DM Mono', monospace" }}>dataset</code> determina o tipo de dado.
          </p>

          <p style={{ color: "#60a5fa", fontSize: 11, fontWeight: 700, margin: "0 0 4px",
            fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>
            Classe de Ativos (dataset=classe)
          </p>
          <pre style={{
            background: "#0f172a", borderRadius: 8, padding: "10px 14px",
            color: "#94a3b8", fontSize: 11, fontFamily: "'DM Mono', monospace",
            margin: "0 0 14px", overflowX: "auto", lineHeight: 1.7,
          }}>{`dataset,classe,valor
classe,Renda Fixa,50000
classe,Ações BR,30000
classe,FIIs,20000
classe,Exterior,15000`}</pre>

          <p style={{ color: "#60a5fa", fontSize: 11, fontWeight: 700, margin: "0 0 4px",
            fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>
            Saldo por Banco (dataset=banco)
          </p>
          <pre style={{
            background: "#0f172a", borderRadius: 8, padding: "10px 14px",
            color: "#94a3b8", fontSize: 11, fontFamily: "'DM Mono', monospace",
            margin: "0 0 14px", overflowX: "auto", lineHeight: 1.7,
          }}>{`dataset,banco,valor
banco,XP Investimentos,80000
banco,Nubank,15000
banco,BTG Pactual,25000`}</pre>

          <p style={{ color: "#60a5fa", fontSize: 11, fontWeight: 700, margin: "0 0 4px",
            fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>
            Extrato XP / BTG (custódia — sem coluna dataset)
          </p>
          <p style={{ color: "#64748b", fontSize: 11, margin: "0 0 4px", lineHeight: 1.6 }}>
            Exporte o extrato de custódia direto do app/site. O Auren detecta automaticamente
            arquivos com colunas de <em>produto</em> + <em>posição</em>.
          </p>
          <pre style={{
            background: "#0f172a", borderRadius: 8, padding: "10px 14px",
            color: "#94a3b8", fontSize: 11, fontFamily: "'DM Mono', monospace",
            margin: 0, overflowX: "auto", lineHeight: 1.7,
          }}>{`Produto,Tipo,Posição Atual
CDB XP 12%,Renda Fixa,50000.00
KNRI11,FIIs,20000.00
PETR4,Ações BR,8000.00`}</pre>
        </div>
      )}
    </div>
  );
}

// ── Asset class groups ─────────────────────────────────────────────────────
// Defines how classes are grouped and ordered in the dropdown.
// All IDs must exist in assetClassRegistry.

const ASSET_CLASS_GROUPS = [
  { label: "Liquidez",      ids: ["caixa"] },
  { label: "Brasil",        ids: ["renda_fixa", "tesouro", "acoes_br", "fiis", "previdencia"] },
  { label: "Internacional", ids: ["etfs", "acoes_int"] },
  { label: "Fundos",        ids: ["fundos"] },
  { label: "Alternativos",  ids: ["cripto", "imoveis"] },
  { label: "Outros",        ids: ["custom"] },
];

// ── Asset class product examples ──────────────────────────────────────────
// Short hint shown below each class label in the dropdown so users know
// which products belong to each class (e.g. CDB → Renda Fixa).
// Not stored anywhere — display only.
const CLASS_EXAMPLES = {
  caixa:       "conta corrente · poupança · conta remunerada",
  renda_fixa:  "CDB · LCI · LCA · Debêntures",
  tesouro:     "Tesouro Selic · IPCA+ · Prefixado",
  acoes_br:    "ações · BDRs",
  fiis:        "fundos imobiliários · FI-Infra",
  etfs:        "BOVA11 · IVVB11",
  acoes_int:   "stocks EUA · ETFs globais",
  fundos:      "multimercado · DI · ações",
  previdencia: "PGBL · VGBL",
  cripto:      "Bitcoin · Ethereum · altcoins",
  imoveis:     "propriedades físicas",
  custom:      "outros não listados acima",
};

// ── AssetClassSelect ───────────────────────────────────────────────────────
// Custom dropdown with grouped options, compact trigger, scrollable list.
// Replaces native <select> so we can control height, grouping, and styling.

function AssetClassSelect({ value, onChange }) {
  const [open,      setOpen]      = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const containerRef = useRef(null);

  // Build id → class map once
  const classMap = useMemo(() => {
    const m = {};
    assetClassList().forEach((cls) => { m[cls.id] = cls; });
    return m;
  }, []);

  const selectedClass = value ? classMap[value] : null;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>

      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          ...INPUT_STYLE,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          cursor: "pointer",
          userSelect: "none",
          color: selectedClass ? "#f1f5f9" : "#475569",
          background: open ? "#0a1628" : "#020617",
          borderColor: open ? "#475569" : "#334155",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedClass
            ? `${selectedClass.emoji}  ${selectedClass.label}`
            : "Selecionar classe de ativo…"}
        </span>
        <span style={{
          color: "#475569", fontSize: 10, flexShrink: 0,
          display: "inline-block",
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.15s",
        }}>▾</span>
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0, right: 0,
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 10,
          maxHeight: 228,
          overflowY: "auto",
          zIndex: 200,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          {ASSET_CLASS_GROUPS.map((group) => (
            <div key={group.label}>
              {/* Group header */}
              <p style={{
                color: "#334155",
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                margin: 0,
                padding: "8px 12px 3px",
                fontFamily: "'DM Mono', monospace",
                fontWeight: 600,
              }}>
                {group.label}
              </p>
              {/* Group items */}
              {group.ids.map((id) => {
                const cls = classMap[id];
                if (!cls) return null;
                const isSelected = value === id;
                const isHovered  = hoveredId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { onChange(id); setOpen(false); }}
                    onMouseEnter={() => setHoveredId(id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      width: "100%",
                      padding: "8px 12px 8px 14px",
                      background: isSelected
                        ? `${cls.color}14`
                        : isHovered ? "#1e293b" : "transparent",
                      border: "none",
                      borderLeft: `2px solid ${isSelected ? cls.color : "transparent"}`,
                      color: isSelected ? cls.color : isHovered ? "#e2e8f0" : "#94a3b8",
                      fontSize: 13,
                      fontFamily: "'Syne', sans-serif",
                      cursor: "pointer",
                      textAlign: "left",
                      boxSizing: "border-box",
                      transition: "background 0.08s, color 0.08s",
                    }}
                  >
                    <span style={{ fontSize: 13, width: 18, textAlign: "center", flexShrink: 0 }}>
                      {cls.emoji}
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                      <span>{cls.label}</span>
                      {CLASS_EXAMPLES[id] && (
                        <span style={{
                          color: "#334155", fontSize: 9,
                          fontFamily: "'DM Mono', monospace",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {CLASS_EXAMPLES[id]}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <span style={{ marginLeft: "auto", color: cls.color, fontSize: 10, flexShrink: 0 }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add Asset Form ─────────────────────────────────────────────────────────
// Three-step flow: Institution → Asset Class → Amount.
// Institution pills come from onboarding selections.

function AddAssetForm({ onAdd, onCancel }) {
  const { institutions: onboardingIds, referenceMonth } = useApp();

  // Map IDs → institution objects, filter out "outro_*" catch-alls (initials === "+")
  const onboardingInstitutions = useMemo(
    () => (onboardingIds ?? []).map((id) => getInstitution(id)).filter((i) => i.initials !== "+"),
    [onboardingIds],
  );
  const hasOnboardingInstitutions = onboardingInstitutions.length > 0;

  const [selectedInstId,   setSelectedInstId]   = useState(null);
  const [showCustomInst,   setShowCustomInst]   = useState(!hasOnboardingInstitutions);
  const [customInst,       setCustomInst]       = useState("");
  const [selectedClassId,  setSelectedClassId]  = useState("");
  const [customClassLabel, setCustomClassLabel] = useState("");
  const [rawValue,         setRawValue]         = useState("");

  const valor = parseMonetary(rawValue);

  const isCustomClass = selectedClassId === "custom";

  const handleClassChange = (id) => {
    setSelectedClassId(id);
    if (id !== "custom") setCustomClassLabel("");
  };

  const hasInstitution = showCustomInst
    ? customInst.trim().length > 0
    : selectedInstId !== null;

  const hasClass = selectedClassId !== "" &&
    (!isCustomClass || customClassLabel.trim().length > 0);

  const canSubmit = hasInstitution && hasClass && valor > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    const cls = getAssetClass(selectedClassId);
    onAdd({
      // When custom institution: pass null so addManualAsset resolves via institutionLabel
      institutionId:    showCustomInst ? null : selectedInstId,
      institutionLabel: showCustomInst
        ? customInst.trim()
        : getInstitution(selectedInstId).label,
      assetClassId: selectedClassId,
      // When "Personalizado" class: use the typed custom label, else registry label
      classeLabel:  isCustomClass && customClassLabel.trim()
        ? customClassLabel.trim()
        : cls.label,
      valor,
    });
  };

  const pillStyle = (active, color) => ({
    background: active ? `${color}18` : "rgba(241,245,249,0.03)",
    border: `1px solid ${active ? color + "60" : "rgba(241,245,249,0.08)"}`,
    borderRadius: 20,
    color: active ? color : "#64748b",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "'Syne', sans-serif",
    fontWeight: active ? 600 : 400,
    padding: "6px 12px",
    transition: "all 0.15s",
  });

  return (
    <form onSubmit={handleSubmit}>

      {/* ── Reference month context ── */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "#0a1628", border: "1px solid #1e3a5f",
        borderRadius: 8, padding: "4px 10px", marginBottom: 16,
      }}>
        <span style={{ color: "#334155", fontSize: 10, fontFamily: "'DM Mono',monospace" }}>
          referência
        </span>
        <span style={{
          color: "#60a5fa", fontSize: 11, fontWeight: 600,
          fontFamily: "'DM Mono',monospace",
        }}>
          {referenceMonth.month}/{referenceMonth.year}
        </span>
      </div>

      {/* ── Step 1: Institution ── */}
      <p style={SECTION_LABEL}>Onde está?</p>
      {hasOnboardingInstitutions ? (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: showCustomInst ? 10 : 14 }}>
            {onboardingInstitutions.map((inst) => (
              <button
                key={inst.id}
                type="button"
                onClick={() => { setSelectedInstId(inst.id); setShowCustomInst(false); setCustomInst(""); }}
                style={pillStyle(!showCustomInst && selectedInstId === inst.id, inst.color)}
              >
                {inst.label}
              </button>
            ))}
            {/* Escape hatch for institutions not in onboarding list */}
            <button
              type="button"
              onClick={() => { setShowCustomInst(true); setSelectedInstId(null); }}
              style={pillStyle(showCustomInst, "#475569")}
            >
              Outra
            </button>
          </div>
          {showCustomInst && (
            <div style={{ marginBottom: 14 }}>
              <input
                style={INPUT_STYLE}
                placeholder="Nome da instituição (ex: Warren)"
                value={customInst}
                onChange={(e) => setCustomInst(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </>
      ) : (
        /* No onboarding institutions — show text input directly */
        <div style={{ marginBottom: 14 }}>
          <input
            style={INPUT_STYLE}
            placeholder="Nome da instituição (ex: XP Investimentos)"
            value={customInst}
            onChange={(e) => setCustomInst(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* ── Step 2: Asset class ── */}
      <p style={SECTION_LABEL}>Classe de Ativo</p>
      <div style={{ marginBottom: isCustomClass ? 10 : 16 }}>
        <AssetClassSelect value={selectedClassId} onChange={handleClassChange} />
      </div>

      {/* Custom class name — only shown when "Personalizado" is selected */}
      {isCustomClass && (
        <div style={{ marginBottom: 16 }}>
          <input
            style={INPUT_STYLE}
            placeholder="Nome da classe (ex: Criptomoedas)"
            value={customClassLabel}
            onChange={(e) => setCustomClassLabel(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* ── Step 3: Amount ── */}
      <p style={SECTION_LABEL}>Quanto vale? (R$)</p>
      <div style={{ marginBottom: 16 }}>
        <input
          style={{ ...INPUT_STYLE, fontFamily: "'DM Mono', monospace", fontSize: 18 }}
          placeholder="0,00"
          inputMode="decimal"
          value={rawValue}
          onChange={(e) => setRawValue(formatMonetary(e.target.value))}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            ...BTN_PRIMARY,
            opacity: canSubmit ? 1 : 0.4,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          Adicionar
        </button>
        <button type="button" onClick={onCancel} style={BTN_GHOST}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ── Wealth allocation list — all registered allocation-level assets ───────
//
// Shows ALL allocation-kind holdings (class buckets from any source) plus
// ALL CashBalances, grouped by institution.
//
// Allocation holdings = class-level entries with no individual product identity:
//   • Manually entered ("Renda Fixa at XP")
//   • Imported via CSV classe[] format
//   • Migrated from legacy data
//
// Named positions (OCR imports like "CDB XP 12%", "KNRI11") are excluded —
// they belong in the Investments tab, not here.
//
// Delete button is shown only for source === "manual" items.
// Imported/migrated items are read-only here; their source is shown subtly.

const SOURCE_BADGE = {
  imported: "importado",
  migrated: "migrado",
  ocr:      "ocr",
  sync:     "sync",
};

function WealthAllocationList({ onRemove }) {
  const { state } = useWealthStore();

  const groups = useMemo(() => {
    // Include allocation-kind holdings only — same exclusion logic as
    // selectInvestmentHoldings, inverted: we want what Investments excludes.
    const allocationHoldings = state.holdings.filter((h) => {
      if (h.holdingKind === "allocation") return true;
      if (!h.holdingKind && h.source !== "ocr") {
        const cls = getAssetClass(h.assetClassId);
        if (h.label === cls.label) return true;
      }
      return false;
    });

    const allItems = [
      ...allocationHoldings.map((h) => {
        const cls = getAssetClass(h.assetClassId);
        return {
          id:          h.id,
          institution: (h.institutionLabel && h.institutionLabel !== "Desconhecida")
            ? h.institutionLabel
            : "Outros",
          assetClass:  cls.label,
          color:       cls.color,
          value:       h.valueBRL,
          source:      h.source,
          canDelete:   h.source === "manual",
        };
      }),
      // CashBalances are always allocation-level (liquid balance, no product identity)
      ...state.cashBalances.map((b) => {
        const cls = getAssetClass("caixa");
        return {
          id:          b.id,
          institution: b.institutionLabel || "Outros",
          assetClass:  cls.label,
          color:       cls.color,
          value:       b.balanceBRL,
          source:      b.source,
          canDelete:   b.source === "manual",
        };
      }),
    ];

    const map = new Map();
    allItems.forEach((item) => {
      if (!map.has(item.institution)) map.set(item.institution, []);
      map.get(item.institution).push(item);
    });
    return Array.from(map.entries());
  }, [state.holdings, state.cashBalances]);

  if (!groups.length) return null;

  return (
    <div style={{ marginTop: 14 }}>
      {groups.map(([instLabel, items]) => (
        <div key={instLabel} style={{ marginBottom: 12 }}>
          <p style={{
            color: "#475569", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.2, margin: "0 0 6px",
            fontFamily: "'DM Mono', monospace", fontWeight: 600,
          }}>
            {instLabel}
          </p>
          {items.map((item, i) => (
            <div key={item.id} style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 18px",
              gap: "0 8px",
              alignItems: "center",
              padding: "6px 0 6px 8px",
              borderBottom: i < items.length - 1 ? "1px solid #1e293b40" : "none",
            }}>
              {/* Class label + optional source badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span style={{
                  color: "#e2e8f0", fontSize: 12,
                  fontFamily: "'Syne', sans-serif",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {item.assetClass}
                </span>
                {item.source !== "manual" && SOURCE_BADGE[item.source] && (
                  <span style={{
                    color: "#334155", fontSize: 9,
                    fontFamily: "'DM Mono', monospace",
                    flexShrink: 0,
                  }}>
                    {SOURCE_BADGE[item.source]}
                  </span>
                )}
              </div>

              <span style={{
                color: item.color, fontSize: 12,
                fontFamily: "'DM Mono', monospace", fontWeight: 600,
                textAlign: "right", whiteSpace: "nowrap",
              }}>
                {fmt(item.value)}
              </span>

              {/* Delete only for manual entries */}
              {item.canDelete ? (
                <button
                  onClick={() => onRemove(item.id)}
                  style={{
                    background: "transparent", border: "none",
                    color: "#334155", cursor: "pointer",
                    fontSize: 14, padding: 0, lineHeight: 1, textAlign: "center",
                  }}
                  title="Remover"
                >
                  ×
                </button>
              ) : (
                <span style={{ width: 18 }} />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main PatrimonioPanel ───────────────────────────────────────────────────

export default function PatrimonioPanel({ totalPatrimonio, onAddAsset, onRemoveItem }) {
  const [mode, setMode] = useState(null); // null | "add"
  const { referenceMonth } = useApp();
  const refLabel = `${referenceMonth.month}/${referenceMonth.year}`;

  return (
    <div style={CARD}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <p style={{ color: "#f1f5f9", fontWeight: 800, margin: "0 0 2px", fontSize: 15 }}>
            Meus Ativos
            <span style={{
              marginLeft: 8, fontSize: 10, fontFamily: "'DM Mono', monospace",
              color: "#334155", fontWeight: 400, verticalAlign: "middle",
            }}>
              {refLabel}
            </span>
          </p>
          <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
            Ativos registrados por classe
          </p>
        </div>
        {mode === null && (
          <button
            onClick={() => setMode("add")}
            style={{
              ...BTN_GHOST,
              fontSize: 12, padding: "7px 12px",
              color: "#34d399", borderColor: "#34d39940",
            }}
          >
            + Ativo
          </button>
        )}
      </div>

      {/* Add asset form */}
      {mode === "add" && (
        <AddAssetForm
          onAdd={(entry) => { onAddAsset(entry); setMode(null); }}
          onCancel={() => setMode(null)}
        />
      )}

      {/* Wealth allocation list — all registered allocation-level assets */}
      {mode === null && <WealthAllocationList onRemove={onRemoveItem} />}

      {/* CSV import guide */}
      {mode === null && <CsvGuide />}
    </div>
  );
}
