import { parseDelimitedText } from "./csvParser.js";

const unescapePdfText = (text) =>
  text.replace(
    /\\([nrtbf()\\])/g,
    (_, char) =>
      ({
        n: "\n",
        r: "\r",
        t: "\t",
        b: "",
        f: "",
        "(": "(",
        ")": ")",
        "\\": "\\",
      })[char] || char,
  );

export const extractTextFromPdfBytes = async (file) => {
  const buffer = await file.arrayBuffer();
  const binary = new TextDecoder("latin1").decode(buffer);
  const chunks = [];
  const literalText = /\(([^()]*)\)\s*Tj/g;
  const arrayText = /\[((?:\([^()]*\)|[^\]])*)\]\s*TJ/g;

  for (const match of binary.matchAll(literalText)) {
    chunks.push(match[1]);
  }

  for (const match of binary.matchAll(arrayText)) {
    for (const item of match[1].matchAll(/\(([^()]*)\)/g)) {
      chunks.push(item[1]);
    }
  }

  if (!chunks.length) {
    throw new Error("Nenhum texto tabular encontrado no PDF.");
  }

  return unescapePdfText(chunks.join("\n"));
};

export const parsePdfFile = async (file) => {
  try {
    // Experimental: this lightweight extractor only works with text-based PDFs
    // that contain CSV-like text. Scanned/image PDFs should be exported to CSV.
    const text = await extractTextFromPdfBytes(file);
    const parsed = parseDelimitedText(text);

    return {
      ...parsed,
      warning:
        "PDF importado de forma experimental. Para PDFs escaneados ou extratos complexos, prefira CSV.",
    };
  } catch (error) {
    return {
      rows: [],
      invalidRows: 0,
      warning: `Não foi possível extrair dados do PDF. Exporte para CSV e tente novamente. (${error.message})`,
    };
  }
};
