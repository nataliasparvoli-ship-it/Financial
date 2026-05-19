import { useState, useEffect } from "react";
import { extractInvestmentsFromImage, getImageFingerprint } from "../parsers/imageParser.js";

const KEY = "financial-dashboard.investments.v2";
const IMG_KEY = "financial-dashboard.investmentImages.v1";

const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};
const save = (data) => {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
};
const loadImageRegistry = () => {
  try { return new Set(JSON.parse(localStorage.getItem(IMG_KEY) || "[]")); } catch { return new Set(); }
};
const saveImageRegistry = (s) => {
  try { localStorage.setItem(IMG_KEY, JSON.stringify([...s])); } catch {}
};

export const useInvestments = () => {
  const [investments, setInvestments] = useState(load);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [ocrResult, setOcrResult]     = useState(null); // pending review
  const [ocrError, setOcrError]       = useState(null);

  useEffect(() => { save(investments); }, [investments]);

  const addManual = (inv) => {
    setInvestments((prev) => [
      { ...inv, id: `manual_${Date.now()}`, source: "manual" },
      ...prev,
    ]);
  };

  const update = (id, changes) => {
    setInvestments((prev) => prev.map((i) => i.id === id ? { ...i, ...changes } : i));
  };

  const remove = (id) => {
    setInvestments((prev) => prev.filter((i) => i.id !== id));
  };

  const processImage = async (file) => {
    const registry = loadImageRegistry();
    const fp = getImageFingerprint(file);
    if (registry.has(fp)) {
      setOcrError("Esta imagem já foi importada anteriormente.");
      return;
    }

    setIsProcessingImage(true);
    setOcrError(null);
    setOcrResult(null);

    try {
      const extracted = await extractInvestmentsFromImage(file);
      if (!extracted.length) {
        setOcrError("Não encontrei investimentos nesta imagem. Tente uma captura mais clara.");
      } else {
        setOcrResult({ items: extracted, file: file.name });
      }
    } catch (e) {
      setOcrError(`Erro ao processar imagem: ${e.message}`);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const confirmOcr = (items) => {
    if (!ocrResult) return;
    const registry = loadImageRegistry();
    setInvestments((prev) => [...items, ...prev]);
    // mark all files in this batch
    const fp = `img::${ocrResult.file}`;
    registry.add(fp);
    saveImageRegistry(registry);
    setOcrResult(null);
  };

  const dismissOcr = () => setOcrResult(null);

  const clearAll = () => {
    setInvestments([]);
    saveImageRegistry(new Set());
    localStorage.removeItem(IMG_KEY);
  };

  const totalValue = investments.reduce((s, i) => s + (i.valor || 0), 0);

  const byType = investments.reduce((acc, inv) => {
    acc[inv.tipo] = (acc[inv.tipo] || 0) + inv.valor;
    return acc;
  }, {});

  const byInst = investments.reduce((acc, inv) => {
    acc[inv.instituicao] = (acc[inv.instituicao] || 0) + inv.valor;
    return acc;
  }, {});

  return {
    investments, totalValue, byType, byInst,
    isProcessingImage, ocrResult, ocrError,
    addManual, update, remove,
    processImage, confirmOcr, dismissOcr, clearAll,
  };
};
