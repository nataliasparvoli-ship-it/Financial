/**
 * @fileoverview Profiles de instituição para o pipeline de importação.
 *
 * PROBLEMA RESOLVIDO:
 *   normalizeData.js tinha heurísticas hardcoded por instituição (ex: Nubank
 *   Cartão inverte sinal de gastos; detectado por presença da coluna "categoria").
 *   Isso não escala e não documenta a intenção.
 *
 * SOLUÇÃO:
 *   Cada profile declara explicitamente:
 *     detect(headers)   → como reconhecer o arquivo
 *     datasetDefault    → tipo de dataset quando não há coluna "dataset"
 *     signConvention    → convenção de sinal de valores
 *     columns           → mapeamento de campos canônicos → aliases de coluna
 *
 * CONVENÇÃO DE SINAL (signConvention):
 *   "standard"          Positivo = entrada, negativo = saída (padrão universal)
 *   "expenses_positive" Positivo = SAÍDA (ex: Nubank Cartão, BTG Cartão)
 *   "debit_credit"      Colunas separadas para débito/crédito (Itaú, Bradesco)
 *
 * DATASET DEFAULT (datasetDefault):
 *   Qual dataset o arquivo produz por padrão quando sem coluna "dataset".
 *   "transacoes" | "classe" | "banco" | "patrimonio" | "rendaPassiva"
 *
 * ADICIONANDO UM NOVO PERFIL:
 *   1. Adicione um objeto antes do profile "generic" (último da lista).
 *   2. Implemente detect(headers) que retorne true apenas para esse banco.
 *   3. Defina signConvention e mapeie as colunas mais comuns.
 *   4. Exporte o institutionId correspondente ao institutionRegistry.
 *
 * @module import/institutionProfiles
 */

// ── Aliases genéricos de coluna (fallback para todos os profiles) ─────────────
//
// Campos canônicos → lista de variações de nome de coluna após normalizeKey().
// A ordem importa: primeiro match vence em getFirst().

export const GENERIC_COLS = {
  // Temporal
  date: [
    "data", "date", "dt",
    "data_lancamento", "data_transacao", "data_pagamento",
    "data_operacao", "data_movimentacao",
  ],
  month: ["mes", "mes_", "month", "competencia"],

  // Valores
  amount: [
    "valor", "amount", "value", "vlr",
    "lancamento", "mov", "movimentacao",
  ],
  credit: ["credito", "entrada", "credit"],
  debit:  ["debito", "saida", "debit"],

  // Descrição
  description: [
    "descricao", "desc", "description",
    "historico", "title", "memo", "estabelecimento",
    "nome", "movimento", "titulo", "origem",
  ],

  // Categorização
  category: ["cat", "categoria", "category", "tipo_lancamento"],
  type:     ["tipo", "type", "natureza", "tipo_lancamento"],

  // Conta / instituição
  account: ["conta", "banco", "account", "bank", "origem", "cartao", "identificador"],

  // Portfolio / custódia
  product: [
    "produto", "ativo", "ticker", "papel",
    "nome_ativo", "descricao_ativo", "ativo_nome", "nome",
  ],
  position: [
    "posicao_atual", "posicao", "valor_atual", "valor_de_mercado",
    "saldo_bruto", "saldo_liquido", "financeiro", "pos_financeira", "saldo_atual",
    "valor", "total",
  ],
  assetClass: [
    "classe", "classe_ativo", "classe_de_ativo",
    "tipo", "tipo_ativo", "tipo_de_ativo", "categoria",
    // Individual product name as fallback for "classe" dataset
    "produto", "ativo", "nome", "ticker", "papel",
    "nome_ativo", "descricao_ativo", "ativo_nome",
  ],
};

// ── Tipos ────────────────────────────────────────────────────────────────────

/**
 * @typedef {"standard"|"expenses_positive"|"debit_credit"} SignConvention
 * @typedef {"transacoes"|"classe"|"banco"|"patrimonio"|"rendaPassiva"} DatasetType
 *
 * @typedef {Object} InstitutionProfile
 * @property {string}          id               Canonical institutionId (institutionRegistry)
 * @property {string}          name             Display name (used in logs)
 * @property {DatasetType}     datasetDefault   Default dataset when no "dataset" column
 * @property {SignConvention}  signConvention
 * @property {Partial<typeof GENERIC_COLS>} columns  Per-profile column overrides
 * @property {(headers: string[]) => boolean} detect
 */

// ── Profiles — a ordem importa (primeiro match vence) ────────────────────────

/** @type {InstitutionProfile[]} */
export const INSTITUTION_PROFILES = [

  // ── Nubank Cartão de Crédito ──────────────────────────────────────────────
  // Fonte: nubank.com.br → Fatura → "Baixar fatura" (CSV)
  // Convenção: gastos são POSITIVOS (ao contrário do padrão bancário).
  //   Ex: Mercado Livre R$ 50 → valor = 50 (saída)
  //   Pagamento da fatura    → valor = -50 (entrada)
  // Identifica-se por: tem "categoria"/"category" + "valor", SEM "identificador"
  {
    id: "nubank",
    name: "Nubank Cartão",
    datasetDefault: "transacoes",
    signConvention: "expenses_positive",
    columns: {
      date:        ["data"],
      amount:      ["valor"],
      description: ["descricao", "titulo", "title"],
      category:    ["categoria", "category"],
      account:     [],
    },
    detect: (headers) =>
      (headers.includes("categoria") || headers.includes("category")) &&
      headers.includes("valor") &&
      !headers.includes("identificador"),
  },

  // ── Nubank Conta Corrente ─────────────────────────────────────────────────
  // Fonte: nubank.com.br → Conta → Extrato → "Baixar extrato" (CSV)
  // Convenção: padrão (positivo = entrada, negativo = saída)
  // Identifica-se por: tem "identificador" + "valor"
  {
    id: "nubank",
    name: "Nubank Conta",
    datasetDefault: "transacoes",
    signConvention: "standard",
    columns: {
      date:        ["data"],
      amount:      ["valor"],
      description: ["descricao", "origem"],
      category:    [],
      account:     ["identificador"],
    },
    detect: (headers) =>
      headers.includes("identificador") && headers.includes("valor"),
  },

  // ── XP Custódia ───────────────────────────────────────────────────────────
  // Fonte: XP → Minha Carteira → "Exportar Posição Consolidada" (CSV)
  // Tipo: snapshot de carteira (classe/tipo + posição financeira)
  // Identifica-se por: tem produto/ativo + posição, SEM coluna de data
  {
    id: "xp",
    name: "XP Custódia",
    datasetDefault: "classe",
    signConvention: "standard",
    columns: {
      assetClass: ["tipo", "classe", "tipo_ativo", "categoria", "produto", "ativo", "nome_ativo"],
      position:   ["posicao_atual", "posicao", "valor_atual", "valor_de_mercado",
                   "saldo_bruto", "saldo_liquido", "financeiro", "pos_financeira"],
    },
    detect: (headers) => {
      const hasProduct  = headers.some((h) => ["produto", "ativo", "nome_ativo", "ativo_nome"].includes(h));
      const hasPosition = headers.some((h) =>
        ["posicao_atual", "posicao", "valor_atual", "valor_de_mercado",
         "saldo_bruto", "saldo_liquido", "financeiro"].includes(h));
      const hasDate = headers.some((h) => ["data", "date", "dt", "data_lancamento"].includes(h));
      return hasProduct && hasPosition && !hasDate;
    },
  },

  // ── XP Extrato / Movimentações ────────────────────────────────────────────
  // Fonte: XP → Extrato de Movimentações (CSV)
  // Convenção: padrão
  // Identifica-se por: tem "data_lancamento" ou "data_operacao" + "tipo"
  {
    id: "xp",
    name: "XP Extrato",
    datasetDefault: "transacoes",
    signConvention: "standard",
    columns: {
      date:        ["data_lancamento", "data_operacao", "data"],
      amount:      ["valor", "vlr_lancamento", "financeiro"],
      description: ["descricao", "historico", "produto"],
      category:    ["tipo", "tipo_lancamento", "categoria"],
      account:     ["conta"],
    },
    detect: (headers) =>
      (headers.includes("data_lancamento") || headers.includes("data_operacao")) &&
      (headers.includes("vlr_lancamento") || headers.includes("tipo_lancamento")),
  },

  // ── BTG Extrato / Cartão ──────────────────────────────────────────────────
  // Convenção: gastos positivos (igual Nubank Cartão)
  // Identifica-se por: tem "vlr_lancamento" + "historico" + "data_lancamento"
  {
    id: "btg",
    name: "BTG Extrato",
    datasetDefault: "transacoes",
    signConvention: "expenses_positive",
    columns: {
      date:        ["data", "data_lancamento"],
      amount:      ["valor", "vlr_lancamento"],
      description: ["descricao", "historico", "lancamento"],
      category:    ["tipo_lancamento", "tipo"],
      account:     ["conta"],
    },
    detect: (headers) =>
      headers.includes("historico") &&
      headers.includes("data_lancamento") &&
      !headers.includes("credito") &&
      !headers.includes("identificador"),
  },

  // ── Itaú Extrato ──────────────────────────────────────────────────────────
  // Fonte: Itaú → Extrato (CSV)
  // Convenção: colunas separadas de crédito e débito
  // Identifica-se por: tem "credito" ou "debito" + "historico"
  {
    id: "itau",
    name: "Itaú Extrato",
    datasetDefault: "transacoes",
    signConvention: "debit_credit",
    columns: {
      date:        ["data", "dt"],
      credit:      ["credito", "entrada"],
      debit:       ["debito", "saida"],
      description: ["historico", "descricao", "lancamento"],
      category:    ["categoria", "tipo_lancamento"],
      account:     ["conta", "banco"],
    },
    detect: (headers) =>
      (headers.includes("credito") || headers.includes("debito")) &&
      (headers.includes("historico") || headers.includes("lancamento")) &&
      !headers.includes("mov") && !headers.includes("movimentacao"),
  },

  // ── Bradesco Extrato ──────────────────────────────────────────────────────
  // Convenção: colunas separadas de crédito e débito (similar Itaú)
  // Identifica-se por: tem "debito_" (com underline) ou "credito" + "mov"/"movimentacao"
  {
    id: "bradesco",
    name: "Bradesco Extrato",
    datasetDefault: "transacoes",
    signConvention: "debit_credit",
    columns: {
      date:        ["data", "dt", "data_lancamento"],
      credit:      ["credito", "entrada"],
      debit:       ["debito", "debito_", "saida"],
      description: ["historico", "descricao", "mov", "movimento"],
      category:    ["categoria"],
      account:     ["conta", "agencia"],
    },
    detect: (headers) =>
      (headers.includes("debito_") ||
        (headers.includes("debito") && (headers.includes("mov") || headers.includes("movimento")))),
  },

  // ── C6 Bank ───────────────────────────────────────────────────────────────
  // Identifica-se por: tem "estabelecimento" + "valor"
  {
    id: "c6",
    name: "C6 Bank",
    datasetDefault: "transacoes",
    signConvention: "standard",
    columns: {
      date:        ["data", "data_lancamento"],
      amount:      ["valor", "amount"],
      description: ["descricao", "estabelecimento", "title"],
      category:    ["categoria", "category"],
      account:     ["conta"],
    },
    detect: (headers) =>
      headers.includes("estabelecimento") &&
      (headers.includes("valor") || headers.includes("amount")),
  },

  // ── Inter ─────────────────────────────────────────────────────────────────
  // Identifica-se por: tem "movimentacao" (campo de valor típico do Inter)
  {
    id: "outro_br",
    name: "Inter",
    datasetDefault: "transacoes",
    signConvention: "standard",
    columns: {
      date:        ["data_lancamento", "data"],
      amount:      ["movimentacao", "valor"],
      description: ["descricao", "historico"],
      category:    ["tipo"],
      account:     ["conta"],
    },
    detect: (headers) => headers.includes("movimentacao"),
  },

  // ── Generic (fallback — DEVE ser o último) ────────────────────────────────
  // Tenta todos os aliases possíveis. Retorna institutionId "unknown".
  // Aplicado quando nenhum profile específico deu match.
  {
    id: "unknown",
    name: "Generic",
    datasetDefault: "transacoes",
    signConvention: "standard",
    columns: GENERIC_COLS,
    detect: () => true,
  },
];
