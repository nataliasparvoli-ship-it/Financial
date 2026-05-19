// OCR de screenshots de investimentos via Claude Vision API

export const getImageFingerprint = (file) =>
  `img::${file.name}::${file.size}::${file.lastModified}`;

export const extractInvestmentsFromImage = async (file) => {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const ext = file.name.split(".").pop()?.toLowerCase();
  const mediaType = ext === "png" ? "image/png"
    : ext === "webp" ? "image/webp"
    : "image/jpeg";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: `Você é um extrator de dados de screenshots de investimentos brasileiros.
Analise esta imagem e extraia TODAS as posições de investimento visíveis.

Retorne APENAS um JSON array (sem markdown, sem explicação) com objetos:
{
  "instituicao": "nome do banco/corretora",
  "nome": "nome do ativo ou conta",
  "tipo": "Renda Fixa|Renda Variável|FII|Ações|Cripto|Previdência|Tesouro|Fundos|Outros",
  "valor": 1234.56,
  "data": "DD/MM/YYYY ou null se não visível",
  "rentabilidade": 0.05 (percentual como decimal, ou null),
  "confianca": "alta|media|baixa"
}

Exemplos de instituições: Nubank, NuInvest, XP, BTG, Itaú, Bradesco, Rico, Clear, Inter, Órama.
Exemplos de tipos: CDB, RDB, LCI, LCA, Tesouro Direto, FII, Ações, ETF, Fundos, Previdência.
Se o valor não estiver claro, estime com confianca "baixa".
Se não encontrar investimentos, retorne [].`,
          },
        ],
      }],
    }),
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();
  const text = data.content?.[0]?.text || "[]";
  const clean = text.replace(/```json|```/g, "").trim();

  const parsed = JSON.parse(clean);
  return parsed.map((item, i) => ({
    id: `img_${Date.now()}_${i}`,
    instituicao: item.instituicao || "Desconhecido",
    nome: item.nome || "Sem nome",
    tipo: item.tipo || "Outros",
    valor: Number(item.valor) || 0,
    data: item.data || new Date().toLocaleDateString("pt-BR"),
    rentabilidade: item.rentabilidade ?? null,
    confianca: item.confianca || "media",
    source: "ocr",
    rawFile: file.name,
  }));
};
