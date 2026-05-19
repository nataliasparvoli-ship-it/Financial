/* ─── Goal metadata + dashboard config ───────────────────────────────────── */

const GOAL_META = {
  control: {
    id: "control",
    label: "Controle financeiro",
    icon: "◈",
    description: "Monitore cada gasto e mantenha o orçamento em dia",
    primaryTab: 2,
    accentColor: "#60a5fa",
    insightFocus: "spending",
    kpiPriority: ["despesas", "saldo", "renda"],
  },
  invest: {
    id: "invest",
    label: "Investir melhor",
    icon: "↗",
    description: "Acompanhe sua carteira e otimize a alocação de ativos",
    primaryTab: 4,
    accentColor: "#34d399",
    insightFocus: "portfolio",
    kpiPriority: ["aportes", "patrimonio", "renda_passiva"],
  },
  wealth: {
    id: "wealth",
    label: "Aumentar patrimônio",
    icon: "◆",
    description: "Evolua seu patrimônio líquido mês a mês",
    primaryTab: 1,
    accentColor: "#a78bfa",
    insightFocus: "patrimony",
    kpiPriority: ["patrimonio", "aportes", "renda_passiva"],
  },
  save: {
    id: "save",
    label: "Economizar mais",
    icon: "○",
    description: "Reduza gastos e aumente sua taxa de poupança",
    primaryTab: 2,
    accentColor: "#fbbf24",
    insightFocus: "savings",
    kpiPriority: ["saldo", "despesas", "renda"],
  },
  freedom: {
    id: "freedom",
    label: "Independência financeira",
    icon: "◻",
    description: "Construa renda passiva que cubra suas despesas",
    primaryTab: 0,
    accentColor: "#34d399",
    insightFocus: "fi",
    kpiPriority: ["renda_passiva", "patrimonio", "aportes"],
  },
};

export const ALL_GOALS = Object.values(GOAL_META);

export const getGoalMeta = (goalId) => GOAL_META[goalId] ?? GOAL_META.control;

/**
 * Returns dashboard config derived from user goals.
 * This is the single place that maps goals → UI behavior.
 */
export const getDashboardConfig = (primaryGoal, secondaryGoals = []) => {
  const primary = getGoalMeta(primaryGoal);
  const secondary = (secondaryGoals ?? []).map(getGoalMeta);

  return {
    initialTab: primary.primaryTab,
    accentColor: primary.accentColor,
    primaryGoalLabel: primary.label,
    primaryGoalIcon: primary.icon,
    insightFocus: primary.insightFocus,
    secondaryLabels: secondary.map((g) => g.label),
    allGoalIds: [primaryGoal, ...(secondaryGoals ?? [])].filter(Boolean),
  };
};
