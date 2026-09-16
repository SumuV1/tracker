import { useState, useEffect } from "react";
import { MOBILE, useMedia, INK, MONO } from "../lib/ui.js";
import { WEEKDAYS, todayKey, maxHeartRate } from "../plans.js";
import { MUSCLES, MUSCLE_LAYER } from "../lib/muscles.js";
import { useApp } from "../lib/appContext.js";
import { DeleteBtn } from "../components/buttons.jsx";
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
  <path d="M 200.0,26 Q 232.0,26 236.0,62 Q 238.0,88 226.0,102 Q 214.0,114 200.0,114 L 200.0,26 Z" fill="url(#mmBody)"/><path d="M 200.0,26 Q 168.0,26 164.0,62 Q 162.0,88 174.0,102 Q 186.0,114 200.0,114 L 200.0,26 Z" fill="url(#mmBody)"/><path d="M 200.0,108 L 219.0,108 L 222.0,138 L 200.0,142 Z" fill="url(#mmBody)"/><path d="M 200.0,108 L 181.0,108 L 178.0,138 L 200.0,142 Z" fill="url(#mmBody)"/><path d="M 200.0,132 Q 232.0,136 250.0,148 Q 264.0,156 268.0,180 L 272.0,236 Q 270.0,268 262.0,296 L 258.0,330 Q 262.0,356 260.0,384 L 254.0,412 L 200.0,420 Z" fill="url(#mmBody)"/><path d="M 200.0,132 Q 168.0,136 150.0,148 Q 136.0,156 132.0,180 L 128.0,236 Q 130.0,268 138.0,296 L 142.0,330 Q 138.0,356 140.0,384 L 146.0,412 L 200.0,420 Z" fill="url(#mmBody)"/><path d="M 252.0,146 Q 278.0,154 286.0,180 L 294.0,238 Q 298.0,268 302.0,300 L 310.0,352 Q 316.0,392 318.0,424 L 322.0,452 Q 330.0,470 324.0,486 Q 314.0,496 304.0,488 L 296.0,462 L 288.0,424 L 280.0,352 L 272.0,300 L 266.0,238 L 262.0,180 Z" fill="url(#mmBody)"/><path d="M 148.0,146 Q 122.0,154 114.0,180 L 106.0,238 Q 102.0,268 98.0,300 L 90.0,352 Q 84.0,392 82.0,424 L 78.0,452 Q 70.0,470 76.0,486 Q 86.0,496 96.0,488 L 104.0,462 L 112.0,424 L 120.0,352 L 128.0,300 L 134.0,238 L 138.0,180 Z" fill="url(#mmBody)"/><path d="M 200.0,414 L 254.0,408 Q 262.0,448 260.0,486 L 252.0,548 Q 248.0,574 246.0,596 L 242.0,652 Q 238.0,700 236.0,716 Q 246.0,726 248.0,740 L 246.0,752 L 214.0,752 L 212.0,716 L 210.0,652 L 208.0,596 L 206.0,548 L 202.0,486 Z" fill="url(#mmBody)"/><path d="M 200.0,414 L 146.0,408 Q 138.0,448 140.0,486 L 148.0,548 Q 152.0,574 154.0,596 L 158.0,652 Q 162.0,700 164.0,716 Q 154.0,726 152.0,740 L 154.0,752 L 186.0,752 L 188.0,716 L 190.0,652 L 192.0,596 L 194.0,548 L 198.0,486 Z" fill="url(#mmBody)"/>
  <path d="M 700.0,26 Q 732.0,26 736.0,62 Q 738.0,88 726.0,102 Q 714.0,114 700.0,114 L 700.0,26 Z" fill="url(#mmBody)"/><path d="M 700.0,26 Q 668.0,26 664.0,62 Q 662.0,88 674.0,102 Q 686.0,114 700.0,114 L 700.0,26 Z" fill="url(#mmBody)"/><path d="M 700.0,108 L 719.0,108 L 722.0,138 L 700.0,142 Z" fill="url(#mmBody)"/><path d="M 700.0,108 L 681.0,108 L 678.0,138 L 700.0,142 Z" fill="url(#mmBody)"/><path d="M 700.0,132 Q 732.0,136 750.0,148 Q 764.0,156 768.0,180 L 772.0,236 Q 770.0,268 762.0,296 L 758.0,330 Q 762.0,356 760.0,384 L 754.0,412 L 700.0,420 Z" fill="url(#mmBody)"/><path d="M 700.0,132 Q 668.0,136 650.0,148 Q 636.0,156 632.0,180 L 628.0,236 Q 630.0,268 638.0,296 L 642.0,330 Q 638.0,356 640.0,384 L 646.0,412 L 700.0,420 Z" fill="url(#mmBody)"/><path d="M 752.0,146 Q 778.0,154 786.0,180 L 794.0,238 Q 798.0,268 802.0,300 L 810.0,352 Q 816.0,392 818.0,424 L 822.0,452 Q 830.0,470 824.0,486 Q 814.0,496 804.0,488 L 796.0,462 L 788.0,424 L 780.0,352 L 772.0,300 L 766.0,238 L 762.0,180 Z" fill="url(#mmBody)"/><path d="M 648.0,146 Q 622.0,154 614.0,180 L 606.0,238 Q 602.0,268 598.0,300 L 590.0,352 Q 584.0,392 582.0,424 L 578.0,452 Q 570.0,470 576.0,486 Q 586.0,496 596.0,488 L 604.0,462 L 612.0,424 L 620.0,352 L 628.0,300 L 634.0,238 L 638.0,180 Z" fill="url(#mmBody)"/><path d="M 700.0,414 L 754.0,408 Q 762.0,448 760.0,486 L 752.0,548 Q 748.0,574 746.0,596 L 742.0,652 Q 738.0,700 736.0,716 Q 746.0,726 748.0,740 L 746.0,752 L 714.0,752 L 712.0,716 L 710.0,652 L 708.0,596 L 706.0,548 L 702.0,486 Z" fill="url(#mmBody)"/><path d="M 700.0,414 L 646.0,408 Q 638.0,448 640.0,486 L 648.0,548 Q 652.0,574 654.0,596 L 658.0,652 Q 662.0,700 664.0,716 Q 654.0,726 652.0,740 L 654.0,752 L 686.0,752 L 688.0,716 L 690.0,652 L 692.0,596 L 694.0,548 L 698.0,486 Z" fill="url(#mmBody)"/>
</svg>`;

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
function PlanExercise({ex,accent}){
  return(
    <div style={{background:"#0a0a0a",border:`1px solid ${accent}28`,borderLeft:`3px solid ${accent}`,borderRadius:10,padding:"11px 13px",marginBottom:9}}>
      <div style={{fontSize:13.5,fontWeight:600,color:"#f0f0f0",lineHeight:1.35}}>
        {ex.name}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:5}}>
        <span style={{fontSize:10,fontWeight:700,background:accent+"30",color:accent,padding:"1px 8px",borderRadius:20}}>{ex.sets}</span>
        {ex.load&&<span style={{fontSize:10,fontWeight:700,background:"rgba(255,255,255,0.06)",color:"#aaa",padding:"1px 8px",borderRadius:20}}>{ex.load}</span>}
        {ex.rest&&<span style={{fontSize:10,fontWeight:700,background:"rgba(255,255,255,0.04)",color:INK.soft,padding:"1px 8px",borderRadius:20}}>⏸ {ex.rest}</span>}
      </div>
      {ex.desc&&<div style={{fontSize:11.5,color:"#9a9a9a",lineHeight:1.55,marginTop:7}}>{ex.desc}</div>}
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
  const hr=day.cardio?maxHeartRate(age):null;
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
        {day.cardio&&(
          <div style={{background:"#0a0a0a",border:`1px solid ${accent}28`,borderLeft:`3px solid ${accent}`,borderRadius:10,padding:"12px 13px",marginBottom:10}}>
            <div style={{fontSize:13.5,fontWeight:600,color:"#f0f0f0"}}>{day.cardio.machine||"Cardio"}</div>
            {day.cardio.variants.map((v,i)=>(
              <div key={i} style={{marginTop:i?10:7,paddingTop:i?10:0,borderTop:i?"1px solid #1c1c1c":"none"}}>
                {v.name&&<div style={{fontSize:11,fontWeight:700,color:"#c9c9c9",marginBottom:5}}>{v.name}</div>}
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  <span style={{fontSize:10,fontWeight:700,background:accent+"30",color:accent,padding:"1px 8px",borderRadius:20}}>{v.time}</span>
                  <span style={{fontSize:10,fontWeight:700,background:"rgba(255,255,255,0.06)",color:"#aaa",padding:"1px 8px",borderRadius:20}}>{v.hrFrom}–{v.hrTo}% HRmax</span>
                  {hr&&<span style={{fontSize:10,fontWeight:700,background:accent+"1e",color:accent,padding:"1px 8px",borderRadius:20}}>{Math.round(hr*v.hrFrom/100)}–{Math.round(hr*v.hrTo/100)} ud./min</span>}
                </div>
                {v.desc&&<div style={{fontSize:11.5,color:"#9a9a9a",lineHeight:1.55,marginTop:6}}>{v.desc}</div>}
              </div>
            ))}
            <div style={{marginTop:10,paddingTop:9,borderTop:"1px solid #1c1c1c",fontSize:11.5,color:"#9a9a9a",lineHeight:1.55}}>
              Tętno maksymalne wg wzoru <span style={{color:"#c9c9c9",fontFamily:MONO}}>208 − 0,7 × wiek</span> — dokładniejszego niż popularne 220 − wiek.
              {hr
                ?<> Dla Twoich <b>{age} lat</b>: HRmax ≈ <b style={{color:accent}}>{hr}</b> ud./min.</>
                :<> Podaj wiek w zakładce „Kalorie &amp; BMI”, a policzę zakresy w uderzeniach na minutę.</>}
            </div>
          </div>
        )}
        {day.exercises.map((ex,i)=><PlanExercise key={i} ex={ex} accent={accent}/>)}
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

