import { CATEGORIES, DAY_LABELS, INK , kb } from "../lib/ui.js";
import { IconBtn, DeleteBtn, TimePicker, TimePickerForm } from "../components/buttons.jsx";
import { MonthView, YearView } from "../components/calendar.jsx";
import { useApp } from "../lib/appContext.js";

export default function HabitsTab(){
  const { addAvoid, addHabit, avoidItems, avoidName, avoidNote, days7, deleteAvoid, deleteHabit, editAvoidId, editAvoidNote, editAvoidVal, editNameId, editNameVal, editTimeId, ensureYear, expandedHabit, getStreak, getView, getWeeklyRate, habitLogs, habits, habitsByCat, isChecked, isMobile, isWide, isXWide, newCat, newName, newTime, saveAvoid, setAvoidName, setAvoidNote, setEditAvoidId, setEditAvoidNote, setEditAvoidVal, setEditNameId, setEditNameVal, setEditTimeId, setExpandedHabit, setNewCat, setNewName, setNewTime, setShowAvoidForm, setShowForm, setView, showAvoidForm, showForm, startEditAvoid, todayStr, toggleHabit, updateName, updateTime }=useApp();
  const renderHabitCard=(habit,cat)=>{
    const checked=isChecked(habit.id,todayStr);
    const streak=getStreak(habit.id);
    const rate7=getWeeklyRate(habit.id);
    const open=!!expandedHabit[habit.id];
    const view=getView(habit.id);
    const isEditingTime=editTimeId===habit.id;
    return(
      <div key={habit.id} style={{background:"#161616",border:`1px solid ${checked?cat.color+"44":"#1e1e1e"}`,
        borderRadius:12,padding:"10px 11px",marginBottom:8,transition:"border-color 0.2s"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
          {/* Główna akcja aplikacji. Kółko zostaje 24 px, ale przycisk pod nim
              ma pełny cel dotyku — kciuk obok kółka nie może wchodzić w edycję nazwy. */}
          <button type="button" onClick={()=>toggleHabit(habit.id,todayStr)} aria-label={checked?"Odznacz":"Odhacz"} aria-pressed={checked}
            style={{width:isMobile?44:32,height:isMobile?44:32,margin:isMobile?"-10px -6px -10px -10px":"-4px -2px -4px -4px",background:"none",border:"none",padding:0,
              cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{width:24,height:24,borderRadius:"50%",border:`2px solid ${cat.color}`,background:checked?cat.color:"transparent",
              display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s"}}>
              {checked&&<span style={{color:"#000",fontSize:12,fontWeight:700}}>✓</span>}
            </span>
          </button>
          <div style={{flex:1,minWidth:0}}>
            {editNameId===habit.id?(
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                <input value={editNameVal} autoFocus
                  onChange={e=>setEditNameVal(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter")updateName(habit.id,editNameVal);if(e.key==="Escape")setEditNameId(null);}}
                  style={{flex:1,minWidth:0,background:"#0a0a0a",border:`1px solid ${cat.color}`,borderRadius:6,padding:"4px 8px",color:"#fff",fontSize:13,fontWeight:600,outline:"none"}}/>
                <IconBtn onClick={()=>updateName(habit.id,editNameVal)} title="Zapisz nazwę" size={24} bg="#1a3a1a" border="#2d6b20" color="#86efac">✓</IconBtn>
                <IconBtn onClick={()=>setEditNameId(null)} title="Anuluj" size={24} bg="#222" border="#444" color="#aaa">✕</IconBtn>
              </div>
            ):(
              <div {...kb(()=>{setEditNameId(habit.id);setEditNameVal(habit.name);})} title="Kliknij, aby zmienić nazwę" aria-label={`${habit.name} — zmień nazwę`}
                style={{fontWeight:600,fontSize:13.5,lineHeight:1.3,wordBreak:"break-word",cursor:"pointer",
                  opacity:checked?0.5:1,textDecoration:checked?"line-through":"none"}}>{habit.name} <span aria-hidden="true" style={{fontSize:10,color:INK.faint,opacity:0.8}}>✎</span></div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginTop:3}}>
              {streak>0&&<span style={{fontSize:11,color:checked?"#888":INK.faint}} title={checked?`${streak} dni z rzędu`:`${streak} dni z rzędu — dziś jeszcze nie`}>🔥 {streak}{!checked&&<span style={{color:INK.faint}}> · dziś jeszcze nie</span>}</span>}
              <button onClick={()=>setEditTimeId(isEditingTime?null:habit.id)} title="Godzina przypomnienia"
                style={{background:habit.reminderTime?"#222":"none",border:"none",borderRadius:6,
                  padding:habit.reminderTime?"2px 7px":"2px 2px",color:habit.reminderTime?"#aaa":INK.faint,fontSize:11,cursor:"pointer"}}>
                🕐{habit.reminderTime?` ${habit.reminderTime}`:""}
              </button>
            </div>
          </div>
          <DeleteBtn onDelete={()=>deleteHabit(habit.id)} title="Usuń nawyk" size={24}/>
        </div>
        {isEditingTime&&(
          <div style={{marginTop:9}}>
            {/* stacked: w wąskim kaflu siatka godzin i przyciski nie zmieszczą się obok siebie */}
            <TimePicker stacked value={habit.reminderTime} onChange={t=>updateTime(habit.id,t)}
              onClose={()=>setEditTimeId(null)} onRemove={habit.reminderTime?()=>updateTime(habit.id,""):null}/>
          </div>
        )}
        <button onClick={()=>setExpandedHabit(p=>({...p,[habit.id]:!p[habit.id]}))}
          style={{width:"100%",marginTop:8,background:open?"#1c1c1c":"transparent",border:"1px solid #232323",
            borderRadius:8,color:open?"#999":INK.soft,cursor:"pointer",fontSize:11,fontWeight:600,padding:0,minHeight:isMobile?36:28,
            display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
          {open?"▲ Zwiń":"▼ Postęp"}
        </button>
        {open&&(
          <div style={{marginTop:9,paddingTop:9,borderTop:"1px solid #1e1e1e"}}>
            <div style={{display:"flex",gap:3,marginBottom:9}}>
              {["7dni","miesiąc","rok"].map(v=>(
                <button key={v} onClick={()=>setView(habit.id,v)}
                  style={{flex:1,background:view===v?cat.color:"#1f1f1f",color:view===v?"#000":INK.soft,border:"none",
                    borderRadius:6,padding:0,minHeight:isMobile?36:28,fontSize:11,fontWeight:700,cursor:"pointer"}}>{v}</button>
              ))}
            </div>
            {view==="7dni"&&(
              <div>
                <div style={{display:"flex",gap:3,marginBottom:8}}>
                  {days7.map(d=>{
                    const done=isChecked(habit.id,d);
                    const di=new Date(d+"T00:00:00").getDay();
                    return(
                      <div key={d} style={{flex:1,minWidth:0,textAlign:"center"}}>
                        <div {...kb(()=>toggleHabit(habit.id,d))} title={d} aria-label={d} aria-pressed={done}
                          style={{height:24,borderRadius:5,background:done?cat.color:"#2a2a2a",cursor:"pointer",transition:"background 0.2s"}}/>
                        <div style={{fontSize:9,color:INK.muted,marginTop:3}}>{DAY_LABELS[di]}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{background:"#2a2a2a",borderRadius:99,height:5,overflow:"hidden"}}>
                  <div style={{width:`${rate7}%`,height:"100%",background:cat.color,borderRadius:99,transition:"width 0.4s"}}/>
                </div>
              </div>
            )}
            {view==="miesiąc"&&<MonthView compact habitId={habit.id} logs={habitLogs} color={cat.color} toggle={toggleHabit}/>}
            {view==="rok"&&<YearView compact habitId={habit.id} logs={habitLogs} color={cat.color} onYear={ensureYear}/>}
            <div style={{fontSize:10.5,color:INK.muted,marginTop:8,lineHeight:1.4}}>
              {streak>0?`🔥 ${streak} dni z rzędu`:"Zacznij serię już dziś!"}{view==="7dni"?` · ${rate7}% w tygodniu`:""}
            </div>
          </div>
        )}
      </div>
    );
  };
  return(
    <div style={{display:"grid",gap:16,alignItems:"start",gridTemplateColumns:isWide?"2fr 1fr":"1fr"}}>

      {/* dwie trzecie szerokości: nawyki rozłożone na kafle kategorii */}
      <div style={{minWidth:0}}>
        {habits.length===0&&(
          <div style={{textAlign:"center",padding:"60px 0",color:INK.muted}}>
            <div style={{fontSize:40,marginBottom:12}}>🌱</div>
            <p>Brak nawyków. Dodaj swój pierwszy!</p>
          </div>
        )}
        {habits.length>0&&(
          <div style={{display:"grid",gap:12,
            gridTemplateColumns:isMobile?"1fr":isXWide?"repeat(4,1fr)":"repeat(2,1fr)"}}>
            {CATEGORIES.map(cat=>{
              const list=habitsByCat[cat.label];
              const doneToday=list.filter(h=>isChecked(h.id,todayStr)).length;
              return(
                <div key={cat.label} style={{background:"#121317",border:`1px solid ${cat.color}2e`,
                  borderRadius:14,padding:12,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                    <span style={{width:9,height:9,borderRadius:3,background:cat.color,flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:700,color:cat.color,flex:1,minWidth:0,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cat.label}</span>
                    <span style={{fontSize:11,color:INK.soft,flexShrink:0}}>{doneToday}/{list.length}</span>
                  </div>
                  {/* pasek pokazuje dzisiejsze odhaczenia w obrębie kategorii */}
                  <div style={{background:"#232323",borderRadius:99,height:4,overflow:"hidden",marginBottom:10}}>
                    <div style={{width:list.length?`${(doneToday/list.length)*100}%`:"0%",height:"100%",
                      background:cat.color,borderRadius:99,transition:"width 0.3s"}}/>
                  </div>
                  {list.length===0&&(
                    <div style={{fontSize:11.5,color:INK.faint,fontStyle:"italic",padding:"4px 0 8px"}}>Nic tu jeszcze nie ma.</div>
                  )}
                  {list.map(h=>renderHabitCard(h,cat))}
                </div>
              );
            })}
          </div>
        )}

        {showForm&&(
          <div style={{background:"#161616",border:"1px solid #2a2a2a",borderRadius:14,padding:16,marginTop:12}}>
            <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addHabit()} placeholder="Nazwa nawyku…"
              style={{width:"100%",background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"10px 12px",color:"#fff",fontSize:14,boxSizing:"border-box",marginBottom:10,outline:"none"}} autoFocus/>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              {CATEGORIES.map(c=><button key={c.label} onClick={()=>setNewCat(c.label)} style={{border:`2px solid ${newCat===c.label?c.color:INK.faint}`,background:newCat===c.label?c.bg:"transparent",color:c.color,borderRadius:20,padding:"4px 12px",cursor:"pointer",fontSize:13,fontWeight:600}}>{c.label}</button>)}
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,color:"#888",display:"block",marginBottom:8}}>Godzina przypomnienia (opcjonalnie)</label>
              <TimePickerForm value={newTime} onChange={setNewTime}/>
              {newTime&&<button onClick={()=>setNewTime("")} style={{marginTop:6,background:"none",border:"none",color:INK.soft,cursor:"pointer",fontSize:12,padding:"8px 0",minHeight:36}}>Usuń godzinę ×</button>}
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

      {/* jedna trzecia szerokości: lista niewolnika */}
      <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:16,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:17}}>⛓️</span>
          <div style={{fontWeight:700,fontSize:15,color:"#f1f1f1"}}>Lista niewolnika</div>
          <span style={{marginLeft:"auto",fontSize:11,color:INK.soft}}>{avoidItems.length}</span>
        </div>
        <div style={{fontSize:11.5,color:INK.soft,lineHeight:1.55,margin:"6px 0 14px"}}>
          Rzeczy, od których trzymasz się z daleka. Odwrotność nawyku — nie ma tu czego odhaczać,
          liczy się sama lista.
        </div>

        {avoidItems.length===0&&(
          <div style={{textAlign:"center",padding:"24px 0",color:INK.faint}}>
            <div style={{fontSize:26,marginBottom:8}}>🚫</div>
            <div style={{fontSize:12.5}}>Lista jest pusta.</div>
          </div>
        )}
        {avoidItems.map(it=>(
          <div key={it.id} style={{background:"#0f0f0f",border:"1px solid #241818",borderLeft:"3px solid #b03b3b",
            borderRadius:10,padding:"9px 11px",marginBottom:8,display:"flex",alignItems:"flex-start",gap:8}}>
            <div style={{flex:1,minWidth:0}}>
              {editAvoidId===it.id?(
                <div>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    <input value={editAvoidVal} autoFocus
                      onChange={e=>setEditAvoidVal(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter")saveAvoid(it.id);if(e.key==="Escape")setEditAvoidId(null);}}
                      style={{flex:1,minWidth:0,background:"#0a0a0a",border:"1px solid #b03b3b",borderRadius:6,padding:"4px 8px",color:"#fff",fontSize:13,fontWeight:600,outline:"none"}}/>
                    <IconBtn onClick={()=>saveAvoid(it.id)} title="Zapisz" size={24} bg="#1a3a1a" border="#2d6b20" color="#86efac">✓</IconBtn>
                    <IconBtn onClick={()=>setEditAvoidId(null)} title="Anuluj" size={24} bg="#222" border="#444" color="#aaa">✕</IconBtn>
                  </div>
                  <input value={editAvoidNote} placeholder="Dlaczego (opcjonalnie)"
                    onChange={e=>setEditAvoidNote(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter")saveAvoid(it.id);if(e.key==="Escape")setEditAvoidId(null);}}
                    style={{width:"100%",boxSizing:"border-box",marginTop:6,background:"#0a0a0a",border:"1px solid #2a2a2a",borderRadius:6,padding:"4px 8px",color:"#ccc",fontSize:11.5,outline:"none"}}/>
                </div>
              ):(
                <>
                  <div {...kb(()=>startEditAvoid(it))} title="Kliknij, aby zmienić" aria-label={`${it.name} — zmień`}
                    style={{fontSize:13,fontWeight:600,color:"#e8e8e8",cursor:"pointer",wordBreak:"break-word",lineHeight:1.35}}>{it.name}</div>
                  {it.note&&(
                    <div onClick={()=>startEditAvoid(it)} aria-hidden="true" style={{fontSize:11,color:INK.soft,marginTop:4,lineHeight:1.5,cursor:"pointer"}}>{it.note}</div>
                  )}
                </>
              )}
            </div>
            <DeleteBtn onDelete={()=>deleteAvoid(it.id)} title="Usuń z listy" size={24}/>
          </div>
        ))}

        {showAvoidForm?(
          <div style={{background:"#0f0f0f",border:"1px solid #2a2a2a",borderRadius:10,padding:11,marginTop:10}}>
            <input value={avoidName} onChange={e=>setAvoidName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addAvoid()} placeholder="Od czego trzymasz się z daleka?" autoFocus
              style={{width:"100%",boxSizing:"border-box",background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"9px 11px",color:"#fff",fontSize:13,marginBottom:8,outline:"none"}}/>
            <input value={avoidNote} onChange={e=>setAvoidNote(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addAvoid()} placeholder="Dlaczego (opcjonalnie)"
              style={{width:"100%",boxSizing:"border-box",background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"9px 11px",color:"#fff",fontSize:12.5,marginBottom:10,outline:"none"}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={addAvoid} disabled={!avoidName.trim()}
                style={{flex:1,background:avoidName.trim()?"#b03b3b":"#222",color:avoidName.trim()?"#fff":INK.muted,border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,fontSize:13,cursor:avoidName.trim()?"pointer":"not-allowed"}}>Dodaj</button>
              <button onClick={()=>{setShowAvoidForm(false);setAvoidName("");setAvoidNote("");}}
                style={{background:"#222",color:"#aaa",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13}}>Anuluj</button>
            </div>
          </div>
        ):(
          <button onClick={()=>setShowAvoidForm(true)} style={{width:"100%",marginTop:8,padding:"11px",
            borderRadius:12,border:"2px dashed #3a2020",background:"transparent",color:"#a05555",
            fontWeight:600,fontSize:13,cursor:"pointer"}}>
            + Dodaj do listy
          </button>
        )}
      </div>
    </div>
  );
}
