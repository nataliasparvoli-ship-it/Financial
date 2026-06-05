/**
 * @fileoverview runPipeline — executor composável de stages do pipeline.
 *
 * RESPONSABILIDADE:
 *   Itera o array de stages, passa o output de cada stage para o próximo,
 *   coleta métricas operacionais por stage e trata falhas com tolerância granular.
 *
 * TOLERÂNCIA A FALHAS:
 *   Row-level:   cada stage decide internamente o que fazer com registros inválidos.
 *                O runner nunca interfere. Registros com warnings são válidos.
 *
 *   Stage-level: se um stage lança exceção → runner registra diagnóstico,
 *                adiciona StageMetrics com failed:true e PARA o pipeline.
 *                Os registros até esse ponto são retornados como estão.
 *
 *   Partial success: o caller (IngestionEngine) decide se o resultado parcial
 *                    é "completed_with_warnings" ou "failed" baseado na contagem.
 *
 * RETRYABILITY:
 *   stage.retryable = true → informa o caller que pode re-executar apenas esse stage.
 *   O runner atual não implementa retry automático — delega essa decisão ao IngestionEngine.
 *
 * @module ingestion/pipeline/runPipeline
 */

// ── Runner principal ──────────────────────────────────────────────────────────

/**
 * Executa uma sequência de stages em ordem, propagando o output de cada um
 * como input do próximo.
 *
 * @param {unknown[]} initialRecords  Registros iniciais (ExtractedRecord[] na maioria dos casos)
 * @param {import("./PipelineStage.js").PipelineStage[]} stages
 * @param {import("./PipelineStage.js").PipelineContext} [context]
 * @returns {Promise<{
 *   output: unknown[],
 *   metrics: import("../models/ingestionTypes.js").StageMetrics[],
 *   diagnostics: import("../models/ingestionTypes.js").PipelineDiagnostic[],
 *   rowsInput: number,
 *   rowsOutput: number,
 *   totalDurationMs: number,
 *   stagesFailed: number,
 * }>}
 */
export const runPipeline = async (initialRecords, stages, context = {}) => {
  const pipelineStart = Date.now();

  /** @type {import("../models/ingestionTypes.js").StageMetrics[]} */
  const metrics = [];
  /** @type {import("../models/ingestionTypes.js").PipelineDiagnostic[]} */
  const diagnostics = [];

  let current = initialRecords;
  let stagesFailed = 0;

  for (const stage of stages) {
    // Stage desativado: skip silencioso — sem log, sem métricas
    if (stage.enabled === false) continue;

    const stageStart = Date.now();
    const inputCount = current.length;

    try {
      current = await stage.run(current, context);

      metrics.push({
        stageName:    stage.name,
        startedAt:    stageStart,
        completedAt:  Date.now(),
        durationMs:   Date.now() - stageStart,
        inputCount,
        outputCount:  current.length,
      });

      context.logger?.rowsNormalized?.(current.length, stage.name);

    } catch (err) {
      stagesFailed += 1;
      const errorMsg = err instanceof Error ? err.message : String(err);

      diagnostics.push({
        code:     "STAGE_FAILED",
        message:  `Stage "${stage.name}" falhou: ${errorMsg}`,
        context:  { stageName: stage.name, inputCount, retryable: stage.retryable ?? false },
        severity: "error",
      });

      metrics.push({
        stageName:   stage.name,
        startedAt:   stageStart,
        completedAt: Date.now(),
        durationMs:  Date.now() - stageStart,
        inputCount,
        outputCount: 0,
        failed:      true,
      });

      context.logger?.error?.(
        `Stage "${stage.name}" falhou: ${errorMsg}`,
        { stage: stage.name, retryable: stage.retryable ?? false },
      );

      // Para o pipeline — stages subsequentes não podem rodar sem este output
      break;
    }
  }

  return {
    output:          current,
    metrics,
    diagnostics,
    rowsInput:       initialRecords.length,
    rowsOutput:      current.length,
    totalDurationMs: Date.now() - pipelineStart,
    stagesFailed,
  };
};

// ── Helpers de resultado ──────────────────────────────────────────────────────

/**
 * Computa o ConfidenceSummary a partir de entidades criadas.
 * Usa `confidenceScore` de Holding, Transaction, etc.
 *
 * @param {import("../../domain/types.js").DomainEntity[]} entities
 * @returns {import("../models/ingestionTypes.js").ConfidenceSummary}
 */
export const computeConfidenceSummary = (entities) => {
  const scores = entities
    .map((e) => /** @type {any} */ (e).confidenceScore)
    .filter((s) => typeof s === "number");

  if (scores.length === 0) {
    return { average: 0, min: 0, max: 0, highCount: 0, lowCount: 0, totalScored: 0 };
  }

  const average  = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min      = Math.min(...scores);
  const max      = Math.max(...scores);
  const highCount = scores.filter((s) => s >= 0.8).length;
  const lowCount  = scores.filter((s) => s < 0.5).length;

  return {
    average:     Math.round(average * 100) / 100,
    min:         Math.round(min  * 100) / 100,
    max:         Math.round(max  * 100) / 100,
    highCount,
    lowCount,
    totalScored: scores.length,
  };
};
