/**
 * @fileoverview Taxonomia canônica de eventos do pipeline de ingestão.
 *
 * DESIGN:
 *   Cada evento mapeia para uma transição de estado observável no pipeline.
 *   Usar constantes (não strings mágicas) em todo código que emite ou filtra eventos.
 *
 * GRUPOS:
 *   File lifecycle   → FILE_*
 *   Profile          → PROFILE_*
 *   Extraction       → EXTRACTION_*, ROW_EXTRACTED
 *   Normalization    → ROW_NORMALIZED, ROW_SKIPPED, SIGN_APPLIED, DATASET_DETECTED, ROWS_PARSED
 *   Enrichment       → INSTITUTION_*, TICKER_*, ASSET_*, CATEGORY_*, CONFIDENCE_*, ENRICHMENT_*
 *   Validation       → VALIDATION_*
 *   Domain           → ENTITY_*, DUPLICATE_*, FIELD_*
 *   Session          → SESSION_*, IMPORT_*, USER_*
 *   OCR              → OCR_*
 *
 * @module ingestion/observability/pipelineEvents
 */

export const PIPELINE_EVENTS = Object.freeze({
  // ── File lifecycle ────────────────────────────────────────────────────────
  /** Arquivo recebido pelo engine, antes do parse. */
  FILE_RECEIVED:            "file_received",
  /** Parse do arquivo falhou (binário corrompido, extensão errada). */
  FILE_PARSE_FAILED:        "file_parse_failed",

  // ── Profile detection ─────────────────────────────────────────────────────
  /** Institution profile detectado com sucesso. */
  PROFILE_DETECTED:         "profile_detected",
  /** Profile detectado, mas confiança abaixo do threshold (< 0.5). */
  PROFILE_CONFIDENCE_LOW:   "profile_confidence_low",

  // ── Extraction ────────────────────────────────────────────────────────────
  EXTRACTION_STARTED:       "extraction_started",
  EXTRACTION_COMPLETED:     "extraction_completed",
  /** Uma linha/bloco foi extraído com sucesso. */
  ROW_EXTRACTED:            "row_extracted",

  // ── Normalization ─────────────────────────────────────────────────────────
  /** Dataset identificado no arquivo (transacoes, classe, banco…). */
  DATASET_DETECTED:         "dataset_detected",
  /** Resumo de linhas processadas/aceitas/rejeitadas. */
  ROWS_PARSED:              "rows_parsed",
  /** Uma linha foi normalizada com sucesso para campos canônicos. */
  ROW_NORMALIZED:           "row_normalized",
  /** Uma linha foi descartada (valor zero, campos obrigatórios ausentes). */
  ROW_SKIPPED:              "row_skipped",
  /** Sinal do valor foi invertido pela sign convention do profile. */
  SIGN_APPLIED:             "sign_applied",

  // ── Enrichment ────────────────────────────────────────────────────────────
  /** Instituição resolvida pelo institutionEnricher. */
  INSTITUTION_INFERRED:     "institution_inferred",
  /** Ticker normalizado (ex: PETR4F → PETR4). */
  TICKER_RESOLVED:          "ticker_resolved",
  /** canonicalAssetId resolvido pelo assetIdentityEngine. */
  ASSET_IDENTITY_LINKED:    "asset_identity_linked",
  /** Categoria inferida automaticamente. */
  CATEGORY_INFERRED:        "category_inferred",
  /** confidence score computado para um record. */
  CONFIDENCE_SCORED:        "confidence_scored",
  /**
   * Enricher pulou o processamento do record.
   * Ex: sem ticker → assetIdentityEnricher pula.
   */
  ENRICHMENT_SKIPPED:       "enrichment_skipped",

  // ── Field resolution ──────────────────────────────────────────────────────
  /** Como um campo específico foi resolvido (source: column_alias | fallback | inferred). */
  FIELD_RESOLVED:           "field_resolved",

  // ── Validation ────────────────────────────────────────────────────────────
  /** Situação suspeita mas recuperável (dado aceito com aviso). */
  VALIDATION_WARNING:       "validation_warning",
  /**
   * Campo inválido — linha parcialmente aceita.
   * Distingue de ROW_SKIPPED que descarta a linha inteira.
   */
  VALIDATION_ERROR:         "validation_error",

  // ── Domain ────────────────────────────────────────────────────────────────
  /** Entidade de domínio criada (Holding, Transaction, CashBalance…). */
  ENTITY_CREATED:           "entity_created",
  /**
   * Duplicata detectada pelo mecanismo de fingerprint.
   * Distingue por entidade: transaction_duplicate, holding_duplicate, etc.
   */
  DUPLICATE_DETECTED:       "duplicate_detected",

  // ── Session ───────────────────────────────────────────────────────────────
  SESSION_STARTED:          "session_started",
  SESSION_COMPLETED:        "session_completed",
  /** Usuário cancelou a sessão antes da conclusão. */
  IMPORT_CANCELLED:         "import_cancelled",
  /** Sessão sendo retentada após falha ou cancelamento. */
  IMPORT_RETRIED:           "import_retried",
  /** Usuário corrigiu um campo inferido automaticamente. */
  USER_CORRECTION:          "user_correction",

  // ── OCR ───────────────────────────────────────────────────────────────────
  /** Provider OCR falhou (timeout, erro de API, resposta inválida). */
  OCR_PROVIDER_FAILED:      "ocr_provider_failed",
});

/**
 * Tipo derivado: union de todos os valores de PIPELINE_EVENTS.
 * @typedef {typeof PIPELINE_EVENTS[keyof typeof PIPELINE_EVENTS]} PipelineEventType
 */
