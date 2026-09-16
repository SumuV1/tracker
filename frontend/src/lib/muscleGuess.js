// Podpowiedź mięśni dla dnia planu na podstawie nazwy dnia i nazw ćwiczeń.
// To słownik, nie anatomia: ma trafić w typowe polskie nazwy ćwiczeń, a
// resztę użytkownik poprawia chipami w edytorze. Dopasowanie po fragmencie
// (bez odmiany), małymi literami; pierwszy pasujący wpis na listę wygrywa,
// dlatego bardziej szczegółowe frazy („martwy ciąg rumuński") stoją przed
// ogólnymi („martwy ciąg").
//
// Każdy wpis: [fragmenty…, { p: mięśnie główne, s: wspomagające }].

const LEGS = { p: ["quadriceps", "hamstrings", "gluteus", "gastrocnemius"], s: ["adductors", "erector_spinae", "sartorius"] };
const CARDIO = { p: ["quadriceps", "hamstrings", "gastrocnemius", "gluteus"], s: ["tibialis"] };

// Nazwy dni / partii — decydują o partii głównej.
const DAY_RULES = [
  [["klatka", "klata", "piersiow", "chest"], { p: ["pectoralis"], s: ["deltoid_front", "triceps", "serratus"] }],
  [["plecy", "grzbiet", "back"], { p: ["latissimus", "trapezius"], s: ["infraspinatus", "erector_spinae", "deltoid_back", "biceps", "forearm_front"] }],
  [["bark", "naramien", "shoulder", "delt"], { p: ["deltoid_front", "deltoid_back"], s: ["trapezius", "triceps"] }],
  [["ramion", "ramię", "biceps i triceps", "arms"], { p: ["biceps", "triceps"], s: ["forearm_front", "forearm_back"] }],
  [["nogi", "nóg", "legs", "dolna"], LEGS],
  [["brzuch", "core", "abs"], { p: ["rectus_abdominis", "obliques"], s: ["erector_spinae"] }],
  [["cardio", "bieg", "bieżnia", "rower", "orbitrek", "wioślarz", "rowing"], CARDIO],
  [["kark", "szyja", "neck"], { p: ["sternocleidomastoid", "trapezius"], s: ["scalenes", "platysma"] }],
  [["push"], { p: ["pectoralis", "deltoid_front", "triceps"], s: ["serratus"] }],
  [["pull"], { p: ["latissimus", "trapezius", "biceps"], s: ["deltoid_back", "infraspinatus", "forearm_front"] }],
  [["full body", "całe ciało", "fbw"], { p: ["pectoralis", "latissimus", "quadriceps", "gluteus"], s: ["deltoid_front", "hamstrings", "erector_spinae"] }],
];

// Nazwy ćwiczeń — mięśnie ćwiczenia dochodzą jako główne, jeśli dzień nie ma
// jeszcze partii, albo jako wspomagające, jeśli ma.
const EXERCISE_RULES = [
  [["martwy ciąg rumuński", "rdl", "rumuński"], { p: ["hamstrings", "gluteus"], s: ["erector_spinae"] }],
  [["martwy ciąg", "deadlift"], { p: ["hamstrings", "gluteus", "erector_spinae"], s: ["quadriceps", "trapezius", "forearm_front"] }],
  [["przysiad", "squat"], { p: ["quadriceps", "gluteus"], s: ["adductors", "erector_spinae", "hamstrings"] }],
  [["suwnic", "leg press", "wypychanie"], { p: ["quadriceps", "gluteus"], s: ["adductors"] }],
  [["wykrok", "lunge", "bułgarsk"], { p: ["quadriceps", "gluteus"], s: ["hamstrings", "adductors"] }],
  [["uginanie nóg", "leg curl", "dwugłow"], { p: ["hamstrings"], s: ["gastrocnemius"] }],
  [["prostowanie nóg", "leg extension", "czworogłow"], { p: ["quadriceps"], s: [] }],
  [["wspięcia", "łydk", "calf"], { p: ["gastrocnemius"], s: ["tibialis"] }],
  [["hip thrust", "pośladk", "glute"], { p: ["gluteus"], s: ["hamstrings"] }],
  [["przywodzenie", "adduct"], { p: ["adductors"], s: [] }],
  [["odwodzenie", "abduct"], { p: ["gluteus"], s: ["sartorius"] }],
  [["face pull", "odwrotne rozpiętki", "reverse fly", "tylne akton"], { p: ["deltoid_back"], s: ["infraspinatus", "trapezius"] }],
  [["pec deck", "rozpiętki", "fly", "krzyżowanie", "butterfly"], { p: ["pectoralis"], s: ["deltoid_front"] }],
  [["pompk", "push-up", "pushup", "dip", "poręcz"], { p: ["pectoralis", "triceps"], s: ["deltoid_front", "serratus"] }],
  [["wyciskanie żołnierskie", "ohp", "overhead", "arnold", "nad głow"], { p: ["deltoid_front"], s: ["triceps", "trapezius"] }],
  [["wyciskanie francuskie", "skull", "prostowanie ramion", "pushdown", "kickback", "triceps"], { p: ["triceps"], s: ["forearm_back"] }],
  [["wyciskanie", "bench", "press", "nautilus", "ławk"], { p: ["pectoralis"], s: ["deltoid_front", "triceps"] }],
  [["podciąganie", "pull-up", "pullup", "chin", "ściąganie", "lat pull"], { p: ["latissimus"], s: ["biceps", "infraspinatus", "forearm_front"] }],
  [["wiosłowanie", "row"], { p: ["latissimus", "trapezius"], s: ["erector_spinae", "biceps", "deltoid_back"] }],
  [["szrugs", "shrug", "wzruszanie", "czworoboczn"], { p: ["trapezius"], s: [] }],
  [["unoszenie ramion bokiem", "unoszenie bokiem", "lateral", "bokiem"], { p: ["deltoid_front", "deltoid_back"], s: ["trapezius"] }],
  [["unoszenie ramion w przód", "w przód", "front raise"], { p: ["deltoid_front"], s: [] }],
  [["młotkow", "hammer"], { p: ["biceps", "forearm_front"], s: [] }],
  [["uginanie", "curl", "modlitewnik", "preacher", "biceps"], { p: ["biceps"], s: ["forearm_front"] }],
  [["nadgarstk", "przedrami", "wrist", "forearm"], { p: ["forearm_front", "forearm_back"], s: [] }],
  [["rotacj", "skośn", "russian", "drwal", "woodchop", "skłony boczne", "boczna deska", "side plank"], { p: ["obliques"], s: ["rectus_abdominis"] }],
  [["spięcia", "crunch", "deska", "plank", "unoszenie nóg", "brzuch", "ab wheel", "kółko"], { p: ["rectus_abdominis"], s: ["obliques"] }],
  [["hiperekstensj", "hyperext", "good morning", "prostownik"], { p: ["erector_spinae"], s: ["gluteus", "hamstrings"] }],
  [["bieżni", "bieg", "rower", "orbitrek", "cardio", "wioślarz", "interwał", "marsz", "schod"], CARDIO],
  [["kark", "szyj"], { p: ["sternocleidomastoid"], s: ["scalenes", "trapezius"] }],
];

const match = (rules, text) => {
  const t = text.toLowerCase();
  for (const rule of rules) {
    const hit = rule[0].some(frag => t.includes(frag));
    if (hit) return rule[1];
  }
  return null;
};

// Zwraca { primary, support } — listy bez powtórzeń, bez wspólnych elementów.
export function guessMuscles(day) {
  const primary = [];
  const support = [];
  const add = (list, ids) => { for (const id of ids) if (!list.includes(id)) list.push(id); };

  const fromTitle = match(DAY_RULES, day.title || "");
  if (fromTitle) { add(primary, fromTitle.p); add(support, fromTitle.s); }

  for (const ex of day.exercises || []) {
    const m = match(EXERCISE_RULES, ex.name || "");
    if (!m) continue;
    // Dzień bez rozpoznanej partii: ćwiczenia ją definiują. Z partią — tylko
    // dokładają wspomagające, żeby jedno wiosłowanie nie zamieniło „klatki"
    // w dzień pleców.
    if (fromTitle) { add(support, m.p); add(support, m.s); }
    else { add(primary, m.p); add(support, m.s); }
  }
  if (day.cardio && !primary.length) { add(primary, CARDIO.p); add(support, CARDIO.s); }

  return { primary, support: support.filter(id => !primary.includes(id)) };
}
