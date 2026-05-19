// Sistema de regras expandido para banking brasileiro
// Prioridade: 200+ = crítico, 100-199 = alto, 50-99 = médio, 1-49 = baixo

export const CATEGORY_RULES = [

  // ── INVESTIMENTOS (aplicações) ─────────────────────────────────────────────
  {
    id: "aplicacao-rdb-cdb",
    category: "Investimentos",
    priority: 220,
    matchType: "includes",
    match: ["aplicacao rdb", "aplicação rdb", "aplicacao cdb", "aplicação cdb",
            "aplicacao tesouro", "aplicação tesouro", "aplicacao fundo",
            "aporte rdb", "aporte cdb", "compra tesouro", "compra cdb",
            "nuinvest", "nu invest", "xp investimentos", "btg investimentos",
            "aplicacao lcx", "aplicação lcx", "aplicacao lca", "aplicação lca",
            "aplicacao lci", "aplicação lci", "aplicacao debenture",
            "transferencia para investimento", "transferência para investimento"],
  },
  {
    id: "ted-doc-investimento",
    category: "Investimentos",
    priority: 200,
    matchType: "includes",
    match: ["ted para xp", "ted para btg", "ted para rico", "ted para clear",
            "ted para easynvest", "pix para xp investimentos"],
  },

  // ── RENDA PASSIVA (resgates, rendimentos) ──────────────────────────────────
  {
    id: "resgate-rendimento",
    category: "Renda Passiva",
    priority: 220,
    matchType: "includes",
    match: ["resgate rdb", "resgate cdb", "resgate fundo", "resgate tesouro",
            "resgate lci", "resgate lca", "rendimento rdb", "rendimento cdb",
            "rendimento fundo", "juros rdb", "juros cdb", "rendimento tesouro",
            "credito em conta", "crédito em conta", "pagamento cupom",
            "pagamento juros", "dividendos", "jcp", "proventos"],
  },

  // ── SALÁRIO / RENDA ATIVA ──────────────────────────────────────────────────
  {
    id: "salario",
    category: "Renda Ativa",
    priority: 210,
    matchType: "includes",
    match: ["salario", "salário", "folha de pagamento", "pagamento de salario",
            "pagamento de salário", "pro labore", "pró-labore", "remuneracao",
            "remuneração", "13o salario", "13° salario", "ferias", "férias",
            "bonus", "bônus", "participacao lucros", "participação nos lucros"],
  },
  {
    id: "freelance-pj",
    category: "Renda Ativa",
    priority: 190,
    matchType: "includes",
    match: ["nota fiscal servico", "nota fiscal serviço", "pagamento nf",
            "pagamento nota", "honorarios", "honorários"],
  },

  // ── PAGAMENTOS / FATURA ────────────────────────────────────────────────────
  {
    id: "fatura-cartao",
    category: "Fatura Cartão",
    priority: 210,
    matchType: "includes",
    match: ["pagamento de fatura", "pagamento fatura", "fatura cartao",
            "fatura cartão", "pag fatura", "pgt fatura", "vencimento fatura"],
  },
  {
    id: "boleto",
    category: "Outros",
    priority: 180,
    matchType: "includes",
    match: ["boleto", "pagamento de boleto", "pgto boleto", "pag boleto",
            "codigo de barras", "código de barras"],
  },

  // ── TRANSPORTE ─────────────────────────────────────────────────────────────
  {
    id: "transporte-publico",
    category: "Transporte",
    priority: 200,
    matchType: "includes",
    match: ["autopass", "atm tmob", "bilhete unico", "bilhete único",
            "sptrans", "metro sp", "metrô sp", "brt", "vlt",
            "recarga cartao transporte", "recarga cartão transporte",
            "stm bilhete", "cartao bom", "cartão bom"],
  },
  {
    id: "ride-apps",
    category: "Transporte",
    priority: 190,
    matchType: "includes",
    match: ["uber trip", "uber", "99 tecnologia", "99 app",
            "taxi", "táxi", "cabify", "indriver", "in driver", "lyft"],
  },
  {
    id: "combustivel-veiculo",
    category: "Transporte",
    priority: 160,
    matchType: "includes",
    match: ["combustivel", "combustível", "posto ", "gasolina", "etanol",
            "diesel", "ipva", "dpvat", "detran", "emplacamento",
            "estacionamento", "estacion", "pedagio", "pedágio",
            "sem parar", "veloe", "conectcar", "move mais",
            "manutencao veiculo", "mecanica", "mecânica", "borracharia",
            "licenciamento", "vistoria"],
  },

  // ── ALIMENTAÇÃO ────────────────────────────────────────────────────────────
  {
    id: "delivery",
    category: "Alimentação",
    priority: 200,
    matchType: "includes",
    match: ["ifood", "uber eats", "rappi", "aiqfome",
            "james delivery", "loggi", "zapp delivery"],
  },
  {
    id: "supermercado",
    category: "Alimentação",
    priority: 180,
    matchType: "includes",
    match: ["supermercado", "mercado ", "atacadao", "atacadão", "carrefour",
            "extra ", "pao de acucar", "pão de açúcar", "hortifruti",
            "mini mercado", "minimercado", "mercearia", "quitanda",
            "feira ", "sacolao", "sacolão", "bompreco", "bom preco",
            "walmart", "sam's club", "costco", "makro"],
  },
  {
    id: "restaurante-lanche",
    category: "Alimentação",
    priority: 160,
    matchType: "includes",
    match: ["restaurante", "padaria", "lanchonete", "lanche",
            "forneria", "pizzaria", "hamburger", "hambúrguer",
            "sushi", "japanese", "churrascaria", "acai", "açaí",
            "sorvete", "cafeteria", "cafe ", "café ", "bar ",
            "petisco", "snack", "mc donalds", "mcdonalds", "burger king",
            "subway", "outback", "bob's", "bobs "],
  },

  // ── SAÚDE ──────────────────────────────────────────────────────────────────
  {
    id: "farmacia",
    category: "Saúde",
    priority: 190,
    matchType: "includes",
    match: ["farmacia", "farmácia", "drogaria", "droga",
            "ultrafarma", "drogasil", "drogaraia", "drogaria sao paulo",
            "panvel", "pacheco", "nissei"],
  },
  {
    id: "saude-servicos",
    category: "Saúde",
    priority: 170,
    matchType: "includes",
    match: ["medico", "médico", "hospital", "clinica", "clínica",
            "laboratorio", "laboratório", "exame ", "consulta",
            "plano saude", "plano de saúde", "unimed", "bradesco saude",
            "sulamerica saude", "amil", "hapvida", "notredame",
            "dentista", "odonto", "ortodontia",
            "psicologo", "psicólogo", "psiquiatra", "terapia",
            "fisioterapia", "fisioterapeuta", "nutricionista",
            "gympass", "totalpass", "academia", "smart fit", "bodytech",
            "crossfit", "pilates"],
  },

  // ── MORADIA ────────────────────────────────────────────────────────────────
  {
    id: "moradia-fixo",
    category: "Moradia",
    priority: 190,
    matchType: "includes",
    match: ["aluguel", "condominio", "condomínio", "iptu",
            "seguro residencial", "seguro incendio", "seguro incêndio"],
  },
  {
    id: "utilidades",
    category: "Moradia",
    priority: 170,
    matchType: "includes",
    match: ["agua ", "água ", "sabesp", "cedae", "sanepar", "embasa",
            "energia eletrica", "energia elétrica", "enel", "cemig",
            "cpfl", "eletropaulo", "coelba", "celpe", "copel",
            "gas encanado", "gás encanado", "comgas", "gas natural",
            "internet ", "vivo fibra", "claro residencial", "oi fibra",
            "tim fibra", "net claro", "live tim"],
  },

  // ── ASSINATURAS / STREAMING ────────────────────────────────────────────────
  {
    id: "streaming",
    category: "Assinaturas",
    priority: 190,
    matchType: "includes",
    match: ["netflix", "spotify", "apple one", "apple music",
            "disney plus", "disney+", "hbo max", "globoplay",
            "amazon prime", "prime video", "youtube premium",
            "deezer", "tidal", "twitch", "crunchyroll",
            "paramount plus", "star plus", "apple tv"],
  },
  {
    id: "telefonia",
    category: "Assinaturas",
    priority: 160,
    matchType: "includes",
    match: ["claro movel", "claro móvel", "vivo movel", "vivo móvel",
            "tim movel", "tim móvel", "oi movel", "oi móvel",
            "nextel", "fatura celular", "recarga celular"],
  },
  {
    id: "software-saas",
    category: "Assinaturas",
    priority: 150,
    matchType: "includes",
    match: ["adobe", "microsoft 365", "office 365", "google one",
            "dropbox", "notion", "figma", "github", "aws ",
            "digital ocean", "vercel", "cloudflare"],
  },

  // ── VIAGEM ─────────────────────────────────────────────────────────────────
  {
    id: "hospedagem",
    category: "Viagem",
    priority: 190,
    matchType: "includes",
    match: ["airbnb", "hotel ", "resort", "pousada", "hostel",
            "booking", "decolar", "trivago"],
  },
  {
    id: "passagens",
    category: "Viagem",
    priority: 185,
    matchType: "includes",
    match: ["latam", "gol ", "azul ", "passagem aerea", "passagem aérea",
            "passagem ", "aeroporto", "embarque", "milhas",
            "tam ", "smiles", "tudoazul"],
  },

  // ── EDUCAÇÃO ───────────────────────────────────────────────────────────────
  {
    id: "educacao",
    category: "Educação",
    priority: 180,
    matchType: "includes",
    match: ["mensalidade escola", "mensalidade colegio", "mensalidade faculdade",
            "faculdade", "universidade", "escola ", "colegio", "colégio",
            "curso ", "udemy", "coursera", "alura", "hotmart",
            "livraria", "livro ", "amazon livros"],
  },

  // ── COMPRAS ────────────────────────────────────────────────────────────────
  {
    id: "ecommerce",
    category: "Compras",
    priority: 170,
    matchType: "includes",
    match: ["amazon", "shopee", "mercadolivre", "mercado livre",
            "americanas", "magazine luiza", "magalu", "casas bahia",
            "submarino", "aliexpress", "shein", "shoptime",
            "extra com", "ponto frio"],
  },
  {
    id: "vestuario",
    category: "Compras",
    priority: 150,
    matchType: "includes",
    match: ["renner", "riachuelo", "c&a", "marisa", "zara",
            "h&m", "hering", "leader", "havan", "brooksfield"],
  },

  // ── LAZER ──────────────────────────────────────────────────────────────────
  {
    id: "lazer-entretenimento",
    category: "Lazer",
    priority: 160,
    matchType: "includes",
    match: ["cinema", "teatro", "show ", "ingresso", "eventbrite",
            "ticketmaster", "sympla", "balada", "clube ",
            "bowling", "bilhar", "parque ", "zoo", "aquario"],
  },

  // ── PIX RECEBIDO → Renda genérica ─────────────────────────────────────────
  {
    id: "pix-recebido",
    category: "Renda",
    priority: 10,
    matchType: "includes",
    match: ["transferencia recebida pelo pix", "transferência recebida pelo pix",
            "ted recebido", "ted recebida", "doc recebido"],
  },

  // ── PIX ENVIADO / TED → Outros ────────────────────────────────────────────
  {
    id: "pix-enviado",
    category: "Outros",
    priority: 5,
    matchType: "includes",
    match: ["transferencia enviada pelo pix", "transferência enviada pelo pix",
            "ted enviado", "ted enviada", "doc enviado"],
  },
];
