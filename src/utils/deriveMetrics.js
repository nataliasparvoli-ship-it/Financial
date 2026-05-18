export const CORES = [
  "#60a5fa",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#fb923c",
  "#e879f9",
  "#38bdf8",
];

export const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const sumBy = (items, getKey, getValue) => {
  const map = new Map();

  items.forEach((item) => {
    const key = getKey(item);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + getValue(item));
  });

  return map;
};

const isInvestment = (transaction) => transaction.tipo === "Investimento";
const isPassiveIncome = (transaction) =>
  transaction.cat === "Renda Passiva" ||
  /dividend|juros|cupom/i.test(`${transaction.desc} ${transaction.tipo}`);

export const deriveMonthlyFlow = (transacoes, meses) =>
  meses.map((mes) => {
    const rows = transacoes.filter((transaction) => transaction.mes === mes);

    return {
      mes,
      renda: rows
        .filter(
          (transaction) => transaction.valor > 0 && !isInvestment(transaction),
        )
        .reduce((sum, transaction) => sum + transaction.valor, 0),
      despesas: Math.abs(
        rows
          .filter(
            (transaction) =>
              transaction.valor < 0 && !isInvestment(transaction),
          )
          .reduce((sum, transaction) => sum + transaction.valor, 0),
      ),
      aportes: Math.abs(
        rows
          .filter((transaction) => isInvestment(transaction))
          .reduce((sum, transaction) => sum + transaction.valor, 0),
      ),
    };
  });

export const deriveExpenseCategories = (transacoes, meses) => {
  const expenseMap = sumBy(
    transacoes.filter(
      (transaction) => transaction.valor < 0 && !isInvestment(transaction),
    ),
    (transaction) => `${transaction.cat}|||${transaction.mes}`,
    (transaction) => Math.abs(transaction.valor),
  );
  const categories = Array.from(
    new Set(
      transacoes
        .filter((transaction) => transaction.valor < 0)
        .map((transaction) => transaction.cat),
    ),
  );

  return categories.map((cat) =>
    meses.reduce(
      (row, mes) => ({
        ...row,
        [mes]: expenseMap.get(`${cat}|||${mes}`) || 0,
      }),
      { id: `expense-${cat}`, cat },
    ),
  );
};

export const derivePassiveIncome = (transacoes, meses) =>
  meses
    .map((mes) => {
      const rows = transacoes.filter(
        (transaction) =>
          transaction.mes === mes &&
          transaction.valor > 0 &&
          isPassiveIncome(transaction),
      );
      const dividendos = rows
        .filter((transaction) => /dividend/i.test(transaction.desc))
        .reduce((sum, transaction) => sum + transaction.valor, 0);
      const juros = rows
        .filter((transaction) => /juros/i.test(transaction.desc))
        .reduce((sum, transaction) => sum + transaction.valor, 0);
      const cupom = rows
        .filter((transaction) => /cupom/i.test(transaction.desc))
        .reduce((sum, transaction) => sum + transaction.valor, 0);
      const total = rows.reduce(
        (sum, transaction) => sum + transaction.valor,
        0,
      );

      return {
        id: `passive-${mes}`,
        mes,
        total,
        dividendos,
        juros,
        cupom,
        outros: Math.max(total - dividendos - juros - cupom, 0),
      };
    })
    .filter((row) => row.total > 0);

export const deriveDashboardData = ({
  transacoes,
  patrimonio,
  classe,
  banco,
  rendaPassiva,
}) => {
  const meses = Array.from(
    new Set(transacoes.map((transaction) => transaction.mes).filter(Boolean)),
  ).sort(
    (a, b) => MONTHS.indexOf(a.slice(0, 3)) - MONTHS.indexOf(b.slice(0, 3)),
  );
  const activeMonth = meses[meses.length - 1] || "Jan";
  const fluxoData = deriveMonthlyFlow(transacoes, meses);
  const despesasCat = deriveExpenseCategories(transacoes, meses);
  const derivedPassiveIncome = derivePassiveIncome(transacoes, meses);
  const rendaPassivaFinal = rendaPassiva.length
    ? rendaPassiva.map((row) => ({
        ...row,
        total: row.dividendos + row.juros + row.cupom + row.outros,
      }))
    : derivedPassiveIncome;
  const classeData = classe.map((item, index) => ({
    ...item,
    cor: item.cor || CORES[index % CORES.length],
  }));
  const totalPatrimonio =
    patrimonio.at(-1)?.total ||
    banco.reduce((sum, item) => sum + item.valor, 0) ||
    classe.reduce((sum, item) => sum + item.valor, 0) ||
    0;

  return {
    activeMonth,
    bancoData: banco,
    classeData,
    despesasCat,
    fluxoData,
    meses: meses.length ? meses : [activeMonth],
    patrimonioData: patrimonio,
    rendaPassiva: rendaPassivaFinal,
    totalPatrimonio,
  };
};

export const deriveMonthlyKpis = ({
  fluxoData,
  rendaPassiva,
  mesAtual,
  totalPatrimonio,
}) => {
  const monthlyFlow = fluxoData.find((row) => row.mes === mesAtual) || {};
  const rendaMes = monthlyFlow.renda || 0;
  const despesaMes = monthlyFlow.despesas || 0;
  const aporteMes = monthlyFlow.aportes || 0;
  const passivaMes =
    rendaPassiva.find((row) => row.mes === mesAtual)?.total || 0;
  const metaPatrimonio = 1000000;

  return {
    rendaMes,
    despesaMes,
    aporteMes,
    saldoMes: rendaMes - despesaMes,
    coberturaPassiva: despesaMes ? (passivaMes / despesaMes) * 100 : 0,
    progresso: totalPatrimonio
      ? Math.min((totalPatrimonio / metaPatrimonio) * 100, 100)
      : 0,
  };
};

export const deriveMonthExpenses = (despesasCat, mesAtual) => {
  const despesasMes = despesasCat
    .map((row) => ({ id: row.id, cat: row.cat, valor: row[mesAtual] || 0 }))
    .filter((row) => row.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  return {
    despesasMes,
    totalDespMes: despesasMes.reduce((sum, row) => sum + row.valor, 0),
  };
};

export const filterTransactions = (transacoes, filtroTipo) =>
  filtroTipo === "Todos"
    ? transacoes
    : transacoes.filter(
        (transaction) =>
          transaction.tipo.includes(filtroTipo.split(" ")[0]) ||
          transaction.cat === filtroTipo,
      );
