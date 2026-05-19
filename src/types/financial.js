/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} data
 * @property {string} mes
 * @property {string} cat
 * @property {string=} subcat
 * @property {string} desc
 * @property {string} tipo
 * @property {number} valor
 * @property {string} conta
 * @property {"imported"|"auto"|"fallback"=} categorySource
 * @property {string|null=} categoryRuleId
 * @property {string=} normalizedMerchant
 * @property {boolean=} categoryMatched
 */

/**
 * @typedef {Object} Asset
 * @property {string} id
 * @property {string} classe
 * @property {number} valor
 * @property {string=} cor
 */

/**
 * @typedef {Object} BankBalance
 * @property {string} id
 * @property {string} banco
 * @property {number} valor
 */

/**
 * @typedef {Object} PatrimonioPoint
 * @property {string} id
 * @property {string} mes
 * @property {number} total
 */

/**
 * @typedef {Object} PassiveIncome
 * @property {string} id
 * @property {string} mes
 * @property {number} dividendos
 * @property {number} juros
 * @property {number} cupom
 * @property {number} outros
 * @property {number=} total
 */

/**
 * @typedef {Object} ImportedFinancialData
 * @property {Transaction[]} transacoes
 * @property {PatrimonioPoint[]} patrimonio
 * @property {Asset[]} classe
 * @property {BankBalance[]} banco
 * @property {PassiveIncome[]} rendaPassiva
 */

/**
 * @typedef {Object} MonthlyKpis
 * @property {number} rendaMes
 * @property {number} despesaMes
 * @property {number} aporteMes
 * @property {number} saldoMes
 * @property {number} coberturaPassiva
 * @property {number} progresso
 */

/**
 * @typedef {Object} CategorizationStats
 * @property {number} autoCategorized
 * @property {number} unmatched
 * @property {Record<string, number>} topCategories
 */

/**
 * @typedef {Object} ImportWarning
 * @property {string} code
 * @property {string} message
 * @property {string=} dataset
 * @property {string=} file
 */

/**
 * @typedef {Object} ParsedFileResult
 * @property {string} file
 * @property {Record<string, string>[]} rows
 * @property {number} invalidRows
 * @property {string|null=} delimiter
 * @property {string=} warning
 * @property {CategorizationStats=} categorization
 */

export {};
