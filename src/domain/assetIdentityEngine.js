/**
 * @fileoverview Motor de resolução de identidade de ativos financeiros.
 *
 * PIPELINE DE RESOLUÇÃO (ordem de prioridade):
 *
 *   1. exact_ticker  → normalizeTicker(raw)  → REGISTRY_BY_TICKER  (confidence 1.0)
 *   2. isin          → ISIN pattern match    → REGISTRY_BY_ISIN    (confidence 1.0)
 *   3. alias         → normalizeAssetLabel() → REGISTRY_BY_ALIAS   (confidence 0.90)
 *   4. name_match    → substring scan        → ASSET_REGISTRY[]    (confidence 0.75)
 *   5. null          → não encontrado no registry
 *
 * PUREZA:
 *   resolveAssetIdentity é uma função pura — mesma entrada → mesma saída.
 *   Não depende de rede, estado externo ou efeitos colaterais.
 *   Pode ser chamada N vezes com a mesma entrada com resultado idêntico garantido.
 *
 * EXEMPLOS:
 *   resolveAssetIdentity("PETR4F")
 *   → { canonicalId: "br:PETR4", matchType: "exact_ticker", confidence: 1.0, ... }
 *
 *   resolveAssetIdentity("BRPETRACNPR6")
 *   → { canonicalId: "br:PETR4", matchType: "isin", confidence: 1.0, ... }
 *
 *   resolveAssetIdentity("Petrobras PN")
 *   → { canonicalId: "br:PETR4", matchType: "alias", confidence: 0.90, ... }
 *
 *   resolveAssetIdentity("Petróleo Brasileiro")
 *   → { canonicalId: "br:PETR4", matchType: "name_match", confidence: 0.75, ... }
 *
 *   resolveAssetIdentity("algo desconhecido")
 *   → null
 *
 * @module domain/assetIdentityEngine
 */

import {
  ASSET_REGISTRY,
  REGISTRY_BY_ISIN,
  REGISTRY_BY_TICKER,
} from "./assetIdentity.js";
import { normalizeTicker, normalizeAssetLabel } from "./assetNormalizer.js";

// ── Tipos ─────────────────────────────────────────────────────────────────────

/**
 * Resultado da resolução de identidade de um ativo.
 *
 * confidence por matchType:
 *   exact_ticker → 1.0   (ticker normalizado match exato no registry)
 *   isin         → 1.0   (ISIN é identificador internacional estável)
 *   alias        → 0.90  (alias registrado normalizado, muito confiável)
 *   name_match   → 0.75  (substring de nome, requer revisão humana)
 *
 * @typedef {Object} AssetResolution
 * @property {string}       canonicalId   ID canônico estável. Ex: "br:PETR4", "us:VOO"
 * @property {string}       ticker        Ticker normalizado do ativo
 * @property {string}       name          Nome oficial completo
 * @property {import("./assetIdentity.js").AssetIdentity} asset  Registro completo
 * @property {number}       confidence    0-1 — qualidade do match
 * @property {"exact_ticker"|"isin"|"alias"|"name_match"} matchType  Como o match ocorreu
 */

// ── Lookup pré-computado: alias normalizado → asset ───────────────────────────
//
// Construído uma única vez no load do módulo (O(n)).
// Todas as consultas subsequentes são O(1).
//
// Estratégia de conflito: primeiro a registrar vence.
// A posição no ASSET_REGISTRY define a prioridade implícita.
// Aliases mais específicos (ex: PETR4F → PETR4) têm precedência
// por aparecerem antes no array de aliases do ativo.

/** @type {Map<string, import("./assetIdentity.js").AssetIdentity>} */
const REGISTRY_BY_ALIAS = new Map();

for (const asset of ASSET_REGISTRY) {
  // Indexa aliases explícitos
  for (const alias of asset.aliases) {
    const key = normalizeAssetLabel(alias);
    if (key && !REGISTRY_BY_ALIAS.has(key)) {
      REGISTRY_BY_ALIAS.set(key, asset);
    }
  }

  // Indexa nome oficial completo para match exato em step 3
  const normalizedName = normalizeAssetLabel(asset.name);
  if (normalizedName && !REGISTRY_BY_ALIAS.has(normalizedName)) {
    REGISTRY_BY_ALIAS.set(normalizedName, asset);
  }
}

// ── ISIN pattern ──────────────────────────────────────────────────────────────

/** ISIN: 2 letras (country code) + 9 alfanuméricos + 1 dígito de verificação = 12 chars. */
const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

// ── Helpers internos ──────────────────────────────────────────────────────────

/**
 * @param {import("./assetIdentity.js").AssetIdentity} asset
 * @param {"exact_ticker"|"isin"|"alias"|"name_match"} matchType
 * @param {number} confidence
 * @returns {AssetResolution}
 */
const toResolution = (asset, matchType, confidence) => ({
  canonicalId: asset.canonicalId,
  ticker:      asset.ticker,
  name:        asset.name,
  asset,
  confidence,
  matchType,
});

// ── Resolução principal ───────────────────────────────────────────────────────

/**
 * Resolve a identidade canônica de um ativo a partir de qualquer representação
 * bruta: ticker, alias histórico, nome parcial, ISIN ou variante com ruído de OCR.
 *
 * Nunca lança exceção — inputs inválidos retornam null.
 * Função pura: sem efeitos colaterais, sem estado mutável.
 *
 * @param {string|null|undefined} raw  Label ou ticker bruto (ex: "PETR4F", "Petrobras", ISIN)
 * @returns {AssetResolution|null}     null se não encontrado no registry
 */
export const resolveAssetIdentity = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // ── Passo 1: exact ticker ─────────────────────────────────────────────────
  // normalizeTicker: remove .SA, fracionário F, uppercase. Ex: "petr4.sa" → "PETR4".
  const normalizedTicker = normalizeTicker(trimmed);
  if (normalizedTicker) {
    const asset = REGISTRY_BY_TICKER.get(normalizedTicker.toLowerCase());
    if (asset) return toResolution(asset, "exact_ticker", 1.0);
  }

  // ── Passo 2: ISIN ─────────────────────────────────────────────────────────
  // ISIN é o identificador mais estável — não muda com splits, rebranding ou
  // alterações de ticker. Confiança 1.0 equivalente ao exact ticker.
  const upper = trimmed.toUpperCase();
  if (ISIN_PATTERN.test(upper)) {
    const asset = REGISTRY_BY_ISIN.get(upper);
    if (asset) return toResolution(asset, "isin", 1.0);
  }

  // ── Passo 3: alias exact match ────────────────────────────────────────────
  // normalizeAssetLabel: lowercase, colapsa espaços, remove .SA e chars especiais.
  // Inclui aliases explícitos + nome oficial completo do ativo.
  const normalizedLabel = normalizeAssetLabel(trimmed);
  if (normalizedLabel) {
    const asset = REGISTRY_BY_ALIAS.get(normalizedLabel);
    if (asset) return toResolution(asset, "alias", 0.90);
  }

  // ── Passo 4: name substring match ─────────────────────────────────────────
  // Fallback para nomes parciais (ex: "Petróleo" → PETR4, "Kinea" → KNRI11).
  // Guard mínimo de 4 chars para reduzir falsos positivos em strings curtas.
  if (normalizedLabel.length >= 4) {
    for (const asset of ASSET_REGISTRY) {
      const assetNormalizedName = normalizeAssetLabel(asset.name);
      if (
        assetNormalizedName.includes(normalizedLabel) ||
        normalizedLabel.includes(assetNormalizedName)
      ) {
        return toResolution(asset, "name_match", 0.75);
      }
    }
  }

  // Não encontrado no registry — não é um ativo negociável conhecido.
  return null;
};

// ── Confidence computation ────────────────────────────────────────────────────

/**
 * Pesos canônicos do ConfidenceBreakdown.
 * Source-of-truth para todos os enrichers que produzem ConfidenceBreakdown.
 *
 * ocr:          0.40 — qualidade do extrator (quando sourceType="ocr")
 * institution:  0.20 — qualidade do institutionEnricher
 * assetIdentity: 0.25 — qualidade da resolução de ativo (resolveAssetIdentity)
 * category:     0.15 — qualidade da categorização automática
 *
 * Soma total = 1.0. Fontes ausentes têm peso redistribuído entre as presentes.
 */
export const CONFIDENCE_WEIGHTS = Object.freeze({
  ocr:           0.40,
  institution:   0.20,
  assetIdentity: 0.25,
  category:      0.15,
});

/**
 * Computa o overall confidence score a partir de um ConfidenceBreakdown composto.
 *
 * Fontes ausentes (undefined) têm seu peso redistribuído proporcionalmente
 * entre as fontes presentes — o resultado reflete apenas o que foi observado.
 *
 * Exemplos:
 *   { institution: 0.9, assetIdentity: 0.8, category: 0.7 }
 *   → pesos presentes: inst=0.20, asset=0.25, cat=0.15 → total=0.60
 *   → normalizados: inst≈0.33, asset≈0.42, cat≈0.25
 *   → overall ≈ 0.81
 *
 *   { ocr: 0.6, assetIdentity: 0.9 }
 *   → pesos presentes: ocr=0.40, asset=0.25 → total=0.65
 *   → normalizados: ocr≈0.62, asset≈0.38
 *   → overall ≈ 0.71
 *
 *   {}  → 0
 *
 * @param {import("../ingestion/models/ingestionTypes.js").ConfidenceBreakdown} breakdown
 * @returns {number}  0-1, arredondado para 2 casas decimais
 */
export const computeOverallConfidence = (breakdown) => {
  const entries = /** @type {[string, number][]} */ (
    Object.entries(CONFIDENCE_WEIGHTS).filter(([key]) => breakdown[key] !== undefined)
  );

  if (entries.length === 0) return 0;

  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);

  const weightedSum = entries.reduce((sum, [key, w]) => {
    return sum + (/** @type {number} */ (breakdown[key]) * (w / totalWeight));
  }, 0);

  return Math.round(weightedSum * 100) / 100;
};
