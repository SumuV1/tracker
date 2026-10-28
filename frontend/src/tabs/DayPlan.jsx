import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { CAT_BY_LABEL, CATEGORIES, INK, useFitHeight } from "../lib/ui.js";
import { useApp } from "../lib/appContext.js";
import { blockLook, Swatch, RequiredSwitch, HabitTimeEditor, fmtDuration } from "../components/habitTime.jsx";

// ── Plan dnia ─────────────────────────────────────────────────────────────
// Oś doby jak widok dnia w kalendarzu Google na Androidzie: 00:00 na górze,
// 23:59 na samym dole, podziałka po lewej, nawyk z godziną to blok od
// reminderTime przez durationMin minut. Pełny blok = obowiązkowy, paski =
// opcjonalny. Cienka czerwona linia to bieżąca godzina z urządzenia — biegnie
// przez bloki i kończy się na podziałce etykietą z dokładną godziną.

// 80 px na godzinę: kwadrans to 20 px, więc linie kwadransów nie zlewają się
// w szarą plamę, a 30-minutowy blok ma 40 px — dwie linijki tekstu.
const HOUR_PX = 80;
const PPM = HOUR_PX / 60;
const DAY_MIN = 24 * 60;
// Zapas nad 00:00 i pod 23:59, żeby etykiety skrajnych godzin nie były ucięte.
const PAD = 12;
const GUTTER = 54;
const AXIS_H = DAY_MIN * PPM + 2 * PAD;
const RED = "#f25c54"; // 5,7:1 na tle karty
const HOUR_LINE = "#3a3c44";
const QUARTER_LINE = "#26282e";

const y = min => PAD + min * PPM;
const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fmtMin = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
// Koniec bloku nie wychodzi za północ — plan obejmuje jedną dobę.
const endOf = h => Math.min(DAY_MIN, toMin(h.reminderTime) + (h.durationMin || 30));
const span = h => `${h.reminderTime}–${endOf(h) === DAY_MIN ? "23:59" : fmtMin(endOf(h))}`;

// Bloki nachodzące na siebie dzielą szerokość jak w kalendarzu: grupa
// zazębiających się bloków dostaje tyle kolumn, ile ma ich naraz najwięcej,
// a każdy blok ląduje w pierwszej wolnej.
function layoutBlocks(list) {
  const items = list.map(h => ({ h, start: toMin(h.reminderTime), end: endOf(h) }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  let group = [], cols = [], groupEnd = -1;
  const close = () => { for (const it of group) it.cols = cols.length; group = []; cols = []; };
  for (const it of items) {
    if (it.start >= groupEnd) close();
    let c = cols.findIndex(end => end <= it.start);
    if (c < 0) { c = cols.length; cols.push(0); }
    cols[c] = it.end; it.col = c;
    group.push(it); groupEnd = Math.max(groupEnd, it.end);
  }
  close();
  return items;
}

// Godzina z urządzenia, odświeżana co 30 s i od razu po powrocie do karty —
// telefon wybudzony po godzinie nie może pokazywać linii tam, gdzie zasnął.
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const t = setInterval(tick, 30000);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  return now;
}

const catOf = h => CAT_BY_LABEL[h.category] || CATEGORIES[0];

export default function DayPlan() {
  const { habits, isChecked, todayStr, isMobile } = useApp();
  const now = useNow();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [openId, setOpenId] = useState(null);
  const scrollRef = useRef(null);
  // Oś wypełnia ekran do dołu, ale nie mniej niż ~3/4 wysokości okna: na
  // telefonie nad osią stoją nagłówek, opis i przełącznik widoków, więc samo
  // „do dołu" dawało trzy godziny. Po przewinięciu strony oś zajmuje ekran.
  const height = useFitHeight(scrollRef, true, { min: Math.max(420, Math.round(window.innerHeight * 0.72)) });

  const timed = habits.filter(h => h.reminderTime);
  const untimed = habits.filter(h => !h.reminderTime);
  const blocks = layoutBlocks(timed);
  const open = habits.find(h => h.id === openId) || null;

  const count = req => {
    const l = habits.filter(h => h.required === req);
    return `${l.filter(h => isChecked(h.id, todayStr)).length}/${l.length}`;
  };

  // Przewinięcie do bieżącej godziny — raz, gdy znana jest wysokość okna osi.
  const scrollToNow = (smooth = false) => {
    const el = scrollRef.current; if (!el) return;
    el.scrollTo({ top: Math.max(0, y(nowMin) - el.clientHeight / 3), behavior: smooth ? "smooth" : "auto" });
  };
  const scrolled = useRef(false);
  useLayoutEffect(() => {
    if (scrolled.current || !height) return;
    scrolled.current = true; scrollToNow();
  }, [height]);

  const dateLabel = now.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ background: "#121317", border: "1px solid #1e1e1e", borderRadius: 14, overflow: "hidden" }}>

        {/* ── nagłówek: dzień, bilans, legenda ── */}
        <div style={{ padding: isMobile ? "12px 12px 10px" : "14px 16px 12px", borderBottom: "1px solid #1e1e1e" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: INK.muted, fontWeight: 700, letterSpacing: 1 }}>DZIŚ</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#f1f1f1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
              </div>
            </div>
            <button type="button" onClick={() => scrollToNow(true)}
              style={{ minHeight: isMobile ? 44 : 34, padding: "0 14px", borderRadius: 10, border: `1px solid ${RED}66`, background: "transparent",
                color: RED, fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
              Teraz {fmtMin(nowMin)}
            </button>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 12, color: INK.soft }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Swatch color="#aaaaaa" required /> Obowiązkowe <b style={{ color: "#f1f1f1", fontVariantNumeric: "tabular-nums" }}>{count(true)}</b>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Swatch color="#aaaaaa" required={false} /> Opcjonalne <b style={{ color: "#f1f1f1", fontVariantNumeric: "tabular-nums" }}>{count(false)}</b>
            </span>
          </div>
        </div>

        {/* ── nawyki bez godziny — jak wydarzenia całodniowe nad osią ── */}
        {untimed.length > 0 && (
          <div style={{ padding: isMobile ? "10px 12px" : "10px 16px", borderBottom: "1px solid #1e1e1e" }}>
            <div style={{ fontSize: 11, color: INK.muted, marginBottom: 6 }}>Bez godziny — tapnij, żeby ustawić</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {untimed.map(h => {
                const cat = catOf(h); const done = isChecked(h.id, todayStr);
                return (
                  <button key={h.id} type="button" onClick={() => setOpenId(h.id)}
                    aria-label={`${h.name}, bez godziny, ${h.required ? "obowiązkowy" : "opcjonalny"}${done ? ", zrobione" : ""}`}
                    style={{ ...blockLook(cat.color, h.required), minHeight: isMobile ? 40 : 32, maxWidth: "100%", borderRadius: 8,
                      padding: "0 10px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", opacity: done ? 0.55 : 1,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {done && "✓ "}{h.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── oś doby ── */}
        <div ref={scrollRef} style={{ height: height || 480, overflowY: "auto", position: "relative" }}>
          <div style={{ position: "relative", height: AXIS_H }}>
            {/* Linie: godzina wyraźnie, kwadrans słabiej. Sięgają do podziałki
                (krótka kreska po lewej), dalej biegną przez całe pole bloków. */}
            {Array.from({ length: 24 * 4 + 1 }, (_, i) => {
              const hour = i % 4 === 0;
              return (
                <div key={i} aria-hidden="true" style={{ position: "absolute", top: y(i * 15), right: 0, height: 1,
                  left: GUTTER - (hour ? 8 : 4), background: hour ? HOUR_LINE : QUARTER_LINE }} />
              );
            })}
            <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: GUTTER, width: 1, background: HOUR_LINE }} />

            {/* Podziałka godzin; 23:59 zamyka dobę na dolnej linii. */}
            {[...Array.from({ length: 24 }, (_, h) => [h * 60, `${String(h).padStart(2, "0")}:00`]), [DAY_MIN, "23:59"]].map(([m, label]) => {
              // Etykieta pod czerwoną godziną znika, zamiast prześwitywać spod niej.
              const hidden = Math.abs(m - nowMin) * PPM < 14;
              return (
                <div key={label} aria-hidden="true" style={{ position: "absolute", top: y(m), left: 0, width: GUTTER - 12, transform: "translateY(-50%)",
                  textAlign: "right", fontSize: 11, lineHeight: 1, color: INK.faint, fontVariantNumeric: "tabular-nums", visibility: hidden ? "hidden" : "visible" }}>
                  {label}
                </div>
              );
            })}

            {/* Bloki nawyków */}
            <div style={{ position: "absolute", top: 0, bottom: 0, left: GUTTER + 4, right: isMobile ? 6 : 10 }}>
              {blocks.map(({ h, start, end, col, cols }) => {
                const cat = catOf(h); const done = isChecked(h.id, todayStr);
                const hgt = Math.max(18, (end - start) * PPM - 2);
                const tall = hgt >= 36;
                return (
                  <button key={h.id} type="button" onClick={() => setOpenId(h.id)}
                    aria-label={`${h.name}, ${span(h)}, ${h.required ? "obowiązkowy" : "opcjonalny"}${done ? ", zrobione" : ""}`}
                    style={{ ...blockLook(cat.color, h.required), position: "absolute", top: y(start) + 1, height: hgt,
                      left: `calc(${(col / cols) * 100}% + 1px)`, width: `calc(${100 / cols}% - 2px)`,
                      borderRadius: 6, padding: tall ? "4px 7px" : "0 7px", textAlign: "left", cursor: "pointer", overflow: "hidden",
                      display: "flex", flexDirection: tall ? "column" : "row", alignItems: tall ? "stretch" : "center", gap: tall ? 1 : 6,
                      opacity: done ? 0.55 : 1, zIndex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      textDecoration: done ? "line-through" : "none", minWidth: 0 }}>{done && "✓ "}{h.name}</span>
                    <span style={{ fontSize: 11, lineHeight: 1.25, opacity: 0.85, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                      {tall ? span(h) : h.reminderTime}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bieżąca godzina: etykieta na podziałce, kropka na krawędzi osi
                i cienka linia przez całe pole bloków, ponad nimi. */}
            <div aria-label={`Teraz ${fmtMin(nowMin)}`} role="img"
              style={{ position: "absolute", top: y(nowMin + now.getSeconds() / 60), left: 0, right: 0, height: 0, zIndex: 3, pointerEvents: "none" }}>
              <span style={{ position: "absolute", left: 2, width: GUTTER - 8, top: 0, transform: "translateY(-50%)", textAlign: "center",
                background: "#121317", border: `1px solid ${RED}`, borderRadius: 6, padding: "2px 0", fontSize: 11, fontWeight: 700,
                color: RED, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{fmtMin(nowMin)}</span>
              <span style={{ position: "absolute", left: GUTTER - 6, right: 0, top: -0.5, height: 1, background: RED }} />
              <span style={{ position: "absolute", left: GUTTER - 4, top: -4, width: 9, height: 9, borderRadius: "50%", background: RED }} />
            </div>
          </div>
        </div>

        {habits.length > 0 && timed.length === 0 && (
          <div style={{ padding: "10px 16px 14px", fontSize: 12, color: INK.faint, borderTop: "1px solid #1e1e1e", lineHeight: 1.5 }}>
            Żaden nawyk nie ma jeszcze godziny. Tapnij nawyk nad osią albo ustaw 🕐 w widoku Nawyki — pojawi się tu jako blok.
          </div>
        )}
        {habits.length === 0 && (
          <div style={{ padding: "10px 16px 14px", fontSize: 12, color: INK.faint, borderTop: "1px solid #1e1e1e" }}>
            Brak nawyków — dodaj pierwszy w widoku Nawyki.
          </div>
        )}
      </div>

      {/* `key`: każdy nawyk dostaje świeży panel — bez tego stan edycji
          godziny przechodził z jednego bloku na drugi. */}
      {open && <BlockSheet key={open.id} habit={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

// Szczegóły bloku. Na telefonie panel od dołu z główną akcją (odhaczenie)
// pod kciukiem; na szerokim ekranie okno na środku.
function BlockSheet({ habit, onClose }) {
  const { isChecked, toggleHabit, todayStr, updateTime, updateRequired, isMobile } = useApp();
  const [editing, setEditing] = useState(!habit.reminderTime);
  const cat = catOf(habit);
  const done = isChecked(habit.id, todayStr);
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const save = (t, d) => { updateTime(habit.id, t, d); setEditing(false); };

  return (
    <div onClick={onClose} role="presentation"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 999, display: "flex",
        alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 20 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={habit.name}
        style={{ background: "#161616", borderRadius: isMobile ? "20px 20px 0 0" : 16, width: "100%", maxWidth: 520,
          maxHeight: isMobile ? "88vh" : "85vh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,.4)",
          padding: isMobile ? "18px 16px calc(16px + env(safe-area-inset-bottom))" : 22 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Swatch color={cat.color} required={habit.required} size={16} />
          <div style={{ flex: 1, minWidth: 0, marginTop: -2 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#f1f1f1", wordBreak: "break-word", lineHeight: 1.3 }}>{habit.name}</div>
            <div style={{ fontSize: 12.5, color: INK.soft, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
              {habit.reminderTime ? `${span(habit)} · ${fmtDuration(habit.durationMin || 30)}` : "Bez godziny"} · {cat.label}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: INK.muted, margin: "18px 0 6px" }}>Rodzaj</div>
        <RequiredSwitch value={habit.required} color={cat.color} onChange={v => v !== habit.required && updateRequired(habit.id, v)} />

        <div style={{ marginTop: 16 }}>
          {editing ? (
            <HabitTimeEditor habit={habit} stacked={!isMobile} onSave={save} onClose={() => setEditing(false)}
              onRemove={habit.reminderTime ? () => { updateTime(habit.id, ""); onClose(); } : null} />
          ) : (
            <button type="button" onClick={() => setEditing(true)}
              style={{ width: "100%", minHeight: 44, borderRadius: 10, border: "1px solid #333", background: "transparent",
                color: INK.soft, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              🕐 Zmień godzinę lub długość
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button type="button" onClick={() => toggleHabit(habit.id, todayStr)}
            style={{ flex: 1, minHeight: 48, borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700,
              background: done ? "#222" : cat.color, color: done ? "#ddd" : "#000" }}>
            {done ? "Odznacz" : "✓ Odhacz na dziś"}
          </button>
          <button type="button" onClick={onClose}
            style={{ minHeight: 48, padding: "0 18px", borderRadius: 12, border: "none", background: "#222", color: "#aaa",
              fontSize: 14, cursor: "pointer" }}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
