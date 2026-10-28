import { useState } from "react";
import { CATEGORIES, CAT_BY_LABEL, DAY_LABELS, INK, BG, kb, plDate, habLayout } from "../lib/ui.js";
import { IconBtn, DeleteBtn } from "../components/buttons.jsx";
import { HabitHex } from "../components/charts.jsx";
import { useApp } from "../lib/appContext.js";

// Cele ogólne. Ten sam sześciokąt i te same kategorie co nawyki, ale wycinek
// mówi co innego: jak regularnie w ostatnich 7 dniach odhaczane były nawyki
// podpięte pod cele z tej kategorii. Dzień zamiast tygodnia nie ma tu sensu —
// cel jest odległy, a rano każdy wycinek byłby pusty.

// 1 cel, 2 cele, 5 celów, 22 cele — polska odmiana liczebnika.
const plural = (n, one, few, many) => {
  if (n === 1) return one;
  const d = n % 10, dd = n % 100;
  return d >= 2 && d <= 4 && !(dd >= 12 && dd <= 14) ? few : many;
};
const ileCelow = n => `${n} ${plural(n, "cel", "cele", "celów")}`;

// Ile dni do terminu, liczone na datach lokalnych (bez godzin), więc zmiana
// czasu nie robi z 30 dni 29,96.
function terminTekst(deadline, todayStr) {
  const dni = Math.round((new Date(deadline + "T00:00:00") - new Date(todayStr + "T00:00:00")) / 864e5);
  if (dni > 1) return { txt: `zostało ${dni} dni`, late: false };
  if (dni === 1) return { txt: "termin jutro", late: false };
  if (dni === 0) return { txt: "termin dziś", late: false };
  return { txt: `${-dni} ${plural(-dni, "dzień", "dni", "dni")} po terminie`, late: true };
}

const inputStyle = { width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "10px 12px",
  color: "#fff", fontSize: 14, outline: "none" };
const labelStyle = { fontSize: 12, color: INK.muted, display: "block", marginBottom: 6 };

// Formularz celu — ten sam przy dodawaniu i edycji. Stan lokalny: pół
// wpisanego celu może zniknąć przy zmianie zakładki, to nie dziennik.
function GoalForm({ initial, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(initial.name || "");
  const [category, setCategory] = useState(initial.category || CATEGORIES[0].label);
  const [note, setNote] = useState(initial.note || "");
  const [deadline, setDeadline] = useState(initial.deadline || "");
  const ok = name.trim().length > 0;
  const save = () => { if (ok) onSave({ name: name.trim(), category, note: note.trim(), deadline: deadline || null }); };
  return (
    <div className="rozwin" style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 14, padding: 16, marginTop: 12 }}>
      <label style={labelStyle} htmlFor="cel-nazwa">Cel</label>
      <input id="cel-nazwa" value={name} onChange={e => setName(e.target.value)} autoFocus maxLength={160}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") onCancel(); }}
        placeholder="np. Przebiec półmaraton" style={{ ...inputStyle, marginBottom: 12, fontWeight: 600 }} />
      <div role="radiogroup" aria-label="Kategoria" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {CATEGORIES.map(c => {
          const on = category === c.label;
          return (
            <button key={c.label} type="button" role="radio" aria-checked={on} onClick={() => setCategory(c.label)}
              style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 44, border: `1px solid ${on ? c.color : "#333"}`,
                background: on ? c.bg : "transparent", color: on ? "#f1f1f1" : INK.soft, borderRadius: 22, padding: "4px 14px",
                cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
              {c.label}
            </button>
          );
        })}
      </div>
      <label style={labelStyle} htmlFor="cel-notatka">Po czym poznasz, że osiągnięty? (opcjonalnie)</label>
      <textarea id="cel-notatka" value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500}
        placeholder="np. 21 km poniżej 2 godzin" style={{ ...inputStyle, fontSize: 13, resize: "vertical", marginBottom: 12 }} />
      <label style={labelStyle} htmlFor="cel-termin">Termin (opcjonalnie)</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <input id="cel-termin" type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
          style={{ ...inputStyle, colorScheme: "dark", flex: 1, width: "auto" }} />
        {deadline && (
          <button type="button" onClick={() => setDeadline("")}
            style={{ background: "none", border: "none", color: INK.soft, cursor: "pointer", fontSize: 12, minHeight: 44, padding: "0 8px", flexShrink: 0 }}>
            Bez terminu ×
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" onClick={save} disabled={!ok}
          style={{ background: ok ? "#fff" : "#222", color: ok ? "#000" : INK.muted, border: "none", borderRadius: 8, padding: "8px 20px",
            minHeight: 44, fontWeight: 600, cursor: ok ? "pointer" : "not-allowed", flex: 1 }}>
          {initial.id ? "Zapisz" : "Dodaj cel"}
        </button>
        <button type="button" onClick={onCancel}
          style={{ background: "#222", color: "#aaa", border: "none", borderRadius: 8, padding: "8px 16px", minHeight: 44, cursor: "pointer" }}>Anuluj</button>
        {/* Kasowanie tylko w edycji i z boku — nie pod kciukiem, który
            zapisuje. Nawyki zostają, znika samo powiązanie. */}
        {onDelete && <DeleteBtn onDelete={onDelete} title="Usuń cel (nawyki zostają)" size={26} />}
      </div>
    </div>
  );
}

function GoalCard({ goal, cat, stats }) {
  const { habits, isChecked, toggleHabit, todayStr, days7, getStreak, isMobile,
    patchGoal, deleteGoal, linkHabit, addHabitToGoal } = useApp();
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [newHabit, setNewHabit] = useState("");

  if (editing) return (
    <GoalForm initial={goal} onCancel={() => setEditing(false)}
      onSave={body => { patchGoal(goal.id, body); setEditing(false); }}
      onDelete={() => deleteGoal(goal.id)} />
  );

  const linked = stats.habits;
  // Do podpięcia: najpierw nawyki z kategorii celu, potem reszta w kolejności
  // kategorii — przy kilkunastu nawykach właściwy jest wtedy na górze.
  const order = l => { const i = CATEGORIES.findIndex(c => c.label === l); return i < 0 ? 0 : i; };
  const free = habits.filter(h => !goal.habitIds.includes(h.id))
    .sort((a, b) => (b.category === goal.category) - (a.category === goal.category) || order(a.category) - order(b.category));
  const termin = goal.deadline ? terminTekst(goal.deadline, todayStr) : null;
  const dodajNowy = () => { if (newHabit.trim()) { addHabitToGoal(goal, newHabit.trim()); setNewHabit(""); } };

  return (
    <div style={{ background: "#161616", border: "1px solid #1e1e1e", borderLeft: `3px solid ${cat.color}`, borderRadius: 12,
      padding: "10px 11px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div {...kb(() => setEditing(true))} title="Kliknij, aby edytować" aria-label={`${goal.name} — edytuj cel`}
          style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3, wordBreak: "break-word", color: "#f1f1f1" }}>
            {goal.name} <span aria-hidden="true" style={{ fontSize: 10, color: INK.faint }}>✎</span>
          </div>
          {goal.note && <div style={{ fontSize: 11.5, color: INK.soft, marginTop: 3, lineHeight: 1.45 }}>{goal.note}</div>}
          {termin && (
            <div style={{ fontSize: 11, marginTop: 3, color: termin.late ? "#f87171" : INK.faint }}>
              ⏳ {plDate(goal.deadline)} · {termin.txt}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }} title="Odhaczenia podpiętych nawyków z ostatnich 7 dni">
          <div style={{ fontSize: 17, fontWeight: 700, color: "#f1f1f1", fontVariantNumeric: "tabular-nums" }}>
            {stats.total ? `${stats.rate}%` : "—"}
          </div>
          <div style={{ fontSize: 10, color: INK.faint }}>7 dni</div>
        </div>
      </div>

      {/* Tydzień celu: dzień tym pełniejszy, im więcej podpiętych nawyków
          tego dnia odhaczono. Liczba obok jest w podpisie, więc kolor nie
          jest jedynym nośnikiem informacji. */}
      {linked.length > 0 && (
        <div style={{ display: "flex", gap: 3, margin: "9px 0 2px" }}>
          {days7.map((d, i) => {
            const n = stats.perDay[i], f = n / linked.length;
            const di = new Date(d + "T00:00:00").getDay();
            return (
              <div key={d} style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
                <div title={`${plDate(d)}: ${n} z ${linked.length}`} aria-label={`${plDate(d)}: ${n} z ${linked.length}`} role="img"
                  style={{ height: 16, borderRadius: 4, background: f > 0 ? cat.color : "#2a2a2a", opacity: f > 0 ? 0.35 + 0.65 * f : 1,
                    outline: d === todayStr ? "1px solid #555" : "none", outlineOffset: 1 }} />
                <div style={{ fontSize: 9, color: INK.muted, marginTop: 3 }}>{DAY_LABELS[di]}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Podpięte nawyki z odhaczeniem na dziś — z celu da się od razu
          zrobić krok, bez przechodzenia do listy nawyków. */}
      <div style={{ marginTop: 8 }}>
        {linked.length === 0 && (
          <div style={{ fontSize: 12, color: INK.faint, fontStyle: "italic", padding: "2px 0 6px" }}>
            Brak nawyków — cel bez codziennych kroków zostaje życzeniem. Podepnij pierwszy.
          </div>
        )}
        {linked.map(h => {
          const hc = CAT_BY_LABEL[h.category] || CATEGORIES[0];
          const done = isChecked(h.id, todayStr);
          const streak = getStreak(h.id);
          return (
            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid #1f1f1f", minHeight: isMobile ? 46 : 36 }}>
              <button type="button" onClick={() => toggleHabit(h.id, todayStr)} aria-pressed={done}
                aria-label={`${h.name} — ${done ? "odznacz" : "odhacz"} dziś`}
                style={{ width: isMobile ? 44 : 32, height: isMobile ? 44 : 32, background: "none", border: "none", padding: 0, margin: "0 0 0 -6px",
                  cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${hc.color}`, background: done ? hc.color : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}>
                  {done && <span className="fajka" style={{ color: "#000", fontSize: 11, fontWeight: 700 }}>✓</span>}
                </span>
              </button>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.3, wordBreak: "break-word",
                color: done ? INK.muted : "#e8e8e8", textDecoration: done ? "line-through" : "none" }}>
                {h.category !== goal.category && (
                  <span title={h.category} aria-label={h.category}
                    style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: hc.color, marginRight: 6, verticalAlign: 1 }} />
                )}
                {h.name}
                {streak > 0 && <span style={{ fontSize: 11, color: INK.faint, marginLeft: 6, textDecoration: "none", display: "inline-block" }}>🔥 {streak}</span>}
              </div>
              <IconBtn onClick={() => linkHabit(goal.id, h.id, false)} title={`Odepnij „${h.name}" od celu`} size={22}>−</IconBtn>
            </div>
          );
        })}
      </div>

      {picking ? (
        <div className="rozwin" style={{ background: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: 10, padding: 10, marginTop: 8 }}>
          {free.length > 0 && (
            <>
              <div style={{ fontSize: 11.5, color: INK.muted, marginBottom: 6 }}>Podepnij istniejący nawyk</div>
              <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 10 }}>
                {free.map(h => {
                  const hc = CAT_BY_LABEL[h.category] || CATEGORIES[0];
                  return (
                    <button key={h.id} type="button" onClick={() => linkHabit(goal.id, h.id, true)}
                      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", minHeight: 44, background: "none", border: "none",
                        borderBottom: "1px solid #1c1c1c", color: "#e0e0e0", fontSize: 13, textAlign: "left", cursor: "pointer", padding: "4px 4px" }}>
                      <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, background: hc.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>{h.name}</span>
                      <span aria-hidden="true" style={{ color: INK.soft, fontSize: 16, flexShrink: 0 }}>＋</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <label style={{ ...labelStyle, fontSize: 11.5 }} htmlFor={`nowy-nawyk-${goal.id}`}>
            {free.length > 0 ? "albo załóż nowy" : "Nowy nawyk dla tego celu"} — trafi do kategorii „{goal.category}"
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            <input id={`nowy-nawyk-${goal.id}`} value={newHabit} onChange={e => setNewHabit(e.target.value)} maxLength={120}
              onKeyDown={e => { if (e.key === "Enter") dodajNowy(); if (e.key === "Escape") setPicking(false); }}
              placeholder="np. 30 min biegu" style={{ ...inputStyle, flex: 1, width: "auto", fontSize: 13, padding: "9px 11px" }} />
            <button type="button" onClick={dodajNowy} disabled={!newHabit.trim()}
              style={{ background: newHabit.trim() ? cat.color : "#222", color: newHabit.trim() ? "#000" : INK.muted, border: "none", borderRadius: 8,
                padding: "0 14px", minHeight: 44, fontWeight: 700, fontSize: 13, cursor: newHabit.trim() ? "pointer" : "not-allowed", flexShrink: 0 }}>
              Dodaj
            </button>
          </div>
          <button type="button" onClick={() => { setPicking(false); setNewHabit(""); }}
            style={{ width: "100%", marginTop: 8, background: "#222", color: "#bbb", border: "none", borderRadius: 8, minHeight: 40, cursor: "pointer", fontSize: 13 }}>
            Gotowe
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button type="button" onClick={() => setPicking(true)}
            style={{ flex: 1, minHeight: isMobile ? 44 : 34, background: "transparent", border: "1px dashed #333", borderRadius: 8,
              color: INK.soft, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            ＋ Podepnij nawyk
          </button>
          <button type="button" onClick={() => patchGoal(goal.id, { achieved: true })}
            style={{ minHeight: isMobile ? 44 : 34, background: "transparent", border: "1px solid #333", borderRadius: 8,
              color: INK.soft, cursor: "pointer", fontSize: 12, fontWeight: 600, padding: "0 12px", flexShrink: 0 }}>
            🏆 Osiągnięty
          </button>
        </div>
      )}
    </div>
  );
}

export default function GoalsView() {
  const { goals, goalCat, setGoalCat, habits, isChecked, days7, isMobile, isWide, isXWide, addGoal, patchGoal, deleteGoal } = useApp();
  const [adding, setAdding] = useState(false);

  const habitById = Object.fromEntries(habits.map(h => [h.id, h]));
  // Statystyka celu z 7 dni. Nawyki skasowane w międzyczasie odpadają.
  const statsOf = g => {
    const hs = g.habitIds.map(id => habitById[id]).filter(Boolean);
    const perDay = days7.map(d => hs.filter(h => isChecked(h.id, d)).length);
    const done = perDay.reduce((a, b) => a + b, 0), total = hs.length * 7;
    return { habits: hs, perDay, done, total, rate: total ? Math.round((done / total) * 100) : 0 };
  };
  const active = goals.filter(g => !g.achievedAt);
  const achieved = goals.filter(g => g.achievedAt).sort((a, b) => String(b.achievedAt).localeCompare(String(a.achievedAt)));
  const stats = Object.fromEntries(active.map(g => [g.id, statsOf(g)]));
  // Cel z nieznaną kategorią trafia do pierwszej — tak samo jak nawyki.
  const byCat = Object.fromEntries(CATEGORIES.map(c => [c.label, []]));
  for (const g of active) (byCat[g.category] || byCat[CATEGORIES[0].label]).push(g);

  // Wycinek: suma odhaczeń ze wszystkich celów kategorii przez sumę możliwych.
  // Każdy cel waży tyle, ile ma nawyków — cel z jednym nawykiem nie przeważy
  // celu, który niesie pięć.
  const statyKat = CATEGORIES.map(cat => {
    const list = byCat[cat.label];
    const done = list.reduce((a, g) => a + stats[g.id].done, 0);
    const total = list.reduce((a, g) => a + stats[g.id].total, 0);
    return { cat, done, total, goals: list.length };
  });
  const suma = statyKat.reduce((a, s) => ({ done: a.done + s.done, total: a.total + s.total }), { done: 0, total: 0 });
  const pct = (d, t) => (t ? Math.round((d / t) * 100) : 0);

  // Wolne nawyki: takie, które nie służą żadnemu celowi w toku.
  const served = new Set(active.flatMap(g => g.habitIds));
  const orphans = habits.filter(h => !served.has(h.id));

  const wybierz = label => {
    const nowy = goalCat === label ? null : label;
    setGoalCat(nowy);
    if (nowy) requestAnimationFrame(() => document.getElementById("cel-kat-" + CATEGORIES.findIndex(c => c.label === nowy))
      ?.scrollIntoView?.({ behavior: "smooth", block: "nearest" }));
  };

  // Ten sam układ co widok nawyków — przełączenie nie przestawia kolumn.
  const L = habLayout({ isMobile, isWide, isXWide });
  return (
    <div style={L.grid}>

      {/* ── lewa kolumna: sześciokąt celów ── */}
      <div style={{ minWidth: 0, position: isWide ? "sticky" : "static", top: 16 }}>
        {active.length > 0 && (
          <div style={{ background: "#121317", border: "1px solid #1e1e1e", borderRadius: 14, padding: isMobile ? 8 : 16 }}>
            <HabitHex stats={statyKat} selected={goalCat} onSelect={wybierz} size={L.hexSize}
              center={{ value: suma.total ? `${pct(suma.done, suma.total)}%` : "—", label: "7 dni" }}
              ariaLabel="Sześć kategorii celów — regularność podpiętych nawyków z 7 dni"
              describe={s => s.goals
                ? `${ileCelow(s.goals)}, ${s.total ? `${pct(s.done, s.total)}% odhaczeń z 7 dni` : "bez podpiętych nawyków"}`
                : "brak celów"} />
            <div style={{ fontSize: 11, color: INK.faint, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
              Wypełnienie: ile z nawyków podpiętych pod cele odhaczono w ostatnich 7 dniach.
            </div>
          </div>
        )}
      </div>

      <div style={L.rest}>
      {/* ── środek: cele w kategoriach ── */}
      <div style={{ minWidth: 0 }}>
        {active.length === 0 && !adding && (
          <div style={{ textAlign: "center", padding: "36px 12px", color: INK.muted, background: BG.panel,
            border: `1px solid ${BG.panelBorder}`, borderRadius: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
            <p style={{ margin: "0 0 6px" }}>Brak celów w toku.</p>
            <p style={{ margin: 0, fontSize: 12.5, color: INK.faint, lineHeight: 1.5 }}>
              Cel to kierunek — „przebiec półmaraton", „poduszka na pół roku".<br />
              Pod każdy podepniesz nawyki, które do niego prowadzą.
            </p>
          </div>
        )}
        {active.length > 0 && statyKat.map(({ cat, done, total, goals: n }, i) => {
          const open = goalCat === cat.label;
          return (
            <div key={cat.label} id={"cel-kat-" + i} style={{ background: "#121317", border: `1px solid ${open ? cat.color + "55" : "#1e1e1e"}`,
              borderRadius: 14, marginBottom: 8, overflow: "hidden" }}>
              <div {...kb(() => wybierz(cat.label))} aria-expanded={open}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer", minHeight: 56 }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: cat.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cat.label}
                    {n > 0 && <span style={{ fontWeight: 500, fontSize: 12, color: INK.faint }}> · {ileCelow(n)}</span>}
                  </div>
                  <div style={{ background: "#232323", borderRadius: 99, height: 4, overflow: "hidden", marginTop: 6, maxWidth: 220 }}>
                    <div style={{ width: `${pct(done, total)}%`, height: "100%", background: cat.color, borderRadius: 99,
                      transition: "width .35s cubic-bezier(.2,.8,.3,1)" }} />
                  </div>
                </div>
                <span style={{ fontSize: 12, color: INK.soft, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                  {total ? `${pct(done, total)}%` : "—"}
                </span>
                <span aria-hidden="true" style={{ color: INK.muted, fontSize: 11, flexShrink: 0, display: "inline-block",
                  transition: "transform .22s cubic-bezier(.2,.8,.3,1)", transform: open ? "rotate(180deg)" : "none" }}>▼</span>
              </div>
              {open && (
                <div className="rozwin" style={{ padding: "0 12px 12px" }}>
                  {n === 0 && (
                    <div style={{ fontSize: 12, color: INK.faint, fontStyle: "italic", padding: "2px 2px 10px" }}>
                      Nic tu jeszcze nie ma — dodaj pierwszy cel w tej kategorii.
                    </div>
                  )}
                  {byCat[cat.label].map(g => <GoalCard key={g.id} goal={g} cat={cat} stats={stats[g.id]} />)}
                </div>
              )}
            </div>
          );
        })}

        {adding ? (
          <GoalForm initial={{ category: goalCat || CATEGORIES[0].label }} onCancel={() => setAdding(false)}
            onSave={body => {
              addGoal(body); setAdding(false);
              // Rozwijamy kategorię nowego celu, żeby było widać, gdzie wylądował.
              setGoalCat(body.category);
            }} />
        ) : (
          <button type="button" onClick={() => setAdding(true)} style={{ width: "100%", marginTop: 12, padding: "13px", minHeight: 48,
            borderRadius: 12, border: "2px dashed #333", background: BG.panel, color: INK.soft, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            + Dodaj cel
          </button>
        )}
      </div>

      {/* ── prawa kolumna: osiągnięte i nawyki bez celu ── */}
      <div style={{ minWidth: 0, position: L.sideSticky ? "sticky" : "static", top: 16, display: "grid", gap: 12 }}>
        {achieved.length > 0 && (
          <div style={{ background: "#161616", border: "1px solid #1e1e1e", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 17 }}>🏆</span>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f1f1" }}>Osiągnięte</div>
              <span style={{ marginLeft: "auto", fontSize: 11, color: INK.soft }}>{achieved.length}</span>
            </div>
            {achieved.map(g => {
              const c = CAT_BY_LABEL[g.category] || CATEGORIES[0];
              return (
                <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#0f0f0f", border: "1px solid #1e1e1e",
                  borderLeft: `3px solid ${c.color}`, borderRadius: 10, padding: "6px 6px 6px 10px", marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8e8", wordBreak: "break-word" }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: INK.faint, marginTop: 2 }}>{plDate(g.achievedAt)} · {c.label}</div>
                  </div>
                  <IconBtn onClick={() => patchGoal(g.id, { achieved: false })} title="Przywróć do celów w toku" size={24}>↺</IconBtn>
                  <DeleteBtn onDelete={() => deleteGoal(g.id)} title="Usuń cel" size={24} />
                </div>
              );
            })}
          </div>
        )}
        <div style={{ background: "#161616", border: "1px solid #1e1e1e", borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 17 }}>🧭</span>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f1f1" }}>Nawyki bez celu</div>
            <span style={{ marginLeft: "auto", fontSize: 11, color: INK.soft }}>{orphans.length}</span>
          </div>
          <div style={{ fontSize: 11.5, color: INK.soft, lineHeight: 1.55, margin: "6px 0 12px" }}>
            Nie służą żadnemu celowi w toku. Podepniesz je przyciskiem „＋ Podepnij nawyk" w karcie celu — albo zostaw, jeśli to po prostu higiena dnia.
          </div>
          {orphans.length === 0 ? (
            <div style={{ fontSize: 12.5, color: INK.faint, textAlign: "center", padding: "8px 0" }}>
              {habits.length ? "Każdy nawyk ma swój cel." : "Nie masz jeszcze nawyków."}
            </div>
          ) : orphans.map(h => {
            const c = CAT_BY_LABEL[h.category] || CATEGORIES[0];
            return (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 2px", borderTop: "1px solid #1f1f1f", fontSize: 13, color: "#ddd" }}>
                <span title={c.label} style={{ width: 9, height: 9, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                <span style={{ minWidth: 0, wordBreak: "break-word" }}>{h.name}</span>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
