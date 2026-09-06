// TODO: wklej tutaj swój istniejący komponent Tracker
// (zakładki: Nawyki / Kalorie & BMI / Mięśnie / Z dołka).
// Działa bez modyfikacji, bo używa window.storage, które dostarcza storage.js.
//
// Uwaga: zakładka „🌍 Wyszukaj online" korzystała z API Claude (api.anthropic.com)
// i nie zadziała w samodzielnym wdrożeniu. Zostaw ją wyłączoną lub podepnij
// własne API wartości odżywczych.

import { useState, useEffect, useCallback } from "react";

const CATEGORIES = [
  { label: "Zdrowie", color: "#4ade80", bg: "#052e16" },
  { label: "Praca", color: "#60a5fa", bg: "#0c1a3a" },
  { label: "Mindfulness", color: "#c084fc", bg: "#1a0a2e" },
  { label: "Osobiste", color: "#fb923c", bg: "#2e1200" },
];
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.label, c]));
const DAY_LABELS = ["N","P","W","Ś","C","P","S"];
const MONTHS_PL = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];
const HABIT_KEY = "habit_tracker_v1";
const BMI_KEY = "bmi_tracker_v1";
const CUSTOM_KEY = "custom_foods_v1";
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00","15","30","45"];
const TILE = 36;

const toISO = d => d.toISOString().slice(0, 10);
const today = () => toISO(new Date());
const getLast7 = () => { const a=[]; for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);a.push(toISO(d));} return a; };
const getDaysInMonth = (y,m) => { const a=[],d=new Date(y,m,1); while(d.getMonth()===m){a.push(toISO(d));d.setDate(d.getDate()+1);} return a; };
const getDaysInYear = y => { const a=[],d=new Date(y,0,1); while(d.getFullYear()===y){a.push(toISO(d));d.setDate(d.getDate()+1);} return a; };

const FOOD_DB = {
  "🥛 Nabiał":[{name:"Mleko 2%",cal:50,p:3.4,c:4.8,f:2,fb:0,s:0.1},{name:"Jogurt naturalny",cal:61,p:3.5,c:4.7,f:3.3,fb:0,s:0.1},{name:"Ser żółty",cal:380,p:25,c:1.3,f:31,fb:0,s:1.8},{name:"Twaróg chudy",cal:98,p:18,c:3.5,f:1,fb:0,s:0.1},{name:"Masło",cal:717,p:0.9,c:0.1,f:81,fb:0,s:0.1},{name:"Kefir",cal:52,p:3.3,c:4.5,f:2,fb:0,s:0.1},{name:"Mozzarella",cal:280,p:22,c:2.2,f:22,fb:0,s:0.6}],
  "🥩 Mięso":[{name:"Kurczak pierś",cal:165,p:31,c:0,f:3.6,fb:0,s:0.1},{name:"Wołowina (mielona)",cal:250,p:26,c:0,f:17,fb:0,s:0.1},{name:"Wieprzowina (schab)",cal:212,p:23,c:0,f:13,fb:0,s:0.1},{name:"Indyk pierś",cal:155,p:30,c:0,f:3,fb:0,s:0.1},{name:"Boczek",cal:541,p:17,c:0.7,f:53,fb:0,s:2},{name:"Szynka gotowana",cal:145,p:18,c:1.5,f:7,fb:0,s:2},{name:"Kiełbasa",cal:301,p:14,c:1.8,f:27,fb:0,s:2.2}],
  "🐟 Ryby":[{name:"Łosoś",cal:208,p:20,c:0,f:13,fb:0,s:0.1},{name:"Tuńczyk (puszka)",cal:116,p:26,c:0,f:1,fb:0,s:0.8},{name:"Dorsz",cal:82,p:18,c:0,f:0.7,fb:0,s:0.2},{name:"Makrela",cal:205,p:19,c:0,f:14,fb:0,s:0.3},{name:"Krewetki",cal:99,p:24,c:0.2,f:0.3,fb:0,s:0.5}],
  "🥦 Warzywa":[{name:"Brokuły",cal:34,p:2.8,c:6.6,f:0.4,fb:2.6,s:0.08},{name:"Marchew",cal:41,p:0.9,c:9.6,f:0.2,fb:2.8,s:0.16},{name:"Ziemniaki",cal:77,p:2,c:17,f:0.1,fb:2.2,s:0.01},{name:"Pomidor",cal:18,p:0.9,c:3.9,f:0.2,fb:1.2,s:0.01},{name:"Szpinak",cal:23,p:2.9,c:3.6,f:0.4,fb:2.2,s:0.2},{name:"Papryka czerwona",cal:31,p:1,c:6,f:0.3,fb:2.1,s:0.01},{name:"Sałata",cal:15,p:1.4,c:2.9,f:0.2,fb:1.3,s:0.03}],
  "🍎 Owoce":[{name:"Jabłko",cal:52,p:0.3,c:14,f:0.2,fb:2.4,s:0},{name:"Banan",cal:89,p:1.1,c:23,f:0.3,fb:2.6,s:0},{name:"Pomarańcza",cal:47,p:0.9,c:12,f:0.1,fb:2.4,s:0},{name:"Truskawki",cal:32,p:0.7,c:7.7,f:0.3,fb:2,s:0},{name:"Winogrona",cal:67,p:0.6,c:17,f:0.4,fb:0.9,s:0},{name:"Mango",cal:60,p:0.8,c:15,f:0.4,fb:1.6,s:0}],
  "🌾 Zboża":[{name:"Ryż biały (suchy)",cal:365,p:7,c:80,f:0.7,fb:1.3,s:0.01},{name:"Makaron (suchy)",cal:370,p:13,c:75,f:1.5,fb:3.2,s:0.02},{name:"Chleb pszenny",cal:265,p:9,c:49,f:3.2,fb:2.7,s:1.2},{name:"Płatki owsiane",cal:389,p:17,c:66,f:7,fb:10,s:0.02},{name:"Kasza gryczana",cal:335,p:13,c:71,f:3.4,fb:10,s:0.01}],
  "🥚 Inne":[{name:"Jajko kurze",cal:155,p:13,c:1.1,f:11,fb:0,s:0.3},{name:"Tofu",cal:76,p:8,c:1.9,f:4.8,fb:0.9,s:0.01},{name:"Oliwa z oliwek",cal:884,p:0,c:0,f:100,fb:0,s:0},{name:"Orzech włoski",cal:654,p:15,c:14,f:65,fb:6.7,s:0},{name:"Migdały",cal:579,p:21,c:22,f:50,fb:12.5,s:0.01}],
};
const ALL_FOODS = Object.entries(FOOD_DB).flatMap(([cat,items])=>items.map(i=>({...i,category:cat})));

function calcBMI(w,h){return w/((h/100)**2);}
function getBMILabel(bmi){
  if(bmi<18.5)return{label:"Niedowaga",color:"#3b82f6"};
  if(bmi<25)return{label:"Norma",color:"#22c55e"};
  if(bmi<30)return{label:"Nadwaga",color:"#f59e0b"};
  return{label:"Otyłość",color:"#ef4444"};
}
function calcTDEE(w,h,age,sex,activity){
  const bmr=sex==="M"?10*w+6.25*h-5*age+5:10*w+6.25*h-5*age-161;
  return Math.round(bmr*[1.2,1.375,1.55,1.725,1.9][activity]);
}

function makeSel(active){return{background:active?"#fff":"#1a1a1a",color:active?"#000":"#aaa",border:"none",borderRadius:7,cursor:"pointer",fontWeight:active?700:400,fontSize:13,textAlign:"center",width:TILE,height:TILE,flexShrink:0,transition:"background 0.15s"};}

function TimePicker({value,onChange,onClose,onRemove}){
  const [h,setH]=useState(value?value.split(":")[0]:"08");
  const [m,setM]=useState(value?value.split(":")[1]:"00");
  const btn=extra=>({borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:700,padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"center",gap:7,width:"100%",border:"none",...extra});
  return(
    <div style={{marginLeft:42,display:"flex",gap:12,alignItems:"center"}}>
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>
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
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="100%" height="100%">
  <defs>
    <linearGradient id="mmMuscleGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#b83b3b"/><stop offset="50%" stop-color="#962d2d"/><stop offset="100%" stop-color="#731f1f"/></linearGradient>
    <linearGradient id="mmLightGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#d65151"/><stop offset="60%" stop-color="#b83b3b"/><stop offset="100%" stop-color="#8a2626"/></linearGradient>
    <linearGradient id="mmDarkGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#872525"/><stop offset="70%" stop-color="#611818"/><stop offset="100%" stop-color="#421010"/></linearGradient>
    <linearGradient id="mmTendonGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f0f2f5"/><stop offset="50%" stop-color="#d2d7df"/><stop offset="100%" stop-color="#b0b7c2"/></linearGradient>
  </defs>
  <rect width="1000" height="700" fill="#161616"/>
  <g id="mm-front-body">
    <path d="M280,90 Q250,90 245,120 Q220,140 200,160 Q175,190 160,250 Q150,300 170,360 Q180,380 180,420 Q170,500 185,600 L210,610 L220,590 Q240,490 255,440 L280,440 L305,440 Q320,490 340,590 L350,610 L375,600 Q390,500 380,420 Q380,380 390,360 Q410,300 400,250 Q385,190 360,160 Q340,140 315,120 Q310,90 280,90 Z" fill="#2d1919" stroke="#ff4a4a" stroke-width="0.5" opacity="0.3"/>
    <ellipse cx="280" cy="115" rx="22" ry="25" fill="url(#mmDarkGrad)"/>
    <path d="M265,135 Q255,165 245,175 L260,175 Q270,155 275,140 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M295,135 Q305,165 315,175 L300,175 Q290,155 285,140 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M275,140 L285,140 L280,175 Z" fill="url(#mmDarkGrad)"/>
    <path d="M245,175 Q215,175 205,195 Q195,215 205,235 L225,210 Q240,190 255,180 Z" fill="url(#mmLightGrad)"/>
    <path d="M315,175 Q345,175 355,195 Q365,215 355,235 L335,210 Q320,190 305,180 Z" fill="url(#mmLightGrad)"/>
    <path d="M280,180 Q240,175 220,195 Q215,215 225,245 Q255,245 280,215 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M280,180 Q320,175 340,195 Q345,215 335,245 Q305,245 280,215 Z" fill="url(#mmMuscleGrad)"/>
    <rect x="258" y="250" width="20" height="22" rx="3" fill="url(#mmLightGrad)"/>
    <rect x="282" y="250" width="20" height="22" rx="3" fill="url(#mmLightGrad)"/>
    <rect x="259" y="275" width="19" height="24" rx="3" fill="url(#mmLightGrad)"/>
    <rect x="282" y="275" width="19" height="24" rx="3" fill="url(#mmLightGrad)"/>
    <rect x="261" y="302" width="18" height="26" rx="3" fill="url(#mmMuscleGrad)"/>
    <rect x="281" y="302" width="18" height="26" rx="3" fill="url(#mmMuscleGrad)"/>
    <line x1="280" y1="245" x2="280" y2="335" stroke="#eef2f7" stroke-width="2" stroke-dasharray="2,2" opacity="0.7"/>
    <path d="M220,225 Q210,250 215,280 Q230,310 255,325 L255,250 Z" fill="url(#mmDarkGrad)"/>
    <path d="M340,225 Q350,250 345,280 Q330,310 305,325 L305,250 Z" fill="url(#mmDarkGrad)"/>
    <path d="M205,235 Q195,265 190,295 L210,295 Q220,265 225,245 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M355,235 Q365,265 370,295 L350,295 Q340,265 335,245 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M190,295 Q175,340 180,375 L195,370 Q195,330 210,295 Z" fill="url(#mmLightGrad)"/>
    <path d="M370,295 Q385,340 380,375 L365,370 Q365,330 350,295 Z" fill="url(#mmLightGrad)"/>
    <path d="M235,325 Q235,355 250,365 L280,340 L235,325 Z" fill="url(#mmDarkGrad)"/>
    <path d="M325,325 Q325,355 310,365 L280,340 L325,325 Z" fill="url(#mmDarkGrad)"/>
    <path d="M230,360 Q215,410 220,465 L245,465 Q245,410 255,363 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M255,363 Q250,410 245,450 L260,450 Q265,410 270,367 Z" fill="url(#mmLightGrad)"/>
    <path d="M270,367 Q270,410 260,455 L272,460 Q285,420 282,372 Z" fill="url(#mmDarkGrad)"/>
    <path d="M330,360 Q345,410 340,465 L315,465 Q315,410 305,363 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M305,363 Q310,410 315,450 L300,450 Q295,410 290,367 Z" fill="url(#mmLightGrad)"/>
    <path d="M290,367 Q290,410 300,455 L288,460 Q275,420 278,372 Z" fill="url(#mmDarkGrad)"/>
    <path d="M235,485 Q225,530 230,580 L245,585 Q250,530 252,485 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M252,485 Q255,520 262,560 L252,565 Z" fill="url(#mmLightGrad)"/>
    <path d="M325,485 Q335,530 330,580 L315,585 Q310,530 308,485 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M308,485 Q305,520 298,560 L308,565 Z" fill="url(#mmLightGrad)"/>
  </g>
  <g id="mm-back-body">
    <path d="M720,90 Q690,90 685,120 Q660,140 640,160 Q615,190 600,250 Q590,300 610,360 Q620,380 620,420 Q610,500 625,600 L650,610 L660,590 Q680,490 695,440 L720,440 L745,440 Q760,490 780,590 L790,610 L815,600 Q830,500 820,420 Q820,380 830,360 Q850,300 840,250 Q825,190 800,160 Q780,140 755,120 Q750,90 720,90 Z" fill="#2d1919" stroke="#ff4a4a" stroke-width="0.5" opacity="0.3"/>
    <ellipse cx="720" cy="115" rx="22" ry="25" fill="url(#mmDarkGrad)"/>
    <path d="M720,130 L740,165 L770,180 Q740,210 720,255 Q700,210 670,180 L700,165 Z" fill="url(#mmLightGrad)"/>
    <path d="M685,175 Q660,175 645,195 Q635,215 645,235 L665,220 Q675,200 685,178 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M755,175 Q780,175 795,195 Q805,215 795,235 L775,220 Q765,200 755,178 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M720,255 Q685,220 655,235 Q645,260 650,300 Q685,320 720,325 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M720,255 Q755,220 785,235 Q795,260 790,300 Q755,320 720,325 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M705,255 L735,255 L730,330 L710,330 Z" fill="url(#mmDarkGrad)"/>
    <path d="M645,235 Q635,265 630,295 L650,295 Q655,270 665,220 Z" fill="url(#mmLightGrad)"/>
    <path d="M795,235 Q805,265 810,295 L790,295 Q785,270 775,220 Z" fill="url(#mmLightGrad)"/>
    <path d="M630,295 Q615,340 620,375 L635,370 Q635,330 650,295 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M810,295 Q825,340 820,375 L805,370 Q805,330 790,295 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M668,355 Q655,385 680,415 Q710,415 720,370 Q720,340 695,345 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M772,355 Q785,385 760,415 Q730,415 720,370 Q720,340 745,345 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M665,410 Q655,445 660,470 L685,468 Q680,440 685,412 Z" fill="url(#mmDarkGrad)"/>
    <path d="M685,412 Q680,440 685,468 L710,465 Q710,435 712,412 Z" fill="url(#mmLightGrad)"/>
    <path d="M775,410 Q785,445 780,470 L755,468 Q760,440 755,412 Z" fill="url(#mmDarkGrad)"/>
    <path d="M755,412 Q760,440 755,468 L730,465 Q730,435 728,412 Z" fill="url(#mmLightGrad)"/>
    <path d="M670,490 Q655,515 665,545 L688,540 Q688,515 688,490 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M688,490 Q688,515 688,540 L702,535 Q702,510 698,490 Z" fill="url(#mmLightGrad)"/>
    <path d="M770,490 Q785,515 775,545 L752,540 Q752,515 752,490 Z" fill="url(#mmMuscleGrad)"/>
    <path d="M752,490 Q752,515 752,540 L738,535 Q738,510 742,490 Z" fill="url(#mmLightGrad)"/>
  </g>
</svg>`;

const FRONT_PATHS = {
  deltoid_front:["M245,175 Q215,175 205,195 Q195,215 205,235 L225,210 Q240,190 255,180 Z","M315,175 Q345,175 355,195 Q365,215 355,235 L335,210 Q320,190 305,180 Z"],
  pectoralis:["M280,180 Q240,175 220,195 Q215,215 225,245 Q255,245 280,215 Z","M280,180 Q320,175 340,195 Q345,215 335,245 Q305,245 280,215 Z"],
  biceps:["M205,235 Q195,265 190,295 L210,295 Q220,265 225,245 Z","M355,235 Q365,265 370,295 L350,295 Q340,265 335,245 Z"],
  forearm_front:["M190,295 Q175,340 180,375 L195,370 Q195,330 210,295 Z","M370,295 Q385,340 380,375 L365,370 Q365,330 350,295 Z"],
  serratus:["M220,225 Q210,250 215,280 Q230,310 255,325 L255,250 Z","M340,225 Q350,250 345,280 Q330,310 305,325 L305,250 Z"],
  rectus_abdominis:["M258,250 L278,250 L278,272 L258,272 Z M282,250 L302,250 L302,272 L282,272 Z M259,275 L278,275 L278,299 L259,299 Z M282,275 L301,275 L301,299 L282,299 Z M261,302 L279,302 L279,328 L261,328 Z M281,302 L299,302 L299,328 L281,328 Z"],
  obliques:["M220,225 Q215,215 225,245 L255,250 L255,325 Q235,325 235,360 L230,360 Q215,410 220,465 L225,465 Q225,360 240,340 Z","M340,225 Q345,215 335,245 L305,250 L305,325 Q325,325 325,360 L330,360 Q345,410 340,465 L335,465 Q335,360 320,340 Z"],
  quadriceps:["M230,360 Q215,410 220,465 L245,465 Q245,410 255,363 Z M255,363 Q250,410 245,450 L260,450 Q265,410 270,367 Z M270,367 Q270,410 260,455 L272,460 Q285,420 282,372 Z","M330,360 Q345,410 340,465 L315,465 Q315,410 305,363 Z M305,363 Q310,410 315,450 L300,450 Q295,410 290,367 Z M290,367 Q290,410 300,455 L288,460 Q275,420 278,372 Z"],
  adductors:["M235,325 Q235,355 250,365 L280,340 L235,325 Z","M325,325 Q325,355 310,365 L280,340 L325,325 Z"],
  sternocleidomastoid:["M265,128 C264,135 262,145 263,155 L267,175 L275,173 C274,160 273,148 272,137 Z","M295,128 C296,135 298,145 297,155 L293,175 L285,173 C286,160 287,148 288,137 Z"],
  scalenes:["M253,132 C248,140 246,152 248,165 L256,172 L260,160 C258,148 256,138 255,132 Z","M307,132 C312,140 314,152 312,165 L304,172 L300,160 C302,148 304,138 305,132 Z"],
  platysma:["M260,130 C258,138 257,148 258,158 L260,172 L300,172 L302,158 C303,148 302,138 300,130 C292,126 268,126 260,130 Z"],
  tibialis:["M235,485 Q225,530 230,580 L245,585 Q250,530 252,485 Z M252,485 Q255,520 262,560 L252,565 Z","M325,485 Q335,530 330,580 L315,585 Q310,530 308,485 Z M308,485 Q305,520 298,560 L308,565 Z"],
};
const BACK_PATHS = {
  trapezius:["M720,130 L740,165 L770,180 Q740,210 720,255 Q700,210 670,180 L700,165 Z"],
  deltoid_back:["M685,175 Q660,175 645,195 Q635,215 645,235 L665,220 Q675,200 685,178 Z","M755,175 Q780,175 795,195 Q805,215 795,235 L775,220 Q765,200 755,178 Z"],
  infraspinatus:["M720,255 Q685,220 655,235 Q645,260 650,300 Q685,320 720,325 Z","M720,255 Q755,220 785,235 Q795,260 790,300 Q755,320 720,325 Z"],
  triceps:["M645,235 Q635,265 630,295 L650,295 Q655,270 665,220 Z M630,295 Q615,340 620,375 L635,370 Q635,330 650,295 Z","M795,235 Q805,265 810,295 L790,295 Q785,270 775,220 Z M810,295 Q825,340 820,375 L805,370 Q805,330 790,295 Z"],
  forearm_back:["M630,295 Q615,340 620,375 L635,370 Q635,330 650,295 Z","M810,295 Q825,340 820,375 L805,370 Q805,330 790,295 Z"],
  latissimus:["M655,235 Q645,260 650,300 Q685,320 720,325 Q720,340 695,345 Q668,355 655,385 Q680,415 710,415 L720,370 Z","M785,235 Q795,260 790,300 Q755,320 720,325 Q720,340 745,345 Q772,355 785,385 Q760,415 730,415 L720,370 Z"],
  erector_spinae:["M705,255 L735,255 L730,330 L710,330 Z M695,310 L745,310 L735,345 L705,345 Z"],
  gluteus:["M668,355 Q655,385 680,415 Q710,415 720,370 Q720,340 695,345 Z","M772,355 Q785,385 760,415 Q730,415 720,370 Q720,340 745,345 Z"],
  hamstrings:["M665,410 Q655,445 660,470 L685,468 Q680,440 685,412 Z M685,412 Q680,440 685,468 L710,465 Q710,435 712,412 Z","M775,410 Q785,445 780,470 L755,468 Q760,440 755,412 Z M755,412 Q760,440 755,468 L730,465 Q730,435 728,412 Z"],
  gastrocnemius:["M670,490 Q655,515 665,545 L688,540 Q688,515 688,490 Z M688,490 Q688,515 688,540 L702,535 Q702,510 698,490 Z","M770,490 Q785,515 775,545 L752,540 Q752,515 752,490 Z M752,490 Q752,515 752,540 L738,535 Q738,510 742,490 Z"],
};

function BodySVG({selected,hovered,onHover,onClick}){
  const allPaths=[...Object.entries(FRONT_PATHS).map(([id,dArr])=>({id,dArr})),...Object.entries(BACK_PATHS).map(([id,dArr])=>({id,dArr}))];
  return(
    <div style={{position:"relative",width:"100%",lineHeight:0}}>
      <div dangerouslySetInnerHTML={{__html:BODY_SVG_MARKUP}} style={{display:"block"}}/>
      <svg viewBox="0 0 1000 700" style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none"}}>
        {allPaths.map(({id,dArr})=>{
          const m=MUSCLES[id];const isHov=hovered===id;const isSel=selected===id;
          return dArr.map((d,i)=>(
            <path key={id+i} d={d} fill={m?.color||"#fff"} fillOpacity={isSel?0.55:isHov?0.45:0.28} stroke={isSel||isHov?"#fff":m?.color||"#fff"} strokeWidth={isSel?1.5:isHov?1:0.8} strokeOpacity={isSel?0.9:isHov?0.7:0.5}
              style={{cursor:"pointer",pointerEvents:"all",filter:isSel?`drop-shadow(0 0 8px ${m?.color}cc)`:isHov?`drop-shadow(0 0 4px ${m?.color}88)`:"none",transition:"fill-opacity 0.12s, filter 0.12s"}}
              onMouseEnter={()=>onHover(id)} onMouseLeave={()=>onHover(null)} onClick={()=>onClick(id)}/>
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

function MuscleMap(){
  const [hovered,setHovered]=useState(null);
  const [selected,setSelected]=useState(null);
  const hoveredMuscle=hovered?MUSCLES[hovered]:null;
  return(
    <div>
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:11,letterSpacing:"0.2em",color:"#5DCAA5",fontWeight:600,fontFamily:"monospace",marginBottom:6}}>ANATOMIA INTERAKTYWNA</div>
        <div style={{fontSize:22,fontWeight:700,color:"#f5f5f0"}}>Mapa Mięśni Człowieka</div>
        <div style={{marginTop:6,fontSize:12,color:"#666"}}>Najedź, aby podejrzeć · Kliknij, aby zobaczyć ćwiczenia</div>
      </div>
      <div style={{display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
        <div style={{flex:"1 1 340px",minWidth:280}}>
          <div style={{display:"flex",justifyContent:"space-around",marginBottom:6}}>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.15em",color:"#444",fontFamily:"monospace"}}>PRZÓD</span>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.15em",color:"#444",fontFamily:"monospace"}}>TYŁ</span>
          </div>
          <div style={{borderRadius:12,border:"1px solid #1e2130",overflow:"hidden"}}>
            <BodySVG selected={selected} hovered={hovered} onHover={setHovered} onClick={id=>setSelected(p=>p===id?null:id)}/>
          </div>
        </div>
        <div style={{flex:"1 1 260px",minWidth:240,minHeight:460,background:"#13161f",border:`1px solid ${selected?MUSCLES[selected]?.color+"55":"#1e2130"}`,borderRadius:14,position:"relative",overflow:"hidden"}}>
          {!selected&&(
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
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:400,color:"#333",textAlign:"center",gap:12}}>
                  <div style={{fontSize:36}}>🫀</div>
                  <div style={{fontSize:13,lineHeight:1.7,maxWidth:180}}>Najedź na mięsień na sylwetce, aby zobaczyć szczegóły.<br/><br/><span style={{color:"#444"}}>Kliknij, aby otworzyć plan ćwiczeń.</span></div>
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

// ── MAIN ──────────────────────────────────────────────────────────────────
export default function App() {
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

  const [profile,setProfile]=useState({weight:"",height:"",age:"",sex:"M",activity:1});
  const [bmiVal,setBmiVal]=useState(null);
  const [tdee,setTdee]=useState(null);
  const [calDays,setCalDays]=useState({});
  const [calDate,setCalDate]=useState(today());
  const [customFoods,setCustomFoods]=useState([]);
  const [modal,setModal]=useState(false);
  const [search,setSearch]=useState("");
  const [selCat,setSelCat]=useState("Wszystkie");
  const [grams,setGrams]=useState(100);
  const [selFood,setSelFood]=useState(null);
  const [showCustomForm,setShowCustomForm]=useState(false);
  const [customForm,setCustomForm]=useState({name:"",cal:"",p:"",c:"",f:""});

  const [mainTab,setMainTab]=useState("nawyki");

  // ── DOŁEK STATE ──
  const DOLEK_KEY="dolekSystem_v1";
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

  useEffect(()=>{
    (async()=>{
      try{
        const r=await window.storage.get(DOLEK_KEY);
        if(r){const d=JSON.parse(r.value);if(d.kotwice)setKotwice(d.kotwice);}
      }catch(_){}
    })();
  },[]);

  const saveDolekData=(k)=>{window.storage.set(DOLEK_KEY,JSON.stringify({kotwice:k})).catch(()=>{});};

  const addKotwica=()=>{
    if(!kotwicaInput.trim())return;
    const k=[...kotwice,{emoji:kotwicaEmoji,text:kotwicaInput.trim()}];
    setKotwice(k);saveDolekData(k);setKotwicaInput("");
  };
  const delKotwica=i=>{const k=kotwice.filter((_,idx)=>idx!==i);setKotwice(k);saveDolekData(k);};
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

  useEffect(()=>{
    (async()=>{
      try{
        const [hr,br,cr]=await Promise.allSettled([
          window.storage.get(HABIT_KEY),
          window.storage.get(BMI_KEY),
          window.storage.get(CUSTOM_KEY),
        ]);
        if(hr.status==="fulfilled"&&hr.value){const d=JSON.parse(hr.value.value);setHabits(d.habits||[]);setHabitLogs(d.logs||{});}
        if(br.status==="fulfilled"&&br.value){const d=JSON.parse(br.value.value);if(d.profile)setProfile(d.profile);if(d.calDays)setCalDays(d.calDays);if(d.tdee)setTdee(d.tdee);if(d.bmiVal)setBmiVal(d.bmiVal);}
        if(cr.status==="fulfilled"&&cr.value){setCustomFoods(JSON.parse(cr.value.value)||[]);}
      }catch(_){}
      setLoading(false);
    })();
  },[]);

  const saveHabits=(h,l)=>{setSaving(true);window.storage.set(HABIT_KEY,JSON.stringify({habits:h,logs:l})).finally(()=>setSaving(false));};
  const saveBmi=useCallback((p,cd,t,b)=>{window.storage.set(BMI_KEY,JSON.stringify({profile:p,calDays:cd,tdee:t,bmiVal:b}));},[]);
  const saveCustom=f=>window.storage.set(CUSTOM_KEY,JSON.stringify(f));

  const addHabit=()=>{
    if(!newName.trim())return;
    const h=[...habits,{id:Date.now().toString(),name:newName.trim(),category:newCat,time:newTime}];
    setHabits(h);saveHabits(h,habitLogs);setNewName("");setNewTime("");setShowForm(false);
  };
  const deleteHabit=id=>{const h=habits.filter(x=>x.id!==id);setHabits(h);saveHabits(h,habitLogs);};
  const updateTime=(id,time)=>{const h=habits.map(x=>x.id===id?{...x,time}:x);setHabits(h);saveHabits(h,habitLogs);setEditTimeId(null);};
  const updateName=(id,name)=>{
    if(!name.trim())return;
    const h=habits.map(x=>x.id===id?{...x,name:name.trim()}:x);
    setHabits(h);saveHabits(h,habitLogs);setEditNameId(null);
  };
  const toggleHabit=(habitId,date)=>{const key=`${habitId}_${date}`;const l={...habitLogs,[key]:!habitLogs[key]};setHabitLogs(l);saveHabits(habits,l);};
  const isChecked=(habitId,date)=>!!habitLogs[`${habitId}_${date}`];
  const getStreak=id=>{let s=0;const d=new Date();while(true){const ds=toISO(d);if(habitLogs[`${id}_${ds}`]){s++;d.setDate(d.getDate()-1);}else break;}return s;};
  const getWeeklyRate=id=>{const d=getLast7();return Math.round((d.filter(x=>habitLogs[`${id}_${x}`]).length/7)*100);};
  const getView=id=>progressView[id]||"7dni";
  const setView=(id,v)=>setProgressView(p=>({...p,[id]:v}));
  const sortedHabits=[...habits].sort((a,b)=>{if(!a.time&&!b.time)return 0;if(!a.time)return 1;if(!b.time)return-1;return a.time.localeCompare(b.time);});

  const calcAll=()=>{
    const {weight:w,height:h,age,sex,activity}=profile;
    if(!w||!h||!age)return;
    const bmi=calcBMI(+w,+h);
    const t=calcTDEE(+w,+h,+age,sex,+activity);
    setBmiVal(bmi);setTdee(t);saveBmi(profile,calDays,t,bmi);
  };

  const todayStr=today();
  const todayEntries=calDays[calDate]||[];
  const dayTotals=entries=>entries.reduce((a,e)=>({cal:a.cal+e.cal,p:a.p+e.p,c:a.c+e.c,f:a.f+e.f,fb:a.fb+(e.fb||0),s:a.s+(e.s||0)}),{cal:0,p:0,c:0,f:0,fb:0,s:0});
  const totToday=dayTotals(todayEntries);
  const pctToday=tdee?Math.min(200,Math.round(totToday.cal/tdee*100)):null;

  const addFood=()=>{
    if(!selFood)return;
    const ratio=grams/100;
    const entry={id:Date.now(),name:selFood.name,grams,cal:Math.round(selFood.cal*ratio),p:Math.round(selFood.p*ratio*10)/10,c:Math.round(selFood.c*ratio*10)/10,f:Math.round(selFood.f*ratio*10)/10,fb:Math.round((selFood.fb||0)*ratio*10)/10,s:Math.round((selFood.s||0)*ratio*10)/10};
    const newCd={...calDays,[calDate]:[...todayEntries,entry]};
    setCalDays(newCd);saveBmi(profile,newCd,tdee,bmiVal);
    setModal(false);setSelFood(null);setSearch("");setGrams(100);
  };
  const removeEntry=id=>{
    const newCd={...calDays,[calDate]:todayEntries.filter(e=>e.id!==id)};
    setCalDays(newCd);saveBmi(profile,newCd,tdee,bmiVal);
  };
  const addCustomFood=()=>{
    const {name,cal,p,c,f}=customForm;
    if(!name||!cal||!p||!c||!f)return;
    const nf={id:Date.now(),name,cal:+cal,p:+p,c:+c,f:+f,category:"⭐ Własne produkty",isCustom:true};
    const u=[...customFoods,nf];setCustomFoods(u);saveCustom(u);
    setCustomForm({name:"",cal:"",p:"",c:"",f:""});setShowCustomForm(false);
  };
  const deleteCustomFood=id=>{const u=customFoods.filter(f=>f.id!==id);setCustomFoods(u);saveCustom(u);};

  const [apiResults,setApiResults]=useState([]);
  const [apiLoading,setApiLoading]=useState(false);
  const [apiError,setApiError]=useState("");
  const [searchMode,setSearchMode]=useState("local"); // "local" | "api"
  const [apiQuery,setApiQuery]=useState("");

  const searchOpenFoodFacts=async(query)=>{
    if(!query.trim())return;
    setApiLoading(true);setApiError("");setApiResults([]);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          messages:[{role:"user",content:`Wyszukaj w internecie wartości odżywcze na 100 g dla produktów spożywczych pasujących do frazy: "${query}". Preferuj dane z Open Food Facts lub tabel wartości odżywczych. Zwróć WYŁĄCZNIE tablicę JSON (bez markdown, bez żadnego komentarza) z maksymalnie 8 produktami w formacie:
[{"name":"nazwa","cal":liczba,"p":liczba,"c":liczba,"f":liczba}]
gdzie cal=kcal/100g, p=białko(g)/100g, c=węglowodany(g)/100g, f=tłuszcze(g)/100g. Zaokrąglij do 1 miejsca po przecinku. Jeśli nic nie znajdziesz, zwróć [].`}],
          tools:[{type:"web_search_20250305",name:"web_search"}]
        })
      });
      if(!res.ok)throw new Error("HTTP "+res.status);
      const data=await res.json();
      const text=(data.content||[]).filter(i=>i.type==="text").map(i=>i.text||"").join("");
      const match=text.match(/\[[\s\S]*\]/);
      if(!match)throw new Error("brak danych w odpowiedzi");
      const parsed=JSON.parse(match[0]);
      const results=parsed.map(p=>({
        name:String(p.name||"").slice(0,55),
        cal:Math.round(p.cal||0),
        p:Math.round((p.p||0)*10)/10,
        c:Math.round((p.c||0)*10)/10,
        f:Math.round((p.f||0)*10)/10,
        category:"🌍 Wyszukane online",
        isApi:true,
      })).filter(x=>x.name&&x.cal);
      setApiResults(results);
      if(results.length===0)setApiError("Brak wyników. Spróbuj innej frazy.");
    }catch(e){
      setApiError("Błąd wyszukiwania: "+e.message+". Spróbuj ponownie.");
    }
    setApiLoading(false);
  };

  const allFoods=[...customFoods,...ALL_FOODS];
  const filtered=searchMode==="api"?apiResults:allFoods.filter(f=>{
    const matchCat=selCat==="Wszystkie"||f.category===selCat;
    const matchSearch=f.name.toLowerCase().includes(search.toLowerCase());
    return matchCat&&matchSearch;
  });
  const calLogsFlat=Object.fromEntries(Object.entries(calDays).map(([d,entries])=>[d,entries.reduce((s,e)=>s+e.cal,0)]));
  const bmiInfo=bmiVal?getBMILabel(bmiVal):null;
  const days7=getLast7();

  if(loading)return <div style={{background:"#0a0a0a",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>Ładowanie...</div>;

  return(
    <div style={{background:"#0a0a0a",minHeight:"100vh",fontFamily:"'Inter',sans-serif",color:"#f1f1f1",padding:"24px 16px"}}>
      <div style={{maxWidth:680,margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div>
            <h1 style={{margin:0,fontSize:24,fontWeight:700}}>Tracker</h1>
            <p style={{margin:0,color:"#888",fontSize:13,textTransform:"capitalize"}}>{new Date().toLocaleDateString("pl-PL",{weekday:"long",month:"long",day:"numeric"})}</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {saving&&<span style={{fontSize:12,color:"#888"}}>Zapisywanie…</span>}
            {mainTab==="nawyki"&&<button onClick={()=>setShowForm(!showForm)} style={{background:"#fff",color:"#000",border:"none",borderRadius:10,padding:"8px 16px",fontWeight:600,cursor:"pointer",fontSize:14}}>+ Dodaj</button>}
          </div>
        </div>

        {/* Main tabs */}
        <div style={{display:"flex",gap:4,background:"#161616",borderRadius:10,padding:4,marginBottom:20}}>
          {[["nawyki","Nawyki"],["kalorie","Kalorie & BMI"],["miesnie","Mięśnie"],["dolек","Z dołka"]].map(([k,l])=>(
            <button key={k} onClick={()=>setMainTab(k)} style={{flex:1,background:mainTab===k?"#2a2a2a":"transparent",border:"none",borderRadius:8,padding:"8px 4px",color:mainTab===k?"#fff":"#666",fontWeight:600,cursor:"pointer",fontSize:13}}>{l}</button>
          ))}
        </div>

        {/* ═══ NAWYKI ═══ */}
        {mainTab==="nawyki"&&(
          <div>
            <div style={{display:"flex",gap:4,background:"#161616",borderRadius:10,padding:4,marginBottom:20}}>
              {[["dzisiaj","Dzisiaj"],["postep","Postęp"]].map(([k,l])=>(
                <button key={k} onClick={()=>setHabitTab(k)} style={{flex:1,background:habitTab===k?"#2a2a2a":"transparent",border:"none",borderRadius:8,padding:"8px",color:habitTab===k?"#fff":"#666",fontWeight:600,cursor:"pointer",fontSize:14}}>{l}</button>
              ))}
            </div>

            {showForm&&(
              <div style={{background:"#161616",border:"1px solid #2a2a2a",borderRadius:14,padding:16,marginBottom:20}}>
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
                    {habit.time&&!isEditingTime&&<button onClick={()=>setEditTimeId(habit.id)} style={{background:"#222",border:"none",borderRadius:8,padding:"4px 10px",color:"#aaa",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>🕐 {habit.time}</button>}
                    {!habit.time&&!isEditingTime&&<button onClick={()=>setEditTimeId(habit.id)} style={{background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:16,padding:4}}>🕐</button>}
                    <button onClick={()=>deleteHabit(habit.id)} style={{background:"#3a1a1a",border:"1px solid #6b2020",borderRadius:8,color:"#f87171",cursor:"pointer",fontSize:16,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
                  </div>
                  {isEditingTime&&(
                    <div style={{marginTop:10}}>
                      <TimePicker value={habit.time} onChange={t=>updateTime(habit.id,t)} onClose={()=>setEditTimeId(null)} onRemove={habit.time?()=>updateTime(habit.id,""):null}/>
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
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:15}}>{habit.name}</div>
                      <div style={{fontSize:12,color:cat.color,marginTop:2}}>{habit.category}{habit.time&&<span style={{color:"#666"}}> · 🕐 {habit.time}</span>}</div>
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
              <div>
                <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:20,marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#ccc",marginBottom:16}}>Twoje dane</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
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
                      <option value={0}>🛋️ Siedzący</option>
                      <option value={1}>🚶 Lekko aktywny (1-3 dni/tydz.)</option>
                      <option value={2}>🏃 Umiarkowanie aktywny (3-5 dni/tydz.)</option>
                      <option value={3}>💪 Bardzo aktywny (6-7 dni/tydz.)</option>
                      <option value={4}>🏋️ Ekstremalnie aktywny</option>
                    </select>
                  </div>
                  <button onClick={calcAll} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>Oblicz BMI i zapotrzebowanie</button>
                </div>
                {bmiVal&&bmiInfo&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:20,textAlign:"center"}}>
                      <div style={{fontSize:12,color:"#888",marginBottom:6}}>Twoje BMI</div>
                      <div style={{fontSize:48,fontWeight:800,color:bmiInfo.color}}>{bmiVal.toFixed(1)}</div>
                      <div style={{display:"inline-block",marginTop:6,padding:"3px 14px",borderRadius:20,background:bmiInfo.color+"22",color:bmiInfo.color,fontWeight:700,fontSize:13}}>{bmiInfo.label}</div>
                      <div style={{marginTop:12,fontSize:11,color:"#555",lineHeight:1.8}}>
                        <div>Niedowaga: &lt;18.5</div><div>Norma: 18.5–24.9</div><div>Nadwaga: 25–29.9</div><div>Otyłość: ≥30</div>
                      </div>
                    </div>
                    <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:20,textAlign:"center"}}>
                      <div style={{fontSize:12,color:"#888",marginBottom:6}}>Dzienne zapotrzebowanie</div>
                      <div style={{fontSize:48,fontWeight:800,color:"#667eea"}}>{tdee}</div>
                      <div style={{color:"#888",fontSize:13,marginBottom:12}}>kcal / dzień</div>
                      <div style={{background:"#0a0a0a",borderRadius:10,padding:10}}>
                        <div style={{fontSize:11,color:"#666",marginBottom:8}}>Sugerowane makro:</div>
                        <div style={{display:"flex",justifyContent:"space-around"}}>
                          {[["Białko",Math.round(tdee*0.3/4)+"g","#22c55e"],["Węgl.",Math.round(tdee*0.45/4)+"g","#f59e0b"],["Tłuszcze",Math.round(tdee*0.25/9)+"g","#ef4444"]].map(([n,v,c])=>(
                            <div key={n} style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:10,color:"#555"}}>{n}</div></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tracker */}
            {bmiTab==="tracker"&&(
              <div>
                <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:16,marginBottom:16}}>
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <button onClick={()=>{const d=new Date(calDate+"T00:00:00");d.setDate(d.getDate()-1);setCalDate(toISO(d));}} style={{background:"#222",border:"none",borderRadius:8,color:"#aaa",cursor:"pointer",fontSize:16,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>‹</button>
                      <div style={{textAlign:"center",minWidth:118}}>
                        <div style={{fontWeight:700,fontSize:15,textTransform:"capitalize"}}>{(()=>{const t=today();if(calDate===t)return"Dzisiaj";const y=new Date();y.setDate(y.getDate()-1);if(calDate===toISO(y))return"Wczoraj";return new Date(calDate+"T00:00:00").toLocaleDateString("pl-PL",{weekday:"short",day:"numeric",month:"short"});})()}</div>
                        <div style={{fontSize:11,color:"#666"}}>{todayEntries.length} produktów</div>
                      </div>
                      <button onClick={()=>{if(calDate>=today())return;const d=new Date(calDate+"T00:00:00");d.setDate(d.getDate()+1);setCalDate(toISO(d));}} disabled={calDate>=today()} style={{background:calDate>=today()?"#161616":"#222",border:"none",borderRadius:8,color:calDate>=today()?"#333":"#aaa",cursor:calDate>=today()?"default":"pointer",fontSize:16,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>›</button>
                    </div>
                    <button onClick={()=>setModal(true)} style={{background:"linear-gradient(135deg,#667eea,#764ba2)",color:"#fff",border:"none",borderRadius:10,padding:"8px 16px",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0}}>➕ Dodaj produkt</button>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="date" value={calDate} max={today()} onChange={e=>e.target.value&&setCalDate(e.target.value)} style={{background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"6px 10px",color:"#fff",fontSize:12,colorScheme:"dark",outline:"none"}}/>
                    {calDate!==today()&&<button onClick={()=>setCalDate(today())} style={{background:"#222",border:"1px solid #444",borderRadius:8,color:"#aaa",fontSize:12,padding:"6px 12px",cursor:"pointer"}}>↩ Wróć do dziś</button>}
                  </div>
                </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
                    {[["🔥",totToday.cal,"kcal","#667eea"],["🥑",totToday.f.toFixed(1),"g Tłuszcz","#ef4444"],["🌾",totToday.c.toFixed(1),"g Węgl.","#f59e0b"],["💪",totToday.p.toFixed(1),"g Białko","#22c55e"],["🌿",totToday.fb.toFixed(1),"g Błonnik","#84cc16"],["🧂",totToday.s.toFixed(1),"g Sól","#94a3b8"]].map(([icon,val,unit,color])=>(
                      <div key={unit} style={{background:"#0a0a0a",borderRadius:10,padding:10,textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#666",marginBottom:2}}>{icon}</div>
                        <div style={{fontSize:18,fontWeight:800,color}}>{val}</div>
                        <div style={{fontSize:10,color:"#555"}}>{unit}</div>
                      </div>
                    ))}
                  </div>
                  {pctToday!==null&&(
                    <div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#666",marginBottom:4}}>
                        <span>{totToday.cal} kcal</span><span>Cel: {tdee} kcal ({pctToday}%)</span>
                      </div>
                      <div style={{background:"#2a2a2a",borderRadius:99,height:8,overflow:"hidden"}}>
                        <div style={{width:`${Math.min(100,pctToday)}%`,height:"100%",borderRadius:99,background:pctToday>100?"#ef4444":"linear-gradient(90deg,#667eea,#22c55e)",transition:"width 0.4s"}}/>
                      </div>
                      {pctToday>100&&<div style={{fontSize:11,color:"#ef4444",marginTop:4,fontWeight:600}}>⚠️ Przekroczono dzienne zapotrzebowanie!</div>}
                    </div>
                  )}
                  {todayEntries.length>0&&(
                    <div style={{marginTop:12,borderTop:"1px solid #1e1e1e",paddingTop:12}}>
                      {todayEntries.map((e,ri)=>(
                        <div key={e.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:ri<todayEntries.length-1?"1px solid #1a1a1a":"none"}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600}}>{e.name}</div>
                            <div style={{fontSize:11,color:"#555"}}>{e.grams}g · T:{e.f}g W:{e.c}g B:{e.p}g Bł:{e.fb||0}g Sól:{e.s||0}g</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <span style={{fontSize:14,fontWeight:700,color:"#667eea"}}>{e.cal} kcal</span>
                            <button onClick={()=>removeEntry(e.id)} style={{background:"#3a1a1a",border:"1px solid #6b2020",borderRadius:7,color:"#f87171",cursor:"pointer",fontSize:13,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:16}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#ccc"}}>📅 Historia kalorii</div>
                  <CalYearView calLogs={calLogsFlat} tdee={tdee}/>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

              {/* ═══ MIĘŚNIE ═══ */}
        {mainTab==="miesnie"&&<MuscleMap/>}

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
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:24}}>
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
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={e=>{if(e.target===e.currentTarget){setModal(false);setSelFood(null);setSearch("");setGrams(100);}}}>
          <div style={{background:"#161616",borderRadius:"20px 20px 0 0",padding:24,width:"100%",maxWidth:600,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(0,0,0,.4)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{margin:0,fontSize:17,fontWeight:700}}>Dodaj produkt</h3>
              <button onClick={()=>{setModal(false);setSelFood(null);setSearch("");setGrams(100);}} style={{background:"#222",border:"none",borderRadius:8,color:"#aaa",fontSize:18,cursor:"pointer",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            {/* Search mode toggle */}
            <div style={{display:"flex",gap:4,background:"#0a0a0a",borderRadius:10,padding:3,marginBottom:10}}>
              {[["local","📦 Baza lokalna"],["api","🌍 Wyszukaj online"]].map(([k,l])=>(
                <button key={k} onClick={()=>{setSearchMode(k);setSelFood(null);}} style={{flex:1,background:searchMode===k?"#2a2a2a":"transparent",border:"none",borderRadius:8,padding:"7px",color:searchMode===k?"#fff":"#666",fontWeight:600,cursor:"pointer",fontSize:12}}>{l}</button>
              ))}
            </div>

            {/* Local search */}
            {searchMode==="local"&&(
              <>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Szukaj w lokalnej bazie…"
                  style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1px solid #333",background:"#0a0a0a",color:"#fff",fontSize:14,marginBottom:10,boxSizing:"border-box",outline:"none"}}/>
                <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:10}}>
                  {["Wszystkie","⭐ Własne produkty",...Object.keys(FOOD_DB)].map(cat=>(
                    <button key={cat} onClick={()=>setSelCat(cat)} style={{whiteSpace:"nowrap",padding:"5px 10px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:selCat===cat?"#667eea":"#222",color:selCat===cat?"#fff":"#666"}}>{cat.replace(/^.\s/,"")}</button>
                  ))}
                </div>
              </>
            )}

            {/* API search */}
            {searchMode==="api"&&(
              <div style={{marginBottom:10}}>
                <div style={{display:"flex",gap:8,marginBottom:6}}>
                  <input value={apiQuery} onChange={e=>setApiQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchOpenFoodFacts(apiQuery)}
                    placeholder="🔍 Wyszukaj wartości odżywcze online…"
                    style={{flex:1,padding:"10px 14px",borderRadius:10,border:"1px solid #333",background:"#0a0a0a",color:"#fff",fontSize:14,outline:"none"}}/>
                  <button onClick={()=>searchOpenFoodFacts(apiQuery)} disabled={apiLoading||!apiQuery.trim()}
                    style={{background:apiQuery.trim()?"#667eea":"#222",color:apiQuery.trim()?"#fff":"#555",border:"none",borderRadius:10,padding:"0 16px",fontWeight:700,fontSize:13,cursor:apiQuery.trim()?"pointer":"not-allowed",flexShrink:0}}>
                    {apiLoading?"⏳":"Szukaj"}
                  </button>
                </div>
                <div style={{fontSize:11,color:"#555"}}>Claude wyszuka wartości odżywcze w sieci 🌐 (może chwilę potrwać)</div>
                {apiError&&<div style={{fontSize:12,color:"#f87171",marginTop:6}}>{apiError}</div>}
              </div>
            )}
            <button onClick={()=>setShowCustomForm(!showCustomForm)} style={{width:"100%",padding:"9px",borderRadius:10,border:`2px dashed ${showCustomForm?"#ef4444":"#667eea"}`,background:"transparent",color:showCustomForm?"#ef4444":"#667eea",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:10}}>
              {showCustomForm?"❌ Anuluj":"➕ Dodaj własny produkt"}
            </button>
            {showCustomForm&&(
              <div style={{background:"#0a0a0a",borderRadius:12,padding:14,marginBottom:12,border:"1px solid #2a2a2a"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#c084fc",marginBottom:10}}>Własny produkt (na 100g)</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
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
              {apiLoading&&<div style={{padding:20,textAlign:"center",color:"#667eea"}}>⏳ Wyszukiwanie w sieci…</div>}
              {!apiLoading&&filtered.length===0&&<div style={{padding:20,textAlign:"center",color:"#555"}}>{searchMode==="api"?"Wpisz frazę i kliknij Szukaj":"Brak wyników"}</div>}
              {filtered.map(f=>(
                <div key={`${f.name}${f.id||""}`} onClick={()=>setSelFood(f)} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid #1a1a1a",background:selFood?.name===f.name?"#1a1030":"transparent",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                      {f.name}
                      {f.isCustom&&<span style={{fontSize:10,background:"#c084fc",color:"#000",padding:"1px 5px",borderRadius:4,fontWeight:700}}>WŁASNY</span>}
                    </div>
                    <div style={{fontSize:11,color:"#555"}}>{f.category}</div>
                  </div>
                  <div style={{textAlign:"right",fontSize:11,display:"flex",alignItems:"center",gap:8}}>
                    <div><div style={{fontWeight:700,color:"#667eea"}}>{f.cal} kcal</div><div style={{color:"#555"}}>B:{f.p}g W:{f.c}g T:{f.f}g</div></div>
                    {f.isCustom&&<button onClick={e=>{e.stopPropagation();deleteCustomFood(f.id);}} style={{background:"#3a1a1a",border:"1px solid #6b2020",borderRadius:6,color:"#f87171",cursor:"pointer",fontSize:12,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>}
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
                  {[["Kcal",Math.round(selFood.cal*grams/100),"#667eea"],["B",(selFood.p*grams/100).toFixed(1)+"g","#22c55e"],["W",(selFood.c*grams/100).toFixed(1)+"g","#f59e0b"],["T",(selFood.f*grams/100).toFixed(1)+"g","#ef4444"]].map(([k,v,c])=>(
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
