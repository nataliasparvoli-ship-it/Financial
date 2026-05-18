import { fmtK } from "../utils/formatters";

export default function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 8,
        padding: "10px 14px",
      }}
    >
      <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>{label}</p>
      {payload.map((item) => (
        <p
          key={`${item.dataKey}-${item.name}`}
          style={{ color: item.color || "#fff", fontSize: 13, margin: "2px 0" }}
        >
          {item.name}: {fmtK(item.value)}
        </p>
      ))}
    </div>
  );
}
