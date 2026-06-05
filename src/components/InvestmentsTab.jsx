import { useState, useRef, useMemo } from "react";
import { fmtK } from "../utils/formatters.js";
import { formatDateToday } from "../services/formattingService.js";
import {
  assetClassColorMap,
  assetClassOptions,
} from "../domain/assetClassRegistry.js";

// Cores e tipos vêm do registry centralizado — sem duplicação.
const TIPO_COLORS = assetClassColorMap();
const TIPOS = assetClassOptions().map((cls) => cls.label);

function ManualForm({ onAdd }) {
  const [f, setF] = useState({
    instituicao:"", nome:"", tipo:"Renda Fixa",
    valor:"", data: formatDateToday(),
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.nome || !f.valor || !f.instituicao) return;
    onAdd({ ...f, valor: parseFloat(String(f.valor).replace(",",".")) || 0 });
    setF({ instituicao:"", nome:"", tipo:"Renda Fixa", valor:"", data: formatDateToday() });
  };

  return (
    <div style={{
      background:"#0f172a", border:"1px solid #1e293b",
      borderRadius:12, padding:"16px 18px",
    }}>
      <p style={{ color:"#94a3b8", fontSize:11, textTransform:"uppercase",
        letterSpacing:1.5, margin:"0 0 12px", fontFamily:"'DM Mono',monospace" }}>
        Adicionar posição manualmente
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[
          { key:"instituicao", label:"Banco / Corretora", placeholder:"Ex: NuInvest" },
          { key:"nome",        label:"Nome do ativo",     placeholder:"Ex: CDB 110% CDI" },
          { key:"valor",       label:"Valor atual (R$)",  placeholder:"0,00" },
          { key:"data",        label:"Data",              placeholder:"DD/MM/YYYY" },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label style={{ color:"#475569", fontSize:11, display:"block", marginBottom:4 }}>{label}</label>
            <input
              value={f[key]}
              onChange={(e) => set(key, e.target.value)}
              placeholder={placeholder}
              style={{
                width:"100%", background:"#020617", border:"1px solid #1e293b",
                borderRadius:8, padding:"8px 12px", color:"#e2e8f0",
                fontSize:13, fontFamily:"'DM Mono',monospace", outline:"none",
              }}
            />
          </div>
        ))}
        <div>
          <label style={{ color:"#475569", fontSize:11, display:"block", marginBottom:4 }}>Tipo</label>
          <select
            value={f.tipo}
            onChange={(e) => set("tipo", e.target.value)}
            style={{
              width:"100%", background:"#020617", border:"1px solid #1e293b",
              borderRadius:8, padding:"8px 12px", color:"#e2e8f0", fontSize:13,
            }}
          >
            {TIPOS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <button
          onClick={submit}
          style={{
            background:"#34d399", border:"none", borderRadius:10,
            color:"#020617", fontWeight:700, fontSize:13,
            padding:"10px 0", cursor:"pointer", marginTop:4,
          }}
        >
          + Adicionar posição
        </button>
      </div>
    </div>
  );
}

function OcrReviewModal({ result, onConfirm, onDismiss }) {
  const [items, setItems] = useState(result.items);
  const update = (i, k, v) => setItems((p) => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const remove = (i) => setItems((p) => p.filter((_, idx) => idx !== i));

  return (
    <div style={{
      background:"#0a0f1a", border:"1px solid #60a5fa44",
      borderRadius:16, padding:"20px", marginBottom:20,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <p style={{ color:"#f1f5f9", fontWeight:800, margin:0 }}>
            Revisar extração da imagem
          </p>
          <p style={{ color:"#475569", fontSize:12, margin:"2px 0 0" }}>
            {result.file} · {items.length} posições encontradas
          </p>
        </div>
        <button onClick={onDismiss} style={{
          background:"transparent", border:"none", color:"#475569", cursor:"pointer", fontSize:20,
        }}>×</button>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            background:"#0f172a", border:`1px solid ${it.confianca==="baixa" ? "#fbbf2440" : "#1e293b"}`,
            borderRadius:10, padding:"12px 14px",
          }}>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <input
                value={it.instituicao}
                onChange={(e) => update(i, "instituicao", e.target.value)}
                placeholder="Instituição"
                style={{ flex:1, minWidth:100, background:"#020617", border:"1px solid #1e293b",
                  borderRadius:6, padding:"5px 8px", color:"#e2e8f0", fontSize:12,
                  fontFamily:"'DM Mono',monospace", outline:"none" }}
              />
              <input
                value={it.nome}
                onChange={(e) => update(i, "nome", e.target.value)}
                placeholder="Nome do ativo"
                style={{ flex:2, minWidth:140, background:"#020617", border:"1px solid #1e293b",
                  borderRadius:6, padding:"5px 8px", color:"#e2e8f0", fontSize:12,
                  fontFamily:"'DM Mono',monospace", outline:"none" }}
              />
              <input
                value={it.valor}
                onChange={(e) => update(i, "valor", parseFloat(e.target.value) || 0)}
                type="number"
                placeholder="Valor"
                style={{ width:110, background:"#020617", border:"1px solid #1e293b",
                  borderRadius:6, padding:"5px 8px", color:"#34d399", fontSize:12,
                  fontFamily:"'DM Mono',monospace", outline:"none" }}
              />
              <select
                value={it.tipo}
                onChange={(e) => update(i, "tipo", e.target.value)}
                style={{ background:"#020617", border:"1px solid #1e293b", borderRadius:6,
                  padding:"5px 8px", color:"#e2e8f0", fontSize:12 }}
              >
                {TIPOS.map((t) => <option key={t}>{t}</option>)}
              </select>
              {it.confianca === "baixa" && (
                <span style={{ color:"#fbbf24", fontSize:10, fontFamily:"'DM Mono',monospace" }}>⚠ baixa confiança</span>
              )}
              <button onClick={() => remove(i)} style={{
                background:"transparent", border:"none", color:"#f87171", cursor:"pointer", fontSize:16,
              }}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:8 }}>
        <button
          onClick={() => onConfirm(items)}
          style={{
            background:"#34d399", border:"none", borderRadius:10,
            color:"#020617", fontWeight:700, fontSize:13,
            padding:"10px 20px", cursor:"pointer",
          }}
        >
          ✓ Confirmar {items.length} posições
        </button>
        <button
          onClick={onDismiss}
          style={{
            background:"transparent", border:"1px solid #334155",
            borderRadius:10, color:"#94a3b8", fontSize:13,
            padding:"10px 16px", cursor:"pointer",
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function InvestmentsTab({ hook }) {
  const {
    investments, totalValue, byType,
    isProcessingImage, ocrResult, ocrError,
    addManual, remove,
    processImage, confirmOcr, dismissOcr,
  } = hook;

  const imgRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processImage(file);
  };

  // Top 3 positions by value
  const topPositions = useMemo(
    () => [...investments].sort((a, b) => b.valor - a.valor).slice(0, 3),
    [investments],
  );

  return (
    <div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* OCR review modal — shown inline at top when active */}
      {ocrResult && (
        <OcrReviewModal result={ocrResult} onConfirm={confirmOcr} onDismiss={dismissOcr} />
      )}

      {/* ── Hero: total + position count ── */}
      <div style={{
        background: "linear-gradient(160deg, #0a1628 0%, #0f1f35 60%, #0a1628 100%)",
        border: "1px solid #1e3a5f", borderRadius: 20,
        padding: "20px 22px 16px", marginBottom: 14,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -50, right: -50, width: 200, height: 200,
          borderRadius: "50%",
          background: "radial-gradient(circle, #60a5fa08 0%, transparent 65%)",
          pointerEvents: "none",
        }} />
        <p style={{
          color: "#334155", fontSize: 10, textTransform: "uppercase",
          letterSpacing: 2, margin: "0 0 6px", fontFamily: "'DM Mono',monospace",
        }}>
          Carteira de Investimentos
        </p>
        <p style={{
          color: investments.length > 0 ? "#60a5fa" : "#334155",
          fontSize: 36, fontWeight: 800, margin: "0 0 12px",
          fontFamily: "'DM Mono',monospace", letterSpacing: -1, lineHeight: 1,
        }}>
          {investments.length > 0 ? fmtK(totalValue) : "—"}
        </p>
        {investments.length > 0 && (
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            borderTop: "1px solid #1e293b50", paddingTop: 12, gap: 0,
          }}>
            {[
              { label: "Posições",  value: String(investments.length), color: "#60a5fa" },
              { label: "Classes",   value: String(Object.keys(byType).length), color: "#a78bfa" },
            ].map((s) => (
              <div key={s.label}>
                <p style={{
                  color: "#475569", fontSize: 9, textTransform: "uppercase",
                  letterSpacing: 1.5, margin: "0 0 3px", fontFamily: "'DM Mono',monospace",
                }}>
                  {s.label}
                </p>
                <p style={{ color: s.color, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "'DM Mono',monospace" }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}
        {investments.length === 0 && (
          <p style={{ color: "#334155", fontSize: 13, margin: 0 }}>
            Adicione posições para começar.
          </p>
        )}
      </div>

      {/* ── Top positions ── */}
      {topPositions.length > 0 && (
        <div style={{
          background: "#0f172a", border: "1px solid #1e293b",
          borderRadius: 16, padding: "14px 18px", marginBottom: 14,
        }}>
          <p style={{
            color: "#475569", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.5, margin: "0 0 10px", fontFamily: "'DM Mono',monospace",
          }}>
            Maiores Posições
          </p>
          {topPositions.map((inv) => {
            const pct = totalValue > 0 ? (inv.valor / totalValue) * 100 : 0;
            const color = TIPO_COLORS[inv.tipo] || "#94a3b8";
            return (
              <div key={inv.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ color: "#e2e8f0", fontSize: 12, fontFamily: "'Syne',sans-serif" }}>
                    {inv.nome}
                  </span>
                  <span style={{ color, fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>
                    {fmtK(inv.valor)}
                  </span>
                </div>
                <div style={{ background: "#1e293b", borderRadius: 3, height: 3, overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: 3,
                    background: `linear-gradient(90deg, ${color}, ${color}88)`,
                    transition: "width 0.7s ease",
                  }} />
                </div>
                <p style={{ color: "#334155", fontSize: 10, margin: "2px 0 0", fontFamily: "'DM Mono',monospace" }}>
                  {inv.instituicao} · {inv.tipo} · {pct.toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Full position list ── */}
      {investments.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{
            color: "#475569", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.5, margin: "0 0 10px", fontFamily: "'DM Mono',monospace",
          }}>
            Todas as Posições ({investments.length})
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {investments.map((inv) => (
              <div key={inv.id} style={{
                background:"#0f172a", border:"1px solid #1e293b", borderRadius:10,
                padding:"12px 16px", display:"flex", alignItems:"center", gap:10,
              }}>
                <div style={{
                  width:8, height:8, borderRadius:"50%", flexShrink:0,
                  background: TIPO_COLORS[inv.tipo] || "#94a3b8",
                }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ color:"#f1f5f9", fontSize:13, fontWeight:600, margin:0 }}>{inv.nome}</p>
                  <p style={{ color:"#475569", fontSize:11, margin:"2px 0 0", fontFamily:"'DM Mono',monospace" }}>
                    {inv.instituicao} · {inv.tipo}
                    {inv.source === "ocr" && " · OCR"}
                  </p>
                </div>
                <span style={{ color:"#60a5fa", fontSize:14, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>
                  {fmtK(inv.valor)}
                </span>
                <button
                  onClick={() => remove(inv.id)}
                  style={{ background:"transparent", border:"none", color:"#334155", cursor:"pointer", fontSize:16, padding:0 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add position ── */}
      <div style={{
        background: "#0f172a", border: "1px solid #1e293b",
        borderRadius: 16, padding: "14px 18px", marginBottom: 14,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{
            color: "#475569", fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.5, margin: 0, fontFamily: "'DM Mono',monospace",
          }}>
            Adicionar Posição
          </p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: "transparent", border: "1px solid #334155",
                borderRadius: 8, color: "#94a3b8", cursor: "pointer",
                fontSize: 12, padding: "5px 10px", fontFamily: "'Syne',sans-serif",
              }}
            >
              + Manual
            </button>
          )}
        </div>
        {showForm && (
          <div style={{ marginTop: 14 }}>
            <ManualForm onAdd={(entry) => { addManual(entry); setShowForm(false); }} />
            <button
              onClick={() => setShowForm(false)}
              style={{
                marginTop: 8, background: "transparent", border: "none",
                color: "#475569", cursor: "pointer", fontSize: 12,
                fontFamily: "'Syne',sans-serif",
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* ── Import via screenshot ── */}
      <div style={{
        background: "#0f172a", border: "1px solid #1e293b",
        borderRadius: 16, padding: "14px 18px",
      }}>
        <p style={{
          color: "#475569", fontSize: 10, textTransform: "uppercase",
          letterSpacing: 1.5, margin: "0 0 12px", fontFamily: "'DM Mono',monospace",
        }}>
          Importar Screenshot
        </p>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isProcessingImage && imgRef.current?.click()}
          style={{
            background: dragging ? "#60a5fa11" : "#020617",
            border: `2px dashed ${dragging ? "#60a5fa" : "#1e293b"}`,
            borderRadius: 10, padding: "16px", textAlign: "center",
            cursor: isProcessingImage ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          <input
            ref={imgRef}
            type="file"
            accept="image/*,.png,.jpg,.jpeg,.webp"
            style={{ display:"none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) processImage(f); e.target.value=""; }}
          />
          {isProcessingImage ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{
                width: 16, height: 16, border: "2px solid #1e293b",
                borderTopColor: "#60a5fa", borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              <p style={{ color:"#60a5fa", fontSize:12, margin:0 }}>Analisando com IA...</p>
            </div>
          ) : (
            <p style={{ color:"#475569", fontSize:12, margin:0 }}>
              Arraste ou clique · PNG, JPG · Nubank, XP, BTG...
            </p>
          )}
          {ocrError && (
            <p style={{ color:"#f87171", fontSize:11, margin:"8px 0 0" }}>{ocrError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
