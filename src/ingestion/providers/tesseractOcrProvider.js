/**
 * @fileoverview Tesseract OCR provider — futuro (Tesseract.js, browser WASM).
 *
 * STATUS: stub / não implementado.
 *
 * QUANDO IMPLEMENTAR:
 *   - Quando precisar de OCR offline sem depender de API externa
 *   - Tesseract.js: https://github.com/naptha/tesseract.js
 *   - Vantagem: sem custo por request, funciona offline
 *   - Desvantagem: menor acurácia que Claude Vision para documentos financeiros BR
 *
 * INTEGRAÇÃO:
 *   npm install tesseract.js
 *   import { createWorker } from "tesseract.js";
 *
 * TROCA:
 *   const engine = new IngestionEngine({ ocrProvider: tesseractOcrProvider });
 *   // Nenhuma mudança no restante do pipeline.
 *
 * @module ingestion/providers/tesseractOcrProvider
 */

import { OCR_PROVIDER_IDS } from "./ocrProvider.js";

/**
 * @type {import("./ocrProvider.js").OcrProvider}
 */
export const tesseractOcrProvider = {
  providerId: OCR_PROVIDER_IDS.TESSERACT,

  async extract(_file, _opts = {}) {
    throw new Error(
      "tesseractOcrProvider: não implementado. " +
      "Instale tesseract.js e implemente este adapter para suporte offline.",
    );
  },
};
