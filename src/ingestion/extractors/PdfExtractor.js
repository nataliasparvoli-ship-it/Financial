/**
 * @fileoverview PdfExtractor — extrator multi-estratégia para arquivos PDF.
 *
 * ESTRATÉGIAS (em ordem de tentativa):
 *
 *   1. TEXT  → extrai texto embutido do PDF (text-based PDFs com tabelas)
 *              Delega ao pdfParser.js (extractor de texto nativo)
 *              Os registros têm sourceType: "pdf"
 *
 *   2. OCR   → quando a extração de texto falha + ocrExtractor disponível
 *              PDF escaneado / imagem incorporada
 *              Delega ao OcrExtractor injetado
 *              Os registros têm sourceType: "ocr"
 *
 *   3. ERROR → nenhuma estratégia funcionou ou disponível
 *              Retorna um ExtractedRecord único com warning "fatal"
 *              O normalizer downstream descarta e emite UserFacingMessage
 *
 * DESIGN:
 *   PdfExtractor aceita ocrExtractor como dependência — não instancia internamente.
 *   Isso mantém o acoplamento baixo: PdfExtractor não sabe qual provider OCR está ativo.
 *
 * @module ingestion/extractors/PdfExtractor
 */

import { extractTextFromPdfBytes } from "../../parsers/pdfParser.js";
import { CsvExtractor } from "./CsvExtractor.js";
import { buildMeta, buildRecord } from "./extractorUtils.js";

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Cria um PdfExtractor com estratégia OCR opcional.
 *
 * @param {{
 *   ocrExtractor?: ReturnType<import("./OcrExtractor.js").createOcrExtractor> | null,
 * }} [opts]
 * @returns {{ extract: (file: File) => Promise<import("../models/ingestionTypes.js").ExtractedRecord[]>, detectStrategy: (file: File) => Promise<"text"|"ocr"|"unknown"> }}
 */
export const createPdfExtractor = ({ ocrExtractor = null } = {}) => ({

  /**
   * Detecta qual estratégia provavelmente funcionará para o arquivo.
   * Não garante sucesso — apenas testa se o PDF contém texto embutido.
   *
   * @param {File} file
   * @returns {Promise<"text"|"ocr"|"unknown">}
   */
  async detectStrategy(file) {
    try {
      await extractTextFromPdfBytes(file);
      return "text";
    } catch {
      return ocrExtractor ? "ocr" : "unknown";
    }
  },

  /**
   * Extrai registros do PDF usando a melhor estratégia disponível.
   *
   * @param {File} file
   * @returns {Promise<import("../models/ingestionTypes.js").ExtractedRecord[]>}
   */
  async extract(file) {
    // ── Estratégia 1: extração de texto ──────────────────────────────────────
    try {
      const text = await extractTextFromPdfBytes(file);

      // Usa CsvExtractor.extractFromText com sourceType: "pdf"
      // (o texto extraído do PDF é tratado como CSV tabular)
      const records = CsvExtractor.extractFromText(text, file.name);

      // Override sourceType para "pdf" (preserva origem correta)
      return records.map((r) => ({
        ...r,
        meta: { ...r.meta, sourceType: /** @type {"pdf"} */ ("pdf") },
      }));
    } catch (textError) {
      // Texto não encontrado ou não parseável

      // ── Estratégia 2: OCR fallback ──────────────────────────────────────────
      if (ocrExtractor) {
        // Registra o motivo para diagnóstico (sem expor ao usuário ainda)
        const fallbackRecords = await ocrExtractor.extract(file);
        return fallbackRecords;
      }

      // ── Estratégia 3: sem fallback → registra erro irrecuperável ────────────
      return [buildRecord({
        rawData: {},
        meta: buildMeta({
          fileName:   file.name,
          sourceType: "pdf",
          rowIndex:   0,
          rawText:    textError.message,  // preserva motivo da falha para diagnóstico
        }),
        warnings: [{
          level:          "fatal",
          code:           "PDF_EXTRACTION_FAILED",
          message:        `Não foi possível extrair dados do PDF: ${textError.message}`,
          field:          undefined,
          rawValue:       file.name,
          coercedValue:   undefined,
          recoverable:    false,
          ruleId:         "pdf_extractor_text_strategy",
        }],
      })];
    }
  },
});
