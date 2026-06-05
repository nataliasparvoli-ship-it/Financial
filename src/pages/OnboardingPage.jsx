import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../contexts/AppContext";
import { SUPPORTED_COUNTRIES, SUPPORTED_CURRENCIES } from "../services/localeService.js";
import { getInstitutionsByCountry } from "../services/institutionService.js";
import { SUPPORTED_LANGUAGES, saveLanguage, getLanguage } from "../services/languageService.js";
import { useOnboardingTranslations } from "../features/onboarding/useOnboardingTranslations.js";

/* ─── global CSS ───────────────────────────────────────────── */

const GLOBAL_CSS = `
  /* iOS Dynamic Viewport Height — content never clips under address bar or notch */
  .auren-ob-wrap {
    min-height: 100dvh;
    padding-top: max(28px, env(safe-area-inset-top));
    padding-bottom: max(36px, env(safe-area-inset-bottom));
  }
  @supports not (min-height: 100dvh) {
    .auren-ob-wrap { min-height: -webkit-fill-available; }
  }

  /* Focus ring: inline styles can't do :focus */
  .auren-input:focus {
    border-color: rgba(52, 211, 153, 0.25) !important;
    outline: none;
  }
  /* Placeholder more readable (contrast fix for outdoor / low brightness) */
  .auren-input::placeholder { color: #4e6580; }
  .auren-input-mono::placeholder { color: #425e78; }

  /* Keyboard focus on custom pill buttons */
  .auren-btn-pill:focus-visible {
    box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.4);
    outline: none;
  }
`;

/* ─── design tokens ────────────────────────────────────────── */

const T = {
  bg:       "#020617",
  surface:  "#0b1628",
  border:   "#1e293b",
  accent:   "#34d399",
  hi:       "#edf2f7",        // near-white — high contrast text
  mid:      "#8fa8c0",        // mid-contrast — readable secondary
  low:      "#5c6e7e",        // lower — clearly secondary, still legible
  faint:    "#2e3f52",        // very low — decorative / ornamental only
  mono:     "'DM Mono', monospace",
  sans:     "'Syne', sans-serif",
};

/* ─── shared style presets ─────────────────────────────────── */

const S = {
  wrap: {
    background: T.bg,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 20px",
    fontFamily: T.sans,
    color: T.hi,
    overflowY: "auto",
  },
  card: {
    width: "100%",
    maxWidth: 460,
    paddingTop: 16,
    paddingBottom: 16,
  },

  // "Passo 1 de 4" — truly tertiary, just orients without dominating
  stepLabel: {
    color: T.faint,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    fontFamily: T.mono,
    margin: "0 0 10px",
  },

  // Input labels — conversational, not enterprise-form uppercase
  fieldLabel: {
    color: T.low,
    fontSize: 11,
    letterSpacing: 0.2,
    fontFamily: T.sans,
    fontWeight: 500,
    margin: "0 0 8px",
  },

  h2: {
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: -0.6,
    lineHeight: 1.2,
    color: T.hi,
    margin: "0 0 10px",
    fontFamily: T.sans,
  },

  // Supporting / explanatory text — calmer, still legible
  body: {
    fontSize: 14,
    lineHeight: 1.75,
    color: "#7a90a8",
    margin: "0 0 32px",
    whiteSpace: "pre-line",
  },

  // Compact but comfortable for mobile (≥44px tap target)
  input: {
    width: "100%",
    background: "#070d1b",         // slightly darker than surface → inset / recessed feel
    border: "1px solid #243446",   // more perceptible but still soft
    borderRadius: 10,
    padding: "12px 14px",
    color: T.hi,
    fontSize: 15,
    fontFamily: T.sans,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },

  // Less "landing page CTA", more premium wealth action
  btnPrimary: {
    width: "100%",
    background: "#29c08a",      // calmer than #34d399 — 8% less luminance, silent confidence
    border: "none",
    borderRadius: 12,
    color: "#011b0e",           // deep forest — more premium than pure black
    fontFamily: T.sans,
    fontWeight: 600,            // 600 not 700 — confident without shouting
    fontSize: 15,
    letterSpacing: 0.1,
    padding: "16px 20px",
    cursor: "pointer",
    marginTop: 12,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)", // subtle glass highlight
    transition: "opacity 0.15s, transform 0.1s",
  },

  // Ghost / skip — barely there, clearly optional
  btnGhost: {
    background: "transparent",
    border: "none",
    color: "#3d5270",
    fontFamily: T.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    cursor: "pointer",
    padding: "14px 0",
    textAlign: "center",
    width: "100%",
  },
};

/* ─── easing curves ────────────────────────────────────────── */
// easeOutQuint — fast settle, like iOS springboard
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
// easeIn — quick start for exits
const EASE_IN  = "cubic-bezier(0.42, 0, 1, 1)";

/* ─── progress indicator ───────────────────────────────────── */
// Three states: past (done, de-emphasized), current (full accent), future (dark)

function Progress({ step, total }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={step + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      style={{ display: "flex", gap: 5, marginBottom: 52 }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 2,
            borderRadius: 2,
            background:
              i < step  ? "rgba(52,211,153,0.32)" :   // past: completed, muted
              i === step ? T.accent                 :   // current: full brightness
                          "#18283d",                     // future: dark, not distracting
            transition: `background 0.4s ${EASE_OUT}`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── language selector ────────────────────────────────────── */
// Linear / Arc aesthetic — elevated active option, invisible chrome

function LanguageSelector({ language, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label="Language"
      style={{
        display: "inline-flex",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.055)",
        borderRadius: 100,
        padding: 3,
        marginBottom: 52,
      }}
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = language === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            role="radio"
            aria-checked={active}
            className="auren-btn-pill"
            onClick={() => onChange(lang.code)}
            style={{
              background: active ? "rgba(255,255,255,0.09)" : "transparent",
              // Subtle elevation on active — the "card lift" that makes Linear feel premium
              boxShadow: active
                ? "0 1px 3px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(0,0,0,0.12)"
                : "none",
              border: "none",
              borderRadius: 100,
              color: active ? "#dde8f4" : "rgba(241,245,249,0.26)",
              fontFamily: T.sans,
              fontWeight: active ? 600 : 400,
              fontSize: 13,
              padding: "8px 22px",
              cursor: "pointer",
              transition: "background 0.22s ease, color 0.22s ease, box-shadow 0.22s ease",
              outline: "none",
            }}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── step 0: welcome ──────────────────────────────────────── */

function StepWelcome({ onNext, language, onLanguage, langFading, t }) {
  const tw = t.welcome;

  // Content below the selector fades during language switch.
  // Scale(0.992) adds imperceptible depth — the Arc / Raycast micro touch.
  const contentFade = {
    opacity: langFading ? 0 : 1,
    transform: langFading ? "scale(0.992)" : "scale(1)",
    transition: langFading
      ? `opacity 0.1s ${EASE_IN}, transform 0.1s ${EASE_IN}`
      : `opacity 0.18s ${EASE_OUT}, transform 0.18s ${EASE_OUT}`,
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <LanguageSelector language={language} onChange={onLanguage} />
      </div>

      <div style={contentFade}>
        {/* Wordmark */}
        <div style={{
          fontSize: 44,
          fontWeight: 800,
          letterSpacing: -1.5,
          lineHeight: 1,
          color: T.hi,
          fontFamily: T.sans,
          marginBottom: 14,
        }}>
          Auren
        </div>

        {/* Gradient divider — soft glow, not a hard line */}
        <div style={{
          width: 28,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${T.accent}bb, transparent)`,
          margin: "0 auto 36px",
        }} />

        <p style={{
          fontSize: 21,
          fontWeight: 700,
          letterSpacing: -0.3,
          lineHeight: 1.25,
          color: T.hi,
          margin: "0 0 14px",
        }}>
          {tw.tagline}
        </p>

        <p style={{ ...S.body, marginBottom: 52, whiteSpace: "pre-line" }}>
          {tw.subtitle}
        </p>

        <button style={S.btnPrimary} onClick={onNext} aria-label={tw.cta}>
          {tw.cta} →
        </button>
      </div>
    </div>
  );
}

/* ─── step 1: location ─────────────────────────────────────── */

function StepLocation({ data, onChange, onNext, onSkip, t }) {
  const tl = t.location;

  const selectCountry = (country) => {
    onChange("country", country.id);
    onChange("currency", country.currency);
  };

  return (
    <div>
      <p style={S.stepLabel}>{tl.step}</p>
      <h2 style={S.h2}>{tl.title}</h2>
      <p style={S.body}>{tl.subtitle}</p>

      <div
        role="radiogroup"
        aria-label={tl.title}
        style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}
      >
        {SUPPORTED_COUNTRIES.map((c) => {
          const active = data.country === c.id;
          return (
            <button
              key={c.id}
              role="radio"
              aria-checked={active}
              className="auren-btn-pill"
              onClick={() => selectCountry(c)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                background: active ? "rgba(52,211,153,0.07)" : T.surface,
                border: `1px solid ${active ? "rgba(52,211,153,0.32)" : T.border}`,
                borderRadius: 12,
                padding: "13px 16px",
                color: active ? T.hi : T.mid,
                fontSize: 14,
                fontFamily: T.sans,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
                outline: "none",
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{c.flag}</span>
              <span style={{ flex: 1 }}>{c.name}</span>
              {active && (
                <span style={{ fontSize: 10, color: T.accent, fontFamily: T.mono }}>
                  {c.currency}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {data.country && (
        <div style={{ marginBottom: 28 }}>
          <p style={S.fieldLabel}>{tl.currencyLabel}</p>
          <div
            role="radiogroup"
            aria-label={tl.currencyLabel}
            style={{ display: "flex", flexDirection: "column", gap: 7 }}
          >
            {SUPPORTED_CURRENCIES.map((cur) => {
              const active = data.currency === cur.code;
              return (
                <button
                  key={cur.code}
                  role="radio"
                  aria-checked={active}
                  className="auren-btn-pill"
                  onClick={() => onChange("currency", cur.code)}
                  style={{
                    display: "flex", alignItems: "center",
                    background: active ? "rgba(96,165,250,0.07)" : T.surface,
                    border: `1px solid ${active ? "rgba(96,165,250,0.3)" : T.border}`,
                    borderRadius: 10,
                    padding: "11px 14px",
                    color: active ? "#60a5fa" : T.low,
                    fontSize: 13,
                    fontFamily: T.mono,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                    outline: "none",
                  }}
                >
                  {cur.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        style={{
          ...S.btnPrimary,
          opacity: data.country ? 1 : 0.35,
          cursor: data.country ? "pointer" : "not-allowed",
        }}
        onClick={data.country ? onNext : undefined}
        disabled={!data.country}
        aria-disabled={!data.country}
      >
        {tl.continue} →
      </button>
      <button style={S.btnGhost} onClick={onSkip}>{tl.skip}</button>
    </div>
  );
}

/* ─── step 2: profile ──────────────────────────────────────── */

function StepProfile({ data, onChange, onNext, t }) {
  const tp = t.profile;
  const valid = data.name.trim().length > 0 && data.incomeRange && data.primaryGoal;

  const toggleSecondary = useCallback((id) => {
    const current = data.secondaryGoals ?? [];
    if (current.includes(id)) {
      onChange("secondaryGoals", current.filter((g) => g !== id));
    } else if (current.length < 2) {
      onChange("secondaryGoals", [...current, id]);
    }
  }, [data.secondaryGoals, onChange]);

  return (
    <div>
      <p style={S.stepLabel}>{tp.step}</p>
      <h2 style={{ ...S.h2, marginBottom: 36 }}>{tp.title}</h2>

      {/* Name */}
      <div style={{ marginBottom: 28 }}>
        <p style={S.fieldLabel}>{tp.nameLabel}</p>
        <input
          className="auren-input"
          style={S.input}
          type="text"
          placeholder={tp.namePlaceholder}
          value={data.name}
          onChange={(e) => onChange("name", e.target.value)}
          autoComplete="given-name"
          inputMode="text"
          autoFocus
          aria-label={tp.nameLabel}
        />
      </div>

      {/* Income range */}
      <div style={{ marginBottom: 28 }}>
        <p style={S.fieldLabel}>{tp.incomeLabel}</p>
        <div
          role="radiogroup"
          aria-label={tp.incomeLabel}
          style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
        >
          {tp.incomeRanges.map((r) => {
            const active = data.incomeRange === r;
            return (
              <button
                key={r}
                role="radio"
                aria-checked={active}
                className="auren-btn-pill"
                onClick={() => onChange("incomeRange", r)}
                style={{
                  background: active ? "rgba(52,211,153,0.1)" : T.surface,
                  border: `1px solid ${active ? "rgba(52,211,153,0.42)" : T.border}`,
                  borderRadius: 20,
                  color: active ? T.accent : T.low,
                  padding: "9px 16px",
                  fontSize: 12,
                  fontFamily: T.mono,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  outline: "none",
                }}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary goal */}
      <div style={{ marginBottom: data.primaryGoal ? 20 : 36 }}>
        <p style={S.fieldLabel}>{tp.primaryGoalLabel}</p>
        <div
          role="radiogroup"
          aria-label={tp.primaryGoalLabel}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {tp.primaryGoals.map((g) => {
            const active = data.primaryGoal === g.id;
            return (
              <button
                key={g.id}
                role="radio"
                aria-checked={active}
                className="auren-btn-pill"
                onClick={() => { onChange("primaryGoal", g.id); onChange("secondaryGoals", []); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: active ? "rgba(52,211,153,0.07)" : T.surface,
                  border: `1px solid ${active ? "rgba(52,211,153,0.36)" : T.border}`,
                  borderRadius: 12,
                  padding: "13px 16px",
                  color: active ? T.accent : T.mid,
                  fontSize: 14,
                  fontFamily: T.sans,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  outline: "none",
                }}
              >
                <span style={{ fontSize: 14, opacity: active ? 0.8 : 0.35, lineHeight: 1 }}>{g.icon}</span>
                <span style={{ flex: 1 }}>{g.label}</span>
                {active && (
                  <span style={{
                    fontSize: 9,
                    color: "rgba(52,211,153,0.55)",
                    fontFamily: T.mono,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                  }}>
                    {tp.primaryChip}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary goals — progressive disclosure after primary */}
      {data.primaryGoal && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <p style={{ ...S.fieldLabel, margin: 0 }}>{tp.secondaryLabel}</p>
            <span style={{
              border: `1px solid ${T.border}`,
              borderRadius: 20,
              padding: "2px 9px",
              fontSize: 9,
              color: T.faint,
              fontFamily: T.mono,
              letterSpacing: 0.8,
            }}>
              {tp.secondaryHint}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tp.primaryGoals.filter((g) => g.id !== data.primaryGoal).map((g) => {
              const active = (data.secondaryGoals ?? []).includes(g.id);
              const maxed  = (data.secondaryGoals ?? []).length >= 2 && !active;
              return (
                <button
                  key={g.id}
                  aria-pressed={active}
                  aria-disabled={maxed}
                  className="auren-btn-pill"
                  onClick={() => !maxed && toggleSecondary(g.id)}
                  style={{
                    background: active ? "rgba(96,165,250,0.07)" : T.surface,
                    border: `1px solid ${active ? "rgba(96,165,250,0.32)" : T.border}`,
                    borderRadius: 20,
                    color: active ? "#60a5fa" : maxed ? "#1a2535" : T.low,
                    padding: "8px 14px",
                    fontSize: 12,
                    fontFamily: T.mono,
                    cursor: maxed ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: 6,
                    outline: "none",
                  }}
                >
                  <span style={{ fontSize: 10, opacity: active ? 0.72 : 0.3 }}>{g.icon}</span>
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        style={{
          ...S.btnPrimary,
          opacity: valid ? 1 : 0.35,
          cursor: valid ? "pointer" : "not-allowed",
        }}
        onClick={valid ? onNext : undefined}
        disabled={!valid}
        aria-disabled={!valid}
      >
        {tp.continue} →
      </button>
    </div>
  );
}

/* ─── institution badge ─────────────────────────────────────── */

function InstitutionBadge({ institution, selected, onToggle, otherLabel }) {
  const [hovered, setHovered] = useState(false);
  const { id, label, color, initials } = institution;
  const badge = initials || label.slice(0, 2).toUpperCase();
  const isPlus = badge === "+";
  const displayLabel = (label === "Outro" || label === "Other") ? otherLabel : label;

  return (
    <div
      role="checkbox"
      aria-checked={selected}
      aria-label={displayLabel}
      tabIndex={0}
      onClick={() => onToggle(id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle(id))}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 7, cursor: "pointer", outline: "none",
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 13,
        background: selected
          ? `${color}12`
          : hovered ? "rgba(241,245,249,0.04)" : "rgba(241,245,249,0.025)",
        border: `1px solid ${
          selected ? color + "46" : hovered ? "rgba(241,245,249,0.1)" : "rgba(241,245,249,0.06)"
        }`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.15s, border-color 0.15s",
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: T.mono,
          fontWeight: 700,
          fontSize: isPlus ? 18 : badge.length > 2 ? 10 : 12,
          letterSpacing: badge.length > 2 ? 1 : 0.5,
          color: selected
            ? "rgba(241,245,249,0.92)"
            : hovered ? "rgba(241,245,249,0.6)" : "rgba(241,245,249,0.3)",
          transition: "color 0.15s",
          lineHeight: 1,
          userSelect: "none",
        }}>
          {badge}
        </span>
      </div>
      <span style={{
        fontSize: 10, fontFamily: T.sans, fontWeight: 500,
        textAlign: "center", maxWidth: "100%",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        color: selected
          ? "rgba(241,245,249,0.75)"
          : hovered ? "rgba(241,245,249,0.45)" : "rgba(241,245,249,0.25)",
        transition: "color 0.15s",
        userSelect: "none",
      }}>
        {displayLabel}
      </span>
    </div>
  );
}

/* ─── step 3: institutions ──────────────────────────────────── */

function StepInstitutions({ selected, onToggle, onNext, onSkip, country, t }) {
  const ti = t.institutions;
  const institutions = getInstitutionsByCountry(country);
  const [cols, setCols] = useState(() => window.innerWidth < 390 ? 3 : 4);

  useEffect(() => {
    const handler = () => setCols(window.innerWidth < 390 ? 3 : 4);
    window.addEventListener("resize", handler, { passive: true });
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <div>
      <p style={S.stepLabel}>{ti.step}</p>
      <h2 style={S.h2}>{ti.title}</h2>
      <p style={S.body}>{ti.subtitle}</p>

      <div
        role="group"
        aria-label={ti.title}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: "20px 10px",
          marginBottom: 40,
        }}
      >
        {institutions.map((inst) => (
          <InstitutionBadge
            key={inst.id}
            institution={inst}
            selected={selected.includes(inst.id)}
            onToggle={onToggle}
            otherLabel={ti.otherLabel}
          />
        ))}
      </div>

      <button style={S.btnPrimary} onClick={onNext}>
        {selected.length > 0
          ? `${ti.continueWith(selected.length)} →`
          : `${ti.continue} →`}
      </button>
      <button style={S.btnGhost} onClick={onSkip}>{ti.skip}</button>
    </div>
  );
}

/* ─── step 4: goals ─────────────────────────────────────────── */

const CURRENCY_SYMBOLS  = { BRL: "R$", USD: "$", AED: "AED" };
// Extra left padding for the monetary prefix (accounts for larger number font)
const PREFIX_PADDING    = { "R$": 40, "$": 32, "AED": 54 };

function formatGoal(rawDigits, currency) {
  if (!rawDigits) return "";
  const n = parseInt(String(rawDigits).replace(/\D/g, ""), 10);
  if (isNaN(n)) return "";
  return currency === "BRL" ? n.toLocaleString("pt-BR") : n.toLocaleString("en-US");
}

function StepGoals({ data, onChange, onNext, onSkip, currency, t }) {
  const tg = t.goals;
  const prefix      = CURRENCY_SYMBOLS[currency] ?? "R$";
  const paddingLeft = PREFIX_PADDING[prefix] ?? 40;
  const hasAny      = tg.fields.some((f) => data[f.key]);

  const handleChange = (key, raw) => onChange(key, raw.replace(/\D/g, ""));

  return (
    <div>
      <p style={S.stepLabel}>{tg.step}</p>
      <h2 style={S.h2}>{tg.title}</h2>
      <p style={S.body}>{tg.subtitle}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 22, marginBottom: 36 }}>
        {tg.fields.map((f) => (
          <div key={f.key}>
            {/* Label row */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span style={{
                color: f.optional ? "#3d5270" : T.accent,
                fontSize: 11,
                lineHeight: 1,
                opacity: f.optional ? 0.5 : 0.68,
              }}>
                {f.icon}
              </span>
              <p style={{ ...S.fieldLabel, margin: 0 }}>{f.label}</p>
              {f.optional && (
                // Soft pill — "opcional" should feel like an invitation, not a warning
                <span style={{
                  background: "rgba(52,211,153,0.06)",
                  border: "1px solid rgba(52,211,153,0.12)",
                  borderRadius: 8,
                  padding: "1px 7px",
                  fontSize: 9,
                  color: "rgba(52,211,153,0.4)",
                  fontFamily: T.mono,
                  letterSpacing: 0.5,
                  textTransform: "lowercase",
                }}>
                  {tg.optionalHint}
                </span>
              )}
            </div>

            {/* Monetary input — number is the hero, prefix is secondary */}
            <div style={{ position: "relative" }}>
              {/* Prefix: very muted, clearly secondary */}
              <span style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#2e4d68",
                fontFamily: T.mono,
                fontSize: 10,
                letterSpacing: 0.5,
                pointerEvents: "none",
                userSelect: "none",
                fontWeight: 500,
              }}>
                {prefix}
              </span>
              {/* Number: larger, prominent — the value is what matters */}
              <input
                className="auren-input auren-input-mono"
                style={{
                  ...S.input,
                  paddingLeft,
                  fontFamily: T.mono,
                  fontSize: 20,             // up from 15 — number is the protagonist
                  fontWeight: 400,
                  letterSpacing: -0.3,
                  color: f.optional ? "#98b3c8" : "#d6e4ef",
                  opacity: 1,
                }}
                type="text"
                placeholder={f.placeholder}
                value={formatGoal(data[f.key], currency)}
                onChange={(e) => handleChange(f.key, e.target.value)}
                inputMode="decimal"
                aria-label={f.label}
              />
            </div>
          </div>
        ))}
      </div>

      <button style={S.btnPrimary} onClick={onNext}>
        {hasAny ? `${tg.save} →` : `${tg.continue} →`}
      </button>
      <button style={S.btnGhost} onClick={onSkip}>{tg.skip}</button>
    </div>
  );
}

/* ─── step 5: finish ────────────────────────────────────────── */

function StepFinish({ profile, goals, onEnter, t }) {
  const tf         = t.finish;
  const goalFields = t.goals.fields;
  const activeGoals = goalFields.filter((f) => goals[f.key]);
  const name        = profile?.name?.split(" ")[0] || "";
  const currPrefix  = CURRENCY_SYMBOLS[profile?.currency] ?? "R$";

  return (
    <div style={{ textAlign: "center" }}>
      {/* Checkmark */}
      <div style={{
        width: 58, height: 58, borderRadius: "50%",
        background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.22)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 28px",
        fontSize: 22, color: T.accent,
      }}>
        ✓
      </div>

      <h2 style={{ ...S.h2, fontSize: 22, marginBottom: 10 }}>{tf.title(name)}</h2>
      <p style={{ ...S.body, marginBottom: activeGoals.length ? 28 : 40 }}>{tf.subtitle}</p>

      {/* Goals recap */}
      {activeGoals.length > 0 && (
        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: "16px 18px",
          marginBottom: 28,
          textAlign: "left",
        }}>
          <p style={{ ...S.fieldLabel, marginBottom: 14, color: T.faint }}>{tf.goalsLabel}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {activeGoals.map((f) => (
              <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: T.accent, fontSize: 11, opacity: 0.7 }}>{f.icon}</span>
                  <span style={{ color: "#7a90a8", fontSize: 13 }}>{f.label}</span>
                </div>
                <span style={{ color: T.accent, fontFamily: T.mono, fontSize: 13, fontWeight: 600 }}>
                  {currPrefix} {formatGoal(goals[f.key], profile?.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile chips */}
      {profile?.incomeRange && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 36 }}>
          <span style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 20, padding: "5px 12px",
            fontSize: 11, color: T.low, fontFamily: T.mono,
          }}>
            {profile.incomeRange}
          </span>
          {profile.primaryGoal && (
            <span style={{
              background: "rgba(52,211,153,0.07)",
              border: "1px solid rgba(52,211,153,0.22)",
              borderRadius: 20, padding: "5px 12px",
              fontSize: 11, color: T.accent, fontFamily: T.mono,
            }}>
              {t.profile.primaryGoals.find((g) => g.id === profile.primaryGoal)?.label}
            </span>
          )}
        </div>
      )}

      <button style={S.btnPrimary} onClick={onEnter}>
        {tf.cta} →
      </button>
    </div>
  );
}

/* ─── main page ─────────────────────────────────────────────── */

const TOTAL_STEPS    = 6;   // steps 0–5
const PROGRESS_STEPS = 4;   // shown in progress bar (steps 1–4)

export default function OnboardingPage() {
  const { completeOnboarding, updateGoals } = useApp();

  // Language persisted to localStorage, loaded on mount
  const [language, setLanguage]     = useState(() => getLanguage());
  const [langFading, setLangFading] = useState(false);
  const langTimerRef                = useRef(null);
  const transitionTimerRef          = useRef(null);

  const [step, setStep]             = useState(0);
  const [fading, setFading]         = useState(false);
  const [profile, setProfile]       = useState({
    name: "", incomeRange: "", primaryGoal: "", secondaryGoals: [],
    country: "", currency: "",
  });
  const [institutions, setInstitutions] = useState([]);
  const [goalsData, setGoalsData]       = useState({});

  // Translations: re-derives synchronously when language changes — no remount
  const t = useOnboardingTranslations(language);

  // ── Language switch: fade-out → update text → fade-in ────────────────────
  const handleLanguage = useCallback((code) => {
    if (code === language) return;
    clearTimeout(langTimerRef.current);
    setLangFading(true);
    langTimerRef.current = setTimeout(() => {
      setLanguage(code);
      saveLanguage(code);      // persist immediately
      setLangFading(false);
    }, 120);
  }, [language]);

  useEffect(() => () => {
    clearTimeout(langTimerRef.current);
    clearTimeout(transitionTimerRef.current);
  }, []);

  // ── Step transitions ──────────────────────────────────────────────────────
  const transition = useCallback((next) => {
    setFading(true);
    clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      setStep(next);
      setFading(false);
    }, 160);
  }, []);

  const changeProfile = useCallback((k, v) => setProfile((p) => ({ ...p, [k]: v })), []);
  const changeGoal    = useCallback((k, v) => setGoalsData((p) => ({ ...p, [k]: v })), []);

  const toggleInstitution = useCallback((id) => {
    setInstitutions((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const buildGoals = useCallback(() =>
    t.goals.fields
      .filter((f) => goalsData[f.key])
      .map((f) => ({
        id: f.key, type: f.key, label: f.label, icon: f.icon,
        targetValue: parseFloat(String(goalsData[f.key]).replace(/\./g, "").replace(",", ".")) || 0,
        currentValue: 0, status: "active",
        createdAt: new Date().toISOString(),
      })),
  [goalsData, t.goals.fields]);

  const handleFinish = useCallback(() => {
    updateGoals(buildGoals());
    completeOnboarding({ profile: { ...profile, language }, institutions });
  }, [buildGoals, updateGoals, completeOnboarding, profile, language, institutions]);

  // Step content: differentiated easing for exit vs enter
  const contentStyle = {
    opacity: fading ? 0 : 1,
    transform: fading ? "translateY(5px) scale(0.99)" : "translateY(0) scale(1)",
    transition: fading
      ? `opacity 0.15s ${EASE_IN}, transform 0.15s ${EASE_IN}`
      : `opacity 0.24s ${EASE_OUT}, transform 0.24s ${EASE_OUT}`,
    willChange: "opacity, transform",
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <div className="auren-ob-wrap" style={S.wrap}>
        <div style={S.card}>
          {step > 0 && step < TOTAL_STEPS && (
            <Progress step={step - 1} total={PROGRESS_STEPS} />
          )}

          <div style={contentStyle}>
            {step === 0 && (
              <StepWelcome
                onNext={() => transition(1)}
                language={language}
                onLanguage={handleLanguage}
                langFading={langFading}
                t={t}
              />
            )}
            {step === 1 && (
              <StepLocation
                data={profile}
                onChange={changeProfile}
                onNext={() => transition(2)}
                onSkip={() => transition(2)}
                t={t}
              />
            )}
            {step === 2 && (
              <StepProfile
                data={profile}
                onChange={changeProfile}
                onNext={() => transition(3)}
                onBack={() => transition(1)}
                t={t}
              />
            )}
            {step === 3 && (
              <StepInstitutions
                selected={institutions}
                onToggle={toggleInstitution}
                country={profile.country}
                onNext={() => transition(4)}
                onSkip={() => transition(4)}
                t={t}
              />
            )}
            {step === 4 && (
              <StepGoals
                data={goalsData}
                onChange={changeGoal}
                currency={profile.currency}
                onNext={() => transition(5)}
                onSkip={() => transition(5)}
                t={t}
              />
            )}
            {step === 5 && (
              <StepFinish
                profile={profile}
                goals={goalsData}
                onEnter={handleFinish}
                t={t}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
