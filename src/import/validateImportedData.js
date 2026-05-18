import { ensureImportedDataShape } from "../parsers/normalizeData.js";

const VALID_DATASETS = [
  "transacoes",
  "patrimonio",
  "classe",
  "banco",
  "rendaPassiva",
];
const MONTH_PATTERN =
  /^(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)(\/\d{2,4})?$/;
const DATE_PATTERN = /^$|^\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?$/;

const isFiniteNumber = (value) => Number.isFinite(Number(value));
const hasValidDate = (value) => {
  const raw = String(value || "");
  if (!DATE_PATTERN.test(raw)) return false;
  if (!raw) return true;

  const [, day, month, year = "2026"] =
    raw.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/) || [];
  if (!day || !month) return false;

  const fullYear = Number(year.length === 2 ? `20${year}` : year);
  const parsed = new Date(fullYear, Number(month) - 1, Number(day));

  return (
    parsed.getFullYear() === fullYear &&
    parsed.getMonth() === Number(month) - 1 &&
    parsed.getDate() === Number(day)
  );
};

const createWarning = (code, message, dataset) => ({ code, message, dataset });

const rowSignature = (dataset, row) => {
  if (dataset === "transacoes") {
    return [row.data, row.mes, row.desc, row.valor, row.conta].join("|");
  }

  if (dataset === "patrimonio") return [row.mes, row.total].join("|");
  if (dataset === "classe") return [row.classe, row.valor].join("|");
  if (dataset === "banco") return [row.banco, row.valor].join("|");
  if (dataset === "rendaPassiva") {
    return [row.mes, row.dividendos, row.juros, row.cupom, row.outros].join(
      "|",
    );
  }

  return JSON.stringify(row);
};

const validateRow = (dataset, row) => {
  if (!row || typeof row !== "object") {
    return createWarning("empty_row", "Linha vazia ignorada.", dataset);
  }

  if (dataset === "transacoes") {
    if (!row.mes || !MONTH_PATTERN.test(row.mes)) {
      return createWarning(
        "invalid_month",
        "Transação com mês inválido ignorada.",
        dataset,
      );
    }
    if (!hasValidDate(row.data || "")) {
      return createWarning(
        "invalid_date",
        "Transação com data inválida ignorada.",
        dataset,
      );
    }
    if (!row.desc || !row.tipo || !row.conta || !row.cat) {
      return createWarning(
        "missing_fields",
        "Transação com campos vazios ignorada.",
        dataset,
      );
    }
    if (!isFiniteNumber(row.valor) || Number(row.valor) === 0) {
      return createWarning(
        "invalid_amount",
        "Transação com valor inválido ignorada.",
        dataset,
      );
    }
  }

  if (dataset === "patrimonio") {
    if (!row.mes || !isFiniteNumber(row.total) || Number(row.total) === 0) {
      return createWarning(
        "invalid_patrimonio",
        "Ponto de patrimônio inválido ignorado.",
        dataset,
      );
    }
  }

  if (dataset === "classe") {
    if (!row.classe || !isFiniteNumber(row.valor) || Number(row.valor) === 0) {
      return createWarning(
        "invalid_asset_class",
        "Classe de ativo inválida ignorada.",
        dataset,
      );
    }
  }

  if (dataset === "banco") {
    if (!row.banco || !isFiniteNumber(row.valor) || Number(row.valor) === 0) {
      return createWarning(
        "invalid_bank",
        "Banco/saldo inválido ignorado.",
        dataset,
      );
    }
  }

  if (dataset === "rendaPassiva") {
    if (!row.mes || !MONTH_PATTERN.test(row.mes)) {
      return createWarning(
        "invalid_passive_income",
        "Renda passiva com mês inválido ignorada.",
        dataset,
      );
    }
    if (
      ![row.dividendos, row.juros, row.cupom, row.outros].every(isFiniteNumber)
    ) {
      return createWarning(
        "invalid_passive_income",
        "Renda passiva com valores inválidos ignorada.",
        dataset,
      );
    }
  }

  return null;
};

/**
 * @param {import("../types/financial.js").ImportedFinancialData} data
 */
export const validateImportedData = (data) => {
  const shaped = ensureImportedDataShape(data);
  const seen = new Set();
  const warnings = [];

  const validData = VALID_DATASETS.reduce((result, dataset) => {
    result[dataset] = [];

    shaped[dataset].forEach((row) => {
      const warning = validateRow(dataset, row);
      if (warning) {
        warnings.push(warning);
        return;
      }

      const signature = `${dataset}|${rowSignature(dataset, row)}`;
      if (seen.has(signature)) {
        warnings.push(
          createWarning("duplicate_row", "Linha duplicada ignorada.", dataset),
        );
        return;
      }

      seen.add(signature);
      result[dataset].push(row);
    });

    return result;
  }, {});

  return {
    data: validData,
    warnings,
    invalidRows: warnings.length,
  };
};
