import { useState } from "react";
import { useApp } from "../contexts/AppContext";

/* ─── constants ─────────────────────────────────────────── */

const INCOME_RANGES = [
  "Até R$ 3k", "R$ 3k – 6k", "R$ 6k – 12k", "R$ 12k – 25k", "Acima de R$ 25k",
];

const PRIMARY_GOALS = [
  { id: "control",  icon: "◈", label: "Controle financeiro" },
  { id: "invest",   icon: "↗", label: "Investir melhor" },
  { id: "wealth",   icon: "◆", label: "Aumentar patrimônio" },
  { id: "save",     icon: "○", label: "Economizar mais" },
  { id: "freedom",  icon: "◻", label: "Independência financeira" },
];

const INSTITUTIONS = [
  { id: "nubank",   label: "Nubank",   color: "#820AD1" },
  { id: "itau",     label: "Itaú",     color: "#EC7000" },
  { id: "bradesco", label: "Bradesco", color: "#CC0000" },
  { id: "xp",       label: "XP",       color: "#f1f5f9" },
  { id: "btg",      label: "BTG",      color: "#60a5fa" },
  { id: "inter",    label: "Inter",    color: "#FF7A00" },
  { id: "rico",     label: "Rico",     color: "#00A651" },
  { id: "clear",    label: "Clear",    color: "#00C8C8" },
  { id: "binance",  label: "Binance",  color: "#F0B90B" },
  { id: "avenue",   label: "Avenue",   color: "#60a5fa" },
  { id: "sicoob",   label: "Sicoob",   color: "#34d399" },
  { id: "c6",       label: "C6 Bank",  color: "#94a3b8" },
];

const GOAL_FIELDS = [
  { key: "patrimony",          icon: "◆", label: "Meta de patrimônio",       placeholder: "1.000.000" },
  { key: "monthlySavings",     icon: "↑", label: "Economia mensal",          placeholder: "2.000" },
  { key: "monthlySpending",    icon: "↓", label: "Limite de gastos mensais", placeholder: "5.000" },
  { key: "monthlyInvestment",  icon: "↗", label: "Aporte mensal",            placeholder: "1.500" },
  { key: "emergencyFund",      icon: "◈", label: "Reserva de emergência",    placeholder: "30.000" },
];

/* ─── shared styles ─────────────────────────────────────── */

const S = {
  wrap: {
    minHeight: "100vh",
    background: "#020617",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    fontFamily: "'Syne', sans-serif",
    color: "#f1f5f9",
  },
  card: {
    width: "100%",
    maxWidth: 480,
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  label: {
    color: "#475569",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontFamily: "'DM Mono', monospace",
    margin: "0 0 6px",
  },
  input: {
    width: "100%",
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: "14px 16px",
    color: "#f1f5f9",
    fontSize: 16,
    fontFamily: "'Syne', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  btnPrimary: {
    width: "100%",
    background: "#34d399",
    border: "none",
    borderRadius: 14,
    color: "#020617",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: 15,
    padding: "16px",
    cursor: "pointer",
    marginTop: 8,
    transition: "opacity 0.15s, transform 0.1s",
  },
  btnGhost: {
    background: "transparent",
    border: "none",
    color: "#475569",
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    cursor: "pointer",
    padding: "12px 0",
    textAlign: "center",
  },
};

/* ─── progress bar ──────────────────────────────────────── */

function Progress({ step, total }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 40 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 2, borderRadius: 2,
          background: i <= step ? "#34d399" : "#1e293b",
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  );
}

/* ─── step 1: welcome ───────────────────────────────────── */

function StepWelcome({ onNext }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontSize: 42,
        fontWeight: 800,
        letterSpacing: -1,
        color: "#f1f5f9",
        marginBottom: 12,
      }}>
        Auren
      </div>
      <div style={{
        width: 32,
        height: 1,
        background: "#34d399",
        margin: "0 auto 32px",
      }} />
      <p style={{
        fontSize: 22,
        fontWeight: 700,
        color: "#f1f5f9",
        margin: "0 0 12px",
        lineHeight: 1.3,
      }}>
        Sua inteligência financeira.
      </p>
      <p style={{
        fontSize: 15,
        color: "#64748b",
        margin: "0 0 48px",
        lineHeight: 1.6,
      }}>
        Organize suas contas, defina metas e acompanhe<br />
        cada decisão com clareza.
      </p>
      <button style={S.btnPrimary} onClick={onNext}>
        Começar →
      </button>
    </div>
  );
}

/* ─── step 2: profile ───────────────────────────────────── */

function StepProfile({ data, onChange, onNext, onBack }) {
  const valid = data.name.trim().length > 0 && data.incomeRange && data.primaryGoal;

  return (
    <div>
      <p style={{ ...S.label, marginBottom: 4 }}>Passo 1 de 3</p>
      <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 32px", color: "#f1f5f9" }}>
        Vamos te conhecer
      </h2>

      <div style={{ marginBottom: 24 }}>
        <p style={S.label}>Como posso te chamar?</p>
        <input
          style={S.input}
          placeholder="Seu nome"
          value={data.name}
          onChange={(e) => onChange("name", e.target.value)}
          autoFocus
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <p style={S.label}>Faixa de renda mensal</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {INCOME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => onChange("incomeRange", r)}
              style={{
                background: data.incomeRange === r ? "#34d39922" : "#0f172a",
                border: `1px solid ${data.incomeRange === r ? "#34d399" : "#1e293b"}`,
                borderRadius: 20,
                color: data.incomeRange === r ? "#34d399" : "#64748b",
                padding: "8px 14px",
                fontSize: 12,
                fontFamily: "'DM Mono', monospace",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <p style={S.label}>Objetivo principal</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PRIMARY_GOALS.map((g) => (
            <button
              key={g.id}
              onClick={() => onChange("primaryGoal", g.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: data.primaryGoal === g.id ? "#34d39911" : "#0f172a",
                border: `1px solid ${data.primaryGoal === g.id ? "#34d39966" : "#1e293b"}`,
                borderRadius: 12,
                padding: "13px 16px",
                color: data.primaryGoal === g.id ? "#34d399" : "#94a3b8",
                fontSize: 14,
                fontFamily: "'Syne', sans-serif",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 16, opacity: 0.7 }}>{g.icon}</span>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <button
        style={{ ...S.btnPrimary, opacity: valid ? 1 : 0.4, cursor: valid ? "pointer" : "not-allowed" }}
        onClick={valid ? onNext : undefined}
      >
        Continuar →
      </button>
    </div>
  );
}

/* ─── step 3: institutions ──────────────────────────────── */

function StepInstitutions({ selected, onToggle, onNext, onSkip }) {
  return (
    <div>
      <p style={{ ...S.label, marginBottom: 4 }}>Passo 2 de 3</p>
      <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "#f1f5f9" }}>
        Onde você tem dinheiro?
      </h2>
      <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 28px", lineHeight: 1.5 }}>
        Selecione suas contas, corretoras e carteiras.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 8,
        marginBottom: 32,
      }}>
        {INSTITUTIONS.map((inst) => {
          const active = selected.includes(inst.id);
          return (
            <button
              key={inst.id}
              onClick={() => onToggle(inst.id)}
              style={{
                background: active ? `${inst.color}15` : "#0f172a",
                border: `1px solid ${active ? inst.color + "55" : "#1e293b"}`,
                borderRadius: 12,
                padding: "14px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: active ? inst.color : "#1e293b",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
              }}>
                <span style={{ color: "#020617", fontWeight: 800, fontSize: 10 }}>
                  {inst.label.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span style={{
                fontSize: 11,
                color: active ? "#f1f5f9" : "#64748b",
                fontFamily: "'DM Mono', monospace",
                textAlign: "center",
              }}>
                {inst.label}
              </span>
            </button>
          );
        })}
      </div>

      <button style={S.btnPrimary} onClick={onNext}>
        {selected.length > 0 ? `Continuar com ${selected.length} selecionadas →` : "Continuar →"}
      </button>
      <button style={S.btnGhost} onClick={onSkip}>Pular por agora</button>
    </div>
  );
}

/* ─── step 4: goals ─────────────────────────────────────── */

function StepGoals({ data, onChange, onNext, onSkip }) {
  const hasAny = GOAL_FIELDS.some((f) => data[f.key]);

  return (
    <div>
      <p style={{ ...S.label, marginBottom: 4 }}>Passo 3 de 3</p>
      <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "#f1f5f9" }}>
        Defina suas metas
      </h2>
      <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 28px", lineHeight: 1.5 }}>
        Quanto você quer alcançar? Pode ajustar depois.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
        {GOAL_FIELDS.map((f) => (
          <div key={f.key}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ color: "#34d399", fontSize: 13 }}>{f.icon}</span>
              <p style={{ ...S.label, margin: 0 }}>{f.label}</p>
            </div>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                color: "#334155", fontFamily: "'DM Mono', monospace", fontSize: 14,
                pointerEvents: "none",
              }}>R$</span>
              <input
                style={{ ...S.input, paddingLeft: 36 }}
                placeholder={f.placeholder}
                value={data[f.key] || ""}
                onChange={(e) => onChange(f.key, e.target.value)}
                inputMode="numeric"
              />
            </div>
          </div>
        ))}
      </div>

      <button style={S.btnPrimary} onClick={onNext}>
        {hasAny ? "Salvar e continuar →" : "Continuar →"}
      </button>
      <button style={S.btnGhost} onClick={onSkip}>Pular por agora</button>
    </div>
  );
}

/* ─── step 5: finish ─────────────────────────────────────── */

function StepFinish({ profile, goals, onEnter }) {
  const activeGoals = GOAL_FIELDS.filter((f) => goals[f.key]);
  const name = profile?.name?.split(" ")[0] || "você";

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "#34d39915", border: "1px solid #34d39944",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 28px",
        fontSize: 28,
      }}>
        ✓
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "#f1f5f9" }}>
        Tudo pronto, {name}.
      </h2>
      <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 32px", lineHeight: 1.5 }}>
        Sua jornada financeira começa agora.
      </p>

      {activeGoals.length > 0 && (
        <div style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 14,
          padding: "16px 18px",
          marginBottom: 28,
          textAlign: "left",
        }}>
          <p style={{ ...S.label, marginBottom: 12 }}>Suas metas</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeGoals.map((f) => (
              <div key={f.key} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "#34d399", fontSize: 12 }}>{f.icon}</span>
                  <span style={{ color: "#94a3b8", fontSize: 13 }}>{f.label}</span>
                </div>
                <span style={{
                  color: "#34d399",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  R$ {Number(String(goals[f.key]).replace(/\./g, "").replace(",", ".")).toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile?.incomeRange && (
        <div style={{
          display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 32,
        }}>
          <span style={{
            background: "#1e293b", borderRadius: 20,
            padding: "5px 12px", fontSize: 11, color: "#64748b",
            fontFamily: "'DM Mono', monospace",
          }}>
            {profile.incomeRange}
          </span>
          {profile.primaryGoal && (
            <span style={{
              background: "#34d39911", border: "1px solid #34d39930",
              borderRadius: 20, padding: "5px 12px", fontSize: 11, color: "#34d399",
              fontFamily: "'DM Mono', monospace",
            }}>
              {PRIMARY_GOALS.find((g) => g.id === profile.primaryGoal)?.label}
            </span>
          )}
        </div>
      )}

      <button style={S.btnPrimary} onClick={onEnter}>
        Entrar no Auren →
      </button>
    </div>
  );
}

/* ─── main page ─────────────────────────────────────────── */

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const { completeOnboarding, updateGoals } = useApp();

  const [step, setStep]               = useState(0);
  const [fading, setFading]           = useState(false);
  const [profile, setProfile]         = useState({ name: "", incomeRange: "", primaryGoal: "" });
  const [institutions, setInstitutions] = useState([]);
  const [goalsData, setGoalsData]     = useState({});

  const transition = (next) => {
    setFading(true);
    setTimeout(() => { setStep(next); setFading(false); }, 180);
  };

  const changeProfile = (key, val) => setProfile((p) => ({ ...p, [key]: val }));
  const changeGoal    = (key, val) => setGoalsData((p) => ({ ...p, [key]: val }));

  const toggleInstitution = (id) => {
    setInstitutions((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const buildGoals = () =>
    GOAL_FIELDS
      .filter((f) => goalsData[f.key])
      .map((f) => ({
        id: f.key,
        type: f.key,
        label: f.label,
        icon: f.icon,
        targetValue: parseFloat(String(goalsData[f.key]).replace(/\./g, "").replace(",", ".")) || 0,
        currentValue: 0,
        status: "active",
        createdAt: new Date().toISOString(),
      }));

  const handleFinish = () => {
    const goals = buildGoals();
    updateGoals(goals);
    completeOnboarding({ profile, institutions });
  };

  const contentStyle = {
    opacity: fading ? 0 : 1,
    transform: fading ? "translateY(10px)" : "translateY(0)",
    transition: "opacity 0.18s ease, transform 0.18s ease",
  };

  return (
    <div style={S.wrap}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={S.card}>
        {step > 0 && <Progress step={step - 1} total={TOTAL_STEPS - 2} />}
        <div style={contentStyle}>
          {step === 0 && (
            <StepWelcome onNext={() => transition(1)} />
          )}
          {step === 1 && (
            <StepProfile
              data={profile}
              onChange={changeProfile}
              onNext={() => transition(2)}
              onBack={() => transition(0)}
            />
          )}
          {step === 2 && (
            <StepInstitutions
              selected={institutions}
              onToggle={toggleInstitution}
              onNext={() => transition(3)}
              onSkip={() => transition(3)}
            />
          )}
          {step === 3 && (
            <StepGoals
              data={goalsData}
              onChange={changeGoal}
              onNext={() => transition(4)}
              onSkip={() => transition(4)}
            />
          )}
          {step === 4 && (
            <StepFinish
              profile={profile}
              goals={goalsData}
              onEnter={handleFinish}
            />
          )}
        </div>
      </div>
    </div>
  );
}
