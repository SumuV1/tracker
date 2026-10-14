import { useState, useEffect } from "react";
import { MOBILE, useMedia, INK, MONO, plDate } from "../lib/ui.js";
import { WEEKDAYS, todayKey, maxHeartRate } from "../plans.js";
import { MUSCLES, MUSCLE_LAYER } from "../lib/muscles.js";
import { BODY_VIEW, BODY_OUTLINE, BODY_PARTS, BODY_HAIR, MUSCLE_PATHS } from "../lib/bodyArt.js";
import { useApp } from "../lib/appContext.js";
import { DeleteBtn } from "../components/buttons.jsx";
import { MeasurementChart } from "../components/charts.jsx";
import PlanEditor, { downloadPlan, EXAMPLE, ACC } from "./PlanEditor.jsx";

// ══════════════════════════════════════════════════════════════════
//  MAPA MIĘŚNI — dane i komponenty
// ══════════════════════════════════════════════════════════════════
// Kształty sylwetki i mięśni: lib/bodyArt.js (generowany z grafiki MIT —
// licencja i sposób przypisania kształtów do mięśni są w nagłówku pliku).
// Kadry: obie sylwetki obok siebie albo jedna — na wąskich ekranach dwie
// naraz są za małe, żeby trafić w mięsień palcem.

function BodySVG({selected,hovered,onHover,onClick,layer,viewBox=BODY_VIEW.both,plan=null}){
  return(
    <svg viewBox={viewBox} style={{display:"block",width:"100%",height:"auto"}} role="group" aria-label="Mapa mięśni">
      <rect x="0" y="0" width="1448" height="1448" fill="#121215"/>
      {/* Sylwetka pod mięśniami: wypełniony kontur, a na nim części ciała,
          które nie są mięśniami ze słownika (głowa, dłonie, stopy, stawy). */}
      {BODY_OUTLINE.map((d,i)=><path key={"o"+i} d={d} fill="#1b1b21" stroke="#2e2e38" strokeWidth={2}/>)}
      {BODY_PARTS.map((d,i)=><path key={"p"+i} d={d} fill="#24242c" stroke="#0e0e10" strokeWidth={1.5}/>)}
      {BODY_HAIR.map((d,i)=><path key={"h"+i} d={d} fill="#18181d" stroke="#0e0e10" strokeWidth={1.5}/>)}
      {Object.entries(MUSCLE_PATHS).map(([id,dArr])=>{
        const m=MUSCLES[id];
        const onLayer=MUSCLE_LAYER[id]===layer;
        const isHov=hovered===id, isSel=selected===id;
        // Rola w wybranym dniu planu: główna partia, mięsień wspomagający
        // albo nic. Bez planu wszystkie mięśnie są równorzędne.
        const role=plan?(plan.primary.has(id)?"primary":plan.support.has(id)?"support":"off"):null;
        // Mięsień spoza wybranej warstwy jest przygaszony i nie reaguje na
        // kliknięcia. W tej grafice kształty na siebie nie zachodzą, więc nie
        // musi znikać jak dawniej (0,06 — leżał POD powierzchownym): przy
        // 0,18 zostaje kształtem mięśnia zamiast dziury w sylwetce. Przy
        // aktywnym planie mięśnie dnia prześwitują spod warstwy mocniej —
        // kliknąć da się po zmianie warstwy.
        const fill=role
          ?(onLayer
            ?(role==="primary"?(isSel?0.95:isHov?0.9:0.82):role==="support"?(isSel||isHov?0.6:0.42):isHov?0.22:0.1)
            :(role==="primary"?0.3:role==="support"?0.16:0.05))
          :(!onLayer?0.18:isSel?0.95:isHov?0.8:0.62);
        const outlined=onLayer&&(isSel||isHov||role==="primary");
        const glow=isSel||(onLayer&&role==="primary");
        // Grubości w jednostkach viewBoxu 1448 — ok. 1,5 raza więcej niż
        // w dawnym układzie 900, żeby na ekranie wyglądały tak samo.
        return dArr.map((d,i)=>(
          <path key={id+i} d={d} fill={m?.color||"#fff"} fillOpacity={fill}
            stroke={outlined?"#fff":"#0e0e10"}
            strokeWidth={isSel?2.8:role==="primary"&&onLayer?2.3:isHov?2.1:1.5}
            strokeOpacity={onLayer?(outlined?0.9:0.7):0.45}
            style={{cursor:onLayer?"pointer":"default",pointerEvents:onLayer?"all":"none",
              filter:glow?`drop-shadow(0 0 10px ${m?.color}bb)`:"none",
              transition:"fill-opacity 0.14s, filter 0.14s"}}
            onMouseEnter={()=>onLayer&&onHover(id)} onMouseLeave={()=>onHover(null)}
            onClick={()=>onLayer&&onClick(id)}/>
        ));
      })}
    </svg>
  );
}

// `sheet`: na telefonie panel nie siedzi w kolumnie obok sylwetki (której tam
// nie ma — sylwetka ma ~1100 px wysokości i panel lądował poza ekranem), tylko
// wjeżdża od dołu nad wszystkim, jak okno dodawania produktu.
function ExercisePanel({muscleId,onClose,sheet=false}){
  const m=MUSCLES[muscleId];
  if(!m)return null;
  const machine=m.exercises.filter(e=>e.icon==="⚙️");
  const free=m.exercises.filter(e=>e.icon!=="⚙️");
  const renderGroup=(list,title,badge)=>(
    <div style={{marginBottom:16}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:m.color,marginBottom:10,fontFamily:MONO,display:"flex",alignItems:"center",gap:6}}><span>{badge}</span> {title}</div>
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
    <div style={sheet
      ?{background:"#0f1117",borderRadius:"20px 20px 0 0",display:"flex",flexDirection:"column",maxHeight:"85vh",overflow:"hidden",
        paddingBottom:"env(safe-area-inset-bottom)"}
      :{position:"absolute",inset:0,background:"#0f1117",borderRadius:14,display:"flex",flexDirection:"column",zIndex:10,overflow:"hidden"}}>
      <div style={{background:m.color+"22",borderBottom:`1px solid ${m.color}44`,padding:"16px 20px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",color:m.color,marginBottom:4,fontFamily:MONO}}>{m.side==="front"?"▶ WIDOK: PRZÓD":"◀ WIDOK: TYŁ"}</div>
            <div style={{fontSize:17,fontWeight:700,color:"#f0f0f0",lineHeight:1.25}}>{m.name}</div>
            <div style={{fontSize:11,color:"#888",fontStyle:"italic",marginTop:2}}>{m.latin}</div>
          </div>
          <button onClick={onClose} aria-label="Zamknij" style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:10,color:"#aaa",cursor:"pointer",fontSize:20,width:sheet?44:32,height:sheet?44:32,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginLeft:12}}>×</button>
        </div>
        <div style={{marginTop:10,fontSize:11.5,color:"#bbb",lineHeight:1.55}}><span style={{color:INK.soft,fontSize:10,fontWeight:600,letterSpacing:"0.08em"}}>FUNKCJA — </span>{m.function}</div>
      </div>
      <div style={{overflowY:"auto",flex:1,minHeight:0,padding:"14px 16px 20px"}}>
        {machine.length>0&&renderGroup(machine,"NA MASZYNACH","⚙️")}
        {free.length>0&&renderGroup(free,"BEZ MASZYN","🤸")}
      </div>
    </div>
  );
}

// Kafel jednego ćwiczenia z planu — obciążenie trzymamy osobno od serii,
// bo w oryginale to dwie różne kolumny tabeli.
// Pole wyboru rysowane samodzielnie: <input type="checkbox"> nie daje się
// w tym motywie ostylować, a pole dotyku ma mieć 40 px przy kwadracie 24 px —
// stąd przezroczysty przycisk z ujemnym marginesem, który nie rozpycha karty.
function DoneBox({done,accent,label,onToggle}){
  return(
    <button role="checkbox" aria-checked={done} aria-label={`${label} — zrobione`}
      title={done?"Odznacz — jednak nierobione":"Odhacz jako zrobione"} onClick={onToggle}
      style={{flexShrink:0,width:40,height:40,margin:"-9px -8px -9px -10px",padding:0,border:"none",
        background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{width:24,height:24,borderRadius:7,border:`2px solid ${done?accent:"#3a3f52"}`,
        background:done?accent+"2e":"transparent",color:accent,fontSize:14,fontWeight:700,lineHeight:1,
        display:"flex",alignItems:"center",justifyContent:"center"}}>{done?"✓":""}</span>
    </button>
  );
}

// Największy ciężar z tej serii — notatka na następny tydzień, nie część planu.
// Wartość trzymamy lokalnie i zapisujemy dopiero przy wyjściu z pola albo
// Enterze, żeby każda wpisana cyfra nie leciała osobnym żądaniem. Przecinek
// jest dopuszczalny, bo tak się to pisze po polsku.
function LoadField({value,last,accent,label,onSave,historia,onHistoria}){
  const show=v=>v==null?"":String(v).replace(".",",");
  const [text,setText]=useState(()=>show(value));
  useEffect(()=>{setText(show(value));},[value]);
  const commit=()=>{
    const t=text.trim().replace(",",".");
    const n=t===""?null:Number(t);
    if(t!==""&&!(Number.isFinite(n)&&n>=0&&n<=9999)){setText(show(value));return;}
    if(n!==value)onSave(n);
  };
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginTop:8}}>
      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:10.5,color:INK.soft}}>
        <span>maks.</span>
        <input value={text} inputMode="decimal" aria-label={`${label} — maksymalne obciążenie w kg`}
          onChange={e=>setText(e.target.value)} onBlur={commit}
          onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();if(e.key==="Escape")setText(show(value));}}
          placeholder="—"
          style={{width:64,padding:"5px 8px",borderRadius:7,border:`1px solid ${value!=null?accent+"66":"#2a2e3c"}`,
            background:"#0d0f16",color:value!=null?"#f0f0f0":"#9a9a9a",fontSize:12,fontFamily:MONO,textAlign:"right",outline:"none"}}/>
        <span>kg</span>
      </label>
      {last&&<span style={{fontSize:10.5,color:INK.faint}}>ostatnio {String(last.maxLoad).replace(".",",")} kg · {plDate(last.date).slice(0,5)}</span>}
      {onHistoria&&(
        <button onClick={onHistoria} aria-expanded={!!historia} aria-label={`${label} — historia ciężarów`}
          style={{marginLeft:"auto",minHeight:36,padding:"4px 11px",borderRadius:8,cursor:"pointer",fontSize:11,
            background:historia?accent+"22":"transparent",border:`1px solid ${historia?accent+"88":"#2a2e3c"}`,
            color:historia?"#f0f0f0":INK.soft}}>
          📈 {historia?"zwiń":"progres"}
        </button>
      )}
    </div>
  );
}

// Historia ciężarów jednego ćwiczenia: po co był zapis, jeśli nie widać
// postępu. Dane idą po NAZWIE ćwiczenia, więc przeniesienie go w planie nie
// gubi krzywej. Wczytujemy dopiero po rozwinięciu — na liście bywa kilkanaście
// pozycji, a interesuje zwykle jedna.
function LoadHistory({name,accent,isMobile}){
  const {exHistory,openExHistory}=useApp();
  // Pobranie jest samo-strażujące (druga prośba o tę samą nazwę nic nie robi),
  // więc zależność od funkcji z kontekstu nie kręci pętli.
  useEffect(()=>{openExHistory(name);},[name,openExHistory]);
  const h=exHistory[name];
  if(h===undefined||h===null){
    return <div style={{fontSize:11.5,color:INK.faint,padding:"10px 2px"}}>Wczytuję historię…</div>;
  }
  if(!h.rows.length){
    return(
      <div style={{fontSize:11.5,color:INK.faint,lineHeight:1.6,padding:"8px 2px"}}>
        Nie ma jeszcze żadnego zapisanego ciężaru. Wpisz go po serii — od drugiego
        zapisu pojawi się tu wykres.
      </div>
    );
  }
  const ost=h.rows[h.rows.length-1], pierwszy=h.rows[0];
  const zmiana=ost.maxLoad-pierwszy.maxLoad;
  const kg=n=>String(Math.round(n*100)/100).replace(".",",");
  const kafel=(etykieta,wartosc,opis,kolor)=>(
    <div style={{flex:"1 1 90px",minWidth:0,background:"#0d0f16",border:"1px solid #1e2130",borderRadius:9,padding:"8px 10px"}}>
      <div style={{fontSize:9.5,letterSpacing:"0.08em",color:INK.faint,fontFamily:MONO,marginBottom:3}}>{etykieta}</div>
      <div style={{fontSize:15,fontWeight:700,color:kolor||"#f0f0f0",fontFamily:MONO}}>{wartosc}</div>
      <div style={{fontSize:10,color:INK.faint,marginTop:2}}>{opis}</div>
    </div>
  );
  return(
    <div className="rozwin">
      <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:10}}>
        {kafel("REKORD",kg(h.best.maxLoad)+" kg",plDate(h.best.date),accent)}
        {kafel("OSTATNIO",kg(ost.maxLoad)+" kg",plDate(ost.date))}
        {h.rows.length>1&&kafel("OD POCZĄTKU",(zmiana>0?"+":"")+kg(zmiana)+" kg",
          `${h.rows.length} zapisów`,zmiana>0?"#5DCAA5":zmiana<0?"#e0736d":"#f0f0f0")}
      </div>
      <MeasurementChart rows={h.rows.map(r=>({day:r.date,maxLoad:r.maxLoad}))} metric="maxLoad"
        isMobile={isMobile} color={accent} noun="zapis"/>
      <div style={{marginTop:8,maxHeight:132,overflowY:"auto"}}>
        {[...h.rows].reverse().map((r,i,tab)=>{
          const poprz=tab[i+1];
          const d=poprz?r.maxLoad-poprz.maxLoad:null;
          return(
            <div key={r.date} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 2px",
              borderTop:"1px solid #1a1d28",fontSize:11.5,fontVariantNumeric:"tabular-nums"}}>
              <span style={{color:INK.faint,flexShrink:0}}>{plDate(r.date)}</span>
              <span style={{color:"#e8e8e8",fontFamily:MONO,flex:1}}>{kg(r.maxLoad)} kg</span>
              {d!==null&&d!==0&&(
                <span style={{color:d>0?"#5DCAA5":"#e0736d",flexShrink:0}}>{d>0?"+":""}{kg(d)}</span>
              )}
              {r.maxLoad===h.best.maxLoad&&<span title="rekord" style={{flexShrink:0}}>🏆</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlanExercise({ex,accent,entry,last,onToggle,onLoad,isMobile}){
  const done=!!entry?.done;
  const [hist,setHist]=useState(false);
  return(
    <div style={{background:"#0a0a0a",border:`1px solid ${done?"#232630":accent+"28"}`,borderLeft:`3px solid ${done?"#2f3a34":accent}`,
      borderRadius:10,padding:"11px 13px",marginBottom:9,display:"flex",gap:10,alignItems:"flex-start"}}>
      <DoneBox done={done} accent={accent} label={ex.name} onToggle={onToggle}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13.5,fontWeight:600,color:done?"#7a7a7a":"#f0f0f0",lineHeight:1.35,
          textDecoration:done?"line-through":"none"}}>
          {ex.name}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:5,opacity:done?0.55:1}}>
          <span style={{fontSize:10,fontWeight:700,background:accent+"30",color:accent,padding:"1px 8px",borderRadius:20}}>{ex.sets}</span>
          {ex.load&&<span style={{fontSize:10,fontWeight:700,background:"rgba(255,255,255,0.06)",color:"#aaa",padding:"1px 8px",borderRadius:20}}>{ex.load}</span>}
          {ex.rest&&<span style={{fontSize:10,fontWeight:700,background:"rgba(255,255,255,0.04)",color:INK.soft,padding:"1px 8px",borderRadius:20}}>⏸ {ex.rest}</span>}
        </div>
        <LoadField value={entry?.maxLoad??null} last={last} accent={accent} label={ex.name} onSave={onLoad}
          historia={hist} onHistoria={()=>setHist(v=>!v)}/>
        {hist&&<LoadHistory name={ex.name} accent={accent} isMobile={isMobile}/>}
        {ex.desc&&<div style={{fontSize:11.5,color:done?"#6a6a6a":"#9a9a9a",lineHeight:1.55,marginTop:7}}>{ex.desc}</div>}
      </div>
    </div>
  );
}

function PlanDayPanel({plan,dayKey,day,age,hovered,onPickMuscle,isMobile}){
  const {exEntry,exLast,saveEx}=useApp();
  const [histCardio,setHistCardio]=useState(null);
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
  const hr=day.cardio?maxHeartRate(age):null;
  // Pozycje dnia: ćwiczenia i warianty cardio numerowane osobno, stąd „rodzaj"
  // w kluczu. Licznik na górze obejmuje jedne i drugie.
  const entry=(kind,i)=>exEntry(plan.id,kind,dayKey,i);
  const save=(kind,i,name,patch)=>saveEx(plan.id,kind,dayKey,i,name,patch);
  const variants=day.cardio?day.cardio.variants:[];
  const total=day.exercises.length+variants.length;
  const doneCount=day.exercises.filter((_,i)=>entry("ex",i)?.done).length
    +variants.filter((_,i)=>entry("cardio",i)?.done).length;
  const noteBox=(text,color)=>(
    <div style={{fontSize:11.5,color:color||"#8a8a8a",background:"#0d0f16",border:"1px solid #1e2130",
      borderRadius:8,padding:"9px 11px",marginBottom:11,lineHeight:1.6}}>{text}</div>
  );
  return(
    <div style={{display:"flex",flexDirection:"column",maxHeight:isMobile?"none":640}}>
      <div style={{background:accent+"1e",borderBottom:`1px solid ${accent}44`,padding:"14px 16px 12px",flexShrink:0}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",color:accent,fontFamily:MONO,marginBottom:4}}>{plan.name.toUpperCase()} · {label.toUpperCase()}</div>
        <div style={{fontSize:17,fontWeight:700,color:"#f0f0f0",lineHeight:1.25}}>
          {day.title}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
          {day.primary.map(id=>chip(id,true))}
          {day.support.map(id=>chip(id,false))}
        </div>
        {day.support.length>0&&<div style={{fontSize:10.5,color:INK.soft,marginTop:8}}>Wypełnione — partia dnia. Obrysowane — mięśnie wspomagające.</div>}
      </div>
      <div style={{padding:"6px 16px",borderBottom:"1px solid #1e2130",fontSize:11,color:hm?hm.color:INK.faint,flexShrink:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
        {hm?<>● {hm.name} — {isMobile?"dotknij":"kliknij"}, aby zobaczyć ćwiczenia</>:<>{isMobile?"Dotknij":"Kliknij"} mięsień na sylwetce lub etykietę powyżej</>}
      </div>
      <div style={{overflowY:isMobile?"visible":"auto",flex:1,padding:"12px 16px 18px"}}>
        {day.warmup&&(
          <div style={{fontSize:11.5,color:"#9a9a9a",background:"#0d0f16",border:"1px solid #1e2130",borderRadius:8,padding:"9px 11px",marginBottom:11,lineHeight:1.6}}>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",fontFamily:MONO,color:accent}}>ROZGRZEWKA</span><br/>{day.warmup}
          </div>
        )}
        {day.rest&&<div style={{fontSize:12.5,color:"#9a9a9a",lineHeight:1.65}}>{day.desc||"Dzień bez treningu."}</div>}
        {total>0&&(
          <div style={{marginBottom:11}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",fontFamily:MONO,color:INK.soft}}>ZROBIONE DZIŚ</span>
              <span style={{fontSize:12,fontWeight:700,fontFamily:MONO,color:doneCount?accent:INK.faint}}>{doneCount} / {total}</span>
            </div>
            <div style={{height:4,borderRadius:2,background:"#1e2130",marginTop:6,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.round(100*doneCount/total)}%`,background:accent,borderRadius:2}}/>
            </div>
            {/* Plan innego dnia można otworzyć w dowolny dzień — odhaczenie i tak
                ląduje pod dzisiejszą datą, więc lepiej to powiedzieć wprost. */}
            {dayKey!==todayKey()&&(
              <div style={{fontSize:10.5,color:INK.faint,marginTop:6,lineHeight:1.5}}>
                To nie jest dzisiejszy dzień — odhaczenia i tak zapisują się na dzisiejszą datę.
              </div>
            )}
          </div>
        )}
        {day.cardio&&(
          <div style={{background:"#0a0a0a",border:`1px solid ${accent}28`,borderLeft:`3px solid ${accent}`,borderRadius:10,padding:"12px 13px",marginBottom:10}}>
            <div style={{fontSize:13.5,fontWeight:600,color:"#f0f0f0"}}>{day.cardio.machine||"Cardio"}</div>
            {variants.map((v,i)=>{
              const label=v.name||day.cardio.machine||"Cardio";
              const vdone=!!entry("cardio",i)?.done;
              return(
                <div key={i} style={{marginTop:i?10:9,paddingTop:i?10:0,borderTop:i?"1px solid #1c1c1c":"none",
                  display:"flex",gap:10,alignItems:"flex-start"}}>
                  <DoneBox done={vdone} accent={accent} label={label}
                    onToggle={()=>save("cardio",i,label,{done:!vdone})}/>
                  <div style={{flex:1,minWidth:0}}>
                    {v.name&&<div style={{fontSize:11,fontWeight:700,color:vdone?"#6a6a6a":"#c9c9c9",marginBottom:5,
                      textDecoration:vdone?"line-through":"none"}}>{v.name}</div>}
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,opacity:vdone?0.55:1}}>
                      <span style={{fontSize:10,fontWeight:700,background:accent+"30",color:accent,padding:"1px 8px",borderRadius:20}}>{v.time}</span>
                      <span style={{fontSize:10,fontWeight:700,background:"rgba(255,255,255,0.06)",color:"#aaa",padding:"1px 8px",borderRadius:20}}>{v.hrFrom}–{v.hrTo}% HRmax</span>
                      {hr&&<span style={{fontSize:10,fontWeight:700,background:accent+"1e",color:accent,padding:"1px 8px",borderRadius:20}}>{Math.round(hr*v.hrFrom/100)}–{Math.round(hr*v.hrTo/100)} ud./min</span>}
                    </div>
                    {/* Wariant cardio też ma co notować — opór na orbitreku czy
                        poziom na bieżni działa jak ciężar: jest punktem odniesienia
                        na następny tydzień. Ta sama ścieżka zapisu, inny „rodzaj". */}
                    <LoadField value={entry("cardio",i)?.maxLoad??null} last={exLast(plan.id,"cardio",dayKey,i)}
                      accent={accent} label={label} onSave={n=>save("cardio",i,label,{maxLoad:n})}
                      historia={histCardio===i} onHistoria={()=>setHistCardio(x=>x===i?null:i)}/>
                    {histCardio===i&&<LoadHistory name={label} accent={accent} isMobile={isMobile}/>}
                    {v.desc&&<div style={{fontSize:11.5,color:vdone?"#6a6a6a":"#9a9a9a",lineHeight:1.55,marginTop:6}}>{v.desc}</div>}
                  </div>
                </div>
              );
            })}
            <div style={{marginTop:10,paddingTop:9,borderTop:"1px solid #1c1c1c",fontSize:11.5,color:"#9a9a9a",lineHeight:1.55}}>
              Tętno maksymalne wg wzoru <span style={{color:"#c9c9c9",fontFamily:MONO}}>208 − 0,7 × wiek</span> — dokładniejszego niż popularne 220 − wiek.
              {hr
                ?<> Dla Twoich <b>{age} lat</b>: HRmax ≈ <b style={{color:accent}}>{hr}</b> ud./min.</>
                :<> Podaj wiek w zakładce „Kalorie &amp; BMI”, a policzę zakresy w uderzeniach na minutę.</>}
            </div>
          </div>
        )}
        {day.exercises.map((ex,i)=>(
          <PlanExercise key={i} ex={ex} accent={accent} entry={entry("ex",i)} last={exLast(plan.id,"ex",dayKey,i)} isMobile={isMobile}
            onToggle={()=>save("ex",i,ex.name,{done:!entry("ex",i)?.done})}
            onLoad={n=>save("ex",i,ex.name,{maxLoad:n})}/>
        ))}
        {day.loadNote&&noteBox(day.loadNote)}
        {plan.note&&<div style={{marginTop:6,fontSize:10.5,color:INK.muted,lineHeight:1.6,borderTop:"1px solid #1a1a1a",paddingTop:10}}>{plan.note}</div>}
      </div>
    </div>
  );
}

export function MuscleMap({profile}){
  const isMobile=useMedia(MOBILE);
  const [hovered,setHovered]=useState(null);
  const [selected,setSelected]=useState(null);
  const [side,setSide]=useState("front");
  const [layer,setLayer]=useState("surface");
  const {plans,savePlan,deletePlan}=useApp();
  const [planId,setPlanId]=useState(null);
  const [dayKey,setDayKey]=useState(todayKey);
  const [showRules,setShowRules]=useState(false);
  // Edytor: null albo { initial, planId, mode } — nowy plan, edycja
  // istniejącego albo import z pliku (ten sam formularz, inny start).
  const [editor,setEditor]=useState(null);
  const [exampleBusy,setExampleBusy]=useState(false);
  const hoveredMuscle=hovered?MUSCLES[hovered]:null;
  const planRow=plans.find(p=>p.id===planId)||null;
  const plan=planRow?{...planRow.data,id:planRow.id,name:planRow.name}:null;
  const day=plan?plan.days[dayKey]:null;
  // Zbiory zamiast tablic — BodySVG pyta o przynależność raz na mięsień.
  const planHl=day?{primary:new Set(day.primary),support:new Set(day.support)}:null;
  // Partia dnia potrafi leżeć w obu warstwach (np. plecy: najszerszy jest
  // powierzchowny, prostownik głęboki). Podpowiadamy przełączenie zamiast
  // ukrywać połowę dnia.
  const hiddenPrimary=day?day.primary.filter(id=>MUSCLE_LAYER[id]!==layer):[];
  const pickPlan=id=>{
    setPlanId(prev=>prev===id?null:id);
    setDayKey(todayKey());setShowRules(false);
    setSelected(null);setHovered(null);
  };
  const closeEditor=row=>{
    setEditor(null);
    if(row){setPlanId(row.id);setDayKey(todayKey());setSelected(null);}
  };
  // Przykład idzie prosto do bazy — jest poprawny z definicji, a otwieranie
  // edytora tylko po to, żeby kliknąć „Zapisz", to jeden krok za dużo.
  const loadExample=async()=>{
    setExampleBusy(true);
    const r=await savePlan(EXAMPLE);
    setExampleBusy(false);
    if(r.ok)closeEditor(r.row);
  };
  const removePlan=id=>{deletePlan(id);if(planId===id)setPlanId(null);};
  // Otwarty arkusz nie może przepuszczać przewijania do strony pod spodem.
  useEffect(()=>{
    if(!selected)return;
    const onKey=e=>{if(e.key==="Escape")setSelected(null);};
    document.addEventListener("keydown",onKey);
    const prev=document.body.style.overflow;
    if(isMobile)document.body.style.overflow="hidden";
    return()=>{document.removeEventListener("keydown",onKey);document.body.style.overflow=prev;};
  },[isMobile,selected]);
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
        <div style={{fontSize:11,letterSpacing:"0.2em",color:"#5DCAA5",fontWeight:600,fontFamily:MONO,marginBottom:6}}>ANATOMIA INTERAKTYWNA</div>
        <div style={{fontSize:isMobile?18:22,fontWeight:700,color:"#f5f5f0"}}>Mapa Mięśni Człowieka</div>
        <div style={{marginTop:6,fontSize:12,color:INK.soft}}>{isMobile?"Dotknij mięśnia, aby zobaczyć ćwiczenia":"Najedź, aby podejrzeć · Kliknij, aby zobaczyć ćwiczenia"}</div>
      </div>
      <div style={{background:"#13161f",border:"1px solid #1e2130",borderRadius:14,padding:isMobile?"12px 12px 14px":"14px 16px 16px",marginBottom:16}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",color:"#5DCAA5",fontFamily:MONO,marginBottom:9}}>PLAN TRENINGOWY</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {plans.map(p=>(
            <button key={p.id} onClick={()=>pickPlan(p.id)} aria-pressed={planId===p.id} style={{background:planId===p.id?"#5DCAA522":"#0d0f16",
              border:`1px solid ${planId===p.id?"#5DCAA5":"#262a38"}`,borderRadius:10,padding:"8px 14px",minHeight:40,
              color:planId===p.id?"#5DCAA5":"#9a9a9a",fontWeight:600,fontSize:13,cursor:"pointer"}}>
              {planId===p.id?"✓ ":""}{p.name}
            </button>
          ))}
          <button onClick={()=>setEditor({initial:null,planId:null,mode:"form"})} style={{background:"transparent",border:"1px dashed #3a3f52",borderRadius:10,
            padding:"8px 14px",minHeight:40,color:INK.soft,fontWeight:600,fontSize:13,cursor:"pointer"}}>＋ Nowy</button>
          <button onClick={()=>setEditor({initial:null,planId:null,mode:"import"})} style={{background:"transparent",border:"1px dashed #3a3f52",borderRadius:10,
            padding:"8px 14px",minHeight:40,color:INK.soft,fontWeight:600,fontSize:13,cursor:"pointer"}}>⤓ Import</button>
        </div>
        {!plans.length&&(
          <div style={{marginTop:12,fontSize:12.5,color:"#9a9a9a",lineHeight:1.6}}>
            Nie masz jeszcze planu. Zacznij od przykładowego — jest też wzorem pliku do importu.
            <div style={{marginTop:8}}>
              <button onClick={loadExample} disabled={exampleBusy} style={{background:ACC+"22",border:`1px solid ${ACC}`,borderRadius:10,padding:"9px 14px",minHeight:40,color:ACC,fontWeight:600,fontSize:13,cursor:"pointer"}}>
                {exampleBusy?"Wgrywam…":"★ Wgraj przykład: Tyler Durden"}
              </button>
            </div>
          </div>
        )}
        {plan&&(
          <>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginTop:10}}>
              <button onClick={()=>setEditor({initial:planRow.data,planId:planRow.id,mode:"form"})} style={{background:"transparent",border:"1px solid #262a38",borderRadius:8,padding:"7px 12px",minHeight:36,color:"#c9c9c9",fontWeight:600,fontSize:12,cursor:"pointer"}}>✎ Edytuj</button>
              <button onClick={()=>downloadPlan(planRow.data)} style={{background:"transparent",border:"1px solid #262a38",borderRadius:8,padding:"7px 12px",minHeight:36,color:"#c9c9c9",fontWeight:600,fontSize:12,cursor:"pointer"}}>⤒ Eksportuj JSON</button>
              <button onClick={()=>pickPlan(planId)} style={{background:"transparent",border:"1px solid #262a38",borderRadius:8,padding:"7px 12px",minHeight:36,color:INK.soft,fontWeight:600,fontSize:12,cursor:"pointer"}}>Wyłącz</button>
              <span style={{marginLeft:"auto"}}><DeleteBtn onDelete={()=>removePlan(planId)} title="Usuń plan"/></span>
            </div>
            {plan.summary&&<div style={{fontSize:11.5,color:"#7a7a7a",marginTop:10,lineHeight:1.5}}>{plan.summary}</div>}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(4,1fr)":"repeat(7,1fr)",gap:6,marginTop:12}}>
              {WEEKDAYS.map(w=>{
                const d=plan.days[w.key];
                const on=dayKey===w.key, isToday=todayKey()===w.key;
                const c=MUSCLES[d.primary[0]]?.color||"#5a5a5a";
                return(
                  <button key={w.key} onClick={()=>{setDayKey(w.key);setSelected(null);}}
                    style={{background:on?c+"26":"#0d0f16",border:`1px solid ${on?c:"#262a38"}`,borderRadius:10,
                      padding:"7px 4px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <span style={{fontSize:9.5,fontWeight:700,letterSpacing:"0.08em",fontFamily:MONO,color:on?c:INK.muted}}>
                      {w.short.toUpperCase()}{isToday?" •":""}
                    </span>
                    <span style={{fontSize:11,fontWeight:600,color:on?"#f0f0f0":d.rest?INK.faint:"#8a8a8a"}}>{d.short}</span>
                  </button>
                );
              })}
            </div>
            <div style={{fontSize:10.5,color:INK.faint,marginTop:7}}>Kropka oznacza dzisiejszy dzień.</div>
            {plan.rules&&(
              <div style={{marginTop:10,borderTop:"1px solid #1e2130",paddingTop:10}}>
                <button onClick={()=>setShowRules(v=>!v)} style={{background:"none",border:"none",padding:"8px 0",minHeight:36,cursor:"pointer",
                  color:"#5DCAA5",fontSize:11,fontWeight:700,letterSpacing:"0.1em",fontFamily:MONO}}>
                  {showRules?"▾":"▸"} ZASADY WSPÓLNE
                </button>
                {showRules&&(
                  <div style={{marginTop:10,display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:10}}>
                    {plan.rules.map((r,i)=>(
                      <div key={i} style={{background:"#0d0f16",border:"1px solid #1e2130",borderRadius:10,padding:"10px 12px"}}>
                        <div style={{fontSize:12,fontWeight:600,color:"#e0e0e0",marginBottom:4}}>{r.title}</div>
                        <div style={{fontSize:11.5,color:"#8a8a8a",lineHeight:1.6}}>{r.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{display:"flex",gap:4,background:"#161616",borderRadius:10,padding:4,marginBottom:14,maxWidth:420,marginLeft:"auto",marginRight:"auto"}}>
        {[["surface","Powierzchowne"],["deep","Głębokie"]].map(([k,l])=>(
          <button key={k} onClick={()=>switchLayer(k)} style={{flex:1,background:layer===k?"#2a2a2a":"transparent",
            border:"none",borderRadius:8,padding:"9px 6px",color:layer===k?"#fff":INK.soft,fontWeight:600,
            cursor:"pointer",fontSize:12.5,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            {l}<span style={{fontSize:10,color:layer===k?INK.soft:INK.faint}}>{countIn(k)}</span>
          </button>
        ))}
      </div>
      <div style={{fontSize:11,color:INK.muted,textAlign:"center",marginBottom:14,lineHeight:1.5}}>
        {layer==="surface"
          ? "Warstwa powierzchowna — mięśnie widoczne bezpośrednio pod skórą."
          : "Warstwa głęboka — mięśnie leżące pod powierzchownymi, te przygaszone są nad nimi."}
        {hiddenPrimary.length>0&&(
          <div style={{marginTop:6,color:"#c8a24a"}}>
            {hiddenPrimary.length===1?"Jeden mięsień":`${hiddenPrimary.length} mięśnie`} z tego dnia leży w drugiej warstwie —{" "}
            <button onClick={()=>switchLayer(layer==="surface"?"deep":"surface")}
              style={{background:"none",border:"none",padding:"6px 2px",color:"#c8a24a",textDecoration:"underline",cursor:"pointer",font:"inherit"}}>
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
                <button key={k} onClick={()=>setSide(k)} style={{flex:1,background:side===k?"#2a2a2a":"transparent",border:"none",borderRadius:8,padding:"8px",color:side===k?"#fff":INK.soft,fontWeight:700,fontSize:11,letterSpacing:"0.15em",fontFamily:MONO,cursor:"pointer"}}>{l}</button>
              ))}
            </div>
          ):(
            <div style={{display:"flex",justifyContent:"space-around",marginBottom:6}}>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.15em",color:INK.faint,fontFamily:MONO}}>PRZÓD</span>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.15em",color:INK.faint,fontFamily:MONO}}>TYŁ</span>
            </div>
          )}
          <div style={{borderRadius:12,border:"1px solid #1e2130",overflow:"hidden"}}>
            <BodySVG viewBox={viewBox} layer={layer} plan={planHl} selected={selected} hovered={hovered} onHover={setHovered} onClick={id=>setSelected(p=>p===id?null:id)}/>
          </div>
        </div>
        <div style={{flex:"1 1 260px",minWidth:0,minHeight:isMobile?0:460,background:"#13161f",border:`1px solid ${selected?MUSCLES[selected]?.color+"55":day?(MUSCLES[day.primary[0]]?.color||"#5DCAA5")+"44":"#1e2130"}`,borderRadius:14,position:"relative",overflow:"hidden"}}>
          {!selected&&day&&(
            <PlanDayPanel plan={plan} dayKey={dayKey} day={day} age={profile?.ageYears??null}
              hovered={hovered} onPickMuscle={pickMuscle} isMobile={isMobile}/>
          )}
          {!selected&&!day&&(
            <div style={{padding:"20px 18px"}}>
              {hoveredMuscle?(
                <div>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",color:hoveredMuscle.color,marginBottom:6,fontFamily:MONO}}>{hoveredMuscle.side==="front"?"▶ PRZÓD":"◀ TYŁ"}</div>
                  <div style={{fontSize:18,fontWeight:700,color:"#f0f0f0",marginBottom:4}}>{hoveredMuscle.name}</div>
                  <div style={{fontSize:11.5,color:INK.soft,fontStyle:"italic",marginBottom:14}}>{hoveredMuscle.latin}</div>
                  <div style={{width:40,height:2,background:hoveredMuscle.color,borderRadius:2,marginBottom:14}}/>
                  <div style={{fontSize:12,color:"#888",lineHeight:1.6,marginBottom:8}}><span style={{color:INK.muted,fontSize:10,fontWeight:700,letterSpacing:"0.08em"}}>FUNKCJA</span><br/>{hoveredMuscle.function}</div>
                  <div style={{fontSize:12,color:"#888",lineHeight:1.6}}><span style={{color:INK.muted,fontSize:10,fontWeight:700,letterSpacing:"0.08em"}}>LOKALIZACJA</span><br/>{hoveredMuscle.location}</div>
                  <div style={{marginTop:20,fontSize:11,color:INK.faint,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14}}>👆</span> Kliknij, aby zobaczyć ćwiczenia</div>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:isMobile?130:400,color:INK.faint,textAlign:"center",gap:12}}>
                  <div style={{fontSize:isMobile?28:36}}>🫀</div>
                  <div style={{fontSize:13,lineHeight:1.7,maxWidth:180}}>
                    {isMobile
                      ?<>Dotknij mięśnia na sylwetce, aby otworzyć plan ćwiczeń.</>
                      :<>Najedź na mięsień na sylwetce, aby zobaczyć szczegóły.<br/><br/><span style={{color:INK.faint}}>Kliknij, aby otworzyć plan ćwiczeń.</span></>}
                  </div>
                </div>
              )}
            </div>
          )}
          {selected&&!isMobile&&<ExercisePanel muscleId={selected} onClose={()=>setSelected(null)}/>}
        </div>
      </div>
      {editor&&<PlanEditor initial={editor.initial} planId={editor.planId} mode={editor.mode} onClose={closeEditor}/>}
      {isMobile&&selected&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setSelected(null);}}
          style={{position:"fixed",inset:0,zIndex:998,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"flex-end"}}>
          <div style={{width:"100%"}}>
            <ExercisePanel sheet muscleId={selected} onClose={()=>setSelected(null)}/>
          </div>
        </div>
      )}
    </div>
  );
}

