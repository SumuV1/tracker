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

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function reqDate(value, field) {
  const m = typeof value === "string" ? value.match(DATE_RE) : null;
  if (!m) throw new BadRequest(`Pole "${field}" musi mieć format RRRR-MM-DD.`);
  // Sam kształt nie wystarczy: "2026-99-99" przechodził przez wyrażenie i leciał
  // do Postgresa, który rzucał "date/time field value out of range" — a ten błąd
  // nie ma pola `status`, więc klient dostawał 500 zamiast czytelnego 400.
  // UTC, bo chodzi o samą datę z kalendarza, nie o moment w czasie.
  const [, y, mo, d] = m.map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    throw new BadRequest(`Pole "${field}" nie jest istniejącą datą.`);
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
  // Number zamiast parseFloat: parseFloat("100abc") zwracał 100, więc literówka
  // w gramaturze zapisywała się jako poprawna liczba. Number ma z kolei własną
  // pułapkę — "" i sam biały znak zamienia na 0 — stąd jawne odrzucenie pustego
  // tekstu i wszystkiego, co nie jest liczbą ani tekstem.
  let n;
  if (typeof value === "number") n = value;
  else if (typeof value === "string" && value.trim() !== "") n = Number(value);
  else n = NaN;
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
