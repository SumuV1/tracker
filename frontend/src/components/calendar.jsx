import { useState } from "react";
import { INK, DAY_LABELS, MONTHS_PL, today, getDaysInMonth, getDaysInYear, kb } from "../lib/ui.js";

// `compact` = widok wchodzi do wąskiego kafla kategorii, a nie na całą
// szerokość zakładki: mniejsze odstępy, mniejsze podpisy, ten sam układ.
export function MonthView({habitId,logs,color,toggle,compact=false}){
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth());
  const days=getDaysInMonth(year,month);
  const firstDow=new Date(year,month,1).getDay();
  const done=days.filter(d=>logs[`${habitId}_${d}`]).length;
  // Mianownik to dni, które już były — inaczej 15 września pokazuje „7 %"
  // przy dwóch odhaczeniach, bo liczy też dni z przyszłości.
  const elapsed=days.filter(d=>d<=today()).length;
  const rate=elapsed?Math.round((done/elapsed)*100):0;
  const prevM=()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);};
  const nextM=()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);};
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <button onClick={prevM} aria-label="Poprzedni miesiąc" style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:18,padding:0,width:36,height:36,margin:"-6px 0"}}>‹</button>
        <span style={{fontSize:compact?11.5:13,fontWeight:600,color:"#ccc"}}>{MONTHS_PL[month]} {year} — {rate}%</span>
        <button onClick={nextM} aria-label="Następny miesiąc" style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:18,padding:0,width:36,height:36,margin:"-6px 0"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:compact?2:3,marginBottom:4}}>
        {DAY_LABELS.map((l,i)=><div key={i} style={{fontSize:compact?9.5:10,color:INK.muted,textAlign:"center"}}>{l}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:compact?2:3}}>
        {Array(firstDow).fill(null).map((_,i)=><div key={`b${i}`}/>)}
        {days.map(d=>{
          const checked=logs[`${habitId}_${d}`];
          const day=parseInt(d.slice(8));
          const isT=d===today();
          const future=d>today();
          return <div key={d} {...(future?{}:kb(()=>toggle(habitId,d)))} aria-pressed={!!checked} aria-label={d}
            style={{aspectRatio:"1",borderRadius:compact?4:5,background:checked?color:"#2a2a2a",cursor:future?"default":"pointer",opacity:future?0.35:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:compact?9.5:10,color:checked?"#000":isT?"#fff":INK.muted,fontWeight:isT?700:400,outline:isT?`2px solid ${color}`:"none",outlineOffset:-1,transition:"background 0.15s"}}>{day}</div>;
        })}
      </div>
    </div>
  );
}

export function YearView({habitId,logs,color,compact=false,onYear}){
  const [year,setYearRaw]=useState(new Date().getFullYear());
  const setYear=f=>setYearRaw(y=>{const n=f(y);onYear?.(n);return n;});
  const days=getDaysInYear(year);
  const done=days.filter(d=>logs[`${habitId}_${d}`]).length;
  const elapsed=days.filter(d=>d<=today()).length;
  const rate=elapsed?Math.round((done/elapsed)*100):0;
  const byMonth=Array.from({length:12},(_,mi)=>getDaysInMonth(year,mi));
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <button onClick={()=>setYear(y=>y-1)} aria-label="Poprzedni rok" style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:18,padding:0,width:36,height:36,margin:"-6px 0"}}>‹</button>
        <span style={{fontSize:compact?11.5:13,fontWeight:600,color:"#ccc"}}>{year} — {rate}% ({done}/{elapsed})</span>
        <button onClick={()=>setYear(y=>y+1)} aria-label="Następny rok" style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:18,padding:0,width:36,height:36,margin:"-6px 0"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fit,minmax(${compact?52:100}px,1fr))`,gap:compact?4:6}}>
        {byMonth.map((mDays,mi)=>{
          const mDone=mDays.filter(d=>logs[`${habitId}_${d}`]).length;
          const mRate=mDays.length?mDone/mDays.length:0;
          return(
            <div key={mi}>
              <div style={{fontSize:compact?8.5:10,color:INK.muted,marginBottom:compact?2:3,textAlign:"center"}}>{MONTHS_PL[mi]}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:compact?1:2}}>
                {Array(new Date(year,mi,1).getDay()).fill(null).map((_,i)=><div key={`b${i}`}/>)}
                {mDays.map(d=><div key={d} style={{aspectRatio:"1",borderRadius:compact?1.5:2,background:logs[`${habitId}_${d}`]?color:"#2a2a2a",opacity:logs[`${habitId}_${d}`]?0.85:0.4}} title={d}/>)}
              </div>
              <div style={{marginTop:compact?2:3,background:"#2a2a2a",borderRadius:99,height:compact?2:3,overflow:"hidden"}}>
                <div style={{width:`${mRate*100}%`,height:"100%",background:color,borderRadius:99}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalYearView({calLogs,tdee,onYear,onPickDay}){
  const [year,setYearRaw]=useState(new Date().getFullYear());
  const setYear=f=>setYearRaw(y=>{const n=f(y);onYear?.(n);return n;});
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
        <button onClick={()=>setYear(y=>y-1)} aria-label="Poprzedni rok" style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:18,padding:0,width:36,height:36,margin:"-6px 0"}}>‹</button>
        <span style={{fontSize:13,fontWeight:600,color:"#ccc"}}>Kalorie {year}</span>
        <button onClick={()=>setYear(y=>y+1)} aria-label="Następny rok" style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:18,padding:0,width:36,height:36,margin:"-6px 0"}}>›</button>
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
              <div style={{fontSize:10,color:INK.muted,marginBottom:3,textAlign:"center"}}>{MONTHS_PL[mi]}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                {Array(new Date(year,mi,1).getDay()).fill(null).map((_,i)=><div key={`b${i}`}/>)}
                {mDays.map(d=><div key={d} title={`${d}: ${calLogs[d]||0} kcal`} onClick={()=>onPickDay?.(d)}
                  style={{aspectRatio:"1",borderRadius:2,background:getColor(calLogs[d]||0),cursor:onPickDay&&d<=today()?"pointer":"default"}}/>)}
              </div>
              <div style={{fontSize:9,color:INK.muted,marginTop:3,textAlign:"center"}}>{mCal>0?`${mCal} kcal`:""}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

