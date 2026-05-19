const KEY = "financial-dashboard.userRules.v1";

export const loadUserRules = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const saveUserRules = (rules) => {
  try { localStorage.setItem(KEY, JSON.stringify(rules)); return true; }
  catch { return false; }
};

// Called when user corrects a category — learns a new rule
export const learnRule = (normalizedMerchant, category) => {
  if (!normalizedMerchant || !category) return;
  const rules = loadUserRules();

  // Remove any existing rule for this merchant
  const filtered = rules.filter((r) => !r.match.includes(normalizedMerchant));

  filtered.unshift({
    id: `user_${Date.now()}`,
    category,
    priority: 300,  // always above system rules
    matchType: "includes",
    match: [normalizedMerchant],
    source: "user",
    learnedAt: new Date().toISOString(),
  });

  saveUserRules(filtered);
};

export const clearUserRules = () => {
  try { localStorage.removeItem(KEY); } catch {}
};
