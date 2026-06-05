/**
 * @fileoverview Tipos intermediários do Financial Ingestion Engine.
 *
 * PIPELINE CANÔNICO:
 *
 *   RawFile
 *     │ Extractor (csv / pdf / ocr / manual / api)
 *     ▼
 *   ExtractedRecord[]         "o que veio do mundo externo"
 *     │ Normalizer (profile-driven)
 *     ▼
 *   NormalizedRecord[]        "campos canônicos, sinal corrigido"
 *     │ Enricher (puro, idempotente)
 *     ▼
 *   EnrichedRecord[]          "identidade resolvida, confidence calculado"
 *     │ Validator (determinístico, sem UI)
 *     ▼
 *   ValidatedRecord[]         "pronto para virar entidade de domínio"
 *     │ DomainConverter
 *     ▼
 *   DomainEntity[]            Holding | Transaction | CashBalance | …
 *
 * CONTRATOS DE DESIGN:
 *   • Enrichers são PUROS: mesma entrada → mesma saída (idempotência garantida)
 *   • Validators são DETERMINÍSTICOS: sem dependência de UI, sem efeitos colaterais
 *   • OCR: campos provider-specific NÃO vazam após o OcrExtractor
 *   • ConfidenceBreakdown é COMPOSTO: nunca um único valor monolítico
 *   • ImportSessionSummary persiste. ImportSession (full) é in-memory apenas.
 *
 * DUPLICIDADE POR ENTIDADE:
 *   Transaction:     fingerprint(date + desc + amountCents)  → skip se existe
 *   Holding:         fingerprint(instId + label + YYYY-MM)    → upsert (atualiza valor)
 *   CashBalance:     fingerprint(instId + accountType + YYYY-MM) → upsert
 *   PortfolioSnapshot: por date com prioridade (manual > imported > auto)
 *   PassiveIncome:   fingerprint(YYYY-MM)                    → skip se existe
 *
 * @module ingestion/models/ingestionTypes
 */

// Este arquivo é JSDoc-only. Nenhuma lógica — apenas definições de tipo.
// Exporta apenas o objeto vazio para permitir `import` em ambiente de módulos.

// ── OCR Readiness ─────────────────────────────────────────────────────────────

/**
 * Bounding box de um bloco textual em uma imagem/PDF.
 * Coordenadas em pixels relativas ao topo-esquerdo da página.
 *
 * @typedef {Object} BoundingBox
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} page  1-based
 */

/**
 * Bloco de texto extraído pelo OCR com metadados de posição e confiança.
 * Abstração de provider: Claude, Tesseract, Google Vision ou outro.
 * Nenhum campo provider-specific deve aparecer aqui.
 *
 * @typedef {Object} OcrTextBlock
 * @property {string}      text
 * @property {number}      confidence   0-1 confiança do provider para este bloco
 * @property {BoundingBox} boundingBox
 * @property {string|undefined} fieldHint  Ex: "ticker", "amount" — inferido pelo provider
 */

/**
 * Resultado completo de uma extração OCR.
 * O OcrExtractor produz este shape e mapeia para ExtractedRecord[].
 * Nenhum campo específico do provider (ex: Claude message ID) aparece aqui.
 *
 * @typedef {Object} OcrExtractionResult
 * @property {"claude"|"tesseract"|"mock"} provider
 * @property {OcrTextBlock[]} blocks
 * @property {string}   fullText
 * @property {number}   pageCount
 * @property {number}   overallConfidence    Média ponderada dos blocos
 * @property {string|undefined} institutionHint  Provider inferiu a instituição
 */

// ── Extraction layer ──────────────────────────────────────────────────────────

/**
 * Metadados de extração preservados do arquivo fonte.
 * Presente em todos os ExtractedRecords para rastreabilidade.
 *
 * @typedef {Object} ExtractionMeta
 * @property {string}          fileName
 * @property {"csv"|"pdf"|"ocr"|"manual"|"api"|"sync"} sourceType
 * @property {number}          rowIndex      Índice na fonte (linha CSV, bloco OCR)
 * @property {number|undefined}  pageNumber  PDF / OCR multi-page
 * @property {BoundingBox|undefined} boundingBox  OCR somente
 * @property {number|undefined}  ocrConfidence  0-1, OCR somente — confiança do campo
 * @property {string|undefined}  rawText       Texto bruto antes do parse (OCR somente)
 */

/**
 * Resultado bruto de qualquer Extractor.
 * Shape comum independente da fonte — este é o contrato do Extractor.
 * Preserva dados brutos integralmente para auditoria e re-processamento.
 *
 * @typedef {Object} ExtractedRecord
 * @property {string}   id                UUID temporário para rastreamento intra-sessão
 * @property {Record<string,string>} rawData  Colunas/campos brutos da fonte
 * @property {ExtractionMeta} meta
 * @property {string}   sourceFingerprint  Hash determinístico: fileName|rowIndex|rawData (sorted keys).
 *                                          Usado para deduplicação pré-normalização.
 *                                          Formato: "src::{djb2_hex}"
 * @property {ValidationResult[]} warnings  Problemas detectados durante extração
 */

// ── Normalization layer ───────────────────────────────────────────────────────

/**
 * Campos canônicos após o Normalizer.
 * Todos os campos são opcionais — o Normalizer preenche o que consegue;
 * o que ficar undefined é tratado pelo Enricher ou pelo Validator.
 *
 * @typedef {Object} NormalizedFields
 * @property {string|undefined}  date           ISO 8601 — data da movimentação/snapshot
 * @property {number|undefined}  amount         Valor com sinal correto (signConvention já aplicada)
 * @property {string|undefined}  description    Descrição normalizada (trim, sem encoding ruído)
 * @property {string|undefined}  category       Categoria bruta da fonte (antes de enriquecimento)
 * @property {string|undefined}  accountRef     Identificador da conta/cartão
 * @property {string|undefined}  institutionRaw  Nome da instituição como veio na fonte
 * @property {string|undefined}  assetLabelRaw  Label do ativo como veio na fonte
 * @property {string|undefined}  tickerRaw      Ticker como veio na fonte (antes de normalizeAssetLabel)
 * @property {number|undefined}  ocrConfidence  0-1 confiança OCR do campo (quando sourceType="ocr")
 */

/**
 * Registro após normalização — campos canônicos, profile aplicado.
 *
 * @typedef {Object} NormalizedRecord
 * @property {ExtractedRecord} source   Registro original preservado (imutável)
 * @property {"transaction"|"holding"|"cashBalance"|"snapshot"|"passiveIncome"} datasetType
 * @property {import("../../import/institutionProfiles.js").InstitutionProfile} profile
 * @property {NormalizedFields} fields
 * @property {ValidationResult[]} warnings  Acumulado (extração + normalização)
 */

// ── Enrichment layer ──────────────────────────────────────────────────────────

/**
 * Confidence score COMPOSTO por fonte.
 * Nunca um único número monolítico.
 *
 * Computation (weighted average):
 *   ocr:          peso 0.40 — confiança do extrator (quando aplicável)
 *   institution:  peso 0.20 — qualidade do match de instituição
 *   assetIdentity: peso 0.25 — qualidade da resolução do ativo
 *   category:     peso 0.15 — confiança da categorização automática
 *
 * Se uma fonte não participou → seu peso é redistribuído para as demais.
 *
 * @typedef {Object} ConfidenceBreakdown
 * @property {number|undefined} ocr           0-1, presente se sourceType="ocr"
 * @property {number|undefined} institution   0-1, qualidade do institutionEnricher
 * @property {number|undefined} assetIdentity 0-1, qualidade do assetIdentityEnricher
 * @property {number|undefined} category      0-1, qualidade do categoryEnricher
 * @property {number}           overall        0-1, média ponderada das fontes presentes
 */

/**
 * Campos resolvidos pelos Enrichers.
 * Enrichers são PUROS — mesma entrada → mesma saída garantida.
 *
 * @typedef {Object} EnrichedFields
 * @property {string}          institutionId     Resolvido pelo institutionEnricher
 * @property {string}          institutionLabel
 * @property {string|null}     canonicalAssetId  "br:PETR4" | null se não resolvido
 * @property {string|null}     ticker            Ticker normalizado ou null
 * @property {string}          category          Categoria final (após enriquecimento)
 * @property {import("../../domain/types.js").TransactionKind|undefined} transactionKind  Resolvido pelo categoryEnricher
 * @property {string[]}        enrichmentSources  Quais enrichers rodaram (ex: ["institutionEnricher", "assetIdentityEnricher"])
 * @property {ConfidenceBreakdown} confidence
 */

/**
 * Registro pronto para validação de domínio.
 *
 * @typedef {Object} EnrichedRecord
 * @property {NormalizedRecord} source  Registro normalizado preservado
 * @property {EnrichedFields}   enriched
 */

// ── Validation layer ──────────────────────────────────────────────────────────

/**
 * Registro após validação de domínio — pronto para conversão em entidade.
 *
 * isValid: false → linha deve ser descartada (contém ValidationResult com level="fatal")
 * hasWarnings: true → linha aceita com aviso (contém level="warning")
 *
 * @typedef {Object} ValidatedRecord
 * @property {EnrichedRecord}     source          Registro enriquecido preservado
 * @property {ValidationResult[]} results         Resultados de todas as regras executadas
 * @property {boolean}            isValid         false = linha descartada
 * @property {boolean}            hasWarnings     true = aceita com aviso
 */

/**
 * Níveis de validação em ordem crescente de severidade.
 *
 *   ok       → tudo certo, nenhum log necessário
 *   coerced  → valor foi corrigido automaticamente (log + usa coercedValue)
 *   warning  → dado suspeito mas aceito (log + mantém linha)
 *   error    → campo inválido descartado (log + linha mantida sem o campo)
 *   fatal    → linha descartada inteira (log + skip)
 *
 * @typedef {"ok"|"coerced"|"warning"|"error"|"fatal"} ValidationLevel
 */

/**
 * Resultado de uma regra de validação.
 * Determinístico: não depende de UI, não tem efeitos colaterais.
 *
 * @typedef {Object} ValidationResult
 * @property {ValidationLevel} level
 * @property {string}   code            Ex: "INVALID_DATE", "ZERO_AMOUNT", "UNKNOWN_INSTITUTION"
 * @property {string}   message         Mensagem legível (log / UX)
 * @property {string|undefined}   field         Qual campo falhou
 * @property {unknown|undefined}  rawValue      Valor original da fonte
 * @property {unknown|undefined}  coercedValue  Valor usado em vez (level=coerced)
 * @property {boolean}  recoverable     false → linha descartada (fatal)
 * @property {string|undefined}   ruleId        Identificador da regra que gerou este resultado
 */

// ── Duplicate strategy ────────────────────────────────────────────────────────

/**
 * Estratégia de deduplicação por tipo de entidade.
 * Documentada aqui como referência canônica — implementada em domain/fingerprint.js.
 *
 * @typedef {Object} DuplicateStrategy
 * @property {"skip"|"upsert"|"priority"} action
 *   skip:     descarta o incoming se fingerprint já existe (Transaction, PassiveIncome)
 *   upsert:   substitui o existente, preserva id/createdAt (Holding, CashBalance)
 *   priority: sobrescreve apenas se priority(incoming) >= priority(existing) (Snapshot)
 * @property {string} fingerprintDescription  Documentação do que forma a fingerprint
 */

// Referência canônica das estratégias por entidade:
//
// Transaction:    { action: "skip",     fingerprint: "date + normalizedDesc + amountCents" }
// Holding:        { action: "upsert",   fingerprint: "institutionId + normalizedLabel + YYYY-MM" }
// CashBalance:    { action: "upsert",   fingerprint: "institutionId + accountType + YYYY-MM" }
// PortfolioSnapshot: { action: "priority", fingerprint: "date (YYYY-MM ou YYYY-MM-DD)" }
// PassiveIncome:  { action: "skip",     fingerprint: "YYYY-MM" }

// ── Pipeline metrics & result ─────────────────────────────────────────────────

/**
 * Métricas operacionais de uma etapa do pipeline.
 * Uma entrada por stage em PipelineResult.metrics.
 *
 * @typedef {Object} StageMetrics
 * @property {string}  stageName
 * @property {number}  startedAt    Unix ms
 * @property {number}  completedAt  Unix ms
 * @property {number}  durationMs
 * @property {number}  inputCount
 * @property {number}  outputCount
 * @property {boolean} [failed]     true se o stage lançou erro
 */

/**
 * Resumo de confidence para o conjunto de entidades produzidas.
 *
 * @typedef {Object} ConfidenceSummary
 * @property {number} average      0-1, média das entidades com confidence definido
 * @property {number} min          0-1
 * @property {number} max          0-1
 * @property {number} highCount    Entidades com confidence >= 0.8
 * @property {number} lowCount     Entidades com confidence < 0.5
 * @property {number} totalScored  Quantas entidades tinham confidenceScore definido
 */

/**
 * Resultado completo do pipeline de ingestão.
 * Retornado por IngestionEngine.processFile() e processFiles().
 *
 * @typedef {Object} PipelineResult
 * @property {import("../../domain/types.js").DomainEntity[]} entities    Entidades criadas após deduplicação
 * @property {number}               entitiesCreated     Entidades efetivamente inseridas
 * @property {number}               entitiesSkipped     Duplicatas descartadas
 * @property {number}               duplicatesDetected  Alias de entitiesSkipped
 * @property {ValidationResult[]}   warnings            Todos os warnings de todos os stages
 * @property {PipelineDiagnostic[]} diagnostics         Diagnósticos técnicos (não expor ao usuário)
 * @property {StageMetrics[]}       metrics             Uma entrada por stage executado
 * @property {ConfidenceSummary}    confidenceSummary
 * @property {ImportSessionSummary} sessionSummary      Subconjunto persistível
 * @property {number}               totalDurationMs
 */

// ── Streaming / backpressure hints ───────────────────────────────────────────

/**
 * Chunk de registros para processamento incremental.
 * Hoje os extractors retornam arrays completos. Esta interface prepara
 * o caminho para streaming futuro sem mudar a API dos extractors.
 *
 * Quando houver necessidade de chunking:
 *   - CsvExtractor pode emitir chunks à medida que parseia linhas
 *   - OcrExtractor pode emitir chunks por página
 *   - IngestionEngine pode processar cada chunk incrementalmente
 *
 * @typedef {Object} ExtractionChunk
 * @property {ExtractedRecord[]} records       Lote de registros extraídos
 * @property {number}            chunkIndex    0-based
 * @property {boolean}           isLast        true se este é o último chunk
 * @property {number|undefined}  totalEstimated Estimativa total (pode ser impreciso em streams)
 */

// ── Diagnostics vs UX separation ──────────────────────────────────────────────

/**
 * Diagnóstico técnico do pipeline — para observabilidade interna e debugging.
 * NUNCA exposto diretamente ao usuário (pode conter códigos técnicos, stack traces,
 * valores de campo, nomes de colunas internas).
 *
 * Exemplos de code: "ROW_SKIPPED_INVALID_ISO", "PDF_EXTRACTION_FAILED",
 *                   "OCR_LOW_CONFIDENCE_FIELD", "DUPLICATE_FINGERPRINT_SKIP"
 *
 * @typedef {Object} PipelineDiagnostic
 * @property {string}  code       Ex: "ROW_SKIPPED_INVALID_ISO_DATE"
 * @property {string}  message    Descrição técnica (logs internos — não internacionalizar)
 * @property {unknown} [context]  Dados adicionais: campo, valor, rowIndex, provider
 * @property {"debug"|"info"|"warn"|"error"} severity
 */

/**
 * Mensagem para exibição ao usuário — linguagem simples, sem jargão técnico.
 * Derivada dos PipelineDiagnostics pelo engine. O pipeline NUNCA exibe
 * PipelineDiagnostic.code diretamente ao usuário.
 *
 * Exemplos: "3 linhas não puderam ser importadas por data inválida."
 *           "O arquivo PDF não contém texto legível. Tente exportar para CSV."
 *
 * @typedef {Object} UserFacingMessage
 * @property {"info"|"warning"|"error"} level
 * @property {string}           message     Texto em português, acionável
 * @property {string|undefined} suggestion  Como o usuário pode resolver o problema
 */

// ── Import Session ────────────────────────────────────────────────────────────

/**
 * Ciclo de vida de uma sessão de importação.
 *
 * Transições válidas:
 *   queued      → extracting | cancelled
 *   extracting  → normalizing | failed | cancelled
 *   normalizing → enriching   | failed | cancelled
 *   enriching   → validating  | failed | cancelled
 *   validating  → converting  | failed | cancelled
 *   converting  → completed   | failed
 *   completed   → (terminal)
 *   failed      → queued (retry)
 *   cancelled   → queued (retry)
 *
 * @typedef {"queued"|"extracting"|"normalizing"|"enriching"|"validating"|"converting"|"completed"|"completed_with_warnings"|"failed"|"cancelled"} ImportSessionStatus
 */

/**
 * Resumo de sessão — PERSISTE no WealthState.
 * Compacto por design: sem eventos completos, sem raw data.
 * Retenção futura: manter últimas N sessões ou últimos 90 dias.
 *
 * @typedef {Object} ImportSessionSummary
 * @property {string}   id
 * @property {string}   importedAt        ISO 8601 — início da sessão
 * @property {string|undefined} completedAt
 * @property {ImportSessionStatus} status
 * @property {"csv"|"pdf"|"ocr"|"manual"|"api"|"sync"} sourceType
 * @property {string[]} fileNames
 * @property {string|undefined} institutionId   Detectado automaticamente
 * @property {string|undefined} profileName     Profile usado
 *
 * Contadores agregados
 * @property {number}   rowsRead
 * @property {number}   rowsImported
 * @property {number}   rowsSkipped
 * @property {number}   entitiesCreated
 * @property {number}   duplicatesDetected
 * @property {number}   warningCount
 * @property {number}   errorCount
 *
 * Amostra de warnings para UX (não todos os eventos)
 * @property {string[]} warningMessages  Máx 10 mensagens representativas
 */

/**
 * Sessão completa — APENAS IN-MEMORY (não persiste).
 * Contém todos os eventos do pipeline para debugging.
 * Em dev mode pode ser inspecionada via devtools.
 *
 * @typedef {Object} ImportSession
 * @property {ImportSessionSummary} summary   Subconjunto persistível
 * @property {import("../../import/pipelineLogger.js").PipelineEvent[]} events  Eventos completos
 * @property {ValidationResult[]}  warnings   Todos os warnings (não amostrado)
 * @property {ValidationResult[]}  errors
 * @property {import("../../domain/types.js").DomainEntity[]} [createdEntities]  Futuro
 */

export {};
