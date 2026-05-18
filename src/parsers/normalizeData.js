import { categorizeTransaction } from "../utils/categorizeTransaction.js";
import { parseCurrency } from "../utils/formatters.js";
import { normalizeKey } from "./csvParser.js";

export const EMPTY_IMPORTED_DATA = {
  transacoes: [],
  patrimonio: [],
  classe: [],
  banco: [],
  rendaPassiva: [],
};

const MONTHS = [
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

const createRowId = () => crypto.randomUUID();

export const detectDataset = (value) => {
  const key = normalizeKey(value);
  if (["patrimonio", "evolucao_patrimonio", "patrimony"].includes(key))
    return "patrimonio";
  if (
    ["classe", "classes", "classe_ativo", "classe_de_ativo", "ativos"].includes(
      key,
    )
  )
    return "classe";
  if (
    [
      "banco",
      "bancos",
      "conta",
      "instituicao",
      "instituicao_financeira",
    ].includes(key)
  )
    return "banco";
  if (["renda_passiva", "passiva"].includes(key)) return "rendaPassiva";
  return "transacoes";
};

const getFirst = (row, keys) => {
  for (const key of keys) {
    const value = row[normalizeKey(key)];
    if (value !== undefined && value !== "") return value;
  }
  return "";
};

const getMonthFromDate = (value) => {
  const raw = String(value || "").trim();
  const dateMatch = raw.match(
    /(?:^|\D)(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/,
  );
  if (!dateMatch) return "";

  const monthIndex = Number(dateMatch[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return "";

  return MONTHS[monthIndex];
};

const normalizeTransaction = (row) => {
  const data = getFirst(row, ["data", "date", "dt"]);
  const mes = getFirst(row, ["mes", "mês", "month"]) || getMonthFromDate(data);
  const valor = parseCurrency(
    getFirst(row, ["valor", "amount", "value", "vlr"]),
  );
  const tipo = getFirst(row, ["tipo", "type", "natureza"]);
  const description = getFirst(row, [
    "desc",
    "descricao",
    "descrição",
    "description",
    "historico",
    "histórico",
  ]);
  const category = getFirst(row, ["cat", "categoria", "category"]);
  const categorization = categorizeTransaction({ category, description });

  return {
    id: createRowId(),
    data,
    mes,
    cat: categorization.category,
    desc: description || "Sem descrição",
    tipo: tipo || (valor >= 0 ? "Receita" : "Despesa"),
    valor,
    conta: getFirst(row, ["conta", "banco", "account", "bank"]) || "Sem conta",
    categorySource: categorization.source,
    categoryRuleId: categorization.ruleId,
    normalizedMerchant: categorization.normalizedMerchant,
    categoryMatched: categorization.matched,
  };
};

const normalizeSnapshot = (row, labelKeys, valueKeys) => ({
  id: createRowId(),
  label: getFirst(row, labelKeys),
  valor: parseCurrency(getFirst(row, valueKeys)),
  cor: getFirst(row, ["cor", "color"]),
});

const addDatasetRow = (grouped, dataset, row) => {
  if (dataset === "patrimonio") {
    const mes = getFirst(row, ["mes", "mês", "month", "periodo", "período"]);
    const total = parseCurrency(
      getFirst(row, ["total", "patrimonio", "patrimônio", "valor"]),
    );
    if (!mes || !total) return false;
    grouped.patrimonio.push({ id: createRowId(), mes, total });
    return true;
  }

  if (dataset === "classe") {
    const item = normalizeSnapshot(
      row,
      ["classe", "classe_ativo", "classe de ativo", "ativo"],
      ["valor", "total"],
    );
    if (!item.label || !item.valor) return false;
    grouped.classe.push({
      id: item.id,
      classe: item.label,
      valor: item.valor,
      cor: item.cor,
    });
    return true;
  }

  if (dataset === "banco") {
    const item = normalizeSnapshot(
      row,
      ["banco", "instituicao", "instituição", "conta"],
      ["valor", "total", "saldo"],
    );
    if (!item.label || !item.valor) return false;
    grouped.banco.push({ id: item.id, banco: item.label, valor: item.valor });
    return true;
  }

  if (dataset === "rendaPassiva") {
    const mes = getFirst(row, ["mes", "mês", "month"]);
    if (!mes) return false;
    grouped.rendaPassiva.push({
      id: createRowId(),
      mes,
      dividendos: parseCurrency(getFirst(row, ["dividendos", "dividend"])),
      juros: parseCurrency(
        getFirst(row, ["juros", "juros_cri_cra", "juros cri cra"]),
      ),
      cupom: parseCurrency(
        getFirst(row, ["cupom", "cupom_tesouro", "cupom tesouro"]),
      ),
      outros: parseCurrency(getFirst(row, ["outros", "others"])),
    });
    return true;
  }

  const transaction = normalizeTransaction(row);
  if (!transaction.mes || !transaction.valor) return false;
  grouped.transacoes.push(transaction);
  return true;
};

export const ensureImportedDataShape = (value) => {
  const source =
    value && typeof value === "object" ? value : EMPTY_IMPORTED_DATA;

  return Object.keys(EMPTY_IMPORTED_DATA).reduce((data, key) => {
    data[key] = Array.isArray(source[key])
      ? source[key].map((row) => ({ ...row, id: row.id || createRowId() }))
      : [];
    return data;
  }, {});
};

const getCategorizationStats = (transactions) => {
  const topCategories = transactions.reduce((summary, transaction) => {
    summary[transaction.cat] = (summary[transaction.cat] || 0) + 1;
    return summary;
  }, {});

  return {
    autoCategorized: transactions.filter(
      (transaction) => transaction.categorySource === "auto",
    ).length,
    unmatched: transactions.filter(
      (transaction) => transaction.categorySource === "fallback",
    ).length,
    topCategories,
  };
};

export const normalizeImportedRows = (rows) => {
  const grouped = ensureImportedDataShape();
  const datasetsDetected = new Set();
  let invalidRows = 0;

  rows.forEach((row) => {
    const dataset = detectDataset(
      getFirst(row, ["dataset", "arquivo", "tipo_dado", "tipo de dado"]),
    );
    datasetsDetected.add(dataset);

    if (!addDatasetRow(grouped, dataset, row)) {
      invalidRows += 1;
    }
  });

  return {
    data: grouped,
    summary: {
      rowsImported: Object.values(grouped).reduce(
        (total, items) => total + items.length,
        0,
      ),
      invalidRows,
      datasetsDetected: Array.from(datasetsDetected),
      categorization: getCategorizationStats(grouped.transacoes),
    },
  };
};

const mergeUniqueRows = (currentRows, incomingRows, getSignature) => {
  const seen = new Set(currentRows.map(getSignature));
  const uniqueIncoming = incomingRows.filter((row) => {
    const signature = getSignature(row);
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });

  return [...currentRows, ...uniqueIncoming];
};

export const mergeImportedData = (current, incoming) => {
  const currentData = ensureImportedDataShape(current);
  const incomingData = ensureImportedDataShape(incoming);

  return {
    transacoes: mergeUniqueRows(
      currentData.transacoes,
      incomingData.transacoes,
      (row) => [row.data, row.mes, row.desc, row.valor, row.conta].join("|"),
    ),
    patrimonio: mergeUniqueRows(
      currentData.patrimonio,
      incomingData.patrimonio,
      (row) => [row.mes, row.total].join("|"),
    ),
    classe: mergeUniqueRows(currentData.classe, incomingData.classe, (row) =>
      [row.classe, row.valor].join("|"),
    ),
    banco: mergeUniqueRows(currentData.banco, incomingData.banco, (row) =>
      [row.banco, row.valor].join("|"),
    ),
    rendaPassiva: mergeUniqueRows(
      currentData.rendaPassiva,
      incomingData.rendaPassiva,
      (row) =>
        [row.mes, row.dividendos, row.juros, row.cupom, row.outros].join("|"),
    ),
  };
};
