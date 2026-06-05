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

// ── monthToMesId ──────────────────────────────────────────────────────────────
// Converts a referenceMonth { month: "Jan", year: 2026 } to a mesId ("2026-01").
// When year is unknown (legacy path), returns the abbreviation unchanged so that
// the caller can still perform a single-string lookup against legacy mesIds.
//
// Used by OverviewTab and ExpensesTab to convert AppContext.referenceMonth into
// the same key space used internally by deriveDashboardData.

export const monthToMesId = (month, year) => {
  const idx = MONTHS.indexOf(month);
  if (idx === -1 || !year) return month; // legacy fallback: return abbreviation
  return `${year}-${String(idx + 1).padStart(2, "0")}`;
};

const sumBy = (items, getKey, getValue) => {
  const map = new Map();

  items.forEach((item) => {
    const key = getKey(item);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + getValue(item));
  });

  return map;
};

// ── Aggregate classe entries by label (sum products of the same type) ─────────
// Handles XP/BTG custódia imports that list individual products per row.
const aggregateByClass = (classe) => {
  const map = new Map();
  classe.forEach((item) => {
    if (map.has(item.classe)) {
      map.get(item.classe).valor += item.valor;
    } else {
      map.set(item.classe, { ...item });
    }
  });
  return Array.from(map.values());
};

const isInvestment = (transaction) => transaction.tipo === "Investimento";
const isPassiveIncome = (transaction) =>
  transaction.cat === "Renda Passiva" ||
  /dividend|juros|cupom/i.test(`${transaction.desc} ${transaction.tipo}`);

// ── Internal derive helpers ───────────────────────────────────────────────────
// All helpers below receive transactions already enriched with `mesId` by
// deriveDashboardData. They group/filter by `t.mesId`, never by `t.mes`.
// The `mes` display label is re-attached by deriveDashboardData after the fact.

export const deriveMonthlyFlow = (transacoes, mesIds) =>
  mesIds.map((mesId) => {
    const rows = transacoes.filter((t) => t.mesId === mesId);

    return {
      mesId,
      renda: rows
        .filter((t) => t.valor > 0 && !isInvestment(t))
        .reduce((sum, t) => sum + t.valor, 0),
      despesas: Math.abs(
        rows
          .filter((t) => t.valor < 0 && !isInvestment(t))
          .reduce((sum, t) => sum + t.valor, 0),
      ),
      aportes: Math.abs(
        rows
          .filter((t) => isInvestment(t))
          .reduce((sum, t) => sum + t.valor, 0),
      ),
    };
  });

export const deriveExpenseCategories = (transacoes, mesIds) => {
  // Composite key: category + mesId (not mes) — unique across years.
  const expenseMap = sumBy(
    transacoes.filter((t) => t.valor < 0 && !isInvestment(t)),
    (t) => `${t.cat}|||${t.mesId}`,
    (t) => Math.abs(t.valor),
  );
  const categories = Array.from(
    new Set(
      transacoes
        .filter((t) => t.valor < 0)
        .map((t) => t.cat),
    ),
  );

  // Property keys on output rows are mesId values, not mes abbreviations.
  // deriveMonthExpenses accesses row[mesAtual] where mesAtual is a mesId.
  return categories.map((cat) =>
    mesIds.reduce(
      (row, mesId) => ({
        ...row,
        [mesId]: expenseMap.get(`${cat}|||${mesId}`) || 0,
      }),
      { id: `expense-${cat}`, cat },
    ),
  );
};

export const derivePassiveIncome = (transacoes, mesIds) =>
  mesIds
    .map((mesId) => {
      const rows = transacoes.filter(
        (t) =>
          t.mesId === mesId &&
          t.valor > 0 &&
          isPassiveIncome(t),
      );
      const dividendos = rows
        .filter((t) => /dividend/i.test(t.desc))
        .reduce((sum, t) => sum + t.valor, 0);
      const juros = rows
        .filter((t) => /juros/i.test(t.desc))
        .reduce((sum, t) => sum + t.valor, 0);
      const cupom = rows
        .filter((t) => /cupom/i.test(t.desc))
        .reduce((sum, t) => sum + t.valor, 0);
      const total = rows.reduce((sum, t) => sum + t.valor, 0);

      return {
        id: `passive-${mesId}`,
        mesId,
        // `mes` display label is attached by deriveDashboardData via mesLabels
        total,
        dividendos,
        juros,
        cupom,
        outros: Math.max(total - dividendos - juros - cupom, 0),
      };
    })
    .filter((row) => row.total > 0);

// ── deriveDashboardData ───────────────────────────────────────────────────────

export const deriveDashboardData = ({
  transacoes,
  patrimonio,
  classe,
  banco,
  rendaPassiva,
}) => {
  // ── Step 1: enrich each transaction with `mesId` ──────────────────────────
  // mesId is the single grouping key used by all downstream helpers.
  //   • New data  → mesId = mesKey ("YYYY-MM"), e.g. "2026-01"
  //   • Legacy data (no mesKey) → mesId = mes abbreviation ("Jan")
  // This preserves full backward compatibility: single-year legacy data
  // continues to work with abbreviation-based mesIds.
  const enriched = transacoes.map((t) => ({
    ...t,
    mesId: t.mesKey || t.mes || "",
  }));

  // ── Step 2: detect multi-year span for display labels ─────────────────────
  // Scan both enriched transactions AND incoming rendaPassiva rows — a dataset
  // that only imports passive income (no transactions) should still disambiguate
  // "Jan/25" from "Jan/26" in the chart.
  const isoMesIds = [
    ...enriched.map((t) => t.mesId),
    ...rendaPassiva.map((r) => r.mesKey || ""),
  ].filter((id) => /^\d{4}-\d{2}$/.test(id));
  const years = new Set(isoMesIds.map((id) => id.slice(0, 4)));
  const multiYear = years.size > 1;

  // ── Step 3: build mesLabels — mesId → human-readable display string ───────
  // Single-year or legacy: "Jan"
  // Multi-year:            "Jan/26"  (2-digit year suffix avoids ambiguity)
  const mesLabels = {};
  enriched.forEach((t) => {
    if (t.mesId && !(t.mesId in mesLabels)) {
      if (multiYear && t.mesKey) {
        mesLabels[t.mesId] = `${t.mes}/${t.mesKey.slice(2, 4)}`;
      } else {
        mesLabels[t.mesId] = t.mes || t.mesId;
      }
    }
  });

  // ── Step 4: unique mesIds, sorted chronologically ─────────────────────────
  // ISO mesIds sort lexicographically (correct).
  // Legacy abbreviation mesIds fall back to MONTHS.indexOf ordering.
  // Mixed datasets: ISO mesIds sort before abbreviation mesIds (safe assumption
  // since cross-year issues only arise with ISO mesKeys).
  const meses = Array.from(
    new Set(enriched.map((t) => t.mesId).filter(Boolean)),
  ).sort((a, b) => {
    const isIsoA = /^\d{4}-\d{2}$/.test(a);
    const isIsoB = /^\d{4}-\d{2}$/.test(b);
    if (isIsoA && isIsoB) return a.localeCompare(b);
    if (isIsoA) return -1;
    if (isIsoB) return 1;
    return MONTHS.indexOf(a.slice(0, 3)) - MONTHS.indexOf(b.slice(0, 3));
  });

  const activeMonth = meses[meses.length - 1] || "";

  // ── Step 5: derive grouped data using mesId as the grouping key ───────────
  const rawFluxo = deriveMonthlyFlow(enriched, meses);
  // Re-attach the human-readable display label for chart rendering.
  // Charts use dataKey="mes" — this is display-only and does not affect grouping.
  const fluxoData = rawFluxo.map((row) => ({
    ...row,
    mes: mesLabels[row.mesId] ?? row.mesId,
  }));

  const despesasCat = deriveExpenseCategories(enriched, meses);

  const rawPassive = derivePassiveIncome(enriched, meses);
  const derivedPassiveIncome = rawPassive.map((row) => ({
    ...row,
    mes: mesLabels[row.mesId] ?? row.mesId,
  }));

  // ── Step 6: merge imported vs derived passive income ──────────────────────
  // Imported rows arrive from CSV as { mes, mesKey?, dividendos, juros, cupom, outros }.
  // We add mesId and the display label so KPI lookups work by mesId throughout.
  const rendaPassivaFinal = rendaPassiva.length
    ? rendaPassiva.map((row) => {
        const mesId = row.mesKey || row.mes || "";
        const label = mesId in mesLabels
          ? mesLabels[mesId]
          : multiYear && row.mesKey
            ? `${row.mes}/${row.mesKey.slice(2, 4)}`
            : row.mes || mesId;
        return {
          ...row,
          mesId,
          mes: label,
          total: row.dividendos + row.juros + row.cupom + row.outros,
        };
      })
    : derivedPassiveIncome;

  const classeData = aggregateByClass(classe).map((item, index) => ({
    ...item,
    cor: item.cor || CORES[index % CORES.length],
  }));

  // ── Step 7: patrimônio — sort chronologically, compute total ──────────────
  // Snapshots with total = 0 are treated as empty/corrupt — fall back to the
  // live sum so a bad import doesn't zero out the hero card.
  // Patrimônio rows keep their original `mes` display label from the CSV.
  const sortedPatrimonio = [...patrimonio].sort((a, b) => {
    if (a.mesKey && b.mesKey) return a.mesKey.localeCompare(b.mesKey);
    if (a.mesKey) return -1;
    if (b.mesKey) return 1;
    return (
      MONTHS.indexOf((a.mes || "").slice(0, 3)) -
      MONTHS.indexOf((b.mes || "").slice(0, 3))
    );
  });
  const liveTotal =
    banco.reduce((sum, item) => sum + item.valor, 0) +
    classe.reduce((sum, item) => sum + item.valor, 0);
  const snapshotTotal = sortedPatrimonio.at(-1)?.total;
  const totalPatrimonio = snapshotTotal > 0 ? snapshotTotal : liveTotal;

  return {
    activeMonth,
    bancoData: banco,
    classeData,
    despesasCat,
    fluxoData,
    mesLabels,                                         // mesId → display string
    meses: meses.length ? meses : [activeMonth],       // array of mesId values
    patrimonioData: sortedPatrimonio,
    rendaPassiva: rendaPassivaFinal,
    totalPatrimonio,
  };
};

// ── deriveMonthlyKpis ─────────────────────────────────────────────────────────
// mesAtual is a mesId (YYYY-MM for new data, abbreviation for legacy).
// Lookups try row.mesId first; the row.mes fallback covers any imported
// rendaPassiva row that has not yet been enriched with mesId (e.g. from a
// cached state before this migration).

export const deriveMonthlyKpis = ({
  fluxoData,
  rendaPassiva,
  mesAtual,
  totalPatrimonio,
}) => {
  const monthlyFlow =
    fluxoData.find((row) => row.mesId === mesAtual || row.mes === mesAtual) || {};
  const rendaMes = monthlyFlow.renda || 0;
  const despesaMes = monthlyFlow.despesas || 0;
  const aporteMes = monthlyFlow.aportes || 0;
  const passivaMes =
    rendaPassiva.find(
      (row) => row.mesId === mesAtual || row.mes === mesAtual,
    )?.total || 0;
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

// ── deriveMonthExpenses ───────────────────────────────────────────────────────
// mesAtual is a mesId. despesasCat rows are keyed by mesId (from
// deriveExpenseCategories), so row[mesAtual] resolves correctly.

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
