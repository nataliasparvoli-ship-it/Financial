import { useEffect, useState } from "react";
import { importFiles, clearImportedFileRegistry } from "../import/importPipeline.js";
import { mergeImportedData } from "../parsers/normalizeData.js";
import { learnRule } from "../storage/userRulesStorage.js";
import {
  loadFinancialData,
  saveFinancialData,
} from "../storage/financialStorage.js";

export const useFinancialData = () => {
  const [importedData, setImportedData]     = useState(loadFinancialData);
  const [importLog, setImportLog]           = useState([]);
  const [importSummary, setImportSummary]   = useState(null);
  const [isImporting, setIsImporting]       = useState(false);
  const [duplicateAlert, setDuplicateAlert] = useState(null);
  const [showReview, setShowReview]         = useState(false);

  useEffect(() => { saveFinancialData(importedData); }, [importedData]);

  const handleFilesImported = async (files) => {
    setIsImporting(true);
    setDuplicateAlert(null);

    try {
      const result = await importFiles(files);

      if (result.hasDuplicates) {
        setDuplicateAlert({ files: result.duplicateFiles });
      }

      if (result.summary.rowsImported > 0) {
        setImportedData((current) => mergeImportedData(current, result.data));
        // Auto-open review if there are unmatched transactions
        if (result.summary.categorization?.unmatched > 0) {
          setShowReview(true);
        }
      }

      setImportSummary(result.summary);
      setImportLog((current) => [...result.logItems, ...current]);
    } catch (error) {
      setImportLog((current) => [{
        id: crypto.randomUUID(),
        file: "importação",
        error: true,
        message: `Não foi possível importar os arquivos. ${error.message}`,
      }, ...current]);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCategoryChange = (txId, newCategory, newSubcategory = "") => {
    setImportedData((current) => {
      const tx = current.transacoes.find((t) => t.id === txId);
      if (tx?.normalizedMerchant) {
        learnRule(tx.normalizedMerchant, newCategory, newSubcategory);
      }
      return {
        ...current,
        transacoes: current.transacoes.map((t) =>
          t.id === txId
            ? { ...t, cat: newCategory, subcat: newSubcategory, categorySource: "user" }
            : t
        ),
      };
    });
  };

  const clearAll = () => {
    setImportedData({ transacoes:[], patrimonio:[], classe:[], banco:[], rendaPassiva:[] });
    setImportLog([]);
    setImportSummary(null);
    setDuplicateAlert(null);
    setShowReview(false);
    clearImportedFileRegistry();
  };

  const dismissDuplicateAlert = () => setDuplicateAlert(null);

  return {
    importedData,
    importLog,
    importSummary,
    isImporting,
    duplicateAlert,
    dismissDuplicateAlert,
    showReview,
    setShowReview,
    handleFilesImported,
    handleCategoryChange,
    clearAll,
  };
};
