/**
 * Onboarding translations — PT-BR and EN.
 *
 * To add a new language, duplicate one of the locale objects and update
 * the copy. No other files need to change.
 *
 * Conventions
 *   - Static strings → plain value.
 *   - Runtime interpolation → function: (name) => `All set, ${name}.`
 *   - Item arrays (goals, income ranges) → array of objects.
 *   - optional: true → renders a soft "(opcional)" indicator; no required feel.
 */

export const ONBOARDING_TRANSLATIONS = {

  // ── Português — Brasil ───────────────────────────────────────────────────────
  "pt-BR": {
    welcome: {
      tagline: "Sua inteligência financeira.",
      subtitle: "Organize suas contas, defina metas e acompanhe\ncada decisão com clareza.",
      cta: "Começar",
    },

    location: {
      step: "Passo 1 de 4",
      title: "Onde você está baseado?",
      subtitle: "Para personalizar sua experiência financeira.",
      currencyLabel: "Moeda principal",
      continue: "Continuar",
      skip: "Pular por agora",
    },

    profile: {
      step: "Passo 2 de 4",
      title: "Vamos te conhecer",
      nameLabel: "Como posso te chamar?",
      namePlaceholder: "Seu nome",
      incomeLabel: "Renda mensal",
      incomeRanges: ["Até 3k", "3k – 6k", "6k – 12k", "12k – 25k", "Acima de 25k"],
      primaryGoalLabel: "Objetivo principal",
      primaryChip: "principal",
      secondaryLabel: "Metas secundárias",
      secondaryHint: "opcional · máx. 2",
      continue: "Continuar",
      primaryGoals: [
        { id: "control",  icon: "◈", label: "Controle financeiro" },
        { id: "invest",   icon: "↗", label: "Investir melhor" },
        { id: "wealth",   icon: "◆", label: "Aumentar patrimônio" },
        { id: "save",     icon: "○", label: "Economizar mais" },
        { id: "freedom",  icon: "◻", label: "Independência financeira" },
      ],
    },

    institutions: {
      step: "Passo 3 de 4",
      title: "Onde você tem dinheiro?",
      subtitle: "Selecione suas contas, corretoras e carteiras.",
      continueWith: (n) => `Continuar com ${n}`,
      continue: "Continuar",
      skip: "Pular por agora",
      otherLabel: "Outro",
    },

    goals: {
      step: "Passo 4 de 4",
      title: "Sua visão financeira",
      // Reassuring, conversational — not form-like
      subtitle: "Comece com o que você já sabe.\nAjuste quando quiser.",
      optionalHint: "opcional",
      save: "Salvar e continuar",
      continue: "Continuar",
      skip: "Pular por agora",
      // monthlySavings removed (redundant with monthlyInvestment)
      fields: [
        { key: "patrimony",         icon: "◆", label: "Patrimônio alvo",    placeholder: "1.000.000" },
        { key: "monthlyInvestment", icon: "↗", label: "Investimento mensal", placeholder: "1.500" },
        { key: "emergencyFund",     icon: "◈", label: "Reserva de emergência", placeholder: "30.000" },
        { key: "monthlySpending",   icon: "↓", label: "Orçamento mensal",    placeholder: "5.000", optional: true },
      ],
    },

    finish: {
      title: (name) => `Tudo pronto, ${name}.`,
      subtitle: "Sua jornada financeira começa agora.",
      goalsLabel: "Suas metas",
      cta: "Entrar no Auren",
    },
  },

  // ── English ──────────────────────────────────────────────────────────────────
  "en": {
    welcome: {
      tagline: "Your financial intelligence.",
      subtitle: "Organize your accounts, set goals, and track\nevery decision with clarity.",
      cta: "Get started",
    },

    location: {
      step: "Step 1 of 4",
      title: "Where are you based?",
      subtitle: "To personalize your financial experience.",
      currencyLabel: "Primary currency",
      continue: "Continue",
      skip: "Skip for now",
    },

    profile: {
      step: "Step 2 of 4",
      title: "Let's get to know you",
      nameLabel: "What should I call you?",
      namePlaceholder: "Your name",
      incomeLabel: "Monthly income",
      incomeRanges: ["Up to 3k", "3k – 6k", "6k – 12k", "12k – 25k", "Above 25k"],
      primaryGoalLabel: "Primary goal",
      primaryChip: "primary",
      secondaryLabel: "Secondary goals",
      secondaryHint: "optional · max. 2",
      continue: "Continue",
      primaryGoals: [
        { id: "control",  icon: "◈", label: "Financial control" },
        { id: "invest",   icon: "↗", label: "Invest smarter" },
        { id: "wealth",   icon: "◆", label: "Build wealth" },
        { id: "save",     icon: "○", label: "Save more" },
        { id: "freedom",  icon: "◻", label: "Financial independence" },
      ],
    },

    institutions: {
      step: "Step 3 of 4",
      title: "Where do you keep your money?",
      subtitle: "Select your accounts, brokerages, and wallets.",
      continueWith: (n) => `Continue with ${n}`,
      continue: "Continue",
      skip: "Skip for now",
      otherLabel: "Other",
    },

    goals: {
      step: "Step 4 of 4",
      title: "Your financial vision",
      subtitle: "Start with what you already know.\nYou can always adjust these later.",
      optionalHint: "optional",
      save: "Save and continue",
      continue: "Continue",
      skip: "Skip for now",
      fields: [
        { key: "patrimony",         icon: "◆", label: "Wealth target",       placeholder: "1,000,000" },
        { key: "monthlyInvestment", icon: "↗", label: "Monthly investment",   placeholder: "1,500" },
        { key: "emergencyFund",     icon: "◈", label: "Emergency fund",       placeholder: "30,000" },
        { key: "monthlySpending",   icon: "↓", label: "Monthly budget",       placeholder: "5,000", optional: true },
      ],
    },

    finish: {
      title: (name) => `All set, ${name}.`,
      subtitle: "Your financial journey starts now.",
      goalsLabel: "Your goals",
      cta: "Enter Auren",
    },
  },
};

/** Fallback when an unsupported locale is requested. */
export const FALLBACK_LANGUAGE = "pt-BR";
