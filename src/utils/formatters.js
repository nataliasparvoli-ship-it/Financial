export const fmt = (value) =>
  `R$ ${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

export const fmtK = (value) => {
  const number = Number(value || 0);

  if (Math.abs(number) >= 1000000) {
    return `R$ ${(number / 1000000).toFixed(2)}M`;
  }

  if (Math.abs(number) >= 1000) {
    return `R$ ${(number / 1000).toFixed(0)}K`;
  }

  return fmt(number);
};

export const parseCurrency = (value) => {
  if (typeof value === "number") return value;

  const cleaned = String(value || "")
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\((.*)\)/, "-$1")
    .replace(/[^0-9,.-]/g, "");

  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimalSeparator = lastComma > lastDot ? "," : ".";
  const normalized = cleaned
    .replace(new RegExp(`\\${decimalSeparator === "," ? "." : ","}`, "g"), "")
    .replace(decimalSeparator, ".");

  return Number(normalized) || 0;
};
