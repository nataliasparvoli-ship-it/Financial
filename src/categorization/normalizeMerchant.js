const MERCHANT_REPLACEMENTS = [
  { pattern: /\bifood\b.*/g, replacement: "ifood" },
  { pattern: /\buber\s*eats\b.*/g, replacement: "uber eats" },
  {
    pattern: /\buber(?!\s*eats)\s*(trip|br|do brasil)?\b.*/g,
    replacement: "uber trip",
  },
  { pattern: /\bnetflix\b.*/g, replacement: "netflix" },
  { pattern: /\bairbnb\b.*/g, replacement: "airbnb" },
];

export const normalizeMerchant = (value) => {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[*_.,;:()[\]{}+!?@#$%&=]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return MERCHANT_REPLACEMENTS.reduce(
    (merchant, { pattern, replacement }) =>
      merchant.replace(pattern, replacement),
    normalized,
  ).trim();
};
