import { useState, useEffect, useMemo, useRef } from "react";
import { useApp } from "../lib/appContext.js";
import { INK, MONO } from "../lib/ui.js";
import { MUSCLES } from "../lib/muscles.js";
import { WEEKDAYS } from "../plans.js";
import { guessMuscles } from "../lib/muscleGuess.js";
import { validatePlan, emptyPlan, DAY_KEYS, MUSCLE_IDS, LIMITS } from "../../../shared/planSchema.mjs";
import EXAMPLE_PLAN from "../../../shared/plans/tyler-durden.json";

// ══════════════════════════════════════════════════════════════════
//  EDYTOR PLANU TRENINGOWEGO
// ══════════════════════════════════════════════════════════════════
// Formularz jest jedynym miejscem, gdzie plan powstaje i gdzie się go
// poprawia — import z pliku nie zapisuje niczego wprost, tylko wypełnia ten
// sam formularz, żeby przed zapisem dało się obejrzeć dni, ćwiczenia
// i podświetlone mięśnie. Stan formularza ma kształt planu z
// shared/planSchema.mjs, z tą różnicą, że pola opcjonalne są pustymi
// tekstami zamiast brakować — pola kontrolowane w React nie lubią undefined.
// `validatePlan` na tym samym stanie daje listę błędów i wersję do zapisu.

export const ACC = "#5DCAA5";
export const EXAMPLE = EXAMPLE_PLAN;

const slug = s => (s || "plan").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/ł/g, "l").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plan";

// Eksport: plik do pobrania w formacie, który import przyjmie bez zmian.
export function downloadPlan(plan) {
  const { plan: norm } = validatePlan(plan);
  const data = norm || plan;
  const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${slug(data.name)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const str = v => (typeof v === "string" ? v : "");
const knownIds = list => (Array.isArray(list) ? list.filter(id => MUSCLE_IDS.includes(id)) : []);

// Plan (z bazy, z pliku albo pusty) → stan formularza. Nieznane mięśnie
// wypadają tu po cichu, a `toForm` zwraca ich listę, żeby edytor mógł o nich
// powiedzieć — walidator by je odrzucił, ale użytkownik nie miałby jak ich
// poprawić w formularzu, bo chipy pokazują tylko znane.
export function toForm(plan) {
  const src = plan && typeof plan === "object" ? plan : {};
  const dropped = [];
  const days = {};
  for (const key of DAY_KEYS) {
    const d = src.days && typeof src.days === "object" && src.days[key] && typeof src.days[key] === "object" ? src.days[key] : {};
    for (const f of ["primary", "support"]) {
      for (const id of Array.isArray(d[f]) ? d[f] : []) if (!MUSCLE_IDS.includes(id)) dropped.push(String(id));
    }
    const primary = knownIds(d.primary);
    days[key] = {
      title: str(d.title), short: str(d.short), rest: d.rest === true, desc: str(d.desc),
      primary, support: knownIds(d.support).filter(id => !primary.includes(id)),
      warmup: str(d.warmup), loadNote: str(d.loadNote),
      exercises: (Array.isArray(d.exercises) ? d.exercises : []).filter(e => e && typeof e === "object").map(e => ({
        name: str(e.name), sets: str(e.sets), load: str(e.load), rest: str(e.rest), desc: str(e.desc),
      })),
      cardio: d.cardio && typeof d.cardio === "object" ? {
        machine: str(d.cardio.machine),
        variants: (Array.isArray(d.cardio.variants) ? d.cardio.variants : []).filter(v => v && typeof v === "object").map(v => ({
          name: str(v.name), time: str(v.time),
          hrFrom: v.hrFrom === undefined || v.hrFrom === null ? "" : String(v.hrFrom),
          hrTo: v.hrTo === undefined || v.hrTo === null ? "" : String(v.hrTo),
          desc: str(v.desc),
        })),
      } : null,
    };
    if (days[key].cardio && !days[key].cardio.variants.length) days[key].cardio.variants.push({ name: "", time: "", hrFrom: "", hrTo: "", desc: "" });
  }
  return {
    form: {
      name: str(src.name), summary: str(src.summary), note: str(src.note),
      rules: (Array.isArray(src.rules) ? src.rules : []).filter(r => r && typeof r === "object").map(r => ({ title: str(r.title), text: str(r.text) })),
      days,
    },
    dropped: [...new Set(dropped)],
  };
}

const inp = {
  width: "100%", boxSizing: "border-box", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8,
  padding: "9px 11px", color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit", lineHeight: 1.4,
};
const area = { ...inp, resize: "vertical", lineHeight: 1.5 };
const btn = (on, color = ACC) => ({
  background: on ? color + "22" : "#0d0f16", border: `1px solid ${on ? color : "#262a38"}`, borderRadius: 10,
  padding: "9px 14px", minHeight: 40, color: on ? color : "#9a9a9a", fontWeight: 600, fontSize: 13, cursor: "pointer",
  fontFamily: "inherit",
});
const ghost = { background: "transparent", border: "1px solid #262a38", borderRadius: 8, padding: "8px 12px", minHeight: 40, color: INK.soft, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" };
const small = { ...ghost, minHeight: 36, minWidth: 36, padding: "0 10px", fontSize: 14 };
const label = { fontSize: 11, color: INK.soft, marginBottom: 4, fontWeight: 600 };
const sectionHead = { fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: ACC, fontFamily: MONO, margin: "18px 0 8px" };

function Field({ text, hint, children }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={label}>{text}{hint && <span style={{ fontWeight: 400, color: INK.faint }}> — {hint}</span>}</div>
      {children}
    </label>
  );
}

// Wybór mięśni dnia: jeden zestaw chipów, dotknięcie przełącza
// brak → partia główna → wspomagający → brak. Dwie listy chipów (osobno
// główne, osobno wspomagające) to 48 celów dotyku — o jeden ekran za dużo.
function MuscleChips({ day, onChange }) {
  const role = id => (day.primary.includes(id) ? "primary" : day.support.includes(id) ? "support" : "off");
  const cycle = id => {
    const r = role(id);
    const primary = day.primary.filter(x => x !== id);
    const support = day.support.filter(x => x !== id);
    if (r === "off") primary.push(id);
    else if (r === "primary") support.push(id);
    onChange({ primary, support });
  };
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {MUSCLE_IDS.map(id => {
          const m = MUSCLES[id];
          const r = role(id);
          return (
            <button key={id} type="button" onClick={() => cycle(id)} aria-pressed={r !== "off"}
              aria-label={`${m.name}: ${r === "primary" ? "partia główna" : r === "support" ? "wspomagający" : "nie wybrany"}`}
              style={{
                background: r === "primary" ? m.color + "33" : "transparent",
                borderWidth: 1, borderStyle: r === "support" ? "dashed" : "solid",
                borderColor: r === "off" ? "#2a2a2a" : m.color + (r === "primary" ? "" : "77"),
                borderRadius: 20, padding: "9px 12px", minHeight: 40, cursor: "pointer", fontFamily: "inherit",
                color: r === "primary" ? "#f0f0f0" : r === "support" ? "#c9c9c9" : INK.faint, fontSize: 12, fontWeight: r === "primary" ? 600 : 500,
              }}>
              <span style={{ color: r === "off" ? "#444" : m.color, marginRight: 5 }}>{r === "primary" ? "●" : r === "support" ? "◐" : "○"}</span>{m.name}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: INK.faint, marginTop: 6, lineHeight: 1.5 }}>
        Dotknięcie przełącza: ○ nie wybrany → ● partia główna (świeci mocno) → ◐ wspomagający (świeci słabiej).
      </div>
    </div>
  );
}

function ExerciseCard({ ex, index, count, onChange, onMove, onRemove, isMobile }) {
  const set = (k, v) => onChange({ ...ex, [k]: v });
  return (
    <div style={{ background: "#0d0f16", border: "1px solid #1e2130", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: MONO, color: INK.muted, flexShrink: 0 }}>#{index + 1}</span>
        <input value={ex.name} onChange={e => set("name", e.target.value)} placeholder="Nazwa ćwiczenia" maxLength={LIMITS.exName} aria-label={`Ćwiczenie ${index + 1}: nazwa`} style={{ ...inp, flex: 1, minWidth: 0 }} />
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="W górę" style={{ ...small, opacity: index === 0 ? 0.35 : 1 }}>↑</button>
        <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="W dół" style={{ ...small, opacity: index === count - 1 ? 0.35 : 1 }}>↓</button>
        <button type="button" onClick={onRemove} aria-label="Usuń ćwiczenie" style={{ ...small, color: "#f87171", borderColor: "#f8717155" }}>✕</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input value={ex.sets} onChange={e => set("sets", e.target.value)} placeholder="Serie, np. 4 × 6–8" maxLength={LIMITS.exSets} aria-label="Serie" style={inp} />
        <input value={ex.load} onChange={e => set("load", e.target.value)} placeholder="Obciążenie" maxLength={LIMITS.exLoad} aria-label="Obciążenie" style={inp} />
        <input value={ex.rest} onChange={e => set("rest", e.target.value)} placeholder="Przerwa, np. 90 s" maxLength={LIMITS.exRest} aria-label="Przerwa" style={{ ...inp, gridColumn: isMobile ? "1 / -1" : "auto" }} />
      </div>
      <textarea value={ex.desc} onChange={e => set("desc", e.target.value)} placeholder="Technika, wskazówki (opcjonalnie)" rows={2} maxLength={LIMITS.exDesc} aria-label="Opis ćwiczenia" style={{ ...area, fontSize: 13 }} />
    </div>
  );
}

function DayEditor({ dayKey, day, onChange, isMobile }) {
  const set = patch => onChange({ ...day, ...patch });
  const setEx = (i, ex) => set({ exercises: day.exercises.map((e, j) => (j === i ? ex : e)) });
  const moveEx = (i, dir) => {
    const list = [...day.exercises];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set({ exercises: list });
  };
  const addEx = () => set({ exercises: [...day.exercises, { name: "", sets: "", load: "", rest: "", desc: "" }] });
  const guess = () => {
    const g = guessMuscles(day);
    set({ primary: g.primary, support: g.support });
  };
  const cardio = day.cardio;
  const setVar = (i, patch) => set({ cardio: { ...cardio, variants: cardio.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) } });
  const label7 = WEEKDAYS.find(w => w.key === dayKey)?.label;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 10 }}>
        <Field text={`${label7} — nazwa dnia`}>
          <input value={day.title} onChange={e => set({ title: e.target.value })} placeholder="np. Klatka piersiowa" maxLength={LIMITS.dayTitle} style={inp} />
        </Field>
        <Field text="Skrót" hint="na kafel dnia">
          <input value={day.short} onChange={e => set({ short: e.target.value })} placeholder={day.title.slice(0, LIMITS.dayShort) || "Klatka"} maxLength={LIMITS.dayShort} style={inp} />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" onClick={() => set({ rest: !day.rest })} aria-pressed={day.rest} style={btn(day.rest, "#9a9a9a")}>{day.rest ? "✓ " : ""}Dzień wolny</button>
        <button type="button" onClick={() => set({ cardio: cardio ? null : { machine: "", variants: [{ name: "", time: "", hrFrom: "", hrTo: "", desc: "" }] } })} aria-pressed={!!cardio} style={btn(!!cardio)}>{cardio ? "✓ " : ""}Cardio</button>
      </div>
      {day.rest && (
        <Field text="Opis dnia wolnego" hint="opcjonalnie">
          <textarea value={day.desc} onChange={e => set({ desc: e.target.value })} rows={2} maxLength={LIMITS.dayText} style={area} />
        </Field>
      )}

      <div style={sectionHead}>MIĘŚNIE NA SYLWETCE</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <button type="button" onClick={guess} style={ghost}>✦ Podpowiedz z nazw</button>
        <span style={{ fontSize: 11, color: INK.faint }}>{day.primary.length} gł. · {day.support.length} wsp.</span>
        {(day.primary.length > 0 || day.support.length > 0) && <button type="button" onClick={() => set({ primary: [], support: [] })} style={{ ...ghost, minHeight: 32, padding: "4px 10px" }}>wyczyść</button>}
      </div>
      <MuscleChips day={day} onChange={patch => set(patch)} />

      {!day.rest && (
        <>
          <div style={sectionHead}>ĆWICZENIA ({day.exercises.length})</div>
          {day.exercises.map((ex, i) => (
            <ExerciseCard key={i} ex={ex} index={i} count={day.exercises.length} isMobile={isMobile}
              onChange={x => setEx(i, x)} onMove={dir => moveEx(i, dir)} onRemove={() => set({ exercises: day.exercises.filter((_, j) => j !== i) })} />
          ))}
          {day.exercises.length < LIMITS.exercises && <button type="button" onClick={addEx} style={{ ...btn(false), width: "100%" }}>＋ Ćwiczenie</button>}
          <div style={{ marginTop: 12 }}>
            <Field text="Rozgrzewka" hint="opcjonalnie">
              <textarea value={day.warmup} onChange={e => set({ warmup: e.target.value })} rows={2} maxLength={LIMITS.dayText} style={area} />
            </Field>
            <Field text="Uwaga o obciążeniach" hint="opcjonalnie, pod listą ćwiczeń">
              <textarea value={day.loadNote} onChange={e => set({ loadNote: e.target.value })} rows={2} maxLength={LIMITS.dayText} style={area} />
            </Field>
          </div>
        </>
      )}

      {cardio && (
        <>
          <div style={sectionHead}>CARDIO</div>
          <Field text="Maszyna / forma" hint="np. Bieżnia">
            <input value={cardio.machine} onChange={e => set({ cardio: { ...cardio, machine: e.target.value } })} maxLength={LIMITS.machine} style={inp} />
          </Field>
          {cardio.variants.map((v, i) => (
            <div key={i} style={{ background: "#0d0f16", border: "1px solid #1e2130", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                <input value={v.name} onChange={e => setVar(i, { name: e.target.value })} placeholder={`Wariant ${i + 1} (nazwa, opcjonalnie)`} maxLength={LIMITS.varName} style={{ ...inp, flex: 1, minWidth: 0 }} />
                {cardio.variants.length > 1 && <button type="button" onClick={() => set({ cardio: { ...cardio, variants: cardio.variants.filter((_, j) => j !== i) } })} aria-label="Usuń wariant" style={{ ...small, color: "#f87171", borderColor: "#f8717155" }}>✕</button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input value={v.time} onChange={e => setVar(i, { time: e.target.value })} placeholder="Czas, np. 50–60 min" maxLength={LIMITS.varTime} aria-label="Czas" style={{ ...inp, gridColumn: isMobile ? "1 / -1" : "auto" }} />
                <input value={v.hrFrom} onChange={e => setVar(i, { hrFrom: e.target.value })} inputMode="numeric" placeholder="% HRmax od" aria-label="Tętno od (% HRmax)" style={inp} />
                <input value={v.hrTo} onChange={e => setVar(i, { hrTo: e.target.value })} inputMode="numeric" placeholder="% HRmax do" aria-label="Tętno do (% HRmax)" style={inp} />
              </div>
              <input value={v.desc} onChange={e => setVar(i, { desc: e.target.value })} placeholder="Opis, np. interwały 8 × 1 min / 2 min truchtu" maxLength={LIMITS.varDesc} aria-label="Opis wariantu" style={inp} />
            </div>
          ))}
          {cardio.variants.length < LIMITS.variants && <button type="button" onClick={() => set({ cardio: { ...cardio, variants: [...cardio.variants, { name: "", time: "", hrFrom: "", hrTo: "", desc: "" }] } })} style={{ ...btn(false), width: "100%" }}>＋ Wariant</button>}
        </>
      )}
    </div>
  );
}

// Wczytanie pliku / wklejonego tekstu. Zwraca { form, dropped } albo { error }.
function parseImport(text) {
  let raw;
  try { raw = JSON.parse(text); }
  catch (e) { return { error: "To nie jest poprawny JSON: " + e.message }; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "Plik ma zawierać jeden obiekt planu." };
  return toForm(raw);
}

export default function PlanEditor({ initial, planId, mode = "form", onClose }) {
  const { savePlan, isMobile } = useApp();
  const start = useMemo(() => toForm(initial || emptyPlan()), [initial]);
  const [form, setForm] = useState(start.form);
  const [dayKey, setDayKey] = useState("mon");
  const [importOpen, setImportOpen] = useState(mode === "import");
  const [importText, setImportText] = useState("");
  const [notice, setNotice] = useState(start.dropped.length ? `Pominięto nieznane mięśnie: ${start.dropped.join(", ")}.` : "");
  const [saveErr, setSaveErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [closeArmed, setCloseArmed] = useState(false);
  const fileRef = useRef(null);
  const scrollRef = useRef(null);

  const { errors } = useMemo(() => validatePlan(form), [form]);
  const dirty = JSON.stringify(form) !== JSON.stringify(start.form);

  // Blokada przewijania strony pod edytorem — raz, przy otwarciu; osobno od
  // Escape, którego obsługa zmienia się z każdym stanem formularza.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  const closeRef = useRef(null);
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") closeRef.current?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!closeArmed) return;
    const t = setTimeout(() => setCloseArmed(false), 4000);
    return () => clearTimeout(t);
  }, [closeArmed]);

  const requestClose = () => {
    if (dirty && !closeArmed) { setCloseArmed(true); return; }
    onClose(null);
  };
  closeRef.current = requestClose;

  const load = (result, source) => {
    if (result.error) { setNotice(result.error); return; }
    setForm(result.form);
    setDayKey("mon");
    setImportOpen(false);
    setNotice(`Wczytano ${source}. Sprawdź dni i mięśnie, potem zapisz.` + (result.dropped.length ? ` Pominięto nieznane mięśnie: ${result.dropped.join(", ")}.` : ""));
    scrollRef.current?.scrollTo?.({ top: 0 });
  };
  const loadText = () => load(parseImport(importText), "wklejony plan");
  const loadFile = async file => {
    if (!file) return;
    if (file.size > LIMITS.bytes * 2) { setNotice("Plik jest za duży."); return; }
    load(parseImport(await file.text()), `plik ${file.name}`);
  };
  const loadExample = () => load(toForm(EXAMPLE_PLAN), "przykładowy plan Tyler Durden");

  const save = async () => {
    const { errors: errs, plan } = validatePlan(form);
    if (errs.length) { setShowErrors(true); return; }
    setSaving(true); setSaveErr("");
    const r = await savePlan(plan, planId);
    setSaving(false);
    if (r.ok) onClose(r.row);
    else setSaveErr(r.error || "Nie udało się zapisać.");
  };

  const setDay = (key, day) => setForm(f => ({ ...f, days: { ...f.days, [key]: day } }));
  const setRule = (i, patch) => setForm(f => ({ ...f, rules: f.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const day = form.days[dayKey];
  const dayErrCount = key => {
    const lab = WEEKDAYS.find(w => w.key === key)?.label;
    return errors.filter(e => e.startsWith(lab + ":") || e.startsWith(lab + ",")).length;
  };

  const title = planId ? "Edycja planu" : importOpen ? "Import planu" : "Nowy plan";
  return (
    <div role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 999, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 20 }}
      onClick={e => { if (e.target === e.currentTarget) requestClose(); }}>
      <div style={{ background: "#13161f", border: "1px solid #1e2130", borderRadius: isMobile ? "20px 20px 0 0" : 16, width: "100%", maxWidth: 780, height: isMobile ? "94vh" : "min(88vh, 900px)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 -8px 40px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "14px 16px 10px" : "16px 20px 12px", borderBottom: "1px solid #1e2130", flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: ACC, fontFamily: MONO }}>PLAN TRENINGOWY</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#f0f0f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
          </div>
          {!importOpen && <button type="button" onClick={() => setImportOpen(true)} style={ghost}>⤓ Import</button>}
          <button type="button" onClick={requestClose} aria-label="Zamknij" style={{ ...ghost, minWidth: 44, minHeight: 44, padding: 0, fontSize: 18, border: "none" }}>✕</button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px 16px 20px" : "14px 20px 24px", WebkitOverflowScrolling: "touch" }}>
          {notice && (
            <div role="status" style={{ fontSize: 12.5, color: "#c9c9c9", background: "#0d0f16", border: `1px solid ${ACC}55`, borderRadius: 8, padding: "9px 11px", marginBottom: 12, lineHeight: 1.5, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ flex: 1 }}>{notice}</span>
              <button type="button" onClick={() => setNotice("")} aria-label="Zamknij komunikat" style={{ ...small, minHeight: 28, minWidth: 28, padding: 0, border: "none", fontSize: 14 }}>✕</button>
            </div>
          )}

          {importOpen && (
            <div style={{ background: "#0d0f16", border: "1px solid #1e2130", borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#c9c9c9", lineHeight: 1.55, marginBottom: 10 }}>
                Plan w formacie <span style={{ fontFamily: MONO, color: ACC }}>sledzik-plan/1</span>: plik <span style={{ fontFamily: MONO }}>.json</span> z polami
                <span style={{ fontFamily: MONO }}> name</span>, <span style={{ fontFamily: MONO }}>days</span> (mon…sun), a w dniu <span style={{ fontFamily: MONO }}>title</span>, <span style={{ fontFamily: MONO }}>primary</span>, <span style={{ fontFamily: MONO }}>support</span>, <span style={{ fontFamily: MONO }}>exercises</span>.
                Najprościej: wyeksportuj istniejący plan i zmień w nim, co trzeba.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <input ref={fileRef} type="file" accept=".json,application/json" onChange={e => { loadFile(e.target.files?.[0]); e.target.value = ""; }} style={{ display: "none" }} aria-hidden="true" tabIndex={-1} />
                <button type="button" onClick={() => fileRef.current?.click()} style={btn(false)}>📂 Wybierz plik</button>
                <button type="button" onClick={loadExample} style={btn(false)}>★ Przykład: Tyler Durden</button>
                {!planId && <button type="button" onClick={() => setImportOpen(false)} style={ghost}>Wypełnię ręcznie</button>}
              </div>
              <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="…albo wklej tutaj zawartość pliku JSON" rows={5} spellCheck={false} aria-label="JSON planu" style={{ ...area, fontFamily: MONO, fontSize: 12 }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" onClick={loadText} disabled={!importText.trim()} style={{ ...btn(!!importText.trim()), opacity: importText.trim() ? 1 : 0.5 }}>Wczytaj wklejony</button>
                {planId && <button type="button" onClick={() => setImportOpen(false)} style={ghost}>Anuluj</button>}
              </div>
            </div>
          )}

          <Field text="Nazwa planu">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="np. Tyler Durden" maxLength={LIMITS.name} style={{ ...inp, fontSize: 15, fontWeight: 600 }} />
          </Field>
          <Field text="Opis" hint="jedno–dwa zdania, opcjonalnie">
            <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={2} maxLength={LIMITS.summary} style={area} />
          </Field>
          <Field text="Notatka pod każdym dniem" hint="np. przelicznik obciążeń, opcjonalnie">
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} maxLength={LIMITS.note} style={area} />
          </Field>

          <button type="button" onClick={() => setShowRules(v => !v)} aria-expanded={showRules} style={{ background: "none", border: "none", padding: "8px 0", minHeight: 36, cursor: "pointer", color: ACC, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", fontFamily: MONO }}>
            {showRules ? "▾" : "▸"} ZASADY WSPÓLNE ({form.rules.length})
          </button>
          {showRules && (
            <div style={{ marginBottom: 8 }}>
              {form.rules.map((r, i) => (
                <div key={i} style={{ background: "#0d0f16", border: "1px solid #1e2130", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <input value={r.title} onChange={e => setRule(i, { title: e.target.value })} placeholder="Tytuł zasady" maxLength={LIMITS.ruleTitle} aria-label={`Zasada ${i + 1}: tytuł`} style={{ ...inp, flex: 1, minWidth: 0 }} />
                    <button type="button" onClick={() => setForm(f => ({ ...f, rules: f.rules.filter((_, j) => j !== i) }))} aria-label="Usuń zasadę" style={{ ...small, color: "#f87171", borderColor: "#f8717155" }}>✕</button>
                  </div>
                  <textarea value={r.text} onChange={e => setRule(i, { text: e.target.value })} placeholder="Treść" rows={2} maxLength={LIMITS.ruleText} aria-label={`Zasada ${i + 1}: treść`} style={{ ...area, fontSize: 13 }} />
                </div>
              ))}
              {form.rules.length < LIMITS.rules && <button type="button" onClick={() => setForm(f => ({ ...f, rules: [...f.rules, { title: "", text: "" }] }))} style={{ ...btn(false), width: "100%" }}>＋ Zasada</button>}
            </div>
          )}

          <div style={sectionHead}>DNI TYGODNIA</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(4,1fr)" : "repeat(7,1fr)", gap: 6, marginBottom: 14 }}>
            {WEEKDAYS.map(w => {
              const d = form.days[w.key];
              const on = dayKey === w.key;
              const c = MUSCLES[d.primary[0]]?.color || (d.rest ? "#5a5a5a" : ACC);
              const n = dayErrCount(w.key);
              return (
                <button key={w.key} type="button" onClick={() => setDayKey(w.key)} aria-pressed={on}
                  style={{ background: on ? c + "26" : "#0d0f16", border: `1px solid ${on ? c : n ? "#f8717166" : "#262a38"}`, borderRadius: 10, padding: "7px 4px", minHeight: 48, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: "inherit" }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", fontFamily: MONO, color: on ? c : INK.muted }}>{w.short.toUpperCase()}{n ? " !" : ""}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: on ? "#f0f0f0" : d.title ? "#8a8a8a" : INK.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{d.short || d.title.slice(0, LIMITS.dayShort) || "—"}</span>
                </button>
              );
            })}
          </div>
          <DayEditor key={dayKey} dayKey={dayKey} day={day} onChange={d => setDay(dayKey, d)} isMobile={isMobile} />
        </div>

        <div style={{ borderTop: "1px solid #1e2130", padding: isMobile ? "10px 16px calc(12px + env(safe-area-inset-bottom))" : "12px 20px 14px", flexShrink: 0, background: "#13161f" }}>
          {errors.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <button type="button" onClick={() => setShowErrors(v => !v)} aria-expanded={showErrors} style={{ background: "none", border: "none", padding: "4px 0", color: "#f87171", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {showErrors ? "▾" : "▸"} Do poprawy: {errors.length}
              </button>
              {showErrors && (
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: "#f0a0a0", lineHeight: 1.55, maxHeight: 120, overflowY: "auto" }}>
                  {errors.slice(0, 12).map((e, i) => <li key={i}>{e}</li>)}
                  {errors.length > 12 && <li>…i {errors.length - 12} więcej</li>}
                </ul>
              )}
            </div>
          )}
          {saveErr && <div role="alert" style={{ fontSize: 12.5, color: "#f87171", marginBottom: 8 }}>{saveErr}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={save} disabled={saving || errors.length > 0}
              style={{ flex: 1, background: errors.length ? "#222" : ACC, color: errors.length ? INK.muted : "#000", border: "none", borderRadius: 10, padding: "12px", minHeight: 46, fontWeight: 700, fontSize: 14, cursor: errors.length ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {saving ? "Zapisuję…" : planId ? "Zapisz zmiany" : "Zapisz plan"}
            </button>
            <button type="button" onClick={requestClose} style={{ ...ghost, minHeight: 46, padding: "0 16px", background: closeArmed ? "#6b2020" : "transparent", color: closeArmed ? "#fff" : INK.soft, borderColor: closeArmed ? "#f87171" : "#262a38", whiteSpace: "nowrap" }}>
              {closeArmed ? "Odrzucić zmiany?" : "Anuluj"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
