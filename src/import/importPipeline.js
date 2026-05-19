import { parseDelimitedText } from "../parsers/csvParser.js";
import {
  detectDataset,
  mergeImportedData,
  normalizeImportedRows,
  ensureImportedDataShape,
} from "../parsers/normalizeData.js";
import { parsePdfFile } from "../parsers/pdfParser.js";
import { validateImportedData } from "./validateImportedData.js";

const parse = async (file) => {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const parsed =
    extension === "pdf"
      ? await parsePdfFile(file)
      : parseDelimitedText(await file.text());

  return {
    file: file.name,
    ...parsed,
  };
};

const detectDatasetValue = (row) =>
  row.dataset || row.arquivo || row.tipo_dado || row["tipo de dado"];

const detectDatasets = (parsedFile) => ({
  ...parsedFile,
  datasetsDetected: Array.from(
    new Set(
      parsedFile.rows.map((row) => detectDataset(detectDatasetValue(row))),
    ),
  ),
});

const normalize = (parsedFile) => normalizeImportedRows(parsedFile.rows);
const validate = (normalized) => validateImportedData(normalized.data);
const enrich = (validated) => validated.data;

const getCategorizationStats = (data) => {
  const transactions = data.transacoes || [];
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

const mergeCategorizationStats = (results) =>
  results.reduce(
    (summary, result) => {
      summary.autoCategorized += result.categorization.autoCategorized;
      summary.unmatched += result.categorization.unmatched;

      Object.entries(result.categorization.topCategories).forEach(
        ([category, total]) => {
          summary.topCategories[category] =
            (summary.topCategories[category] || 0) + total;
        },
      );

      return summary;
    },
    { autoCategorized: 0, unmatched: 0, topCategories: {} },
  );

const summarizeWarnings = (warnings) => {
  const counts = warnings.reduce((summary, warning) => {
    summary[warning.code] = (summary[warning.code] || 0) + 1;
    return summary;
  }, {});

  return Object.entries(counts)
    .map(([code, count]) => `${count} ${code}`)
    .join(", ");
};

export const createImportSummary = (results) => ({
  files: results.length,
  rowsImported: results.reduce((sum, result) => sum + result.rowsImported, 0),
  datasetsDetected: Array.from(
    new Set(results.flatMap((result) => result.datasetsDetected)),
  ),
  categorization: mergeCategorizationStats(results),
});

export const createImportLogItems = (results) =>
  results.map((result) => ({
    id: crypto.randomUUID(),
    file: result.file,
    warning: Boolean(result.warning || result.invalidRows),
    message: `${result.rowsImported} linhas importadas de ${result.rowsRead} lidas${
      result.invalidRows ? ` · ${result.invalidRows} inválidas ignoradas` : ""
    }${
      result.categorization.autoCategorized
        ? ` · ${result.categorization.autoCategorized} categorizadas automaticamente`
        : ""
    }${
      result.categorization.unmatched
        ? ` · ${result.categorization.unmatched} sem match`
        : ""
    }${result.warning ? ` · ${result.warning}` : ""}${
      result.validationSummary ? ` · ${result.validationSummary}` : ""
    }`,
  }));

export const importFile = async (file) => {
  // Explicit import pipeline: parse -> detectDataset -> normalize -> validate -> enrich.
  const parsed = await parse(file);
  const detected = detectDatasets(parsed);
  const normalized = normalize(detected);
  const validated = validate(normalized);
  const data = enrich(validated);

  return {
    file: parsed.file,
    rowsRead: parsed.rows.length,
    rowsImported: Object.values(data).reduce(
      (sum, items) => sum + items.length,
      0,
    ),
    invalidRows:
      parsed.invalidRows +
      normalized.summary.invalidRows +
      validated.invalidRows,
    datasetsDetected: normalized.summary.datasetsDetected.length
      ? normalized.summary.datasetsDetected
      : detected.datasetsDetected,
    warning: parsed.warning,
    validationWarnings: validated.warnings,
    validationSummary: summarizeWarnings(validated.warnings),
    categorization: getCategorizationStats(data),
    data,
  };
};

export const clearImportedFileRegistry = () => {
  try { localStorage.removeItem("financial-dashboard.importedFiles.v1"); } catch {}
};

export const importFiles = async (files) => {
  const results = await Promise.all(files.map(importFile));
  const data = results.reduce(
    (merged, result) => mergeImportedData(merged, result.data),
    ensureImportedDataShape(),
  );

  return {
    data,
    results,
    summary: createImportSummary(results),
    logItems: createImportLogItems(results),
  };
};
