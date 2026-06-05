/**
 * @fileoverview Logger estruturado para o pipeline de importação.
 *
 * OBJETIVO:
 *   Substituir console.log espalhado por eventos estruturados e rastreáveis.
 *   Permite debugar facilmente instituição, parser, linhas ignoradas,
 *   confidence, warnings e erros sem poluir o console em produção.
 *
 * EVENTOS:
 *   Todos os tipos de evento usam as constantes de PIPELINE_EVENTS.
 *   Nunca use strings mágicas — use PIPELINE_EVENTS.* ao emitir.
 *
 * USO:
 *   const logger = createPipelineLogger({ fileName: "nubank.csv" });
 *   logger.institutionDetected("nubank", 0.95);
 *   logger.rowsParsed(100, 98, 2);
 *   const summary = logger.getSummary();
 *
 * @module import/pipelineLogger
 */

import { PIPELINE_EVENTS } from "../ingestion/observability/pipelineEvents.js";

// ── Tipo de evento (derivado de PIPELINE_EVENTS) ──────────────────────────────

/**
 * @typedef {import("../ingestion/observability/pipelineEvents.js").PipelineEventType} PipelineEventType
 *
 * @typedef {Object} PipelineEvent
 * @property {PipelineEventType} type
 * @property {number}            timestamp   Unix ms
 * @property {Record<string, unknown>} data
 */

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Cria um logger para uma sessão de import de um arquivo.
 * Cada arquivo importado deve ter seu próprio logger.
 *
 * @param {{ fileName?: string, silent?: boolean }} [opts]
 *   silent=true: não emite console.warn (útil em produção)
 * @returns {PipelineLogger}
 */
export const createPipelineLogger = ({ fileName = "unknown", silent = false } = {}) => {
  /** @type {PipelineEvent[]} */
  const events = [];

  const push = (type, data) => {
    events.push({ type, timestamp: Date.now(), data });
  };

  const api = {
    // ── Eventos de detecção ──────────────────────────────────────────────────

    /** Instituição / profile identificado pelo detector. */
    institutionDetected(institutionId, confidence, raw) {
      const type = confidence < 0.5
        ? PIPELINE_EVENTS.PROFILE_CONFIDENCE_LOW
        : PIPELINE_EVENTS.PROFILE_DETECTED;
      push(type, { institutionId, confidence, raw: raw ?? null });
    },

    /** Extrator/parser selecionado (csv, pdf, ocr, manual). */
    parserSelected(parser, reason) {
      push(PIPELINE_EVENTS.EXTRACTION_STARTED, { parser, reason });
    },

    /** Dataset detectado nas linhas (transactions, classe, banco, etc.). */
    datasetDetected(dataset, rowCount) {
      push(PIPELINE_EVENTS.DATASET_DETECTED, { dataset, rowCount });
    },

    // ── Eventos de volume ────────────────────────────────────────────────────

    /** Resumo de linhas processadas pelo extrator. */
    rowsParsed(total, valid, invalid) {
      push(PIPELINE_EVENTS.ROWS_PARSED, { total, valid, invalid });
    },

    /** Linhas normalizadas com sucesso para um dataset. */
    rowsNormalized(count, dataset) {
      push(PIPELINE_EVENTS.ROW_NORMALIZED, { count, dataset });
    },

    /** Linhas ignoradas por algum motivo. */
    rowsIgnored(count, reason) {
      push(PIPELINE_EVENTS.ROW_SKIPPED, { count, reason });
      if (!silent && count > 0) {
        console.warn(`[import:${fileName}] ${count} linhas ignoradas: ${reason}`);
      }
    },

    // ── Eventos de campo ─────────────────────────────────────────────────────

    /**
     * Como um campo foi resolvido.
     * source: "column_alias" | "fallback" | "inferred" | "default"
     */
    fieldResolved(field, raw, resolved, source) {
      push(PIPELINE_EVENTS.FIELD_RESOLVED, { field, raw, resolved, source });
    },

    /** Score de confiança OCR ou de um campo inferido. */
    confidence(field, score, detail) {
      push(PIPELINE_EVENTS.CONFIDENCE_SCORED, {
        field,
        score: Math.round(score * 100) / 100,
        detail: detail ?? null,
      });
    },

    // ── Enriquecimento ───────────────────────────────────────────────────────

    /** Instituição inferida pelo enricher. */
    institutionInferred(institutionId, confidence) {
      push(PIPELINE_EVENTS.INSTITUTION_INFERRED, { institutionId, confidence });
    },

    /** Asset identity resolvida pelo assetIdentityEngine. */
    assetIdentityLinked(canonicalAssetId, ticker, matchType, confidence) {
      push(PIPELINE_EVENTS.ASSET_IDENTITY_LINKED, {
        canonicalAssetId, ticker, matchType, confidence,
      });
    },

    /** Enricher pulou o processamento (ex: sem ticker para assetIdentityEnricher). */
    enrichmentSkipped(enricher, reason) {
      push(PIPELINE_EVENTS.ENRICHMENT_SKIPPED, { enricher, reason });
    },

    // ── Entidades de domínio ─────────────────────────────────────────────────

    /** Entidade de domínio criada. */
    entityCreated(entityType, entityId) {
      push(PIPELINE_EVENTS.ENTITY_CREATED, { entityType, entityId });
    },

    /** Duplicata detectada pelo mecanismo de fingerprint. */
    duplicateDetected(entityType, fingerprint) {
      push(PIPELINE_EVENTS.DUPLICATE_DETECTED, { entityType, fingerprint });
    },

    // ── Warnings e erros ─────────────────────────────────────────────────────

    /** Situação inesperada mas recuperável. */
    warn(message, context) {
      push(PIPELINE_EVENTS.VALIDATION_WARNING, { message, context: context ?? null });
      if (!silent) {
        console.warn(`[import:${fileName}] WARN: ${message}`, context ?? "");
      }
    },

    /** Situação que impediu o processamento de uma linha ou arquivo. */
    error(message, context) {
      push(PIPELINE_EVENTS.VALIDATION_ERROR, { message, context: context ?? null });
      if (!silent) {
        console.error(`[import:${fileName}] ERROR: ${message}`, context ?? "");
      }
    },

    // ── OCR ──────────────────────────────────────────────────────────────────

    /** Provider OCR falhou. */
    ocrProviderFailed(provider, reason) {
      push(PIPELINE_EVENTS.OCR_PROVIDER_FAILED, { provider, reason });
      if (!silent) {
        console.error(`[import:${fileName}] OCR ${provider} falhou: ${reason}`);
      }
    },

    // ── Queries ──────────────────────────────────────────────────────────────

    /** Todos os eventos em ordem cronológica. */
    getEvents: () => [...events],

    /** Eventos de um tipo específico. */
    getEventsOfType: (type) => events.filter((e) => e.type === type),

    /** Resumo numérico para o import summary. */
    getSummary() {
      const warnings = events.filter((e) => e.type === PIPELINE_EVENTS.VALIDATION_WARNING);
      const errors   = events.filter((e) => e.type === PIPELINE_EVENTS.VALIDATION_ERROR);
      const skipped  = events.filter((e) => e.type === PIPELINE_EVENTS.ROW_SKIPPED);
      const inst     = events.find((e) =>
        e.type === PIPELINE_EVENTS.PROFILE_DETECTED ||
        e.type === PIPELINE_EVENTS.PROFILE_CONFIDENCE_LOW,
      );
      const duplicates = events.filter((e) => e.type === PIPELINE_EVENTS.DUPLICATE_DETECTED);

      return {
        fileName,
        institutionDetected:  inst?.data.institutionId ?? null,
        institutionConfidence: inst?.data.confidence ?? null,
        totalWarnings:        warnings.length,
        totalErrors:          errors.length,
        rowsSkipped:          skipped.reduce((s, e) => s + (e.data.count ?? 0), 0),
        duplicatesDetected:   duplicates.length,
        warnings:             warnings.map((e) => e.data.message),
        errors:               errors.map((e) => e.data.message),
      };
    },

    /** Representação legível para debug. */
    toString() {
      return events
        .map((e) => `[${e.type}] ${JSON.stringify(e.data)}`)
        .join("\n");
    },
  };

  return api;
};

/**
 * @typedef {ReturnType<typeof createPipelineLogger>} PipelineLogger
 */

// ── Códigos de warning padronizados ──────────────────────────────────────────

/** Códigos de warning para uso nos normalizers (evita strings mágicas). */
export const PIPELINE_WARN = {
  UNKNOWN_INSTITUTION:    "UNKNOWN_INSTITUTION",
  UNKNOWN_ASSET_CLASS:    "UNKNOWN_ASSET_CLASS",
  DATE_INFERRED:          "DATE_INFERRED",
  AMOUNT_ZERO:            "AMOUNT_ZERO",
  MISSING_DESCRIPTION:    "MISSING_DESCRIPTION",
  SIGN_INVERTED:          "SIGN_INVERTED",
  DUPLICATE_SKIPPED:      "DUPLICATE_SKIPPED",
  OCR_LOW_CONFIDENCE:     "OCR_LOW_CONFIDENCE",
  SCHEMA_MISMATCH:        "SCHEMA_MISMATCH",
  ASSET_IDENTITY_UNRESOLVED: "ASSET_IDENTITY_UNRESOLVED",
};
