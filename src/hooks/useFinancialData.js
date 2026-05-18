import { useEffect, useState } from "react";
import { importFiles } from "../import/importPipeline.js";
import { mergeImportedData } from "../parsers/normalizeData.js";
import {
  loadFinancialData,
  saveFinancialData,
} from "../storage/financialStorage.js";

export const useFinancialData = () => {
  const [importedData, setImportedData] = useState(loadFinancialData);
  const [importLog, setImportLog] = useState([]);
  const [importSummary, setImportSummary] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    saveFinancialData(importedData);
  }, [importedData]);

  const handleFilesImported = async (files) => {
    setIsImporting(true);

    try {
      const result = await importFiles(files);
      setImportedData((current) => mergeImportedData(current, result.data));
      setImportSummary(result.summary);
      setImportLog((current) => [...result.logItems, ...current]);
    } catch (error) {
      setImportLog((current) => [
        {
          id: crypto.randomUUID(),
          file: "importação",
          error: true,
          message: `Não foi possível importar os arquivos. ${error.message}`,
        },
        ...current,
      ]);
    } finally {
      setIsImporting(false);
    }
  };

  return {
    importedData,
    importLog,
    importSummary,
    isImporting,
    handleFilesImported,
  };
};
