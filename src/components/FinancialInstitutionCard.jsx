import { lazy, Suspense, useState, memo } from "react";

/* ─── lazy icon map ──────────────────────────────────────── */
const ICONS = {
  nubank:    lazy(() => import("../assets/institutions/icons/NubankIcon.jsx")),
  itau:      lazy(() => import("../assets/institutions/icons/ItauIcon.jsx")),
  xp:        lazy(() => import("../assets/institutions/icons/XpIcon.jsx")),
  btg:       lazy(() => import("../assets/institutions/icons/BtgIcon.jsx")),
  bb:        lazy(() => import("../assets/institutions/icons/BbIcon.jsx")),
  santander: lazy(() => import("../assets/institutions/icons/SantanderIcon.jsx")),
  c6:        lazy(() => import("../assets/institutions/icons/C6Icon.jsx")),
  bradesco:  lazy(() => import("../assets/institutions/icons/BradescoIcon.jsx")),
  caixa:     lazy(() => import("../assets/institutions/icons/CaixaIcon.jsx")),
  enbd:      lazy(() => import("../assets/institutions/icons/EnbdIcon.jsx")),
  adcb:      lazy(() => import("../assets/institutions/icons/AdcbIcon.jsx")),
  fab:       lazy(() => import("../assets/institutions/icons/FabIcon.jsx")),
  mashreq:   lazy(() => import("../assets/institutions/icons/MashreqIcon.jsx")),
  hsbc:      lazy(() => import("../assets/institutions/icons/HsbcIcon.jsx")),
  dib:       lazy(() => import("../assets/institutions/icons/DibIcon.jsx")),
  sarwa:     lazy(() => import("../assets/institutions/icons/SarwaIcon.jsx")),
  pichincha: lazy(() => import("../assets/institutions/icons/PichinchaIcon.jsx")),
  guayaquil: lazy(() => import("../assets/institutions/icons/GuayaquilIcon.jsx")),
  produbanco:lazy(() => import("../assets/institutions/icons/ProdubancoIcon.jsx")),
  outro_br:  lazy(() => import("../assets/institutions/icons/OutroIcon.jsx")),
  outro_ae:  lazy(() => import("../assets/institutions/icons/OutroIcon.jsx")),
  outro_ec:  lazy(() => import("../assets/institutions/icons/OutroIcon.jsx")),
};

const ICON_SIZE = 26;

/* ─── fallback initials ──────────────────────────────────── */
function getInitials(label) {
  const words = label.replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/);
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : label.slice(0, 2).toUpperCase();
}

function InitialsFallback({ label, opacity }) {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 40 40" fill="none">
      <text
        x="20" y="27"
        textAnchor="middle"
        fill={`rgba(241,245,249,${opacity})`}
        fontSize="16"
        fontWeight="700"
        fontFamily="'DM Mono', monospace"
        letterSpacing="0.5"
      >
        {getInitials(label)}
      </text>
    </svg>
  );
}

function IconSkeleton() {
  return (
    <div style={{
      width: ICON_SIZE,
      height: ICON_SIZE,
      borderRadius: 4,
      background: "rgba(255,255,255,0.04)",
    }} />
  );
}

/* ─── card ───────────────────────────────────────────────── */
const FinancialInstitutionCard = memo(function FinancialInstitutionCard({
  institution,
  selected = false,
  onSelect,
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = ICONS[institution.id];
  const iconOpacity = selected ? 1 : hovered ? 0.85 : 0.6;

  const color = institution.color ?? "#34d399";
  const cardStyle = {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: selected
      ? `${color}18`
      : hovered
        ? "rgba(255,255,255,0.05)"
        : "rgba(255,255,255,0.03)",
    border: selected
      ? `1px solid ${color}55`
      : "1px solid rgba(255,255,255,0.07)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.18s ease",
    transform: selected ? "scale(1.04)" : hovered ? "scale(1.02)" : "scale(1)",
    boxShadow: selected
      ? `0 0 0 1px ${color}18, 0 4px 16px rgba(0,0,0,0.4)`
      : "none",
    outline: "none",
    padding: 0,
    flexShrink: 0,
  };

  return (
    <button
      onClick={() => onSelect(institution.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-pressed={selected}
      aria-label={institution.label}
      style={cardStyle}
    >
      <Suspense fallback={<IconSkeleton />}>
        {Icon
          ? <Icon size={ICON_SIZE} opacity={iconOpacity} />
          : <InitialsFallback label={institution.label} opacity={iconOpacity} />
        }
      </Suspense>
    </button>
  );
});

export default FinancialInstitutionCard;
