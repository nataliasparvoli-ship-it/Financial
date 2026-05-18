export default function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3
        style={{
          color: "#94a3b8",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 2,
          margin: "0 0 14px",
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
