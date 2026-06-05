/**
 * @fileoverview IngestionEngine — orquestrador composável do pipeline de ingestão.
 *
 * RESPONSABILIDADE (orchestration only):
 *   Coordenar stages, gerenciar lifecycle, agregar resultados, controlar observabilidade.
 *   SEM regras de negócio, heurísticas, categorização ou enrich logic.
 *
 * PIPELINE PADRÃO (Phase 3d):
 *   [
 *     rowNormalizerStage,       ExtractedRecord[]  → NormalizedRecord[]
 *     institutionEnricherStage, NormalizedRecord[] → EnrichedRecord[]
 *     assetIdentityEnricherStage,                  → EnrichedRecord[]
 *     categoryEnricherStage,                       → EnrichedRecord[]
 *     confidenceEnricherStage,                     → EnrichedRecord[]
 *     domainValidatorStage,                        → ValidatedRecord[]
 *     domainConverterStage,                        → DomainEntity[]
 *   ]
 *
 * COMPOSABILIDADE (principle #2):
 *   O caller pode injetar stages customizados:
 *     createIngestionEngine({ stages: [...defaultStages, myEnricher] })
 *   Ou desativar um stage:
 *     createIngestionEngine({ stages: defaultStages.map(s =>
 *       s.name === "assetIdentityEnricher" ? { ...s, enabled: false } : s
 *     )})
 *
 * PARTIAL SUCCESS (principle #8):
 *   100 linhas → 82 válidas → session: "completed_with_warnings"
 *   Não é falha. Import parcial é primeiro-cidadão.
 *
 * BRIDGE (principle #10):
 *   importPipeline.js permanece inalterado.
 *   IngestionEngine coexiste e pode ser adotado gradualmente.
 *
 * @module ingestion/engine/IngestionEngine
 */

import { CsvExtractor }      from "../extractors/CsvExtractor.js";
import { createOcrExtractor } from "../extractors/OcrExtractor.js";
import { createPdfExtractor } from "../extractors/PdfExtractor.js";
import { ManualExtractor }   from "../extractors/ManualExtractor.js";

import { rowNormalizerStage }         from "../normalizers/rowNormalizer.js";
import { institutionEnricherStage }   from "../enrichers/institutionEnricher.js";
import { assetIdentityEnricherStage } from "../enrichers/assetIdentityEnricher.js";
import { categoryEnricherStage }      from "../enrichers/categoryEnricher.js";
import { confidenceEnricherStage }    from "../enrichers/confidenceEnricher.js";
import { domainValidatorStage }       from "../validators/domainValidator.js";
import { domainConverterStage }       from "../converters/DomainConverter.js";

import { runPipeline, computeConfidenceSummary } from "../pipeline/runPipeline.js";
import {
  createImportSession,
  transitionSession,
  addDiagnostic,
  addUserMessage,
  toSessionSummary,
} from "./importSessionLifecycle.js";

// ── Pipeline padrão ───────────────────────────────────────────────────────────

/**
 * Array de stages padrão em ordem de execução.
 * Exportado para permitir customização pelo caller.
 *
 * @type {import("../pipeline/PipelineStage.js").PipelineStage[]}
 */
export const DEFAULT_PIPELINE_STAGES = [
  rowNormalizerStage,
  institutionEnricherStage,
  assetIdentityEnricherStage,
  categoryEnricherStage,
  confidenceEnricherStage,
  domainValidatorStage,
  domainConverterStage,
];

// ── Detecção de extractor ─────────────────────────────────────────────────────

const OCR_EXTENSIONS  = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp"]);
const PDF_EXTENSION   = "pdf";
const CSV_EXTENSIONS  = new Set(["csv", "tsv", "txt"]);

const detectExtractorType = (fileName) => {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  if (ext === PDF_EXTENSION)   return "pdf";
  if (OCR_EXTENSIONS.has(ext)) return "ocr";
  if (CSV_EXTENSIONS.has(ext)) return "csv";
  return "csv"; // fallback seguro
};

// ── Dispatch de extractor ─────────────────────────────────────────────────────

const runExtractor = async (type, file, ocrExtractor, pdfExtractor) => {
  switch (type) {
    case "pdf": return pdfExtractor.extract(file);
    case "ocr":
      if (!ocrExtractor) throw new Error(
        `OCR provider não configurado para "${file.name}". ` +
        "Use createIngestionEngine({ ocrProvider }).",
      );
      return ocrExtractor.extract(file);
    default: return CsvExtractor.extract(file);
  }
};

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Cria uma instância do IngestionEngine com dependências injetadas.
 *
 * @param {{
 *   ocrProvider?: import("../providers/ocrProvider.js").OcrProvider | null,
 *   stages?:      import("../pipeline/PipelineStage.js").PipelineStage[],
 * }} [opts]
 */
export const createIngestionEngine = ({ ocrProvider = null, stages = null } = {}) => {
  const ocrExtractor  = ocrProvider ? createOcrExtractor(ocrProvider) : null;
  const pdfExtractor  = createPdfExtractor({ ocrExtractor });
  const pipelineStages = stages ?? DEFAULT_PIPELINE_STAGES;

  return {

    // ── extractFile (Phase 3c — extraction only) ────────────────────────────
    //
    // Mantido para compatibilidade. Retorna ExtractedRecord[] + session
    // sem rodar o pipeline completo. Útil para debug e testes de extração.

    /**
     * @param {File} file
     * @returns {Promise<{
     *   records: import("../models/ingestionTypes.js").ExtractedRecord[],
     *   session: import("./importSessionLifecycle.js").LiveImportSession,
     *   summary: import("../models/ingestionTypes.js").ImportSessionSummary,
     * }>}
     */
    async extractFile(file) {
      const type = detectExtractorType(file.name);
      let session = createImportSession({
        fileNames:  [file.name],
        sourceType: /** @type {any} */ (type),
      });

      try {
        session = transitionSession(session, "extracting");
        const records = await runExtractor(type, file, ocrExtractor, pdfExtractor);
        session = { ...session, rowsExtracted: records.length };
        session = transitionSession(session, "normalizing", "extraction completed");
        return { records, session, summary: toSessionSummary(session) };
      } catch (err) {
        session = transitionSession(session, "failed", err instanceof Error ? err.message : String(err));
        return { records: [], session, summary: toSessionSummary(session) };
      }
    },

    // ── processFile (Phase 3d — full pipeline) ──────────────────────────────

    /**
     * Executa o pipeline completo: extração → normalização → enriquecimento
     * → validação → conversão → entidades de domínio.
     *
     * @param {File} file
     * @returns {Promise<import("../models/ingestionTypes.js").PipelineResult>}
     */
    async processFile(file) {
      const type = detectExtractorType(file.name);
      let session = createImportSession({
        fileNames:  [file.name],
        sourceType: /** @type {any} */ (type),
      });

      // ── Extração ────────────────────────────────────────────────────────────
      let extractedRecords;
      try {
        session = transitionSession(session, "extracting");
        extractedRecords = await runExtractor(type, file, ocrExtractor, pdfExtractor);
        session = { ...session, rowsExtracted: extractedRecords.length };
        session = transitionSession(session, "normalizing");
      } catch (err) {
        session = transitionSession(session, "failed", err instanceof Error ? err.message : String(err));
        session = addUserMessage(session, {
          level:      "error",
          message:    `Falha na extração de "${file.name}".`,
          suggestion: "Verifique o formato do arquivo e tente novamente.",
        });
        return buildFailedResult(session, [], extractedRecords?.length ?? 0);
      }

      // ── Pipeline de stages ──────────────────────────────────────────────────
      const context = { sessionId: session.id };

      const {
        output: entities,
        metrics,
        diagnostics,
        stagesFailed,
      } = await runPipeline(extractedRecords, pipelineStages, context);

      const domainEntities = /** @type {import("../../domain/types.js").DomainEntity[]} */ (entities);

      // ── Diagnósticos de stage → diagnostics da session ──────────────────────
      for (const d of diagnostics) {
        session = addDiagnostic(session, d);
      }

      // ── Contadores ──────────────────────────────────────────────────────────
      session = {
        ...session,
        rowsNormalized: domainEntities.length,
        entitiesCreated: domainEntities.length,
      };

      // ── Determina status final ──────────────────────────────────────────────
      const hasWarnings = session.userMessages.some((m) => m.level === "warning");
      const allFailed   = stagesFailed > 0 && domainEntities.length === 0;

      session = transitionSession(session, "converting");

      if (allFailed) {
        session = transitionSession(session, "failed", "todos os stages falharam");
        session = addUserMessage(session, {
          level:      "error",
          message:    `Nenhuma linha pôde ser processada de "${file.name}".`,
          suggestion: "Verifique o formato do arquivo ou tente um CSV exportado manualmente.",
        });
      } else if (hasWarnings || session.diagnostics.length > 0) {
        session = transitionSession(session, "completed_with_warnings");
      } else {
        session = transitionSession(session, "completed");
      }

      return {
        entities: domainEntities,
        entitiesCreated:    domainEntities.length,
        entitiesSkipped:    0,  // deduplicação acontece no WealthContext.mergeImportResult
        duplicatesDetected: 0,
        warnings:           [],
        diagnostics:        session.diagnostics,
        metrics,
        confidenceSummary:  computeConfidenceSummary(domainEntities),
        sessionSummary:     toSessionSummary(session),
        totalDurationMs:    metrics.reduce((s, m) => s + m.durationMs, 0),
      };
    },

    /**
     * Processa múltiplos arquivos em paralelo.
     *
     * @param {File[]} files
     * @returns {Promise<import("../models/ingestionTypes.js").PipelineResult[]>}
     */
    async processFiles(files) {
      return Promise.all(files.map((f) => this.processFile(f)));
    },

    /**
     * Converte entradas manuais para ExtractedRecord[] (síncrono).
     * Nota: entradas manuais tipicamente saltam extração e vão direto ao pipeline.
     *
     * @param {Record<string, unknown>[]} entries
     * @param {{ fileName?: string }} [opts]
     * @returns {import("../models/ingestionTypes.js").ExtractedRecord[]}
     */
    extractManual(entries, opts = {}) {
      return ManualExtractor.extract(entries, opts);
    },

    /** Capabilities desta instância. */
    capabilities: {
      ocrAvailable:  ocrProvider !== null,
      providers:     ocrProvider ? [ocrProvider.providerId] : [],
      stageCount:    pipelineStages.filter((s) => s.enabled !== false).length,
    },
  };
};

// ── Helpers internos ──────────────────────────────────────────────────────────

const buildFailedResult = (session, entities, rowsRead) => ({
  entities,
  entitiesCreated:    0,
  entitiesSkipped:    0,
  duplicatesDetected: 0,
  warnings:           [],
  diagnostics:        session.diagnostics,
  metrics:            [],
  confidenceSummary:  { average: 0, min: 0, max: 0, highCount: 0, lowCount: 0, totalScored: 0 },
  sessionSummary:     toSessionSummary(session, { rowsRead }),
  totalDurationMs:    0,
});
