/* ─── Category + Subcategory tree ─────────────────────────────────────────── */

export const CATEGORY_TREE = {
  "Alimentação":   ["Restaurante", "Delivery", "Supermercado", "Padaria / Café", "Fast Food", "Outros"],
  "Assinaturas":   ["Streaming", "Software / SaaS", "Clube", "Serviço Digital", "Outros"],
  "Compras":       ["Roupas", "Eletrônicos", "Casa e Decoração", "Farmácia", "Pet", "Marketplace", "Outros"],
  "Educação":      ["Curso Online", "Livros", "Escola / Faculdade", "Idiomas", "Outros"],
  "Fatura Cartão": ["Nubank", "Itaú", "Bradesco", "XP", "BTG", "Inter", "Outros"],
  "Investimentos": ["Tesouro Direto", "Ações", "FIIs", "CDB / CDI", "LCI / LCA", "Cripto", "Exterior", "Previdência", "Outros"],
  "Lazer":         ["Cinema / Teatro", "Bar / Balada", "Esportes", "Jogos", "Eventos", "Outros"],
  "Moradia":       ["Aluguel", "Água", "Luz", "Internet", "Condomínio", "Lavanderia", "Manutenção", "Outros"],
  "Outros":        ["Outros"],
  "Renda":         ["Salário", "Freelance", "Outros"],
  "Renda Ativa":   ["Salário", "Pro Labore", "Freelance / PJ", "Bônus / PLR", "Outros"],
  "Renda Passiva": ["Dividendos", "JCP", "Juros / CDI", "Rendimento FII", "Aluguel", "Outros"],
  "Saúde":         ["Plano de Saúde", "Consulta", "Farmácia", "Academia", "Exames", "Outros"],
  "Transporte":    ["Uber / 99", "Combustível", "Metrô / Ônibus", "Estacionamento", "Pedágio", "Outros"],
  "Viagem":        ["Hotel / Hospedagem", "Passagem Aérea", "Alimentação", "Transporte Local", "Outros"],
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_TREE);

export const getSubcategories = (category) => CATEGORY_TREE[category] ?? ["Outros"];

export const hasSubcategories = (category) => {
  const subs = CATEGORY_TREE[category];
  return subs != null && !(subs.length === 1 && subs[0] === "Outros");
};

/* ─── Subcategory inference from description ─────────────────────────────── */

const SUBCATEGORY_KEYWORDS = {
  "Tesouro Direto":     ["tesouro", "selic", "ipca"],
  "Ações":              ["ação", "acao", "acoes", "ações", "bovespa", "b3"],
  "FIIs":               ["fii", "fundo imobiliario", "fundo imobiliário"],
  "CDB / CDI":          ["cdb", "cdi", "rdb"],
  "LCI / LCA":          ["lci", "lca"],
  "Cripto":             ["bitcoin", "btc", "ethereum", "eth", "cripto", "crypto", "binance"],
  "Delivery":           ["ifood", "rappi", "uber eats", "james delivery"],
  "Supermercado":       ["mercado", "extra", "carrefour", "pao de acucar", "atacadao", "assai"],
  "Fast Food":          ["mcdonalds", "burger king", "subway", "kfc"],
  "Streaming":          ["netflix", "spotify", "disney", "hbo", "amazon prime", "youtube premium"],
  "Software / SaaS":    ["notion", "figma", "adobe", "microsoft", "google workspace"],
  "Uber / 99":          ["uber", "99pop", "99taxi", "cabify"],
  "Combustível":        ["combustivel", "posto ", "gasolina", "alcool", "etanol"],
  "Farmácia":           ["farmacia", "drogasil", "droga raia", "panvel", "ultrafarma"],
  "Academia":           ["academia", "smartfit", "bluefit", "bodytech"],
  "Aluguel":            ["aluguel", "locacao", "locação"],
  "Salário":            ["salario", "salário", "folha"],
  "Dividendos":         ["dividendos", "dividendo"],
  "Juros / CDI":        ["rendimento", "juros", "cdi"],
};

export const inferSubcategory = (category, description) => {
  const subs = CATEGORY_TREE[category];
  if (!subs) return "Outros";
  const desc = String(description || "").toLowerCase();
  for (const [sub, keywords] of Object.entries(SUBCATEGORY_KEYWORDS)) {
    if (subs.includes(sub) && keywords.some((kw) => desc.includes(kw))) return sub;
  }
  return "Outros";
};
