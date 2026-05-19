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

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const createRowId = () => crypto.randomUUID();

export const detectDataset = (value) => {
  const key = normalizeKey(value);
  if (["patrimonio","evolucao_patrimonio","patrimony"].includes(key)) return "patrimonio";
  if (["classe","classes","classe_ativo","classe_de_ativo","ativos"].includes(key)) return "classe";
  if (["banco","bancos","conta","instituicao","instituicao_financeira"].includes(key)) return "banco";
  if (["renda_passiva","passiva"].includes(key)) return "rendaPassiva";
  return "transacoes";
};

const getFirst = (row, keys) => {
  for (const key of keys) {
    const value = row[normalizeKey(key)];
    if (value !== undefined && value !== "") return value;
  }
  return "";
};

// ── Robust date → month extraction ─────────────────────────────────────────
const MONTH_ABBR = { jan:0,fev:1,mar:2,abr:3,mai:4,jun:5,jul:6,ago:7,set:8,out:9,nov:10,dez:11 };

const getMonthFromDate = (value) => {
  if (!value) return "";
  const raw = String(value).trim();

  // Already a month abbreviation e.g. "Jan", "Fev/26"
  const abbr = raw.slice(0, 3).toLowerCase();
  if (MONTH_ABBR[abbr] !== undefined) return MONTHS[MONTH_ABBR[abbr]];

  // ISO: YYYY-MM-DD
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const m = parseInt(iso[2], 10) - 1;
    return MONTHS[m] ?? "";
  }

  // BR: DD/MM/YYYY or DD/MM/YY
  const br = raw.match(/^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?/);
  if (br) {
    const m = parseInt(br[2], 10) - 1;
    return MONTHS[m] ?? "";
  }

  return "";
};

// ── Map raw row columns to our transaction schema ───────────────────────────
// Handles Nubank, Itaú, Bradesco, XP, BTG, C6, Inter column names
const normalizeTransaction = (row) => {
  const data = getFirst(row, [
    "data","date","dt","data_lancamento","data lancamento",
    "data_transacao","data transacao","data_pagamento",
  ]);

  const mes =
    getFirst(row, ["mes","mês","month","competencia","competência"]) ||
    getMonthFromDate(data);

  // Amount: handle separate credit/debit columns (Itaú, Bradesco style)
  let valor = 0;
  const creditRaw = getFirst(row, ["credito","crédito","entrada","credit"]);
  const debitRaw  = getFirst(row, ["debito","débito","saida","saída","debit"]);
  const valorRaw  = getFirst(row, [
    "valor","amount","value","vlr","lancamento","lançamento",
    "mov","movimentacao","movimentação",
  ]);

  if (creditRaw || debitRaw) {
    const credit = parseCurrency(creditRaw);
    const debit  = parseCurrency(debitRaw);
    valor = credit > 0 ? credit : debit > 0 ? -debit : 0;
  } else {
    valor = parseCurrency(valorRaw);
  }

  // Nubank CARTÃO de crédito inverts sign (expenses are positive in their CSV)
  // Nubank CONTA CORRENTE does NOT invert — values already have correct sign
  // Cartão exports have a "categoria" column; conta corrente has "identificador"
  const isNubankCartao = row["categoria"] !== undefined || row["category"] !== undefined;
  const isNubankConta  = row["identificador"] !== undefined;
  if (isNubankCartao && !isNubankConta && valor > 0) valor = -valor;

  const description = getFirst(row, [
    "descricao","descrição","desc","description",
    "historico","histórico","title","memo","estabelecimento",
    "nome","lancamento","lançamento","movimento",
  ]);

  const category = getFirst(row, ["cat","categoria","category","tipo_lancamento"]);

  const tipo = getFirst(row, ["tipo","type","natureza","tipo_lancamento"]);

  const conta = getFirst(row, [
    "conta","banco","account","bank","origem","cartao","cartão",
  ]);

  const categorization = categorizeTransaction({ category, description });

  return {
    id: createRowId(),
    data,
    mes,
    cat: categorization.category,
    desc: description || "Sem descrição",
    tipo: tipo || (valor >= 0 ? "Receita" : "Despesa variável"),
    valor,
    conta: conta || "Importado",
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
  cor: getFirst(row, ["cor","color"]),
});

const addDatasetRow = (grouped, dataset, row) => {
  if (dataset === "patrimonio") {
    const mes = getFirst(row, ["mes","mês","month","periodo","período"]);
    const total = parseCurrency(getFirst(row, ["total","patrimonio","patrimônio","valor"]));
    if (!mes || !total) return false;
    grouped.patrimonio.push({ id: createRowId(), mes, total });
    return true;
  }

  if (dataset === "classe") {
    const item = normalizeSnapshot(
      row,
      ["classe","classe_ativo","classe de ativo","ativo"],
      ["valor","total"],
    );
    if (!item.label || !item.valor) return false;
    grouped.classe.push({ id: item.id, classe: item.label, valor: item.valor, cor: item.cor });
    return true;
  }

  if (dataset === "banco") {
    const item = normalizeSnapshot(
      row,
      ["banco","instituicao","instituição","conta"],
      ["valor","total","saldo"],
    );
    if (!item.label || !item.valor) return false;
    grouped.banco.push({ id: item.id, banco: item.label, valor: item.valor });
    return true;
  }

  if (dataset === "rendaPassiva") {
    const mes = getFirst(row, ["mes","mês","month"]);
    if (!mes) return false;
    grouped.rendaPassiva.push({
      id: createRowId(),
      mes,
      dividendos: parseCurrency(getFirst(row, ["dividendos","dividend"])),
      juros: parseCurrency(getFirst(row, ["juros","juros_cri_cra","juros cri cra"])),
      cupom: parseCurrency(getFirst(row, ["cupom","cupom_tesouro","cupom tesouro"])),
      outros: parseCurrency(getFirst(row, ["outros","others"])),
    });
    return true;
  }

  // Default: transacao
  const transaction = normalizeTransaction(row);
  // require at least a description and non-zero amount
  if (!transaction.desc || transaction.desc === "Sem descrição" && !transaction.valor) return false;
  if (!transaction.valor) return false;
  grouped.transacoes.push(transaction);
  return true;
};

export const ensureImportedDataShape = (value) => {
  const source = value && typeof value === "object" ? value : EMPTY_IMPORTED_DATA;
  return Object.keys(EMPTY_IMPORTED_DATA).reduce((data, key) => {
    data[key] = Array.isArray(source[key])
      ? source[key].map((row) => ({ ...row, id: row.id || createRowId() }))
      : [];
    return data;
  }, {});
};

const getCategorizationStats = (transactions) => {
  const topCategories = transactions.reduce((summary, t) => {
    summary[t.cat] = (summary[t.cat] || 0) + 1;
    return summary;
  }, {});
  return {
    autoCategorized: transactions.filter((t) => t.categorySource === "auto").length,
    unmatched: transactions.filter((t) => t.categorySource === "fallback").length,
    topCategories,
  };
};

export const normalizeImportedRows = (rows) => {
  const grouped = ensureImportedDataShape();
  const datasetsDetected = new Set();
  let invalidRows = 0;

  rows.forEach((row) => {
    const dataset = detectDataset(
      getFirst(row, ["dataset","arquivo","tipo_dado","tipo de dado"]),
    );
    datasetsDetected.add(dataset);
    if (!addDatasetRow(grouped, dataset, row)) invalidRows++;
  });

  return {
    data: grouped,
    summary: {
      rowsImported: Object.values(grouped).reduce((t, items) => t + items.length, 0),
      invalidRows,
      datasetsDetected: Array.from(datasetsDetected),
      categorization: getCategorizationStats(grouped.transacoes),
    },
  };
};

const mergeUniqueRows = (currentRows, incomingRows, getSignature) => {
  const seen = new Set(currentRows.map(getSignature));
  const uniqueIncoming = incomingRows.filter((row) => {
    const sig = getSignature(row);
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
  return [...currentRows, ...uniqueIncoming];
};

export const mergeImportedData = (current, incoming) => {
  const currentData = ensureImportedDataShape(current);
  const incomingData = ensureImportedDataShape(incoming);

  return {
    transacoes: mergeUniqueRows(
      currentData.transacoes, incomingData.transacoes,
      (r) => [r.data, r.mes, r.desc, r.valor, r.conta].join("|"),
    ),
    patrimonio: mergeUniqueRows(
      currentData.patrimonio, incomingData.patrimonio,
      (r) => [r.mes, r.total].join("|"),
    ),
    classe: mergeUniqueRows(
      currentData.classe, incomingData.classe,
      (r) => [r.classe, r.valor].join("|"),
    ),
    banco: mergeUniqueRows(
      currentData.banco, incomingData.banco,
      (r) => [r.banco, r.valor].join("|"),
    ),
    rendaPassiva: mergeUniqueRows(
      currentData.rendaPassiva, incomingData.rendaPassiva,
      (r) => [r.mes, r.dividendos, r.juros, r.cupom, r.outros].join("|"),
    ),
  };
};
