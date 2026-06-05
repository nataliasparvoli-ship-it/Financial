/**
 * @fileoverview ManualExtractor — converte entradas manuais para ExtractedRecord[].
 *
 * RESPONSABILIDADE:
 *   Recebe um array de objetos (entrada manual do usuário ou API interna)
 *   e produz ExtractedRecord[] com o mesmo contrato dos outros extractors.
 *
 *   Garante que o pipeline downstream não precise distinguir entre
 *   dados importados de arquivo e dados digitados manualmente.
 *
 * CONVERSÃO:
 *   Todos os valores são convertidos para string — contrato do rawData.
 *   null/undefined → "" (string vazia, não "null" ou "undefined")
 *
 * SÍNCRONO:
 *   ManualExtractor.extract é síncrono (não async) — não acessa rede ou arquivo.
 *   Mantido assim por design: entradas manuais estão sempre disponíveis.
 *
 * @module ingestion/extractors/ManualExtractor
 */

import { buildMeta, buildRecord } from "./extractorUtils.js";

export const ManualExtractor = {

  /**
   * Converte entradas manuais para ExtractedRecord[].
   *
   * @param {Record<string, unknown>[]} entries  Objetos com dados brutos do usuário
   * @param {{ fileName?: string }} [opts]
   * @returns {import("../models/ingestionTypes.js").ExtractedRecord[]}
   */
  extract(entries, opts = {}) {
    const fileName = opts.fileName ?? "manual-entry";

    return entries.map((entry, rowIndex) => {
      // Converte todos os valores para string — contrato rawData
      const rawData = Object.fromEntries(
        Object.entries(entry).map(([k, v]) => [k, v == null ? "" : String(v)]),
      );

      return buildRecord({
        rawData,
        meta: buildMeta({
          fileName,
          sourceType: "manual",
          rowIndex,
        }),
      });
    });
  },
};
