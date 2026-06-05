/**
 * @fileoverview Registry de identidade de ativos financeiros.
 *
 * SEPARAÇÃO EXPLÍCITA DE RESPONSABILIDADES:
 *
 *   assetIdentity.js        → domínio: quem é o ativo? (estável, offline)
 *   [future] marketData.js  → provider: quanto vale? (requer API/internet)
 *   [future] providerMeta.js → provider: metadados externos (B3, CVM, EDGAR)
 *
 *   O registry aqui funciona completamente sem internet.
 *   Preço, cotação e dados de mercado NÃO pertencem a este arquivo.
 *
 * canonicalId:
 *   Formato: "{market}:{normalizedTicker}"
 *   Estável por design — não muda mesmo que o ticker mude (raro, mas existe).
 *   Se um ticker for renomeado (ex: MGLU3 → outro código), o canonicalId
 *   permanece e o novo ticker entra como alias atualizado.
 *
 * ISIN como estabilizador:
 *   ISIN é o identificador mais estável — não muda com splits, mergers, rebranding.
 *   Quando disponível, é a chave primária de deduplicação.
 *   O registry inclui ISINs para os ativos mais comuns.
 *
 * aliases[]:
 *   Mutable: incluem variações históricas de nome, sufixos de mercado (.SA),
 *   fracionário (F), nomes comuns em português, variações de OCR.
 *   O assetIdentityEngine normaliza antes de comparar (normalizeAssetLabel).
 *
 * @module domain/assetIdentity
 */

// ── Tipos ─────────────────────────────────────────────────────────────────────

/**
 * @typedef {"BR"|"US"|"AE"|"EC"|"INTL"|"CRYPTO"} AssetMarket
 *
 * @typedef {Object} AssetIdentity
 * @property {string}      canonicalId    Stable ID. Format: "{market}:{normalizedTicker}"
 *                                        Ex: "br:PETR4", "us:VOO", "crypto:BTC"
 * @property {string}      ticker         Current normalized ticker (can change, canonicalId won't)
 * @property {string}      name           Official full name
 * @property {string[]}    aliases        Known variants: historical tickers, common names, OCR noise
 * @property {import("./types.js").AssetClassId} assetClass
 * @property {AssetMarket} market
 * @property {import("./types.js").Currency}     currency     Primary trading currency
 * @property {string|undefined} isin       International stable identifier (survives ticker changes)
 * @property {string|undefined} cusip      Future: US identifier (CUSIP)
 */

// ── Seed registry ─────────────────────────────────────────────────────────────
//
// Escopo: ativos com ticker/ISIN negociáveis em bolsa.
// Renda fixa (CDB, LCI, LCA) e imóveis NÃO entram aqui —
// são categorias, não identidades de ativo.

/** @type {AssetIdentity[]} */
export const ASSET_REGISTRY = [

  // ── Ações BR — Ibovespa ────────────────────────────────────────────────────

  {
    canonicalId: "br:PETR4",
    ticker: "PETR4",
    name: "Petróleo Brasileiro S.A. — Petrobras PN",
    aliases: ["PETR4.SA", "PETR4F", "PETR3", "PETR3F",
              "Petrobras", "Petróleo Brasileiro", "Petrobras PN", "PETROBRAS PN"],
    assetClass: "acoes_br",
    market: "BR",
    currency: "BRL",
    isin: "BRPETRACNPR6",
  },
  {
    canonicalId: "br:VALE3",
    ticker: "VALE3",
    name: "Vale S.A. ON",
    aliases: ["VALE3.SA", "VALE3F", "Vale", "VALE", "Vale ON",
              "Vale do Rio Doce", "CVRD"],
    assetClass: "acoes_br",
    market: "BR",
    currency: "BRL",
    isin: "BRVALEACNOR6",
  },
  {
    canonicalId: "br:ITUB4",
    ticker: "ITUB4",
    name: "Itaú Unibanco Holding S.A. PN",
    aliases: ["ITUB4.SA", "ITUB4F", "ITUB3",
              "Itaú", "Itau", "Itaú Unibanco", "Itau Unibanco", "ITAU PN"],
    assetClass: "acoes_br",
    market: "BR",
    currency: "BRL",
    isin: "BRITUBACNPR1",
  },
  {
    canonicalId: "br:BBDC4",
    ticker: "BBDC4",
    name: "Banco Bradesco S.A. PN",
    aliases: ["BBDC4.SA", "BBDC4F", "BBDC3",
              "Bradesco", "Banco Bradesco", "BRADESCO PN"],
    assetClass: "acoes_br",
    market: "BR",
    currency: "BRL",
    isin: "BRBBDCACNPR8",
  },
  {
    canonicalId: "br:ABEV3",
    ticker: "ABEV3",
    name: "Ambev S.A. ON",
    aliases: ["ABEV3.SA", "ABEV3F", "Ambev", "AMBEV", "AmBev"],
    assetClass: "acoes_br",
    market: "BR",
    currency: "BRL",
    isin: "BRABEVACNOR1",
  },
  {
    canonicalId: "br:BBAS3",
    ticker: "BBAS3",
    name: "Banco do Brasil S.A. ON",
    aliases: ["BBAS3.SA", "BBAS3F", "Banco do Brasil", "BB ON", "BANCO DO BRASIL"],
    assetClass: "acoes_br",
    market: "BR",
    currency: "BRL",
    isin: "BRBBASACNOR3",
  },
  {
    canonicalId: "br:B3SA3",
    ticker: "B3SA3",
    name: "B3 S.A. — Brasil, Bolsa, Balcão ON",
    aliases: ["B3SA3.SA", "B3SA3F", "B3", "Bolsa", "BOVESPA"],
    assetClass: "acoes_br",
    market: "BR",
    currency: "BRL",
    isin: "BRB3SAACNOR8",
  },
  {
    canonicalId: "br:WEGE3",
    ticker: "WEGE3",
    name: "WEG S.A. ON",
    aliases: ["WEGE3.SA", "WEGE3F", "WEG", "Weg", "WEGE"],
    assetClass: "acoes_br",
    market: "BR",
    currency: "BRL",
    isin: "BRWEGEACNOR0",
  },
  {
    canonicalId: "br:RENT3",
    ticker: "RENT3",
    name: "Localiza Rent a Car S.A. ON",
    aliases: ["RENT3.SA", "RENT3F", "Localiza", "LOCALIZA"],
    assetClass: "acoes_br",
    market: "BR",
    currency: "BRL",
    isin: "BRRNTAACNOR8",
  },
  {
    canonicalId: "br:MGLU3",
    ticker: "MGLU3",
    name: "Magazine Luiza S.A. ON",
    aliases: ["MGLU3.SA", "MGLU3F", "Magazine Luiza", "Magalu", "MAGALU", "MagaLu"],
    assetClass: "acoes_br",
    market: "BR",
    currency: "BRL",
    isin: "BRMGLUBACNOR8",
  },
  {
    canonicalId: "br:SUZB3",
    ticker: "SUZB3",
    name: "Suzano S.A. ON",
    aliases: ["SUZB3.SA", "SUZB3F", "Suzano"],
    assetClass: "acoes_br",
    market: "BR",
    currency: "BRL",
    isin: "BRSUZBACKNOR2",
  },
  {
    canonicalId: "br:LREN3",
    ticker: "LREN3",
    name: "Lojas Renner S.A. ON",
    aliases: ["LREN3.SA", "LREN3F", "Lojas Renner", "Renner"],
    assetClass: "acoes_br",
    market: "BR",
    currency: "BRL",
    isin: "BRLRENACNOR1",
  },
  {
    canonicalId: "br:RADL3",
    ticker: "RADL3",
    name: "Raia Drogasil S.A. ON",
    aliases: ["RADL3.SA", "RADL3F", "Raia Drogasil", "RD Saúde", "RD Saude"],
    assetClass: "acoes_br",
    market: "BR",
    currency: "BRL",
    isin: "BRRADLACNOR0",
  },
  {
    canonicalId: "br:EGIE3",
    ticker: "EGIE3",
    name: "Engie Brasil Energia S.A. ON",
    aliases: ["EGIE3.SA", "EGIE3F", "Engie", "Engie Brasil"],
    assetClass: "acoes_br",
    market: "BR",
    currency: "BRL",
    isin: "BREGIEACNOR9",
  },
  {
    canonicalId: "br:SBSP3",
    ticker: "SBSP3",
    name: "Companhia de Saneamento Básico do Estado de SP ON",
    aliases: ["SBSP3.SA", "SBSP3F", "Sabesp", "SABESP"],
    assetClass: "acoes_br",
    market: "BR",
    currency: "BRL",
    isin: "BRSBSPACNOR4",
  },

  // ── FIIs — Fundos de Investimento Imobiliário ──────────────────────────────

  {
    canonicalId: "br:KNRI11",
    ticker: "KNRI11",
    name: "Kinea Renda Imobiliária FII",
    aliases: ["KNRI11.SA", "KNRI11F", "Kinea", "Kinea Renda", "KINEA RENDA IMOBILIARIA"],
    assetClass: "fiis",
    market: "BR",
    currency: "BRL",
    isin: "BRKNRICTF003",
  },
  {
    canonicalId: "br:XPML11",
    ticker: "XPML11",
    name: "XP Malls FII",
    aliases: ["XPML11.SA", "XPML11F", "XP Malls", "XPMALLS"],
    assetClass: "fiis",
    market: "BR",
    currency: "BRL",
    isin: "BRXPMLCTF001",
  },
  {
    canonicalId: "br:HGLG11",
    ticker: "HGLG11",
    name: "CSHG Logística FII",
    aliases: ["HGLG11.SA", "HGLG11F", "CSHG Logística", "CSHG Logistica"],
    assetClass: "fiis",
    market: "BR",
    currency: "BRL",
    isin: "BRHGLGCTF003",
  },
  {
    canonicalId: "br:BRCR11",
    ticker: "BRCR11",
    name: "BTG Pactual Corporate Office FII",
    aliases: ["BRCR11.SA", "BRCR11F", "BTG Corporativo", "BTG Corporate"],
    assetClass: "fiis",
    market: "BR",
    currency: "BRL",
    isin: "BRBRCRACTF004",
  },
  {
    canonicalId: "br:MXRF11",
    ticker: "MXRF11",
    name: "Maxi Renda FII",
    aliases: ["MXRF11.SA", "MXRF11F", "Maxi Renda"],
    assetClass: "fiis",
    market: "BR",
    currency: "BRL",
    isin: "BRMXRFCTF007",
  },
  {
    canonicalId: "br:VISC11",
    ticker: "VISC11",
    name: "Vinci Shopping Centers FII",
    aliases: ["VISC11.SA", "VISC11F", "Vinci Shopping"],
    assetClass: "fiis",
    market: "BR",
    currency: "BRL",
    isin: "BRVISCCTF000",
  },
  {
    canonicalId: "br:CPTS11",
    ticker: "CPTS11",
    name: "Capitânia Securities II FII",
    aliases: ["CPTS11.SA", "CPTS11F", "Capitânia", "Capitania"],
    assetClass: "fiis",
    market: "BR",
    currency: "BRL",
    isin: "BRCPTSCTF006",
  },

  // ── ETFs BR ────────────────────────────────────────────────────────────────

  {
    canonicalId: "br:BOVA11",
    ticker: "BOVA11",
    name: "iShares IBovespa Fundo de Índice",
    aliases: ["BOVA11.SA", "BOVA11F", "iShares Ibovespa", "Bovespa ETF"],
    assetClass: "etfs",
    market: "BR",
    currency: "BRL",
    isin: "BRBOVACTF001",
  },
  {
    canonicalId: "br:IVVB11",
    ticker: "IVVB11",
    name: "iShares S&P 500 Fundo de Índice BRL",
    aliases: ["IVVB11.SA", "IVVB11F", "iShares S&P 500", "SP500 ETF"],
    assetClass: "etfs",
    market: "BR",
    currency: "BRL",
    isin: "BRIVVBCTF001",
  },
  {
    canonicalId: "br:SMAL11",
    ticker: "SMAL11",
    name: "iShares Small Cap Fundo de Índice",
    aliases: ["SMAL11.SA", "SMAL11F", "Small Cap ETF"],
    assetClass: "etfs",
    market: "BR",
    currency: "BRL",
    isin: "BRSMALCTF008",
  },
  {
    canonicalId: "br:HASH11",
    ticker: "HASH11",
    name: "Hashdex Nasdaq Crypto Index Fundo de Índice",
    aliases: ["HASH11.SA", "HASH11F", "Hashdex", "Crypto Index ETF"],
    assetClass: "etfs",
    market: "BR",
    currency: "BRL",
    isin: "BRHASHCTF002",
  },

  // ── ETFs internacionais (negociados em USD) ────────────────────────────────

  {
    canonicalId: "us:VOO",
    ticker: "VOO",
    name: "Vanguard S&P 500 ETF",
    aliases: ["VOO.US", "Vanguard S&P 500", "Vanguard SP500"],
    assetClass: "etfs",
    market: "US",
    currency: "USD",
    isin: "US9229083632",
  },
  {
    canonicalId: "us:QQQ",
    ticker: "QQQ",
    name: "Invesco QQQ Trust (NASDAQ-100 ETF)",
    aliases: ["QQQ.US", "Invesco QQQ", "NASDAQ 100 ETF", "QQQ ETF"],
    assetClass: "etfs",
    market: "US",
    currency: "USD",
    isin: "US46090E1038",
  },
  {
    canonicalId: "us:VTI",
    ticker: "VTI",
    name: "Vanguard Total Stock Market ETF",
    aliases: ["VTI.US", "Vanguard Total Market"],
    assetClass: "etfs",
    market: "US",
    currency: "USD",
    isin: "US9229087690",
  },
  {
    canonicalId: "us:SPY",
    ticker: "SPY",
    name: "SPDR S&P 500 ETF Trust",
    aliases: ["SPY.US", "SPDR S&P 500", "Spider ETF"],
    assetClass: "etfs",
    market: "US",
    currency: "USD",
    isin: "US78462F1030",
  },
  {
    canonicalId: "intl:VWRA",
    ticker: "VWRA",
    name: "Vanguard FTSE All-World UCITS ETF (USD, Acc)",
    aliases: ["VWRA.L", "VWRP", "Vanguard All World", "VWRL"],
    assetClass: "acoes_int",
    market: "INTL",
    currency: "USD",
    isin: "IE00BK5BQT80",
  },

  // ── Cripto ────────────────────────────────────────────────────────────────

  {
    canonicalId: "crypto:BTC",
    ticker: "BTC",
    name: "Bitcoin",
    aliases: ["BTC", "BITCOIN", "Bitcoin", "XBT"],
    assetClass: "cripto",
    market: "CRYPTO",
    currency: "USD",
    isin: undefined,
  },
  {
    canonicalId: "crypto:ETH",
    ticker: "ETH",
    name: "Ethereum",
    aliases: ["ETH", "ETHEREUM", "Ethereum", "Ether"],
    assetClass: "cripto",
    market: "CRYPTO",
    currency: "USD",
    isin: undefined,
  },
  {
    canonicalId: "crypto:SOL",
    ticker: "SOL",
    name: "Solana",
    aliases: ["SOL", "SOLANA", "Solana"],
    assetClass: "cripto",
    market: "CRYPTO",
    currency: "USD",
    isin: undefined,
  },
];

// ── Lookups pré-computados (O(1)) ─────────────────────────────────────────────

/** @type {Map<string, AssetIdentity>} canonicalId → asset */
export const REGISTRY_BY_CANONICAL_ID = new Map(
  ASSET_REGISTRY.map((a) => [a.canonicalId, a]),
);

/** @type {Map<string, AssetIdentity>} isin → asset */
export const REGISTRY_BY_ISIN = new Map(
  ASSET_REGISTRY
    .filter((a) => a.isin)
    .map((a) => [a.isin, a]),
);

/** @type {Map<string, AssetIdentity>} normalizedTicker → asset */
export const REGISTRY_BY_TICKER = new Map(
  ASSET_REGISTRY.map((a) => [a.ticker.toLowerCase(), a]),
);
