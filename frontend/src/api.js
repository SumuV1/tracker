// Klient API. Zastąpił shim window.storage — dane nie są już blobem JSON pod
// jednym kluczem, tylko zwykłymi zasobami wystawionymi przez serwer.
const BASE = "/api";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    credentials: "same-origin",       // ciasteczko sesji
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // odpowiedź bez ciała — dla części metod to poprawne
  }
  if (!res.ok) throw new ApiError(data?.error || `Błąd ${res.status}`, res.status);
  return data;
}

const qs = params =>
  Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

export const api = {
  me: () => request("/auth/me"),
  login: (login, password) => request("/auth/login", { method: "POST", body: { login, password } }),
  logout: () => request("/auth/logout", { method: "POST" }),

  habits: () => request("/habits"),
  addHabit: body => request("/habits", { method: "POST", body }),
  patchHabit: (id, body) => request(`/habits/${id}`, { method: "PATCH", body }),
  deleteHabit: id => request(`/habits/${id}`, { method: "DELETE" }),
  logs: (from, to) => request(`/habits/logs?${qs({ from, to })}`),
  setLog: (id, day, done) => request(`/habits/${id}/logs/${day}`, { method: done ? "PUT" : "DELETE" }),

  profile: () => request("/profile"),
  saveProfile: body => request("/profile", { method: "PUT", body }),

  foods: params => request(`/foods?${qs(params)}`),
  foodCategories: () => request("/foods/categories"),
  addFood: body => request("/foods", { method: "POST", body }),
  patchFood: (id, body) => request(`/foods/${id}`, { method: "PATCH", body }),
  deleteFood: id => request(`/foods/${id}`, { method: "DELETE" }),

  meals: day => request(`/meals?${qs({ day })}`),
  dailyTotals: year => request(`/meals/daily-totals?${qs({ year })}`),
  addMeal: body => request("/meals", { method: "POST", body }),
  updateMeal: (id, body) => request(`/meals/${id}`, { method: "PATCH", body }),
  deleteMeal: id => request(`/meals/${id}`, { method: "DELETE" }),

  measurements: () => request("/measurements"),
  addMeasurement: body => request("/measurements", { method: "POST", body }),
  deleteMeasurement: id => request(`/measurements/${id}`, { method: "DELETE" }),

  principles: () => request("/stability/principles"),
  addPrinciple: body => request("/stability/principles", { method: "POST", body }),
  patchPrinciple: (id, body) => request(`/stability/principles/${id}`, { method: "PATCH", body }),
  deletePrinciple: id => request(`/stability/principles/${id}`, { method: "DELETE" }),
  seedPrinciples: () => request("/stability/principles/seed", { method: "POST" }),
  checkins: days => request(`/stability/checkins?${qs({ days })}`),
  addCheckin: body => request("/stability/checkins", { method: "POST", body }),
  deleteCheckin: id => request(`/stability/checkins/${id}`, { method: "DELETE" }),
  techniqueUses: days => request(`/stability/uses?${qs({ days })}`),
  addTechniqueUse: technique => request("/stability/uses", { method: "POST", body: { technique } }),

  avoid: () => request("/avoid"),
  addAvoid: body => request("/avoid", { method: "POST", body }),
  patchAvoid: (id, body) => request(`/avoid/${id}`, { method: "PATCH", body }),
  deleteAvoid: id => request(`/avoid/${id}`, { method: "DELETE" }),

  // Plany treningowe — cały plan w formacie sledzik-plan/1 (shared/planSchema.mjs).
  plans: () => request("/plans"),
  addPlan: plan => request("/plans", { method: "POST", body: plan }),
  updatePlan: (id, plan) => request(`/plans/${id}`, { method: "PUT", body: plan }),
  deletePlan: id => request(`/plans/${id}`, { method: "DELETE" }),
  planLog: date => request(`/plans/log?${qs({ date })}`),
  // Całe docelowe ustawienie pozycji: { planId, dayKey, kind, exIndex, exName, date, done, maxLoad }.
  setPlanLog: body => request("/plans/log", { method: "POST", body }),

  anchors: () => request("/anchors"),
  addAnchor: body => request("/anchors", { method: "POST", body }),
  deleteAnchor: id => request(`/anchors/${id}`, { method: "DELETE" }),

  offSearch: q => request(`/off/search?${qs({ q })}`),
  offImport: code => request("/off/import", { method: "POST", body: { code } }),
};
