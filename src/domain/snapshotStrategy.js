/**
 * @fileoverview Estratégia de ciclo de vida de PortfolioSnapshots.
 *
 * SEPARAÇÃO DE TIPOS:
 *
 *   "auto"     Gerado automaticamente quando o usuário adiciona/remove holdings.
 *              Máximo um por dia de calendário. Pode ser sobrescrito no mesmo dia.
 *              Sobrescrito por snapshots de prioridade maior.
 *
 *   "imported" Gerado ao importar linhas de patrimônio[] de um CSV.
 *              datePrecision: "month" (data aproximada).
 *              Sobrescrito por "manual", nunca por "auto" ou "derived".
 *
 *   "manual"   Usuário salvou explicitamente o estado atual como snapshot.
 *              Prioridade máxima. NUNCA sobrescrito automaticamente.
 *
 *   "derived"  Calculado on-the-fly para exibição em gráficos.
 *              Nunca persistido no store.
 *
 *   "migrated" Criado durante a migração v1→v2. Tratado como "imported".
 *
 * POLÍTICA DE OVERWRITE (prioridade numérica — maior vence):
 *
 *   manual   = 3
 *   imported = 2
 *   migrated = 2   (igual a imported)
 *   auto     = 1
 *   derived  = 0   (nunca persiste)
 *
 * Mesma data + prioridade igual → substitui (portfolio evoluiu no dia).
 * Mesma data + prioridade menor → ignora (não degrada dados mais ricos).
 * Mesma data + prioridade maior → substitui (dado mais confiável disponível).
 *
 * GRANULARIDADE TEMPORAL:
 *   "auto" e "manual" → YYYY-MM-DD (dia exato)
 *   "imported" e "migrated" → último dia do mês (YYYY-MM-LD)
 *
 * RETENÇÃO (futuro — Sprint 5+):
 *   "manual"   → forever
 *   "imported" → forever (sparse — um por evento de import)
 *   "auto"     → últimos 365 dias diários; comprimir para mensal os mais antigos
 *   "derived"  → nunca armazenado
 *
 * @module domain/snapshotStrategy
 */

/** @type {Record<import("./types.js").DataSource, number>} */
export const SNAPSHOT_SOURCE_PRIORITY = {
  manual:   3,
  imported: 2,
  migrated: 2,
  auto:     1,
  sync:     1,
  derived:  0,
};

/**
 * Determina se um snapshot incoming deve sobrescrever o existente.
 * Regra: prioridade maior OU igual → sobrescreve.
 *
 * @param {import("./types.js").PortfolioSnapshot} existing
 * @param {import("./types.js").PortfolioSnapshot} incoming
 * @returns {boolean}
 */
export const shouldOverwriteSnapshot = (existing, incoming) => {
  const existP = SNAPSHOT_SOURCE_PRIORITY[existing.source] ?? 0;
  const newP   = SNAPSHOT_SOURCE_PRIORITY[incoming.source] ?? 0;
  return newP >= existP;
};

/**
 * Aplica upsert de um snapshot seguindo a política de prioridade.
 * Preserva `id` e `createdAt` do snapshot existente para estabilidade.
 *
 * @param {import("./types.js").PortfolioSnapshot[]} snapshots  Array atual
 * @param {import("./types.js").PortfolioSnapshot}  incoming    Novo snapshot
 * @returns {import("./types.js").PortfolioSnapshot[]}
 */
export const upsertSnapshot = (snapshots, incoming) => {
  const existingIdx = snapshots.findIndex((s) => s.date === incoming.date);

  if (existingIdx === -1) {
    return [...snapshots, incoming];
  }

  const existing = snapshots[existingIdx];

  if (!shouldOverwriteSnapshot(existing, incoming)) {
    return snapshots; // mantém o existente de maior prioridade
  }

  // Sobrescreve preservando id e createdAt
  const updated = {
    ...incoming,
    id: existing.id,
    createdAt: existing.createdAt,
  };

  return [
    ...snapshots.slice(0, existingIdx),
    updated,
    ...snapshots.slice(existingIdx + 1),
  ];
};

/**
 * Merge de múltiplos snapshots seguindo a política de prioridade.
 * Equivalente a aplicar upsertSnapshot para cada item do array incoming.
 *
 * @param {import("./types.js").PortfolioSnapshot[]} existing
 * @param {import("./types.js").PortfolioSnapshot[]} incoming
 * @returns {import("./types.js").PortfolioSnapshot[]}
 */
export const mergeSnapshots = (existing, incoming) =>
  incoming.reduce(upsertSnapshot, existing);

/**
 * Verifica se deve gerar um snapshot "auto" para hoje.
 * Não gera se já existe um snapshot de maior prioridade para hoje.
 *
 * @param {import("./types.js").PortfolioSnapshot[]} snapshots
 * @param {string} todayIso  "2026-05-23"
 * @returns {boolean}
 */
export const shouldGenerateAutoSnapshot = (snapshots, todayIso) => {
  const existing = snapshots.find((s) => s.date === todayIso);
  if (!existing) return true;
  return SNAPSHOT_SOURCE_PRIORITY[existing.source] < SNAPSHOT_SOURCE_PRIORITY.auto;
};
