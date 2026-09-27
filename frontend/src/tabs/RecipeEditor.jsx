import { useState, useEffect, useRef } from "react";
import { MOBILE, useMedia, INK, MONO, NUTRIENT, kb } from "../lib/ui.js";
import { useApp } from "../lib/appContext.js";
import { api } from "../api.js";

// Kompozytor przepisu: z kilku produktów katalogu robi jedno danie z policzonymi
// kaloriami i makro. Liczby na ekranie są podglądem — wiążące są te, które
// policzy serwer przy zapisie, żeby istniało jedno miejsce prawdy.

const ACC = "#5DCAA5";
const num = v => Math.round(v * 100) / 100;

// Składniki mają wartości na 100 g. Suma to wkład każdego z nich, a wartości
// gotowego dania liczymy na jego wagę po przygotowaniu — gotowanie odparowuje
// wodę, więc suma gramów składników nie jest wagą tego, co ląduje na talerzu.
export function totals(items, yieldG) {
  const sum = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, saltG: 0 };
  let grams = 0;
  for (const it of items) {
    const g = Number(String(it.grams).replace(",", ".")) || 0;
    if (!(g > 0) || !it.food) continue;
    grams += g;
    for (const k of Object.keys(sum)) sum[k] += (Number(it.food[k]) || 0) * g / 100;
  }
  const served = yieldG || grams;
  const per100 = {};
  for (const k of Object.keys(sum)) per100[k] = served > 0 ? num(sum[k] * 100 / served) : 0;
  return { total: Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, num(v)])), per100, grams: num(grams), served: num(served) };
}

// minHeight 44: pole tekstowe to też cel dotyku. Przy fontSize 16 (poniżej
// którego iOS powiększa stronę) sam padding dawał 41–43 px.
const FIELD = {
  width: "100%", boxSizing: "border-box", minWidth: 0, minHeight: 44, background: "#0d0f16",
  border: "1px solid #2a2e3c", borderRadius: 9, padding: "10px 12px",
  color: "#f0f0f0", fontSize: 16, outline: "none",
};

// Wyszukiwarka składnika pyta serwer osobno, a nie korzysta z listy produktów
// w oknie obok: tamta jest zawężona frazą z tamtego pola i przepis
// przestawiałby ją użytkownikowi pod palcami.
function Picker({ onPick, onClose }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  useEffect(() => { box.current?.focus?.(); }, []);
  useEffect(() => {
    let żywy = true;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.foods({ q: q.trim() || undefined, limit: 40 });
        if (żywy) setRows(r.items);
      } catch { /* błąd pokaże się przy zapisie; tu tylko podpowiedzi */ }
      finally { if (żywy) setBusy(false); }
    }, 250);
    return () => { żywy = false; clearTimeout(t); };
  }, [q]);
  return (
    <div style={{ background: "#0d0f16", border: `1px solid ${ACC}55`, borderRadius: 11, padding: 11, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input ref={box} value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Szukaj składnika…"
          aria-label="Szukaj składnika" style={{ ...FIELD, flex: 1 }} />
        <button onClick={onClose} aria-label="Zamknij wybór składnika"
          style={{ flexShrink: 0, minWidth: 44, minHeight: 44, background: "#1a1a1a", border: "1px solid #2a2e3c", borderRadius: 9, color: INK.soft, fontSize: 16, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ maxHeight: 190, overflowY: "auto", border: "1px solid #1e2130", borderRadius: 9 }}>
        {busy && !rows.length && <div style={{ padding: 14, textAlign: "center", color: INK.muted, fontSize: 12 }}>Szukam…</div>}
        {!busy && !rows.length && <div style={{ padding: 14, textAlign: "center", color: INK.muted, fontSize: 12 }}>Nic nie pasuje.</div>}
        {rows.map(f => (
          <div key={f.id} {...kb(() => onPick(f))}
            style={{ padding: "11px 12px", minHeight: 44, boxSizing: "border-box", cursor: "pointer", borderBottom: "1px solid #161a24", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#e8e8e8", flex: 1, minWidth: 0 }}>{f.name}</span>
            <span style={{ fontSize: 11, color: NUTRIENT.kcal, fontFamily: MONO, flexShrink: 0 }}>{f.kcal} kcal</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RecipeEditor({ initial, onClose }) {
  const isMobile = useMedia(MOBILE);
  const { saveRecipe } = useApp();
  const [name, setName] = useState(initial?.name || "");
  const [yieldTxt, setYieldTxt] = useState(initial?.yieldG != null ? String(initial.yieldG).replace(".", ",") : "");
  // Składniki edytowanego przepisu przychodzą jako { foodId, grams, name, kcal } —
  // do podglądu makro potrzebne są pełne wartości, więc dociągamy je z katalogu.
  const [items, setItems] = useState(() => (initial?.items || []).map(i => ({ foodId: i.foodId, grams: String(i.grams).replace(".", ","), food: null, name: i.name })));
  const [picking, setPicking] = useState(!initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const brak = (initial?.items || []).map(i => i.foodId);
    if (!brak.length) return;
    let żywy = true;
    (async () => {
      try {
        const r = await api.foods({ limit: 500 });
        if (!żywy) return;
        const byId = new Map(r.items.map(f => [f.id, f]));
        setItems(l => l.map(it => ({ ...it, food: byId.get(it.foodId) || it.food })));
      } catch { /* podgląd makro zostanie pusty, zapis i tak liczy serwer */ }
    })();
    return () => { żywy = false; };
  }, [initial]);

  const yieldG = Number(yieldTxt.replace(",", ".")) || 0;
  const t = totals(items, yieldG);
  const gotowe = name.trim() && items.some(i => i.food && Number(String(i.grams).replace(",", ".")) > 0);

  const zapisz = async () => {
    setSaving(true); setErr("");
    const body = {
      name: name.trim(),
      yieldG: yieldG > 0 ? yieldG : undefined,
      items: items
        .map(i => ({ foodId: i.foodId, grams: Number(String(i.grams).replace(",", ".")) }))
        .filter(i => i.grams > 0),
    };
    const r = await saveRecipe(body, initial?.id);
    setSaving(false);
    if (r.ok) onClose(r.row); else setErr(r.error);
  };

  const wiersz = (label, val, unit, color) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 9.5, color: INK.soft, letterSpacing: "0.06em", fontFamily: MONO }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: MONO }}>{val}{unit}</div>
    </div>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label={initial ? "Edycja przepisu" : "Nowy przepis"}
      onClick={e => { if (e.target === e.currentTarget) onClose(null); }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.65)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 20 }}>
      <div style={{
        background: "#13161f", borderRadius: isMobile ? "20px 20px 0 0" : 16,
        padding: isMobile ? "18px 16px calc(18px + env(safe-area-inset-bottom))" : 22,
        width: "100%", maxWidth: 560, maxHeight: isMobile ? "90vh" : "88vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f0f0f0" }}>{initial ? "Edycja przepisu" : "Nowy przepis"}</h3>
          <button onClick={() => onClose(null)} aria-label="Zamknij"
            style={{ flexShrink: 0, width: 44, height: 44, background: "#1a1a1a", border: "none", borderRadius: 9, color: INK.soft, fontSize: 17, cursor: "pointer" }}>✕</button>
        </div>

        {err && (
          <div role="alert" style={{ background: "#2a0f0f", border: "1px solid #6b2020", borderRadius: 9, padding: "9px 11px", marginBottom: 11, color: "#f87171", fontSize: 12.5 }}>{err}</div>
        )}

        <label style={{ display: "block", fontSize: 11, color: INK.soft, marginBottom: 5 }}>Nazwa dania</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="np. Owsianka z bananem"
          aria-label="Nazwa dania" style={{ ...FIELD, marginBottom: 12 }} />

        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", fontFamily: MONO, color: ACC, marginBottom: 8 }}>
          SKŁADNIKI ({items.length})
        </div>

        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, minWidth: 0 }}>
            <div style={{ flex: "1 1 120px", minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "#e8e8e8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {it.food?.name || it.name || "—"}
              </div>
              {it.food && (
                <div style={{ fontSize: 10.5, color: INK.muted, fontFamily: MONO }}>
                  {num((it.food.kcal || 0) * (Number(String(it.grams).replace(",", ".")) || 0) / 100)} kcal
                </div>
              )}
            </div>
            <input value={it.grams} inputMode="decimal" aria-label={`Gramatura: ${it.food?.name || it.name || "składnik"}`}
              onChange={e => setItems(l => l.map((x, j) => j === i ? { ...x, grams: e.target.value } : x))}
              style={{ ...FIELD, width: 72, flexShrink: 0, textAlign: "right", fontFamily: MONO, padding: "9px 10px" }} />
            <span style={{ fontSize: 11, color: INK.soft, flexShrink: 0 }}>g</span>
            <button onClick={() => setItems(l => l.filter((_, j) => j !== i))} aria-label={`Usuń składnik: ${it.food?.name || it.name || ""}`}
              style={{ flexShrink: 0, width: 44, height: 44, background: "transparent", border: "1px solid #3a2020", borderRadius: 9, color: "#c96b6b", fontSize: 15, cursor: "pointer" }}>✕</button>
          </div>
        ))}

        {picking
          ? <Picker onClose={() => setPicking(false)} onPick={f => { setItems(l => [...l, { foodId: f.id, grams: "100", food: f }]); setPicking(false); }} />
          : (
            <button onClick={() => setPicking(true)}
              style={{ width: "100%", minHeight: 44, padding: "11px", borderRadius: 10, border: `2px dashed ${ACC}66`, background: "transparent", color: ACC, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 12 }}>
              ＋ Dodaj składnik
            </button>
          )}

        <label style={{ display: "block", fontSize: 11, color: INK.soft, marginBottom: 5 }}>
          Waga po przygotowaniu (opcjonalnie)
        </label>
        <input value={yieldTxt} onChange={e => setYieldTxt(e.target.value)} inputMode="decimal"
          placeholder={t.grams ? `${t.grams} — suma składników` : "w gramach"} aria-label="Waga po przygotowaniu w gramach"
          style={{ ...FIELD, marginBottom: 6 }} />
        <div style={{ fontSize: 10.5, color: INK.muted, lineHeight: 1.5, marginBottom: 14 }}>
          Gotowanie odparowuje wodę, więc gotowe danie waży mniej niż suma składników.
          Puste pole = liczę na sumę ({t.grams} g).
        </div>

        <div style={{ background: "#0d0f16", border: `1px solid ${ACC}33`, borderRadius: 11, padding: "12px 13px", marginBottom: 14 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", fontFamily: MONO, color: ACC, marginBottom: 9 }}>
            NA 100 G GOTOWEGO DANIA
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(62px,1fr))", gap: 9 }}>
            {wiersz("KCAL", t.per100.kcal, "", NUTRIENT.kcal)}
            {wiersz("BIAŁKO", t.per100.proteinG, " g", NUTRIENT.protein)}
            {wiersz("WĘGLE", t.per100.carbsG, " g", NUTRIENT.carbs)}
            {wiersz("TŁUSZCZ", t.per100.fatG, " g", NUTRIENT.fat)}
          </div>
          <div style={{ marginTop: 11, paddingTop: 10, borderTop: "1px solid #1e2130", fontSize: 11.5, color: "#9a9a9a", lineHeight: 1.55 }}>
            Całe danie ({t.served} g): <b style={{ color: NUTRIENT.kcal }}>{t.total.kcal} kcal</b>,
            B {t.total.proteinG} g · W {t.total.carbsG} g · T {t.total.fatG} g
          </div>
        </div>

        {/* Akcja główna na dole i na całą szerokość — tam sięga kciuk. */}
        <div style={{ display: "flex", gap: 9 }}>
          <button onClick={zapisz} disabled={!gotowe || saving}
            style={{ flex: 1, minHeight: 48, borderRadius: 10, border: "none", background: gotowe && !saving ? ACC : "#2a2e3c", color: gotowe && !saving ? "#06231a" : INK.soft, fontWeight: 700, fontSize: 14, cursor: gotowe && !saving ? "pointer" : "not-allowed" }}>
            {saving ? "Zapisuję…" : initial ? "💾 Zapisz zmiany" : "✅ Zapisz przepis"}
          </button>
          <button onClick={() => onClose(null)}
            style={{ flexShrink: 0, minHeight: 48, padding: "0 18px", borderRadius: 10, border: "1px solid #2a2e3c", background: "transparent", color: INK.soft, fontSize: 13.5, cursor: "pointer" }}>
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
}
