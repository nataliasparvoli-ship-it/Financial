/**
 * @fileoverview Normalização de linhas CSV para o schema interno de importação.
 *
 * RESPONSABILIDADES:
 *   • Rotear cada linha para o dataset correto (transacoes, classe, banco…)
 *   • Mapear colunas de cada instituição para campos canônicos
 *   • Aplicar convenção de sinal correta por profile
 *   • Emitir eventos estruturados via PipelineLogger
 *
 * HEURÍSTICAS ELIMINADAS (Sprint 2):
 *   ANTES: `if (row["categoria"] && !row["identificador"]) valor = -valor;`
 *   AGORA: profile.signConvention === "expenses_positive" → aplica inversão
 *   A lógica por instituição vive em institutionProfiles.js, não aqui.
 *
 * API EXTERNA (mantida para compatibilidade):
 *   normalizeImportedRows(rows, opts?)   → { data, summary }
 *   detectDataset(value)                 → DatasetType
 *   mergeImportedData(current, incoming) → merged
 *   ensureImportedDataShape(value)       → shaped
 *   EMPTY_IMPORTED_DATA
 *
 * @module parsers/normalizeData
 */

import { categorizeTransaction } from "../utils/categorizeTransaction.js";
import { parseCurrency } from "../utils/formatters.js";
import { normalizeKey } from "./csvParser.js";
import { detectProfile } from "../import/institutionDetector.js";
import { GENERIC_COLS } from "../import/institutionProfiles.js";
import { PIPELINE_WARN } from "../import/pipelineLogger.js";

// ── Constantes ────────────────────────────────────────────────────────────────

export const EMPTY_IMPORTED_DATA = {
  transacoes: [],
  patrimonio: [],
  classe:     [],
  banco:      [],
  rendaPassiva: [],
};

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const createRowId = () => crypto.randomUUID();

// ── Dataset detection ─────────────────────────────────────────────────────────

/**
 * Mapeia o valor da coluna "dataset" para o tipo canônico.
 * @param {string|undefined} value
 * @returns {"transacoes"|"patrimonio"|"classe"|"banco"|"rendaPassiva"}
 */
export const detectDataset = (value) => {
  const key = normalizeKey(value);
  if (["patrimonio","evolucao_patrimonio","patrimony"].includes(key)) return "patrimonio";
  if (["classe","classes","classe_ativo","classe_de_ativo","ativos"].includes(key)) return "classe";
  if (["banco","bancos","conta","instituicao","instituicao_financeira"].includes(key)) return "banco";
  if (["renda_passiva","passiva"].includes(key)) return "rendaPassiva";
  return "transacoes";
};

// ── Column helpers ────────────────────────────────────────────────────────────

/**
 * Retorna o primeiro valor não-vazio da linha para a lista de chaves fornecida.
 * Aplica normalizeKey em cada chave antes de acessar o objeto.
 */
const getFirst = (row, keys) => {
  for (const key of keys) {
    const value = row[normalizeKey(key)];
    if (value !== undefined && value !== "") return value;
  }
  return "";
};

/**
 * Merge de colunas: profile-specific primeiro, depois fallback genérico.
 * Remove duplicatas preservando a ordem.
 */
const mergeCols = (profileCols = [], fallbackCols = []) => {
  const seen = new Set(profileCols);
  return [...profileCols, ...fallbackCols.filter((c) => !seen.has(c))];
};

// ── Date → month extraction ───────────────────────────────────────────────────

const MONTH_ABBR = {
  jan:0, fev:1, mar:2, abr:3, mai:4, jun:5, jul:6, ago:7, set:8, out:9, nov:10, dez:11,
  feb:1, apr:3, may:4, aug:7, sep:8, oct:9, dec:11,
  ene:0, dic:11,
};

const getMonthFromDate = (value) => {
  if (!value) return "";
  const raw = String(value).trim();

  // Já é uma abreviação de mês (Jan, Fev/26…)
  const abbr = raw.slice(0, 3).toLowerCase();
  if (MONTH_ABBR[abbr] !== undefined) return MONTHS[MONTH_ABBR[abbr]];

  // ISO: YYYY-MM-DD
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return MONTHS[parseInt(iso[2], 10) - 1] ?? "";

  // BR: DD/MM/YYYY ou DD/MM/YY
  const br = raw.match(/^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?/);
  if (br) return MONTHS[parseInt(br[2], 10) - 1] ?? "";

  return "";
};

/**
 * Extracts a sortable "YYYY-MM" key from any date-like string.
 * Returns null when year cannot be determined, so legacy data falls back
 * gracefully to the old MONTHS.indexOf sort in deriveMetrics.
 */
const extractYearMonth = (value) => {
  if (!value) return null;
  const raw = String(value).trim();

  // Already "YYYY-MM"
  const isoMonth = raw.match(/^(\d{4})-(\d{2})$/);
  if (isoMonth) return raw;

  // ISO full date: YYYY-MM-DD
  const isoFull = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoFull) return `${isoFull[1]}-${isoFull[2]}`;

  // BR: DD/MM/YYYY
  const brFull = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (brFull) return `${brFull[3]}-${brFull[2].padStart(2, "0")}`;

  // BR short: DD/MM/YY
  const brShort = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/);
  if (brShort) {
    const y = parseInt(brShort[3], 10);
    return `${y < 50 ? 2000 + y : 1900 + y}-${brShort[2].padStart(2, "0")}`;
  }

  // "Jan/26" or "Jan 26" or "Jan/2026" or "Jan 2026"
  const abbr = raw.slice(0, 3).toLowerCase();
  if (MONTH_ABBR[abbr] !== undefined) {
    const rest = raw.slice(3).replace(/[^0-9]/g, "");
    if (rest.length >= 2) {
      const y = parseInt(rest, 10);
      const fullYear = rest.length <= 2 ? (y < 50 ? 2000 + y : 1900 + y) : y;
      const mm = String(MONTH_ABBR[abbr] + 1).padStart(2, "0");
      return `${fullYear}-${mm}`;
    }
  }

  return null;
};

// ── Transaction normalizer ────────────────────────────────────────────────────

/**
 * Normaliza uma linha de extrato para o schema de transação interno.
 * Aplica o sign convention do profile para resolução correta de valores.
 *
 * @param {Record<string,string>} row
 * @param {import("../import/institutionProfiles.js").InstitutionProfile} profile
 * @returns {Object}
 */
const normalizeTransaction = (row, profile) => {
  const cols = profile.columns;

  // ── Data ──────────────────────────────────────────────────────────────────
  const dateCols  = mergeCols(cols.date,  GENERIC_COLS.date);
  const monthCols = mergeCols(cols.month, GENERIC_COLS.month);

  const data = getFirst(row, dateCols);
  const mes  = getFirst(row, monthCols) || getMonthFromDate(data);

  // ── Valor — aplicado por convenção de sinal do profile ───────────────────
  let valor = 0;

  if (profile.signConvention === "debit_credit") {
    // Colunas separadas (Itaú, Bradesco): crédito = entrada (+), débito = saída (-)
    const creditCols = mergeCols(cols.credit, GENERIC_COLS.credit);
    const debitCols  = mergeCols(cols.debit,  GENERIC_COLS.debit);
    const credit = parseCurrency(getFirst(row, creditCols));
    const debit  = parseCurrency(getFirst(row, debitCols));
    valor = credit > 0 ? credit : debit > 0 ? -debit : 0;
  } else {
    // Coluna única de valor
    const amountCols = mergeCols(cols.amount, GENERIC_COLS.amount);
    valor = parseCurrency(getFirst(row, amountCols));

    if (profile.signConvention === "expenses_positive" && valor > 0) {
      // Gastos chegam como positivos (ex: Nubank Cartão) → inverter para negativo
      valor = -valor;
    }
    // "standard": mantém sinal original
  }

  // ── Demais campos ─────────────────────────────────────────────────────────
  const descCols    = mergeCols(cols.description, GENERIC_COLS.description);
  const catCols     = mergeCols(cols.category,    GENERIC_COLS.category);
  const typeCols    = mergeCols(cols.type,        GENERIC_COLS.type);
  const accountCols = mergeCols(cols.account,     GENERIC_COLS.account);

  const description = getFirst(row, descCols);
  const category    = getFirst(row, catCols);
  const tipo        = getFirst(row, typeCols);
  const conta       = getFirst(row, accountCols);

  const categorization = categorizeTransaction({ category, description });

  return {
    id: createRowId(),
    data,
    mes,
    mesKey:            extractYearMonth(data) || null,
    cat:               categorization.category,
    desc:              description || "Sem descrição",
    tipo:              tipo || (valor >= 0 ? "Receita" : "Despesa variável"),
    valor,
    conta:             conta || "Importado",
    categorySource:    categorization.source,
    categoryRuleId:    categorization.ruleId,
    normalizedMerchant: categorization.normalizedMerchant,
    categoryMatched:   categorization.matched,
  };
};

// ── Snapshot normalizer ───────────────────────────────────────────────────────

const normalizeSnapshot = (row, labelKeys, valueKeys) => ({
  id:    createRowId(),
  label: getFirst(row, labelKeys),
  valor: parseCurrency(getFirst(row, valueKeys)),
  cor:   getFirst(row, ["cor","color"]),
});

// ── Row router ────────────────────────────────────────────────────────────────

/**
 * Adiciona uma linha ao grupo correto baseado no dataset.
 * Retorna true se a linha foi aceita, false se ignorada.
 *
 * @param {typeof EMPTY_IMPORTED_DATA} grouped
 * @param {string} dataset
 * @param {Record<string,string>} row
 * @param {import("../import/institutionProfiles.js").InstitutionProfile} profile
 * @returns {boolean}
 */
const addDatasetRow = (grouped, dataset, row, profile) => {
  if (dataset === "patrimonio") {
    const mes   = getFirst(row, ["mes","mês","month","periodo","período"]);
    const total = parseCurrency(getFirst(row, ["total","patrimonio","patrimônio","valor"]));
    if (!mes || !total) return false;
    grouped.patrimonio.push({ id: createRowId(), mes, mesKey: extractYearMonth(mes) || null, total });
    return true;
  }

  if (dataset === "classe") {
    // Preferência de coluna: profile-specific primeiro, depois fallback genérico
    const labelCols = mergeCols(profile.columns?.assetClass, GENERIC_COLS.assetClass);
    const valueCols = mergeCols(profile.columns?.position,   GENERIC_COLS.position);

    const item = normalizeSnapshot(row, labelCols, valueCols);
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
      id:         createRowId(),
      mes,
      mesKey:     extractYearMonth(mes) || null,
      dividendos: parseCurrency(getFirst(row, ["dividendos","dividend"])),
      juros:      parseCurrency(getFirst(row, ["juros","juros_cri_cra","juros cri cra"])),
      cupom:      parseCurrency(getFirst(row, ["cupom","cupom_tesouro","cupom tesouro"])),
      outros:     parseCurrency(getFirst(row, ["outros","others"])),
    });
    return true;
  }

  // Default: transacao
  const transaction = normalizeTransaction(row, profile);
  if (!transaction.valor) return false;
  if (transaction.desc === "Sem descrição" && !transaction.valor) return false;
  grouped.transacoes.push(transaction);
  return true;
};

// ── Shape helpers ─────────────────────────────────────────────────────────────

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
    unmatched:       transactions.filter((t) => t.categorySource === "fallback").length,
    topCategories,
  };
};

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Normaliza um array de linhas CSV para o schema interno.
 *
 * @param {Record<string,string>[]} rows        Linhas do CSV (headers já normalizados)
 * @param {{ logger?: import("../import/pipelineLogger.js").PipelineLogger }} [opts]
 * @returns {{ data: typeof EMPTY_IMPORTED_DATA, summary: Object }}
 */
export const normalizeImportedRows = (rows, opts = {}) => {
  const { logger } = opts;
  const grouped    = ensureImportedDataShape();
  let invalidRows  = 0;
  const datasetsDetected = new Set();

  // ── Detecta profile da instituição a partir dos headers ──────────────────
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const profile = detectProfile(headers);

  logger?.institutionDetected(
    profile.id,
    profile.id !== "unknown" ? 1.0 : 0.0,
    profile.name,
  );
  logger?.parserSelected("csv", `profile:${profile.name}`);

  // ── Determina o dataset default do arquivo ───────────────────────────────
  // Profile declara o datasetDefault — substitui a antiga detectFileFormat()
  const fileDefaultDataset = profile.datasetDefault;

  logger?.datasetDetected(fileDefaultDataset, rows.length);

  // ── Processa cada linha ──────────────────────────────────────────────────
  rows.forEach((row) => {
    const rawDataset = getFirst(row, ["dataset","arquivo","tipo_dado","tipo de dado"]);
    const dataset    = rawDataset ? detectDataset(rawDataset) : fileDefaultDataset;
    datasetsDetected.add(dataset);

    if (!addDatasetRow(grouped, dataset, row, profile)) {
      invalidRows++;
    }
  });

  const validRows = Object.values(grouped).reduce((t, items) => t + items.length, 0);

  logger?.rowsParsed(rows.length, validRows, invalidRows);

  if (invalidRows > 0) {
    logger?.rowsIgnored(invalidRows, PIPELINE_WARN.SCHEMA_MISMATCH);
  }

  return {
    data: grouped,
    summary: {
      rowsImported:     validRows,
      invalidRows,
      datasetsDetected: Array.from(datasetsDetected),
      categorization:   getCategorizationStats(grouped.transacoes),
      institutionId:    profile.id,
      profileName:      profile.name,
    },
  };
};

// ── Merge (compatibilidade: importPipeline multi-arquivo) ─────────────────────

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

/**
 * Merge de dados importados de múltiplos arquivos em uma mesma sessão.
 * Usa assinaturas simples para deduplicação intra-sessão.
 * A deduplicação por fingerprint determinística acontece no WealthContext.
 */
export const mergeImportedData = (current, incoming) => {
  const currentData  = ensureImportedDataShape(current);
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
