export default function EmptyState({ title, children }) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px dashed #334155",
        borderRadius: 12,
        padding: 24,
        color: "#64748b",
        textAlign: "center",
      }}
    >
      <p style={{ color: "#e2e8f0", fontWeight: 700, margin: "0 0 6px" }}>
        {title}
      </p>
      <p style={{ margin: 0, fontSize: 13 }}>{children}</p>
    </div>
  );
}
