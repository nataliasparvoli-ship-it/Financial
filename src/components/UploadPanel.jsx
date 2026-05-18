const getTopCategorySummary = (categorization) =>
  Object.entries(categorization?.topCategories || {})
    .sort(([, totalA], [, totalB]) => totalB - totalA)
    .slice(0, 3)
    .map(([category, total]) => `${category} (${total})`)
    .join(", ");

export default function UploadPanel({
  onFilesImported,
  importLog,
  isImporting,
  importSummary,
}) {
  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    await onFilesImported(files);
    event.target.value = "";
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0f172a, #111827)",
        border: "1px solid #334155",
        borderRadius: 16,
        padding: "18px 20px",
        marginBottom: 22,
      }}
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
          <p style={{ color: "#f1f5f9", fontWeight: 800, margin: "0 0 6px" }}>
            Importar dados financeiros
          </p>
          <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
            Envie CSV ou PDF textual. Use uma coluna <code>dataset</code> com:
            transacoes, patrimonio, classe, banco ou renda_passiva.
          </p>
        </div>
        <label
          style={{
            background: "#1e293b",
            border: "1px solid #60a5fa",
            borderRadius: 10,
            color: "#60a5fa",
            cursor: "pointer",
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {isImporting ? "Importando..." : "Selecionar CSV/PDF"}
          <input
            accept=".csv,.txt,.pdf,text/csv,application/pdf"
            multiple
            onChange={handleFiles}
            style={{ display: "none" }}
            type="file"
          />
        </label>
      </div>
      {importSummary && (
        <p style={{ color: "#94a3b8", fontSize: 12, margin: "12px 0 0" }}>
          Resumo: {importSummary.files} arquivo(s), {importSummary.rowsImported}{" "}
          linha(s) importada(s), datasets:{" "}
          {importSummary.datasetsDetected.join(", ") || "nenhum"}. Categorias:{" "}
          {importSummary.categorization?.autoCategorized || 0} auto,{" "}
          {importSummary.categorization?.unmatched || 0} sem match
          {getTopCategorySummary(importSummary.categorization)
            ? ` · top: ${getTopCategorySummary(importSummary.categorization)}`
            : ""}
          .
        </p>
      )}
      {importLog.length > 0 && (
        <div
          style={{
            borderTop: "1px solid #1e293b",
            marginTop: 14,
            paddingTop: 12,
          }}
        >
          {importLog.map((item) => (
            <p
              key={item.id}
              style={{
                color: item.error
                  ? "#f87171"
                  : item.warning
                    ? "#fbbf24"
                    : "#94a3b8",
                fontSize: 12,
                margin: "4px 0",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {item.error ? "Erro" : item.warning ? "Aviso" : "OK"} ·{" "}
              {item.file} · {item.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
