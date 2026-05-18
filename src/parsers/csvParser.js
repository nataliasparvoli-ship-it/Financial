export const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const detectDelimiter = (line) => {
  const delimiters = [";", ",", "\t", "|"];

  return delimiters.reduce(
    (best, delimiter) => {
      const count = line.split(delimiter).length;
      return count > best.count ? { delimiter, count } : best;
    },
    { delimiter: ";", count: 0 },
  ).delimiter;
};

const splitCsvLine = (line, delimiter) => {
  const values = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
};

export const parseDelimitedText = (text) => {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], invalidRows: lines.length, delimiter: null };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeKey);
  const rows = [];
  let invalidRows = 0;

  lines.slice(1).forEach((line) => {
    const values = splitCsvLine(line, delimiter);

    if (values.length < 2 || values.every((value) => !value)) {
      invalidRows += 1;
      return;
    }

    rows.push(
      headers.reduce((row, header, index) => {
        row[header] = values[index] || "";
        return row;
      }, {}),
    );
  });

  return { rows, invalidRows, delimiter };
};
