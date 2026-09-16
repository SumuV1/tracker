import { MONO, INK, today, plDate, plTime } from "../lib/ui.js";
import { kb } from "../lib/ui.js";
import { IconBtn, DeleteBtn } from "../components/buttons.jsx";
import { MeasurementChart } from "../components/charts.jsx";
import { STATES, STATE_MAP, GROUPS, TECHNIQUES, dailyPick } from "../stability.js";
import { useApp } from "../lib/appContext.js";

export default function StabilityTab(){
  const { addCheckin, addKotwica, checkins, ciIntensity, ciNote, ciSaved, ciState, currentState, delKotwica, deleteCheckin, deletePrinciple, editPrinciple, isMobile, kotwicaEmoji, kotwicaInput, kotwice, principleForm, principleOffset, principles, savePrinciple, seedPrinciples, setCiIntensity, setCiNote, setCiState, setKotwicaEmoji, setKotwicaInput, setPrincipleForm, setPrincipleOffset, setShowAllTech, setShowPrinciples, setTechExpanded, showAllTech, showPrinciples, techExpanded, techUses, todayCheckins, useTechnique }=useApp();

  const ACC="#e8b84b";                       // akcent zakładki (nie seria danych)
  const st=currentState?STATE_MAP[currentState]:null;
  // Zasada dnia: najpierw te przypisane do bieżącego stanu, w braku — wszystkie.
  const pool=st?principles.filter(p=>(p.states||[]).includes(st.key)):[];
  const fromPool=pool.length>0;
  const principle=dailyPick(fromPool?pool:principles,today(),principleOffset);
  const techs=TECHNIQUES.filter(t=>showAllTech||!st||t.states.includes(st.key));
  const card={background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:isMobile?14:18,marginBottom:14};
  const chip=(on,color)=>({background:on?color+"22":"#0f0f0f",border:`1px solid ${on?color:"#2a2a2a"}`,borderRadius:20,
    padding:"4px 11px",color:on?"#f0f0f0":"#8a8a8a",fontSize:12,fontWeight:on?600:500,cursor:"pointer"});
  const usesOf=key=>techUses[key];
  return(
    <div>
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:11,letterSpacing:"0.2em",color:ACC,fontWeight:600,fontFamily:MONO,marginBottom:6}}>STABILIZACJA EMOCJONALNA</div>
        <div style={{fontSize:12,color:INK.soft,lineHeight:1.6,maxWidth:520,margin:"0 auto"}}>
          Nie chodzi o kierunek emocji, tylko o jej amplitudę. Nie da się regulować czegoś, czego się nie mierzy.
        </div>
      </div>

      {/* ── 1. Zasada dnia ── */}
      <div style={{...card,border:`1px solid ${ACC}33`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:ACC,fontFamily:MONO}}>
            ZASADA NA DZIŚ{fromPool&&st?` · ${st.label.toUpperCase()}`:""}
          </div>
          {principles.length>0&&(
            <div style={{display:"flex",gap:6}}>
              {(fromPool?pool:principles).length>1&&(
                <button onClick={()=>setPrincipleOffset(o=>o+1)} style={{background:"#222",border:"1px solid #333",borderRadius:8,color:"#aaa",padding:"4px 10px",fontSize:11,cursor:"pointer",minHeight:32}}>↻ Inna</button>
              )}
              <button onClick={()=>setShowPrinciples(v=>!v)} style={{background:showPrinciples?"#2a2a2a":"#222",border:"1px solid #333",borderRadius:8,color:"#aaa",padding:"4px 10px",fontSize:11,cursor:"pointer"}}>
                {showPrinciples?"Zwiń":`Wszystkie (${principles.length})`}
              </button>
            </div>
          )}
        </div>
        {principle?(
          <div>
            <div style={{fontSize:isMobile?17:19,fontWeight:600,color:"#f1f1f1",lineHeight:1.5,fontStyle:"italic"}}>„{principle.text}”</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginTop:10,flexWrap:"wrap"}}>
              <div style={{fontSize:12,color:"#8a8a8a"}}>— {principle.source||"ja do siebie"}</div>
              <button onClick={()=>editPrinciple(principle)} style={{background:"none",border:"none",color:INK.soft,fontSize:12,cursor:"pointer",textDecoration:"underline",padding:"8px 6px",minHeight:36}}>✎ edytuj</button>
            </div>
            {principle.note&&<div style={{fontSize:11.5,color:INK.soft,marginTop:8,lineHeight:1.5,borderTop:"1px solid #1e1e1e",paddingTop:8}}>{principle.note}</div>}
          </div>
        ):(
          <div style={{textAlign:"center",padding:"14px 0 6px"}}>
            <div style={{fontSize:13,color:"#8a8a8a",lineHeight:1.6,marginBottom:12}}>
              Tu będzie jedna zasada dziennie — Twoimi słowami, z tego, co u Ciebie działa.
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
              <button onClick={()=>editPrinciple(null)} style={{background:ACC,color:"#000",border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,fontSize:13,cursor:"pointer"}}>Dodaj pierwszą zasadę</button>
              <button onClick={seedPrinciples} style={{background:"#222",border:"1px solid #333",borderRadius:8,color:"#aaa",padding:"8px 16px",fontSize:13,cursor:"pointer"}}>Wstaw 6 maksym stoików na start</button>
            </div>
          </div>
        )}

        {showPrinciples&&(
          <div style={{marginTop:14,borderTop:"1px solid #1e1e1e",paddingTop:12}}>
            {principles.map(p=>(
              <div key={p.id} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"8px 0",borderBottom:"1px solid #151515"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,color:"#ddd",lineHeight:1.45}}>{p.text}</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:5,alignItems:"center"}}>
                    <span style={{fontSize:10.5,color:INK.soft}}>{p.source||"ja do siebie"}</span>
                    {(p.states||[]).map(k=><span key={k} style={{fontSize:10,color:"#8a8a8a",background:"#0f0f0f",border:"1px solid #2a2a2a",borderRadius:10,padding:"1px 7px"}}>{STATE_MAP[k]?.icon} {STATE_MAP[k]?.label}</span>)}
                  </div>
                </div>
                <IconBtn onClick={()=>editPrinciple(p)} title="Edytuj" size={24} bg="#1c2030" border="#2f3550" color="#8fa6e8">✎</IconBtn>
                <DeleteBtn onDelete={()=>deletePrinciple(p.id)} title="Usuń zasadę" size={24}/>
              </div>
            ))}
            <button onClick={()=>editPrinciple(null)} style={{width:"100%",marginTop:10,padding:"9px",borderRadius:10,border:"2px dashed #333",background:"transparent",color:"#888",fontWeight:600,fontSize:13,cursor:"pointer"}}>+ Dodaj zasadę</button>
          </div>
        )}

        {principleForm&&(
          <div style={{marginTop:14,background:"#0f0f0f",border:"1px solid #2a2a2a",borderRadius:10,padding:12}}>
            <div style={{fontSize:12,fontWeight:600,color:"#aaa",marginBottom:8}}>{principleForm.id?"Edycja zasady":"Nowa zasada"}</div>
            <textarea value={principleForm.text} onChange={e=>setPrincipleForm(f=>({...f,text:e.target.value}))} placeholder="Zasada — Twoimi słowami" rows={3} autoFocus
              style={{width:"100%",boxSizing:"border-box",background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"9px 11px",color:"#fff",fontSize:13.5,lineHeight:1.5,outline:"none",resize:"vertical",fontFamily:"inherit",marginBottom:8}}/>
            <input value={principleForm.source} onChange={e=>setPrincipleForm(f=>({...f,source:e.target.value}))} placeholder="Skąd — Epiktet, Aureliusz, „ja do siebie” (opcjonalnie)"
              style={{width:"100%",boxSizing:"border-box",background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"8px 11px",color:"#fff",fontSize:12.5,outline:"none",marginBottom:8}}/>
            <div style={{fontSize:11,color:INK.soft,marginBottom:6}}>Na jaki stan (pusto = na każdy):</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              {STATES.map(s=>{const on=principleForm.states.includes(s.key);return(
                <button key={s.key} onClick={()=>setPrincipleForm(f=>({...f,states:on?f.states.filter(k=>k!==s.key):[...f.states,s.key]}))} style={chip(on,ACC)}>{s.icon} {s.label}</button>
              );})}
            </div>
            <input value={principleForm.note} onChange={e=>setPrincipleForm(f=>({...f,note:e.target.value}))} placeholder="Dlaczego to u mnie działa (opcjonalnie)"
              style={{width:"100%",boxSizing:"border-box",background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"8px 11px",color:"#fff",fontSize:12.5,outline:"none",marginBottom:10}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={savePrinciple} disabled={!principleForm.text.trim()} style={{flex:1,background:principleForm.text.trim()?ACC:"#222",color:principleForm.text.trim()?"#000":INK.muted,border:"none",borderRadius:8,padding:"9px",fontWeight:700,fontSize:13,cursor:"pointer"}}>Zapisz</button>
              <button onClick={()=>setPrincipleForm(null)} style={{background:"#222",border:"1px solid #444",borderRadius:8,color:"#aaa",padding:"9px 16px",fontSize:13,cursor:"pointer"}}>Anuluj</button>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Check-in ── */}
      <div style={card}>
        <div style={{fontSize:15,fontWeight:700,color:"#f1f1f1",marginBottom:3}}>Jak jest teraz?</div>
        <div style={{fontSize:11.5,color:INK.soft,marginBottom:12,minHeight:17}}>
          {ciSaved?<span style={{color:ACC}}>{ciSaved}</span>:ciState?STATE_MAP[ciState].hint:todayCheckins.length?`Dziś już ${todayCheckins.length}× — możesz dopisać kolejny.`:"Jedno tapnięcie. Po miesiącu zobaczysz wzorzec, którego dziś nie widać."}
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(3,1fr)":"repeat(6,1fr)",gap:6,marginBottom:12}}>
          {STATES.map(s=>{const on=ciState===s.key;return(
            <button key={s.key} onClick={()=>setCiState(on?null:s.key)}
              style={{background:on?ACC+"22":"#0f0f0f",border:`1px solid ${on?ACC:"#2a2a2a"}`,borderRadius:10,padding:"9px 4px",cursor:"pointer",
                display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <span style={{fontSize:18}}>{s.icon}</span>
              <span style={{fontSize:11,fontWeight:600,color:on?"#f0f0f0":"#8a8a8a"}}>{s.label}</span>
            </button>
          );})}
        </div>
        {ciState&&(
          <div>
            <div style={{fontSize:11,color:INK.soft,marginBottom:6}}>Jak mocno?</div>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {[1,2,3,4,5].map(n=>(
                <button key={n} onClick={()=>setCiIntensity(n)}
                  style={{flex:1,background:ciIntensity===n?ACC:"#0f0f0f",border:`1px solid ${ciIntensity>=n?ACC:"#2a2a2a"}`,borderRadius:8,padding:"8px 0",
                    color:ciIntensity===n?"#000":ciIntensity>=n?ACC:INK.soft,fontWeight:700,fontSize:13,cursor:"pointer"}}>{n}</button>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:INK.muted,marginTop:-6,marginBottom:10,padding:"0 4px"}}><span>ledwo</span><span>{ciState==="spokoj"?"całkowity":ciState==="nakrecenie"?"nie do opanowania":"nie do zniesienia"}</span></div>
            <div style={{display:"flex",gap:8}}>
              <input value={ciNote} onChange={e=>setCiNote(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCheckin()} placeholder="Jedno zdanie, jeśli chcesz (opcjonalnie)"
                style={{flex:1,minWidth:0,background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"9px 11px",color:"#fff",fontSize:13,outline:"none"}}/>
              <button onClick={addCheckin} style={{background:ACC,color:"#000",border:"none",borderRadius:8,padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0}}>Zapisz</button>
            </div>
          </div>
        )}

        {checkins.length>0&&(
          <div style={{marginTop:16,borderTop:"1px solid #1e1e1e",paddingTop:12}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:INK.soft,fontFamily:MONO,marginBottom:6}}>OSTATNIE 14 DNI</div>
            <MeasurementChart rows={checkins.map(c=>({day:c.at,intensity:c.intensity,state:c.state}))} metric="intensity"
              isMobile={isMobile} color="#3aa88c" domain={[1,5]} showDelta={false} noun="check-in"
              labelOf={r=>`${STATE_MAP[r.state]?.icon||""} ${STATE_MAP[r.state]?.label||r.state} · ${plTime(r.day)}`}/>
            <div style={{marginTop:8,maxHeight:180,overflowY:"auto"}}>
              {[...checkins].reverse().slice(0,20).map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 2px",borderTop:"1px solid #151515",fontSize:12}}>
                  <span style={{color:"#8a8a8a",fontVariantNumeric:"tabular-nums",flexShrink:0}}>{plDate(c.at)} {plTime(c.at)}</span>
                  <span style={{color:"#ddd",flexShrink:0}}>{STATE_MAP[c.state]?.icon} {STATE_MAP[c.state]?.label}</span>
                  <span style={{color:"#3aa88c",fontWeight:700,flexShrink:0}}>{c.intensity}/5</span>
                  <span style={{color:INK.soft,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.note||""}</span>
                  <DeleteBtn onDelete={()=>deleteCheckin(c.id)} title="Usuń wpis" size={22}/>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Techniki ── */}
      <div style={card}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:4}}>
          <div style={{fontSize:15,fontWeight:700,color:"#f1f1f1"}}>
            {st&&!showAllTech?<>Co pomaga przy: <span style={{color:ACC}}>{st.icon} {st.label.toLowerCase()}</span></>:"Techniki"}
          </div>
          {st&&(
            <button onClick={()=>setShowAllTech(v=>!v)} style={{background:"#222",border:"1px solid #333",borderRadius:8,color:"#aaa",padding:"4px 10px",fontSize:11,cursor:"pointer"}}>
              {showAllTech?"Tylko pasujące":"Pokaż wszystkie"}
            </button>
          )}
        </div>
        <div style={{fontSize:11.5,color:INK.soft,marginBottom:12,lineHeight:1.5}}>
          {!st?"Zaznacz stan wyżej, a zostaną te, które przy nim mają sens.":
           st.key==="spokoj"&&!showAllTech?"Spokój — nic nie trzeba naprawiać. Dobry moment, żeby zapisać zasadę albo zobaczyć, co ostatnio pomagało.":
           st.arousal==="high"?"Wysokie pobudzenie schodzi przez ciało, nie przez perswazję. Zacznij od wyciszenia.":
           "Niskie pobudzenie: działanie poprzedza motywację. Małe, zamknięte, teraz."}
        </div>
        {GROUPS.map(g=>{
          const list=techs.filter(t=>t.group===g.key);
          if(!list.length)return null;
          return(
            <div key={g.key} style={{marginBottom:14}}>
              <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:8}}>
                <span style={{fontSize:12,fontWeight:700,color:g.color}}>{g.icon} {g.label}</span>
                <span style={{fontSize:11,color:INK.muted}}>{g.desc}</span>
              </div>
              {list.map(t=>{
                const open=!!techExpanded[t.key];
                const u=usesOf(t.key);
                return(
                  <div key={t.key} style={{background:"#0f0f0f",border:`1px solid ${open?g.color+"55":"#1e1e1e"}`,boxShadow:`inset 3px 0 0 ${g.color}`,borderRadius:10,padding:"10px 14px",marginBottom:8}}>
                    <div {...kb(()=>setTechExpanded(p=>({...p,[t.key]:!p[t.key]})))} aria-expanded={open} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",minHeight:36}}>
                      <span style={{fontSize:20,flexShrink:0}}>{t.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13.5,fontWeight:600,color:"#f0f0f0"}}>{t.name} <span style={{fontSize:11,color:INK.soft,fontWeight:400}}>· {t.time}</span></div>
                        <div style={{fontSize:11,color:INK.soft,marginTop:2}}>
                          {u?`użyta ${u.count}× w 30 dni · ostatnio ${plDate(u.lastAt)}`:"jeszcze nieużyta"}
                        </div>
                      </div>
                      <span style={{color:INK.muted,fontSize:12,flexShrink:0}}>{open?"▲":"▼"}</span>
                    </div>
                    {open&&(
                      <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #1e1e1e"}}>
                        <div style={{fontSize:12.5,color:"#aaa",lineHeight:1.6,marginBottom:10}}>{t.desc}</div>
                        <ol style={{margin:"0 0 12px",paddingLeft:20,fontSize:12.5,color:"#ddd",lineHeight:1.7}}>
                          {t.steps.map((s,i)=><li key={i}>{s}</li>)}
                        </ol>
                        <button onClick={()=>useTechnique(t.key)} style={{background:g.color+"22",border:`1px solid ${g.color}`,borderRadius:999,padding:"6px 16px",color:g.color,fontSize:12,fontWeight:700,cursor:"pointer"}}>✓ Zrobiłem</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── 4. Kotwice ── */}
      <div style={{...card,border:"1px solid #30888a44"}}>
        <div style={{fontSize:15,fontWeight:700,color:"#f1f1f1",marginBottom:3}}>⚓ Kotwice</div>
        <div style={{fontSize:11.5,color:INK.soft,marginBottom:12,lineHeight:1.5}}>Rzeczy, które historycznie pomagały — nawet trochę. Ochota pojawia się w trakcie, nie przed.</div>
        {kotwice.length===0&&<div style={{fontSize:12.5,color:INK.muted,fontStyle:"italic",marginBottom:10}}>Nie masz jeszcze żadnych kotwic — dodaj pierwszą poniżej.</div>}
        {kotwice.map(k=>(
          <div key={k.id} style={{display:"flex",alignItems:"center",gap:10,background:"#0f0f0f",border:"1px solid #1e1e1e",borderRadius:10,padding:"8px 12px",marginBottom:6}}>
            <span style={{fontSize:18}}>{k.emoji}</span>
            <span style={{flex:1,fontSize:13,color:"#ddd"}}>{k.label}</span>
            <DeleteBtn onDelete={()=>delKotwica(k.id)} title="Usuń kotwicę" size={24}/>
          </div>
        ))}
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <select value={kotwicaEmoji} onChange={e=>setKotwicaEmoji(e.target.value)} style={{background:"#0f0f0f",border:"1px solid #333",borderRadius:10,padding:"9px 10px",color:"#fff",fontSize:16,cursor:"pointer",outline:"none"}}>
            {["🎵","🎸","📚","🎮","🚶","🏋️","🎨","🍳","🌳","☕","🎬","🧩","🐟"].map(e=><option key={e} value={e}>{e}</option>)}
          </select>
          <input value={kotwicaInput} onChange={e=>setKotwicaInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addKotwica()} placeholder="Dodaj kotwicę…"
            style={{flex:1,minWidth:0,background:"#0f0f0f",border:"1px solid #333",borderRadius:10,padding:"9px 12px",color:"#fff",fontSize:13,outline:"none"}}/>
          <button onClick={addKotwica} style={{background:"#30888a",color:"#fff",border:"none",borderRadius:10,padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>Dodaj</button>
        </div>
      </div>
    </div>
  );
}
