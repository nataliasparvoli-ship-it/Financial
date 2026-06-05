/**
 * @fileoverview Gerenciamento do ciclo de vida da ImportSession.
 *
 * ESTADOS:
 *   queued → extracting → normalizing → enriching → validating → converting → completed
 *                                                                            ↘ failed
 *   Qualquer estado (exceto terminal) → cancelled
 *   failed | cancelled → queued  (retry)
 *
 * DESIGN:
 *   Imutável por convenção: transitionSession retorna NOVA session (não muta).
 *   Isso facilita debugging e permite comparar estados anterior/próximo.
 *   Cada transição registra timestamp e razão.
 *
 * OBSERVABILIDADE:
 *   transitions[] preserva todo o histórico de mudanças de estado.
 *   Em produção pode ser truncado após completedAt para economizar memória.
 *
 * @module ingestion/engine/importSessionLifecycle
 */

// ── Transições válidas ────────────────────────────────────────────────────────

/**
 * Mapa de transições de estado válidas.
 * @type {Readonly<Record<import("../models/ingestionTypes.js").ImportSessionStatus, import("../models/ingestionTypes.js").ImportSessionStatus[]>>}
 */
export const VALID_TRANSITIONS = Object.freeze({
  queued:      ["extracting", "cancelled"],
  extracting:  ["normalizing", "failed", "cancelled"],
  normalizing: ["enriching",   "failed", "cancelled"],
  enriching:   ["validating",  "failed", "cancelled"],
  validating:  ["converting",  "failed", "cancelled"],
  converting:  ["completed", "completed_with_warnings", "failed"],
  completed:   [],
  completed_with_warnings: [],
  failed:      ["queued"],   // permite retry
  cancelled:   ["queued"],   // permite retry
});

/** Estados terminais — sem transições de saída (exceto retry explícito). */
const TERMINAL_STATES = new Set(["completed", "completed_with_warnings", "failed", "cancelled"]);

// ── Tipos ─────────────────────────────────────────────────────────────────────

/**
 * Entrada no histórico de transições de estado.
 *
 * @typedef {Object} SessionTransition
 * @property {import("../models/ingestionTypes.js").ImportSessionStatus} from
 * @property {import("../models/ingestionTypes.js").ImportSessionStatus} to
 * @property {number} timestamp  Unix ms
 * @property {string|undefined} reason  Diagnóstico opcional (ex: mensagem de erro)
 */

/**
 * Session completa (in-memory apenas — não persiste).
 * Contém o sumário persistível + dados de runtime.
 *
 * @typedef {Object} LiveImportSession
 * @property {string} id
 * @property {import("../models/ingestionTypes.js").ImportSessionStatus} status
 * @property {string} importedAt           ISO 8601
 * @property {string|undefined} completedAt  ISO 8601
 * @property {"csv"|"pdf"|"ocr"|"manual"|"api"|"sync"} sourceType
 * @property {string[]} fileNames
 * @property {SessionTransition[]} transitions  Histórico completo
 * @property {import("../models/ingestionTypes.js").PipelineDiagnostic[]} diagnostics
 * @property {number} rowsExtracted
 * @property {number} rowsNormalized
 * @property {number} entitiesCreated
 * @property {number} duplicatesDetected
 * @property {import("../models/ingestionTypes.js").UserFacingMessage[]} userMessages
 */

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Cria uma nova LiveImportSession no estado inicial "queued".
 *
 * @param {{
 *   fileNames:   string[],
 *   sourceType:  "csv"|"pdf"|"ocr"|"manual"|"api"|"sync",
 * }} opts
 * @returns {LiveImportSession}
 */
export const createImportSession = ({ fileNames, sourceType }) => {
  const now = Date.now();
  const id  = crypto.randomUUID();

  return {
    id,
    status:           "queued",
    importedAt:       new Date(now).toISOString(),
    completedAt:      undefined,
    sourceType,
    fileNames,
    transitions:      [{
      from:      /** @type {any} */ ("—"),  // estado inicial (sem "from" real)
      to:        "queued",
      timestamp: now,
      reason:    "session created",
    }],
    diagnostics:      [],
    rowsExtracted:    0,
    rowsNormalized:   0,
    entitiesCreated:  0,
    duplicatesDetected: 0,
    userMessages:     [],
  };
};

// ── Transição ─────────────────────────────────────────────────────────────────

/**
 * Transita a session para um novo estado.
 * Retorna uma NOVA session (imutável por convenção).
 *
 * @param {LiveImportSession} session
 * @param {import("../models/ingestionTypes.js").ImportSessionStatus} nextStatus
 * @param {string} [reason]  Diagnóstico opcional (ex: mensagem de erro)
 * @returns {LiveImportSession}
 * @throws {Error}  Se a transição não for permitida
 */
export const transitionSession = (session, nextStatus, reason) => {
  const allowed = VALID_TRANSITIONS[session.status] ?? [];

  if (!allowed.includes(nextStatus)) {
    throw new Error(
      `ImportSession [${session.id}]: transição inválida ${session.status} → ${nextStatus}. ` +
      `Permitidas: [${allowed.join(", ") || "nenhuma"}]`,
    );
  }

  const now = Date.now();
  const isTerminal = TERMINAL_STATES.has(nextStatus);

  return {
    ...session,
    status:      nextStatus,
    completedAt: isTerminal ? new Date(now).toISOString() : session.completedAt,
    transitions: [
      ...session.transitions,
      { from: session.status, to: nextStatus, timestamp: now, reason },
    ],
  };
};

// ── Diagnósticos ──────────────────────────────────────────────────────────────

/**
 * Adiciona um diagnóstico técnico à session.
 * Retorna nova session (imutável).
 *
 * @param {LiveImportSession} session
 * @param {import("../models/ingestionTypes.js").PipelineDiagnostic} diagnostic
 * @returns {LiveImportSession}
 */
export const addDiagnostic = (session, diagnostic) => ({
  ...session,
  diagnostics: [...session.diagnostics, diagnostic],
});

/**
 * Adiciona uma mensagem para o usuário à session.
 * Retorna nova session (imutável).
 *
 * @param {LiveImportSession} session
 * @param {import("../models/ingestionTypes.js").UserFacingMessage} message
 * @returns {LiveImportSession}
 */
export const addUserMessage = (session, message) => ({
  ...session,
  userMessages: [...session.userMessages, message],
});

// ── Conversão para ImportSessionSummary ───────────────────────────────────────

/**
 * Converte uma LiveImportSession para o shape compacto ImportSessionSummary
 * que pode ser persistido no WealthState.
 *
 * Remove o histórico completo de transições, eventos e dados de runtime.
 * Preserva apenas contadores, status e amostra de mensagens.
 *
 * @param {LiveImportSession} session
 * @param {{ institutionId?: string, profileName?: string, rowsRead?: number }} [extra]
 * @returns {import("../models/ingestionTypes.js").ImportSessionSummary}
 */
export const toSessionSummary = (session, extra = {}) => ({
  id:                session.id,
  importedAt:        session.importedAt,
  completedAt:       session.completedAt,
  status:            session.status,
  sourceType:        session.sourceType,
  fileNames:         session.fileNames,
  institutionId:     extra.institutionId,
  profileName:       extra.profileName,
  rowsRead:          extra.rowsRead ?? session.rowsExtracted,
  rowsImported:      session.rowsNormalized,
  rowsSkipped:       Math.max(0, session.rowsExtracted - session.rowsNormalized),
  entitiesCreated:   session.entitiesCreated,
  duplicatesDetected: session.duplicatesDetected,
  warningCount:      session.userMessages.filter((m) => m.level === "warning").length,
  errorCount:        session.userMessages.filter((m) => m.level === "error").length,
  // Máx 10 mensagens para o usuário — não todos os eventos técnicos
  warningMessages:   session.userMessages
    .filter((m) => m.level === "warning" || m.level === "error")
    .slice(0, 10)
    .map((m) => m.message),
});
