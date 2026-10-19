import { useEffect, useReducer, useRef, useState } from "react";
import { api } from "../api.js";
import { INK, MONO } from "../lib/ui.js";
import { useApp } from "../lib/appContext.js";
import * as G from "../lib/beliefsEngine.js";

// „Przekonania" — druga strona zakładki Stabilizacja. Gra do nauki błędów
// poznawczych (kodeks bias.wiki) i modeli mentalnych (fs.blog): opis albo
// scenariusz → nazwa pojęcia, z pamięci, w odstępach. Logika w
// lib/beliefsEngine.js, treść w beliefsBank.json (scripts/beliefs/gen-bank.py).
//
// Stan gry żyje poza komponentem (CACHE), żeby przełączenie na Stabilizację
// i z powrotem nie przerywało sesji w połowie. Zapis idzie na serwer
// (jeden dokument na konto) z kopią w localStorage na wypadek braku sieci.

const ACC = "#e8b84b";                  // akcent zakładki Stabilizacja
const OK = "#4ade80", BAD = "#f87171";
const CARD = { background: "#161616", border: "1px solid #1e1e1e", borderRadius: 14 };

let BANK = null;
const CACHE = { uid: null, S: null, version: 0, rev: 0, savedRev: 0, run: null, step: null, loaded: false };
const lsKey = uid => `sledzik:beliefs:${uid}`;
function lsRead(uid) {
  try { const o = JSON.parse(localStorage.getItem(lsKey(uid))); return o && G.valid(o.data) ? o : null; } catch { return null; }
}
function lsWrite() {
  try {
    localStorage.setItem(lsKey(CACHE.uid), JSON.stringify({ data: CACHE.S, version: CACHE.version, dirty: CACHE.rev !== CACHE.savedRev }));
  } catch { /* prywatne okno, pełny dysk — serwer i tak ma stan */ }
}

let saveTimer = null, saving = false;
async function flush(onStatus, retried = false) {
  if (saving) { clearTimeout(saveTimer); saveTimer = setTimeout(() => flush(onStatus), 400); return; }
  if (CACHE.rev === CACHE.savedRev) return;
  saving = true;
  const rev = CACHE.rev;
  try {
    const r = await api.saveBeliefs(CACHE.S, CACHE.version);
    CACHE.version = r.version; CACHE.savedRev = rev;
    lsWrite(); onStatus("ok");
  } catch (e) {
    if (e.status === 409 && e.body && !retried) {
      // Drugie urządzenie zapisało w międzyczasie: scal i spróbuj jeszcze raz.
      if (G.valid(e.body.data)) CACHE.S = G.merge(CACHE.S, e.body.data);
      CACHE.version = e.body.version || 0;
      saving = false;
      return flush(onStatus, true);
    }
    lsWrite(); onStatus("offline");
  } finally { saving = false; }
}
function touch(onStatus) {
  CACHE.rev++; lsWrite();
  clearTimeout(saveTimer); saveTimer = setTimeout(() => flush(onStatus), 700);
}

async function loadState(uid) {
  const local = lsRead(uid);
  const mine = CACHE.uid === uid && CACHE.S && CACHE.rev !== CACHE.savedRev ? CACHE.S : local?.dirty ? local.data : null;
  try {
    const r = await api.beliefs();
    let S = G.valid(r.data) ? G.normalize(r.data) : null;
    if (mine) S = S ? G.merge(mine, S) : G.normalize(mine);
    Object.assign(CACHE, { uid, S: S || G.fresh(), version: r.version || 0, loaded: true });
    CACHE.savedRev = mine ? -1 : CACHE.rev;     // niezapisane lokalne zmiany → wyślij
    return "ok";
  } catch {
    Object.assign(CACHE, { uid, S: G.normalize(mine || local?.data || G.fresh()), version: local?.version || 0, loaded: true });
    if (mine) CACHE.savedRev = -1;
    return "offline";
  }
}

export default function BeliefsGame() {
  const { isMobile, user } = useApp();
  const [, render] = useReducer(x => x + 1, 0);
  const [bank, setBank] = useState(BANK);
  const [net, setNet] = useState(CACHE.loaded && CACHE.uid === user?.id ? "ok" : "loading");
  const [fatal, setFatal] = useState("");
  const live = useRef(null);
  const topRef = useRef(null);
  const afRef = useRef(null);         // element, który dostaje fokus po zmianie kroku

  useEffect(() => {
    let alive = true;
    if (!BANK) import("../beliefsBank.json").then(m => { BANK = m.default || m; if (alive) setBank(BANK); },
      () => alive && setFatal("Nie udało się wczytać pytań. Odśwież stronę."));
    if (!(CACHE.loaded && CACHE.uid === user?.id)) {
      CACHE.run = null; CACHE.step = null;
      loadState(user?.id).then(s => { if (!alive) return; setNet(s); render(); if (CACHE.savedRev === -1) flush(setNet); });
    }
    // Powrót do karty: dociągnij stan z serwera (mógł być grany na telefonie),
    // ale nie w trakcie sesji — wtedy scalenie zrobi zapis.
    const onVis = () => {
      if (document.visibilityState === "hidden") { flush(setNet); return; }
      if (!CACHE.run) loadState(user?.id).then(s => { if (alive) { setNet(s); render(); } });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; document.removeEventListener("visibilitychange", onVis); flush(setNet); };
  }, [user?.id]);

  const S = CACHE.S, run = CACHE.run, step = CACHE.step;
  const save = () => touch(setNet);
  const go = () => render();
  const announce = s => { if (live.current) { live.current.textContent = ""; setTimeout(() => { if (live.current) live.current.textContent = s; }, 30); } };

  // Fokus i przewinięcie po każdej zmianie kroku: na telefonie feedback ma się
  // pojawić tam, gdzie patrzy kciuk, a z klawiatury Enter ma iść dalej.
  const stepKey = run ? `${run.i}:${step?.phase}` : "home";
  useEffect(() => {
    afRef.current?.focus?.({ preventScroll: true });
    const top = topRef.current?.getBoundingClientRect().top;
    if (top !== undefined && top < 0) topRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [stepKey]);

  // ── Akcje ────────────────────────────────────────────────────────────────
  const startSession = (len, focus, extra) => {
    S.settings.len = len; S.settings.focus = focus || "";
    const list = G.buildSession(bank, S, { len, focus, extra });
    if (!list.length) return;
    CACHE.run = { queue: list.map(it => ({ id: it.id, retry: false, retries: 0 })), i: 0, answers: [], xp: 0, extra: !!extra };
    if (!extra) S.sessions++;
    save(); openQuestion();
  };
  const itemById = id => bank.items.find(x => x.id === id);
  const openQuestion = () => {
    const r = CACHE.run, q = r.queue[r.i];
    if (!q) { CACHE.step = { phase: "summary" }; go(); return; }
    const it = itemById(q.id), fmt = G.pickFormat(S, it);
    CACHE.step = { phase: "ask", it, fmt, retry: q.retry, retries: q.retries, choice: null, text: "", conf: null, ok: null,
      opts: fmt === "mc" ? G.buildOptions(it) : null, gained: 0, requeued: false };
    go();
  };
  const answer = v => {
    const st = CACHE.step; if (st.phase !== "ask") return;
    if (st.fmt === "mc") st.choice = v; else st.text = String(v || "").trim();
    if (!S.settings.confidence) { st.conf = "think"; return evaluate(); }
    st.phase = "conf"; go();
  };
  const setConf = c => { const st = CACHE.step; if (st.phase !== "conf") return; st.conf = c; evaluate(); };
  const evaluate = () => {
    const st = CACHE.step, it = st.it;
    if (st.fmt === "mc") st.ok = st.choice === it.c ? "yes" : "no";
    else if (st.fmt === "recall") st.ok = G.matches(bank, it, st.text) ? "yes" : null;
    else st.ok = null;
    if (st.ok) finish(st.ok); else { st.phase = "grade"; go(); }
    announce(st.ok === null ? "Porównaj z wzorcem." : `${st.ok === "yes" ? "Poprawnie" : "Niepoprawnie"}. Poprawna odpowiedź: ${G.answerOf(bank, it)}`);
  };
  const finish = res => {
    const st = CACHE.step;
    const { gained, requeued } = G.commit(S, CACHE.run, st, res);
    Object.assign(st, { ok: res, gained, requeued, phase: "fb" });
    save(); go();
  };
  const next = () => { if (CACHE.step?.phase !== "fb") return; CACHE.run.i++; openQuestion(); };
  const home = () => { CACHE.run = null; CACHE.step = null; flush(setNet); go(); };

  // Klawiatura: 1–4 wybór, 1–3 pewność / samoocena, Enter dalej.
  useEffect(() => {
    const onKey = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const st = CACHE.step; if (!st) return;
      const n = parseInt(e.key, 10);
      if (st.phase === "ask" && st.fmt === "mc" && n >= 1 && n <= st.opts.length) { e.preventDefault(); answer(st.opts[n - 1]); }
      else if (st.phase === "conf" && n >= 1 && n <= 3) { e.preventDefault(); setConf(["sure", "think", "guess"][n - 1]); }
      else if (st.phase === "grade") {
        const m = st.fmt === "recall" ? ["yes", "no"] : ["yes", "partial", "no"];
        if (n >= 1 && n <= m.length) { e.preventDefault(); finish(m[n - 1]); }
      }
      else if (st.phase === "fb" && tag !== "button" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); next(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (fatal) return <Shell><Note color={BAD}>{fatal}</Note></Shell>;
  if (!bank || !S) return <Shell><div style={{ ...CARD, padding: 18, color: INK.soft, fontSize: 13 }}>Wczytuję akta…</div></Shell>;

  const ctx = { bank, S, run, step, isMobile, afRef, net };
  return (
    <Shell>
      <div ref={topRef} style={{ scrollMarginTop: 12 }}/>
      <div ref={live} aria-live="polite" style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}/>
      {net === "offline" && <Note color={ACC}>Brak połączenia z serwerem — postęp zapisuje się na tym urządzeniu i wyśle się sam, gdy sieć wróci.</Note>}
      {!run ? <Home {...ctx} onStart={startSession} onSettings={save}
                onReplace={o => { CACHE.S = G.normalize(o); save(); go(); }}/>
        : step.phase === "summary" ? <Summary {...ctx} onHome={home} onExtra={() => startSession(S.settings.len, S.settings.focus, true)}/>
        : <Turn {...ctx} onAnswer={answer} onConf={setConf} onGrade={finish} onNext={next} onAbort={home}/>}
    </Shell>
  );
}

function Shell({ children }) {
  return <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>{children}</div>;
}
function Note({ color, children }) {
  return <div role="status" style={{ border: `1px solid ${color}55`, background: color + "14", color: "#e8e8e8", borderRadius: 10, padding: "9px 12px", fontSize: 12.5, lineHeight: 1.5, marginBottom: 12 }}>{children}</div>;
}
const btn = (primary, extra) => ({
  minHeight: 48, borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: primary ? 700 : 600, padding: "10px 16px",
  border: primary ? "none" : "1px solid #333", background: primary ? ACC : "#202020", color: primary ? "#000" : "#e0e0e0", ...extra,
});
const eyebrow = { fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: INK.soft, fontFamily: MONO };

// ── Ekran startowy ──────────────────────────────────────────────────────────
function Home({ bank, S, isMobile, afRef, onStart, onSettings, onReplace }) {
  const [len, setLen] = useState(S.settings.len || 12);
  const [focus, setFocus] = useState(S.settings.focus || "");
  const [io, setIo] = useState({ open: false, text: "", msg: "" });
  const now = Date.now();
  const pool = bank.items.filter(it => G.inFocus(bank, it, focus));
  const dueN = pool.filter(it => G.isDue(S, it.id, now)).length;
  const newN = pool.filter(it => G.isUnseen(S, it.id)).length;
  const masN = bank.items.filter(it => G.boxOf(S, it.id) >= G.MASTERED).length;
  const seenAny = bank.items.some(it => !G.isUnseen(S, it.id));
  const nothing = dueN === 0 && newN === 0;
  const nd = G.nextDue(bank, S);
  const acc = G.rollingAcc(S), z = G.zone(acc);
  const f = bank.meta.fiction;
  const conceptCount = Object.keys(bank.concepts).length;
  const bTopics = bank.topics.filter(t => t.kind === "b"), mTopics = bank.topics.filter(t => t.kind === "m");
  const sel = { width: "100%", background: "#0f0f0f", border: "1px solid #333", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 14, minHeight: 44, outline: "none" };
  const firstRun = !seenAny;

  return (
    <>
      <div style={{ ...CARD, border: `1px solid ${ACC}33`, padding: isMobile ? 14 : 18, marginBottom: 12 }}>
        <div style={{ ...eyebrow, color: ACC, marginBottom: 6 }}>🗂 {f.name.toUpperCase()}</div>
        <div style={{ fontSize: 13, color: "#d0d0d0", lineHeight: 1.6 }}>{f.intro}</div>
        {firstRun && (
          <div style={{ fontSize: 12, color: INK.soft, lineHeight: 1.6, marginTop: 8 }}>
            {conceptCount} pojęć z dwóch tabel. Odpowiadasz z pamięci — na początku wybierasz z listy, przy opanowanych wpisujesz nazwę sam.
            Pierwsze sesje wprowadzają po kilka nowych; reszta wraca wtedy, gdy zaczyna się zacierać.
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3,minmax(0,1fr))" : "repeat(5,minmax(0,1fr))", gap: 8, marginBottom: 12 }}>
        <Stat label="Do powtórki" value={dueN} hot={dueN > 0}/>
        <Stat label="Nowe" value={newN}/>
        <Stat label="Opanowane" value={`${masN}/${bank.items.length}`}/>
        <Stat label="Ranga" value={G.rankName(bank, S)} wide={isMobile}/>
        <Stat label="Punkty" value={S.xp}/>
      </div>

      <div style={{ ...CARD, padding: isMobile ? 14 : 18, marginBottom: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "140px 1fr", gap: 10, marginBottom: 12 }}>
          <label style={{ display: "block" }}>
            <div style={{ fontSize: 11.5, color: INK.soft, marginBottom: 5 }}>Długość sesji (najwyżej)</div>
            <select value={len} onChange={e => setLen(+e.target.value)} style={sel}>
              {[8, 12, 20].map(n => <option key={n} value={n}>do {n} pytań</option>)}
            </select>
          </label>
          <label style={{ display: "block" }}>
            <div style={{ fontSize: 11.5, color: INK.soft, marginBottom: 5 }}>Temat</div>
            <select value={focus} onChange={e => setFocus(e.target.value)} style={sel}>
              <option value="">Wszystko na przemian</option>
              <option value="kind:b">Tylko błędy poznawcze</option>
              <option value="kind:m">Tylko modele mentalne</option>
              <optgroup label="Błędy poznawcze">{bTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
              <optgroup label="Modele mentalne">{mTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
            </select>
          </label>
        </div>
        {nothing ? (
          <div>
            <div style={{ fontSize: 13.5, color: "#e0e0e0", marginBottom: 10, lineHeight: 1.5 }}>
              {newN === 0 && dueN === 0 && !seenAny ? "W tym temacie nie ma pozycji." :
                <>Na dziś wszystko zrobione{focus ? " w tym temacie" : ""}. Następne powtórki: <b>{nd ? G.whenLabel(nd.at) : "jutro"}</b>.</>}
            </div>
            {seenAny && <button ref={afRef} onClick={() => onStart(len, focus, true)} style={btn(false, { width: "100%" })}>Ćwicz dodatkowo (bez zmiany harmonogramu)</button>}
          </div>
        ) : (
          <button ref={afRef} onClick={() => onStart(len, focus, false)} style={btn(true, { width: "100%", fontSize: 15 })}>
            {dueN ? `Zacznij sesję · ${Math.min(dueN, len)} do powtórki` : "Zacznij sesję"}
          </button>
        )}
        <div style={{ fontSize: 11, color: INK.faint, marginTop: 8 }}>Nowe pozycje: najwyżej 3–8 na sesję, zależnie od trafności.</div>
        <div style={{ marginTop: 14 }}><ZoneBar acc={acc} z={z}/></div>
        {nd && !nothing && <div style={{ fontSize: 11.5, color: INK.soft, marginTop: 10 }}>Najbliższy powrót: <b style={{ color: "#ddd" }}>{G.whenLabel(nd.at)}</b> ({nd.count})</div>}
      </div>

      <MasteryMap bank={bank} S={S}/>

      <details style={{ ...CARD, padding: "12px 16px", marginBottom: 12 }}>
        <summary style={{ cursor: "pointer", color: INK.soft, fontSize: 13, minHeight: 28 }}>Narzędzia</summary>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "#ddd", margin: "12px 0", minHeight: 36 }}>
          <input type="checkbox" checked={S.settings.confidence} style={{ width: 20, height: 20 }}
            onChange={e => { S.settings.confidence = e.target.checked; onSettings(); setIo(o => ({ ...o })); }}/>
          Pytaj o pewność odpowiedzi (kalibracja)
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={btn(false)} onClick={() => {
            const text = JSON.stringify(S);
            setIo({ open: true, text, msg: "" });
            try { navigator.clipboard?.writeText(text).then(() => setIo(o => ({ ...o, msg: "Skopiowano do schowka." })), () => {}); } catch { /* bez schowka */ }
          }}>Eksport postępu</button>
          <button style={btn(false)} onClick={() => setIo({ open: true, text: "", msg: "" })}>Wczytaj postęp</button>
          <button style={btn(false, { color: BAD, marginLeft: "auto" })} onClick={() => {
            if (window.confirm("Na pewno wyzerować cały postęp gry? Tego nie da się cofnąć.")) { onReplace(G.fresh()); setIo({ open: false, text: "", msg: "Wyzerowano." }); }
          }}>Zeruj postęp</button>
        </div>
        {io.open && (
          <div style={{ marginTop: 10 }}>
            <textarea value={io.text} onChange={e => setIo(o => ({ ...o, text: e.target.value }))} rows={4} placeholder="Wklej JSON z eksportu"
              style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: 10, color: "#ddd", fontSize: 12, fontFamily: MONO, resize: "vertical", outline: "none" }}/>
            <button style={btn(false, { marginTop: 6 })} onClick={() => {
              try { const o = JSON.parse(io.text); if (!G.valid(o)) throw 0; onReplace(o); setIo({ open: false, text: "", msg: "Wczytano." }); }
              catch { setIo(x => ({ ...x, msg: "To nie jest poprawny eksport postępu." })); }
            }}>Wczytaj z pola</button>
          </div>
        )}
        {io.msg && <div role="status" style={{ fontSize: 12, color: INK.soft, marginTop: 8 }}>{io.msg}</div>}
      </details>

      <div style={{ fontSize: 11, color: INK.faint, lineHeight: 1.6, padding: "0 4px 8px" }}>
        Źródła: {bank.meta.sources.map((s, i) => <span key={s.url}>{i ? " · " : ""}<a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: INK.soft }}>{s.label}</a></span>)}.
        Opisy po polsku pochodzą z Twoich tabel; scenariusze są ilustracjami.
      </div>
    </>
  );
}

function Stat({ label, value, hot, wide }) {
  return (
    <div style={{ ...CARD, borderRadius: 10, padding: "8px 10px", minWidth: 0, gridColumn: wide ? "span 2" : undefined, border: `1px solid ${hot ? ACC + "66" : "#1e1e1e"}` }}>
      <div style={{ fontSize: 11, color: INK.soft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: hot ? ACC : "#f0f0f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function ZoneBar({ acc, z }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5, color: INK.soft, marginBottom: 5 }}>
        <span>Strefa trudności{acc !== null ? ` · ${Math.round(acc * 100)}% z ostatnich 10` : ""}</span>
        <span style={{ color: z.key === "ok" ? OK : "#ddd", textAlign: "right" }}>{z.label}</span>
      </div>
      <div aria-hidden="true" style={{ position: "relative", height: 8, background: "#262626", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "80%", width: "10%", background: OK + "44" }}/>
        {acc !== null && <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${Math.round(acc * 100)}%`, background: ACC, borderRadius: 6 }}/>}
      </div>
    </div>
  );
}

// Mapa opanowania: kafelek = pozycja, jasność = pudełko, ramka = do powtórki.
// Postęp mierzy pamięć, nie czas spędzony w grze.
function MasteryMap({ bank, S }) {
  const now = Date.now();
  const byTopic = bank.topics.map(t => ({ t, items: bank.items.filter(it => bank.concepts[it.c].t === t.id) }));
  const group = kind => byTopic.filter(x => x.t.kind === kind);
  const block = (title, rows) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ ...eyebrow, margin: "12px 0 4px" }}>{title}</div>
      {rows.map(({ t, items }) => {
        const mas = items.filter(it => G.boxOf(S, it.id) >= G.MASTERED).length;
        return (
          <div key={t.id} style={{ padding: "6px 0", borderTop: "1px solid #1b1b1b" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, color: "#ddd", marginBottom: 5 }}>
              <span style={{ minWidth: 0 }}>{t.name}</span>
              <span style={{ color: INK.soft, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{mas}/{items.length}</span>
            </div>
            <div aria-hidden="true" style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {items.map(it => {
                const seen = !G.isUnseen(S, it.id), b = G.boxOf(S, it.id), due = G.isDue(S, it.id, now);
                return <span key={it.id} style={{ width: 11, height: 11, borderRadius: 3, border: `1px solid ${seen ? ACC + "aa" : "#333"}`,
                  background: seen ? `rgba(232,184,75,${(0.12 + 0.176 * b).toFixed(2)})` : "transparent",
                  outline: due ? `2px solid ${OK}` : "none", outlineOffset: 1 }}/>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
  return (
    <div style={{ ...CARD, padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f1f1" }}>Mapa opanowania</div>
      <div style={{ fontSize: 11.5, color: INK.soft, marginTop: 3, lineHeight: 1.5 }}>Kafelek to jedna pozycja: jaśniejszy = dłużej pamiętany, zielona ramka = czas na powtórkę.</div>
      {block("BŁĘDY POZNAWCZE", group("b"))}
      {block("MODELE MENTALNE", group("m"))}
    </div>
  );
}

// ── Pytanie, pewność, feedback ─────────────────────────────────────────────
function Turn({ bank, S, run, step, isMobile, afRef, onAnswer, onConf, onGrade, onNext, onAbort }) {
  const it = step.it, c = bank.concepts[it.c];
  const total = run.queue.length;
  const topic = bank.topics.find(t => t.id === c.t);
  const [text, setText] = useState("");
  useEffect(() => setText(""), [run.i]);
  const prompt = G.promptOf(it);
  const fb = step.phase === "fb" || step.phase === "grade";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: INK.soft, fontVariantNumeric: "tabular-nums" }}>Pozycja {Math.min(run.i + 1, total)} z {total}</span>
        <button onClick={onAbort} style={{ background: "none", border: "none", color: INK.soft, fontSize: 12, textDecoration: "underline", cursor: "pointer", minHeight: 44, padding: "0 4px" }}>Przerwij (postęp zapisany)</button>
      </div>
      <div aria-hidden="true" style={{ height: 5, background: "#222", borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ height: "100%", width: `${Math.round(run.i / total * 100)}%`, background: ACC, transition: "width .25s" }}/>
      </div>

      <div style={{ ...CARD, padding: isMobile ? 14 : 20 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <Chip>{G.kindOf(it) === "b" ? "Błąd" : "Model"} · {topic?.name}</Chip>
          {it.k === "scn" && <Chip>Scenariusz</Chip>}
          {it.k === "why" && <Chip>Dlaczego?</Chip>}
          {step.retry && <Chip color={ACC}>Wraca po błędzie</Chip>}
          {run.extra && <Chip>Praktyka dodatkowa</Chip>}
        </div>
        <div style={{ fontSize: isMobile ? 16 : 17, color: "#f1f1f1", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{it.q}</div>
        {prompt && <div style={{ fontSize: 14, fontWeight: 700, color: ACC, marginTop: 10 }}>{prompt}</div>}

        {step.phase === "ask" && step.fmt === "mc" && (
          <div role="group" aria-label={prompt || it.q} style={{ display: "grid", gap: 8, marginTop: 14 }}>
            {step.opts.map((o, k) => (
              <button key={o} ref={k === 0 ? afRef : undefined} onClick={() => onAnswer(o)} style={optStyle()}>
                <Kbd>{k + 1}</Kbd><span>{bank.concepts[o].n}</span>
              </button>
            ))}
          </div>
        )}
        {step.phase === "ask" && step.fmt === "recall" && (
          <form onSubmit={e => { e.preventDefault(); if (text.trim()) onAnswer(text); }} style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: isMobile ? "wrap" : "nowrap" }}>
            <input ref={afRef} value={text} onChange={e => setText(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false}
              aria-label="Wpisz nazwę" placeholder="Wpisz nazwę z pamięci"
              style={{ flex: "1 1 220px", background: "#0a0a0a", border: "1px solid #333", borderRadius: 10, padding: "11px 12px", color: "#fff", fontSize: 15, outline: "none", minHeight: 48 }}/>
            <button type="submit" disabled={!text.trim()} style={btn(true, { flex: isMobile ? "1 1 100%" : "0 0 auto", opacity: text.trim() ? 1 : 0.5 })}>Sprawdź</button>
          </form>
        )}
        {step.phase === "ask" && step.fmt === "self" && (
          <div style={{ marginTop: 14 }}>
            <textarea ref={afRef} value={text} onChange={e => setText(e.target.value)} rows={4} placeholder="Wyjaśnij własnymi słowami (możesz w myślach)"
              aria-label="Twoje wyjaśnienie"
              style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 14, lineHeight: 1.5, outline: "none", resize: "vertical" }}/>
            <button onClick={() => onAnswer(text)} style={btn(true, { width: "100%", marginTop: 8 })}>Pokaż wzorcową odpowiedź</button>
          </div>
        )}

        {step.phase === "conf" && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12.5, color: INK.soft }}>Twoja odpowiedź: <b style={{ color: "#f0f0f0" }}>{step.fmt === "mc" ? bank.concepts[step.choice].n : step.text || "—"}</b></div>
            <div style={{ fontSize: 13.5, color: "#e0e0e0", margin: "12px 0 8px" }}>Jak bardzo jesteś pewny?</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
              {[["sure", "Pewny"], ["think", "Chyba tak"], ["guess", "Zgaduję"]].map(([k, l], i) => (
                <button key={k} ref={i === 0 ? afRef : undefined} onClick={() => onConf(k)} style={btn(false, { padding: "10px 6px" })}>
                  <span style={{ color: INK.faint, fontFamily: MONO, fontSize: 11, marginRight: 6 }}>{i + 1}</span>{l}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: INK.faint, marginTop: 8 }}>Trafienie przy „zgaduję” liczy się, ale nie przesuwa pozycji dalej w czasie.</div>
          </div>
        )}

        {fb && <Feedback bank={bank} step={step} it={it} c={c} afRef={afRef} onGrade={onGrade} onNext={onNext} last={run.i + 1 >= total}/>}
      </div>
    </div>
  );
}

function Feedback({ bank, step, it, c, afRef, onGrade, onNext, last }) {
  const pending = step.phase === "grade";
  const ans = G.answerOf(bank, it);
  const wrongId = step.fmt === "mc" && step.choice !== it.c ? step.choice : null;
  const wrongWhy = wrongId && (it.ww?.[wrongId] || G.firstSentence(bank.concepts[wrongId].d));
  const banner = pending ? [ACC, "Porównaj z wzorcem"]
    : step.ok === "yes" ? [OK, `Poprawnie${step.gained ? `  +${step.gained} pkt` : ""}`]
    : step.ok === "partial" ? [ACC, `Częściowo${step.gained ? `  +${step.gained} pkt` : ""}`]
    : [BAD, `Niepoprawnie${step.requeued ? " · wróci za kilka pytań" : ""}`];
  const line = (label, body) => <div style={{ fontSize: 13, color: "#d8d8d8", lineHeight: 1.6, marginTop: 8 }}><span style={{ color: INK.soft }}>{label}: </span>{body}</div>;

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ background: banner[0] + "1c", color: banner[0], border: `1px solid ${banner[0]}55`, borderRadius: 10, padding: "9px 12px", fontWeight: 700, fontSize: 14 }}>{banner[1]}</div>

      {step.fmt === "mc" && (
        <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
          {step.opts.map(o => {
            const right = o === it.c, chosen = o === step.choice;
            return (
              <div key={o} style={{ ...optStyle(), cursor: "default", minHeight: 40, padding: "8px 12px",
                background: right ? OK + "18" : chosen ? BAD + "18" : "#121212", borderColor: right ? OK + "aa" : chosen ? BAD + "aa" : "#262626",
                color: right || chosen ? "#f0f0f0" : INK.soft }}>
                <span style={{ width: 18, flexShrink: 0, color: right ? OK : BAD }}>{right ? "✓" : chosen ? "✗" : ""}</span>
                <span>{bank.concepts[o].n}</span>
              </div>
            );
          })}
        </div>
      )}
      {step.fmt !== "mc" && line("Twoja odpowiedź", step.text || "—")}
      {step.fmt !== "mc" && line(it.k === "why" ? "Wzorcowa odpowiedź" : "Poprawna odpowiedź", <b style={{ color: "#f5f5f5" }}>{ans}</b>)}
      {wrongWhy && line(`Twój wybór — ${bank.concepts[wrongId].n}`, wrongWhy)}
      {it.why && line("Dlaczego", it.why)}

      {it.k !== "why" && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #222" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f0f0f0" }}>{c.n} <span style={{ fontWeight: 400, color: INK.soft, fontSize: 12 }}>· {c.en}</span></div>
          <div style={{ fontSize: 12.5, color: "#c8c8c8", lineHeight: 1.6, marginTop: 4 }}>{c.d}</div>
          {c.also && <div style={{ fontSize: 11.5, color: INK.soft, marginTop: 4 }}>Także jako: {c.also.join(", ")}</div>}
          {c.src && <a href={c.src} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", fontSize: 12, color: INK.soft, marginTop: 6, padding: "6px 0" }}>Źródło ↗</a>}
        </div>
      )}

      {pending ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13.5, color: "#e0e0e0", marginBottom: 8 }}>{step.fmt === "recall" ? "Czy Twoja odpowiedź znaczyła to samo?" : "Jak oceniasz swoją odpowiedź względem wzorca?"}</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${step.fmt === "recall" ? 2 : 3},minmax(0,1fr))`, gap: 8 }}>
            {(step.fmt === "recall" ? [["yes", "Tak, zalicz"], ["no", "Nie"]] : [["yes", "Zgadzała się"], ["partial", "Częściowo"], ["no", "Nie"]]).map(([k, l], i) => (
              <button key={k} ref={i === 0 ? afRef : undefined} onClick={() => onGrade(k)} style={btn(i === 0, { padding: "10px 6px" })}>
                <span style={{ fontFamily: MONO, fontSize: 11, marginRight: 6, opacity: 0.7 }}>{i + 1}</span>{l}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button ref={afRef} onClick={onNext} style={btn(true, { width: "100%", marginTop: 14, fontSize: 15 })}>{last ? "Zakończ sesję" : "Dalej"}</button>
      )}
    </div>
  );
}

const optStyle = () => ({ display: "flex", gap: 10, alignItems: "center", textAlign: "left", width: "100%", minHeight: 48, padding: "10px 14px",
  background: "#1c1c1c", border: "1px solid #303030", borderRadius: 10, color: "#ececec", fontSize: 14.5, lineHeight: 1.4, cursor: "pointer" });
function Kbd({ children }) {
  return <span aria-hidden="true" style={{ flexShrink: 0, minWidth: 22, textAlign: "center", border: "1px solid #3a3a3a", borderRadius: 6, fontFamily: MONO, fontSize: 11, color: INK.soft, lineHeight: "20px" }}>{children}</span>;
}
function Chip({ children, color }) {
  return <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99, border: `1px solid ${color ? color + "66" : "#2e2e2e"}`, color: color || INK.soft, background: color ? color + "14" : "transparent" }}>{children}</span>;
}

// ── Podsumowanie sesji ──────────────────────────────────────────────────────
function Summary({ bank, S, run, isMobile, afRef, onHome, onExtra }) {
  const A = run.answers, n = A.length, okN = A.filter(a => a.res === "yes").length;
  const calib = [["sure", "Pewny"], ["think", "Chyba tak"], ["guess", "Zgaduję"]].map(([k, l]) => {
    const sub = A.filter(a => a.conf === k);
    return { k, l, n: sub.length, ok: sub.filter(a => a.res === "yes").length };
  });
  const confErr = A.filter(a => a.conf === "sure" && a.res === "no").map(a => bank.items.find(x => x.id === a.id)).filter(Boolean);
  const nd = G.nextDue(bank, S);
  const acc = G.rollingAcc(S);
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f1f1", margin: "2px 0 12px" }}>{run.extra ? "Koniec praktyki" : "Podsumowanie sesji"}</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 8, marginBottom: 12 }}>
        <Stat label="Trafność" value={n ? `${Math.round(okN / n * 100)}%` : "—"}/>
        <Stat label="Odpowiedzi" value={n || "—"}/>
        <Stat label="Punkty" value={`+${run.xp}`}/>
        <Stat label="Ranga" value={G.rankName(bank, S)}/>
      </div>
      <div style={{ ...CARD, padding: "14px 16px", marginBottom: 12 }}><ZoneBar acc={acc} z={G.zone(acc)}/></div>
      {S.settings.confidence && n > 0 && (
        <div style={{ ...CARD, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f1f1", marginBottom: 8 }}>Kalibracja pewności</div>
          {calib.map(x => (
            <div key={x.k} style={{ display: "flex", gap: 10, padding: "6px 0", borderTop: "1px solid #1d1d1d", fontSize: 13, color: "#ddd", fontVariantNumeric: "tabular-nums" }}>
              <span style={{ flex: 1 }}>{x.l}</span><span style={{ color: INK.soft }}>{x.n ? `${x.ok}/${x.n}` : "—"}</span>
              <span style={{ width: 44, textAlign: "right" }}>{x.n ? `${Math.round(x.ok / x.n * 100)}%` : ""}</span>
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: INK.soft, marginTop: 8, lineHeight: 1.5 }}>„Pewny” powinno oznaczać ok. 90% trafień lub więcej. Wyraźnie mniej to nadmierna pewność siebie.</div>
        </div>
      )}
      {confErr.length > 0 && (
        <div style={{ ...CARD, border: `1px solid ${BAD}44`, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f1f1", marginBottom: 4 }}>Pomyłki z pewnością</div>
          <div style={{ fontSize: 11.5, color: INK.soft, marginBottom: 8 }}>Te najłatwiej poprawić właśnie teraz — przeczytaj je jeszcze raz.</div>
          {confErr.map(it => (
            <div key={it.id} style={{ padding: "8px 0", borderTop: "1px solid #1d1d1d" }}>
              <div style={{ fontSize: 12.5, color: INK.soft, lineHeight: 1.5 }}>{it.q.length > 160 ? it.q.slice(0, 157) + "…" : it.q}</div>
              <div style={{ fontSize: 13, color: "#f0f0f0", fontWeight: 700, marginTop: 3 }}>{G.answerOf(bank, it)}</div>
            </div>
          ))}
        </div>
      )}
      {nd && !run.extra && <div style={{ fontSize: 13, color: INK.soft, margin: "0 2px 12px" }}>Następny powrót: <b style={{ color: "#eee" }}>{G.whenLabel(nd.at)}</b> ({nd.count} {nd.count === 1 ? "pozycja" : "pozycji"}). Wróć wtedy — powtórka w odstępie utrwala bardziej niż kolejna sesja dziś.</div>}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
        <button ref={afRef} onClick={onHome} style={btn(true)}>Wróć do akt</button>
        {bank.items.some(it => !G.isUnseen(S, it.id)) && <button onClick={onExtra} style={btn(false)}>Ćwicz dodatkowo</button>}
      </div>
    </div>
  );
}
