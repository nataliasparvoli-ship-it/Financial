/**
 * @fileoverview Utilitários de data para o domínio financeiro.
 *
 * Todas as datas do domínio usam ISO 8601 (YYYY-MM-DD).
 * Funções aqui convertem de formatos legados para ISO.
 *
 * @module dateUtils
 */

/** Labels de mês em português (índice 0 = Jan) */
export const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

/** Mapa de abreviação de mês → índice 0-based */
const MONTH_ABBR_INDEX = {
  // Português
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
  // Inglês (não conflitantes)
  feb: 1, apr: 3, may: 4, aug: 7, sep: 8, oct: 9, dec: 11,
  // Espanhol (não conflitantes)
  ene: 0, dic: 11,
};

/**
 * Infere uma data ISO a partir de um label de mês como "Jan", "Fev/26" etc.
 * Quando o mês está no "futuro" em relação ao mês atual, assume o ano anterior.
 * O dia é sempre o último do mês (útil para snapshots de fim de período).
 *
 * @param {string|null|undefined} monthLabel  "Jan", "Fev", "Mar/26"
 * @returns {string}  "2026-01-31"
 */
export const inferIsoDateFromMonth = (monthLabel) => {
  if (!monthLabel) return todayIso();

  const raw = String(monthLabel).trim().toLowerCase().slice(0, 3);
  const monthIdx = MONTH_ABBR_INDEX[raw];

  if (monthIdx === undefined) return todayIso();

  const now = new Date();
  const currentMonthIdx = now.getMonth(); // 0-based
  const currentYear = now.getFullYear();

  // Se o mês do dado está no futuro em relação ao mês atual → assume ano anterior
  const year = monthIdx > currentMonthIdx ? currentYear - 1 : currentYear;

  // Último dia do mês
  const lastDay = new Date(year, monthIdx + 1, 0).getDate();
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
};

/**
 * Converte uma string de data em vários formatos para ISO 8601.
 * Suporta: YYYY-MM-DD, DD/MM/YYYY, DD/MM/YY, MM/DD/YYYY.
 * Retorna hoje se o parse falhar.
 *
 * @param {string|null|undefined} raw
 * @returns {string}  "2026-01-15"
 */
export const parseDateToISO = (raw) => {
  if (!raw) return todayIso();
  const str = String(raw).trim();

  // ISO nativo: 2026-01-15 (ou com hora)
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // BR: DD/MM/YYYY ou DD/MM/YY
  const br = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (br) {
    const [, d, m, y] = br;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Mês abreviado: "Jan/26", "Fev 2026"
  const abbr = str.match(/^([a-zA-ZÀ-ú]{3})[/\s](\d{2,4})/);
  if (abbr) {
    const monthIdx = MONTH_ABBR_INDEX[abbr[1].toLowerCase()];
    if (monthIdx !== undefined) {
      const year = abbr[2].length === 2 ? `20${abbr[2]}` : abbr[2];
      const lastDay = new Date(Number(year), monthIdx + 1, 0).getDate();
      return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    }
  }

  return todayIso();
};

/**
 * Extrai o label de mês em português de uma data ISO.
 * @param {string} isoDate  "2026-01-15"
 * @returns {string}        "Jan"
 */
export const monthLabelFromIso = (isoDate) => {
  if (!isoDate) return "Jan";
  const monthIdx = parseInt(isoDate.slice(5, 7), 10) - 1;
  return MONTH_LABELS[monthIdx] ?? "Jan";
};

/**
 * Retorna a data de hoje no formato ISO 8601.
 * @returns {string} "2026-05-23"
 */
export const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Retorna o timestamp atual em ISO 8601 completo.
 * @returns {string} "2026-05-23T14:30:00.000Z"
 */
export const nowIso = () => new Date().toISOString();
