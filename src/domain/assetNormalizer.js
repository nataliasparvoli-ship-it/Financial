/**
 * @fileoverview Normalização de identidade de ativos financeiros.
 *
 * PROBLEMA:
 *   "PETR4", "PETR4F", "PETR4.SA", "Petróleo Brasileiro", "Petrobras"
 *   representam o mesmo ativo mas chegam como strings distintas via
 *   OCR, CSV, importação manual e futura API.
 *
 * ESTRATÉGIA:
 *   1. Normalizar ticker → canonicalTicker (remove sufixos, uppercase)
 *   2. Resolver nome → ticker quando possível (Petrobras → PETR4)
 *   3. Normalizar label para fingerprinting (lowercase, sem ruído)
 *
 * NOTA sobre "F" (fracionário):
 *   PETR4F é tecnicamente uma unidade de negociação diferente no mercado fracionário.
 *   Para fins de PORTFÓLIO (quanto o usuário tem), PETR4 e PETR4F
 *   representam a mesma exposição econômica.
 *   Flag `mergeFragmentado=true` (padrão) → PETR4F → PETR4.
 *   Se precisar rastrear fracionário separadamente, passe `false`.
 *
 * @module domain/assetNormalizer
 */

// ── Ticker normalization ───────────────────────────────────────────────────

/**
 * Normaliza um ticker de ativo para sua forma canônica.
 *
 * Exemplos:
 *   "petr4.sa"   → "PETR4"
 *   "PETR4F"     → "PETR4"   (se mergeFragmentado=true)
 *   " vale3 "    → "VALE3"
 *   "KNRI11"     → "KNRI11"  (FII sem sufixo)
 *   "VOO"        → "VOO"     (ETF americano)
 *
 * @param {string|null|undefined} raw
 * @param {{ mergeFragmentado?: boolean }} [opts]
 * @returns {string|null}
 */
export const normalizeTicker = (raw, { mergeFragmentado = true } = {}) => {
  if (!raw || typeof raw !== "string") return null;

  let ticker = raw.trim().toUpperCase();
  if (!ticker) return null;

  ticker = ticker.replace(/\.SA$/i, "");  // "PETR4.SA" → "PETR4"

  if (mergeFragmentado) {
    // Fracionário BR: ticker de 5+ chars terminando em F, onde
    // os 4 primeiros caracteres formam um ticker válido (letra+número).
    // Não remove F de tickers internacionais tipo "BPAC11F" ou similares.
    ticker = ticker.replace(/^([A-Z]{4}\d{1,2})F$/, "$1");
  }

  return ticker || null;
};

// ── Name → ticker mapping ──────────────────────────────────────────────────

/** Mapeamento de nomes comuns → ticker canônico.
 *  Baseado nos ativos mais frequentes no contexto BR.
 *  Expansível via Sprint 2+. */
const NAME_TO_TICKER = {
  // Ações BR mais comuns
  "petróleo brasileiro": "PETR4",
  "petrobras":           "PETR4",
  "vale":                "VALE3",
  "itaú":                "ITUB4",
  "itau unibanco":       "ITUB4",
  "bradesco":            "BBDC4",
  "ambev":               "ABEV3",
  "b3":                  "B3SA3",
  "magazine luiza":      "MGLU3",
  "magalu":              "MGLU3",
  "wege":                "WEGE3",
  "weg":                 "WEGE3",
  "lojas renner":        "LREN3",
  "suzano":              "SUZB3",

  // FIIs mais comuns
  "kinea renda imobiliaria": "KNRI11",
  "xp malls":            "XPML11",
  "cshg logistica":      "HGLG11",
  "btg pactual corporativo": "BRCR11",

  // ETFs
  "bova11":              "BOVA11",
  "ivvb11":              "IVVB11",

  // Internacional
  "vanguard s&p 500":    "VOO",
  "invesco qqq":         "QQQ",
};

/**
 * Tenta resolver um nome de empresa para seu ticker mais comum.
 * Retorna null se não encontrar match.
 *
 * @param {string|null|undefined} name
 * @returns {string|null}
 */
export const resolveTickerFromName = (name) => {
  if (!name) return null;
  const normalized = name.toLowerCase().trim();

  // Match exato
  if (NAME_TO_TICKER[normalized]) return NAME_TO_TICKER[normalized];

  // Substring match (nome parcial)
  for (const [key, ticker] of Object.entries(NAME_TO_TICKER)) {
    if (normalized.includes(key)) return ticker;
  }

  return null;
};

// ── Label normalization ────────────────────────────────────────────────────

/**
 * Normaliza um label de ativo para uso em fingerprinting e deduplicação.
 * Remove ruído (whitespace extra, case, acentos comuns) sem perder identidade.
 *
 * Exemplos:
 *   "CDB  XP 12%"   → "cdb xp 12%"
 *   "PETR4.SA"      → "petr4"
 *   "  KNRI11  "    → "knri11"
 *
 * @param {string|null|undefined} raw
 * @returns {string}
 */
export const normalizeAssetLabel = (raw) => {
  if (!raw) return "";
  return String(raw)
    .toLowerCase()
    .trim()
    .replace(/\.sa$/i, "")         // remove .SA
    .replace(/\s{2,}/g, " ")      // múltiplos espaços → um
    .replace(/[^\w\s%+\-.]/g, ""); // remove chars especiais exceto % + - .
};

// ── Asset identity ────────────────────────────────────────────────────────

/**
 * Tenta extrair um ticker canônico de qualquer input (ticker bruto ou nome).
 * Usado durante import para enriquecer holdings com canonical ticker.
 *
 * @param {string|null|undefined} label   Nome ou ticker do ativo
 * @param {string|null|undefined} ticker  Ticker explícito (se disponível)
 * @returns {string|null}
 */
export const resolveCanonicalTicker = (label, ticker) => {
  if (ticker) return normalizeTicker(ticker);
  if (!label) return null;

  // Tenta tratar o próprio label como ticker
  const asTickerCandidate = normalizeTicker(label);
  if (asTickerCandidate && /^[A-Z]{4}\d{1,2}$/.test(asTickerCandidate)) {
    return asTickerCandidate; // parece um ticker BR (ex: PETR4, KNRI11)
  }

  // Tenta resolver pelo nome
  return resolveTickerFromName(label);
};
