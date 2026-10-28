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
export const fmtDuration = m => (m < 60 ? `${m} min` : m % 60 ? `${String(m / 60).replace(".", ",")} h` : `${m / 60} h`);

export function DurationChips({ value, onChange }) {
  const isMobile = useMedia(MOBILE);
  // Wartość spoza listy (ustawiona inaczej niż z tego wyboru) nie może zniknąć.
  const opts = DURATIONS.includes(value) ? DURATIONS : [...DURATIONS, value].sort((a, b) => a - b);
  return (
    <div role="radiogroup" aria-label="Długość w planie dnia" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {opts.map(d => {
        const on = d === value;
        return (
          <button key={d} type="button" role="radio" aria-checked={on} onClick={() => onChange(d)}
            style={{ minHeight: isMobile ? 40 : 30, padding: "0 10px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
              border: `1px solid ${on ? "#fff" : "#333"}`, background: on ? "#fff" : "#1a1a1a", color: on ? "#000" : INK.soft }}>
            {fmtDuration(d)}
          </button>
        );
      })}
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
