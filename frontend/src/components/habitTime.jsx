import { useState } from "react";
import { MOBILE, useMedia, INK } from "../lib/ui.js";
import { TimePicker } from "./buttons.jsx";

// ── Nawyk w planie dnia: kiedy, jak długo, czy obowiązkowy ───────────────
// Obowiązkowy nawyk to pełny blok w kolorze kategorii, opcjonalny — blok
// w paski. Te same wzory są w legendzie, na blokach i na przełączniku, żeby
// znaczenie paska dało się odczytać bez szukania objaśnienia.

// Tekst na pełnym bloku jest czarny: przy sześciu kolorach kategorii czarny
// ma ≥ 4,5:1 wszędzie, biały na zieleni #01b078 tylko 2,8:1.
export const FILLED_INK = "#000";
// Paski: kolor kategorii przy 42 % i 16 % krycia na tle karty #121317. Jasny
// tekst #f1f1f1 ma na ciemniejszym z nich co najmniej 7,8:1. Kolor tła na
// końcu, żeby linie podziałki nie prześwitywały przez blok.
export const STRIPED_INK = "#f1f1f1";
export const stripes = color =>
  `repeating-linear-gradient(135deg, ${color}6b 0 6px, ${color}29 6px 12px), #121317`;

export function blockLook(color, required) {
  return required
    ? { background: color, color: FILLED_INK, border: `1px solid ${color}` }
    : { background: stripes(color), color: STRIPED_INK, border: `1px solid ${color}` };
}

// Mała próbka wzoru — w legendzie i na przełączniku obok słowa.
export function Swatch({ color, required, size = 12 }) {
  return <span aria-hidden="true" style={{ width: size, height: size, borderRadius: 3, flexShrink: 0, display: "inline-block",
    ...blockLook(color, required) }} />;
}

export const DURATIONS = [15, 30, 45, 60, 90, 120];
// Zakres jak w bazie (habits.duration_min).
export const DURATION_MIN = 5, DURATION_MAX = 720;
export const fmtDuration = m => {
  if (m < 60) return `${m} min`;
  if (m % 60 === 0) return `${m / 60} h`;
  if (m % 30 === 0) return `${String(m / 60).replace(".", ",")} h`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
};

// Długość wpisana ręcznie: same minuty („75") albo godziny i minuty
// („1:15", „1h15", „1 h 15 min"), także ułamek godziny („1,5 h").
// Zwraca minuty albo null, gdy tekst nie jest długością z dozwolonego zakresu.
export function parseDuration(text) {
  const t = text.trim().toLowerCase().replace(",", ".");
  let m = null;
  let r;
  if ((r = /^(\d{1,3})\s*(min|m)?$/.exec(t))) m = +r[1];
  else if ((r = /^(\d{1,2})\s*(?::|h|godz\.?)\s*(\d{1,2})?\s*(min|m)?$/.exec(t))) m = +r[1] * 60 + (r[2] ? +r[2] : 0);
  else if ((r = /^(\d{1,2}\.\d{1,2})\s*(h|godz\.?)$/.exec(t))) m = Math.round(+r[1] * 60);
  return m != null && m >= DURATION_MIN && m <= DURATION_MAX ? m : null;
}

// Gotowe długości plus pole na dowolną. Wartość spoza listy (wpisana ręcznie
// albo ustawiona wcześniej) siedzi w polu, więc nie może zniknąć.
export function DurationChips({ value, onChange }) {
  const isMobile = useMedia(MOBILE);
  const [text, setText] = useState(DURATIONS.includes(value) ? "" : String(value));
  const parsed = text.trim() ? parseDuration(text) : null;
  const bad = text.trim() !== "" && parsed == null;
  const custom = text.trim() !== "" && !bad;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
      <div role="radiogroup" aria-label="Długość w planie dnia" style={{ display: "contents" }}>
        {DURATIONS.map(d => {
          const on = !custom && d === value;
          return (
            <button key={d} type="button" role="radio" aria-checked={on} onClick={() => { setText(""); onChange(d); }}
              style={{ minHeight: isMobile ? 40 : 30, padding: "0 10px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
                border: `1px solid ${on ? "#fff" : "#333"}`, background: on ? "#fff" : "#1a1a1a", color: on ? "#000" : INK.soft }}>
              {fmtDuration(d)}
            </button>
          );
        })}
      </div>
      {/* Pole na dowolną długość. Każda poprawna wartość od razu staje się
          wybraną; przy niepoprawnej zostaje poprzednia, a pole to pokazuje. */}
      <input type="text" inputMode="text" autoComplete="off" value={text} placeholder="inna, np. 75 lub 1:20"
        aria-label="Inna długość (minuty albo godziny:minuty)" aria-invalid={bad}
        onChange={e => {
          const v = e.target.value;
          setText(v);
          const m = parseDuration(v);
          if (m != null) onChange(m);
        }}
        style={{ width: 150, minHeight: isMobile ? 40 : 30, padding: "0 10px", borderRadius: 8, fontSize: isMobile ? 16 : 12,
          outline: "none", boxSizing: "border-box",
          border: `1px solid ${bad ? "#f87171" : custom ? "#fff" : "#333"}`,
          background: custom ? "#fff" : "#1a1a1a", color: custom ? "#000" : "#f1f1f1", fontWeight: custom ? 600 : 400 }} />
      {(custom || bad) && (
        <div style={{ flexBasis: "100%", fontSize: 11, color: bad ? "#f87171" : INK.muted }}>
          {bad ? `Wpisz od ${DURATION_MIN} min do ${DURATION_MAX / 60} h, np. 75, 1:20 albo 1,5 h.` : `= ${fmtDuration(parsed)}`}
        </div>
      )}
    </div>
  );
}

// Obowiązkowy | Opcjonalny — dwa przyciski z próbką wzoru.
export function RequiredSwitch({ value, onChange, color }) {
  const isMobile = useMedia(MOBILE);
  return (
    <div role="radiogroup" aria-label="Rodzaj nawyku" style={{ display: "flex", gap: 6 }}>
      {[[true, "Obowiązkowy"], [false, "Opcjonalny"]].map(([v, label]) => {
        const on = value === v;
        return (
          <button key={label} type="button" role="radio" aria-checked={on} onClick={() => onChange(v)}
            style={{ flex: 1, minHeight: isMobile ? 44 : 36, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "0 10px",
              border: `1px solid ${on ? color : "#333"}`, background: on ? "#222" : "transparent", color: on ? "#f1f1f1" : INK.soft }}>
            <Swatch color={color} required={v} size={14} />{label}
          </button>
        );
      })}
    </div>
  );
}

// Godzina + długość, zapisywane jednym „Zatwierdź" — w karcie nawyku
// i w szczegółach bloku planu dnia.
export function HabitTimeEditor({ habit, onSave, onClose, onRemove, stacked = false }) {
  const [dur, setDur] = useState(habit.durationMin || 30);
  return (
    <div>
      <div style={{ fontSize: 11, color: INK.muted, marginBottom: 6 }}>Długość w planie dnia</div>
      <DurationChips value={dur} onChange={setDur} />
      <div style={{ fontSize: 11, color: INK.muted, margin: "12px 0 6px" }}>Godzina rozpoczęcia</div>
      <TimePicker stacked={stacked} value={habit.reminderTime} onChange={t => onSave(t, dur)} onClose={onClose} onRemove={onRemove} />
    </div>
  );
}
