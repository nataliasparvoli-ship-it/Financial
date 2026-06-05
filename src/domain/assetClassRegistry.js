/**
 * @fileoverview Registry centralizado de classes de ativo.
 *
 * REGRAS:
 *   • Cor, label, ícone e aliases vivem APENAS aqui.
 *   • Entidades persistidas (Holding, etc.) referenciam apenas o `id`.
 *   • Nenhum componente deve ter arrays/maps de cores ou labels de classe.
 *   • Para adicionar suporte a um novo tipo: adicionar entrada aqui.
 *
 * @module assetClassRegistry
 */

// ── Definição do registry ──────────────────────────────────────────────────

/**
 * @typedef {Object} AssetClassDef
 * @property {string}   id            Identificador canônico
 * @property {string}   label         Label em português para exibição
 * @property {string}   color         Hex color canônica
 * @property {string}   emoji         Emoji representativo (fallback visual)
 * @property {number}   displayOrder  Ordem de exibição (menor = primeiro)
 * @property {"BR"|"global"} region   Contexto geográfico principal
 * @property {string|null}  parentId  ID da classe pai (hierarquia)
 * @property {string[]} importAliases Strings que mapeiam para este ID no import/OCR
 */

/** @type {Record<string, AssetClassDef>} */
export const ASSET_CLASS_REGISTRY = {
  renda_fixa: {
    id: "renda_fixa",
    label: "Renda Fixa",
    color: "#34d399",
    emoji: "💰",
    displayOrder: 1,
    region: "BR",
    parentId: null,
    importAliases: [
      "renda fixa", "renda-fixa", "rf",
      "cdb", "lci", "lca", "lci/lca", "lca/lci",
      "debenture", "debênture", "debentures",
      "cri", "cra", "cri/cra", "cra/cri",
      "poupanca", "poupança",
      "compromissadas", "compromissada",
      "fundos renda fixa", "fundo rf", "fundo de renda fixa",
      "rdb", "rdb banco",
      "fundos", "fundo",               // OCR genérico → renda fixa é o mais comum
      "fundo multimercado",
      // Instrumentos não cobertos antes — causavam queda em "custom" (Part 3 fix)
      "lc", "letra de cambio", "letra de câmbio",
      "lf", "letra financeira",
      "lig", "letra imobiliaria garantida", "letra imobiliária garantida",
      "coe", "certificado de operacoes estruturadas",
      "ccb", "cedula de credito bancario",
      "dpge", "letras",
    ],
  },

  tesouro: {
    id: "tesouro",
    label: "Tesouro Direto",
    color: "#60a5fa",
    emoji: "🏛️",
    displayOrder: 2,
    region: "BR",
    parentId: "renda_fixa",
    importAliases: [
      "tesouro direto", "tesouro", "td",
      "ntnb", "ntn-b", "ntn b",
      "lft", "ltn",
      "tesouro selic", "tesouro ipca", "tesouro prefixado",
      "tesouro igpm", "tesouro educa+", "tesouro renda+",
    ],
  },

  acoes_br: {
    id: "acoes_br",
    label: "Ações BR",
    color: "#f87171",
    emoji: "📈",
    displayOrder: 3,
    region: "BR",
    parentId: null,
    importAliases: [
      "ações", "acoes", "acao", "ação",
      "ações br", "acoes br",
      "renda variável", "renda variavel", "rv", "rv br",
      "ações nacionais", "bolsa",
    ],
  },

  acoes_int: {
    id: "acoes_int",
    label: "Exterior",
    color: "#38bdf8",
    emoji: "🌍",
    displayOrder: 4,
    region: "global",
    parentId: null,
    importAliases: [
      "exterior", "ações internacionais", "acoes internacionais",
      "bdr", "bdrs", "stocks", "equities",
      "etf internacional", "etf int",
      "ações ext", "rv int",
      "international equities", "us stocks",
      "ações eua", "ações usa",
    ],
  },

  fiis: {
    id: "fiis",
    label: "FIIs",
    color: "#a78bfa",
    emoji: "🏢",
    displayOrder: 5,
    region: "BR",
    parentId: null,
    importAliases: [
      "fii", "fiis",
      "fundo imobiliario", "fundo imobiliário",
      "fundos imobiliarios", "fundos imobiliários",
      "fi-infra", "fiinfra",
      "fundo de investimento imobiliario",
    ],
  },

  etfs: {
    id: "etfs",
    label: "ETFs",
    color: "#fb923c",
    emoji: "📊",
    displayOrder: 6,
    region: "global",
    parentId: null,
    importAliases: [
      "etf", "etfs",
      "bova11", "ivvb11",
      "fundos de indice", "fundos de índice",
      "etf nacional", "etf global",
    ],
  },

  fundos: {
    id: "fundos",
    label: "Fundos",
    color: "#f59e0b",
    emoji: "📋",
    displayOrder: 7,
    region: "BR",
    parentId: null,
    importAliases: [
      "fundo multimercado", "multimercado",
      "fundo de acoes", "fundo de ações", "fundo acao", "fundo ação",
      "fundo di", "fundo cdi",
      "fundo cambial",
      "fundo de credito", "fundo de crédito",
      "ficfi", "fim", "fic",
    ],
  },

  previdencia: {
    id: "previdencia",
    label: "Previdência",
    color: "#fbbf24",
    emoji: "🛡️",
    displayOrder: 8,
    region: "BR",
    parentId: null,
    importAliases: [
      "previdencia", "previdência",
      "pgbl", "vgbl",
      "plano de previdencia", "plano de previdência",
      "previdencia privada", "previdência privada",
      "previdência complementar",
    ],
  },

  caixa: {
    id: "caixa",
    label: "Caixa",
    color: "#94a3b8",
    emoji: "🏦",
    displayOrder: 9,
    region: "global",
    parentId: null,
    importAliases: [
      "caixa", "cash", "conta corrente", "checking",
      "saldo", "disponivel", "disponível",
      "dinheiro", "conta",
      // Contas digitais com liquidez diária — mapeiam para caixa, não renda fixa
      "conta remunerada", "conta rendimento", "conta digital",
      "saldo em conta", "caixa e equivalentes",
    ],
  },

  cripto: {
    id: "cripto",
    label: "Cripto",
    color: "#e879f9",
    emoji: "₿",
    displayOrder: 10,
    region: "global",
    parentId: null,
    importAliases: [
      "cripto", "crypto", "criptomoeda", "criptomoedas",
      "bitcoin", "btc", "ethereum", "eth", "solana", "sol",
      "criptoativos", "criptoativo",
      "digital assets", "ativos digitais",
    ],
  },

  imoveis: {
    id: "imoveis",
    label: "Imóveis",
    color: "#84cc16",
    emoji: "🏠",
    displayOrder: 11,
    region: "global",
    parentId: null,
    importAliases: [
      "imovel", "imóvel", "imoveis", "imóveis",
      "real estate", "property",
      "imovel fisico", "imóvel físico",
    ],
  },

  custom: {
    id: "custom",
    // "Outros Ativos" is clearer than "Personalizado" in allocation charts:
    //   - "Personalizado" implies deliberate choice; most items here are unclassified fallbacks
    //   - "Outros Ativos" is standard Brazilian financial terminology for catch-all/unclassified
    // In the Add Asset dropdown this also works: "Other Assets" is a valid user-facing category.
    label: "Outros Ativos",
    color: "#475569",
    emoji: "◦",
    displayOrder: 99,
    region: "global",
    parentId: null,
    importAliases: [
      "custom", "personalizado",
      "outro", "outros", "other", "others",
      "outros ativos",
    ],
  },
};

// ── Lookup helpers ─────────────────────────────────────────────────────────

/**
 * Resolve um rótulo bruto para um AssetClassId canônico.
 * Tenta match exato nos aliases primeiro, depois substring.
 * Retorna "custom" se nenhum match for encontrado.
 *
 * @param {string|null|undefined} rawLabel
 * @returns {import("./types.js").AssetClassId}
 */
export const resolveAssetClass = (rawLabel) => {
  if (!rawLabel) return "custom";
  const normalized = String(rawLabel).toLowerCase().trim();
  if (!normalized) return "custom";

  // 1. Match exato nos aliases
  for (const cls of Object.values(ASSET_CLASS_REGISTRY)) {
    if (cls.importAliases.includes(normalized)) return cls.id;
  }

  // 2. Substring match (ex: "CDB XP 12%" → contains "cdb")
  // Itera por displayOrder para preferir classes mais específicas
  const sorted = assetClassList();
  for (const cls of sorted) {
    if (cls.importAliases.some((alias) => normalized.includes(alias))) return cls.id;
  }

  return "custom";
};

/**
 * Retorna a definição de uma classe de ativo pelo ID.
 * Fallback para "custom" se ID desconhecido.
 *
 * @param {string} id
 * @returns {AssetClassDef}
 */
export const getAssetClass = (id) =>
  ASSET_CLASS_REGISTRY[id] ?? ASSET_CLASS_REGISTRY.custom;

/**
 * Retorna todas as classes ordenadas por displayOrder.
 * @returns {AssetClassDef[]}
 */
export const assetClassList = () =>
  Object.values(ASSET_CLASS_REGISTRY)
    .sort((a, b) => a.displayOrder - b.displayOrder);

/**
 * Retorna mapa de label → color para compatibilidade com gráficos legacy.
 * @returns {Record<string, string>}
 */
export const assetClassColorMap = () =>
  Object.fromEntries(
    Object.values(ASSET_CLASS_REGISTRY).map((cls) => [cls.label, cls.color]),
  );

/**
 * Retorna array de { label, color } para uso no InvestmentsTab e seletores de UI.
 * @returns {Array<{id: string, label: string, color: string, emoji: string}>}
 */
export const assetClassOptions = () =>
  assetClassList().map(({ id, label, color, emoji }) => ({ id, label, color, emoji }));
