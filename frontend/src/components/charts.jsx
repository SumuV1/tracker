import { useState, useEffect, useRef } from "react";
import { NUTRIENT, INK, plDate, OVER, WARM_FROM, mixHex } from "../lib/ui.js";


// Pierścienie postępu: jedna wartość względem dziennego celu, osobno dla każdego
// składnika. To nie jest wykres kołowy w sensie "części całości" — składniki nie
// sumują się do wspólnej całości, więc każdy dostaje własny wskaźnik.
// Nazwa i liczby są zawsze wypisane tekstem: kolor wyłącznie wzmacnia odczyt,
// nigdy nie jest jedynym nośnikiem informacji.
// Przekroczenie celu nie zmienia koloru całego łuku — dokłada kolejne okrążenie
// na wierzchu, tak jak pierścienie w zegarku. Kolor nadwyżki przechodzi płynnie
// przez skalę `OVER` z lib/ui.js, tę samą, którą kalendarz kalorii oznacza
// 100–120 % i powyżej: bursztyn tam, gdzie cel właśnie padł, czerwień przy
// dwukrotności. Powyżej 200 % kolejne okrążenie jest już całe czerwone.
//
// SVG nie ma gradientu stożkowego, a liniowy biegnie wzdłuż prostej, nie wzdłuż
// okręgu — więc łuk nadwyżki składamy z krótkich segmentów o interpolowanym
// kolorze. Każdy rysujemy tym samym okręgiem, wycinając kawałek przez
// `strokeDasharray` + `strokeDashoffset`.
const SEG_PER_LAP = 36;        // 10° na segment — na 96 px gładko, a to 36 węzłów

// Kolor łuku w punkcie `p` (ułamek celu). Jedna ciągła droga: kolor składnika →
// żółć → czerwień, bez skoku na żadnej granicy.
//   do 85 %   — czysty kolor składnika
//   85–100 %  — przejście do OVER.from
//   100–200 % — dalej do OVER.to
//   powyżej   — już czerwień
export const kolorLuku = (p, base) =>
  p <= WARM_FROM ? base
  : p <= 1 ? mixHex(base, OVER.from, (p - WARM_FROM) / (1 - WARM_FROM))
  : mixHex(OVER.from, OVER.to, Math.min(p - 1, 1));

function segmenty(od, doFrac){
  const dlugosc = doFrac - od;
  if (dlugosc <= 0) return [];
  const n = Math.max(1, Math.ceil(dlugosc * SEG_PER_LAP));
  // Segmenty zachodzą na siebie o ułamek, inaczej między nimi prześwitywałby tor.
  const zapas = dlugosc / n * 0.35;
  return Array.from({ length: n }, (_, i) => {
    const a = od + dlugosc * i / n;
    const b = od + dlugosc * (i + 1) / n;
    // Kolor bierzemy ze środka segmentu, licząc pozycję w obrębie nadwyżki.
    return { start: a, len: (b - a) + (i < n - 1 ? zapas : 0), t: (a + b) / 2 };
  });
}

export function Ring({value,target,unit,label,icon,color,size=104,limit=false}){
  const r=(size-14)/2, C=2*Math.PI*r;
  const frac=target?value/target:null;
  const pct=frac!==null?Math.round(frac*100):null;
  const over=pct!==null&&pct>100;
  const nadwyzka=frac===null?0:Math.max(frac-1,0);
  const zimny=frac===null?0:Math.min(frac,WARM_FROM);
  // Kolor, w którym nadwyżka się kończy — służy też podpisowi pod pierścieniem.
  const overColor=mixHex(OVER.from,OVER.to,nadwyzka);
  const fmt=v=>Number.isInteger(v)?v:Math.round(v*10)/10;
  return(
    // minWidth:0 — jako element siatki pierścień nie może narzucać jej
    // szerokości SVG (96 px), bo trzy obok siebie nie mieszczą się na 320 px.
    <div style={{textAlign:"center",minWidth:0}}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{width:"100%",maxWidth:size,display:"block",margin:"0 auto"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#26262b" strokeWidth="9"/>
        {/* okrążenie 1, odcinek chłodny: do 85 % celu czysty kolor składnika */}
        {zimny>0&&(
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="9"
            strokeLinecap={frac>WARM_FROM?"butt":"round"} strokeDasharray={`${zimny*C} ${C}`}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{transition:"stroke-dasharray 0.45s ease"}}/>
        )}
        {/* okrążenie 1, odcinek ciepły: 85–100 %, kolor składnika wchodzi w żółć */}
        {segmenty(WARM_FROM,Math.min(frac??0,1)).map((sg,i,a)=>(
          <circle key={"w"+i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={kolorLuku(sg.t,color)} strokeWidth="9"
            strokeLinecap={i===a.length-1&&frac<1?"round":"butt"}
            strokeDasharray={`${sg.len*C} ${C}`} strokeDashoffset={-sg.start*C}
            transform={`rotate(-90 ${size/2} ${size/2})`}/>
        ))}
        {/* okrążenie 2: nadwyżka 100–200 %, żółć → czerwień */}
        {segmenty(0,Math.min(nadwyzka,1)).map((sg,i,a)=>(
          <circle key={"o"+i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={kolorLuku(1+sg.t,color)} strokeWidth="9"
            strokeLinecap={i===a.length-1&&nadwyzka<1?"round":"butt"}
            strokeDasharray={`${sg.len*C} ${C}`} strokeDashoffset={-sg.start*C}
            transform={`rotate(-90 ${size/2} ${size/2})`}/>
        ))}
        {/* okrążenie 3: powyżej 200 % — już bez gradientu, skala się skończyła */}
        {nadwyzka>1&&(
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={OVER.to} strokeWidth="9"
            strokeLinecap={nadwyzka-1>=1?"butt":"round"}
            strokeDasharray={`${Math.min(nadwyzka-1,1)*C} ${C}`}
            transform={`rotate(-90 ${size/2} ${size/2})`}/>
        )}
        <text x={size/2} y={size/2-1} textAnchor="middle" dominantBaseline="middle"
          fill="#f1f1f1" fontSize={size/4.2} fontWeight="700" fontFamily="inherit">
          {pct!==null?`${pct}%`:"—"}
        </text>
        <text x={size/2} y={size/2+size/6} textAnchor="middle" dominantBaseline="middle"
          fill={INK.soft} fontSize={size/9} fontFamily="inherit">{icon} {label}</text>
      </svg>
      <div style={{fontSize:11.5,color:"#999",marginTop:6,lineHeight:1.4}}>
        <span style={{color:"#f1f1f1",fontWeight:700}}>{fmt(value)}</span>
        {target?<span style={{color:INK.soft}}> / {target} {unit}</span>:<span style={{color:INK.soft}}> {unit}</span>}
      </div>
      {/* Kolor nie może być jedynym nośnikiem informacji — obok zawsze liczba
          i słowo. „Limit" (sól) kontra „cel" zostaje, bo przekroczenie limitu
          znaczy co innego niż przekroczenie celu. */}
      {over&&(
        <div style={{fontSize:10,color:overColor,fontWeight:600,marginTop:2}}>
          +{pct-100}% ponad {limit?"limit":"cel"}
        </div>
      )}
    </div>
  );
}

export function NutrientRings({totals,targets}){
  // Piramida: kalorie na szczycie, pod nimi dwa główne makroskładniki,
  // na dole pozostałe trzy. Wszystkie pierścienie poza kaloriami mają jeden
  // rozmiar, więc rzędy pozostają symetryczne niezależnie od wartości.
  const row2=[
    {key:"p", icon:"💪", label:"Białko", val:totals.p, target:targets?.proteinG, color:NUTRIENT.protein},
    {key:"c", icon:"🌾", label:"Węgle",  val:totals.c, target:targets?.carbsG,   color:NUTRIENT.carbs},
  ];
  const row3=[
    {key:"f",  icon:"🥑", label:"Tłuszcz", val:totals.f,  target:targets?.fatG,   color:NUTRIENT.fat},
    {key:"fb", icon:"🌿", label:"Błonnik", val:totals.fb, target:targets?.fiberG, color:NUTRIENT.fiber},
    {key:"s",  icon:"🧂", label:"Sól",     val:totals.s,  target:targets?.saltG,  color:NUTRIENT.salt, limit:true},
  ];
  const cell=m=>(
    <Ring key={m.key} value={m.val} target={m.target} unit="g"
      label={m.label} icon={m.icon} color={m.color} limit={m.limit} size={96}/>
  );
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16,alignItems:"center"}}>
      <Ring value={Math.round(totals.cal)} target={targets?.kcal} unit="kcal"
        label="Kalorie" icon="🔥" color={NUTRIENT.kcal} size={150}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,width:"100%"}}>
        {row2.map(cell)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,width:"100%"}}>
        {row3.map(cell)}
      </div>
      {!targets&&(
        <div style={{fontSize:11,color:INK.soft,lineHeight:1.5,textAlign:"center"}}>
          Uzupełnij profil w zakładce „BMI & Profil", żeby zobaczyć dzienne cele.
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
//  WYKRES POMIARÓW
// ══════════════════════════════════════════════════════════════════
// Jedna seria na raz — nigdy dwie osie Y. Przełącznik zmienia mierzoną
// wielkość, a nie dokłada drugiej skali do tej samej ramki.
// Kolor serii dobrany walidatorem dostępności (tryb ciemny): przechodzi pasmo
// jasności, próg nasycenia i kontrast do tła, a od najbliższego koloru obecnego
// na tej zakładce dzieli go ΔE 16,5 — nie da się go pomylić z makroskładnikiem.
export const SERIES = "#8d4fbc";
export const AXIS_INK = "#8a8a8a";   // 5,3:1 na tle karty — czytelne, nie krzyczy
export const GRID = "#242424";       // jeden odcień od powierzchni, linia ciągła

export const METRICS = {
  weightKg:   { label: "Waga",              unit: "kg", digits: 1 },
  bodyFatPct: { label: "Tkanka tłuszczowa", unit: "%",  digits: 1 },
  waistCm:    { label: "Talia",             unit: "cm", digits: 1 },
  intensity:  { label: "Natężenie",         unit: "/5", digits: 0 },
  maxLoad:    { label: "Maks. ciężar",      unit: "kg", digits: 1 },
};

// `domain` przypina oś Y do stałego zakresu (skala 1–5 nie ma się „dopasowywać"
// do danych); `labelOf` dokłada do dymka opis punktu; `showDelta` wyłącza
// nagłówek „+0,4 od 14.06", który dla check-inów nic nie znaczy.
export function MeasurementChart({ rows, metric, isMobile, color = SERIES, domain = null, labelOf = null, showDelta = true, noun = "pomiar" }) {
  const [hover, setHover] = useState(null);
  const m = METRICS[metric];
  const pts = rows.filter(r => r[metric] != null).map(r => ({ day: r.day, v: r[metric], row: r }));

  if (pts.length < 2) {
    return (
      <div style={{ padding: "34px 16px", textAlign: "center", color: INK.muted, fontSize: 12.5, lineHeight: 1.6 }}>
        {pts.length === 0
          ? <>Brak danych tej wielkości.</>
          : <>Jeden {noun} to jeszcze nie trend.<br />Wykres pojawi się przy drugim.</>}
      </div>
    );
  }

  // Szerokość z pomiaru kontenera. Sztywne 380 na karcie mającej 306 px w środku
  // skalowało podpisy osi do 8 px — czcionki w viewBoxie są w pikselach tylko
  // wtedy, gdy viewBox ma tyle jednostek, ile kontener pikseli.
  const boxRef = useRef(null);
  const [measured, setMeasured] = useState(0);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(en => setMeasured(Math.round(en[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = measured || (isMobile ? 306 : 720), H = isMobile ? 240 : 300;
  const PAD = { t: 18, r: 16, b: 34, l: isMobile ? 38 : 46 };
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;

  // Oś Y nie zaczyna się od zera: przy wadze zero jest poza sensem pomiaru,
  // a zakres 0–90 kg schowałby całą zmianę w grubości linii.
  const vs = pts.map(p => p.v);
  let lo, hi, step;
  if (domain) {
    [lo, hi] = domain; step = niceStep((hi - lo) / 4);
  } else {
    lo = Math.min(...vs); hi = Math.max(...vs);
    const span = hi - lo || Math.max(1, hi * 0.02);
    lo -= span * 0.15; hi += span * 0.15;
    step = niceStep((hi - lo) / 4);
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  }
  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(+v.toFixed(6));

  const t0 = new Date(pts[0].day).getTime();
  const t1 = new Date(pts[pts.length - 1].day).getTime();
  const spanT = t1 - t0 || 1;
  const x = p => PAD.l + ((new Date(p.day).getTime() - t0) / spanT) * iw;
  const y = v => PAD.t + ih - ((v - lo) / (hi - lo)) * ih;

  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts[pts.length - 1]).toFixed(1)},${(PAD.t + ih).toFixed(1)} L${x(pts[0]).toFixed(1)},${(PAD.t + ih).toFixed(1)} Z`;

  // Podpisów dat tyle, ile się zmieści bez nachodzenia — reszta jest w tabeli
  // pod wykresem i w dymku.
  const maxLabels = isMobile ? 3 : 5;
  const spread = pts.length <= maxLabels
    ? pts.map((_, i) => i)
    : Array.from({ length: maxLabels }, (_, i) => Math.round((i * (pts.length - 1)) / (maxLabels - 1)));
  // Punkty bywają zbite w czasie (dwa ważenia w jednym tygodniu), a podpisy
  // stoją tam, gdzie punkt — więc te, które by na siebie nachodziły, odpadają.
  const MIN_GAP = isMobile ? 96 : 84;
  const labelIdx = spread.filter((idx, k) => k === 0 || x(pts[idx]) - x(pts[spread[k - 1]]) >= MIN_GAP);

  const last = pts[pts.length - 1];
  const first = pts[0];
  const delta = last.v - first.v;
  const fmt = v => v.toFixed(m.digits).replace(".", ",");
  // Podziałka co najmniej jednostkowa nie potrzebuje miejsca po przecinku —
  // „88" zamiast „88,0" odchudza oś, a dokładność i tak jest w dymku i tabeli.
  const fmtTick = v => (step < 1 ? v.toFixed(1) : v.toFixed(0)).replace(".", ",");
  const hp = hover != null ? pts[hover] : null;

  const pick = e => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0, bd = Infinity;
    pts.forEach((p, i) => { const d = Math.abs(x(p) - px); if (d < bd) { bd = d; best = i; } });
    setHover(best);
  };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      {showDelta && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 2 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#f1f1f1" }}>{fmt(last.v)} <span style={{ fontSize: 13, color: AXIS_INK, fontWeight: 600 }}>{m.unit}</span></span>
          <span style={{ fontSize: 12, color: delta === 0 ? AXIS_INK : delta < 0 ? "#4ade80" : "#e8a54b" }}>
            {delta > 0 ? "+" : ""}{fmt(delta)} {m.unit} od {plDate(first.day)}
          </span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", overflow: "visible" }}
        onMouseMove={pick} onMouseLeave={() => setHover(null)} onTouchStart={pick} onTouchMove={pick}>
        <defs>
          <linearGradient id={`mchart-fill-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
            <text x={PAD.l - 7} y={y(t) + 3.5} textAnchor="end" fill={AXIS_INK}
              style={{ fontSize: 10.5, fontVariantNumeric: "tabular-nums" }}>{fmtTick(t)}</text>
          </g>
        ))}

        <path d={area} fill={`url(#mchart-fill-${color.slice(1)})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {pts.map((p, i) => (
          <circle key={p.day} cx={x(p)} cy={y(p.v)} r={hover === i ? 5 : 4}
            fill={color} stroke="#161616" strokeWidth="2" />
        ))}

        {hp && (
          <line x1={x(hp)} x2={x(hp)} y1={PAD.t} y2={PAD.t + ih} stroke={color} strokeWidth="1" strokeOpacity="0.5" />
        )}

        {labelIdx.map(i => (
          <text key={i} x={Math.min(Math.max(x(pts[i]), PAD.l + 26), W - PAD.r - 26)} y={H - 12}
            textAnchor="middle" fill={AXIS_INK} style={{ fontSize: 10, fontVariantNumeric: "tabular-nums" }}>
            {plDate(pts[i].day)}
          </text>
        ))}
      </svg>

      {hp && (
        <div style={{
          position: "absolute", top: 30, left: `${(x(hp) / W) * 100}%`,
          transform: `translateX(${x(hp) > W * 0.6 ? "-100%" : "0"})`, pointerEvents: "none",
          background: "#0a0a0a", border: `1px solid ${color}66`, borderRadius: 8, padding: "6px 10px",
          fontSize: 11.5, color: "#e8e8e8", whiteSpace: "nowrap", zIndex: 3,
        }}>
          <div style={{ color: AXIS_INK, fontVariantNumeric: "tabular-nums" }}>{plDate(hp.day)}</div>
          <div style={{ fontWeight: 700 }}>{fmt(hp.v)} {m.unit}</div>
          {labelOf && <div style={{ color: AXIS_INK, marginTop: 2 }}>{labelOf(hp.row)}</div>}
        </div>
      )}
    </div>
  );
}

// Krok osi z ładnej rodziny 1/2/5×10ⁿ — inaczej podpisy wychodzą typu 0,37.
export function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6))));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}


// ── Sześciokąt kategorii nawyków ──────────────────────────────────────────
// Sześć kategorii jako sześć wycinków jednego sześciokąta: wycinek rośnie od
// środka do krawędzi w miarę odhaczania dzisiejszych nawyków, więc komplet na
// dziś domyka pełną figurę. To zastąpiło sześć kafli obok siebie — na telefonie
// zmieściłyby się tylko jeden pod drugim, a wtedy nie widać całości naraz.
//
// Sześciokąt jest PŁASKOSZCZYTOWY (wierzchołki po lewej i prawej, płaskie
// krawędzie u góry i u dołu): szerokość to 2R, wysokość 1,73R, czyli figura
// wykorzystuje szerokość telefonu, a nie jego wysokość.
const HEX_R0 = 0.36;           // wewnętrzny promień — tu zaczynają się wycinki
const HEX_GAP = 1.6;           // odstęp między wycinkami w stopniach
const HEX_PAD = 3;             // zapas w viewBoxie na obrys wycinka
const HEX_LUZ = 6;             // odstęp koła ze statystyką od podstaw wycinków

export function HabitHex({ stats, selected, onSelect, size = 300 }) {
  // Figura mieści się w viewBoxie z zapasem HEX_PAD: przy R = size/2 skrajne
  // wierzchołki leżały dokładnie na krawędzi, więc obrys (do 2 px) wychodził
  // poza kadr i był obcinany przez kontener.
  const R = size / 2 - HEX_PAD;
  // Narożniki wycinków leżą na OKRĘGU o promieniu R, nie na prostych bokach
  // sześciokąta — przez odstęp kątowy wypadają o kawałek wyżej niż wierzchołki
  // (sin 118,4° = 0,880 wobec sin 120° = 0,866). Wysokość kadru liczymy więc
  // z faktycznego zasięgu, inaczej zapas u góry i u dołu schodzi do 0,9 px
  // i obrys zaznaczonego wycinka jest obcinany.
  const SIN_MAX = Math.sin((120 - HEX_GAP) * Math.PI / 180);
  const cx = size / 2, cy = HEX_PAD + R * SIN_MAX;
  const pt = (deg, r) => {
    const a = deg * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const f = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;
  // Wycinek i: od kąta -120+i*60 do -60+i*60, czyli pierwszy siedzi na górnej
  // krawędzi, a kolejne idą zgodnie z ruchem wskazówek zegara.
  //
  // Podstawa wycinka jest ŁUKIEM współśrodkowym z kołem w środku, nie cięciwą.
  // Cięciwa w najbliższym punkcie schodzi do r₀·cos30° = 0,87·r₀, więc koło
  // ze statystyką wchodziło w podstawy wycinków, choć jego promień był mniejszy
  // od r₀. Łuk daje wszędzie ten sam odstęp (HEX_LUZ).
  //
  // Wypełnienie liczone po POLU, nie po promieniu: wycinek rozszerza się ku
  // krawędzi, więc pole rośnie z kwadratem promienia. Przy prostym r₀+(R−r₀)·f
  // połowa odhaczonych zajmowałaby trzy czwarte wycinka i rysunek kłamałby na
  // korzyść.
  const wedge = (i, frac) => {
    const a1 = -120 + i * 60 + HEX_GAP, a2 = -60 + i * 60 - HEX_GAP;
    const r0 = R * HEX_R0, r1 = Math.sqrt(r0 * r0 + (R * R - r0 * r0) * frac);
    return `M ${f(pt(a1, r0))} L ${f(pt(a1, r1))} L ${f(pt(a2, r1))} L ${f(pt(a2, r0))}`
         + ` A ${r0.toFixed(1)} ${r0.toFixed(1)} 0 0 0 ${f(pt(a1, r0))} Z`;
  };
  const suma = stats.reduce((a, s) => ({ done: a.done + s.done, total: a.total + s.total }), { done: 0, total: 0 });
  const rIkony = R * (HEX_R0 + 1) / 2;
  const rKola = R * HEX_R0 - HEX_LUZ;
  return (
    <svg viewBox={`0 0 ${size} ${(2 * R * SIN_MAX + HEX_PAD * 2).toFixed(1)}`} width="100%"
      style={{ display: "block", maxWidth: size, margin: "0 auto" }}
      role="group" aria-label="Sześć kategorii nawyków — dzisiejsze odhaczenia">
      {stats.map((s, i) => {
        const frac = s.total ? s.done / s.total : 0;
        const dim = selected && selected !== s.cat.label;
        const [ix, iy] = pt(-90 + i * 60, rIkony);
        return (
          <g key={s.cat.label} onClick={() => onSelect(selected === s.cat.label ? null : s.cat.label)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(selected === s.cat.label ? null : s.cat.label); } }}
            role="button" tabIndex={0} style={{ cursor: "pointer", opacity: dim ? 0.4 : 1 }}
            aria-pressed={selected === s.cat.label}
            aria-label={`${s.cat.label}: ${s.total ? `${s.done} z ${s.total} dziś` : "brak nawyków"}`}>
            {/* tor: cały wycinek, przygaszony */}
            <path className="tor" d={wedge(i, 1)} fill={s.cat.color} fillOpacity={0.09}
              stroke={s.cat.color} strokeOpacity={selected === s.cat.label ? 0.9 : 0.35} strokeWidth={selected === s.cat.label ? 2 : 1} />
            {frac > 0 && <path className="wypelnienie" d={wedge(i, frac)} fill={s.cat.color} fillOpacity={0.92} />}
            <text x={ix} y={iy + 6} textAnchor="middle" fontSize={17} style={{ pointerEvents: "none" }}>{s.cat.icon}</text>
          </g>
        );
      })}
      {/* środek: dzisiejsza suma ze wszystkich kategorii */}
      <circle cx={cx} cy={cy} r={rKola.toFixed(1)} fill="#0e0e0e" stroke="#232323" />
      <text x={cx} y={cy - 1} textAnchor="middle" fontSize={19} fontWeight="700" fill="#f1f1f1">{suma.done}/{suma.total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill={INK.faint}>dziś</text>
    </svg>
  );
}
