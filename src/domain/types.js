/**
 * @fileoverview Definições de tipo centrais do domínio financeiro.
 *
 * Hierarquia de entidades:
 *
 *   Institution (registry — somente leitura, nunca persistido)
 *   AssetClass  (registry — somente leitura, nunca persistido)
 *       └── Holding       ← posição financeira (investimento)
 *   CashBalance            ← liquidez / saldo em conta
 *   PortfolioSnapshot      ← fotografia temporal do patrimônio
 *   Transaction            ← evento de fluxo de caixa
 *   PassiveIncomeRecord    ← renda passiva mensal
 *   Goal                   ← meta financeira do usuário
 *
 * Regras:
 *   • Nenhuma entidade persistida armazena cor, label ou ícone —
 *     esses dados vêm sempre dos registries.
 *   • Todo valor monetário carrega `currency` + `valueBRL` explícitos.
 *   • Todo campo temporal usa ISO 8601 (YYYY-MM-DD).
 *   • IDs são UUIDs estáveis, nunca derivados de índice.
 */

// ── Enums e literais ───────────────────────────────────────────────────────

/**
 * Moedas suportadas.
 * @typedef {"BRL"|"USD"|"AED"|"EUR"|"GBP"} Currency
 */

/**
 * IDs canônicos de classe de ativo.
 * Mapeados no assetClassRegistry — nunca usar strings literais fora do registry.
 * @typedef {"renda_fixa"|"tesouro"|"acoes_br"|"acoes_int"|"fiis"|"etfs"|"previdencia"|"caixa"|"cripto"|"imoveis"|"custom"} AssetClassId
 */

/**
 * Precisão da data de um snapshot.
 * "day"   = data exata (import com data, OCR com data explícita)
 * "month" = data aproximada (migrado de "mes: Jan" sem ano)
 * @typedef {"day"|"month"} DatePrecision
 */

/**
 * Origem do dado no sistema.
 * @typedef {"imported"|"manual"|"ocr"|"sync"|"migrated"|"derived"} DataSource
 */

/**
 * Tipo de transação financeira.
 * @typedef {"income"|"expense"|"investment"|"transfer"|"passive_income"} TransactionKind
 */

/**
 * Confiança do OCR na extração.
 * @typedef {"high"|"medium"|"low"} OcrConfidence
 */

// ── Entidades de domínio ───────────────────────────────────────────────────

/**
 * Holding — posição em um ativo financeiro num ponto no tempo.
 * É a entidade central do domínio patrimonial.
 *
 * @typedef {Object} Holding
 * @property {string}          id                  UUID estável
 * @property {AssetClassId}    assetClassId         Vínculo com assetClassRegistry
 * @property {"allocation"|"position"|undefined} holdingKind
 *                                                  "allocation" = class-level bucket (no product identity,
 *                                                    entered via PatrimonioPanel or CSV classe[] imports).
 *                                                  "position"   = named product (CDB, KNRI11, OCR item).
 *                                                  undefined    = legacy / migrated — treated as "position".
 *                                                  Allocation holdings appear in wealth views (allocation bars,
 *                                                  institution cards, net worth) but NOT in the Investments
 *                                                  position list.
 * @property {string}          label                "CDB XP 12% ao ano", "KNRI11"
 * @property {string|undefined} ticker              "PETR4", "KNRI11" — apenas ações/ETFs
 * @property {string|undefined} canonicalAssetId   Ex: "br:PETR4", "us:VOO". Resolvido pelo assetIdentityEngine.
 *                                                  undefined se ativo não reconhecido no registry.
 * @property {string}          institutionId        "xp" | "nubank" | "unknown"
 * @property {string}          institutionLabel     Denormalizado: "XP Investimentos"
 * @property {number|undefined} quantity            Qtd de cotas/ações
 * @property {number|undefined} pricePerUnit        Preço unitário na data do snapshot
 * @property {number}          value                Valor na moeda nativa
 * @property {Currency}        currency             Moeda nativa
 * @property {number}          valueBRL             Valor convertido para BRL
 * @property {number|undefined} fxRateUsed          Taxa de câmbio utilizada
 * @property {DataSource}      source
 * @property {string}          snapshotDate         ISO 8601: "2026-01-15"
 * @property {DatePrecision}   datePrecision
 * @property {string}          createdAt            ISO 8601
 * @property {string}          updatedAt            ISO 8601
 * @property {OcrConfidence|undefined} ocrConfidence
 * @property {string|undefined} notes
 * @property {Record<string,string>|undefined} rawImport  Campos brutos preservados
 *
 * Eventual consistency (multi-source)
 * @property {string|undefined} sourceId        ID externo da origem (API / OCR / CSV row)
 * @property {string|undefined} importedAt      ISO 8601 — quando entrou no sistema pela 1ª vez
 * @property {string|undefined} lastSyncedAt    ISO 8601 — quando foi verificado na fonte pela última vez
 * @property {number|undefined} confidenceScore Confiança 0–1 (OCR, AI inference); undefined = desconhecido
 */

/**
 * CashBalance — saldo de liquidez em conta corrente, poupança ou conta investimento.
 * Separado de Holding: representa dinheiro disponível, não alocado.
 *
 * @typedef {Object} CashBalance
 * @property {string}        id
 * @property {string}        institutionId
 * @property {string}        institutionLabel
 * @property {"checking"|"savings"|"investment_account"} accountType
 * @property {string|undefined} label          "Conta corrente", "Conta investimento XP"
 * @property {number}        balance
 * @property {Currency}      currency
 * @property {number}        balanceBRL
 * @property {number|undefined} fxRateUsed
 * @property {DataSource}    source
 * @property {string}        snapshotDate     ISO 8601
 * @property {DatePrecision} datePrecision
 * @property {string}        createdAt
 * @property {string}        updatedAt
 *
 * Eventual consistency (multi-source)
 * @property {string|undefined} sourceId
 * @property {string|undefined} importedAt
 * @property {string|undefined} lastSyncedAt
 * @property {number|undefined} confidenceScore
 */

/**
 * PortfolioSnapshot — fotografia do patrimônio num ponto no tempo.
 * Imutável após criação. Breakdowns pré-calculados para performance dos gráficos.
 *
 * @typedef {Object} PortfolioSnapshot
 * @property {string}   id
 * @property {string}   date              ISO 8601: "2026-01-31"
 * @property {number}   totalBRL
 * @property {Partial<Record<AssetClassId, number>>} byAssetClass
 * @property {Record<string, number>}               byInstitution
 * @property {DataSource}    source
 * @property {DatePrecision} datePrecision
 * @property {string}   createdAt
 */

/**
 * Transaction — evento de fluxo de caixa (movimentação).
 *
 * @typedef {Object} Transaction
 * @property {string}          id
 * @property {string}          date          ISO 8601
 * @property {number}          year          Extraído da date — filtro rápido
 * @property {number}          month         1–12 — filtro rápido
 * @property {string}          monthLabel    "Jan" — compatibilidade com gráficos
 * @property {number}          amount        Negativo = saída
 * @property {Currency}        currency
 * @property {number}          amountBRL
 * @property {TransactionKind} kind
 * @property {string}          category
 * @property {string|undefined} subcategory
 * @property {string}          description
 * @property {string|undefined} institutionId
 * @property {string|undefined} accountRef    Campo "conta" original preservado
 * @property {"auto"|"user"|"fallback"} categorySource
 * @property {string|undefined} normalizedMerchant
 * @property {string|undefined} categoryRuleId
 * @property {string}          createdAt
 *
 * Eventual consistency (multi-source)
 * @property {string|undefined} sourceId
 * @property {string|undefined} importedAt
 * @property {string|undefined} lastSyncedAt
 * @property {number|undefined} confidenceScore
 */

/**
 * PassiveIncomeRecord — renda passiva de um mês específico.
 *
 * @typedef {Object} PassiveIncomeRecord
 * @property {string}     id
 * @property {string}     date       ISO 8601: "2026-01-01" (primeiro do mês)
 * @property {number}     year
 * @property {number}     month      1–12
 * @property {string}     monthLabel "Jan"
 * @property {number}     dividends
 * @property {number}     interest
 * @property {number}     coupons
 * @property {number}     other
 * @property {number}     total      Gravado, não derivado — integridade garantida
 * @property {Currency}   currency
 * @property {DataSource} source
 *
 * Eventual consistency (multi-source)
 * @property {string|undefined} sourceId
 * @property {string|undefined} importedAt
 * @property {string|undefined} lastSyncedAt
 * @property {number|undefined} confidenceScore
 */

/**
 * Goal — meta financeira do usuário (entidade de domínio no WealthState).
 *
 * Mapping to future-proof schema (for eventual multi-goal UI):
 *   kind           ≅ type       ("net_worth" | "passive_income" | "savings_rate" | "purchase" | "emergency_fund" | "custom")
 *   label          ≅ title
 *   targetAmountBRL ≅ targetValue in BRL  (currency field makes it explicit)
 *   targetDate     carries targetYear as "YYYY-01-01" ISO string
 *
 * AppContext goals (auren.goals.v1) use a parallel informal schema:
 *   { id, type, label, icon, targetValue, targetYear, currentValue, status, currency, createdAt }
 *   These are onboarding-created goals. `targetYear` is the canonical year field.
 *   Source of truth for Wealth Coach: appPatrimonyGoal.targetYear (falls back to AppContext.goalTargetYear).
 *
 * @typedef {Object} Goal
 * @property {string}  id
 * @property {"net_worth"|"passive_income"|"savings_rate"|"purchase"|"emergency_fund"|"custom"} kind
 * @property {string}  label
 * @property {string|undefined} icon
 * @property {number}  targetAmountBRL
 * @property {string|undefined} targetDate   ISO 8601 "YYYY-01-01" — deadline year
 * @property {boolean} isPrimary
 * @property {"active"|"achieved"|"paused"} status
 * @property {"BRL"|"USD"|"AED"|"EUR"|"GBP"} currency
 * @property {string}  createdAt
 */

/**
 * WealthState — raiz do domínio financeiro unificado.
 * Persiste em "vyta.wealth.v2".
 *
 * @typedef {Object} WealthState
 * @property {2}                    schemaVersion
 * @property {string|null}          migratedAt       ISO 8601 ou null
 * @property {Holding[]}            holdings
 * @property {CashBalance[]}        cashBalances
 * @property {PortfolioSnapshot[]}  snapshots
 * @property {Transaction[]}        transactions
 * @property {PassiveIncomeRecord[]} passiveIncome
 * @property {Goal[]}               goals
 * @property {string[]}             imageRegistry    Fingerprints de imagens OCR
 */

/**
 * Tipo union de todas as entidades de domínio persistíveis.
 * Usado no DomainConverter e no ImportSession para tipar saída do pipeline.
 *
 * @typedef {Holding | Transaction | CashBalance | PortfolioSnapshot | PassiveIncomeRecord} DomainEntity
 */

// ── Tipos legados (bridge — a serem removidos no Sprint 3) ─────────────────

/**
 * @typedef {Object} LegacyAsset
 * @property {string}  id
 * @property {string}  classe
 * @property {number}  valor
 * @property {string=} cor
 * @property {string=} source
 */

/**
 * @typedef {Object} LegacyBankBalance
 * @property {string} id
 * @property {string} banco
 * @property {number} valor
 * @property {string=} source
 */

/**
 * @typedef {Object} LegacyPatrimonioPoint
 * @property {string} id
 * @property {string} mes
 * @property {number} total
 */

/**
 * @typedef {Object} LegacyImportedData
 * @property {Object[]}              transacoes
 * @property {LegacyPatrimonioPoint[]} patrimonio
 * @property {LegacyAsset[]}         classe
 * @property {LegacyBankBalance[]}   banco
 * @property {Object[]}              rendaPassiva
 */

export {};
