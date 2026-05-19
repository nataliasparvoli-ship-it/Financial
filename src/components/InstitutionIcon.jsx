import { useState } from "react";
import { INSTITUTION_ASSETS } from "../services/institutionAssets.js";

const getInitials = (label) => {
  const words = label.replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/);
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : label.slice(0, 2).toUpperCase();
};

/**
 * Shows institution logo when available; falls back to a styled initials badge.
 * Never breaks if the asset is missing.
 */
export default function InstitutionIcon({ id, label, color, active = false, size = 32 }) {
  const asset = INSTITUTION_ASSETS[id];
  const [imgFailed, setImgFailed] = useState(false);
  const radius = Math.round(size * 0.25);
  const bg = active ? color : "#1e293b";

  if (asset && !imgFailed) {
    return (
      <img
        src={asset}
        alt={label}
        width={size}
        height={size}
        onError={() => setImgFailed(true)}
        style={{
          borderRadius: radius,
          objectFit: "contain",
          background: bg,
          display: "block",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: radius,
      background: bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      transition: "background 0.15s",
    }}>
      <span style={{
        color: active ? "#020617" : color,
        fontWeight: 800,
        fontSize: Math.round(size * 0.31),
        fontFamily: "'DM Mono', monospace",
        letterSpacing: -0.5,
        lineHeight: 1,
        transition: "color 0.15s",
      }}>
        {getInitials(label)}
      </span>
    </div>
  );
}
