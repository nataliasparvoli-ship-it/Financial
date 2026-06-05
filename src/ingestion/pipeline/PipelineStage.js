/**
 * @fileoverview Interface de PipelineStage — contrato para stages composáveis.
 *
 * DESIGN:
 *   Um stage é um objeto com `name`, `enabled`, `retryable` e `run`.
 *   O IngestionEngine aceita um array de stages — a ordem define a sequência.
 *
 *   Stages são stateless: `run` é uma função pura em termos de efeitos colaterais
 *   (pode chamar APIs, mas não guarda estado entre chamadas).
 *
 * COMPOSIÇÃO:
 *   const pipeline = [
 *     rowNormalizerStage,
 *     institutionEnricherStage,
 *     assetIdentityEnricherStage,
 *     categoryEnricherStage,
 *     confidenceEnricherStage,
 *     domainValidatorStage,
 *     domainConverterStage,
 *   ];
 *   const result = await runPipeline(records, pipeline, context);
 *
 * CUSTOMIZAÇÃO:
 *   // Desativar um stage:
 *   { ...assetIdentityEnricherStage, enabled: false }
 *
 *   // Injetar stage custom:
 *   { name: "myEnricher", enabled: true, retryable: false, run: myFn }
 *
 * @module ingestion/pipeline/PipelineStage
 */

// ── Tipos ─────────────────────────────────────────────────────────────────────

/**
 * Contexto passado a cada stage durante a execução.
 * Readonly por convenção — stages não devem modificar o contexto.
 *
 * @typedef {Object} PipelineContext
 * @property {string}  sessionId
 * @property {import("../../import/pipelineLogger.js").PipelineLogger|undefined} logger
 * @property {Record<string, unknown>|undefined} config  Configuração específica por stage
 */

/**
 * Contrato de um stage do pipeline.
 *
 * run recebe o output do stage anterior (ou ExtractedRecord[] para o primeiro stage).
 * run deve retornar um array do mesmo tamanho ou menor (registros descartados não são erro).
 * run NUNCA deve lançar para falhas individuais de registro — use warnings no record.
 * run PODE lançar para falhas de stage completo (API down, config inválida).
 *
 * @typedef {Object} PipelineStage
 * @property {string}   name         Identificador canônico. Ex: "institutionEnricher"
 * @property {boolean}  [enabled]    Default: true. false = stage skipped silenciosamente
 * @property {boolean}  [retryable]  Default: false. true = runPipeline pode retentar em falha
 * @property {(input: unknown[], context: PipelineContext) => Promise<unknown[]>} run
 */

export {};
