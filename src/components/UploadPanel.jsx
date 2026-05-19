import { useRef, useState } from "react";

const getTopCategorySummary = (categorization) =>
  Object.entries(categorization?.topCategories || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat, total]) => `${cat} (${total})`)
    .join(", ");

function DuplicateAlert({ files, onDismiss }) {
  return (
    <div
      style={{
        background: "#fbbf2411",
        border: "1px solid #fbbf2444",
        borderRadius: 10,
        padding: "12px 16px",
        marginTop: 14,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div>
        <p style={{ color: "#fbbf24", fontWeight: 700, margin: "0 0 4px", fontSize: 13 }}>
          ⚠️ Arquivo já importado anteriormente
        </p>
        <p style={{ color: "#d97706", fontSize: 12, margin: 0 }}>
          {files.length === 1
            ? `"${files[0]}" já foi importado e foi ignorado para evitar duplicatas.`
            : `${files.length} arquivos já importados foram ignorados: ${files.join(", ")}`}
        </p>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: "transparent",
          border: "none",
          color: "#fbbf24",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

export default function UploadPanel({
  onFilesImported,
  onClearAll,
  importLog,
  isImporting,
  importSummary,
  duplicateAlert,
  onDismissDuplicate,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = async (files) => {
    if (!files.length) return;
    await onFilesImported(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleInputChange = (e) => handleFiles(Array.from(e.target.files || []));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(Array.from(e.dataTransfer.files || []));
  };

  const handleClear = () => {
    if (window.confirm("Apagar todos os dados importados?")) onClearAll();
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0f172a, #111827)",
        border: `1px solid ${dragging ? "#60a5fa" : "#334155"}`,
        borderRadius: 16,
        padding: "18px 20px",
        marginBottom: 22,
        transition: "border-color 0.2s",
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p style={{ color: "#f1f5f9", fontWeight: 800, margin: "0 0 4px" }}>
            {dragging ? "Solte o arquivo aqui ↓" : "Importar dados financeiros"}
          </p>
          <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
            CSV ou PDF · Nubank, Itaú, Bradesco, XP, BTG, Inter e outros.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          {importLog.length > 0 && (
            <button
              onClick={handleClear}
              style={{
                background: "transparent",
                border: "1px solid #f8717144",
                borderRadius: 10,
                color: "#f87171",
                cursor: "pointer",
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              🗑 Limpar dados
            </button>
          )}

          <label
            style={{
              background: "#1e293b",
              border: `1px solid ${isImporting ? "#334155" : "#60a5fa"}`,
              borderRadius: 10,
              color: isImporting ? "#64748b" : "#60a5fa",
              cursor: isImporting ? "not-allowed" : "pointer",
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s",
            }}
          >
            {isImporting && (
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  border: "2px solid #60a5fa",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            )}
            {isImporting ? "Importando..." : "↑ Selecionar CSV / PDF"}
            <input
              ref={inputRef}
              accept=".csv,.txt,.pdf,text/csv,application/pdf"
              multiple
              onChange={handleInputChange}
              style={{ display: "none" }}
              type="file"
              disabled={isImporting}
            />
          </label>
        </div>
      </div>

      {duplicateAlert && (
        <DuplicateAlert files={duplicateAlert.files} onDismiss={onDismissDuplicate} />
      )}

      {importSummary && !duplicateAlert && (
        <p style={{ color: "#94a3b8", fontSize: 12, margin: "12px 0 0" }}>
          ✅ {importSummary.files} arquivo(s) · {importSummary.rowsImported} linha(s) importada(s)
          {importSummary.datasetsDetected?.length
            ? ` · datasets: ${importSummary.datasetsDetected.join(", ")}`
            : ""}
          {importSummary.categorization?.autoCategorized
            ? ` · ${importSummary.categorization.autoCategorized} auto-categorizadas`
            : ""}
          {importSummary.categorization?.unmatched
            ? ` · ${importSummary.categorization.unmatched} sem categoria`
            : ""}
          {getTopCategorySummary(importSummary.categorization)
            ? ` · top: ${getTopCategorySummary(importSummary.categorization)}`
            : ""}
        </p>
      )}

      {importLog.length > 0 && (
        <div style={{ borderTop: "1px solid #1e293b", marginTop: 14, paddingTop: 12 }}>
          {importLog.slice(0, 6).map((item) => (
            <p
              key={item.id}
              style={{
                color: item.error ? "#f87171" : item.duplicate ? "#fbbf24" : item.warning ? "#fbbf24" : "#94a3b8",
                fontSize: 12,
                margin: "4px 0",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {item.error ? "❌" : item.duplicate ? "⚠️" : item.warning ? "⚠️" : "✓"}{" "}
              {item.file} · {item.message}
            </p>
          ))}
          {importLog.length > 6 && (
            <p style={{ color: "#334155", fontSize: 11, margin: "4px 0", fontFamily: "'DM Mono', monospace" }}>
              +{importLog.length - 6} entradas anteriores
            </p>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
