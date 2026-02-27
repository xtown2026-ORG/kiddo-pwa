export function toTitleCase(value) {
  if (typeof value !== "string") return value;

  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function normalizeTitleCaseFields(data, fields) {
  if (!data || typeof data !== "object") return data;
  const next = { ...data };

  for (const field of fields || []) {
    if (typeof next[field] === "string" && next[field].trim() !== "") {
      next[field] = toTitleCase(next[field]);
    }
  }

  return next;
}

export function normalizeUpperCaseFields(data, fields) {
  if (!data || typeof data !== "object") return data;
  const next = { ...data };

  for (const field of fields || []) {
    if (typeof next[field] === "string" && next[field].trim() !== "") {
      next[field] = next[field].trim().toUpperCase();
    }
  }

  return next;
}
