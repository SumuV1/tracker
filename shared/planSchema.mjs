// Format planu treningowego „sledzik-plan/1” — jedno źródło prawdy dla
// formularza w aplikacji, importu pliku i serwera. Plik jest w `shared/`,
// bo tę samą walidację wykonuje przeglądarka (żeby pokazać błędy przed
// wysłaniem) i API (żeby nie ufać przeglądarce). Rozszerzenie .mjs, bo katalog
// nie ma własnego package.json i Node potraktowałby .js jako CommonJS.
//
// `validatePlan` zwraca { errors, plan }: `errors` to lista czytelnych zdań
// po polsku ze wskazaniem miejsca, `plan` — znormalizowana kopia (przycięte
// spacje, pominięte puste pola opcjonalne, odrzucone nieznane klucze), gotowa
// do zapisu i do eksportu. Bez błędów `plan` jest kompletny; z błędami
// zawiera to, co dało się zebrać, i nie należy go zapisywać.

export const PLAN_FORMAT = "sledzik-plan/1";

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// Identyfikatory mięśni muszą pokrywać się z kluczami MUSCLES w sylwetce
// (frontend/src/tabs/Muscles.jsx) — inaczej dzień planu nie ma czego podświetlić.
export const MUSCLE_IDS = [
  "deltoid_front", "pectoralis", "biceps", "rectus_abdominis", "obliques", "serratus",
  "forearm_front", "quadriceps", "adductors", "tibialis", "sartorius",
  "trapezius", "deltoid_back", "infraspinatus", "latissimus", "erector_spinae",
  "gluteus", "hamstrings", "gastrocnemius", "triceps", "forearm_back",
  "sternocleidomastoid", "scalenes", "platysma",
];

export const LIMITS = {
  name: 80, summary: 300, note: 1000, rules: 12, ruleTitle: 80, ruleText: 1000,
  dayTitle: 60, dayShort: 14, dayText: 1000, muscles: 10, exercises: 15,
  exName: 100, exSets: 40, exLoad: 80, exRest: 40, exDesc: 1000,
  machine: 40, variants: 4, varName: 40, varTime: 40, varDesc: 300,
  bytes: 200 * 1024,
};

const DAY_LABEL = {
  mon: "Poniedziałek", tue: "Wtorek", wed: "Środa", thu: "Czwartek",
  fri: "Piątek", sat: "Sobota", sun: "Niedziela",
};

const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);

export function validatePlan(input) {
  const errors = [];
  const err = (where, what) => errors.push(where ? `${where}: ${what}` : what);

  // Tekst: wymagany lub opcjonalny, zawsze przycięty i ograniczony długością.
  const text = (v, where, field, max, required) => {
    if (v === undefined || v === null || v === "") {
      if (required) err(where, `brakuje pola „${field}”`);
      return undefined;
    }
    if (typeof v !== "string") { err(where, `pole „${field}” ma być tekstem`); return undefined; }
    const t = v.trim();
    if (!t) { if (required) err(where, `pole „${field}” jest puste`); return undefined; }
    if (t.length > max) { err(where, `pole „${field}” jest za długie (${t.length} > ${max} znaków)`); return t.slice(0, max); }
    return t;
  };

  if (!isObj(input)) return { errors: ["Plan ma być obiektem JSON."], plan: null };
  if (input.format !== undefined && input.format !== PLAN_FORMAT) {
    err("", `nieznany format „${input.format}” — oczekiwany „${PLAN_FORMAT}”`);
  }

  const plan = { format: PLAN_FORMAT };
  plan.name = text(input.name, "", "name", LIMITS.name, true);
  const summary = text(input.summary, "", "summary", LIMITS.summary);
  if (summary) plan.summary = summary;
  const note = text(input.note, "", "note", LIMITS.note);
  if (note) plan.note = note;

  if (input.rules !== undefined) {
    if (!Array.isArray(input.rules)) err("", "„rules” ma być listą");
    else {
      if (input.rules.length > LIMITS.rules) err("", `za dużo zasad (maks. ${LIMITS.rules})`);
      const rules = [];
      input.rules.slice(0, LIMITS.rules).forEach((r, i) => {
        const where = `Zasada ${i + 1}`;
        if (!isObj(r)) { err(where, "ma być obiektem"); return; }
        const rule = {
          title: text(r.title, where, "title", LIMITS.ruleTitle, true),
          text: text(r.text, where, "text", LIMITS.ruleText, true),
        };
        rules.push(rule);
      });
      if (rules.length) plan.rules = rules;
    }
  }

  plan.days = {};
  if (!isObj(input.days)) {
    err("", "brakuje „days” — obiektu z dniami tygodnia (mon…sun)");
  } else {
    for (const key of Object.keys(input.days)) {
      if (!DAY_KEYS.includes(key)) err("", `nieznany dzień „${key}” — dozwolone: ${DAY_KEYS.join(", ")}`);
    }
    for (const key of DAY_KEYS) {
      const where = DAY_LABEL[key];
      const d = input.days[key];
      if (!isObj(d)) { err(where, "brakuje dnia"); continue; }
      const day = {};
      day.title = text(d.title, where, "title", LIMITS.dayTitle, true);
      const short = text(d.short, where, "short", LIMITS.dayShort);
      day.short = short || (day.title ? day.title.slice(0, LIMITS.dayShort) : "");
      if (d.rest !== undefined && typeof d.rest !== "boolean") err(where, "„rest” ma być true/false");
      if (d.rest === true) day.rest = true;
      const desc = text(d.desc, where, "desc", LIMITS.dayText);
      if (desc) day.desc = desc;

      for (const field of ["primary", "support"]) {
        const list = d[field] === undefined ? [] : d[field];
        if (!Array.isArray(list)) { err(where, `„${field}” ma być listą identyfikatorów mięśni`); day[field] = []; continue; }
        const ids = [];
        for (const id of list) {
          if (typeof id !== "string" || !MUSCLE_IDS.includes(id)) err(where, `nieznany mięsień „${String(id)}” w „${field}”`);
          else if (!ids.includes(id)) ids.push(id);
        }
        if (ids.length > LIMITS.muscles) err(where, `za dużo mięśni w „${field}” (maks. ${LIMITS.muscles})`);
        day[field] = ids.slice(0, LIMITS.muscles);
      }
      const both = day.support.filter(id => day.primary.includes(id));
      if (both.length) {
        err(where, `mięsień nie może być jednocześnie główny i wspomagający (${both.join(", ")})`);
        day.support = day.support.filter(id => !day.primary.includes(id));
      }

      const warmup = text(d.warmup, where, "warmup", LIMITS.dayText);
      if (warmup) day.warmup = warmup;
      const loadNote = text(d.loadNote, where, "loadNote", LIMITS.dayText);
      if (loadNote) day.loadNote = loadNote;

      const exs = d.exercises === undefined ? [] : d.exercises;
      day.exercises = [];
      if (!Array.isArray(exs)) err(where, "„exercises” ma być listą");
      else {
        if (exs.length > LIMITS.exercises) err(where, `za dużo ćwiczeń (maks. ${LIMITS.exercises})`);
        exs.slice(0, LIMITS.exercises).forEach((e, i) => {
          const w = `${where}, ćwiczenie ${i + 1}`;
          if (!isObj(e)) { err(w, "ma być obiektem"); return; }
          const ex = {
            name: text(e.name, w, "name", LIMITS.exName, true),
            sets: text(e.sets, w, "sets", LIMITS.exSets, true),
          };
          const load = text(e.load, w, "load", LIMITS.exLoad);
          if (load) ex.load = load;
          const rest = text(e.rest, w, "rest", LIMITS.exRest);
          if (rest) ex.rest = rest;
          const edesc = text(e.desc, w, "desc", LIMITS.exDesc);
          if (edesc) ex.desc = edesc;
          day.exercises.push(ex);
        });
      }

      if (d.cardio !== undefined && d.cardio !== null) {
        const w = `${where}, cardio`;
        if (!isObj(d.cardio)) err(w, "ma być obiektem");
        else {
          const cardio = {};
          const machine = text(d.cardio.machine, w, "machine", LIMITS.machine);
          if (machine) cardio.machine = machine;
          const vars = d.cardio.variants;
          cardio.variants = [];
          if (!Array.isArray(vars) || !vars.length) err(w, "potrzebny co najmniej jeden wariant w „variants”");
          else {
            if (vars.length > LIMITS.variants) err(w, `za dużo wariantów (maks. ${LIMITS.variants})`);
            vars.slice(0, LIMITS.variants).forEach((v, i) => {
              const vw = `${w}, wariant ${i + 1}`;
              if (!isObj(v)) { err(vw, "ma być obiektem"); return; }
              const variant = {};
              const vname = text(v.name, vw, "name", LIMITS.varName);
              if (vname) variant.name = vname;
              variant.time = text(v.time, vw, "time", LIMITS.varTime, true);
              for (const f of ["hrFrom", "hrTo"]) {
                const n = typeof v[f] === "string" && v[f].trim() !== "" ? Number(v[f]) : v[f];
                if (!Number.isInteger(n) || n < 30 || n > 100) err(vw, `„${f}” ma być liczbą całkowitą 30–100 (% HRmax)`);
                else variant[f] = n;
              }
              if (variant.hrFrom !== undefined && variant.hrTo !== undefined && variant.hrFrom > variant.hrTo) {
                err(vw, "„hrFrom” nie może być większe niż „hrTo”");
              }
              const vdesc = text(v.desc, vw, "desc", LIMITS.varDesc);
              if (vdesc) variant.desc = vdesc;
              cardio.variants.push(variant);
            });
          }
          day.cardio = cardio;
        }
      }
      plan.days[key] = day;
    }
  }

  if (!errors.length) {
    const bytes = JSON.stringify(plan).length;
    if (bytes > LIMITS.bytes) err("", `plan jest za duży (${Math.round(bytes / 1024)} kB, maks. ${LIMITS.bytes / 1024} kB)`);
  }
  return { errors, plan };
}

// Pusty szkielet do formularza „Nowy plan”: siedem dni, każdy do wypełnienia.
export function emptyPlan() {
  const days = {};
  for (const key of DAY_KEYS) {
    days[key] = { title: "", short: "", primary: [], support: [], exercises: [] };
  }
  days.sun = { title: "Wolne", short: "Wolne", rest: true, primary: [], support: [], exercises: [] };
  return { format: PLAN_FORMAT, name: "", summary: "", note: "", rules: [], days };
}
