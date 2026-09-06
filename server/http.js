// Drobne narzędzia wspólne dla tras.

// Express 4 nie łapie odrzuconych obietnic z handlerów async — bez tego
// każdy błąd bazy kończyłby się wiszącym żądaniem zamiast odpowiedzią 500.
export const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export class BadRequest extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function reqDate(value, field) {
  if (typeof value !== "string" || !DATE_RE.test(value)) {
    throw new BadRequest(`Pole "${field}" musi mieć format RRRR-MM-DD.`);
  }
  return value;
}

export function reqText(value, field, { max = 200, min = 1 } = {}) {
  const v = typeof value === "string" ? value.trim() : "";
  if (v.length < min) throw new BadRequest(`Pole "${field}" jest wymagane.`);
  if (v.length > max) throw new BadRequest(`Pole "${field}" może mieć najwyżej ${max} znaków.`);
  return v;
}

export function optText(value, field, opts = {}) {
  if (value === undefined || value === null || value === "") return null;
  return reqText(value, field, opts);
}

export function reqNumber(value, field, { min = 0, max = 1e6 } = {}) {
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(n)) throw new BadRequest(`Pole "${field}" musi być liczbą.`);
  if (n < min || n > max) throw new BadRequest(`Pole "${field}" musi mieścić się w zakresie ${min}–${max}.`);
  return n;
}

export function optNumber(value, field, opts = {}) {
  if (value === undefined || value === null || value === "") return null;
  return reqNumber(value, field, opts);
}

export function reqId(value, field = "id") {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new BadRequest(`Nieprawidłowy identyfikator (${field}).`);
  return n;
}

// Godzina "HH:MM"; pusta wartość znaczy „bez przypomnienia”.
export function optTime(value, field) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new BadRequest(`Pole "${field}" musi mieć format GG:MM.`);
  }
  return value;
}
