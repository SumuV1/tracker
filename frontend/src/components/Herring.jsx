import { useId } from "react";

// Śledź z ikony aplikacji (public/favicon.svg) bez ciemnego tła, do wstawiania
// w tekst. Emotki nie wystarczą: Unicode nie ma śledzia, a 🐟/🐠 to ryby
// ogólne i tropikalne. Rozmiar idzie za czcionką otoczenia (1em wysokości).
// `flip` odwraca rybę pyskiem w prawo — para po bokach tytułu patrzy na napis.
// Identyfikatory gradientów z useId, bo dwa śledzie na stronie inaczej
// dzieliłyby jeden `#body` i drugi brałby gradient pierwszego.
export function Herring({ flip = false, style }) {
  const id = useId().replace(/:/g, "");
  const body = `${id}-body`, fin = `${id}-fin`;
  return (
    <svg viewBox="3 13 55 37" aria-hidden="true" focusable="false"
      style={{ height: "1em", width: "1.49em", flexShrink: 0, transform: flip ? "scaleX(-1)" : undefined, ...style }}>
      <defs>
        <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#35617f" />
          <stop offset="34%" stopColor="#7fa8c2" />
          <stop offset="54%" stopColor="#e6edf1" />
          <stop offset="78%" stopColor="#c2ced6" />
          <stop offset="100%" stopColor="#93a4ae" />
        </linearGradient>
        <linearGradient id={fin} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5b87a5" />
          <stop offset="100%" stopColor="#3d6884" />
        </linearGradient>
      </defs>
      <path d="M25 26 L33 15 L37 27 Z" fill={`url(#${fin})`} />
      <path d="M27 39 L32 48 L37 39 Z" fill={`url(#${fin})`} />
      <path d="M4 32 Q10 24 17 22 Q26 19 34 21 Q42 24 45.5 29 L57 20 L52.5 32 L57 44 L45.5 35 Q42 40 34 43 Q26 45 17 42 Q10 40 4 32 Z"
        fill={`url(#${body})`} />
      <path d="M16.5 23.5 Q20 32 16.5 40.5" fill="none" stroke="#4f7692" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <path d="M20 31.5 Q33 30.5 45 31" fill="none" stroke="#7f9cad" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
      <circle cx="12.6" cy="29.6" r="3.1" fill="#f4f8fa" />
      <circle cx="12.6" cy="29.6" r="1.8" fill="#101f28" />
      <circle cx="11.8" cy="28.8" r="0.65" fill="#ffffff" />
    </svg>
  );
}
