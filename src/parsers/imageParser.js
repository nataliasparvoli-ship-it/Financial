/**
 * @fileoverview OCR de screenshots financeiros via Tesseract.js.
 *
 * 100% gratuito, roda no browser, sem chave de API, sem envio de dados.
 * Tesseract baixa os arquivos de idioma (~3MB) do CDN na primeira execução
 * e os mantém em cache. Chamadas subsequentes são instantâneas.
 */

import Tesseract from "tesseract.js";

// ── Confidence score mapping ──────────────────────────────────────────────────
export const CONF_SCORE = { alta: 0.85, media: 0.65, baixa: 0.40 };

export const getImageFingerprint = (file) =>
  `img::${file.name}::${file.size}::${file.lastModified}`;

// ── Asset type keyword map ────────────────────────────────────────────────────
// Maps OCR'd text patterns → our legacy "tipo" labels.

const TIPO_MAP = [
  { tipo: "Renda Fixa",     kws: ["renda fixa","cdb","lci","lca","rdb","cri","cra","debenture","debênture","prefixado","ipca+","cdi+","poupança"] },
  { tipo: "Tesouro",        kws: ["tesouro","lft","ntn-b","ntnb","ntn-f","ntnf","ltn","tesouro selic","tesouro ipca","tesouro prefixado"] },
  { tipo: "FII",            kws: ["fii","fundo imobiliário","fundos imobiliários","fiis","hglg","knri","xplg","mxrf","rect","mall","bcff","irdm"] },
  { tipo: "Ações",          kws: ["ações","acoes","ação","acao","ativo","petr4","vale3","itub4","bbdc4","wege3","b3sa3","rdor3","rent3"] },
  { tipo: "Renda Variável", kws: ["renda variável","renda variavel","bdr","etf","ivvb","bova","small"] },
  { tipo: "Cripto",         kws: ["cripto","bitcoin","btc","ethereum","eth","bnb","usdt","solana"] },
  { tipo: "Previdência",    kws: ["previdência","previdencia","pgbl","vgbl"] },
  { tipo: "Fundos",         kws: ["fundo","fundos","ficfi","fim","fic","multimercado"] },
];

const detectTipo = (text) => {
  const lower = text.toLowerCase();
  for (const { tipo, kws } of TIPO_MAP) {
    if (kws.some((kw) => lower.includes(kw))) return tipo;
  }
  return "Outros";
};

// ── Institution keyword map ───────────────────────────────────────────────────

const INST_KEYWORDS = [
  "nubank","nuinvest","xp","btg","itaú","itau","bradesco","santander",
  "inter","rico","clear","warren","órama","orama","modal","genial",
  "avenue","nomad","c6","safra",
];

const detectInstituicao = (text) => {
  const lower = text.toLowerCase();
  return INST_KEYWORDS.find((kw) => lower.includes(kw)) ?? null;
};

// ── BRL value parser ──────────────────────────────────────────────────────────
// Handles: "R$ 1.234,56"  "1.234,56"  "1234.56"  "1,234.56"

const parseBRL = (str) => {
  if (!str) return 0;
  // Remove currency symbol and whitespace
  let s = str.replace(/R\$\s*/gi, "").trim();
  // BR format: "1.234,56" → "1234.56"
  if (/\d{1,3}(\.\d{3})*(,\d{2})$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // US format or plain: just remove commas-as-thousands
    s = s.replace(/,(\d{3})/g, "$1");
  }
  const v = parseFloat(s);
  return isFinite(v) ? v : 0;
};

// ── Line-level parser ─────────────────────────────────────────────────────────
// Each non-empty line from OCR is inspected for a label + a BRL value.
// Lines that look like headers or totals are skipped.

const SKIP_PATTERNS = [
  /^total/i, /^patrimônio/i, /^saldo/i, /^carteira/i,
  /^posição/i, /^posicao/i, /^\d+\s*$/,
];

const BRL_LINE = /R?\$?\s*([\d.,]+)/;

const parseLines = (rawText) => {
  const items = [];
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (SKIP_PATTERNS.some((p) => p.test(line))) continue;

    const match = line.match(BRL_LINE);
    if (!match) continue;

    const valueStr = match[1];
    const value    = parseBRL(valueStr);
    if (!value || value < 1) continue; // skip tiny/zero amounts

    // Label = everything before the matched value token
    const label = line.slice(0, match.index).replace(/[-–:]\s*$/, "").trim();
    if (!label) continue;

    const tipo = detectTipo(label);
    const inst = detectInstituicao(line);

    // Confidence: high if value >= 100 and label >= 4 chars, else medium
    const confianca = (value >= 100 && label.length >= 4) ? "media" : "baixa";

    items.push({
      id:           `ocr_${Date.now()}_${items.length}`,
      instituicao:  inst ? inst.charAt(0).toUpperCase() + inst.slice(1) : "Desconhecido",
      nome:         label,
      tipo,
      valor:        value,
      data:         null,
      rentabilidade: null,
      confianca,
      score:        CONF_SCORE[confianca],
      source:       "ocr",
    });
  }

  return items;
};

// ── Main export ───────────────────────────────────────────────────────────────

export const extractInvestmentsFromImage = async (file) => {
  // workerPath points to the local copy in /public — avoids cross-origin Worker
  // restrictions that block CDN-hosted workers in production (Vercel, etc.).
  // corePath uses CDN: it's fetched from *inside* the worker, not the main
  // thread, so cross-origin loading works fine there.
  // langPath is omitted so Tesseract uses per-language CDN defaults.
  const { data: { text } } = await Tesseract.recognize(
    file,
    "por+eng",
    {
      workerPath:    "/tesseract-worker.min.js",
      corePath:      "https://cdn.jsdelivr.net/npm/tesseract.js-core@7",
      workerBlobURL: false,
      logger: () => {},
    },
  );

  if (!text?.trim()) return [];
  return parseLines(text);
};
