// Silnik gry „Przekonania" — czysta logika, bez Reacta i bez sieci, żeby dało
// się ją sprawdzić w Node. Przeniesiony z szablonu skilla learning-game-designer
// (assets/game-template.html) z zachowaniem pętli: pytanie przed odpowiedzią →
// deklaracja pewności → feedback z wyjaśnieniem → błędna pozycja wraca po kilku
// innych → pudełka Leitnera odsuwają powtórkę (1, 3, 7, 16, 35 dni) → tempo
// nowych i format (wybór → wpisanie) idą za ruchomą trafnością, z celem 80–90%.
//
// Różnice wobec szablonu: bank jest zwarty (pojęcia raz, pozycje odwołują się
// do nich po id — frontend/src/beliefsBank.json z scripts/beliefs/gen-bank.py),
// nowe pozycje wchodzą w kolejności banku (najpierw te, które najczęściej
// wykrzywiają przekonania o sobie), a stan ma `merge`, bo żyje na serwerze
// i może być grany z dwóch urządzeń.

export const DAY = 86400000;
export const INT = [1, 1, 3, 7, 16, 35];   // dni do powrotu wg pudełka 0..5
export const MAXBOX = 5;
export const MASTERED = 4;                  // od tego pudełka pozycja jest „opanowana"
const LOG_MAX = 300;

export const fresh = () => ({
  v: 1, xp: 0, sessions: 0, items: {}, log: [],
  conf: { sure: [0, 0], think: [0, 0], guess: [0, 0] },
  settings: { confidence: true, len: 12 },
});

export function valid(o) {
  return !!o && o.v === 1 && !!o.items && typeof o.items === "object" && !Array.isArray(o.items) && Array.isArray(o.log);
}

export function normalize(o) {
  const f = fresh();
  return { ...f, ...o, conf: { ...f.conf, ...(o.conf || {}) }, settings: { ...f.settings, ...(o.settings || {}) } };
}

export const sod = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const rec = (S, id) => S.items[id] || (S.items[id] = { box: 0, due: 0, seen: 0, ok: 0, lapse: 0, at: 0 });
export const isUnseen = (S, id) => !S.items[id] || !S.items[id].seen;
export const isDue = (S, id, now = Date.now()) => { const r = S.items[id]; return !!(r && r.seen > 0 && r.due <= now); };
export const boxOf = (S, id) => (S.items[id] ? S.items[id].box : 0);

// ── Bank ────────────────────────────────────────────────────────────────────
export const concept = (bank, id) => bank.concepts[id];
export const answerOf = (bank, it) => (it.k === "why" ? it.a : bank.concepts[it.c].n);
export const kindOf = it => (it.c[0] === "b" ? "b" : "m");
export const firstSentence = s => String(s).trim().split(/(?<=[.!?])\s+/)[0];

export function promptOf(it) {
  if (it.k === "why") return null;
  if (it.ask) return it.ask;
  if (it.k === "def") return kindOf(it) === "b" ? "Jaki to błąd poznawczy?" : "Jaki to model mentalny?";
  return kindOf(it) === "b" ? "Który błąd poznawczy tu działa?" : "Który model mentalny tu pasuje?";
}

// Filtr tematu: "" = wszystko, "kind:b" / "kind:m" = cała tabela, inaczej id tematu.
export function inFocus(bank, it, focus) {
  if (!focus) return true;
  const t = bank.concepts[it.c].t;
  if (focus.startsWith("kind:")) return t[0] === focus.slice(5);
  return t === focus;
}

// ── Trafność i strefa trudności ─────────────────────────────────────────────
export function rollingAcc(S) {
  const a = S.log.slice(-10);
  if (a.length < 5) return null;
  return a.reduce((s, x) => s + x.ok, 0) / a.length;
}
export function zone(acc) {
  if (acc === null) return { key: "none", label: "za mało danych (min. 5 odpowiedzi)" };
  if (acc < 0.70) return { key: "hard", label: "za trudno — mniej nowych" };
  if (acc < 0.80) return { key: "slight", label: "lekko za trudno" };
  if (acc <= 0.90) return { key: "ok", label: "w strefie (80–90%)" };
  return { key: "easy", label: "za łatwo — tempo rośnie" };
}

// ── Sesja ───────────────────────────────────────────────────────────────────
export function shuffle(a, rnd = Math.random) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const topicOf = (bank, it) => bank.concepts[it.c].t;

// Przeplot: dwie pozycje z tego samego tematu nie idą po sobie, jeśli jest
// z czego wybrać — rozróżnianie podobnych pojęć jest celem gry.
export function interleave(bank, list) {
  const rest = list.slice(), out = []; let last = null;
  while (rest.length) {
    let k = rest.findIndex(x => topicOf(bank, x) !== last);
    if (k < 0) k = 0;
    const [x] = rest.splice(k, 1); out.push(x); last = topicOf(bank, x);
  }
  return out;
}

export function maxNewFor(S, dueCount, len) {
  const acc = rollingAcc(S);
  let n = 6;
  if (acc !== null) { if (acc > 0.90) n = 8; else if (acc < 0.75) n = 3; }
  if (dueCount > len * 0.7) n = Math.min(n, 2);
  return n;
}

export function buildSession(bank, S, { len, focus, extra, now = Date.now() }) {
  const pool = bank.items.filter(it => inFocus(bank, it, focus));
  if (extra) {
    const seen = pool.filter(it => !isUnseen(S, it.id) && !isDue(S, it.id, now))
      .sort((a, b) => boxOf(S, a.id) - boxOf(S, b.id));
    return interleave(bank, shuffle(seen.slice(0, len * 2)).slice(0, len));
  }
  const due = pool.filter(it => isDue(S, it.id, now)).sort((a, b) => S.items[a.id].due - S.items[b.id].due);
  // Nowe w kolejności banku: generator ustawił ją tak, że scenariusz pojęcia
  // przychodzi kilka pozycji po jego definicji.
  const unseen = pool.filter(it => isUnseen(S, it.id));
  const chosenDue = due.slice(0, len);
  const nNew = Math.min(maxNewFor(S, due.length, len), Math.max(len - chosenDue.length, 0), unseen.length);
  return interleave(bank, chosenDue.concat(unseen.slice(0, nNew)));
}

const hasMc = it => it.k !== "why" && Array.isArray(it.d) && it.d.length >= 2;
// Wybór z listy na początku, wpisywanie od 3. pudełka (od 2. przy wysokiej
// trafności, od 5. przy niskiej) — produkcja uczy mocniej niż rozpoznanie.
export function pickFormat(S, it) {
  if (it.k === "why") return "self";
  if (!hasMc(it)) return "recall";
  const acc = rollingAcc(S);
  let thr = 3;
  if (acc !== null) { if (acc > 0.90) thr = 2; else if (acc < 0.75) thr = 5; }
  return boxOf(S, it.id) >= thr ? "recall" : "mc";
}

export function buildOptions(it, rnd = Math.random) {
  return shuffle([it.c].concat(shuffle(it.d, rnd).slice(0, 3)), rnd);
}

// ── Dopasowanie wpisanej odpowiedzi ─────────────────────────────────────────
export function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
// Nazwy są długie i odmienne („efekt kotwiczenia"), więc tolerancja literówek
// rośnie z długością: 1 znak od 6 liter, 2 od 14. Brak dopasowania nie
// przekreśla odpowiedzi — gra pyta wtedy, czy znaczyła to samo.
export function matches(bank, it, text) {
  const x = norm(text); if (!x) return false;
  const c = bank.concepts[it.c];
  const keys = [c.n].concat(c.acc || [], it.acc || []).map(norm).filter(Boolean);
  return keys.some(k => {
    if (x === k) return true;
    const tol = k.length >= 14 ? 2 : k.length >= 6 ? 1 : 0;
    return tol > 0 && lev(x, k) <= tol;
  });
}

// ── Wynik odpowiedzi ────────────────────────────────────────────────────────
const FMT_XP = { mc: 4, recall: 8, self: 8 };
export const gainXp = (fmt, boxBefore, factor) => Math.round(FMT_XP[fmt] * (1 + 0.25 * Math.min(boxBefore, 4)) * factor);

// Mutuje S i run. res: "yes" | "partial" | "no". Zwraca zdobyte punkty i to,
// czy pozycja wróci jeszcze w tej sesji.
export function commit(S, run, turn, res, now = Date.now()) {
  const it = turn.it, r = rec(S, it.id), boxBefore = r.box, conf = turn.conf || "think";
  let gained = 0, requeued = false;
  if (turn.retry) {
    if (res === "yes") gained = 2;           // domknięcie błędu, bez ruchu w harmonogramie
  } else if (run.extra) {
    if (res !== "no") gained = gainXp(turn.fmt, boxBefore, 0.5);
  } else {
    r.seen++; r.at = now;
    if (res === "yes") {
      r.ok++;
      // Zgadnięte nie awansuje: trafienie przy „zgaduję" nie świadczy o pamięci.
      if (conf !== "guess") r.box = Math.min(MAXBOX, r.box + 1);
      gained = gainXp(turn.fmt, boxBefore, 1);
    } else if (res === "partial") {
      gained = gainXp(turn.fmt, boxBefore, 0.5);
    } else { r.lapse++; r.box = 0; }
    r.due = sod(now) + INT[r.box] * DAY;
    S.log.push({ t: now, id: it.id, ok: res === "yes" ? 1 : res === "partial" ? 0.5 : 0, conf });
    if (S.log.length > LOG_MAX) S.log = S.log.slice(-LOG_MAX);
    const c = S.conf[conf]; c[0]++; if (res === "yes") c[1]++;
  }
  S.xp += gained; run.xp += gained;
  if (!turn.retry && !run.extra) run.answers.push({ id: it.id, res, conf, fmt: turn.fmt });
  // Błąd wraca po trzech innych pozycjach, najwyżej dwa razy.
  if (res === "no" && turn.retries < 2 && !run.extra) {
    const at = Math.min(run.queue.length, run.i + 1 + 3);
    run.queue.splice(at, 0, { id: it.id, retry: true, retries: turn.retries + 1 });
    requeued = true;
  }
  return { gained, requeued };
}

// ── Postęp ──────────────────────────────────────────────────────────────────
export function avgMastery(bank, S) {
  const n = bank.items.length;
  return n ? bank.items.reduce((s, it) => s + Math.min(boxOf(S, it.id), MAXBOX), 0) / (MAXBOX * n) : 0;
}
export function rankName(bank, S) {
  const r = bank.meta.fiction.ranks;
  return r[Math.min(r.length - 1, Math.floor(avgMastery(bank, S) * r.length))];
}
export function nextDue(bank, S) {
  let next = null;
  for (const it of bank.items) { const r = S.items[it.id]; if (r && r.seen && (next === null || r.due < next)) next = r.due; }
  if (next === null) return null;
  const count = bank.items.filter(it => { const r = S.items[it.id]; return r && r.seen && sod(r.due) === sod(next); }).length;
  return { at: next, count };
}
export function whenLabel(ts, now = Date.now()) {
  const d = Math.max(0, Math.round((sod(ts) - sod(now)) / DAY));
  return d <= 0 ? "dziś" : d === 1 ? "jutro" : `za ${d} dni`;
}

// ── Scalanie stanu z dwóch urządzeń ─────────────────────────────────────────
// Pozycja: wygrywa rekord z większą liczbą odpowiedzi, przy remisie — świeższy.
// Log: suma bez duplikatów. Liczniki: maksimum (podwójnie liczone sesje są
// gorsze niż lekko zaniżone punkty). Ustawienia: lokalne.
export function merge(local, remote) {
  const out = normalize(remote);
  out.settings = { ...out.settings, ...(local.settings || {}) };
  out.items = { ...remote.items };
  for (const id of Object.keys(local.items)) {
    const x = local.items[id], y = remote.items[id];
    if (!y || x.seen > y.seen || (x.seen === y.seen && (x.at || 0) > (y.at || 0))) out.items[id] = x;
  }
  const seen = new Set(), log = [];
  for (const e of [...remote.log, ...local.log]) {
    const k = e.t + "|" + e.id;
    if (!seen.has(k)) { seen.add(k); log.push(e); }
  }
  out.log = log.sort((a, b) => a.t - b.t).slice(-LOG_MAX);
  out.xp = Math.max(local.xp || 0, remote.xp || 0);
  out.sessions = Math.max(local.sessions || 0, remote.sessions || 0);
  for (const k of ["sure", "think", "guess"]) {
    const a = local.conf?.[k] || [0, 0], b = remote.conf?.[k] || [0, 0];
    out.conf[k] = a[0] >= b[0] ? a.slice() : b.slice();
  }
  return out;
}
