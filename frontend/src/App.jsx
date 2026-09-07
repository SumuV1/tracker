import { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import { TRAINING_PLANS, WEEKDAYS, todayKey, maxHeartRate } from "./plans.js";

// ── RESPONSYWNOŚĆ ─────────────────────────────────────────────────────────
// Layout jest budowany na stylach inline, więc breakpointy bierzemy z JS
// przez matchMedia zamiast z arkusza CSS.
const MOBILE = "(max-width: 640px)";
const NARROW = "(max-width: 380px)";
// poniżej tej szerokości kolumny obok siebie robią się za ciasne
const WIDE = "(min-width: 1000px)";

function useMedia(query) {
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

const CATEGORIES = [
  { label: "Zdrowie", color: "#4ade80", bg: "#052e16" },
  { label: "Praca", color: "#60a5fa", bg: "#0c1a3a" },
  { label: "Mindfulness", color: "#c084fc", bg: "#1a0a2e" },
  { label: "Osobiste", color: "#fb923c", bg: "#2e1200" },
];
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.label, c]));
const DAY_LABELS = ["N","P","W","Ś","C","P","S"];
const MONTHS_PL = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];
// Paleta składników odżywczych. Kolejność slotów jest zwalidowana skryptem
// walidatora dostępności (tryb ciemny, pary sąsiednie): najgorsza para
// bursztyn↔morski ma ΔE 8,4 przy protanopii, przy progu 8. Nie zmieniać
// kolorów ani ich kolejności bez ponownego uruchomienia walidatora.
const NUTRIENT = {
  kcal:    "#3987e5",
  protein: "#199e70",
  carbs:   "#c98500",
  fat:     "#d55181",
  fiber:   "#008300",
  salt:    "#9085e9",
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00","15","30","45"];
const TILE = 36;

const toISO = d => d.toISOString().slice(0, 10);
const today = () => toISO(new Date());
const getLast7 = () => { const a=[]; for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);a.push(toISO(d));} return a; };
const getDaysInMonth = (y,m) => { const a=[],d=new Date(y,m,1); while(d.getMonth()===m){a.push(toISO(d));d.setDate(d.getDate()+1);} return a; };
const getDaysInYear = y => { const a=[],d=new Date(y,0,1); while(d.getFullYear()===y){a.push(toISO(d));d.setDate(d.getDate()+1);} return a; };

// Katalog produktów żyje w tabeli foods (baza wbudowana + własne + Open Food Facts).

function getBMILabel(bmi){
  if(bmi<18.5)return{label:"Niedowaga",color:"#3b82f6"};
  if(bmi<25)return{label:"Norma",color:"#22c55e"};
  if(bmi<30)return{label:"Nadwaga",color:"#f59e0b"};
  return{label:"Otyłość",color:"#ef4444"};
}
// Etykiety poziomów aktywności. Same współczynniki i wzory należą do serwera —
// tutaj są tylko po to, żeby opisać pozycje listy wyboru.
const ACTIVITY = [
  {factor:1.2,   label:"siedzący",             option:"🛋️ Siedzący"},
  {factor:1.375, label:"lekko aktywny",        option:"🚶 Lekko aktywny (1-3 dni/tydz.)"},
  {factor:1.55,  label:"umiarkowanie aktywny", option:"🏃 Umiarkowanie aktywny (3-5 dni/tydz.)"},
  {factor:1.725, label:"bardzo aktywny",       option:"💪 Bardzo aktywny (6-7 dni/tydz.)"},
  {factor:1.9,   label:"ekstremalnie aktywny", option:"🏋️ Ekstremalnie aktywny"},
];


// Wzory pod wynikami. Wszystkie liczby — łącznie z PPM i współczynnikiem —
// pochodzą z odpowiedzi serwera, więc działanie nie może rozminąć się z wynikiem.
function FormulaPanel({profile}){
  const {weightKg:w, heightCm:h, ageYears:age, sex, bmi, bmr, tdee, activityFactor:factor}=profile;
  const act=ACTIVITY[profile.activity]||ACTIVITY[0];
  const n=v=>String(Math.round(v*100)/100).replace(".",",");
  const mono={fontFamily:"monospace",fontSize:12.5,color:"#bbb",lineHeight:1.9,whiteSpace:"nowrap"};
  const res={color:"#fff",fontWeight:700};
  const head={fontSize:11,fontWeight:700,letterSpacing:"0.08em",color:NUTRIENT.kcal,marginBottom:6,fontFamily:"monospace"};
  const note={fontSize:11,color:"#666",marginBottom:8,lineHeight:1.5};
  return(
    <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:20,marginTop:12}}>
      <div style={{fontSize:14,fontWeight:700,color:"#ccc",marginBottom:16}}>Jak to policzono</div>

      <div style={{marginBottom:18}}>
        <div style={head}>BMI</div>
        <div style={note}>Wskaźnik masy ciała — masa podzielona przez kwadrat wzrostu w metrach.</div>
        <div style={{overflowX:"auto"}}>
          <div style={mono}>BMI = waga [kg] / (wzrost [m])²</div>
          <div style={mono}>{"    "}= {n(w)} / {n(h/100)}² = <span style={res}>{bmi.toFixed(1)}</span></div>
        </div>
      </div>

      <div style={{marginBottom:18}}>
        <div style={head}>PPM — PODSTAWOWA PRZEMIANA MATERII</div>
        <div style={note}>Wzór Mifflina-St Jeora ({sex==="M"?"mężczyzna":"kobieta"}) — energia zużywana przez organizm w spoczynku.</div>
        <div style={{overflowX:"auto"}}>
          <div style={mono}>PPM = 10×waga + 6,25×wzrost − 5×wiek {sex==="M"?"+ 5":"− 161"}</div>
          <div style={mono}>{"    "}= 10×{n(w)} + 6,25×{n(h)} − 5×{n(age)} {sex==="M"?"+ 5":"− 161"}</div>
          <div style={mono}>{"    "}= <span style={res}>{bmr} kcal</span></div>
        </div>
      </div>

      <div>
        <div style={head}>CPM — CAŁKOWITA PRZEMIANA MATERII</div>
        <div style={note}>PPM przemnożona przez współczynnik aktywności ({act.label} = {n(factor)}). To jest dzienne zapotrzebowanie.</div>
        <div style={{overflowX:"auto"}}>
          <div style={mono}>CPM = PPM × współczynnik aktywności</div>
          <div style={mono}>{"    "}= {bmr} × {n(factor)} = <span style={res}>{tdee} kcal</span></div>
        </div>
      </div>
    </div>
  );
}

// Pierścienie postępu: jedna wartość względem dziennego celu, osobno dla każdego
// składnika. To nie jest wykres kołowy w sensie "części całości" — składniki nie
// sumują się do wspólnej całości, więc każdy dostaje własny wskaźnik.
// Nazwa i liczby są zawsze wypisane tekstem: kolor wyłącznie wzmacnia odczyt,
// nigdy nie jest jedynym nośnikiem informacji.
function Ring({value,target,unit,label,icon,color,size=104,limit=false}){
  const r=(size-14)/2, C=2*Math.PI*r;
  const pct=target?Math.round((value/target)*100):null;
  const over=pct!==null&&pct>100;
  const shown=Math.min(100,pct??0);
  const stroke=over?(limit?"#ef4444":"#f59e0b"):color;
  const fmt=v=>Number.isInteger(v)?v:Math.round(v*10)/10;
  return(
    <div style={{textAlign:"center"}}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{width:"100%",maxWidth:size,display:"block",margin:"0 auto"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#26262b" strokeWidth="9"/>
        {pct!==null&&(
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={stroke} strokeWidth="9"
            strokeLinecap="round" strokeDasharray={`${(shown/100)*C} ${C}`}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{transition:"stroke-dasharray 0.45s ease"}}/>
        )}
        <text x={size/2} y={size/2-1} textAnchor="middle" dominantBaseline="middle"
          fill="#f1f1f1" fontSize={size/4.2} fontWeight="700" fontFamily="inherit">
          {pct!==null?`${pct}%`:"—"}
        </text>
        <text x={size/2} y={size/2+size/6} textAnchor="middle" dominantBaseline="middle"
          fill="#777" fontSize={size/9} fontFamily="inherit">{icon} {label}</text>
      </svg>
      <div style={{fontSize:11.5,color:"#999",marginTop:6,lineHeight:1.4}}>
        <span style={{color:"#f1f1f1",fontWeight:700}}>{fmt(value)}</span>
        {target?<span style={{color:"#666"}}> / {target} {unit}</span>:<span style={{color:"#666"}}> {unit}</span>}
      </div>
      {over&&(
        <div style={{fontSize:10,color:limit?"#ef4444":"#f59e0b",fontWeight:600,marginTop:2}}>
          {limit?"ponad limit":"ponad cel"}
        </div>
      )}
    </div>
  );
}

function NutrientRings({totals,targets}){
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
        <div style={{fontSize:11,color:"#666",lineHeight:1.5,textAlign:"center"}}>
          Uzupełnij profil w zakładce „BMI & Profil", żeby zobaczyć dzienne cele.
        </div>
      )}
    </div>
  );
}

function makeSel(active){return{background:active?"#fff":"#1a1a1a",color:active?"#000":"#aaa",border:"none",borderRadius:7,cursor:"pointer",fontWeight:active?700:400,fontSize:13,textAlign:"center",width:TILE,height:TILE,flexShrink:0,transition:"background 0.15s"};}

function TimePicker({value,onChange,onClose,onRemove}){
  const isMobile=useMedia(MOBILE);
  const [h,setH]=useState(value?value.split(":")[0]:"08");
  const [m,setM]=useState(value?value.split(":")[1]:"00");
  const btn=extra=>({borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:700,padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"center",gap:7,width:"100%",border:"none",...extra});
  return(
    // na wąskim ekranie siatka godzin i przyciski nie zmieszczą się obok siebie
    <div style={{marginLeft:isMobile?0:42,display:"flex",flexDirection:isMobile?"column":"row",gap:12,alignItems:isMobile?"stretch":"center"}}>
      <div style={{background:"#111",border:"1px solid #2a2a2a",borderRadius:12,padding:3,display:"inline-block",flexShrink:0}}>
        <div style={{display:"flex",gap:3}}>
          <div style={{display:"grid",gridTemplateColumns:`repeat(4,${TILE}px)`,gap:3}}>
            {HOURS.map(hr=><button key={hr} onClick={()=>setH(hr)} style={makeSel(h===hr)}>{hr}</button>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:`${TILE}px`,gap:3}}>
            {MINUTES.map(mn=><button key={mn} onClick={()=>setM(mn)} style={makeSel(m===mn)}>{mn}</button>)}
          </div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8,flex:1}}>
        <button onClick={()=>onChange(`${h}:${m}`)} style={btn({background:"#1a3a1a",border:"1px solid #2d6b20",color:"#86efac"})}>✓ Zatwierdź</button>
        <button onClick={onClose} style={btn({background:"#222",border:"1px solid #444",color:"#aaa"})}>✕ Anuluj</button>
        {onRemove && <button onClick={onRemove} style={btn({background:"#3a1a1a",border:"1px solid #6b2020",color:"#f87171"})}>🗑 Usuń godzinę</button>}
      </div>
    </div>
  );
}

function TimePickerForm({value,onChange}){
  const [open,setOpen]=useState(false);
  const [h,setH]=useState(value?value.split(":")[0]:"08");
  const [m,setM]=useState(value?value.split(":")[1]:"00");
  const confirm=()=>{onChange(`${h}:${m}`);setOpen(false);};
  return(
    <div>
      <button onClick={()=>setOpen(!open)} style={{background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"8px 14px",color:value?"#fff":"#555",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
        🕐 <span style={{fontWeight:600,letterSpacing:1}}>{value||"-- : --"}</span>
        <span style={{color:"#555",fontSize:10}}>▾</span>
      </button>
      {open && (
        <div style={{background:"#111",border:"1px solid #2a2a2a",borderRadius:12,padding:3,marginTop:8,display:"inline-block"}}>
          <div style={{display:"flex",gap:3}}>
            <div style={{display:"grid",gridTemplateColumns:`repeat(4,${TILE}px)`,gap:3}}>
              {HOURS.map(hr=><button key={hr} onClick={()=>setH(hr)} style={makeSel(h===hr)}>{hr}</button>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:`${TILE}px`,gap:3}}>
              {MINUTES.map(mn=><button key={mn} onClick={()=>setM(mn)} style={makeSel(m===mn)}>{mn}</button>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:`${TILE}px`,gap:3}}>
              <button onClick={confirm} style={{...makeSel(false),background:"#fff",color:"#000",fontWeight:700,fontSize:16}}>✓</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthView({habitId,logs,color,toggle}){
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth());
  const days=getDaysInMonth(year,month);
  const firstDow=new Date(year,month,1).getDay();
  const done=days.filter(d=>logs[`${habitId}_${d}`]).length;
  const rate=Math.round((done/days.length)*100);
  const prevM=()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);};
  const nextM=()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);};
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <button onClick={prevM} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:16,padding:"0 6px"}}>‹</button>
        <span style={{fontSize:13,fontWeight:600,color:"#ccc"}}>{MONTHS_PL[month]} {year} — {rate}%</span>
        <button onClick={nextM} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:16,padding:"0 6px"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>
        {DAY_LABELS.map(l=><div key={l} style={{fontSize:10,color:"#555",textAlign:"center"}}>{l}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {Array(firstDow).fill(null).map((_,i)=><div key={`b${i}`}/>)}
        {days.map(d=>{
          const checked=logs[`${habitId}_${d}`];
          const day=parseInt(d.slice(8));
          const isT=d===today();
          return <div key={d} onClick={()=>toggle(habitId,d)} style={{aspectRatio:"1",borderRadius:5,background:checked?color:"#2a2a2a",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:checked?"#000":isT?"#fff":"#555",fontWeight:isT?700:400,outline:isT?`2px solid ${color}`:"none",outlineOffset:-1,transition:"background 0.15s"}}>{day}</div>;
        })}
      </div>
    </div>
  );
}

function YearView({habitId,logs,color}){
  const [year,setYear]=useState(new Date().getFullYear());
  const days=getDaysInYear(year);
  const done=days.filter(d=>logs[`${habitId}_${d}`]).length;
  const rate=Math.round((done/days.length)*100);
  const byMonth=Array.from({length:12},(_,mi)=>getDaysInMonth(year,mi));
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <button onClick={()=>setYear(y=>y-1)} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:16,padding:"0 6px"}}>‹</button>
        <span style={{fontSize:13,fontWeight:600,color:"#ccc"}}>{year} — {rate}% ({done}/{days.length})</span>
        <button onClick={()=>setYear(y=>y+1)} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:16,padding:"0 6px"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:6}}>
        {byMonth.map((mDays,mi)=>{
          const mDone=mDays.filter(d=>logs[`${habitId}_${d}`]).length;
          const mRate=mDays.length?mDone/mDays.length:0;
          return(
            <div key={mi}>
              <div style={{fontSize:10,color:"#555",marginBottom:3,textAlign:"center"}}>{MONTHS_PL[mi]}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                {Array(new Date(year,mi,1).getDay()).fill(null).map((_,i)=><div key={`b${i}`}/>)}
                {mDays.map(d=><div key={d} style={{aspectRatio:"1",borderRadius:2,background:logs[`${habitId}_${d}`]?color:"#2a2a2a",opacity:logs[`${habitId}_${d}`]?0.85:0.4}} title={d}/>)}
              </div>
              <div style={{marginTop:3,background:"#2a2a2a",borderRadius:99,height:3,overflow:"hidden"}}>
                <div style={{width:`${mRate*100}%`,height:"100%",background:color,borderRadius:99}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalYearView({calLogs,tdee}){
  const [year,setYear]=useState(new Date().getFullYear());
  const byMonth=Array.from({length:12},(_,mi)=>getDaysInMonth(year,mi));
  const maxCal=Math.max(1,...Object.values(calLogs).map(v=>v||0));
  const getColor=cal=>{
    if(!cal)return"#1e1e1e";
    if(tdee){
      const pct=cal/tdee;
      if(pct<=0.5)return"#1e3a2a";
      if(pct<=0.85)return"#22c55e";
      if(pct<=1.0)return"#4ade80";
      if(pct<=1.2)return"#f59e0b";
      return"#ef4444";
    }
    const intensity=Math.min(1,cal/maxCal);
    return`rgb(20,${Math.round(70+intensity*130)},50)`;
  };
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <button onClick={()=>setYear(y=>y-1)} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:16,padding:"0 6px"}}>‹</button>
        <span style={{fontSize:13,fontWeight:600,color:"#ccc"}}>Kalorie {year}</span>
        <button onClick={()=>setYear(y=>y+1)} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:16,padding:"0 6px"}}>›</button>
      </div>
      {tdee && (
        <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
          {[["#1e3a2a","<50%"],["#22c55e","50–85%"],["#4ade80","85–100%"],["#f59e0b","100–120%"],["#ef4444",">120%"]].map(([c,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#888"}}>
              <div style={{width:10,height:10,borderRadius:2,background:c}}/>{l}
            </div>
          ))}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:6}}>
        {byMonth.map((mDays,mi)=>{
          const mCal=mDays.reduce((s,d)=>s+(calLogs[d]||0),0);
          return(
            <div key={mi}>
              <div style={{fontSize:10,color:"#555",marginBottom:3,textAlign:"center"}}>{MONTHS_PL[mi]}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                {Array(new Date(year,mi,1).getDay()).fill(null).map((_,i)=><div key={`b${i}`}/>)}
                {mDays.map(d=><div key={d} title={`${d}: ${calLogs[d]||0} kcal`} style={{aspectRatio:"1",borderRadius:2,background:getColor(calLogs[d]||0)}}/>)}
              </div>
              <div style={{fontSize:9,color:"#555",marginTop:3,textAlign:"center"}}>{mCal>0?`${mCal} kcal`:""}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAPA MIĘŚNI — dane i komponenty
// ══════════════════════════════════════════════════════════════════
const MUSCLES = {
  deltoid_front:{name:"Mięsień naramienny",latin:"Deltoideus",function:"Odwodzenie i zginanie ramienia, rotacja wewnętrzna i zewnętrzna; stabilizacja stawu ramiennego podczas dźwigania",location:"Ramię – okrywa staw ramienny z trzech stron",side:"front",color:"#FF6D3A",exercises:[{name:"Wyciskanie nad głowę na maszynie",sets:"4 × 10–12",tip:"Ustaw uchwyty na wysokości barków. Wypychaj płynnie bez blokowania łokci.",icon:"⚙️"},{name:"Odwodzenie ramion na maszynie",sets:"3 × 12–15",tip:"Unoś łokcie do linii barków, kontroluj opuszczanie 2–3 s.",icon:"⚙️"},{name:"Wyciąg linkowy – unoszenie w przód",sets:"3 × 12",tip:"Unoś wyprostowane ramię do wysokości oczu, bez bujania tułowiem.",icon:"⚙️"},{name:"Wyciskanie żołnierskie ze sztangą",sets:"4 × 6–8",tip:"Wypychaj pionowo, głowa cofa się by przepuścić gryf, pośladki napięte.",icon:"🏋️"},{name:"Odwodzenie ramion z hantlami",sets:"3 × 12–15",tip:"Prowadź ruch łokciami. Nie unoś powyżej linii barków.",icon:"🏋️"},{name:"Wyciskanie Arnolda",sets:"3 × 10",tip:"Obracaj nadgarstki o 180° podczas wyciskania.",icon:"🔄"}]},
  pectoralis:{name:"Mięsień piersiowy większy",latin:"Pectoralis major",function:"Przyciąganie i rotacja wewnętrzna ramienia, zginanie ramienia w stawie barkowym",location:"Klatka piersiowa – od mostka i obojczyka do kości ramiennej",side:"front",color:"#F44336",exercises:[{name:"Wyciskanie na maszynie",sets:"4 × 10–12",tip:"Wypychaj ściągając łopatki, zatrzymaj tuż przed pełnym wyprostem.",icon:"⚙️"},{name:"Rozpiętki na maszynie (Pec Deck)",sets:"3 × 12–15",tip:"Zbliżaj ramiona po łuku, ściskając klatkę 1 s.",icon:"⚙️"},{name:"Zbliżanie ramion na wyciągu",sets:"3 × 12",tip:"Prowadź dłonie po łuku w dół i do środka, krzyżując nisko.",icon:"⚙️"},{name:"Wyciskanie sztangi na ławce",sets:"4 × 6–8",tip:"Łopatki ściągnięte, gryf opada do linii sutków, łokcie ~75°.",icon:"🏋️"},{name:"Rozpiętki z hantlami",sets:"3 × 12",tip:"Lekko zgięte łokcie, nie schodź poniżej linii ławki.",icon:"🏋️"},{name:"Pompki diamentowe / klasyczne",sets:"3 × do załamania",tip:"Ciało w linii prostej, brzuch napięty.",icon:"💎"}]},
  biceps:{name:"Mięsień dwugłowy ramienia",latin:"Biceps brachii",function:"Zginanie łokcia, supinacja przedramienia, pomocniczo zginanie ramienia",location:"Przednia część ramienia – od łopatki do kości promieniowej",side:"front",color:"#42A5F5",exercises:[{name:"Uginanie ramion na maszynie",sets:"4 × 10–12",tip:"Ramię oparte, pełen zakres, kontrolowany powrót.",icon:"⚙️"},{name:"Uginanie na wyciągu z drążkiem",sets:"3 × 12",tip:"Łokcie przyklejone do tułowia przez cały ruch.",icon:"⚙️"},{name:"Uginanie na modlitewniku",sets:"3 × 10",tip:"Zatrzymaj przed pełnym wyprostem, by chronić ścięgno.",icon:"⚙️"},{name:"Uginanie ze sztangą",sets:"4 × 8–10",tip:"Nie bujaj tułowiem, powolne opuszczanie 2–3 s.",icon:"💪"},{name:"Uginanie młotkowe",sets:"3 × 12",tip:"Chwyt neutralny, buduje grubość ramienia.",icon:"🔨"},{name:"Uginanie z supinacją",sets:"3 × 10",tip:"Obracaj nadgarstek na zewnątrz podczas unoszenia.",icon:"🔄"}]},
  rectus_abdominis:{name:"Mięsień prosty brzucha",latin:"Rectus abdominis",function:"Zginanie tułowia, stabilizacja miednicy i kręgosłupa, wspomaganie wydechu",location:"Przednia ściana brzucha – od mostka do spojenia łonowego",side:"front",color:"#66BB6A",exercises:[{name:"Spięcia brzucha na maszynie",sets:"4 × 15",tip:"Ruch zwijaniem tułowia, nie ciągnięciem rękami.",icon:"⚙️"},{name:"Spięcia na wyciągu górnym",sets:"3 × 15",tip:"Zwijaj kręgosłup 'kręg po kręgu', biodra nieruchome.",icon:"⚙️"},{name:"Unoszenie nóg (Captain's Chair)",sets:"3 × 12",tip:"Unoś kolana zwijając miednicę.",icon:"⚙️"},{name:"Klasyczne spięcia (Crunch)",sets:"3 × 20",tip:"Unoś tylko łopatki, dół pleców przy macie.",icon:"🔃"},{name:"Unoszenie nóg w zwisie",sets:"3 × 12",tip:"Kontroluj opuszczanie, zwijaj miednicę ku żebrom.",icon:"⬆️"},{name:"Deska (Plank)",sets:"3 × 45–60 s",tip:"Ciało w linii prostej, napnij brzuch i pośladki.",icon:"📏"}]},
  obliques:{name:"Mięśnie skośne brzucha",latin:"Obliquus externus / internus",function:"Rotacja i boczne zginanie tułowia, stabilizacja core",location:"Boczne ściany brzucha, po bokach mięśnia prostego",side:"front",color:"#FF6E40",exercises:[{name:"Rotacja tułowia na maszynie",sets:"4 × 15",tip:"Miednica unieruchomiona, rotuj wyłącznie tułowiem.",icon:"⚙️"},{name:"Drwal na wyciągu (Woodchopper)",sets:"3 × 12",tip:"Ruch diagonalny od barku do przeciwnego biodra.",icon:"⚙️"},{name:"Boczne spięcia na wyciągu",sets:"3 × 15",tip:"Zginaj się bocznie w talii, pełne rozciągnięcie u góry.",icon:"⚙️"},{name:"Russian Twist z obciążeniem",sets:"3 × 20",tip:"Odchyl tułów ~45°, rotuj tułowiem nie rękami.",icon:"🔄"},{name:"Boczna deska (Side Plank)",sets:"3 × 30–45 s",tip:"Ciało w jednej linii, biodro wysoko.",icon:"📐"},{name:"Skłony boczne z hantlem",sets:"3 × 15",tip:"Zginaj bocznie tylko w talii, nie rotuj.",icon:"🏋️"}]},
  serratus:{name:"Mięsień zębaty przedni",latin:"Serratus anterior",function:"Protrakcja i rotacja łopatki w górę, dociskanie łopatki do klatki",location:"Boczna ściana klatki – od żeber do brzegu łopatki",side:"front",color:"#26C6DA",exercises:[{name:"Wypychanie z protrakcją na wyciągu",sets:"4 × 15",tip:"Na końcu ruchu 'wypchnij' łopatkę do przodu.",icon:"⚙️"},{name:"Pullover na wyciągu",sets:"3 × 12",tip:"Ciągnij łukiem do bioder, czując pracę pod pachą.",icon:"⚙️"},{name:"Wyciskanie w Smith z protrakcją",sets:"3 × 12",tip:"W górnej fazie 'dopchnij' barki do sufitu.",icon:"⚙️"},{name:"Pompki z protrakcją (Push-up Plus)",sets:"3 × 15",tip:"Na szczycie wypchnij górną część pleców w górę.",icon:"🤸"},{name:"Pullover z hantlem",sets:"3 × 12",tip:"Opuszczaj za głowę czując rozciąganie żeber.",icon:"🔁"},{name:"Wall Slides",sets:"3 × 12",tip:"Przesuwaj przedramiona w górę wysuwając łopatki.",icon:"🧱"}]},
  forearm_front:{name:"Przedramię – zginacze",latin:"Flexores antebrachii",function:"Zginanie nadgarstka i palców, siła chwytu, pronacja",location:"Przednia strona przedramienia",side:"front",color:"#29B6F6",exercises:[{name:"Uginanie nadgarstków na wyciągu",sets:"4 × 15",tip:"Przedramiona oparte, tylko dłonie ruchome.",icon:"⚙️"},{name:"Ściskanie uchwytu (Grip Machine)",sets:"3 × 15",tip:"Powolne ściskanie i kontrolowany powrót.",icon:"⚙️"},{name:"Farmer's Walk",sets:"3 × 40 m",tip:"Barki w dół, tułów wyprostowany.",icon:"🏋️"},{name:"Uginanie nadgarstków ze sztangą",sets:"3 × 15–20",tip:"Rozwiń gryf do końców palców, potem zwiń.",icon:"🤲"},{name:"Wieszanie na drążku (Dead Hang)",sets:"3 × do załamania",tip:"Zwis na wyprostowanych ramionach.",icon:"🏗️"},{name:"Wrist Roller",sets:"3 × 2 przejścia",tip:"Zwijaj linę z obciążeniem obracając nadgarstkami.",icon:"🎯"}]},
  quadriceps:{name:"Mięsień czworogłowy uda",latin:"Quadriceps femoris",function:"Prostowanie kolana, zginanie biodra, stabilizacja rzepki",location:"Przednia część uda – cztery głowy",side:"front",color:"#AB47BC",exercises:[{name:"Prostowanie nóg (Leg Extension)",sets:"4 × 12–15",tip:"Pełen wyprost z 1 s napięcia u góry.",icon:"⚙️"},{name:"Wypychanie na suwnicy (Leg Press)",sets:"4 × 10–12",tip:"Kolana podążają za palcami, nie blokuj u góry.",icon:"⚙️"},{name:"Przysiad Hack",sets:"3 × 10",tip:"Plecy płasko, napęd przez pięty.",icon:"⚙️"},{name:"Przysiad ze sztangą",sets:"4 × 6–8",tip:"Kolana nad stopami, pięty na podłodze.",icon:"🏋️"},{name:"Wykroki chodzone",sets:"3 × 12",tip:"Długi krok, tułów pionowo, napęd z pięty.",icon:"🦵"},{name:"Przysiad bułgarski",sets:"3 × 10",tip:"Tylna stopa na podwyższeniu, schodź pionowo.",icon:"🔥"}]},
  adductors:{name:"Mięśnie przywodziciele uda",latin:"Adductores femoris",function:"Przywodzenie uda, rotacja i stabilizacja biodra",location:"Przyśrodkowa część uda",side:"front",color:"#EC407A",exercises:[{name:"Przywodzenie ud na maszynie",sets:"4 × 15",tip:"Zbliżaj uda, zatrzymaj w zwarciu 1 s.",icon:"⚙️"},{name:"Przywodzenie na wyciągu",sets:"3 × 15",tip:"Przeciągaj nogę przez linię środkową ciała.",icon:"⚙️"},{name:"Suwnica – wąskie stopy",sets:"3 × 12",tip:"Stopy blisko siebie, palce lekko na zewnątrz.",icon:"⚙️"},{name:"Przysiad sumo",sets:"3 × 10",tip:"Szeroki rozkrok, palce na zewnątrz 45°.",icon:"🏋️"},{name:"Wykrok boczny (Cossack)",sets:"3 × 10",tip:"Duży krok w bok, biodra cofnięte.",icon:"↔️"},{name:"Ściskanie piłki (Copenhagen)",sets:"3 × 30 s",tip:"Ściskaj piłkę udami statycznie lub dynamicznie.",icon:"⚽"}]},
  tibialis:{name:"Mięsień piszczelowy przedni",latin:"Tibialis anterior",function:"Zginanie grzbietowe stopy, inwersja, stabilizacja chodu",location:"Przednio-boczna część goleni",side:"front",color:"#26A69A",exercises:[{name:"Zginanie grzbietowe na maszynie",sets:"4 × 15–20",tip:"Unoś palce ku goleni, pauza u góry.",icon:"⚙️"},{name:"Zginanie stopy z linką",sets:"3 × 15",tip:"Przyciągaj palce do siebie przeciw oporowi.",icon:"⚙️"},{name:"Wypychanie palcami na suwnicy",sets:"3 × 15",tip:"Kontrolowane zginanie grzbietowe stopy.",icon:"⚙️"},{name:"Chód na piętach",sets:"3 × 30 m",tip:"Unieś palce maksymalnie, idź na piętach.",icon:"🚶"},{name:"Unoszenie palców z taśmą",sets:"3 × 20",tip:"Przyciągaj palce ku sobie przeciw taśmie.",icon:"🎗️"},{name:"Unoszenie palców pod ścianą",sets:"3 × 20",tip:"Pięty przy ścianie, unoś przód stóp wysoko.",icon:"👣"}]},
  sartorius:{name:"Mięsień krawiecki",latin:"Sartorius",function:"Zginanie, odwodzenie i rotacja zewnętrzna uda; zginanie goleni",location:"Najdłuższy mięsień ciała – ukośnie przez przód uda",side:"front",color:"#D4E157",exercises:[{name:"Zginanie biodra na wyciągu",sets:"4 × 12",tip:"Unoś kolano z lekką rotacją zewnętrzną.",icon:"⚙️"},{name:"Odwodzenie z rotacją na maszynie",sets:"3 × 15",tip:"Akcent na rotację zewnętrzną biodra.",icon:"⚙️"},{name:"Zginanie biodra w maszynie",sets:"3 × 12",tip:"Kontroluj tempo, unikaj zamachów.",icon:"⚙️"},{name:"Unoszenie kolana z rotacją",sets:"3 × 12",tip:"Obracaj kolano na zewnątrz jak do siadu skrzyżnego.",icon:"🦵"},{name:"Wykrok krzyżowy (Curtsy)",sets:"3 × 10",tip:"Krok po skosie za drugą nogę.",icon:"🔄"},{name:"Siad skrzyżny (Butterfly)",sets:"3 × 30 s",tip:"Stopniowo pogłębiaj rotację bioder.",icon:"🧘"}]},
  trapezius:{name:"Mięsień czworoboczny",latin:"Trapezius",function:"Unoszenie, cofanie i rotacja łopatki; prostowanie głowy i szyi",location:"Górna część pleców i kark",side:"back",color:"#FF7043",exercises:[{name:"Wznosy barków na maszynie",sets:"4 × 12–15",tip:"Unoś barki prosto w górę, pauza 1 s. Nie rotuj.",icon:"⚙️"},{name:"Face Pull na wyciągu",sets:"3 × 15",tip:"Lina na wysokości oczu, łokcie wysoko.",icon:"⚙️"},{name:"Wiosłowanie z akcentem na łopatki",sets:"3 × 12",tip:"Mocno ściągnij łopatki do siebie, pauza.",icon:"⚙️"},{name:"Wznosy barków ze sztangą",sets:"4 × 12",tip:"Unoś barki pionowo, bez bujania.",icon:"🏋️"},{name:"Wznosy barków z hantlami",sets:"3 × 15",tip:"Neutralny chwyt, pełen zakres.",icon:"🏋️"},{name:"Prone Y-Raise",sets:"3 × 15",tip:"Unoś ramiona tworząc literę Y – dolny czworoboczny.",icon:"✌️"}]},
  deltoid_back:{name:"Naramienny – część tylna",latin:"Deltoideus (posterior)",function:"Prostowanie i rotacja zewnętrzna ramienia, odwodzenie poziome",location:"Tylna część barku",side:"back",color:"#FF8A65",exercises:[{name:"Odwrotne rozpiętki na maszynie",sets:"4 × 12–15",tip:"Ramiona odwodzone w tył po łuku, ściśnij łopatki.",icon:"⚙️"},{name:"Odwodzenie w tył na wyciągu",sets:"3 × 15",tip:"Ciągnij ramiona na zewnątrz i w tył.",icon:"⚙️"},{name:"Face Pull",sets:"3 × 15",tip:"Łokcie wysoko i szeroko.",icon:"⚙️"},{name:"Odwrotne rozpiętki z hantlami",sets:"4 × 15",tip:"Tułów pochylony ~45°, prowadź łokciami.",icon:"🏋️"},{name:"Odwodzenie hantla w opadzie",sets:"3 × 12",tip:"Podpór ręką o ławkę, izolacja tyłu barku.",icon:"🔄"},{name:"Odwodzenie poziome leżąc",sets:"3 × 15",tip:"Leżąc przodem, unoś ramiona w bok.",icon:"🛏️"}]},
  infraspinatus:{name:"Mięsień podgrzebieniowy",latin:"Infraspinatus",function:"Rotacja zewnętrzna ramienia, stabilizacja (stożek rotatorów)",location:"Tylna powierzchnia łopatki",side:"back",color:"#80DEEA",exercises:[{name:"Rotacja zewnętrzna na wyciągu",sets:"4 × 15",tip:"Łokieć przy tułowiu, obracaj przedramię na zewnątrz.",icon:"⚙️"},{name:"Rotacja na maszynie do rotatorów",sets:"3 × 15",tip:"Powolny ruch w pełnym zakresie.",icon:"⚙️"},{name:"Face Pull z rotacją",sets:"3 × 12",tip:"Na końcu obróć dłonie ku sufitowi.",icon:"⚙️"},{name:"Rotacja leżąc na boku",sets:"3 × 15",tip:"Bardzo lekki ciężar (1–3 kg), pełny zakres.",icon:"↩️"},{name:"Rotacja z taśmą",sets:"3 × 15",tip:"Ramię przy ciele, powolne obracanie.",icon:"🎗️"},{name:"Prone W",sets:"3 × 12",tip:"Ramiona tworzą literę W, kciuki ku górze.",icon:"🅆"}]},
  latissimus:{name:"Mięsień najszerszy grzbietu",latin:"Latissimus dorsi",function:"Prostowanie, przywodzenie i rotacja wewnętrzna ramienia; podciąganie",location:"Dolna i środkowa część pleców",side:"back",color:"#FF4081",exercises:[{name:"Ściąganie drążka (Lat Pulldown)",sets:"4 × 10–12",tip:"Ściągaj do górnej klatki, łopatki najpierw.",icon:"⚙️"},{name:"Wiosłowanie na maszynie",sets:"4 × 10–12",tip:"Ściągaj do brzucha, ściągając łopatki.",icon:"⚙️"},{name:"Ściąganie prostymi ramionami",sets:"3 × 12",tip:"Izoluje najszerszy bez udziału bicepsa.",icon:"⚙️"},{name:"Podciąganie na drążku",sets:"4 × do załamania",tip:"Inicjuj ściągnięciem łopatek, mostkiem do drążka.",icon:"🏗️"},{name:"Wiosłowanie sztangą w opadzie",sets:"4 × 8",tip:"Tułów ~45°, ściągaj do dolnych żeber.",icon:"⬇️"},{name:"Wiosłowanie hantlem jednorącz",sets:"3 × 10",tip:"Ciągnij hantel do biodra, pełny skurcz łopatki.",icon:"💪"}]},
  erector_spinae:{name:"Mięsień prostownik grzbietu",latin:"Erector spinae",function:"Prostowanie i stabilizacja kręgosłupa, utrzymanie postawy",location:"Wzdłuż całego kręgosłupa",side:"back",color:"#A5D6A7",exercises:[{name:"Prostowanie grzbietu na maszynie",sets:"4 × 12–15",tip:"Nie przeprostowuj lędźwi, zatrzymaj w linii ciała.",icon:"⚙️"},{name:"Martwy ciąg na Smith",sets:"3 × 8–10",tip:"Plecy proste, napęd biodrami.",icon:"⚙️"},{name:"Hiperekstensje (Roman Chair)",sets:"3 × 15",tip:"Prostuj tułów kontrolowanie, bez przeprostu.",icon:"⚙️"},{name:"Martwy ciąg klasyczny",sets:"4 × 5",tip:"Plecy proste, napęd przez pięty i biodra.",icon:"🏋️"},{name:"Good Morning",sets:"3 × 10",tip:"Skłon w biodrach z prostymi plecami.",icon:"🌅"},{name:"Superman",sets:"3 × 15",tip:"Unoś ręce i nogi jednocześnie, pauza 2 s.",icon:"🦸"}]},
  gluteus:{name:"Mięsień pośladkowy wielki",latin:"Gluteus maximus",function:"Prostowanie i rotacja zewnętrzna uda, stabilizacja miednicy",location:"Pośladek – największy mięsień ciała",side:"back",color:"#FFD54F",exercises:[{name:"Wypychanie bioder na maszynie",sets:"4 × 10–12",tip:"Wypychaj do pełnego wyprostu, ściskaj pośladki 1 s.",icon:"⚙️"},{name:"Odpychanie nogi na wyciągu",sets:"3 × 15",tip:"Prostuj biodro, ruch z biodra nie z lędźwi.",icon:"⚙️"},{name:"Suwnica – stopy wysoko",sets:"3 × 12",tip:"Szeroki rozstaw, głębokie schodzenie.",icon:"⚙️"},{name:"Hip Thrust ze sztangą",sets:"4 × 10",tip:"Wypychaj do linii tułów-uda, pełny skurcz.",icon:"🏋️"},{name:"Przysiad bułgarski",sets:"3 × 10",tip:"Tułów lekko pochylony w przód.",icon:"🦵"},{name:"Wchodzenie na podwyższenie",sets:"3 × 12",tip:"Wchodź napędem pięty, prostując biodro.",icon:"📦"}]},
  hamstrings:{name:"Mięśnie kulszowo-goleniowe",latin:"Hamstrings",function:"Zginanie kolana, prostowanie biodra, stabilizacja kolana",location:"Tylna część uda – trzy mięśnie",side:"back",color:"#CE93D8",exercises:[{name:"Uginanie nóg leżąc",sets:"4 × 12",tip:"Uginaj pełnym zakresem, powolny powrót.",icon:"⚙️"},{name:"Uginanie nóg siedząc",sets:"3 × 12–15",tip:"Mocny skurcz w końcowej fazie.",icon:"⚙️"},{name:"Martwy ciąg rumuński na Smith",sets:"3 × 10",tip:"Biodra cofnięte, wracaj napędem bioder.",icon:"⚙️"},{name:"Martwy ciąg rumuński",sets:"4 × 8",tip:"Kolana lekko ugięte, schodź do rozciągnięcia.",icon:"🏋️"},{name:"Nordic Hamstring Curl",sets:"3 × 6–8",tip:"Opuszczaj tułów jak najwolniej hamując.",icon:"🔥"},{name:"Glute-Ham Raise / Bridge",sets:"3 × 12",tip:"Napęd łączy pośladki i tylną taśmę uda.",icon:"🌉"}]},
  gastrocnemius:{name:"Mięsień brzuchaty łydki",latin:"Gastrocnemius",function:"Zginanie podeszwowe stopy, zginanie kolana, napęd",location:"Tylna część goleni – dwie głowy",side:"back",color:"#B39DDB",exercises:[{name:"Wspięcia na palce stojąc",sets:"4 × 15–20",tip:"Głębokie opuszczenie pięt, maksymalne wspięcie.",icon:"⚙️"},{name:"Wypychanie palcami na suwnicy",sets:"3 × 15",tip:"Kolana wyprostowane, pełny zakres kostki.",icon:"⚙️"},{name:"Wspięcia w Smith",sets:"3 × 15",tip:"Skup się na pełnym skurczu łydki.",icon:"⚙️"},{name:"Wspięcia ze sztangą",sets:"3 × 15",tip:"Kolana wyprostowane, akcent na brzuchaty.",icon:"🏋️"},{name:"Wspięcia jednonóż",sets:"3 × 15",tip:"Większe obciążenie i pełen zakres.",icon:"👣"},{name:"Skoki na skakance",sets:"3 × 2 min",tip:"Ląduj miękko na przodostopiu.",icon:"🪢"}]},
  triceps:{name:"Mięsień trójgłowy ramienia",latin:"Triceps brachii",function:"Prostowanie łokcia, prostowanie ramienia, stabilizacja łokcia",location:"Tylna część ramienia – trzy głowy",side:"back",color:"#64B5F6",exercises:[{name:"Prostowanie na wyciągu (Pushdown)",sets:"4 × 12–15",tip:"Łokcie przyklejone do tułowia, pełen wyprost.",icon:"⚙️"},{name:"Prostowanie nad głowę na wyciągu",sets:"3 × 12",tip:"Angażuje głowę długą trójgłowego.",icon:"⚙️"},{name:"Prostowanie w maszynie (Dips)",sets:"3 × 12",tip:"Pełny wyprost z akcentem na skurcz.",icon:"⚙️"},{name:"Wyciskanie wąskim chwytem",sets:"4 × 8",tip:"Łokcie blisko tułowia, napęd trójgłowym.",icon:"🏋️"},{name:"Pompki na poręczach",sets:"3 × do załamania",tip:"Tułów pionowo, łokcie do tyłu.",icon:"🔽"},{name:"Wyprost w opadzie (Kickback)",sets:"3 × 12",tip:"Prostuj przedramię w tył, pauza 1 s.",icon:"🔄"}]},
  forearm_back:{name:"Przedramię – prostowniki",latin:"Extensores antebrachii",function:"Prostowanie nadgarstka i palców, supinacja, stabilizacja",location:"Tylna strona przedramienia",side:"back",color:"#4FC3F7",exercises:[{name:"Prostowanie nadgarstków na wyciągu",sets:"4 × 15",tip:"Prostuj nadgarstki w górę, stałe napięcie.",icon:"⚙️"},{name:"Odwrócone uginanie na wyciągu",sets:"3 × 12",tip:"Chwyt nachwytem, angażuje prostowniki.",icon:"⚙️"},{name:"Prostowanie w maszynie",sets:"3 × 15",tip:"Powolny powrót, akcent na prostowniki.",icon:"⚙️"},{name:"Prostowanie nadgarstków z hantlami",sets:"3 × 15",tip:"Unoś grzbiet dłoni, powolne opuszczanie.",icon:"🤲"},{name:"Odwrócone uginanie ze sztangą",sets:"3 × 12",tip:"Chwyt nachwytem, buduje grubość przedramienia.",icon:"💪"},{name:"Wrist Roller w tył",sets:"3 × 2 przejścia",tip:"Zwijaj grzbietem do góry – trening antagonistów.",icon:"🎯"}]},
  sternocleidomastoid:{name:"Mostkowo-obojczykowo-sutkowy",latin:"Sternocleidomastoideus",function:"Obrót głowy, zginanie szyi, unoszenie mostka przy wdechu",location:"Szyja – od wyrostka sutkowatego do mostka i obojczyka",side:"front",color:"#E040FB",exercises:[{name:"Zginanie szyi na maszynie",sets:"3 × 12–15",tip:"Bardzo lekki ciężar, powolny pełen zakres.",icon:"⚙️"},{name:"Rotacja szyi z linką",sets:"3 × 12",tip:"Minimalny opór, kontrola.",icon:"⚙️"},{name:"Zginanie boczne w uprzęży",sets:"3 × 12",tip:"Unikaj gwałtownych szarpnięć.",icon:"⚙️"},{name:"Zginanie szyi z oporem dłoni",sets:"3 × 15",tip:"Dłoń na czole, opór ręki.",icon:"🤲"},{name:"Unoszenie głowy leżąc",sets:"3 × 12",tip:"Unoś brodę ku klatce, kontrolowany powrót.",icon:"⬆️"},{name:"Rotacja głowy z oporem",sets:"3 × 15",tip:"Dłoń na policzku, obracaj przeciw oporowi.",icon:"🔄"}]},
  scalenes:{name:"Mięśnie pochyłe szyi",latin:"Musculi scaleni",function:"Zginanie boczne szyi, stabilizacja, unoszenie żeber (wdech)",location:"Boczna część szyi – do dwóch górnych żeber",side:"front",color:"#CE93D8",exercises:[{name:"Zginanie boczne w maszynie",sets:"3 × 12",tip:"Minimalne obciążenie, priorytet techniki.",icon:"⚙️"},{name:"Boczne zginanie z linką",sets:"3 × 12",tip:"Powolne pochylanie ku barkowi.",icon:"⚙️"},{name:"Trening oddechowy z oporem",sets:"3 × 2 min",tip:"Aktywuje pochyłe jako mięśnie oddechu.",icon:"⚙️"},{name:"Boczne zginanie z oporem dłoni",sets:"3 × 12",tip:"Ruch powolny, bez kompensacji barkiem.",icon:"🤲"},{name:"Rozciąganie boczne szyi",sets:"3 × 30 s",tip:"Opuść bark, delikatnie pociągnij głowę.",icon:"↔️"},{name:"Oddychanie przeponowe",sets:"3 × 2 min",tip:"Świadome rozluźnienie mięśni szyi.",icon:"🧘"}]},
  platysma:{name:"Mięsień szeroki szyi (Platysma)",latin:"Platysma",function:"Napinanie skóry szyi, opuszczanie żuchwy, mimika",location:"Powierzchowna szyja – od obojczyka do żuchwy",side:"front",color:"#F48FB1",exercises:[{name:"Ćwiczenie oporowe żuchwy",sets:"3 × 12",tip:"Bardzo lekkie obciążenie, kontrola.",icon:"⚙️"},{name:"Elektrostymulacja (EMS)",sets:"2 × 15 min",tip:"Uzupełnienie, nie zastępstwo ćwiczeń.",icon:"⚙️"},{name:"Oporowy uchwyt podbródka",sets:"3 × 12",tip:"Poprawia napięcie powierzchowne szyi.",icon:"⚙️"},{name:"Cofanie żuchwy (Chin Tuck)",sets:"3 × 15",tip:"'Podwójny podbródek', pauza 3 s.",icon:"↩️"},{name:"Opór przy otwieraniu ust",sets:"3 × 12",tip:"Dłoń pod żuchwą, otwieraj przeciw oporowi.",icon:"🤲"},{name:"Grymas platysma",sets:"3 × 15",tip:"Ściągnij kąciki ust w dół, trzymaj 5 s.",icon:"😬"}]},
};

const BODY_SVG_MARKUP = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 780" width="100%" height="100%">
  <defs>
    <linearGradient id="mmBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22222a"/><stop offset="100%" stop-color="#15151a"/>
    </linearGradient>
  </defs>
  <rect width="900" height="780" fill="#121215"/>
  <path d="M 200.0,26 Q 232.0,26 236.0,62 Q 238.0,88 226.0,102 Q 214.0,114 200.0,114 L 200.0,26 Z" fill="url(#mmBody)"/><path d="M 200.0,26 Q 168.0,26 164.0,62 Q 162.0,88 174.0,102 Q 186.0,114 200.0,114 L 200.0,26 Z" fill="url(#mmBody)"/><path d="M 200.0,108 L 219.0,108 L 222.0,138 L 200.0,142 Z" fill="url(#mmBody)"/><path d="M 200.0,108 L 181.0,108 L 178.0,138 L 200.0,142 Z" fill="url(#mmBody)"/><path d="M 200.0,132 Q 232.0,136 250.0,148 Q 264.0,156 268.0,180 L 272.0,236 Q 270.0,268 262.0,296 L 258.0,330 Q 262.0,356 260.0,384 L 254.0,412 L 200.0,420 Z" fill="url(#mmBody)"/><path d="M 200.0,132 Q 168.0,136 150.0,148 Q 136.0,156 132.0,180 L 128.0,236 Q 130.0,268 138.0,296 L 142.0,330 Q 138.0,356 140.0,384 L 146.0,412 L 200.0,420 Z" fill="url(#mmBody)"/><path d="M 252.0,146 Q 278.0,154 286.0,180 L 294.0,238 Q 298.0,268 302.0,300 L 310.0,352 Q 316.0,392 318.0,424 L 322.0,452 Q 330.0,470 324.0,486 Q 314.0,496 304.0,488 L 296.0,462 L 288.0,424 L 280.0,352 L 272.0,300 L 266.0,238 L 262.0,180 Z" fill="url(#mmBody)"/><path d="M 148.0,146 Q 122.0,154 114.0,180 L 106.0,238 Q 102.0,268 98.0,300 L 90.0,352 Q 84.0,392 82.0,424 L 78.0,452 Q 70.0,470 76.0,486 Q 86.0,496 96.0,488 L 104.0,462 L 112.0,424 L 120.0,352 L 128.0,300 L 134.0,238 L 138.0,180 Z" fill="url(#mmBody)"/><path d="M 200.0,414 L 254.0,408 Q 262.0,448 260.0,486 L 252.0,548 Q 248.0,574 246.0,596 L 242.0,652 Q 238.0,700 236.0,716 Q 246.0,726 248.0,740 L 246.0,752 L 214.0,752 L 212.0,716 L 210.0,652 L 208.0,596 L 206.0,548 L 202.0,486 Z" fill="url(#mmBody)"/><path d="M 200.0,414 L 146.0,408 Q 138.0,448 140.0,486 L 148.0,548 Q 152.0,574 154.0,596 L 158.0,652 Q 162.0,700 164.0,716 Q 154.0,726 152.0,740 L 154.0,752 L 186.0,752 L 188.0,716 L 190.0,652 L 192.0,596 L 194.0,548 L 198.0,486 Z" fill="url(#mmBody)"/>
  <path d="M 700.0,26 Q 732.0,26 736.0,62 Q 738.0,88 726.0,102 Q 714.0,114 700.0,114 L 700.0,26 Z" fill="url(#mmBody)"/><path d="M 700.0,26 Q 668.0,26 664.0,62 Q 662.0,88 674.0,102 Q 686.0,114 700.0,114 L 700.0,26 Z" fill="url(#mmBody)"/><path d="M 700.0,108 L 719.0,108 L 722.0,138 L 700.0,142 Z" fill="url(#mmBody)"/><path d="M 700.0,108 L 681.0,108 L 678.0,138 L 700.0,142 Z" fill="url(#mmBody)"/><path d="M 700.0,132 Q 732.0,136 750.0,148 Q 764.0,156 768.0,180 L 772.0,236 Q 770.0,268 762.0,296 L 758.0,330 Q 762.0,356 760.0,384 L 754.0,412 L 700.0,420 Z" fill="url(#mmBody)"/><path d="M 700.0,132 Q 668.0,136 650.0,148 Q 636.0,156 632.0,180 L 628.0,236 Q 630.0,268 638.0,296 L 642.0,330 Q 638.0,356 640.0,384 L 646.0,412 L 700.0,420 Z" fill="url(#mmBody)"/><path d="M 752.0,146 Q 778.0,154 786.0,180 L 794.0,238 Q 798.0,268 802.0,300 L 810.0,352 Q 816.0,392 818.0,424 L 822.0,452 Q 830.0,470 824.0,486 Q 814.0,496 804.0,488 L 796.0,462 L 788.0,424 L 780.0,352 L 772.0,300 L 766.0,238 L 762.0,180 Z" fill="url(#mmBody)"/><path d="M 648.0,146 Q 622.0,154 614.0,180 L 606.0,238 Q 602.0,268 598.0,300 L 590.0,352 Q 584.0,392 582.0,424 L 578.0,452 Q 570.0,470 576.0,486 Q 586.0,496 596.0,488 L 604.0,462 L 612.0,424 L 620.0,352 L 628.0,300 L 634.0,238 L 638.0,180 Z" fill="url(#mmBody)"/><path d="M 700.0,414 L 754.0,408 Q 762.0,448 760.0,486 L 752.0,548 Q 748.0,574 746.0,596 L 742.0,652 Q 738.0,700 736.0,716 Q 746.0,726 748.0,740 L 746.0,752 L 714.0,752 L 712.0,716 L 710.0,652 L 708.0,596 L 706.0,548 L 702.0,486 Z" fill="url(#mmBody)"/><path d="M 700.0,414 L 646.0,408 Q 638.0,448 640.0,486 L 648.0,548 Q 652.0,574 654.0,596 L 658.0,652 Q 662.0,700 664.0,716 Q 654.0,726 652.0,740 L 654.0,752 L 686.0,752 L 688.0,716 L 690.0,652 L 692.0,596 L 694.0,548 L 698.0,486 Z" fill="url(#mmBody)"/>
</svg>`;

// Warstwa anatomiczna: "deep" leży pod "surface". Przełącznik w interfejsie
// pokazuje jedną naraz, dzięki czemu mięśnie głębokie przestają być zasłonięte.
const MUSCLE_LAYER = {
  platysma:"surface",
  sternocleidomastoid:"deep",
  scalenes:"deep",
  deltoid_front:"surface",
  pectoralis:"surface",
  serratus:"deep",
  rectus_abdominis:"surface",
  obliques:"surface",
  biceps:"surface",
  forearm_front:"surface",
  quadriceps:"surface",
  sartorius:"surface",
  adductors:"deep",
  tibialis:"surface",
  trapezius:"surface",
  deltoid_back:"surface",
  infraspinatus:"deep",
  latissimus:"surface",
  erector_spinae:"deep",
  triceps:"surface",
  forearm_back:"surface",
  gluteus:"surface",
  hamstrings:"surface",
  gastrocnemius:"surface",
};

const FRONT_PATHS = {
  platysma:["M 200.0,110 L 216.0,110 Q 223.0,126 221.0,144 L 206.0,148 L 200.0,147 Z","M 200.0,110 L 184.0,110 Q 177.0,126 179.0,144 L 194.0,148 L 200.0,147 Z"],
  sternocleidomastoid:["M 201.0,112 Q 213.0,118 214.0,133 Q 212.0,144 205.0,148 L 200.0,147 Q 204.0,130 200.0,113 Z","M 199.0,112 Q 187.0,118 186.0,133 Q 188.0,144 195.0,148 L 200.0,147 Q 196.0,130 200.0,113 Z"],
  scalenes:["M 213.0,119 Q 222.0,129 221.0,143 L 214.0,145 Q 215.0,132 209.0,123 Z","M 187.0,119 Q 178.0,129 179.0,143 L 186.0,145 Q 185.0,132 191.0,123 Z"],
  deltoid_front:["M 234.0,146 Q 266.0,152 282.0,184 L 288.0,214 Q 272.0,225 258.0,214 L 250.0,176 Q 243.0,156 234.0,146 Z","M 166.0,146 Q 134.0,152 118.0,184 L 112.0,214 Q 128.0,225 142.0,214 L 150.0,176 Q 157.0,156 166.0,146 Z"],
  pectoralis:["M 205.0,150 L 236.0,147 Q 252.0,159 254.0,183 Q 249.0,208 229.0,219 L 205.0,222 Z","M 195.0,150 L 164.0,147 Q 148.0,159 146.0,183 Q 151.0,208 171.0,219 L 195.0,222 Z"],
  serratus:["M 234.0,224 L 250.0,215 L 254.0,229 L 244.0,233 L 254.0,239 L 244.0,245 L 254.0,251 L 248.0,264 L 234.0,256 Z","M 166.0,224 L 150.0,215 L 146.0,229 L 156.0,233 L 146.0,239 L 156.0,245 L 146.0,251 L 152.0,264 L 166.0,256 Z"],
  rectus_abdominis:["M 204.0,226 L 231.0,222 Q 233.0,284 227.0,330 L 220.0,358 L 204.0,360 Z","M 196.0,226 L 169.0,222 Q 167.0,284 173.0,330 L 180.0,358 L 196.0,360 Z"],
  obliques:["M 233.0,224 L 256.0,218 Q 259.0,256 252.0,292 L 238.0,330 L 222.0,352 L 229.0,304 Z","M 167.0,224 L 144.0,218 Q 141.0,256 148.0,292 L 162.0,330 L 178.0,352 L 171.0,304 Z"],
  biceps:["M 254.0,196 Q 277.0,206 284.0,240 L 289.0,286 Q 274.0,297 261.0,289 L 257.0,240 Z","M 146.0,196 Q 123.0,206 116.0,240 L 111.0,286 Q 126.0,297 139.0,289 L 143.0,240 Z"],
  forearm_front:["M 263.0,302 Q 284.0,311 291.0,347 L 299.0,404 Q 288.0,417 277.0,409 L 272.0,353 Z","M 137.0,302 Q 116.0,311 109.0,347 L 101.0,404 Q 112.0,417 123.0,409 L 128.0,353 Z"],
  quadriceps:["M 209.0,428 L 252.0,420 Q 260.0,466 256.0,504 L 250.0,548 L 213.0,550 L 207.0,474 Z","M 191.0,428 L 148.0,420 Q 140.0,466 144.0,504 L 150.0,548 L 187.0,550 L 193.0,474 Z"],
  sartorius:["M 245.0,422 L 255.0,430 Q 230.0,478 218.0,514 L 212.0,548 L 203.0,546 Q 214.0,500 232.0,458 Z","M 155.0,422 L 145.0,430 Q 170.0,478 182.0,514 L 188.0,548 L 197.0,546 Q 186.0,500 168.0,458 Z"],
  adductors:["M 200.0,426 L 219.0,432 Q 216.0,478 209.0,522 L 200.0,524 Z","M 200.0,426 L 181.0,432 Q 184.0,478 191.0,522 L 200.0,524 Z"],
  tibialis:["M 215.0,560 L 238.0,556 Q 241.0,616 236.0,672 L 229.0,702 L 220.0,700 L 217.0,624 Z","M 185.0,560 L 162.0,556 Q 159.0,616 164.0,672 L 171.0,702 L 180.0,700 L 183.0,624 Z"],
};
const BACK_PATHS = {
  trapezius:["M 700.0,130 L 716.0,134 Q 744.0,142 758.0,159 L 749.0,185 L 731.0,197 L 700.0,254 Z","M 700.0,130 L 684.0,134 Q 656.0,142 642.0,159 L 651.0,185 L 669.0,197 L 700.0,254 Z"],
  deltoid_back:["M 746.0,152 Q 774.0,160 782.0,188 L 787.0,216 Q 771.0,227 757.0,216 L 749.0,182 Z","M 654.0,152 Q 626.0,160 618.0,188 L 613.0,216 Q 629.0,227 643.0,216 L 651.0,182 Z"],
  infraspinatus:["M 714.0,198 L 746.0,192 L 752.0,222 L 732.0,236 L 712.0,222 Z","M 686.0,198 L 654.0,192 L 648.0,222 L 668.0,236 L 688.0,222 Z"],
  latissimus:["M 700.0,258 L 734.0,204 Q 754.0,220 759.0,256 Q 757.0,300 744.0,326 L 700.0,336 Z","M 700.0,258 L 666.0,204 Q 646.0,220 641.0,256 Q 643.0,300 656.0,326 L 700.0,336 Z"],
  erector_spinae:["M 700.0,194 L 713.0,199 Q 717.0,270 712.0,340 L 700.0,346 Z","M 700.0,194 L 687.0,199 Q 683.0,270 688.0,340 L 700.0,346 Z"],
  triceps:["M 756.0,198 Q 779.0,209 786.0,244 L 791.0,288 Q 776.0,299 763.0,291 L 759.0,244 Z","M 644.0,198 Q 621.0,209 614.0,244 L 609.0,288 Q 624.0,299 637.0,291 L 641.0,244 Z"],
  forearm_back:["M 766.0,304 Q 787.0,313 794.0,348 L 802.0,406 Q 791.0,419 780.0,411 L 775.0,355 Z","M 634.0,304 Q 613.0,313 606.0,348 L 598.0,406 Q 609.0,419 620.0,411 L 625.0,355 Z"],
  gluteus:["M 700.0,338 L 742.0,328 Q 759.0,350 758.0,382 Q 745.0,410 700.0,414 Z","M 700.0,338 L 658.0,328 Q 641.0,350 642.0,382 Q 655.0,410 700.0,414 Z"],
  hamstrings:["M 707.0,420 L 752.0,415 Q 759.0,462 753.0,506 L 746.0,548 L 711.0,550 L 705.0,474 Z","M 693.0,420 L 648.0,415 Q 641.0,462 647.0,506 L 654.0,548 L 689.0,550 L 695.0,474 Z"],
  gastrocnemius:["M 712.0,556 L 747.0,552 Q 753.0,604 745.0,650 L 733.0,686 L 716.0,684 L 710.0,632 Z","M 688.0,556 L 653.0,552 Q 647.0,604 655.0,650 L 667.0,686 L 684.0,684 L 690.0,632 Z"],
};


// Kadry sylwetki: pełny (obie strony obok siebie) oraz pojedyncze — na wąskich
// ekranach dwie sylwetki naraz są za małe, żeby trafić w mięsień palcem.
const BODY_VIEW = { both:"0 0 900 780", front:"85 10 235 765", back:"585 10 235 765" };

function BodySVG({selected,hovered,onHover,onClick,layer,viewBox=BODY_VIEW.both,plan=null}){
  const entries=[...Object.entries(FRONT_PATHS),...Object.entries(BACK_PATHS)];
  const markup=BODY_SVG_MARKUP.replace('viewBox="0 0 900 780"',`viewBox="${viewBox}"`);
  return(
    <div style={{position:"relative",width:"100%",lineHeight:0}}>
      <div dangerouslySetInnerHTML={{__html:markup}} style={{display:"block"}}/>
      <svg viewBox={viewBox} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%"}}>
        {entries.map(([id,dArr])=>{
          const m=MUSCLES[id];
          const onLayer=MUSCLE_LAYER[id]===layer;
          const isHov=hovered===id, isSel=selected===id;
          // Rola w wybranym dniu planu: główna partia, mięsień wspomagający
          // albo nic. Bez planu wszystkie mięśnie są równorzędne.
          const role=plan?(plan.primary.has(id)?"primary":plan.support.has(id)?"support":"off"):null;
          // Mięsień spoza wybranej warstwy zostaje ledwie widocznym tłem i nie
          // reaguje na kliknięcia — to on zasłaniał wcześniej to, co pod nim.
          // Przy aktywnym planie mięśnie dnia prześwitują też spod warstwy,
          // żeby było widać, że coś tam jest — kliknąć da się po zmianie warstwy.
          const fill=role
            ?(onLayer
              ?(role==="primary"?(isSel?0.95:isHov?0.9:0.82):role==="support"?(isSel||isHov?0.6:0.42):isHov?0.22:0.1)
              :(role==="primary"?0.3:role==="support"?0.16:0.05))
            :(!onLayer?0.06:isSel?0.95:isHov?0.8:0.62);
          const outlined=onLayer&&(isSel||isHov||role==="primary");
          const glow=isSel||(onLayer&&role==="primary");
          return dArr.map((d,i)=>(
            <path key={id+i} d={d} fill={m?.color||"#fff"} fillOpacity={fill}
              stroke={outlined?"#fff":"#0e0e10"}
              strokeWidth={isSel?1.8:role==="primary"&&onLayer?1.5:isHov?1.4:1}
              strokeOpacity={onLayer?(outlined?0.9:0.55):0.25}
              style={{cursor:onLayer?"pointer":"default",pointerEvents:onLayer?"all":"none",
                filter:glow?`drop-shadow(0 0 7px ${m?.color}bb)`:"none",
                transition:"fill-opacity 0.14s, filter 0.14s"}}
              onMouseEnter={()=>onLayer&&onHover(id)} onMouseLeave={()=>onHover(null)}
              onClick={()=>onLayer&&onClick(id)}/>
          ));
        })}
      </svg>
    </div>
  );
}

function ExercisePanel({muscleId,onClose}){
  const m=MUSCLES[muscleId];
  if(!m)return null;
  const machine=m.exercises.filter(e=>e.icon==="⚙️");
  const free=m.exercises.filter(e=>e.icon!=="⚙️");
  const renderGroup=(list,title,badge)=>(
    <div style={{marginBottom:16}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:m.color,marginBottom:10,fontFamily:"monospace",display:"flex",alignItems:"center",gap:6}}><span>{badge}</span> {title}</div>
      {list.map((ex,i)=>(
        <div key={i} style={{background:"#0a0a0a",border:`1px solid ${m.color}28`,borderLeft:`3px solid ${m.color}`,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:6}}>
            <span style={{fontSize:18,flexShrink:0}}>{ex.icon}</span>
            <div>
              <div style={{fontSize:13.5,fontWeight:600,color:"#f0f0f0",lineHeight:1.35}}>{ex.name}</div>
              <div style={{display:"inline-block",marginTop:3,fontSize:10,fontWeight:700,background:m.color+"30",color:m.color,padding:"1px 8px",borderRadius:20}}>{ex.sets}</div>
            </div>
          </div>
          <div style={{fontSize:11.5,color:"#9a9a9a",lineHeight:1.55,paddingLeft:26}}>💡 {ex.tip}</div>
        </div>
      ))}
    </div>
  );
  return(
    <div style={{position:"absolute",inset:0,background:"#0f1117",borderRadius:14,display:"flex",flexDirection:"column",zIndex:10,overflow:"hidden"}}>
      <div style={{background:m.color+"22",borderBottom:`1px solid ${m.color}44`,padding:"16px 20px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",color:m.color,marginBottom:4,fontFamily:"monospace"}}>{m.side==="front"?"▶ WIDOK: PRZÓD":"◀ WIDOK: TYŁ"}</div>
            <div style={{fontSize:17,fontWeight:700,color:"#f0f0f0",lineHeight:1.25}}>{m.name}</div>
            <div style={{fontSize:11,color:"#888",fontStyle:"italic",marginTop:2}}>{m.latin}</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,color:"#aaa",cursor:"pointer",fontSize:18,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginLeft:12}}>×</button>
        </div>
        <div style={{marginTop:10,fontSize:11.5,color:"#bbb",lineHeight:1.55}}><span style={{color:"#777",fontSize:10,fontWeight:600,letterSpacing:"0.08em"}}>FUNKCJA — </span>{m.function}</div>
      </div>
      <div style={{overflowY:"auto",flex:1,padding:"14px 16px 20px"}}>
        {machine.length>0&&renderGroup(machine,"NA MASZYNACH","⚙️")}
        {free.length>0&&renderGroup(free,"BEZ MASZYN","🤸")}
      </div>
    </div>
  );
}

// Kafel jednego ćwiczenia z planu — obciążenie trzymamy osobno od serii,
// bo w oryginale to dwie różne kolumny tabeli.
function PlanExercise({ex,accent}){
  return(
    <div style={{background:"#0a0a0a",border:`1px solid ${accent}28`,borderLeft:`3px solid ${accent}`,borderRadius:10,padding:"11px 13px",marginBottom:9}}>
      <div style={{fontSize:13.5,fontWeight:600,color:"#f0f0f0",lineHeight:1.35}}>{ex.name}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:5}}>
        <span style={{fontSize:10,fontWeight:700,background:accent+"30",color:accent,padding:"1px 8px",borderRadius:20}}>{ex.sets}</span>
        <span style={{fontSize:10,fontWeight:700,background:"rgba(255,255,255,0.06)",color:"#aaa",padding:"1px 8px",borderRadius:20}}>{ex.load}</span>
      </div>
      <div style={{fontSize:11.5,color:"#9a9a9a",lineHeight:1.55,marginTop:7}}>{ex.desc}</div>
    </div>
  );
}

function PlanDayPanel({plan,dayKey,day,age,hovered,onPickMuscle,isMobile}){
  const label=WEEKDAYS.find(d=>d.key===dayKey)?.label||"";
  // Akcent karty bierzemy z pierwszego mięśnia dnia, żeby kolor panelu zgadzał
  // się z tym, co świeci na sylwetce.
  const accent=MUSCLES[day.primary[0]]?.color||"#5DCAA5";
  const hm=hovered?MUSCLES[hovered]:null;
  const chip=(id,primary)=>{
    const m=MUSCLES[id];
    if(!m)return null;
    return(
      <button key={id} onClick={()=>onPickMuscle(id)} title={`${m.name} — ${MUSCLE_LAYER[id]==="deep"?"warstwa głęboka":"warstwa powierzchowna"}`}
        style={{background:primary?m.color+"33":"transparent",border:`1px solid ${m.color}${primary?"88":"44"}`,
          borderRadius:20,padding:"3px 10px",color:primary?"#f0f0f0":"#9a9a9a",fontSize:11,fontWeight:primary?600:500,cursor:"pointer"}}>
        <span style={{color:m.color,marginRight:5}}>●</span>{m.name}
      </button>
    );
  };
  const hr=day.cardio&&maxHeartRate(age);
  return(
    <div style={{display:"flex",flexDirection:"column",maxHeight:isMobile?"none":640}}>
      <div style={{background:accent+"1e",borderBottom:`1px solid ${accent}44`,padding:"14px 16px 12px",flexShrink:0}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",color:accent,fontFamily:"monospace",marginBottom:4}}>{plan.name.toUpperCase()} · {label.toUpperCase()}</div>
        <div style={{fontSize:17,fontWeight:700,color:"#f0f0f0",lineHeight:1.25}}>{day.title}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
          {day.primary.map(id=>chip(id,true))}
          {day.support.map(id=>chip(id,false))}
        </div>
        {day.support.length>0&&<div style={{fontSize:10.5,color:"#666",marginTop:8}}>Wypełnione — partia dnia. Obrysowane — mięśnie wspomagające.</div>}
      </div>
      <div style={{padding:"6px 16px",borderBottom:"1px solid #1e2130",fontSize:11,color:hm?hm.color:"#444",flexShrink:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
        {hm?<>● {hm.name} — kliknij, aby zobaczyć ćwiczenia</>:<>Kliknij mięsień na sylwetce lub etykietę powyżej</>}
      </div>
      <div style={{overflowY:isMobile?"visible":"auto",flex:1,padding:"12px 16px 18px"}}>
        {day.remark&&<div style={{fontSize:11.5,color:"#c8a24a",background:"#2a1e00",border:"1px solid #4a3a10",borderRadius:8,padding:"8px 11px",marginBottom:11,lineHeight:1.5}}>{day.remark}</div>}
        {day.rest&&<div style={{fontSize:12.5,color:"#9a9a9a",lineHeight:1.65}}>{day.desc}</div>}
        {day.cardio&&(
          <div style={{background:"#0a0a0a",border:`1px solid ${accent}28`,borderLeft:`3px solid ${accent}`,borderRadius:10,padding:"12px 13px",marginBottom:10}}>
            <div style={{fontSize:13.5,fontWeight:600,color:"#f0f0f0"}}>{day.cardio.machine}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
              <span style={{fontSize:10,fontWeight:700,background:accent+"30",color:accent,padding:"1px 8px",borderRadius:20}}>{day.cardio.minutes} min</span>
              <span style={{fontSize:10,fontWeight:700,background:"rgba(255,255,255,0.06)",color:"#aaa",padding:"1px 8px",borderRadius:20}}>{day.cardio.hrFrom}–{day.cardio.hrTo}% HRmax</span>
            </div>
            <div style={{fontSize:11.5,color:"#9a9a9a",lineHeight:1.55,marginTop:8}}>
              Tętno maksymalne wg wzoru <span style={{color:"#c9c9c9",fontFamily:"monospace"}}>208 − 0,7 × wiek</span> — dokładniejszego niż popularne 220 − wiek.
            </div>
            {hr?(
              <div style={{marginTop:9,paddingTop:9,borderTop:"1px solid #1c1c1c",fontSize:12,color:"#c9c9c9",lineHeight:1.7}}>
                Dla Twoich <b>{age} lat</b>: HRmax ≈ <b style={{color:accent}}>{hr}</b> ud./min,
                <br/>zakres treningowy <b style={{color:accent}}>{Math.round(hr*day.cardio.hrFrom/100)}–{Math.round(hr*day.cardio.hrTo/100)}</b> ud./min.
              </div>
            ):(
              <div style={{marginTop:9,paddingTop:9,borderTop:"1px solid #1c1c1c",fontSize:11.5,color:"#666"}}>
                Podaj wiek w zakładce „Kalorie &amp; BMI”, a policzę Twój zakres w uderzeniach na minutę.
              </div>
            )}
          </div>
        )}
        {day.exercises.map((ex,i)=><PlanExercise key={i} ex={ex} accent={accent}/>)}
        {plan.note&&<div style={{marginTop:6,fontSize:10.5,color:"#5a5a5a",lineHeight:1.6,borderTop:"1px solid #1a1a1a",paddingTop:10}}>{plan.note}</div>}
      </div>
    </div>
  );
}

function MuscleMap({profile}){
  const isMobile=useMedia(MOBILE);
  const [hovered,setHovered]=useState(null);
  const [selected,setSelected]=useState(null);
  const [side,setSide]=useState("front");
  const [layer,setLayer]=useState("surface");
  const [planId,setPlanId]=useState(null);
  const [dayKey,setDayKey]=useState(todayKey);
  const hoveredMuscle=hovered?MUSCLES[hovered]:null;
  const plan=TRAINING_PLANS.find(p=>p.id===planId)||null;
  const day=plan?plan.days[dayKey]:null;
  // Zbiory zamiast tablic — BodySVG pyta o przynależność raz na mięsień.
  const planHl=day?{primary:new Set(day.primary),support:new Set(day.support)}:null;
  // Partia dnia potrafi leżeć w obu warstwach (np. plecy: najszerszy jest
  // powierzchowny, prostownik głęboki). Podpowiadamy przełączenie zamiast
  // ukrywać połowę dnia.
  const hiddenPrimary=day?day.primary.filter(id=>MUSCLE_LAYER[id]!==layer):[];
  const pickPlan=id=>{
    setPlanId(prev=>prev===id?null:id);
    setDayKey(todayKey());
    setSelected(null);setHovered(null);
  };
  const pickMuscle=id=>{
    setLayer(MUSCLE_LAYER[id]);
    setSelected(id);setHovered(null);
  };
  // na desktopie pokazujemy obie sylwetki naraz, na telefonie jedną wybraną
  const viewBox=isMobile?BODY_VIEW[side]:BODY_VIEW.both;
  const switchLayer=l=>{
    setLayer(l);
    if(selected&&MUSCLE_LAYER[selected]!==l)setSelected(null);
    setHovered(null);
  };
  const countIn=l=>Object.values(MUSCLE_LAYER).filter(x=>x===l).length;
  return(
    <div>
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:11,letterSpacing:"0.2em",color:"#5DCAA5",fontWeight:600,fontFamily:"monospace",marginBottom:6}}>ANATOMIA INTERAKTYWNA</div>
        <div style={{fontSize:isMobile?18:22,fontWeight:700,color:"#f5f5f0"}}>Mapa Mięśni Człowieka</div>
        <div style={{marginTop:6,fontSize:12,color:"#666"}}>{isMobile?"Dotknij mięśnia, aby zobaczyć ćwiczenia":"Najedź, aby podejrzeć · Kliknij, aby zobaczyć ćwiczenia"}</div>
      </div>
      <div style={{background:"#13161f",border:"1px solid #1e2130",borderRadius:14,padding:isMobile?"12px 12px 14px":"14px 16px 16px",marginBottom:16}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",color:"#5DCAA5",fontFamily:"monospace",marginBottom:9}}>PLAN TRENINGOWY</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {TRAINING_PLANS.map(p=>(
            <button key={p.id} onClick={()=>pickPlan(p.id)} style={{background:planId===p.id?"#5DCAA522":"#0d0f16",
              border:`1px solid ${planId===p.id?"#5DCAA5":"#262a38"}`,borderRadius:10,padding:"8px 14px",
              color:planId===p.id?"#5DCAA5":"#9a9a9a",fontWeight:600,fontSize:13,cursor:"pointer"}}>
              {planId===p.id?"✓ ":""}{p.name}
            </button>
          ))}
          {plan&&(
            <button onClick={()=>pickPlan(planId)} style={{background:"transparent",border:"1px solid #262a38",borderRadius:10,
              padding:"8px 14px",color:"#666",fontWeight:600,fontSize:13,cursor:"pointer"}}>Wyłącz plan</button>
          )}
        </div>
        {plan&&(
          <>
            <div style={{fontSize:11.5,color:"#7a7a7a",marginTop:10,lineHeight:1.5}}>{plan.summary}</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(4,1fr)":"repeat(7,1fr)",gap:6,marginTop:12}}>
              {WEEKDAYS.map(w=>{
                const d=plan.days[w.key];
                const on=dayKey===w.key, isToday=todayKey()===w.key;
                const c=MUSCLES[d.primary[0]]?.color||"#5a5a5a";
                return(
                  <button key={w.key} onClick={()=>{setDayKey(w.key);setSelected(null);}}
                    style={{background:on?c+"26":"#0d0f16",border:`1px solid ${on?c:"#262a38"}`,borderRadius:10,
                      padding:"7px 4px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <span style={{fontSize:9.5,fontWeight:700,letterSpacing:"0.08em",fontFamily:"monospace",color:on?c:"#5a5a5a"}}>
                      {w.short.toUpperCase()}{isToday?" •":""}
                    </span>
                    <span style={{fontSize:11,fontWeight:600,color:on?"#f0f0f0":d.rest?"#4a4a4a":"#8a8a8a"}}>{d.short}</span>
                  </button>
                );
              })}
            </div>
            <div style={{fontSize:10.5,color:"#4a4a4a",marginTop:7}}>Kropka oznacza dzisiejszy dzień.</div>
          </>
        )}
      </div>

      <div style={{display:"flex",gap:4,background:"#161616",borderRadius:10,padding:4,marginBottom:14,maxWidth:420,marginLeft:"auto",marginRight:"auto"}}>
        {[["surface","Powierzchowne"],["deep","Głębokie"]].map(([k,l])=>(
          <button key={k} onClick={()=>switchLayer(k)} style={{flex:1,background:layer===k?"#2a2a2a":"transparent",
            border:"none",borderRadius:8,padding:"9px 6px",color:layer===k?"#fff":"#666",fontWeight:600,
            cursor:"pointer",fontSize:12.5,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            {l}<span style={{fontSize:10,color:layer===k?"#777":"#4a4a4a"}}>{countIn(k)}</span>
          </button>
        ))}
      </div>
      <div style={{fontSize:11,color:"#5a5a5a",textAlign:"center",marginBottom:14,lineHeight:1.5}}>
        {layer==="surface"
          ? "Warstwa powierzchowna — mięśnie widoczne bezpośrednio pod skórą."
          : "Warstwa głęboka — mięśnie leżące pod powierzchownymi, te przygaszone są nad nimi."}
        {hiddenPrimary.length>0&&(
          <div style={{marginTop:6,color:"#c8a24a"}}>
            {hiddenPrimary.length===1?"Jeden mięsień":`${hiddenPrimary.length} mięśnie`} z tego dnia leży w drugiej warstwie —{" "}
            <button onClick={()=>switchLayer(layer==="surface"?"deep":"surface")}
              style={{background:"none",border:"none",padding:0,color:"#c8a24a",textDecoration:"underline",cursor:"pointer",font:"inherit"}}>
              przełącz warstwę
            </button>.
          </div>
        )}
      </div>

      <div style={{display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
        <div style={{flex:"1 1 340px",minWidth:0}}>
          {isMobile?(
            <div style={{display:"flex",gap:4,background:"#161616",borderRadius:10,padding:4,marginBottom:8}}>
              {[["front","PRZÓD"],["back","TYŁ"]].map(([k,l])=>(
                <button key={k} onClick={()=>setSide(k)} style={{flex:1,background:side===k?"#2a2a2a":"transparent",border:"none",borderRadius:8,padding:"8px",color:side===k?"#fff":"#666",fontWeight:700,fontSize:11,letterSpacing:"0.15em",fontFamily:"monospace",cursor:"pointer"}}>{l}</button>
              ))}
            </div>
          ):(
            <div style={{display:"flex",justifyContent:"space-around",marginBottom:6}}>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.15em",color:"#444",fontFamily:"monospace"}}>PRZÓD</span>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.15em",color:"#444",fontFamily:"monospace"}}>TYŁ</span>
            </div>
          )}
          <div style={{borderRadius:12,border:"1px solid #1e2130",overflow:"hidden"}}>
            <BodySVG viewBox={viewBox} layer={layer} plan={planHl} selected={selected} hovered={hovered} onHover={setHovered} onClick={id=>setSelected(p=>p===id?null:id)}/>
          </div>
        </div>
        <div style={{flex:"1 1 260px",minWidth:0,minHeight:selected?460:isMobile?0:460,background:"#13161f",border:`1px solid ${selected?MUSCLES[selected]?.color+"55":day?(MUSCLES[day.primary[0]]?.color||"#5DCAA5")+"44":"#1e2130"}`,borderRadius:14,position:"relative",overflow:"hidden"}}>
          {!selected&&day&&(
            <PlanDayPanel plan={plan} dayKey={dayKey} day={day} age={profile?.ageYears??null}
              hovered={hovered} onPickMuscle={pickMuscle} isMobile={isMobile}/>
          )}
          {!selected&&!day&&(
            <div style={{padding:"20px 18px"}}>
              {hoveredMuscle?(
                <div>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",color:hoveredMuscle.color,marginBottom:6,fontFamily:"monospace"}}>{hoveredMuscle.side==="front"?"▶ PRZÓD":"◀ TYŁ"}</div>
                  <div style={{fontSize:18,fontWeight:700,color:"#f0f0f0",marginBottom:4}}>{hoveredMuscle.name}</div>
                  <div style={{fontSize:11.5,color:"#666",fontStyle:"italic",marginBottom:14}}>{hoveredMuscle.latin}</div>
                  <div style={{width:40,height:2,background:hoveredMuscle.color,borderRadius:2,marginBottom:14}}/>
                  <div style={{fontSize:12,color:"#888",lineHeight:1.6,marginBottom:8}}><span style={{color:"#555",fontSize:10,fontWeight:700,letterSpacing:"0.08em"}}>FUNKCJA</span><br/>{hoveredMuscle.function}</div>
                  <div style={{fontSize:12,color:"#888",lineHeight:1.6}}><span style={{color:"#555",fontSize:10,fontWeight:700,letterSpacing:"0.08em"}}>LOKALIZACJA</span><br/>{hoveredMuscle.location}</div>
                  <div style={{marginTop:20,fontSize:11,color:"#444",display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14}}>👆</span> Kliknij, aby zobaczyć ćwiczenia</div>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:isMobile?130:400,color:"#333",textAlign:"center",gap:12}}>
                  <div style={{fontSize:isMobile?28:36}}>🫀</div>
                  <div style={{fontSize:13,lineHeight:1.7,maxWidth:180}}>
                    {isMobile
                      ?<>Dotknij mięśnia na sylwetce, aby otworzyć plan ćwiczeń.</>
                      :<>Najedź na mięsień na sylwetce, aby zobaczyć szczegóły.<br/><br/><span style={{color:"#444"}}>Kliknij, aby otworzyć plan ćwiczeń.</span></>}
                  </div>
                </div>
              )}
            </div>
          )}
          {selected&&<ExercisePanel muscleId={selected} onClose={()=>setSelected(null)}/>}
        </div>
      </div>
    </div>
  );
}


function LoginScreen({onLogged}){
  const [login,setLogin]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  const submit=async e=>{
    e.preventDefault();
    if(busy)return;
    setBusy(true);setError("");
    try{
      const {user}=await api.login(login,password);
      onLogged(user);
    }catch(err){
      setError(err.message);
      setPassword("");
    }finally{
      setBusy(false);
    }
  };

  const field={width:"100%",background:"#0a0a0a",border:"1px solid #333",borderRadius:10,
    padding:"12px 14px",color:"#fff",fontSize:15,outline:"none",boxSizing:"border-box"};

  return(
    <div style={{background:"#0a0a0a",minHeight:"100vh",display:"flex",alignItems:"center",
      justifyContent:"center",padding:20,fontFamily:"'Inter',sans-serif",color:"#f1f1f1"}}>
      <form onSubmit={submit} style={{width:"100%",maxWidth:360,background:"#161616",
        border:"1px solid #1e1e1e",borderRadius:16,padding:28}}>
        <h1 style={{margin:"0 0 4px",fontSize:24,fontWeight:700}}>Tracker</h1>
        <p style={{margin:"0 0 22px",color:"#888",fontSize:13}}>Zaloguj się, aby zobaczyć swoje dane.</p>

        <label style={{fontSize:12,color:"#888",display:"block",marginBottom:6}}>Login</label>
        <input value={login} onChange={e=>setLogin(e.target.value)} autoFocus autoComplete="username"
          style={{...field,marginBottom:14}}/>

        <label style={{fontSize:12,color:"#888",display:"block",marginBottom:6}}>Hasło</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
          autoComplete="current-password" style={{...field,marginBottom:18}}/>

        {error&&(
          <div style={{background:"#2a0f0f",border:"1px solid #6b2020",borderRadius:10,
            padding:"10px 12px",color:"#f87171",fontSize:13,marginBottom:16}}>{error}</div>
        )}

        <button type="submit" disabled={busy||!login||!password}
          style={{width:"100%",padding:"13px",borderRadius:10,border:"none",fontWeight:700,fontSize:15,
            background:busy||!login||!password?"#222":"linear-gradient(135deg,#667eea,#764ba2)",
            color:busy||!login||!password?"#555":"#fff",
            cursor:busy||!login||!password?"not-allowed":"pointer"}}>
          {busy?"Logowanie…":"Zaloguj"}
        </button>

        <p style={{margin:"18px 0 0",color:"#555",fontSize:11,lineHeight:1.6}}>
          Rejestracja jest zamknięta. Konto zakłada administrator instancji
          skryptem <code style={{color:"#777"}}>create-user.sh</code>.
        </p>
      </form>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile=useMedia(MOBILE);
  const isNarrow=useMedia(NARROW);
  const isWide=useMedia(WIDE);
  const [habits,setHabits]=useState([]);
  const [habitLogs,setHabitLogs]=useState({});
  const [editTimeId,setEditTimeId]=useState(null);
  const [editNameId,setEditNameId]=useState(null);
  const [editNameVal,setEditNameVal]=useState("");
  const [showForm,setShowForm]=useState(false);
  const [newName,setNewName]=useState("");
  const [newCat,setNewCat]=useState("Zdrowie");
  const [newTime,setNewTime]=useState("");
  const [progressView,setProgressView]=useState({});

  const [user,setUser]=useState(null);
  const [authChecked,setAuthChecked]=useState(false);
  const [profile,setProfile]=useState({weight:"",height:"",age:"",sex:"M",activity:1});
  const [serverProfile,setServerProfile]=useState(null);
  const [offQuery,setOffQuery]=useState("");
  const [offResults,setOffResults]=useState(null);   // null = tryb bazy lokalnej
  const [offLoading,setOffLoading]=useState(false);
  const [calDate,setCalDate]=useState(today());
  const [modal,setModal]=useState(false);
  const [search,setSearch]=useState("");
  const [selCat,setSelCat]=useState("Wszystkie");
  const [grams,setGrams]=useState(100);
  const [selFood,setSelFood]=useState(null);
  const [showCustomForm,setShowCustomForm]=useState(false);
  const [customForm,setCustomForm]=useState({name:"",cal:"",p:"",c:"",f:""});

  const [mainTab,setMainTab]=useState("nawyki");

  // ── DOŁEK STATE ──
  const [dolekLevel,setDolekLevel]=useState(null);
  const [dolekCompleted,setDolekCompleted]=useState({l1:[],l2:[],l3:[]});
  const [dolekExpanded,setDolekExpanded]=useState({});
  const [kotwice,setKotwice]=useState([]);
  const [kotwicaInput,setKotwicaInput]=useState("");
  const [kotwicaEmoji,setKotwicaEmoji]=useState("🎵");

  const TECHNIQUES={
    l1:[
      {icon:"💨",name:"Oddech fizjologiczny",time:"2 min",desc:"Najszybszy sposób na obniżenie kortyzolu. Podwójny wdech aktywuje nerw błędny i dosłownie zmienia stan układu nerwowego w ciągu sekund.",steps:["Wciągnij powietrze nosem przez 4 sekundy","Zrób krótki dodatkowy wdech nosem (doładowanie płuc)","Wydychaj powoli ustami przez 6–8 sekund","Powtórz 3–5 razy — poczujesz jak ciało zwalnia"]},
      {icon:"🌊",name:"Zimna woda na twarz",time:"1 min",desc:"Reset fizjologiczny. Zimna woda aktywuje odruch nurkowy — gwałtownie spowalnia tętno i uspokaja układ nerwowy.",steps:["Idź do łazienki","Nabierz zimnej wody w dłonie","Przemyj twarz, czoło, skronie i szyję","Powtórz 2–3 razy"]},
      {icon:"👁️",name:"Technika 5-4-3-2-1",time:"3 min",desc:"Uziemienie sensoryczne — wyciąga umysł z pętli myślowej i przenosi uwagę do tu i teraz.",steps:["5 rzeczy które WIDZISZ — nazwij je w myślach","4 rzeczy których możesz DOTKNĄĆ — dotknij każdej","3 rzeczy które SŁYSZYSZ — wsłuchaj się aktywnie","2 rzeczy które CZUJESZ zapachem","1 rzecz którą SMAKUJESZ"]},
      {icon:"🏃",name:"Mini ruch fizyczny",time:"2 min",desc:"Ruch spala kortyzol i adrenalinę nagromadzone w ciele. Cokolwiek wystarczy żeby zmienić stan.",steps:["Wstań od komputera — to najważniejszy krok","10 przysiadów lub 20 podskoków w miejscu","Albo szybki marsz po mieszkaniu przez 2 minuty","Powtórz jeśli poczułeś że pomaga"]},
    ],
    l2:[
      {icon:"📝",name:"Brain dump",time:"10 min",desc:"Wypisanie myśli na zewnątrz zmniejsza ich intensywność w środku. Pisz bez cenzury — nikt tego nie zobaczy.",steps:["Weź kartkę lub otwórz pusty plik","Pisz przez 10 minut co czujesz i myślisz — bez zatrzymywania","Nie redaguj, nie oceniaj, nie poprawiaj","Po skończeniu przeczytaj raz i zaznacz co jest faktem, a co interpretacją"]},
      {icon:"🔍",name:"Co dokładnie boli?",time:"5 min",desc:"Każdy rodzaj bólu wymaga innej odpowiedzi. Zmęczenie to nie to samo co poczucie porażki. Precyzja ma znaczenie.",steps:["Zapytaj siebie: czy to zmęczenie fizyczne lub psychiczne?","Czy to poczucie porażki, wstydu lub rozczarowania sobą?","Czy to samotność — brak kontaktu z ludźmi?","Czy to stagnacja — poczucie że nic się nie zmienia?","Zapisz odpowiedź — wskazuje co naprawdę potrzebujesz"]},
      {icon:"🧠",name:"Defuzja poznawcza",time:"3 min",desc:"Technika z ACT. Zamiast być myślą — obserwujesz ją z dystansu. Małe słowa, duża różnica w intensywności.",steps:["Zauważ negatywną myśl, np. 'jestem beznadziejny'","Zamień ją na: 'mam myśl, że jestem beznadziejny'","Albo: 'mój umysł mówi mi teraz, że jestem beznadziejny'","Powtórz kilka razy — poczujesz jak myśl traci swoją moc"]},
      {icon:"✅",name:"Mini-lista 3 rzeczy",time:"5 min",desc:"Działanie poprzedza motywację, nie odwrotnie. Małe zadanie → mały sukces → lekkie odblokowanie energii.",steps:["Napisz 3 konkretne rzeczy do zrobienia dziś","Żadna nie może zająć więcej niż 20 minut","Żadna nie może być 'wielkim projektem'","Zrób pierwszą z listy teraz"]},
    ],
    l3:[
      {icon:"💬",name:"Kontakt z kimś bliskim",time:"dowolnie",desc:"Nie musisz rozmawiać o problemie. Sam głos kogoś bliskiego zmienia stan. Kontakt społeczny to biologiczna potrzeba.",steps:["Napisz lub zadzwoń do kogoś — bez planu rozmowy","Nie musisz tłumaczyć co czujesz ani 'mieć powodu'","Nawet krótkie 'hej, co u ciebie?' wystarczy","Jeśli nie masz teraz komu — idź gdzieś gdzie są ludzie"]},
      {icon:"⚡",name:"Twoja kotwica",time:"30–60 min",desc:"Każdy ma coś co historycznie pomagało — nawet trochę. Ochota pojawia się w trakcie, nie przed. Nie czekaj na nią.",steps:["Wejdź w sekcję 'Moje kotwice' poniżej","Wybierz jedną rzecz która historycznie działała","Zacznij — nawet bez energii i entuzjazmu","Daj sobie 10 minut zanim ocenisz czy pomaga"]},
      {icon:"🔧",name:"Małe zamknięte osiągnięcie",time:"20 min",desc:"Poczucie sprawczości to bezpośrednia kontra-narracja dla bezsilności. Zamknij coś małego.",steps:["Znajdź coś co wisi od jakiegoś czasu","Ticket w Jira, skrypt, porządek w plikach — cokolwiek","Coś co możesz zamknąć w 20 minut","Odznacz jako done — to ważna część, nie pomijaj jej"]},
      {icon:"🗺️",name:"Ocena źródła dołka",time:"10 min",desc:"Kiedy jesteś już stabilniejszy — warto zrozumieć co wywołało dołek. Nie po to żeby się obwiniać.",steps:["Czy to był jednorazowy czynnik — niewyspanie, stres, przeciążenie?","Czy to powtarzający się pattern który widzisz regularnie?","Co pojawiło się jako pierwsze — sygnał ostrzegawczy?","Zapisz odpowiedź — to materiał na Twój system na przyszłość"]},
    ],
  };

  const addKotwica=async()=>{
    if(!kotwicaInput.trim())return;
    const a=await api.addAnchor({emoji:kotwicaEmoji,label:kotwicaInput.trim()});
    setKotwice(k=>[...k,a]);setKotwicaInput("");
  };
  const delKotwica=async id=>{
    await api.deleteAnchor(id);
    setKotwice(k=>k.filter(x=>x.id!==id));
  };
  const toggleTechnique=key=>setDolekExpanded(p=>({...p,[key]:!p[key]}));
  const markDone=(lvl,idx)=>{
    if(dolekCompleted[lvl].includes(idx))return;
    setDolekCompleted(p=>({...p,[lvl]:[...p[lvl],idx]}));
  };
  const getLevelColors=lvl=>({
    l1:{bg:"#2a1e00",border:"#e8b84b",text:"#e8b84b",tag:"#7a5a10",tagBg:"#2a1e00"},
    l2:{bg:"#2a1000",border:"#d97340",text:"#d97340",tag:"#7a3a10",tagBg:"#2a1000"},
    l3:{bg:"#2a0000",border:"#c94040",text:"#c94040",tag:"#7a1010",tagBg:"#2a0000"},
  }[lvl]);
  const [habitTab,setHabitTab]=useState("dzisiaj");
  const [bmiTab,setBmiTab]=useState("bmi");
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true);
  const [foods,setFoods]=useState([]);
  const [foodCats,setFoodCats]=useState([]);
  const [dayEntries,setDayEntries]=useState([]);
  const [dailyTotals,setDailyTotals]=useState({});
  const [error,setError]=useState("");

  const year=new Date().getFullYear();

  // Przy wejściu pytamy serwer, czy ciasteczko sesji jest jeszcze ważne.
  useEffect(()=>{
    api.me()
      .then(({user})=>setUser(user))
      .catch(()=>setUser(null))
      .finally(()=>setAuthChecked(true));
  },[]);

  const logout=async()=>{
    await api.logout().catch(()=>{});
    setUser(null);setHabits([]);setHabitLogs({});setServerProfile(null);
    setFoods([]);setDayEntries([]);setDailyTotals({});setKotwice([]);setLoading(true);
  };

  // Odhaczenia trzymamy jako mapę "<idNawyku>_<data>" — taki kształt jest
  // wygodny dla widoków miesiąca i roku, które sięgają po konkretny dzień.
  const logsToMap=rows=>Object.fromEntries(rows.map(r=>[`${r.habitId}_${r.day}`,true]));

  const reloadLogs=useCallback(async()=>{
    const rows=await api.logs(`${year}-01-01`,`${year}-12-31`);
    setHabitLogs(logsToMap(rows));
  },[year]);

  const reloadFoods=useCallback(async()=>{
    setFoods(await api.foods({}));
  },[]);

  const reloadDay=useCallback(async(day)=>{
    setDayEntries(await api.meals(day));
  },[]);

  const reloadTotals=useCallback(async()=>{
    const rows=await api.dailyTotals(year);
    setDailyTotals(Object.fromEntries(rows.map(r=>[r.day,Math.round(r.kcal)])));
  },[year]);

  useEffect(()=>{
    if(!user)return;
    (async()=>{
      try{
        const [h,p,f,c,a]=await Promise.all([
          api.habits(),api.profile(),api.foods({}),api.foodCategories(),api.anchors(),
        ]);
        setHabits(h);setServerProfile(p);setFoods(f);setFoodCats(c);setKotwice(a);
        setProfile({
          weight:p.weightKg??"",height:p.heightCm??"",age:p.ageYears??"",
          sex:p.sex||"M",activity:p.activity??1,
        });
        await Promise.all([reloadLogs(),reloadTotals(),reloadDay(calDate)]);
      }catch(e){
        setError(e.message);
      }
      setLoading(false);
    })();
  },[user,reloadLogs,reloadTotals,reloadDay]);

  // Zmiana wybranego dnia dociąga tylko ten dzień, zamiast trzymać w pamięci
  // cały dziennik — sumy roczne przychodzą osobno, policzone w SQL.
  useEffect(()=>{
    if(user&&!loading)reloadDay(calDate).catch(e=>setError(e.message));
  },[calDate,user]);

  const run=async fn=>{
    setSaving(true);setError("");
    try{ await fn(); }
    catch(e){ setError(e.message); }
    finally{ setSaving(false); }
  };

  // ── Nawyki ──
  const addHabit=()=>run(async()=>{
    if(!newName.trim())return;
    const h=await api.addHabit({name:newName.trim(),category:newCat,reminderTime:newTime||null});
    setHabits(x=>[...x,h]);setNewName("");setNewTime("");setShowForm(false);
  });
  const deleteHabit=id=>run(async()=>{
    await api.deleteHabit(id);
    setHabits(x=>x.filter(h=>h.id!==id));
    await reloadLogs();
  });
  const updateTime=(id,time)=>run(async()=>{
    const h=await api.patchHabit(id,{reminderTime:time||null});
    setHabits(x=>x.map(o=>o.id===id?h:o));setEditTimeId(null);
  });
  const updateName=(id,name)=>run(async()=>{
    if(!name.trim())return;
    const h=await api.patchHabit(id,{name:name.trim()});
    setHabits(x=>x.map(o=>o.id===id?h:o));setEditNameId(null);
  });
  const toggleHabit=(habitId,date)=>run(async()=>{
    const key=`${habitId}_${date}`;
    const next=!habitLogs[key];
    setHabitLogs(l=>{const c={...l};if(next)c[key]=true;else delete c[key];return c;});
    try{
      await api.setLog(habitId,date,next);
    }catch(e){
      await reloadLogs();   // cofamy optymistyczną zmianę stanem z serwera
      throw e;
    }
  });
  const isChecked=(habitId,date)=>!!habitLogs[`${habitId}_${date}`];
  const getStreak=id=>{let s=0;const d=new Date();while(true){const ds=toISO(d);if(habitLogs[`${id}_${ds}`]){s++;d.setDate(d.getDate()-1);}else break;}return s;};
  const getWeeklyRate=id=>{const d=getLast7();return Math.round((d.filter(x=>habitLogs[`${id}_${x}`]).length/7)*100);};
  const getView=id=>progressView[id]||"7dni";
  const setView=(id,v)=>setProgressView(p=>({...p,[id]:v}));
  const sortedHabits=[...habits].sort((a,b)=>{
    const at=a.reminderTime,bt=b.reminderTime;
    if(!at&&!bt)return 0;if(!at)return 1;if(!bt)return-1;return at.localeCompare(bt);
  });

  // ── Profil ──
  const calcAll=()=>run(async()=>{
    const {weight:w,height:h,age,sex,activity}=profile;
    if(!w||!h||!age)return;
    const p=await api.saveProfile({
      weightKg:+w,heightCm:+h,ageYears:+age,sex,activity:+activity,
    });
    setServerProfile(p);
  });

  const todayStr=today();
  const todayEntries=dayEntries;
  const totToday=todayEntries.reduce((a,e)=>({
    cal:a.cal+e.kcal,p:a.p+e.proteinG,c:a.c+e.carbsG,
    f:a.f+e.fatG,fb:a.fb+e.fiberG,s:a.s+e.saltG,
  }),{cal:0,p:0,c:0,f:0,fb:0,s:0});
  const tdee=serverProfile?.tdee??null;
  const bmiVal=serverProfile?.bmi??null;

  // ── Posiłki ──
  const addFood=()=>run(async()=>{
    if(!selFood)return;
    const ratio=grams/100;
    const r1=v=>Math.round((v||0)*ratio*10)/10;
    // Produkt z Open Food Facts trafia najpierw do naszego katalogu — serwer
    // sam pobiera wartości po kodzie kreskowym, nie ufając temu, co przyszło
    // z przeglądarki.
    let foodId=selFood.id??null;
    if(selFood.offCode){
      const imported=await api.offImport(selFood.offCode);
      foodId=imported.id;
      await Promise.all([reloadFoods(),api.foodCategories().then(setFoodCats)]);
    }
    await api.addMeal({
      day:calDate,foodId,name:selFood.name,grams,
      kcal:Math.round(selFood.kcal*ratio),
      proteinG:r1(selFood.proteinG),carbsG:r1(selFood.carbsG),
      fatG:r1(selFood.fatG),fiberG:r1(selFood.fiberG),saltG:r1(selFood.saltG),
    });
    await Promise.all([reloadDay(calDate),reloadTotals()]);
    setModal(false);setSelFood(null);setSearch("");setGrams(100);setOffResults(null);setOffQuery("");
  });
  const removeEntry=id=>run(async()=>{
    await api.deleteMeal(id);
    await Promise.all([reloadDay(calDate),reloadTotals()]);
  });
  const addCustomFood=()=>run(async()=>{
    const {name,cal,p,c,f}=customForm;
    if(!name||!cal)return;
    await api.addFood({name,kcal:+cal,proteinG:+p||0,carbsG:+c||0,fatG:+f||0});
    await Promise.all([reloadFoods(),api.foodCategories().then(setFoodCats)]);
    setCustomForm({name:"",cal:"",p:"",c:"",f:""});setShowCustomForm(false);
  });
  const deleteCustomFood=id=>run(async()=>{
    await api.deleteFood(id);
    await Promise.all([reloadFoods(),api.foodCategories().then(setFoodCats)]);
  });

  // ── Open Food Facts ──
  const searchOff=()=>run(async()=>{
    if(offQuery.trim().length<2)return;
    setOffLoading(true);
    try{
      const {results}=await api.offSearch(offQuery.trim());
      setOffResults(results);
    } finally { setOffLoading(false); }
  });

  const filtered=(offResults!==null?offResults.map(r=>({...r,offCode:r.code,category:"🌍 Open Food Facts"})):foods)
    .filter(f=>{
      if(offResults!==null)return true;   // wyniki z sieci filtruje już serwer
      const matchCat=selCat==="Wszystkie"||f.category===selCat;
      return matchCat&&f.name.toLowerCase().includes(search.toLowerCase());
    });
  const bmiInfo=bmiVal?getBMILabel(bmiVal):null;
  const days7=getLast7();

  const splash=txt=><div style={{background:"#0a0a0a",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#666",fontFamily:"'Inter',sans-serif"}}>{txt}</div>;
  if(!authChecked)return splash("");
  if(!user)return <LoginScreen onLogged={u=>{setUser(u);setLoading(true);}}/>;
  if(loading)return splash("Ładowanie…");

  return(
    <div style={{background:"#0a0a0a",minHeight:"100vh",fontFamily:"'Inter',sans-serif",color:"#f1f1f1",padding:isMobile?"16px 12px 32px":"24px 16px"}}>
      {/* Nagłówek ma własny kontener o stałej szerokości: treść zakładek
          bywa szersza (mapa mięśni), a bez tego tytuł i przycisk wylogowania
          przeskakiwały przy każdej zmianie zakładki. */}
      <div style={{maxWidth:680,margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:isMobile?16:24}}>
          <div style={{minWidth:0}}>
            <h1 style={{margin:0,fontSize:isMobile?20:24,fontWeight:700}}>Tracker</h1>
            <p style={{margin:0,color:"#888",fontSize:isMobile?12:13,textTransform:"capitalize"}}>{new Date().toLocaleDateString("pl-PL",{weekday:"long",month:"long",day:"numeric"})}</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
            {saving&&<span style={{fontSize:12,color:"#888"}}>Zapisywanie…</span>}
            <button onClick={logout} title={`Zalogowany jako ${user.login}`}
              style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:10,padding:"8px 12px",color:"#888",fontSize:13,cursor:"pointer"}}>
              {isMobile?"⏻":`${user.login} · Wyloguj`}
            </button>
          </div>
        </div>

        {error&&(
          <div style={{background:"#2a0f0f",border:"1px solid #6b2020",borderRadius:12,padding:"10px 14px",
            marginBottom:16,color:"#f87171",fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <span>{error}</span>
            <button onClick={()=>setError("")} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:16,flexShrink:0}}>✕</button>
          </div>
        )}

        {/* Main tabs */}
        <div style={{display:"flex",gap:4,background:"#161616",borderRadius:10,padding:4,marginBottom:isMobile?16:20}}>
          {[["nawyki","Nawyki","Nawyki"],["kalorie","Kalorie & BMI","Kalorie"],["miesnie","Mięśnie","Mięśnie"],["dolек","Z dołka","Dołek"]].map(([k,long,short])=>(
            <button key={k} onClick={()=>{
              setMainTab(k);
              // BMI wystarczy policzyć raz, więc przy kolejnych wejściach
              // sensowniejszym ekranem startowym jest licznik kalorii.
              if(k==="kalorie"&&serverProfile?.bmi)setBmiTab("tracker");
            }} style={{flex:1,minWidth:0,background:mainTab===k?"#2a2a2a":"transparent",border:"none",borderRadius:8,padding:isMobile?"9px 2px":"8px 4px",color:mainTab===k?"#fff":"#666",fontWeight:600,cursor:"pointer",fontSize:isNarrow?11:isMobile?12:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{isMobile?short:long}</button>
          ))}
        </div>
      </div>

      {/* mapa mięśni potrzebuje więcej szerokości niż reszta zakładek */}
      <div style={{maxWidth:mainTab==="miesnie"||mainTab==="kalorie"?1180:680,margin:"0 auto"}}>

        {/* ═══ NAWYKI ═══ */}
        {mainTab==="nawyki"&&(
          <div>
            <div style={{display:"flex",gap:4,background:"#161616",borderRadius:10,padding:4,marginBottom:20}}>
              {[["dzisiaj","Dzisiaj"],["postep","Postęp"]].map(([k,l])=>(
                <button key={k} onClick={()=>setHabitTab(k)} style={{flex:1,background:habitTab===k?"#2a2a2a":"transparent",border:"none",borderRadius:8,padding:"8px",color:habitTab===k?"#fff":"#666",fontWeight:600,cursor:"pointer",fontSize:14}}>{l}</button>
              ))}
            </div>

            {habits.length===0&&(
              <div style={{textAlign:"center",padding:"60px 0",color:"#555"}}>
                <div style={{fontSize:40,marginBottom:12}}>🌱</div>
                <p>Brak nawyków. Dodaj swój pierwszy!</p>
              </div>
            )}

            {/* Dzisiaj */}
            {habitTab==="dzisiaj"&&sortedHabits.map(habit=>{
              const cat=CAT_MAP[habit.category]||CATEGORIES[0];
              const checked=isChecked(habit.id,todayStr);
              const streak=getStreak(habit.id);
              const isEditingTime=editTimeId===habit.id;
              return(
                <div key={habit.id} style={{background:"#161616",border:`1px solid ${checked?cat.color+"44":"#1e1e1e"}`,borderRadius:14,padding:"14px 16px",marginBottom:10,transition:"border-color 0.2s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <button onClick={()=>toggleHabit(habit.id,todayStr)} style={{width:28,height:28,borderRadius:"50%",border:`2px solid ${cat.color}`,background:checked?cat.color:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s"}}>
                      {checked&&<span style={{color:"#000",fontSize:14,fontWeight:700}}>✓</span>}
                    </button>
                    <div style={{flex:1,minWidth:0}}>
                      {editNameId===habit.id?(
                        <div style={{display:"flex",gap:6,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
                          <input
                            value={editNameVal}
                            onChange={e=>setEditNameVal(e.target.value)}
                            onKeyDown={e=>{if(e.key==="Enter")updateName(habit.id,editNameVal);if(e.key==="Escape")setEditNameId(null);}}
                            autoFocus
                            style={{flex:1,background:"#0a0a0a",border:`1px solid ${cat.color}`,borderRadius:7,padding:"5px 10px",color:"#fff",fontSize:15,fontWeight:600,outline:"none"}}
                          />
                          <button onClick={()=>updateName(habit.id,editNameVal)} style={{background:"#1a3a1a",border:"1px solid #2d6b20",borderRadius:7,color:"#86efac",cursor:"pointer",fontSize:13,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✓</button>
                          <button onClick={()=>setEditNameId(null)} style={{background:"#222",border:"1px solid #444",borderRadius:7,color:"#aaa",cursor:"pointer",fontSize:13,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
                        </div>
                      ):(
                        <div onClick={()=>{setEditNameId(habit.id);setEditNameVal(habit.name);}} style={{fontWeight:600,fontSize:15,opacity:checked?0.5:1,textDecoration:checked?"line-through":"none",cursor:"pointer"}} title="Kliknij aby edytować nazwę">{habit.name}</div>
                      )}
                      <div style={{fontSize:12,color:cat.color,marginTop:2}}>{habit.category}{streak>0&&` · 🔥 ${streak} dni z rzędu`}</div>
                    </div>
                    {habit.reminderTime&&!isEditingTime&&<button onClick={()=>setEditTimeId(habit.id)} style={{background:"#222",border:"none",borderRadius:8,padding:"4px 10px",color:"#aaa",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>🕐 {habit.reminderTime}</button>}
                    {!habit.reminderTime&&!isEditingTime&&<button onClick={()=>setEditTimeId(habit.id)} style={{background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:16,padding:4}}>🕐</button>}
                    <button onClick={()=>deleteHabit(habit.id)} style={{background:"#3a1a1a",border:"1px solid #6b2020",borderRadius:8,color:"#f87171",cursor:"pointer",fontSize:16,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
                  </div>
                  {isEditingTime&&(
                    <div style={{marginTop:10}}>
                      <TimePicker value={habit.reminderTime} onChange={t=>updateTime(habit.id,t)} onClose={()=>setEditTimeId(null)} onRemove={habit.reminderTime?()=>updateTime(habit.id,""):null}/>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Postęp */}
            {habitTab==="postep"&&sortedHabits.map(habit=>{
              const cat=CAT_MAP[habit.category]||CATEGORIES[0];
              const streak=getStreak(habit.id);
              const rate7=getWeeklyRate(habit.id);
              const view=getView(habit.id);
              return(
                <div key={habit.id} style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:16,marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap",marginBottom:12}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:15,wordBreak:"break-word"}}>{habit.name}</div>
                      <div style={{fontSize:12,color:cat.color,marginTop:2}}>{habit.category}{habit.reminderTime&&<span style={{color:"#666"}}> · 🕐 {habit.reminderTime}</span>}</div>
                    </div>
                    <div style={{display:"flex",gap:3}}>
                      {["7dni","miesiąc","rok"].map(v=><button key={v} onClick={()=>setView(habit.id,v)} style={{background:view===v?cat.color:"#222",color:view===v?"#000":"#666",border:"none",borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:600,cursor:"pointer"}}>{v}</button>)}
                    </div>
                  </div>
                  {view==="7dni"&&(
                    <div>
                      <div style={{display:"flex",gap:4,marginBottom:10}}>
                        {days7.map(d=>{const done=isChecked(habit.id,d);const di=new Date(d+"T00:00:00").getDay();return(<div key={d} style={{flex:1,textAlign:"center"}}><div onClick={()=>toggleHabit(habit.id,d)} style={{height:32,borderRadius:6,background:done?cat.color:"#2a2a2a",cursor:"pointer",transition:"background 0.2s"}}/><div style={{fontSize:10,color:"#555",marginTop:4}}>{DAY_LABELS[di]}</div></div>);})}
                      </div>
                      <div style={{background:"#2a2a2a",borderRadius:99,height:6,overflow:"hidden"}}><div style={{width:`${rate7}%`,height:"100%",background:cat.color,borderRadius:99,transition:"width 0.4s"}}/></div>
                      <div style={{fontSize:12,color:"#666",marginTop:8}}>{streak>0?`🔥 ${streak} dni z rzędu`:"Zacznij serię już dziś!"} · {rate7}%</div>
                    </div>
                  )}
                  {view==="miesiąc"&&(
                    <div>
                      <MonthView habitId={habit.id} logs={habitLogs} color={cat.color} toggle={toggleHabit}/>
                      <div style={{fontSize:12,color:"#666",marginTop:10}}>{streak>0?`🔥 ${streak} dni z rzędu`:"Zacznij serię już dziś!"}</div>
                    </div>
                  )}
                  {view==="rok"&&(
                    <div>
                      <YearView habitId={habit.id} logs={habitLogs} color={cat.color}/>
                      <div style={{fontSize:12,color:"#666",marginTop:10}}>{streak>0?`🔥 ${streak} dni z rzędu`:"Zacznij serię już dziś!"}</div>
                    </div>
                  )}
                </div>
              );
            })}

            {showForm&&(
              <div style={{background:"#161616",border:"1px solid #2a2a2a",borderRadius:14,padding:16,marginTop:12}}>
                <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addHabit()} placeholder="Nazwa nawyku…"
                  style={{width:"100%",background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"10px 12px",color:"#fff",fontSize:14,boxSizing:"border-box",marginBottom:10,outline:"none"}} autoFocus/>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                  {CATEGORIES.map(c=><button key={c.label} onClick={()=>setNewCat(c.label)} style={{border:`2px solid ${newCat===c.label?c.color:"#333"}`,background:newCat===c.label?c.bg:"transparent",color:c.color,borderRadius:20,padding:"4px 12px",cursor:"pointer",fontSize:13,fontWeight:600}}>{c.label}</button>)}
                </div>
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:12,color:"#888",display:"block",marginBottom:8}}>Godzina przypomnienia (opcjonalnie)</label>
                  <TimePickerForm value={newTime} onChange={setNewTime}/>
                  {newTime&&<button onClick={()=>setNewTime("")} style={{marginTop:6,background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:12}}>Usuń godzinę ×</button>}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={addHabit} style={{background:"#fff",color:"#000",border:"none",borderRadius:8,padding:"8px 20px",fontWeight:600,cursor:"pointer",flex:1}}>Dodaj</button>
                  <button onClick={()=>{setShowForm(false);setNewName("");setNewTime("");}} style={{background:"#222",color:"#aaa",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer"}}>Anuluj</button>
                </div>
              </div>
            )}
            {!showForm&&(
              <button onClick={()=>setShowForm(true)} style={{width:"100%",marginTop:12,padding:"13px",
                borderRadius:12,border:"2px dashed #333",background:"transparent",color:"#888",
                fontWeight:600,fontSize:14,cursor:"pointer"}}>
                + Dodaj nawyk
              </button>
            )}
          </div>
        )}

        {/* ═══ KALORIE & BMI ═══ */}
        {mainTab==="kalorie"&&(
          <div>
            <div style={{display:"flex",gap:4,background:"#161616",borderRadius:10,padding:4,marginBottom:20}}>
              {[["bmi","BMI & Profil"],["tracker","Licznik kalorii"]].map(([k,l])=>(
                <button key={k} onClick={()=>setBmiTab(k)} style={{flex:1,background:bmiTab===k?"#2a2a2a":"transparent",border:"none",borderRadius:8,padding:"8px",color:bmiTab===k?"#fff":"#666",fontWeight:600,cursor:"pointer",fontSize:14}}>{l}</button>
              ))}
            </div>

            {/* BMI */}
            {bmiTab==="bmi"&&(
              <div style={{display:"grid",gap:16,alignItems:"start",
                gridTemplateColumns:isWide?"minmax(300px,420px) minmax(320px,1fr)":"1fr"}}>
                <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:20}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#ccc",marginBottom:16}}>Twoje dane</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:12}}>
                    {[["Waga (kg)","weight"],["Wzrost (cm)","height"],["Wiek (lata)","age"]].map(([label,key])=>(
                      <div key={key} style={{display:"flex",flexDirection:"column",gap:6}}>
                        <label style={{fontSize:12,color:"#888"}}>{label}</label>
                        <input type="number" value={profile[key]} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}
                          style={{background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"9px 12px",color:"#fff",fontSize:14,outline:"none"}} placeholder={label}/>
                      </div>
                    ))}
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <label style={{fontSize:12,color:"#888"}}>Płeć</label>
                      <select value={profile.sex} onChange={e=>setProfile(p=>({...p,sex:e.target.value}))}
                        style={{background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"9px 12px",color:"#fff",fontSize:14,outline:"none"}}>
                        <option value="M">Mężczyzna</option><option value="F">Kobieta</option>
                      </select>
                    </div>
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={{fontSize:12,color:"#888",display:"block",marginBottom:6}}>Poziom aktywności</label>
                    <select value={profile.activity} onChange={e=>setProfile(p=>({...p,activity:+e.target.value}))}
                      style={{width:"100%",background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"9px 12px",color:"#fff",fontSize:13,outline:"none"}}>
                      {ACTIVITY.map((a,i)=><option key={i} value={i}>{a.option} — ×{String(a.factor).replace(".",",")}</option>)}
                    </select>
                  </div>
                  <button onClick={calcAll} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>Oblicz BMI i zapotrzebowanie</button>
                </div>
                {bmiVal&&bmiInfo&&(
                  <div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12}}>
                    <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:20,textAlign:"center"}}>
                      <div style={{fontSize:12,color:"#888",marginBottom:6}}>Twoje BMI</div>
                      <div style={{fontSize:isMobile?40:48,fontWeight:800,color:bmiInfo.color}}>{bmiVal.toFixed(1)}</div>
                      <div style={{display:"inline-block",marginTop:6,padding:"3px 14px",borderRadius:20,background:bmiInfo.color+"22",color:bmiInfo.color,fontWeight:700,fontSize:13}}>{bmiInfo.label}</div>
                      <div style={{marginTop:12,fontSize:11,color:"#555",lineHeight:1.8}}>
                        <div>Niedowaga: &lt;18.5</div><div>Norma: 18.5–24.9</div><div>Nadwaga: 25–29.9</div><div>Otyłość: ≥30</div>
                      </div>
                    </div>
                    <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:20,textAlign:"center"}}>
                      <div style={{fontSize:12,color:"#888",marginBottom:6}}>Dzienne zapotrzebowanie</div>
                      <div style={{fontSize:isMobile?40:48,fontWeight:800,color:NUTRIENT.kcal}}>{tdee}</div>
                      <div style={{color:"#888",fontSize:13,marginBottom:12}}>kcal / dzień</div>
                      <div style={{background:"#0a0a0a",borderRadius:10,padding:10}}>
                        <div style={{fontSize:11,color:"#666",marginBottom:8}}>Sugerowane makro:</div>
                        <div style={{display:"flex",justifyContent:"space-around"}}>
                          {[["Białko",serverProfile.targets.proteinG+"g",NUTRIENT.protein],["Węgl.",serverProfile.targets.carbsG+"g",NUTRIENT.carbs],["Tłuszcze",serverProfile.targets.fatG+"g",NUTRIENT.fat]].map(([n,v,c])=>(
                            <div key={n} style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:10,color:"#555"}}>{n}</div></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  {serverProfile?.bmr&&<FormulaPanel profile={serverProfile}/>}
                  </div>
                )}
              </div>
            )}

            {/* Tracker */}
            {bmiTab==="tracker"&&(
              <div style={{display:"grid",gap:16,alignItems:"start",
                gridTemplateColumns:isWide?"minmax(260px,320px) minmax(300px,1fr) minmax(290px,370px)":"1fr"}}>

                {/* lewa kolumna — postęp dnia */}
                <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:16}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"#ccc"}}>Postęp dnia</div>
                  <NutrientRings totals={totToday} targets={serverProfile?.targets}/>
                </div>

                {/* środkowa kolumna — produkty dnia */}
                <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:16}}>
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,flex:"1 1 auto",justifyContent:isMobile?"space-between":"flex-start"}}>
                      <button onClick={()=>{const d=new Date(calDate+"T00:00:00");d.setDate(d.getDate()-1);setCalDate(toISO(d));}} style={{background:"#222",border:"none",borderRadius:8,color:"#aaa",cursor:"pointer",fontSize:16,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>‹</button>
                      <div style={{textAlign:"center",minWidth:118}}>
                        <div style={{fontWeight:700,fontSize:15,textTransform:"capitalize"}}>{(()=>{const t=today();if(calDate===t)return"Dzisiaj";const y=new Date();y.setDate(y.getDate()-1);if(calDate===toISO(y))return"Wczoraj";return new Date(calDate+"T00:00:00").toLocaleDateString("pl-PL",{weekday:"short",day:"numeric",month:"short"});})()}</div>
                        <div style={{fontSize:11,color:"#666"}}>{todayEntries.length} produktów</div>
                      </div>
                      <button onClick={()=>{if(calDate>=today())return;const d=new Date(calDate+"T00:00:00");d.setDate(d.getDate()+1);setCalDate(toISO(d));}} disabled={calDate>=today()} style={{background:calDate>=today()?"#161616":"#222",border:"none",borderRadius:8,color:calDate>=today()?"#333":"#aaa",cursor:calDate>=today()?"default":"pointer",fontSize:16,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>›</button>
                    </div>
                    <button onClick={()=>setModal(true)} style={{background:"linear-gradient(135deg,#667eea,#764ba2)",color:"#fff",border:"none",borderRadius:10,padding:isMobile?"11px 16px":"8px 16px",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0,width:isMobile?"100%":"auto"}}>➕ Dodaj produkt</button>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="date" value={calDate} max={today()} onChange={e=>e.target.value&&setCalDate(e.target.value)} style={{background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"6px 10px",color:"#fff",fontSize:12,colorScheme:"dark",outline:"none"}}/>
                    {calDate!==today()&&<button onClick={()=>setCalDate(today())} style={{background:"#222",border:"1px solid #444",borderRadius:8,color:"#aaa",fontSize:12,padding:"6px 12px",cursor:"pointer"}}>↩ Wróć do dziś</button>}
                  </div>
                </div>
                  {todayEntries.length===0&&(
                    <div style={{textAlign:"center",padding:"36px 0",color:"#555"}}>
                      <div style={{fontSize:30,marginBottom:10}}>🍽️</div>
                      <div style={{fontSize:13}}>Brak produktów tego dnia.</div>
                    </div>
                  )}
                  {todayEntries.length>0&&(
                    <div style={{marginTop:12,borderTop:"1px solid #1e1e1e",paddingTop:12}}>
                      {todayEntries.map((e,ri)=>(
                        <div key={e.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:ri<todayEntries.length-1?"1px solid #1a1a1a":"none"}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600}}>{e.name}</div>
                            <div style={{fontSize:11,color:"#555"}}>{e.grams}g · T:{e.fatG}g W:{e.carbsG}g B:{e.proteinG}g Bł:{e.fiberG}g Sól:{e.saltG}g</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <span style={{fontSize:14,fontWeight:700,color:NUTRIENT.kcal}}>{e.kcal} kcal</span>
                            <button onClick={()=>removeEntry(e.id)} style={{background:"#3a1a1a",border:"1px solid #6b2020",borderRadius:7,color:"#f87171",cursor:"pointer",fontSize:13,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* prawa kolumna — historia */}
                <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:16}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#ccc"}}>📅 Historia kalorii</div>
                  <CalYearView calLogs={dailyTotals} tdee={tdee}/>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ MIĘŚNIE ═══ */}
        {mainTab==="miesnie"&&<MuscleMap profile={serverProfile}/>}

        {/* ═══ DOŁEK ═══ */}
        {mainTab==="dolек"&&(
          <div>
            {/* SOS Banner */}
            <div style={{background:"#2a1e00",border:"1px solid #e8b84b",borderRadius:14,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:14}}>
              <div style={{fontSize:24,flexShrink:0}}>⚡</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:"#e8b84b",marginBottom:2}}>Jestem teraz w dołku</div>
                <div style={{fontSize:12,color:"#a07830"}}>Zacznij od poziomu 1 — zejdź niżej gdy poczujesz się lepiej</div>
              </div>
              <button onClick={()=>setDolekLevel("l1")} style={{background:"#e8b84b",color:"#000",border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0}}>Zacznij</button>
            </div>

            {/* Level selector */}
            <div style={{fontSize:13,fontWeight:700,color:"#ccc",marginBottom:12}}>Gdzie teraz jesteś?</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:24}}>
              {[
                {k:"l1",n:"Poziom 1",name:"Stabilizacja",time:"0–10 min",desc:"Przytłoczony, chaotyczny. Ciało napięte, serce przyspieszone. Jesteś w spirali.",border:"#e8b84b",bg:"#2a1e00",text:"#e8b84b"},
                {k:"l2",n:"Poziom 2",name:"Przetwarzanie",time:"10–30 min",desc:"Trochę spokojniejszy, ale ciężki. Negatywne myśli, brak perspektywy.",border:"#d97340",bg:"#2a1000",text:"#d97340"},
                {k:"l3",n:"Poziom 3",name:"Odbudowa",time:"kilka godzin",desc:"Poza ostrą fazą, ale płaski. Brakuje energii. Możesz funkcjonować.",border:"#c94040",bg:"#2a0000",text:"#c94040"},
              ].map(l=>(
                <div key={l.k} onClick={()=>setDolekLevel(l.k)} style={{background:l.bg,border:`1.5px solid ${dolekLevel===l.k?l.border:l.border+"55"}`,borderRadius:12,padding:12,cursor:"pointer",boxShadow:dolekLevel===l.k?`0 0 0 3px ${l.border}33`:"none",transition:"all 0.2s"}}>
                  <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:l.text,marginBottom:4}}>{l.n}</div>
                  <div style={{fontSize:14,fontWeight:700,color:l.text,marginBottom:2}}>{l.name}</div>
                  <div style={{fontSize:11,color:l.text,opacity:0.7,marginBottom:8}}>{l.time}</div>
                  <div style={{fontSize:11,color:l.text,opacity:0.8,lineHeight:1.5,borderTop:`1px solid ${l.border}33`,paddingTop:8}}>{l.desc}</div>
                </div>
              ))}
            </div>

            {/* Phase panel */}
            {dolekLevel&&(()=>{
              const c=getLevelColors(dolekLevel);
              const techs=TECHNIQUES[dolekLevel];
              const done=dolekCompleted[dolekLevel];
              const pct=Math.round((done.length/techs.length)*100);
              const labels={l1:{tag:"0–10 minut",title:"Szybka stabilizacja",sub:"Najpierw wróć do ciała. Nie myśl — działaj. Wybierz jedną technikę."},l2:{tag:"10–30 minut",title:"Przetwarzanie",sub:"Kiedy jesteś trochę spokojniejszy — czas zrozumieć co się dzieje."},l3:{tag:"kilka godzin",title:"Odbudowa",sub:"Wróć do siebie. Nie tylko przetrwaj — zbuduj coś małego."}};
              const lbl=labels[dolekLevel];
              return(
                <div>
                  <div style={{marginBottom:16}}>
                    <div style={{display:"inline-block",fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",padding:"3px 10px",borderRadius:999,background:c.bg,color:c.text,border:`1px solid ${c.border}`,marginBottom:8}}>{lbl.tag}</div>
                    <div style={{fontSize:20,fontWeight:700,color:"#f1f1f1",marginBottom:4}}>{lbl.title}</div>
                    <div style={{fontSize:13,color:"#888"}}>{lbl.sub}</div>
                  </div>
                  {/* Progress */}
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                    <div style={{flex:1,height:3,background:"#2a2a2a",borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:"#22c55e",borderRadius:99,transition:"width 0.4s"}}/>
                    </div>
                    <div style={{fontSize:12,color:"#666",whiteSpace:"nowrap"}}>{done.length} / {techs.length}</div>
                  </div>
                  {/* Techniques */}
                  <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:28}}>
                    {techs.map((t,i)=>{
                      const key=`${dolekLevel}-${i}`;
                      const isOpen=dolekExpanded[key];
                      const isDone=done.includes(i);
                      return(
                        <div key={key} style={{background:"#161616",border:`1px solid ${isOpen?"#2a2a2a":"#1e1e1e"}`,borderRadius:12,overflow:"hidden",transition:"border-color 0.15s"}}>
                          <div onClick={()=>toggleTechnique(key)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer"}}>
                            <div style={{width:36,height:36,borderRadius:10,background:c.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{t.icon}</div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:14,fontWeight:600,color:isDone?"#666":"#f1f1f1",textDecoration:isDone?"line-through":"none"}}>{t.name}</div>
                              <div style={{fontSize:11,color:"#555"}}>{t.time}</div>
                            </div>
                            {isDone&&<span style={{fontSize:12,color:"#22c55e",fontWeight:700}}>✓</span>}
                            <span style={{color:"#555",fontSize:12,transform:isOpen?"rotate(180deg)":"none",transition:"transform 0.2s",display:"inline-block"}}>▼</span>
                          </div>
                          {isOpen&&(
                            <div style={{padding:"0 14px 14px",borderTop:"1px solid #1e1e1e"}}>
                              <p style={{fontSize:13,color:"#888",lineHeight:1.65,margin:"12px 0 10px"}}>{t.desc}</p>
                              <ol style={{listStyle:"none",display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                                {t.steps.map((s,si)=>(
                                  <li key={si} style={{display:"flex",gap:10,fontSize:13,color:"#888",lineHeight:1.5}}>
                                    <span style={{width:20,height:20,borderRadius:"50%",background:"#2a2a2a",border:"1px solid #333",fontSize:11,fontWeight:500,color:"#555",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{si+1}</span>
                                    {s}
                                  </li>
                                ))}
                              </ol>
                              {!isDone
                                ?<button onClick={()=>markDone(dolekLevel,i)} style={{background:"#0a0a0a",border:"1px solid #333",borderRadius:999,padding:"5px 14px",color:"#888",fontSize:12,cursor:"pointer"}}>Zrobiłem</button>
                                :<span style={{fontSize:12,color:"#22c55e",fontWeight:600}}>✓ Gotowe</span>
                              }
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Kotwice */}
                  <div style={{borderTop:"1px solid #1e1e1e",paddingTop:24}}>
                    <div style={{fontSize:16,fontWeight:700,color:"#f1f1f1",marginBottom:6}}>Moje kotwice</div>
                    <div style={{fontSize:13,color:"#888",lineHeight:1.6,marginBottom:14}}>Rzeczy które historycznie ci pomagają — nawet trochę. Muzyka, projekt techniczny, spacer, gotowanie. Ochota pojawia się w trakcie, nie przed.</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                      {kotwice.length===0&&<div style={{fontSize:13,color:"#555",fontStyle:"italic"}}>Nie masz jeszcze żadnych kotwic — dodaj pierwszą poniżej.</div>}
                      {kotwice.map((k,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:"#161616",border:"1px solid #1e1e1e",borderRadius:10,padding:"10px 14px"}}>
                          <span style={{fontSize:18,flexShrink:0}}>{k.emoji}</span>
                          <span style={{flex:1,fontSize:14,color:"#f1f1f1"}}>{k.text}</span>
                          <button onClick={()=>delKotwica(i)} style={{background:"none",border:"none",cursor:"pointer",color:"#555",fontSize:18,padding:"2px 4px",borderRadius:4}}>×</button>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <select value={kotwicaEmoji} onChange={e=>setKotwicaEmoji(e.target.value)} style={{background:"#161616",border:"1px solid #333",borderRadius:10,padding:"9px 10px",color:"#fff",fontSize:16,cursor:"pointer",outline:"none"}}>
                        {["🎵","🏃","💻","🍳","📚","🎮","🌿","🎨","🧘","🚴","✍️","🎸","☕","🌊","🤝","⚡"].map(e=><option key={e}>{e}</option>)}
                      </select>
                      <input value={kotwicaInput} onChange={e=>setKotwicaInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addKotwica()} placeholder="Dodaj kotwicę..."
                        style={{flex:1,background:"#161616",border:"1px solid #333",borderRadius:10,padding:"9px 14px",color:"#fff",fontSize:14,outline:"none"}}/>
                      <button onClick={addKotwica} style={{background:"#30888a",color:"#fff",border:"none",borderRadius:10,padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>Dodaj</button>
                    </div>
                  </div>
                </div>
              );
            })()}
            {!dolekLevel&&(
              <div style={{textAlign:"center",padding:"40px 0",color:"#555"}}>
                <div style={{fontSize:36,marginBottom:12}}>🧭</div>
                <p>Wybierz poziom lub kliknij „Zacznij" powyżej</p>
              </div>
            )}
          </div>
        )}
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:999,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:20}}
          onClick={e=>{if(e.target===e.currentTarget){setModal(false);setSelFood(null);setSearch("");setGrams(100);}}}>
          {/* na telefonie panel dolny, na desktopie wyśrodkowane okno */}
          <div style={{background:"#161616",borderRadius:isMobile?"20px 20px 0 0":16,padding:isMobile?"20px 16px calc(20px + env(safe-area-inset-bottom))":24,width:"100%",maxWidth:600,maxHeight:isMobile?"88vh":"85vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(0,0,0,.4)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{margin:0,fontSize:17,fontWeight:700}}>Dodaj produkt</h3>
              <button onClick={()=>{setModal(false);setSelFood(null);setSearch("");setGrams(100);}} style={{background:"#222",border:"none",borderRadius:8,color:"#aaa",fontSize:18,cursor:"pointer",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{display:"flex",gap:4,background:"#0a0a0a",borderRadius:10,padding:3,marginBottom:10}}>
              {[[false,"📦 Baza lokalna"],[true,"🌍 Open Food Facts"]].map(([online,label])=>(
                <button key={label} onClick={()=>{setSelFood(null);setOffResults(online?[]:null);}}
                  style={{flex:1,background:(offResults!==null)===online?"#2a2a2a":"transparent",border:"none",borderRadius:8,padding:"7px",
                    color:(offResults!==null)===online?"#fff":"#666",fontWeight:600,cursor:"pointer",fontSize:12}}>{label}</button>
              ))}
            </div>

            {offResults!==null?(
              <div style={{marginBottom:10}}>
                <div style={{display:"flex",gap:8,marginBottom:6}}>
                  <input value={offQuery} onChange={e=>setOffQuery(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&searchOff()}
                    placeholder="🔍 Nazwa produktu, np. jogurt naturalny"
                    style={{flex:1,padding:"10px 14px",borderRadius:10,border:"1px solid #333",background:"#0a0a0a",color:"#fff",fontSize:14,outline:"none"}}/>
                  <button onClick={searchOff} disabled={offLoading||offQuery.trim().length<2}
                    style={{background:offQuery.trim().length>1?"#667eea":"#222",color:offQuery.trim().length>1?"#fff":"#555",
                      border:"none",borderRadius:10,padding:"0 16px",fontWeight:700,fontSize:13,flexShrink:0,
                      cursor:offQuery.trim().length>1?"pointer":"not-allowed"}}>
                    {offLoading?"⏳":"Szukaj"}
                  </button>
                </div>
                <div style={{fontSize:11,color:"#555",lineHeight:1.5}}>
                  Dane z bazy Open Food Facts. Wybrany produkt trafia na stałe do Twojego katalogu,
                  więc kolejnym razem znajdziesz go już lokalnie.
                </div>
              </div>
            ):(
              <>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Szukaj produktu…"
              style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1px solid #333",background:"#0a0a0a",color:"#fff",fontSize:14,marginBottom:10,boxSizing:"border-box",outline:"none"}}/>
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:10}}>
              {["Wszystkie",...foodCats.map(c=>c.category)].map(cat=>(
                <button key={cat} onClick={()=>setSelCat(cat)} style={{whiteSpace:"nowrap",padding:"5px 10px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:selCat===cat?"#667eea":"#222",color:selCat===cat?"#fff":"#666"}}>{cat.replace(/^.\s/,"")}</button>
              ))}
            </div>
              </>
            )}
            <button onClick={()=>setShowCustomForm(!showCustomForm)} style={{width:"100%",padding:"9px",borderRadius:10,border:`2px dashed ${showCustomForm?"#ef4444":"#667eea"}`,background:"transparent",color:showCustomForm?"#ef4444":"#667eea",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:10}}>
              {showCustomForm?"❌ Anuluj":"➕ Dodaj własny produkt"}
            </button>
            {showCustomForm&&(
              <div style={{background:"#0a0a0a",borderRadius:12,padding:14,marginBottom:12,border:"1px solid #2a2a2a"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#c084fc",marginBottom:10}}>Własny produkt (na 100g)</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8}}>
                  <input placeholder="Nazwa" value={customForm.name} onChange={e=>setCustomForm(f=>({...f,name:e.target.value}))}
                    style={{gridColumn:"1/-1",padding:"8px 12px",borderRadius:8,border:"1px solid #333",background:"#161616",color:"#fff",fontSize:13,outline:"none"}}/>
                  {[["Kalorie (kcal)","cal"],["Białko (g)","p"],["Węglowodany (g)","c"],["Tłuszcze (g)","f"]].map(([label,key])=>(
                    <input key={key} type="number" placeholder={label} value={customForm[key]} onChange={e=>setCustomForm(f=>({...f,[key]:e.target.value}))}
                      style={{padding:"8px 12px",borderRadius:8,border:"1px solid #333",background:"#161616",color:"#fff",fontSize:13,outline:"none"}}/>
                  ))}
                </div>
                <button onClick={addCustomFood} style={{width:"100%",marginTop:10,padding:"9px",borderRadius:8,border:"none",background:customForm.name&&customForm.cal?"#c084fc":"#333",color:customForm.name&&customForm.cal?"#000":"#666",fontWeight:700,fontSize:13,cursor:"pointer"}}>✅ Zapisz</button>
              </div>
            )}
            <div style={{maxHeight:220,overflowY:"auto",border:"1px solid #2a2a2a",borderRadius:10,marginBottom:14}}>
              {offLoading&&<div style={{padding:20,textAlign:"center",color:"#667eea"}}>⏳ Pytam Open Food Facts…</div>}
              {!offLoading&&filtered.length===0&&(
                <div style={{padding:20,textAlign:"center",color:"#555"}}>
                  {offResults!==null?(offQuery?"Brak wyników w Open Food Facts":"Wpisz nazwę i kliknij Szukaj"):"Brak wyników"}
                </div>
              )}
              {filtered.map(f=>(
                <div key={f.offCode||f.id} onClick={()=>setSelFood(f)} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid #1a1a1a",background:selFood?.name===f.name?"#1a1030":"transparent",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                      {f.name}
                      {f.source==="custom"&&<span style={{fontSize:10,background:"#c084fc",color:"#000",padding:"1px 5px",borderRadius:4,fontWeight:700}}>WŁASNY</span>}
                    </div>
                    <div style={{fontSize:11,color:"#555"}}>{f.category}</div>
                  </div>
                  <div style={{textAlign:"right",fontSize:11,display:"flex",alignItems:"center",gap:8}}>
                    <div><div style={{fontWeight:700,color:NUTRIENT.kcal}}>{f.kcal} kcal</div><div style={{color:"#555"}}>B:{f.proteinG}g W:{f.carbsG}g T:{f.fatG}g</div></div>
                    {f.source==="custom"&&<button onClick={e=>{e.stopPropagation();deleteCustomFood(f.id);}} style={{background:"#3a1a1a",border:"1px solid #6b2020",borderRadius:6,color:"#f87171",cursor:"pointer",fontSize:12,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>}
                  </div>
                </div>
              ))}
            </div>
            {selFood&&(
              <div style={{background:"#0a0a0a",borderRadius:12,padding:12,marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <label style={{fontSize:13,fontWeight:600,color:"#888",whiteSpace:"nowrap"}}>Ilość (g):</label>
                  <input type="number" value={grams} min={1} onChange={e=>setGrams(+e.target.value||1)}
                    style={{width:80,padding:"7px 10px",borderRadius:8,border:"1px solid #333",background:"#161616",color:"#fff",fontSize:14,outline:"none"}}/>
                </div>
                <div style={{display:"flex",gap:8}}>
                  {[["Kcal",Math.round(selFood.kcal*grams/100),NUTRIENT.kcal],["B",(selFood.proteinG*grams/100).toFixed(1)+"g",NUTRIENT.protein],["W",(selFood.carbsG*grams/100).toFixed(1)+"g",NUTRIENT.carbs],["T",(selFood.fatG*grams/100).toFixed(1)+"g",NUTRIENT.fat]].map(([k,v,c])=>(
                    <div key={k} style={{flex:1,textAlign:"center",background:"#161616",borderRadius:8,padding:"8px 4px"}}>
                      <div style={{fontSize:15,fontWeight:800,color:c}}>{v}</div>
                      <div style={{fontSize:10,color:"#555"}}>{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={addFood} disabled={!selFood} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:selFood?"linear-gradient(135deg,#667eea,#764ba2)":"#222",color:selFood?"#fff":"#555",fontWeight:700,fontSize:15,cursor:selFood?"pointer":"not-allowed"}}>
              ✅ Dodaj produkt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
