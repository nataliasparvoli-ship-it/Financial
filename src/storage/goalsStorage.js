const KEY = "auren.goals.v1";

export const saveGoals = (goals) => {
  try { localStorage.setItem(KEY, JSON.stringify(goals)); } catch {}
};

export const loadGoals = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};

export const clearGoals = () => {
  try { localStorage.removeItem(KEY); } catch {}
};
