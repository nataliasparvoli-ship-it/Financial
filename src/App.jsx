import { useMemo, useState } from "react";
import ClassePieChart from "./charts/ClassePieChart";
import FluxoChart from "./charts/FluxoChart";
import PatrimonioChart from "./charts/PatrimonioChart";
import RendaPassivaChart from "./charts/RendaPassivaChart";
import EmptyState from "./components/EmptyState";
import KPICard from "./components/KPICard";
import Section from "./components/Section";
import UploadPanel from "./components/UploadPanel";
import {
  CORES,
  deriveDashboardData,
  deriveMonthExpenses,
  deriveMonthlyKpis,
  filterTransactions,
} from "./utils/deriveMetrics";
import { useFinancialData } from "./hooks/useFinancialData";
import { fmt, fmtK } from "./utils/formatters";

const tabs = ["Visão Geral", "Patrimônio", "Despesas", "Transações"];

export default function App() {
  const [tab, setTab] = useState(0);
  const [mesSel, setMesSel] = useState("Jan");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const {
    importedData,
    importLog,
    importSummary,
    isImporting,
    handleFilesImported,
  } = useFinancialData();

  const dashboard = useMemo(
    () => deriveDashboardData(importedData),
    [importedData],
  );
  const {
    activeMonth,
    bancoData,
    classeData,
    despesasCat,
    fluxoData,
    meses,
    patrimonioData,
    rendaPassiva,
    totalPatrimonio,
  } = dashboard;
  const mesAtual = meses.includes(mesSel) ? mesSel : activeMonth;
  const {
    rendaMes,
    despesaMes,
    aporteMes,
    saldoMes,
    coberturaPassiva,
    progresso,
  } = deriveMonthlyKpis({ fluxoData, rendaPassiva, mesAtual, totalPatrimonio });
  const { despesasMes, totalDespMes } = deriveMonthExpenses(
    despesasCat,
    mesAtual,
  );
  const transacoes = importedData.transacoes;
  const txFiltradas = filterTransactions(transacoes, filtroTipo);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        fontFamily: "'Syne', sans-serif",
        color: "#e2e8f0",
        padding: 0,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <div
        style={{
          background: "linear-gradient(180deg, #0f172a 0%, transparent 100%)",
          padding: "20px 24px 16px",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 800,
                color: "#f1f5f9",
              }}
            >
              💰 Minhas Finanças
            </h1>
            <p
              style={{
                margin: "2px 0 0",
                color: "#475569",
                fontSize: 12,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {mesAtual}/2026 · Dados importados
            </p>
          </div>
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: 20,
              padding: "6px 14px",
              fontSize: 13,
              color: "#34d399",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {fmtK(
              transacoes.reduce(
                (sum, transaction) => sum + transaction.valor,
                0,
              ),
            )}{" "}
            saldo importado
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
          {tabs.map((item, index) => (
            <button
              key={item}
              onClick={() => setTab(index)}
              style={{
                background: tab === index ? "#1e293b" : "transparent",
                border:
                  tab === index ? "1px solid #334155" : "1px solid transparent",
                borderRadius: 8,
                color: tab === index ? "#f1f5f9" : "#64748b",
                padding: "7px 14px",
                fontSize: 13,
                fontFamily: "'Syne', sans-serif",
                fontWeight: tab === index ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "22px 24px", maxWidth: 900, margin: "0 auto" }}>
        <UploadPanel
          importLog={importLog}
          importSummary={importSummary}
          isImporting={isImporting}
          onFilesImported={handleFilesImported}
        />

        {tab === 0 && (
          <>
            <div
              style={{
                background: "linear-gradient(135deg, #0f172a, #1e293b)",
                border: "1px solid #334155",
                borderRadius: 16,
                padding: "20px 24px",
                marginBottom: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <p
                    style={{
                      color: "#64748b",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                      margin: "0 0 6px",
                    }}
                  >
                    Patrimônio Total
                  </p>
                  <p
                    style={{
                      color: "#34d399",
                      fontSize: 36,
                      fontWeight: 800,
                      margin: 0,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {fmtK(totalPatrimonio)}
                  </p>
                  <p
                    style={{
                      color: "#475569",
                      fontSize: 12,
                      margin: "4px 0 0",
                    }}
                  >
                    Meta R$ 1.000.000 ·{" "}
                    <span
                      style={{
                        color: progresso >= 100 ? "#34d399" : "#60a5fa",
                      }}
                    >
                      {progresso.toFixed(1)}%
                    </span>
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p
                    style={{
                      color: "#64748b",
                      fontSize: 11,
                      margin: "0 0 4px",
                    }}
                  >
                    Cobertura Passiva
                  </p>
                  <p
                    style={{
                      color: "#fbbf24",
                      fontSize: 28,
                      fontWeight: 700,
                      margin: 0,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {coberturaPassiva.toFixed(1)}%
                  </p>
                  <p style={{ color: "#475569", fontSize: 12 }}>
                    renda passiva / despesas
                  </p>
                </div>
              </div>
              <div
                style={{
                  marginTop: 14,
                  background: "#0f172a",
                  borderRadius: 8,
                  height: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progresso}%`,
                    background: "linear-gradient(90deg, #34d399, #60a5fa)",
                    height: "100%",
                    borderRadius: 8,
                    transition: "width 1s ease",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 22,
                flexWrap: "wrap",
              }}
            >
              <KPICard
                label={`Renda ${mesAtual}`}
                value={fmtK(rendaMes)}
                sub="Ativa + passiva"
                cor="#60a5fa"
              />
              <KPICard
                label={`Despesas ${mesAtual}`}
                value={fmtK(despesaMes)}
                sub="Fixas + variáveis"
                cor="#f87171"
              />
              <KPICard
                label={`Saldo ${mesAtual}`}
                value={fmtK(saldoMes)}
                sub="Net balance"
                cor="#34d399"
              />
              <KPICard
                label={`Aportes ${mesAtual}`}
                value={fmtK(aporteMes)}
                sub="Total investido"
                cor="#a78bfa"
              />
            </div>

            <Section title="Evolução do Patrimônio">
              <PatrimonioChart data={patrimonioData} />
            </Section>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <Section title="Por Classe de Ativo">
                  <ClassePieChart data={classeData} />
                </Section>
              </div>
              <div style={{ flex: 1, minWidth: 260 }}>
                <Section title="Renda Passiva Mensal">
                  <RendaPassivaChart data={rendaPassiva} />
                </Section>
              </div>
            </div>
          </>
        )}

        {tab === 1 && (
          <>
            <Section title="Distribuição por Banco">
              {bancoData.length ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {[...bancoData]
                    .sort((a, b) => b.valor - a.valor)
                    .map((bank, index) => {
                      const pct = totalPatrimonio
                        ? ((bank.valor / totalPatrimonio) * 100).toFixed(1)
                        : "0.0";
                      return (
                        <div
                          key={bank.id}
                          style={{
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: 10,
                            padding: "14px 18px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 8,
                            }}
                          >
                            <span style={{ fontWeight: 600, color: "#f1f5f9" }}>
                              {bank.banco}
                            </span>
                            <span
                              style={{
                                color: CORES[index % CORES.length],
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 15,
                                fontWeight: 600,
                              }}
                            >
                              {fmtK(bank.valor)}
                            </span>
                          </div>
                          <div
                            style={{
                              background: "#1e293b",
                              borderRadius: 4,
                              height: 6,
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                background: CORES[index % CORES.length],
                                height: "100%",
                                borderRadius: 4,
                              }}
                            />
                          </div>
                          <p
                            style={{
                              color: "#475569",
                              fontSize: 11,
                              margin: "6px 0 0",
                              fontFamily: "'DM Mono', monospace",
                            }}
                          >
                            {pct}% do total
                          </p>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <EmptyState title="Sem bancos importados">
                  Inclua linhas com dataset=banco e colunas banco,valor.
                </EmptyState>
              )}
            </Section>

            <Section title={`Classe de Ativos — ${mesAtual}/2026`}>
              {classeData.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {classeData.map((assetClass) => (
                    <div
                      key={assetClass.id}
                      style={{
                        background: "#0f172a",
                        border: `1px solid ${assetClass.cor}44`,
                        borderRadius: 10,
                        padding: "14px 18px",
                        flex: "1 1 200px",
                      }}
                    >
                      <p
                        style={{
                          color: assetClass.cor,
                          fontWeight: 700,
                          fontSize: 13,
                          margin: "0 0 6px",
                        }}
                      >
                        {assetClass.classe}
                      </p>
                      <p
                        style={{
                          color: "#f1f5f9",
                          fontSize: 20,
                          fontWeight: 700,
                          margin: 0,
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        {fmtK(assetClass.valor)}
                      </p>
                      <p
                        style={{
                          color: "#475569",
                          fontSize: 11,
                          margin: "4px 0 0",
                        }}
                      >
                        {totalPatrimonio
                          ? (
                              (assetClass.valor / totalPatrimonio) *
                              100
                            ).toFixed(1)
                          : "0.0"}
                        % do portfólio
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Sem classes importadas">
                  Importe a composição por classe para preencher este bloco.
                </EmptyState>
              )}
            </Section>

            <Section title="Fluxo Mensal — Renda vs Despesas vs Aportes">
              <FluxoChart data={fluxoData} />
            </Section>
          </>
        )}

        {tab === 2 && (
          <>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              {meses.map((month) => (
                <button
                  key={month}
                  onClick={() => setMesSel(month)}
                  style={{
                    background: mesAtual === month ? "#1e293b" : "transparent",
                    border:
                      mesAtual === month
                        ? "1px solid #60a5fa"
                        : "1px solid #1e293b",
                    borderRadius: 8,
                    color: mesAtual === month ? "#60a5fa" : "#64748b",
                    padding: "6px 16px",
                    fontSize: 13,
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: mesAtual === month ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  {month}/2026
                </button>
              ))}
            </div>

            <div
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    margin: "0 0 4px",
                  }}
                >
                  Total Despesas {mesAtual}
                </p>
                <p
                  style={{
                    color: "#f87171",
                    fontSize: 28,
                    fontWeight: 700,
                    margin: 0,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {fmt(totalDespMes)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p
                  style={{ color: "#64748b", fontSize: 11, margin: "0 0 4px" }}
                >
                  Categorias ativas
                </p>
                <p
                  style={{
                    color: "#f1f5f9",
                    fontSize: 24,
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  {despesasMes.length}
                </p>
              </div>
            </div>

            <Section title={`Categorias — ${mesAtual}/2026`}>
              {despesasMes.length ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {despesasMes.map((expense, index) => {
                    const pct = totalDespMes
                      ? ((expense.valor / totalDespMes) * 100).toFixed(1)
                      : "0.0";
                    const cor = CORES[index % CORES.length];
                    return (
                      <div
                        key={expense.id}
                        style={{
                          background: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: 10,
                          padding: "12px 16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 6,
                          }}
                        >
                          <span style={{ color: "#e2e8f0", fontSize: 14 }}>
                            {expense.cat}
                          </span>
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                color: "#64748b",
                                fontSize: 12,
                                fontFamily: "'DM Mono', monospace",
                              }}
                            >
                              {pct}%
                            </span>
                            <span
                              style={{
                                color: cor,
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 15,
                                fontWeight: 600,
                              }}
                            >
                              {fmt(expense.valor)}
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            background: "#1e293b",
                            borderRadius: 4,
                            height: 5,
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              background: cor,
                              height: "100%",
                              borderRadius: 4,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="Sem despesas no mês">
                  Importe transações de despesa para este mês.
                </EmptyState>
              )}
            </Section>
          </>
        )}

        {tab === 3 && (
          <>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              {["Todos", "Receita", "Despesa", "Investimento"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFiltroTipo(filter)}
                  style={{
                    background:
                      filtroTipo === filter ? "#1e293b" : "transparent",
                    border:
                      filtroTipo === filter
                        ? "1px solid #a78bfa"
                        : "1px solid #1e293b",
                    borderRadius: 8,
                    color: filtroTipo === filter ? "#a78bfa" : "#64748b",
                    padding: "6px 14px",
                    fontSize: 12,
                    fontFamily: "'Syne', sans-serif",
                    cursor: "pointer",
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>

            {txFiltradas.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {txFiltradas.map((transaction) => {
                  const isRec = transaction.valor > 0;
                  const isInv = transaction.tipo === "Investimento";
                  const cor = isInv ? "#60a5fa" : isRec ? "#34d399" : "#f87171";
                  return (
                    <div
                      key={transaction.id}
                      style={{
                        background: "#0f172a",
                        border: "1px solid #1e293b",
                        borderRadius: 10,
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            background: cor + "22",
                            border: `1px solid ${cor}44`,
                            borderRadius: 8,
                            width: 36,
                            height: 36,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                          }}
                        >
                          {isInv ? "📈" : isRec ? "↑" : "↓"}
                        </div>
                        <div>
                          <p
                            style={{
                              color: "#e2e8f0",
                              fontSize: 13,
                              fontWeight: 600,
                              margin: 0,
                            }}
                          >
                            {transaction.desc}
                          </p>
                          <p
                            style={{
                              color: "#475569",
                              fontSize: 11,
                              margin: "2px 0 0",
                              fontFamily: "'DM Mono', monospace",
                            }}
                          >
                            {transaction.data} · {transaction.mes} ·{" "}
                            {transaction.cat} · {transaction.conta}
                          </p>
                        </div>
                      </div>
                      <span
                        style={{
                          color: cor,
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 15,
                          fontWeight: 700,
                        }}
                      >
                        {transaction.valor > 0 ? "+" : ""}
                        {fmt(Math.abs(transaction.valor))}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Sem transações importadas">
                Importe um CSV/PDF com data, mes, categoria, descrição, tipo,
                valor e conta.
              </EmptyState>
            )}
          </>
        )}
      </div>
    </div>
  );
}
