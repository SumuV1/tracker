import { useState, useEffect } from "react";

// ── RESPONSYWNOŚĆ ─────────────────────────────────────────────────────────
// Layout jest budowany na stylach inline, więc breakpointy bierzemy z JS
// przez matchMedia zamiast z arkusza CSS.
export const MOBILE = "(max-width: 640px)";
export const NARROW = "(max-width: 380px)";
// poniżej tej szerokości kolumny obok siebie robią się za ciasne
export const WIDE = "(min-width: 1000px)";
// cztery kafle kategorii obok siebie mają sens dopiero przy takiej szerokości
export const XWIDE = "(min-width: 1360px)";

export function useMedia(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = e => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export const CATEGORIES = [
  { label: "Zdrowie", color: "#4ade80", bg: "#052e16" },
  { label: "Praca", color: "#60a5fa", bg: "#0c1a3a" },
  { label: "Mindfulness", color: "#c084fc", bg: "#1a0a2e" },
  { label: "Osobiste", color: "#fb923c", bg: "#2e1200" },
];
export const DAY_LABELS = ["N","P","W","Ś","C","P","S"];
export const MONTHS_PL = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];
// Kolory tekstu wtórnego — jedyne dozwolone szarości na tekst, który niesie
// treść. Policzone (WCAG) na najjaśniejszym tle karty #161616: faint 5,2:1,
// muted 6,4:1, soft 7,8:1; na #2a2a2a (kratki miesiąca) wciąż ≥ 4,2 / 5,1 / 6,2.
// Wcześniej #555 dawało 2,4:1, a #444 1,9:1 — w słońcu nieczytelne.
// Hierarchia zostaje: faint < muted < soft. Ramki i tła mogą być ciemniejsze.
// Inter nigdy nie był ładowany (CSP nie dopuszcza zewnętrznych czcionek), więc
// nazwa była fikcją; system-ui daje natywny krój bez żadnego żądania.
export const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
export const MONO = "ui-monospace, Menlo, Consolas, monospace";
export const INK = { faint: "#8a8a8a", muted: "#9a9a9a", soft: "#aaaaaa" };

// Paleta składników odżywczych. Kolejność slotów jest zwalidowana skryptem
// walidatora dostępności (tryb ciemny, pary sąsiednie): najgorsza para
// bursztyn↔morski ma ΔE 8,4 przy protanopii, przy progu 8. Nie zmieniać
// kolorów ani ich kolejności bez ponownego uruchomienia walidatora.
export const NUTRIENT = {
  kcal:    "#3987e5",
  protein: "#199e70",
  carbs:   "#c98500",
  fat:     "#d55181",
  fiber:   "#008300",
  salt:    "#9085e9",
};

// Skala przekroczenia celu — wspólna dla pierścieni „Postępu dnia" i kalendarza
// kalorii. Wcześniej każdy z tych wykresów miał własne progi, więc czerwony
// znaczył w jednym 120 %, a w drugim 200 %. Bursztyn zaczyna się dokładnie tam,
// gdzie cel został osiągnięty; czerwień przy dwukrotności.
// `from` to jasna żółć, nie bursztyn: bursztyn #f59e0b miał ΔE 15,2 do koloru
// węgli (#c98500) i na tym samym pierścieniu zlewał się z nim w jedno.
// #facc15 daje ΔE 32,1 i kontrast 9,8:1 do toru.
export const OVER = { from: "#facc15", to: "#ef4444" };

// Od tego ułamka celu łuk zaczyna się ocieplać w stronę `OVER.from`. Bez tego
// kolor składnika przechodził w żółć skokiem dokładnie na 100 %. Próg jest ten
// sam, na którym kalendarz kalorii rozdziela pasma 50–85 % i 85–100 %.
export const WARM_FROM = 0.85;

// Mieszanie kolorów w OKLCH, po krótszym łuku barwy. Interpolacja w sRGB
// wygląda niewinnie, ale między odległymi barwami przechodzi PRZEZ SZAROŚĆ:
// niebieski #3987e5 zmieszany po połowie z żółcią #facc15 daje brudny beż,
// i na pierścieniu kalorii widać to jako szarawą wstęgę. W OKLCH ta sama para
// idzie przez turkus i zieleń — czyli tak, jak człowiek spodziewa się przejścia.
const srgbToLin = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const linToSrgb = v => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function toOklch(hex) {
  const [r, g, b] = [1, 3, 5].map(i => srgbToLin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

function fromOklch([L, C, h]) {
  const A = C * Math.cos(h), B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
  const rgb = [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
  return "#" + rgb.map(v => Math.round(Math.max(0, Math.min(1, linToSrgb(v))) * 255)
    .toString(16).padStart(2, "0")).join("");
}

export const mixHex = (a, b, t) => {
  const u = Math.max(0, Math.min(1, t));
  const [A, B] = [toOklch(a), toOklch(b)];
  // Barwa po krótszej stronie koła; kolor bez nasycenia nie ma własnej barwy,
  // więc przejmuje barwę drugiego — inaczej szarość ciągnęłaby gradient w bok.
  let hA = A[2], hB = B[2];
  if (A[1] < 1e-4) hA = hB;
  if (B[1] < 1e-4) hB = hA;
  let d = hB - hA;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return fromOklch([A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, hA + d * u]);
};

export const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
export const MINUTES = ["00","15","30","45"];
export const TILE = 36;

// Data LOKALNA, nie UTC. `toISOString()` cofa dzień o jeden na wschód od
// Greenwich przy każdej dacie z północy lokalnej — w Polsce wrzesień zaczynał
// się od 31 sierpnia, a strzałka „następny dzień" stała w miejscu. Na serwerze
// (UTC) tego nie widać, dlatego przeszło przez wszystkie testy.
export const toISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const today = () => toISO(new Date());
export const getLast7 = () => { const a=[]; for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);a.push(toISO(d));} return a; };
export const getDaysInMonth = (y,m) => { const a=[],d=new Date(y,m,1); while(d.getMonth()===m){a.push(toISO(d));d.setDate(d.getDate()+1);} return a; };
export const getDaysInYear = y => { const a=[],d=new Date(y,0,1); while(d.getFullYear()===y){a.push(toISO(d));d.setDate(d.getDate()+1);} return a; };

// Katalog produktów żyje w tabeli foods (baza wbudowana + własne + Open Food Facts).

export function getBMILabel(bmi){
  if(bmi<18.5)return{label:"Niedowaga",color:"#3b82f6"};
  if(bmi<25)return{label:"Norma",color:"#22c55e"};
  if(bmi<30)return{label:"Nadwaga",color:"#f59e0b"};
  return{label:"Otyłość",color:"#ef4444"};
}
// Skala ACE do procentu tkanki tłuszczowej. Kategorię wybiera serwer — tutaj
// leżą wyłącznie zakresy i kolory legendy, tak samo jak przy poziomach
// aktywności. Progi są orientacyjne, nie diagnostyczne.
export const BF_SCALE = {
  M: [["Tłuszcz niezbędny","2–5 %","#3b82f6"],["Sportowcy","6–13 %","#22c55e"],
      ["Fitness","14–17 %","#a3e635"],["Akceptowalny","18–24 %","#f59e0b"],["Otyłość","≥ 25 %","#ef4444"]],
  F: [["Tłuszcz niezbędny","10–13 %","#3b82f6"],["Sportowcy","14–20 %","#22c55e"],
      ["Fitness","21–24 %","#a3e635"],["Akceptowalny","25–31 %","#f59e0b"],["Otyłość","≥ 32 %","#ef4444"]],
};
export const bfColor=(sex,category)=>(BF_SCALE[sex]||BF_SCALE.M).find(([l])=>l===category)?.[2]||"#888";

// Etykiety poziomów aktywności. Same współczynniki i wzory należą do serwera —
// tutaj są tylko po to, żeby opisać pozycje listy wyboru.
export const ACTIVITY = [
  {factor:1.2,   label:"siedzący",             option:"🛋️ Siedzący"},
  {factor:1.375, label:"lekko aktywny",        option:"🚶 Lekko aktywny (1-3 dni/tydz.)"},
  {factor:1.55,  label:"umiarkowanie aktywny", option:"🏃 Umiarkowanie aktywny (3-5 dni/tydz.)"},
  {factor:1.725, label:"bardzo aktywny",       option:"💪 Bardzo aktywny (6-7 dni/tydz.)"},
  {factor:1.9,   label:"ekstremalnie aktywny", option:"🏋️ Ekstremalnie aktywny"},
];


// Klikany `div` dostępny z klawiatury: rola, fokus, Enter/Spacja. Bez tego
// kratek miesiąca ani wiersza produktu nie dało się użyć bez myszy.
export const kb=onClick=>({role:"button",tabIndex:0,onClick,
  onKeyDown:e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onClick(e);}}});


// Przyjmuje datę „RRRR-MM-DD" i pełny znacznik czasu — check-iny mają godzinę.
// Sama data NIE przechodzi przez `new Date`: parsowałaby się jako północ UTC
// i na zachód od Greenwich cofała o dzień. Znacznik czasu przeciwnie — ma
// pokazać dzień lokalny, więc musi.
export const plDate = iso => {
  const str = String(iso);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) { const [y, m, d] = str.split("-"); return `${d}.${m}.${y}`; }
  const d = new Date(str);
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
};
export const plTime = iso => { const d = new Date(iso); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };
