import { useState, useEffect } from "react";
import { MOBILE, useMedia, HOURS, MINUTES, TILE, INK } from "../lib/ui.js";

// ── Przyciski dotykowe ────────────────────────────────────────────────────
// Ikona ma 24–28 px, ale cel dotyku 44 px na telefonie (32 na desktopie):
// przycisk jest przezroczysty i większy niż to, co widać. Wcześniej kciuk
// trafiający obok 24-pikselowego ✕ wchodził w edycję nazwy, a trafiający w ✕
// kasował bez pytania. Skill mobile-web-design, Krok 3.
export function IconBtn({onClick,title,children,size=26,bg="#222",border="#333",color="#aaa",disabled=false,style}){
  const hit=useMedia(MOBILE)?44:32;
  return(
    <button type="button" onClick={e=>{e.stopPropagation();if(!disabled)onClick?.(e);}} title={title} aria-label={title} disabled={disabled}
      style={{width:hit,height:hit,minWidth:hit,background:"none",border:"none",padding:0,margin:0,display:"flex",
        alignItems:"center",justifyContent:"center",cursor:disabled?"not-allowed":"pointer",flexShrink:0,...style}}>
      <span style={{width:size,height:size,borderRadius:7,background:bg,border:`1px solid ${border}`,color,fontSize:size<24?11:12,
        display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>{children}</span>
    </button>
  );
}

// Kasowanie w dwóch krokach: pierwsze tapnięcie zamienia ✕ w „Na pewno?",
// drugie kasuje, cztery sekundy bez decyzji cofają do ✕. Żadnego okna dialogowego
// — potwierdzenie jest w tym samym miejscu, w które kciuk już celuje.
export function DeleteBtn({onDelete,title="Usuń",size=26}){
  const [armed,setArmed]=useState(false);
  const hit=useMedia(MOBILE)?44:32;
  useEffect(()=>{
    if(!armed)return;
    const t=setTimeout(()=>setArmed(false),4000);
    return()=>clearTimeout(t);
  },[armed]);
  if(armed)return(
    <button type="button" onClick={e=>{e.stopPropagation();setArmed(false);onDelete();}}
      style={{height:hit,minWidth:hit,padding:"0 12px",background:"#6b2020",border:"1px solid #f87171",borderRadius:8,
        color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
      Na pewno?
    </button>
  );
  return <IconBtn onClick={()=>setArmed(true)} title={title} size={size} bg="#3a1a1a" border="#6b2020" color="#f87171">✕</IconBtn>;
}


export function makeSel(active,size=TILE){return{background:active?"#fff":"#1a1a1a",color:active?"#000":"#aaa",border:"none",borderRadius:7,cursor:"pointer",fontWeight:active?700:400,fontSize:size<34?11.5:13,textAlign:"center",width:size,height:size,flexShrink:0,transition:"background 0.15s"};}

export function TimePicker({value,onChange,onClose,onRemove,stacked=false}){
  const narrow=useMedia(MOBILE)||stacked;
  // W kaflu kategorii siatka w domyślnym rozmiarze wychodziłaby poza kartę:
  // cztery kolumny po 36 px to 192 px, a karta ma wewnątrz około 175 px.
  const tile=stacked?30:TILE;
  const [h,setH]=useState(value?value.split(":")[0]:"08");
  const [m,setM]=useState(value?value.split(":")[1]:"00");
  const btn=extra=>({borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:700,padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"center",gap:7,width:"100%",border:"none",...extra});
  return(
    // na wąskim ekranie siatka godzin i przyciski nie zmieszczą się obok siebie
    <div style={{marginLeft:narrow?0:42,display:"flex",flexDirection:narrow?"column":"row",gap:12,alignItems:narrow?"stretch":"center"}}>
      <div style={{background:"#111",border:"1px solid #2a2a2a",borderRadius:12,padding:3,display:"inline-block",flexShrink:0}}>
        <div style={{display:"flex",gap:3}}>
          <div style={{display:"grid",gridTemplateColumns:`repeat(4,${tile}px)`,gap:3}}>
            {HOURS.map(hr=><button key={hr} onClick={()=>setH(hr)} style={makeSel(h===hr,tile)}>{hr}</button>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:`${tile}px`,gap:3}}>
            {MINUTES.map(mn=><button key={mn} onClick={()=>setM(mn)} style={makeSel(m===mn,tile)}>{mn}</button>)}
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

export function TimePickerForm({value,onChange}){
  const [open,setOpen]=useState(false);
  const [h,setH]=useState(value?value.split(":")[0]:"08");
  const [m,setM]=useState(value?value.split(":")[1]:"00");
  const confirm=()=>{onChange(`${h}:${m}`);setOpen(false);};
  return(
    <div>
      <button onClick={()=>setOpen(!open)} style={{background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"8px 14px",color:value?"#fff":INK.muted,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
        🕐 <span style={{fontWeight:600,letterSpacing:1}}>{value||"-- : --"}</span>
        <span style={{color:INK.muted,fontSize:10}}>▾</span>
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
