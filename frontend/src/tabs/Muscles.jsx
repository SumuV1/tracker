import { useState, useEffect } from "react";
import { MOBILE, useMedia, INK, MONO, plDate } from "../lib/ui.js";
import { WEEKDAYS, todayKey, maxHeartRate } from "../plans.js";
import { MUSCLES, MUSCLE_LAYER } from "../lib/muscles.js";
import { useApp } from "../lib/appContext.js";
import { DeleteBtn } from "../components/buttons.jsx";
import { MeasurementChart } from "../components/charts.jsx";
import PlanEditor, { downloadPlan, EXAMPLE, ACC } from "./PlanEditor.jsx";

// ══════════════════════════════════════════════════════════════════
//  MAPA MIĘŚNI — dane i komponenty
// ══════════════════════════════════════════════════════════════════
const BODY_SVG_MARKUP = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 780" width="100%" height="100%">
  <defs>
    <linearGradient id="mmBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22222a"/><stop offset="100%" stop-color="#15151a"/>
    </linearGradient>
  </defs>
  <rect width="900" height="780" fill="#121215"/>
  <path d="M 200,26 Q 232,26 236,62 Q 238,88 226,102 Q 214,114 200,114 L 200,26 Z" fill="url(#mmBody)"/><path d="M 200,26 Q 168,26 164,62 Q 162,88 174,102 Q 186,114 200,114 L 200,26 Z" fill="url(#mmBody)"/><path d="M 200,108 L 219,108 L 223.6,138 L 200,142 Z" fill="url(#mmBody)"/><path d="M 200,108 L 181,108 L 176.4,138 L 200,142 Z" fill="url(#mmBody)"/><path d="M 200,132 Q 234,136 256.8,148 Q 274.9,156 283.6,180 L 284.8,236 Q 278.4,268 266.7,296 L 261.5,330 Q 266.7,356 265.6,384 L 260.2,412 L 200,420 Z" fill="url(#mmBody)"/><path d="M 200,132 Q 166,136 143.2,148 Q 125.1,156 116.4,180 L 115.2,236 Q 121.6,268 133.3,296 L 138.5,330 Q 133.3,356 134.4,384 L 139.8,412 L 200,420 Z" fill="url(#mmBody)"/><path d="M 258.4,146 Q 290.9,154 305.7,180 L 310.4,238 Q 309.7,268 309.1,300 L 318.1,352 Q 327.5,392 332.4,424 L 339,452 Q 349.5,470 341.8,486 Q 329.9,496 318.9,488 L 309.9,462 L 298.8,424 L 285.9,352 L 277,300 L 277.5,238 L 276.2,180 Z" fill="url(#mmBody)"/><path d="M 141.6,146 Q 109.1,154 94.3,180 L 89.6,238 Q 90.3,268 90.9,300 L 81.9,352 Q 72.5,392 67.6,424 L 61,452 Q 50.5,470 58.2,486 Q 70.1,496 81.1,488 L 90.1,462 L 101.2,424 L 114.1,352 L 123,300 L 122.5,238 L 123.8,180 Z" fill="url(#mmBody)"/><path d="M 200,414 L 260,408 Q 270.5,448 268.6,486 L 257.3,548 Q 252.3,574 250.1,596 L 246.1,652 Q 240.3,700 238,716 Q 248.5,726 250.4,740 L 248.2,752 L 214.7,752 L 212.7,716 L 211,652 L 208.7,596 L 206.6,548 L 202.3,486 Z" fill="url(#mmBody)"/><path d="M 200,414 L 140,408 Q 129.5,448 131.4,486 L 142.7,548 Q 147.7,574 149.9,596 L 153.9,652 Q 159.7,700 162,716 Q 151.5,726 149.6,740 L 151.8,752 L 185.3,752 L 187.3,716 L 189,652 L 191.3,596 L 193.4,548 L 197.7,486 Z" fill="url(#mmBody)"/>
  <path d="M 700,26 Q 732,26 736,62 Q 738,88 726,102 Q 714,114 700,114 L 700,26 Z" fill="url(#mmBody)"/><path d="M 700,26 Q 668,26 664,62 Q 662,88 674,102 Q 686,114 700,114 L 700,26 Z" fill="url(#mmBody)"/><path d="M 700,108 L 719,108 L 723.6,138 L 700,142 Z" fill="url(#mmBody)"/><path d="M 700,108 L 681,108 L 676.4,138 L 700,142 Z" fill="url(#mmBody)"/><path d="M 700,132 Q 734,136 756.8,148 Q 774.9,156 783.6,180 L 784.8,236 Q 778.4,268 766.7,296 L 761.5,330 Q 766.7,356 765.6,384 L 760.2,412 L 700,420 Z" fill="url(#mmBody)"/><path d="M 700,132 Q 666,136 643.2,148 Q 625.1,156 616.4,180 L 615.2,236 Q 621.6,268 633.3,296 L 638.5,330 Q 633.3,356 634.4,384 L 639.8,412 L 700,420 Z" fill="url(#mmBody)"/><path d="M 758.4,146 Q 790.9,154 805.7,180 L 810.4,238 Q 809.7,268 809.1,300 L 818.1,352 Q 827.5,392 832.4,424 L 839,452 Q 849.5,470 841.8,486 Q 829.9,496 818.9,488 L 809.9,462 L 798.8,424 L 785.9,352 L 777,300 L 777.5,238 L 776.2,180 Z" fill="url(#mmBody)"/><path d="M 641.6,146 Q 609.1,154 594.3,180 L 589.6,238 Q 590.3,268 590.9,300 L 581.9,352 Q 572.5,392 567.6,424 L 561,452 Q 550.5,470 558.2,486 Q 570.1,496 581.1,488 L 590.1,462 L 601.2,424 L 614.1,352 L 623,300 L 622.5,238 L 623.8,180 Z" fill="url(#mmBody)"/><path d="M 700,414 L 760,408 Q 770.5,448 768.6,486 L 757.3,548 Q 752.3,574 750.1,596 L 746.1,652 Q 740.3,700 738,716 Q 748.5,726 750.4,740 L 748.2,752 L 714.7,752 L 712.7,716 L 711,652 L 708.7,596 L 706.6,548 L 702.3,486 Z" fill="url(#mmBody)"/><path d="M 700,414 L 640,408 Q 629.5,448 631.4,486 L 642.7,548 Q 647.7,574 649.9,596 L 653.9,652 Q 659.7,700 662,716 Q 651.5,726 649.6,740 L 651.8,752 L 685.3,752 L 687.3,716 L 689,652 L 691.3,596 L 693.4,548 L 697.7,486 Z" fill="url(#mmBody)"/>
</svg>`;

const FRONT_PATHS = {
  platysma:["M 200,108.2 L 215.9,108.2 Q 220.7,125.7 219.8,143.1 L 205.9,147.5 L 200,146.4 Z","M 200,108.2 L 184.1,108.2 Q 179.3,125.7 180.2,143.1 L 194.1,147.5 L 200,146.4 Z"],
  sternocleidomastoid:["M 201,112 Q 213,118 214.7,133 Q 213.3,144 205.7,148 L 200,147 Q 204.2,130 200,113 Z","M 199,112 Q 187,118 185.3,133 Q 186.7,144 194.3,148 L 200,147 Q 195.9,130 200,113 Z"],
  scalenes:["M 212,119 Q 218.6,129 218.6,141 L 212.2,143 Q 212.5,132 207.1,123 Z","M 188,119 Q 181.4,129 181.4,141 L 187.8,143 Q 187.5,132 192.9,123 Z"],
  deltoid_front:["M 239.9,147.8 Q 276.2,153.5 299,183.8 L 305.4,212.1 Q 285.5,222.6 270.8,212.1 L 261.7,176.2 Q 251.4,157.3 239.9,147.8 Z","M 160.1,147.8 Q 123.8,153.5 101,183.8 L 94.6,212.1 Q 114.5,222.6 129.2,212.1 L 138.3,176.2 Q 148.6,157.3 160.1,147.8 Z"],
  pectoralis:["M 201.6,150 L 241.9,147 Q 265.8,159 271.6,183 Q 264.2,208 235.6,219 L 201.9,222 Z","M 198.4,150 L 158.1,147 Q 134.2,159 128.4,183 Q 135.8,208 164.4,219 L 198.1,222 Z"],
  serratus:["M 238.3,223 L 260.8,213.5 L 264.6,228.4 L 250.9,232.6 L 263.4,239 L 249.6,245.4 L 261.9,251.7 L 253,265.5 L 235.8,257 Z","M 161.7,223 L 139.2,213.5 L 135.4,228.4 L 149.1,232.6 L 136.6,239 L 150.4,245.4 L 138.1,251.7 L 147,265.5 L 164.2,257 Z"],
  rectus_abdominis:["M 199.5,219.6 L 239.3,215.1 Q 237.7,282.8 228.6,333.1 L 219.8,363.7 L 198.9,365.8 Z","M 200.5,219.6 L 160.7,215.1 Q 162.3,282.8 171.4,333.1 L 180.2,363.7 L 201.1,365.8 Z"],
  obliques:["M 244.1,228.1 L 278.8,222.5 Q 277.9,257.8 264.5,291.3 L 244.8,326.7 L 224.3,347.1 L 233.3,302.5 Z","M 155.9,228.1 L 121.2,222.5 Q 122.1,257.8 135.5,291.3 L 155.2,326.7 L 175.7,347.1 L 166.7,302.5 Z"],
  biceps:["M 260,198.6 Q 299.3,208.1 305.2,240.5 L 303.7,284.4 Q 291.1,293.9 280,287.2 L 278.9,240.5 Z","M 140,198.6 Q 100.7,208.1 94.8,240.5 L 96.4,284.4 Q 108.9,293.9 120,287.2 L 121.1,240.5 Z"],
  forearm_front:["M 281.4,290.6 Q 304.4,298.3 309.9,348.4 L 327.5,414.2 Q 316.7,427.3 305.6,416.8 L 292.1,348.4 Z","M 118.6,290.6 Q 95.6,298.3 90.1,348.4 L 72.5,414.2 Q 83.3,427.3 94.4,416.8 L 107.9,348.4 Z"],
  quadriceps:["M 211,423 L 258.4,416.5 Q 266.6,464.4 261.4,505.8 L 252.9,551.5 L 216.3,553.6 L 208.8,473.2 Z","M 189,423 L 141.6,416.5 Q 133.4,464.4 138.6,505.8 L 147.1,551.5 L 183.7,553.6 L 191.2,473.2 Z"],
  sartorius:["M 250.3,422.6 L 261.6,430.6 Q 235.6,478.1 221.6,513.7 L 216.7,545.4 L 210.2,543.4 Q 217.2,499.9 236.5,458.3 Z","M 149.7,422.6 L 138.4,430.6 Q 164.4,478.1 178.4,513.7 L 183.3,545.4 L 189.8,543.4 Q 182.8,499.9 163.5,458.3 Z"],
  adductors:["M 203,430 L 223.3,434 Q 219.8,478 211.9,518 L 206.8,520 Z","M 197,430 L 176.7,434 Q 180.2,478 188.1,518 L 193.2,520 Z"],
  tibialis:["M 210.3,560.2 L 242.9,556.3 Q 247.1,616.2 239.9,671.8 L 228.9,701.7 L 216.4,699.7 L 213.1,623.9 Z","M 188.4,564.2 L 156.5,560.4 Q 152.4,617 159.4,669.7 L 170.1,698 L 182.3,696.2 L 185.5,624.4 Z"],
};
const BACK_PATHS = {
  trapezius:["M 702.3,133.2 L 717.3,136.9 Q 741.5,149.9 764.9,162.8 L 758.4,185 L 738.3,196.2 L 702.3,248 Z","M 697.7,133.2 L 682.7,136.9 Q 658.5,149.9 635.1,162.8 L 641.6,185 L 661.7,196.2 L 697.7,248 Z"],
  deltoid_back:["M 757.9,153.5 Q 788.7,161.2 800.7,188.1 L 805.6,215.1 Q 786.4,225.7 772.4,215.1 L 764.1,182.4 Z","M 642.1,153.5 Q 611.3,161.2 599.3,188.1 L 594.4,215.1 Q 613.6,225.7 627.6,215.1 L 635.9,182.4 Z"],
  infraspinatus:["M 716.5,198 L 760.8,192 L 767.8,222 L 739.7,236 L 713.6,222 Z","M 683.5,198 L 639.2,192 L 632.2,222 L 660.3,236 L 686.4,222 Z"],
  latissimus:["M 707.3,259.9 L 747.5,213.5 Q 770.3,227.2 772.1,258.2 Q 766.2,296 752.4,318.3 L 707.3,327 Z","M 692.7,259.9 L 652.5,213.5 Q 629.7,227.2 627.9,258.2 Q 633.8,296 647.6,318.3 L 692.7,327 Z"],
  erector_spinae:["M 700,194 L 715.9,199 Q 719,270 712.8,340 L 700,346 Z","M 700,194 L 684.1,199 Q 681,270 687.2,340 L 700,346 Z"],
  triceps:["M 765.6,203.2 Q 800.9,213.1 805.1,244.9 L 804.1,284.8 Q 792.8,293.8 783,287.4 L 776,244.9 Z","M 634.4,203.2 Q 599.1,213.1 594.9,244.9 L 595.9,284.8 Q 607.2,293.8 617,287.4 L 624,244.9 Z"],
  forearm_back:["M 779.4,285.8 Q 803.4,294.2 809,347.5 L 827.4,417.5 Q 816.2,431.6 804.6,420.3 L 790.6,347.5 Z","M 620.6,285.8 Q 596.6,294.2 591,347.5 L 572.6,417.5 Q 583.8,431.6 595.4,420.3 L 609.4,347.5 Z"],
  gluteus:["M 705.5,340.1 L 745.9,330.7 Q 762.9,351.3 763,381.2 Q 751,407.5 705.5,411.2 Z","M 694.5,340.1 L 654.1,330.7 Q 637.1,351.3 637,381.2 Q 649,407.5 694.5,411.2 Z"],
  hamstrings:["M 711.7,422.2 L 758.8,417.3 Q 767.8,462.7 760.9,505.2 L 752,545.8 L 715.8,547.8 L 709.8,474.2 Z","M 688.3,422.2 L 641.2,417.3 Q 632.2,462.7 639.1,505.2 L 648,545.8 L 684.2,547.8 L 690.2,474.2 Z"],
  gastrocnemius:["M 714.3,554.8 L 749.1,552.4 Q 747.9,601.8 741.2,648.7 L 732.5,686.8 L 719.9,684.5 L 713.2,633.1 Z","M 685.7,554.8 L 650.9,552.4 Q 652.1,601.8 658.8,648.7 L 667.5,686.8 L 680.1,684.5 L 686.8,633.1 Z"],
};


// Kadry sylwetki: pełny (obie strony obok siebie) oraz pojedyncze — na wąskich
// ekranach dwie sylwetki naraz są za małe, żeby trafić w mięsień palcem.
// Kadry: po poszerzeniu sylwetka zajmuje x 55–344 (i 555–844 z tyłu), więc
// wycinek na jedną postać musi być szerszy niż dawne 235 jednostek — inaczej
// obcinałby dłonie.
const BODY_VIEW = { both:"0 0 900 780", front:"48 10 303 765", back:"548 10 303 765" };

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

