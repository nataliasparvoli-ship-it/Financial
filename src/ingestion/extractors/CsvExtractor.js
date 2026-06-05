/**
 * @fileoverview CsvExtractor — leitura estrutural pura de arquivos CSV/TSV.
 *
 * RESPONSABILIDADE ÚNICA:
 *   Ler a fonte → detectar delimitador → mapear colunas → produzir ExtractedRecord[].
 *   Nada mais.
 *
 * NÃO FAZ:
 *   ✗ Detectar instituição
 *   ✗ Inferir dataset (transações, holdings, banco...)
 *   ✗ Aplicar sign conventions
 *   ✗ Resolver ativos ou tickers
 *   ✗ Categorizar transações
 *   ✗ Normalizar valores monetários
 *   ✗ Converter datas
 *
 * TODOS esses passos acontecem no Normalizer, Enricher e Converter — downstream.
 *
 * rawData:
 *   Os valores são strings brutas da fonte — zero conversão.
 *   Preservar o original intacto é a única obrigação do extractor.
 *   Ex: rawData.valor = "R$ 1.234,56" (não 1234.56)
 *       rawData.data  = "01/05/2026"  (não ISO 8601)
 *
 * STREAMING (futuro):
 *   Hoje extract() carrega tudo em memória. Para suporte a arquivos grandes:
 *   - extract() pode ser refatorado para yieldar ExtractionChunk[]
 *   - A interface downstream não precisará mudar (consome arrays de records)
 *
 * @module ingestion/extractors/CsvExtractor
 */

import { parseDelimitedText } from "../../parsers/csvParser.js";
import { buildMeta, buildRecord } from "./extractorUtils.js";

// ── CsvExtractor ──────────────────────────────────────────────────────────────

export const CsvExtractor = {

  /**
   * Extrai registros de um File CSV/TSV.
   * Lê o arquivo inteiro, parseia estruturalmente, retorna ExtractedRecord[].
   *
   * @param {File} file
   * @returns {Promise<import("../models/ingestionTypes.js").ExtractedRecord[]>}
   */
  async extract(file) {
    const text = await file.text();
    return CsvExtractor.extractFromText(text, file.name);
  },

  /**
   * Extrai registros de um texto CSV/TSV já carregado.
   * Útil quando o conteúdo do arquivo já está disponível como string
   * (ex: PdfExtractor depois de extrair texto do PDF).
   *
   * @param {string} text       Conteúdo do CSV como string
   * @param {string} [fileName] Nome de origem para meta e fingerprint
   * @returns {import("../models/ingestionTypes.js").ExtractedRecord[]}
   */
  extractFromText(text, fileName = "unknown.csv") {
    const { rows } = parseDelimitedText(text);

    return rows.map((rawData, rowIndex) =>
      buildRecord({
        rawData,
        meta: buildMeta({
          fileName,
          sourceType: "csv",
          rowIndex,
        }),
      }),
    );
  },
};
