import { useMemo, useState } from "react";
import { useApp } from "../contexts/AppContext";
import ClassePieChart from "../charts/ClassePieChart";
import FluxoChart from "../charts/FluxoChart";
import PatrimonioChart from "../charts/PatrimonioChart";
import RendaPassivaChart from "../charts/RendaPassivaChart";
import EmptyState from "../components/EmptyState";
import KPICard from "../components/KPICard";
import Section from "../components/Section";
import UploadPanel from "../components/UploadPanel";
import CategoryReviewPanel from "../components/CategoryReviewPanel.jsx";
import InvestmentsTab from "../components/InvestmentsTab.jsx";
import {
  CORES,
  deriveDashboardData,
  deriveMonthExpenses,
  deriveMonthlyKpis,
  filterTransactions,
} from "../utils/deriveMetrics";
import { useFinancialData } from "../hooks/useFinancialData";
import { useInvestments } from "../hooks/useInvestments.js";
import { fmt, fmtK } from "../utils/formatters";

const TABS = ["Visão Geral", "Patrimônio", "Despesas", "Transações", "Investimentos"];

export default function DashboardPage() {
  const { profile, resetOnboarding } = useApp();
  const [tab, setTab]           = useState(0);
  const [mesSel, setMesSel]     = useState("Jan");
  const [filtroTipo, setFiltroTipo] = useState("Todos");

  const {
    importedData, importLog, importSummary, isImporting,
    duplicateAlert, dismissDuplicateAlert,
    showReview, setShowReview,
    handleFilesImported, handleCategoryChange, clearAll,
  } = useFinancialData();

  const investHook = useInvestments();

  const dashboard = useMemo(() => deriveDashboardData(importedData), [importedData]);
  const {
    activeMonth, bancoData, classeData, despesasCat,
    fluxoData, meses, patrimonioData, rendaPassiva, totalPatrimonio,
  } = dashboard;

  const mesAtual = meses.includes(mesSel) ? mesSel : activeMonth;
  const { rendaMes, despesaMes, aporteMes, saldoMes, coberturaPassiva, progresso } =
    deriveMonthlyKpis({ fluxoData, rendaPassiva, mesAtual, totalPatrimonio });
  const { despesasMes, totalDespMes } = deriveMonthExpenses(despesasCat, mesAtual);
  const transacoes   = importedData.transacoes;
  const txFiltradas  = filterTransactions(transacoes, filtroTipo);

  const needsReview  = transacoes.filter(
    (t) => t.categorySource === "fallback" || (t.confidence ?? 1) < 0.5
  ).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#020617",
      fontFamily: "'Syne', sans-serif",
      color: "#e2e8f0",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* ── HEADER ── */}
      <div style={{
        background: "linear-gradient(180deg,#0f172a 0%,transparent 100%)",
        padding: "16px 16px 0",
        borderBottom: "1px solid #1e293b",
        position: "sticky", top: 0, zIndex: 50,
        backdropFilter: "blur(12px)",
        background: "#020617ee",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:"#f1f5f9", letterSpacing:-0.5 }}>
              Auren
            </h1>
            <p style={{ margin:"1px 0 0", color:"#475569", fontSize:11, fontFamily:"'DM Mono',monospace" }}>
              {profile?.name ? `${profile.name} · ` : ""}{mesAtual}/2026
            </p>
          </div>
          <div style={{
            background:"#0f172a", border:"1px solid #1e293b", borderRadius:20,
            padding:"5px 12px", fontSize:12, color:"#34d399",
            fontFamily:"'DM Mono',monospace",
          }}>
            {fmtK(transacoes.reduce((s,t) => s+t.valor, 0))}
          </div>
        </div>

        {/* Review nudge */}
        {needsReview > 0 && !showReview && (
          <button
            onClick={() => setShowReview(true)}
            style={{
              width:"100%", background:"#fbbf2411", border:"1px solid #fbbf2440",
              borderRadius:8, color:"#fbbf24", padding:"8px 12px",
              fontSize:12, cursor:"pointer", marginBottom:8, textAlign:"left",
              fontFamily:"'DM Mono',monospace",
            }}
          >
            ⚠ {needsReview} transações precisam de revisão → Categorizar agora
          </button>
        )}

        {/* TABS — horizontal scroll on mobile */}
        <div style={{
          display:"flex", gap:0, overflowX:"auto",
          WebkitOverflowScrolling:"touch", scrollbarWidth:"none",
          msOverflowStyle:"none",
        }}>
          <style>{`.tab-scroll::-webkit-scrollbar{display:none}`}</style>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              background: "transparent",
              border: "none",
              borderBottom: tab===i ? "2px solid #34d399" : "2px solid transparent",
              color: tab===i ? "#34d399" : "#64748b",
              padding: "10px 14px",
              fontSize: 13,
              fontFamily: "'Syne',sans-serif",
              fontWeight: tab===i ? 600 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "all 0.15s",
            }}>
              {t}{t==="Investimentos" && investHook.investments.length > 0
                ? ` (${investHook.investments.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding:"16px", maxWidth:900, margin:"0 auto" }}>

        {/* Upload panel */}
        <UploadPanel
          importLog={importLog}
          importSummary={importSummary}
          isImporting={isImporting}
          onFilesImported={handleFilesImported}
          onClearAll={clearAll}
          duplicateAlert={duplicateAlert}
          onDismissDuplicate={dismissDuplicateAlert}
        />

        {/* Category review panel */}
        {showReview && (
          <CategoryReviewPanel
            transactions={transacoes}
            onCategoryChange={handleCategoryChange}
            onClose={() => setShowReview(false)}
          />
        )}

        {/* ── TAB 0: Visão Geral ── */}
        {tab === 0 && (
          <>
            {transacoes.length === 0 && investHook.investments.length === 0 ? (
              <EmptyState title="Sem dados ainda">
                Importe um CSV ou PDF do seu banco para começar.
              </EmptyState>
            ) : (
              <>
                <div style={{
                  background:"linear-gradient(135deg,#0f172a,#1e293b)",
                  border:"1px solid #334155", borderRadius:16,
                  padding:"18px 20px", marginBottom:18,
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <p style={{ color:"#64748b", fontSize:10, textTransform:"uppercase",
                        letterSpacing:1.5, margin:"0 0 4px" }}>Patrimônio Total</p>
                      <p style={{ color:"#34d399", fontSize:32, fontWeight:800, margin:0,
                        fontFamily:"'DM Mono',monospace" }}>{fmtK(totalPatrimonio + investHook.totalValue)}</p>
                      <p style={{ color:"#475569", fontSize:11, margin:"3px 0 0" }}>
                        Meta R$ 1M ·{" "}
                        <span style={{ color: progresso >= 100 ? "#34d399" : "#60a5fa" }}>
                          {progresso.toFixed(1)}%
                        </span>
                      </p>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <p style={{ color:"#64748b", fontSize:10, margin:"0 0 3px" }}>Cobertura Passiva</p>
                      <p style={{ color:"#fbbf24", fontSize:24, fontWeight:700, margin:0,
                        fontFamily:"'DM Mono',monospace" }}>{coberturaPassiva.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div style={{ marginTop:12, background:"#0f172a", borderRadius:6, height:6, overflow:"hidden" }}>
                    <div style={{
                      width:`${progresso}%`,
                      background:"linear-gradient(90deg,#34d399,#60a5fa)",
                      height:"100%", borderRadius:6, transition:"width 1s ease",
                    }} />
                  </div>
                </div>

                <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
                  <KPICard label={`Renda ${mesAtual}`}    value={fmtK(rendaMes)}   sub="Ativa + passiva"  cor="#60a5fa" />
                  <KPICard label={`Despesas ${mesAtual}`} value={fmtK(despesaMes)} sub="Fixas + variáveis" cor="#f87171" />
                  <KPICard label={`Saldo ${mesAtual}`}    value={fmtK(saldoMes)}   sub="Net balance"       cor="#34d399" />
                  <KPICard label={`Aportes ${mesAtual}`}  value={fmtK(aporteMes)}  sub="Total investido"   cor="#a78bfa" />
                </div>

                <Section title="Evolução do Patrimônio"><PatrimonioChart data={patrimonioData} /></Section>

                <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:240 }}>
                    <Section title="Por Classe de Ativo"><ClassePieChart data={classeData} /></Section>
                  </div>
                  <div style={{ flex:1, minWidth:240 }}>
                    <Section title="Renda Passiva Mensal"><RendaPassivaChart data={rendaPassiva} /></Section>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── TAB 1: Patrimônio ── */}
        {tab === 1 && (
          <>
            <Section title="Distribuição por Banco">
              {bancoData.length ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[...bancoData].sort((a,b)=>b.valor-a.valor).map((bank, i) => {
                    const pct = totalPatrimonio ? ((bank.valor/totalPatrimonio)*100).toFixed(1) : "0.0";
                    return (
                      <div key={bank.id} style={{
                        background:"#0f172a", border:"1px solid #1e293b",
                        borderRadius:10, padding:"12px 16px",
                      }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <span style={{ fontWeight:600, color:"#f1f5f9", fontSize:14 }}>{bank.banco}</span>
                          <span style={{ color:CORES[i%CORES.length], fontFamily:"'DM Mono',monospace",
                            fontSize:14, fontWeight:600 }}>{fmtK(bank.valor)}</span>
                        </div>
                        <div style={{ background:"#1e293b", borderRadius:3, height:5 }}>
                          <div style={{ width:`${pct}%`, background:CORES[i%CORES.length],
                            height:"100%", borderRadius:3 }} />
                        </div>
                        <p style={{ color:"#475569", fontSize:10, margin:"4px 0 0",
                          fontFamily:"'DM Mono',monospace" }}>{pct}% do total</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="Sem bancos importados">
                  Inclua linhas com dataset=banco e colunas banco, valor.
                </EmptyState>
              )}
            </Section>

            <Section title={`Classe de Ativos — ${mesAtual}/2026`}>
              {classeData.length ? (
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {classeData.map((a) => (
                    <div key={a.id} style={{
                      background:"#0f172a", border:`1px solid ${a.cor}44`,
                      borderRadius:10, padding:"12px 16px", flex:"1 1 160px",
                    }}>
                      <p style={{ color:a.cor, fontWeight:700, fontSize:12, margin:"0 0 4px" }}>{a.classe}</p>
                      <p style={{ color:"#f1f5f9", fontSize:18, fontWeight:700, margin:0,
                        fontFamily:"'DM Mono',monospace" }}>{fmtK(a.valor)}</p>
                      <p style={{ color:"#475569", fontSize:10, margin:"3px 0 0" }}>
                        {totalPatrimonio ? ((a.valor/totalPatrimonio)*100).toFixed(1) : "0.0"}%
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Sem classes importadas">
                  Importe a composição por classe.
                </EmptyState>
              )}
            </Section>

            <Section title="Fluxo Mensal"><FluxoChart data={fluxoData} /></Section>
          </>
        )}

        {/* ── TAB 2: Despesas ── */}
        {tab === 2 && (
          <>
            <div style={{ display:"flex", gap:6, marginBottom:14, overflowX:"auto",
              WebkitOverflowScrolling:"touch", paddingBottom:4 }}>
              {meses.map((m) => (
                <button key={m} onClick={() => setMesSel(m)} style={{
                  background: mesAtual===m ? "#1e293b" : "transparent",
                  border: mesAtual===m ? "1px solid #60a5fa" : "1px solid #1e293b",
                  borderRadius:8, color: mesAtual===m ? "#60a5fa" : "#64748b",
                  padding:"6px 14px", fontSize:12, cursor:"pointer",
                  whiteSpace:"nowrap", flexShrink:0,
                  fontFamily:"'Syne',sans-serif",
                }}>{m}</button>
              ))}
            </div>

            <div style={{
              background:"#0f172a", border:"1px solid #1e293b", borderRadius:12,
              padding:"14px 18px", marginBottom:14,
              display:"flex", justifyContent:"space-between", alignItems:"center",
            }}>
              <div>
                <p style={{ color:"#64748b", fontSize:10, textTransform:"uppercase",
                  letterSpacing:1.5, margin:"0 0 3px" }}>Total {mesAtual}</p>
                <p style={{ color:"#f87171", fontSize:26, fontWeight:700, margin:0,
                  fontFamily:"'DM Mono',monospace" }}>{fmt(totalDespMes)}</p>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ color:"#64748b", fontSize:10, margin:"0 0 3px" }}>Categorias</p>
                <p style={{ color:"#f1f5f9", fontSize:22, fontWeight:700, margin:0 }}>
                  {despesasMes.length}
                </p>
              </div>
            </div>

            <Section title={`Categorias — ${mesAtual}`}>
              {despesasMes.length ? (
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  {despesasMes.map((e, i) => {
                    const pct = totalDespMes ? ((e.valor/totalDespMes)*100).toFixed(1) : "0.0";
                    const cor = CORES[i%CORES.length];
                    return (
                      <div key={e.id} style={{
                        background:"#0f172a", border:"1px solid #1e293b",
                        borderRadius:10, padding:"10px 14px",
                      }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <span style={{ color:"#e2e8f0", fontSize:13 }}>{e.cat}</span>
                          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                            <span style={{ color:"#64748b", fontSize:11,
                              fontFamily:"'DM Mono',monospace" }}>{pct}%</span>
                            <span style={{ color:cor, fontFamily:"'DM Mono',monospace",
                              fontSize:14, fontWeight:600 }}>{fmt(e.valor)}</span>
                          </div>
                        </div>
                        <div style={{ background:"#1e293b", borderRadius:3, height:4 }}>
                          <div style={{ width:`${pct}%`, background:cor, height:"100%", borderRadius:3 }} />
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
        )}

        {/* ── TAB 3: Transações ── */}
        {tab === 3 && (
          <>
            <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
              {["Todos","Receita","Despesa","Investimento"].map((f) => (
                <button key={f} onClick={() => setFiltroTipo(f)} style={{
                  background: filtroTipo===f ? "#1e293b" : "transparent",
                  border: filtroTipo===f ? "1px solid #a78bfa" : "1px solid #1e293b",
                  borderRadius:8, color: filtroTipo===f ? "#a78bfa" : "#64748b",
                  padding:"6px 12px", fontSize:12, cursor:"pointer",
                  fontFamily:"'Syne',sans-serif",
                }}>{f}</button>
              ))}
              {needsReview > 0 && (
                <button onClick={() => setShowReview(true)} style={{
                  background:"#fbbf2411", border:"1px solid #fbbf2440",
                  borderRadius:8, color:"#fbbf24", padding:"6px 12px",
                  fontSize:12, cursor:"pointer", fontFamily:"'DM Mono',monospace",
                }}>
                  ⚠ {needsReview} para revisar
                </button>
              )}
            </div>

            {txFiltradas.length ? (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {txFiltradas.map((t) => {
                  const isRec = t.valor > 0;
                  const isInv = t.tipo === "Investimento";
                  const cor   = isInv ? "#60a5fa" : isRec ? "#34d399" : "#f87171";
                  const needsR = t.categorySource === "fallback" || (t.confidence??1) < 0.5;
                  return (
                    <div key={t.id} style={{
                      background:"#0f172a",
                      border:`1px solid ${needsR ? "#fbbf2430" : "#1e293b"}`,
                      borderRadius:10, padding:"11px 14px",
                      display:"flex", justifyContent:"space-between", alignItems:"center",
                    }}>
                      <div style={{ display:"flex", gap:10, alignItems:"center", minWidth:0, flex:1 }}>
                        <div style={{
                          background:cor+"22", border:`1px solid ${cor}44`,
                          borderRadius:8, width:34, height:34, flexShrink:0,
                          display:"flex", alignItems:"center", justifyContent:"center", fontSize:15,
                        }}>
                          {isInv ? "📈" : isRec ? "↑" : "↓"}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <p style={{ color:"#e2e8f0", fontSize:13, fontWeight:600, margin:0,
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {t.desc}
                          </p>
                          <p style={{ color:"#475569", fontSize:10, margin:"1px 0 0",
                            fontFamily:"'DM Mono',monospace" }}>
                            {t.data} · {t.cat}
                            {needsR && " ⚠"}
                          </p>
                        </div>
                      </div>
                      <span style={{ color:cor, fontFamily:"'DM Mono',monospace",
                        fontSize:13, fontWeight:700, flexShrink:0, marginLeft:8 }}>
                        {t.valor>0?"+":""}{fmt(Math.abs(t.valor))}
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
        )}

        {/* ── TAB 4: Investimentos ── */}
        {tab === 4 && (
          <InvestmentsTab hook={investHook} />
        )}
      </div>
    </div>
  );
}
