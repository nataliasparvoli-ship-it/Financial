import { parseDelimitedText } from "../parsers/csvParser.js";
import {
  detectDataset,
  mergeImportedData,
  normalizeImportedRows,
  ensureImportedDataShape,
} from "../parsers/normalizeData.js";
import { parsePdfFile } from "../parsers/pdfParser.js";
import { extractInvestmentsFromImage } from "../parsers/imageParser.js";
import { validateImportedData } from "./validateImportedData.js";
import { createPipelineLogger } from "./pipelineLogger.js";

// ── Image detection ───────────────────────────────────────────────────────────
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const isImage = (file) => {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return IMAGE_EXTS.has(ext) || (file.type || "").startsWith("image/");
};

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

const normalize = (parsedFile, logger) =>
  normalizeImportedRows(parsedFile.rows, { logger });
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
    apiKeyMissing: Boolean(result.apiKeyMissing),
    warning: Boolean(result.warning || result.invalidRows),
    error:   Boolean(result.apiKeyMissing),
    message: result.apiKeyMissing
      ? "Chave de API necessária para importar imagens via IA."
      : `${result.rowsImported} linhas importadas de ${result.rowsRead} lidas${
          result.invalidRows ? ` · ${result.invalidRows} inválidas ignoradas` : ""
        }${
          result.categorization.autoCategorized
            ? ` · ${result.categorization.autoCategorized} categorizadas automaticamente`
            : ""
        }${
          result.categorization.unmatched
            ? ` · ${result.categorization.unmatched} sem match`
            : ""
        }${result.warning && result.warning !== "API_KEY_MISSING" ? ` · ${result.warning}` : ""}${
          result.validationSummary ? ` · ${result.validationSummary}` : ""
        }`,
  }));

// ── Image pipeline ────────────────────────────────────────────────────────────
// Images bypass the CSV parse/normalize steps — Claude Vision extracts
// structured investment data directly, which we convert to the legacy shape
// and pass straight to validateImportedData.

const imageItemsToData = (items) =>
  ensureImportedDataShape({
    classe: items.map((item) => ({
      id:    item.id,
      classe: item.tipo || "Outros",   // asset class label
      valor: item.valor,
      rawImport: {                     // preserved for ImportReviewFlow + classeToHolding
        nome:          item.nome,
        instituicao:   item.instituicao,
        confianca:     item.confianca,
        score:         item.score,
        rentabilidade: item.rentabilidade,
        data:          item.data,
        source:        "image",
      },
    })),
  });

const importImageFile = async (file) => {
  const logger = createPipelineLogger({ fileName: file.name });

  let items;
  try {
    items = await extractInvestmentsFromImage(file);
  } catch (err) {
    // Tesseract can reject with non-Error values (e.g. undefined, DOMException),
    // so normalise to a string before accessing .message.
    const msg = err instanceof Error ? err.message : (err ? String(err) : "Erro ao processar imagem");
    const isKeyMissing = msg === "API_KEY_MISSING";
    return {
      file:             file.name,
      rowsRead:         0,
      rowsImported:     0,
      invalidRows:      0,
      datasetsDetected: [],
      categorization:   { autoCategorized: 0, unmatched: 0, topCategories: {} },
      pipelineLog:      logger.getSummary(),
      data:             ensureImportedDataShape(),
      warning:          isKeyMissing ? "API_KEY_MISSING" : msg,
      apiKeyMissing:    isKeyMissing,
    };
  }

  if (!items.length) {
    return {
      file:             file.name,
      rowsRead:         0,
      rowsImported:     0,
      invalidRows:      0,
      datasetsDetected: [],
      categorization:   { autoCategorized: 0, unmatched: 0, topCategories: {} },
      pipelineLog:      logger.getSummary(),
      data:             ensureImportedDataShape(),
      warning:          "Nenhum ativo encontrado na imagem. Tente uma captura mais nítida.",
    };
  }

  const rawData   = imageItemsToData(items);
  const validated = validateImportedData(rawData);

  return {
    file:             file.name,
    rowsRead:         items.length,
    rowsImported:     validated.data.classe.length,
    invalidRows:      validated.invalidRows,
    datasetsDetected: ["classe"],
    institutionId:    undefined,
    profileName:      undefined,
    warning:          undefined,
    validationWarnings: validated.warnings,
    validationSummary:  summarizeWarnings(validated.warnings),
    categorization:   { autoCategorized: 0, unmatched: 0, topCategories: {} },
    pipelineLog:      logger.getSummary(),
    data:             validated.data,
  };
};

// ── Main file entry point ─────────────────────────────────────────────────────

export const importFile = async (file) => {
  // Route images through Vision pipeline; everything else through CSV/PDF.
  if (isImage(file)) return importImageFile(file);

  // Pipeline explícito: parse → detectDataset → normalize → validate → enrich.
  // Um logger por arquivo — rastreamento estruturado de cada etapa.
  const logger   = createPipelineLogger({ fileName: file.name });
  const parsed   = await parse(file);
  const detected = detectDatasets(parsed);
  const normalized = normalize(detected, logger);
  const validated  = validate(normalized);
  const data       = enrich(validated);

  // Warnings de validação via logger
  validated.warnings.forEach((w) => {
    logger.warn(w.message, { code: w.code, dataset: w.dataset });
  });

  const pipelineLog = logger.getSummary();

  return {
    file:             parsed.file,
    rowsRead:         parsed.rows.length,
    rowsImported:     Object.values(data).reduce((sum, items) => sum + items.length, 0),
    invalidRows:
      parsed.invalidRows +
      normalized.summary.invalidRows +
      validated.invalidRows,
    datasetsDetected: normalized.summary.datasetsDetected.length
      ? normalized.summary.datasetsDetected
      : detected.datasetsDetected,
    institutionId:    normalized.summary.institutionId,
    profileName:      normalized.summary.profileName,
    warning:          parsed.warning,
    validationWarnings: validated.warnings,
    validationSummary:  summarizeWarnings(validated.warnings),
    categorization:   getCategorizationStats(data),
    pipelineLog,
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
