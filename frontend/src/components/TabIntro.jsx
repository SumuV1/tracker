import { INK, MONO } from "../lib/ui.js";

// Krótki opis pod paskiem zakładek — jeden wzór dla wszystkich zakładek:
// nadtytuł w kolorze zakładki i jedno, dwa zdania o tym, do czego służy.
// Wcześniej każda zakładka miała to po swojemu (Mięśnie z dużym tytułem,
// Nawyki i Kalorie wcale), więc przeskok między nimi wyglądał jak zmiana
// aplikacji.
export function TabIntro({ eyebrow, color, children }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.2em", color, fontWeight: 600, fontFamily: MONO, marginBottom: 6 }}>{eyebrow}</div>
      <div style={{ fontSize: 12, color: INK.soft, lineHeight: 1.6, maxWidth: 680, margin: "0 auto" }}>{children}</div>
    </div>
  );
}
