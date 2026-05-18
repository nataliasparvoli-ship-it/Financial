export default function KPICard({ label, value, sub, cor }) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        border: `1px solid ${cor}33`,
        borderRadius: 12,
        padding: "18px 22px",
        flex: 1,
        minWidth: 160,
      }}
    >
      <p
        style={{
          color: "#64748b",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        style={{
          color: cor,
          fontSize: 26,
          fontWeight: 700,
          margin: "8px 0 4px",
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>{sub}</p>
      )}
    </div>
  );
}
