/**
 * @fileoverview Fingerprints determinísticas para deduplicação de entidades.
 *
 * OBJETIVO:
 *   Permitir deduplicação, merge incremental e upsert sem depender de UUIDs.
 *   UUIDs são estáveis como identificadores, mas a deduplicação precisa de
 *   uma chave baseada em conteúdo — a fingerprint.
 *
 * DESIGN:
 *   - Fingerprints são prefixadas pelo tipo ("h::", "tx::", "cb::", "ss::")
 *   - Usam conteúdo normalizado (via assetNormalizer) para evitar falsos negativos
 *   - Não incluem campos que mudam frequentemente (updatedAt, ocrConfidence)
 *   - Granularidade temporal: holdings por mês, transações por dia
 *
 * QUANDO USAR:
 *   - mergeHoldings, mergeCashBalances, etc. (deduplicação em import)
 *   - Futura API sync (upsert determinístico)
 *   - Detecção de "já importei isso antes"
 *
 * QUANDO NÃO USAR:
 *   - Como ID primário (use o campo `id`)
 *   - Para detectar mudanças de valor (a fingerprint NÃO inclui valor)
 *
 * @module domain/fingerprint
 */

import { normalizeAssetLabel } from "./assetNormalizer.js";

// ── Helpers internos ───────────────────────────────────────────────────────

/** Arredonda para o mês (YYYY-MM) para tolerância de data imprecisa. */
const toMonthKey = (isoDate) => (isoDate || "").slice(0, 7);

/** Normaliza valores monetários: inteiro em centavos de BRL. */
const toCents = (brl) => Math.round((brl || 0) * 100);

// ── Fingerprints ───────────────────────────────────────────────────────────

/**
 * Fingerprint de Holding.
 * Baseada em: institutionId + normalized label + month.
 *
 * NÃO inclui value — holdings com valor atualizado no mesmo mês
 * são tratados como a mesma posição (upsert futuro).
 *
 * @param {import("./types.js").Holding} h
 * @returns {string}  ex: "h::xp::cdb xp 12%::2026-01"
 */
export const holdingFingerprint = (h) => {
  // canonicalAssetId é estável mesmo quando o ticker muda (renaming, splits).
  // Quando disponível, usá-lo garante deduplicação mais precisa do que o label bruto.
  const assetKey = h.canonicalAssetId ?? normalizeAssetLabel(h.label);
  return `h::${h.institutionId || "unknown"}::${assetKey}::${toMonthKey(h.snapshotDate)}`;
};

/**
 * Fingerprint de CashBalance.
 * Baseada em: institutionId + accountType + month.
 *
 * @param {import("./types.js").CashBalance} b
 * @returns {string}  ex: "cb::xp::checking::2026-01"
 */
export const cashBalanceFingerprint = (b) =>
  `cb::${b.institutionId || "unknown"}::${b.accountType || "checking"}::${toMonthKey(b.snapshotDate)}`;

/**
 * Fingerprint de Transaction.
 * Baseada em: date + normalized description + amount em centavos.
 * Tolerante a source/conta diferentes para a mesma movimentação.
 *
 * @param {import("./types.js").Transaction} t
 * @returns {string}  ex: "tx::2026-01-15::mercado livre::12345"
 */
export const transactionFingerprint = (t) =>
  `tx::${t.date || ""}::${normalizeAssetLabel(t.description)}::${toCents(t.amount)}`;

/**
 * Fingerprint de PortfolioSnapshot.
 * Um snapshot por data (dia ou mês — determinado por datePrecision).
 * Snapshots "auto" e "manual" usam data exata; "imported" e "migrated"
 * usam somente o mês.
 *
 * @param {import("./types.js").PortfolioSnapshot} s
 * @returns {string}  ex: "ss::2026-01-31"
 */
export const snapshotFingerprint = (s) => {
  const dateKey = s.datePrecision === "month"
    ? toMonthKey(s.date)
    : (s.date || "");
  return `ss::${dateKey}`;
};

/**
 * Fingerprint de PassiveIncomeRecord.
 * Um registro por mês (date YYYY-MM).
 *
 * @param {import("./types.js").PassiveIncomeRecord} r
 * @returns {string}  ex: "pi::2026-01"
 */
export const passiveIncomeFingerprint = (r) =>
  `pi::${toMonthKey(r.date)}`;

// ── Merge helpers baseados em fingerprint ────────────────────────────────

/**
 * Merge genérico por fingerprint.
 * Mantém existentes; adiciona apenas os incoming sem fingerprint duplicada.
 *
 * @template T
 * @param {T[]} existing
 * @param {T[]} incoming
 * @param {(item: T) => string} fpFn
 * @returns {T[]}
 */
export const mergeByFingerprint = (existing, incoming, fpFn) => {
  const seen = new Set(existing.map(fpFn));
  const unique = incoming.filter((item) => !seen.has(fpFn(item)));
  return [...existing, ...unique];
};

/**
 * Upsert genérico por fingerprint.
 * Se fingerprint já existe → substitui o item existente.
 * Se fingerprint nova → adiciona.
 * Preserva o `id` e `createdAt` do item existente para estabilidade.
 *
 * @template T
 * @param {T[]} existing
 * @param {T[]} incoming
 * @param {(item: T) => string} fpFn
 * @returns {T[]}
 */
export const upsertByFingerprint = (existing, incoming, fpFn) => {
  const incomingMap = new Map(incoming.map((item) => [fpFn(item), item]));

  const updated = existing.map((item) => {
    const fp = fpFn(item);
    if (incomingMap.has(fp)) {
      const newItem = incomingMap.get(fp);
      incomingMap.delete(fp);
      // Preserva id e createdAt do item original
      return { ...newItem, id: item.id, createdAt: item.createdAt };
    }
    return item;
  });

  // Adiciona os incoming que não existiam
  return [...updated, ...incomingMap.values()];
};
