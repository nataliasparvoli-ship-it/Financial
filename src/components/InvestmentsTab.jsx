import { useState, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { fmtK } from "../utils/formatters.js";
import { formatDateToday } from "../services/formattingService.js";

const TIPO_COLORS = {
  "Renda Fixa":"#60a5fa","Tesouro":"#34d399","FII":"#fbbf24",
  "Ações":"#f87171","Renda Variável":"#f87171","Cripto":"#e879f9",
  "Previdência":"#a78bfa","Fundos":"#fb923c","ETF":"#38bdf8","Outros":"#94a3b8",
};

const TIPOS = Object.keys(TIPO_COLORS);

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
    investments, totalValue, byType, byInst,
    isProcessingImage, ocrResult, ocrError,
    addManual, update, remove,
    processImage, confirmOcr, dismissOcr, clearAll,
  } = hook;

  const imgRef = useRef();
  const [dragging, setDragging] = useState(false);

  const pieData = Object.entries(byType).map(([tipo, valor]) => ({ tipo, valor }));

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processImage(file);
  };

  return (
    <div>
      {/* OCR review modal */}
      {ocrResult && (
        <OcrReviewModal result={ocrResult} onConfirm={confirmOcr} onDismiss={dismissOcr} />
      )}

      {/* KPIs */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        {[
          { label:"Total investido", value: fmtK(totalValue), color:"#34d399" },
          { label:"Posições",        value: String(investments.length), color:"#60a5fa" },
          { label:"Classes",         value: String(Object.keys(byType).length), color:"#a78bfa" },
          { label:"Instituições",    value: String(Object.keys(byInst).length), color:"#fbbf24" },
        ].map((k) => (
          <div key={k.label} style={{
            background:"linear-gradient(135deg,#0f172a,#1e293b)",
            border:`1px solid ${k.color}33`, borderRadius:12,
            padding:"16px 20px", flex:1, minWidth:140,
          }}>
            <p style={{ color:"#64748b", fontSize:10, textTransform:"uppercase",
              letterSpacing:1.5, margin:0, fontFamily:"'DM Mono',monospace" }}>{k.label}</p>
            <p style={{ color:k.color, fontSize:24, fontWeight:700, margin:"8px 0 0",
              fontFamily:"'DM Mono',monospace" }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
        {/* Chart */}
        {pieData.length > 0 && (
          <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:12, padding:"16px 8px" }}>
            <p style={{ color:"#64748b", fontSize:10, textTransform:"uppercase",
              letterSpacing:1.5, margin:"0 0 12px 12px", fontFamily:"'DM Mono',monospace" }}>
              Por tipo
            </p>
            <div style={{ height:200 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="valor" nameKey="tipo" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={TIPO_COLORS[d.tipo] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => fmtK(v)}
                    contentStyle={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:8, fontSize:12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Image upload */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isProcessingImage && imgRef.current?.click()}
          style={{
            background: dragging ? "#60a5fa11" : "#0f172a",
            border: `2px dashed ${dragging ? "#60a5fa" : "#334155"}`,
            borderRadius:12, padding:"24px 16px", textAlign:"center",
            cursor: isProcessingImage ? "not-allowed" : "pointer",
            transition:"all 0.2s", display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", minHeight:160,
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
            <>
              <div style={{
                width:32, height:32, border:"3px solid #1e293b",
                borderTopColor:"#60a5fa", borderRadius:"50%",
                animation:"spin 0.8s linear infinite", marginBottom:12,
              }} />
              <p style={{ color:"#60a5fa", fontSize:13, margin:0 }}>Analisando imagem com IA...</p>
            </>
          ) : (
            <>
              <p style={{ fontSize:32, margin:"0 0 8px" }}>📸</p>
              <p style={{ color:"#f1f5f9", fontWeight:700, fontSize:13, margin:"0 0 4px" }}>
                Importar screenshot de investimentos
              </p>
              <p style={{ color:"#475569", fontSize:11, margin:0 }}>
                PNG, JPG, JPEG · Nubank, XP, BTG, Itaú...
              </p>
            </>
          )}
          {ocrError && (
            <p style={{ color:"#f87171", fontSize:12, margin:"8px 0 0" }}>{ocrError}</p>
          )}
        </div>
      </div>

      {/* Manual form */}
      <div style={{ marginBottom:20 }}>
        <ManualForm onAdd={addManual} />
      </div>

      {/* Investments list */}
      {investments.length > 0 && (
        <div>
          <p style={{ color:"#64748b", fontSize:10, textTransform:"uppercase",
            letterSpacing:1.5, margin:"0 0 10px", fontFamily:"'DM Mono',monospace" }}>
            Posições ({investments.length})
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {investments.map((inv) => (
              <div key={inv.id} style={{
                background:"#0f172a", border:"1px solid #1e293b", borderRadius:10,
                padding:"12px 16px", display:"flex", alignItems:"center", gap:10,
              }}>
                <div style={{
                  width:10, height:10, borderRadius:"50%", flexShrink:0,
                  background: TIPO_COLORS[inv.tipo] || "#94a3b8",
                }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ color:"#f1f5f9", fontSize:13, fontWeight:600, margin:0 }}>{inv.nome}</p>
                  <p style={{ color:"#475569", fontSize:11, margin:"2px 0 0", fontFamily:"'DM Mono',monospace" }}>
                    {inv.instituicao} · {inv.tipo} · {inv.data}
                    {inv.source === "ocr" && " · 📸 OCR"}
                    {inv.source === "manual" && " · ✍️ Manual"}
                  </p>
                </div>
                {inv.rentabilidade != null && (
                  <span style={{ color:"#34d399", fontSize:12, fontFamily:"'DM Mono',monospace" }}>
                    +{(inv.rentabilidade * 100).toFixed(2)}%
                  </span>
                )}
                <span style={{ color:"#34d399", fontSize:15, fontWeight:700,
                  fontFamily:"'DM Mono',monospace" }}>
                  {fmtK(inv.valor)}
                </span>
                <button
                  onClick={() => remove(inv.id)}
                  style={{ background:"transparent", border:"none", color:"#334155", cursor:"pointer", fontSize:16 }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
