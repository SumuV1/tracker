import { INK, NUTRIENT, toISO, today, BF_SCALE, ACTIVITY, plDate , kb } from "../lib/ui.js";
import { IconBtn, DeleteBtn } from "../components/buttons.jsx";
import { FormulaPanel } from "../components/FormulaPanel.jsx";
import { NutrientRings, MeasurementChart } from "../components/charts.jsx";
import { CalYearView } from "../components/calendar.jsx";
import { useApp } from "../lib/appContext.js";

// Pole formularza: `width:100%` z box-sizing, bo input typu number bez tego ma
// własną szerokość (~150 px) i siatka auto-fit nie potrafi go ścisnąć —
// na telefonie karta „Twoje dane" wystawała 130 px poza ekran.
const FIELD={width:"100%",boxSizing:"border-box",minWidth:0,background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"9px 12px",color:"#fff",fontSize:14,outline:"none"};

export default function CaloriesTab(){
  const { foodCats, addFood, addMeasurement, bf, bfCol, bmiInfo, bmiTab, bmiVal, calDate, calcAll, chartMetric, closeCustomForm, closeModal, customForm, dailyTotals, dayGroups, dayLoading, deleteCustomFood, deleteMeasurement, editFoodId, editGramsId, editGramsVal, ensureYear, error, filtered, grams, gramsNum, isMobile, isWide, measForm, measurements, modal, n1, offInfo, offLoading, offQuery, offResults, openGroups, profile, removeEntry, saveCustomFood, saveGrams, search, searchOff, selCat, selFood, serverProfile, setBmiTab, setCalDate, setChartMetric, setCustomForm, setEditGramsId, setEditGramsVal, setError, setGrams, setMeasForm, setModal, setOffInfo, setOffQuery, setOffResults, setOpenGroups, setProfile, setSearch, setSelCat, setSelFood, setShowCustomForm, setShowMeasForm, showCustomForm, showMeasForm, startEditFood, tdee, todayEntries, totToday }=useApp();
  const entryActions=e=>editGramsId===e.id?(
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      <input autoFocus type="number" step="any" min={0} inputMode="decimal" value={editGramsVal}
        onChange={ev=>setEditGramsVal(ev.target.value)}
        onKeyDown={ev=>{if(ev.key==="Enter")saveGrams(e.id);if(ev.key==="Escape")setEditGramsId(null);}}
        style={{width:72,padding:"5px 8px",borderRadius:7,border:"1px solid #444",background:"#0a0a0a",color:"#fff",fontSize:13,outline:"none"}}/>
      <span style={{fontSize:11,color:"#8a8a8a"}}>g</span>
      <IconBtn onClick={()=>saveGrams(e.id)} title="Zapisz gramaturę" disabled={!(Number(editGramsVal)>0)}
        bg={Number(editGramsVal)>0?"#14351f":"#222"} border={Number(editGramsVal)>0?"#2f6b40":"#333"} color={Number(editGramsVal)>0?"#4ade80":INK.faint}>✓</IconBtn>
      <IconBtn onClick={()=>setEditGramsId(null)} title="Anuluj" bg="#222" border="#333" color="#999">✕</IconBtn>
    </div>
  ):(
    <>
      <IconBtn onClick={()=>{setEditGramsId(e.id);setEditGramsVal(String(e.grams));}} title="Zmień gramaturę" bg="#1c2030" border="#2f3550" color="#8fa6e8">✎</IconBtn>
      <DeleteBtn onDelete={()=>removeEntry(e.id)} title="Usuń wpis"/>
    </>
  );
  return(<>
    <div>
      <div style={{display:"flex",gap:4,background:"#161616",borderRadius:10,padding:4,marginBottom:20}}>
        {[["bmi","BMI & Profil"],["tracker","Licznik kalorii"]].map(([k,l])=>(
          <button key={k} onClick={()=>setBmiTab(k)} style={{flex:1,background:bmiTab===k?"#2a2a2a":"transparent",border:"none",borderRadius:8,padding:"9px 8px",color:bmiTab===k?"#fff":INK.soft,fontWeight:600,cursor:"pointer",fontSize:isMobile?13:14}}>{l}</button>
        ))}
      </div>

      {/* BMI. minWidth:0 na dzieciach siatki: bez tego kolumna 1fr rośnie do
          najszerszej niełamliwej linii (wzór tkanki tłuszczowej) i karta
          wystawała 130 px poza ekran telefonu, choć wzory mają własne
          przewijanie. */}
      {bmiTab==="bmi"&&(
        <div style={{display:"grid",gap:16,alignItems:"start",
          gridTemplateColumns:isWide?"minmax(300px,420px) minmax(320px,1fr)":"1fr"}}>
          <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:20,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:700,color:"#ccc",marginBottom:16}}>Twoje dane</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:12}}>
              {[["Waga (kg)","weight"],["Wzrost (cm)","height"],["Wiek (lata)","age"]].map(([label,key])=>(
                <div key={key} style={{display:"flex",flexDirection:"column",gap:6,minWidth:0}}>
                  <label htmlFor={`prof-${key}`} style={{fontSize:12,color:"#888"}}>{label}</label>
                  <input id={`prof-${key}`} type="number" step="any" inputMode="decimal" value={profile[key]} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}
                    style={FIELD} placeholder={label}/>
                </div>
              ))}
              <div style={{display:"flex",flexDirection:"column",gap:6,minWidth:0}}>
                <label style={{fontSize:12,color:"#888"}}>Płeć</label>
                <select value={profile.sex} onChange={e=>setProfile(p=>({...p,sex:e.target.value}))}
                  style={FIELD}>
                  <option value="M">Mężczyzna</option><option value="F">Kobieta</option>
                </select>
              </div>
            </div>
            {/* Obwody są opcjonalne — bez nich liczy się wszystko poza
                tkanką tłuszczową. Podpowiedzi pomiarowe są przy polach,
                bo metoda jest wrażliwsza na technikę niż na cokolwiek innego. */}
            <div style={{background:"#0d0d0d",border:"1px solid #1e1e1e",borderRadius:10,padding:"12px 13px",marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,color:"#aaa",marginBottom:3}}>Obwody — tkanka tłuszczowa (opcjonalnie)</div>
              <div style={{fontSize:11,color:INK.soft,marginBottom:10,lineHeight:1.5}}>Mierz rano, na czczo, po wydechu. Taśma przylega, ale nie wgniata skóry.</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}}>
                {[["Szyja (cm)","neck","Poniżej krtani, taśma lekko skośna w dół z przodu."],
                  ["Talia (cm)","waist",profile.sex==="F"?"W najwęższym miejscu tułowia.":"Na wysokości pępka, taśma poziomo."],
                  ...(profile.sex==="F"?[["Biodra (cm)","hips","W najszerszym miejscu pośladków, stopy razem."]]:[])
                ].map(([label,key,hint])=>(
                  <div key={key} style={{display:"flex",flexDirection:"column",gap:6,minWidth:0}}>
                    <label style={{fontSize:12,color:"#888"}}>{label}</label>
                    <input type="number" step="any" inputMode="decimal" value={profile[key]}
                      onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}
                      style={FIELD} placeholder={label}/>
                    <div style={{fontSize:10.5,color:INK.muted,lineHeight:1.45}}>{hint}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,color:"#888",display:"block",marginBottom:6}}>Poziom aktywności</label>
              <select value={profile.activity} onChange={e=>setProfile(p=>({...p,activity:+e.target.value}))}
                style={FIELD}>
                {ACTIVITY.map((a,i)=><option key={i} value={i}>{a.option} — ×{String(a.factor).replace(".",",")}</option>)}
              </select>
            </div>
            <button onClick={calcAll} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>Oblicz BMI i zapotrzebowanie</button>
          </div>
          {bmiVal&&bmiInfo&&(
            <div style={{minWidth:0}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12}}>
              <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:20,textAlign:"center"}}>
                <div style={{fontSize:12,color:"#888",marginBottom:6}}>Twoje BMI</div>
                <div style={{fontSize:isMobile?40:48,fontWeight:800,color:bmiInfo.color}}>{bmiVal.toFixed(1)}</div>
                <div style={{display:"inline-block",marginTop:6,padding:"3px 14px",borderRadius:20,background:bmiInfo.color+"22",color:bmiInfo.color,fontWeight:700,fontSize:13}}>{bmiInfo.label}</div>
                <div style={{marginTop:12,fontSize:11,color:INK.muted,lineHeight:1.8}}>
                  <div>Niedowaga: &lt;18.5</div><div>Norma: 18.5–24.9</div><div>Nadwaga: 25–29.9</div><div>Otyłość: ≥30</div>
                </div>
              </div>
              <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:20,textAlign:"center"}}>
                <div style={{fontSize:12,color:"#888",marginBottom:6}}>Dzienne zapotrzebowanie</div>
                <div style={{fontSize:isMobile?40:48,fontWeight:800,color:NUTRIENT.kcal}}>{tdee}</div>
                <div style={{color:"#888",fontSize:13,marginBottom:12}}>kcal / dzień</div>
                <div style={{background:"#0a0a0a",borderRadius:10,padding:10}}>
                  <div style={{fontSize:11,color:INK.soft,marginBottom:8}}>Sugerowane makro:</div>
                  <div style={{display:"flex",justifyContent:"space-around"}}>
                    {[["Białko",serverProfile.targets.proteinG+"g",NUTRIENT.protein],["Węgl.",serverProfile.targets.carbsG+"g",NUTRIENT.carbs],["Tłuszcze",serverProfile.targets.fatG+"g",NUTRIENT.fat]].map(([n,v,c])=>(
                      <div key={n} style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:10,color:INK.muted}}>{n}</div></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {bf&&(
              <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:20,marginTop:12}}>
                <div style={{display:"grid",gridTemplateColumns:isWide?"minmax(200px,260px) 1fr":"1fr",gap:18,alignItems:"start"}}>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:12,color:"#888",marginBottom:6}}>Tkanka tłuszczowa</div>
                    <div style={{fontSize:isMobile?40:48,fontWeight:800,color:bfCol}}>{String(bf.pct).replace(".",",")}<span style={{fontSize:24}}> %</span></div>
                    <div style={{display:"inline-block",marginTop:6,padding:"3px 14px",borderRadius:20,background:bfCol+"22",color:bfCol,fontWeight:700,fontSize:13}}>{bf.category}</div>
                    <div style={{marginTop:10,fontSize:11,color:INK.soft}}>± 3–4 p.p. — tyle wynosi błąd metody</div>
                  </div>
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,marginBottom:14}}>
                      <div style={{background:"#0a0a0a",borderRadius:10,padding:"10px 12px"}}>
                        <div style={{fontSize:19,fontWeight:800,color:NUTRIENT.fat}}>{String(bf.fatMassKg).replace(".",",")} kg</div>
                        <div style={{fontSize:10.5,color:INK.soft,marginTop:2}}>masa tłuszczu</div>
                      </div>
                      <div style={{background:"#0a0a0a",borderRadius:10,padding:"10px 12px"}}>
                        <div style={{fontSize:19,fontWeight:800,color:NUTRIENT.protein}}>{String(bf.leanMassKg).replace(".",",")} kg</div>
                        <div style={{fontSize:10.5,color:INK.soft,marginTop:2}}>masa beztłuszczowa</div>
                      </div>
                    </div>
                    {bf.milestones.length>0&&(
                      <div style={{marginBottom:14}}>
                        <div style={{fontSize:11,color:"#888",marginBottom:6}}>
                          Masa ciała przy niższym poziomie, jeśli masa beztłuszczowa się nie zmieni:
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                          {bf.milestones.map(m=>(
                            <span key={m.pct} style={{background:"#0a0a0a",border:"1px solid #262626",borderRadius:20,padding:"4px 12px",fontSize:12,color:"#bbb"}}>
                              {m.pct} % → <b style={{color:"#e8e8e8"}}>{String(m.weightKg).replace(".",",")} kg</b>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:6}}>
                      {(BF_SCALE[serverProfile.sex]||BF_SCALE.M).map(([label,range,color])=>(
                        <div key={label} style={{display:"flex",alignItems:"center",gap:7,fontSize:11,
                          color:label===bf.category?"#e8e8e8":INK.muted,fontWeight:label===bf.category?700:400}}>
                          <span style={{width:8,height:8,borderRadius:2,background:color,flexShrink:0,opacity:label===bf.category?1:0.5}}/>
                          {label} <span style={{color:INK.faint}}>{range}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {serverProfile?.bmr&&<FormulaPanel profile={serverProfile}/>}
            </div>
          )}
          <div style={{gridColumn:"1/-1",background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:isMobile?14:20}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:12}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#ccc"}}>Historia pomiarów</div>
                <div style={{fontSize:11,color:INK.soft,marginTop:2}}>
                  Każde kliknięcie „Oblicz" zapisuje pomiar z dzisiaj. Metoda US Navy ma błąd ±3–4 p.p. — liczy się przebieg, nie pojedynczy odczyt.
                </div>
              </div>
              <div style={{display:"flex",gap:3,background:"#0f0f0f",borderRadius:8,padding:3,flexShrink:0}}>
                {[["weightKg","Waga"],["bodyFatPct","Tkanka tł."],["waistCm","Talia"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setChartMetric(k)}
                    style={{background:chartMetric===k?"#2a2a2a":"transparent",border:"none",borderRadius:6,
                      padding:"5px 11px",color:chartMetric===k?"#fff":INK.soft,fontWeight:600,fontSize:12,cursor:"pointer"}}>{l}</button>
                ))}
              </div>
            </div>

            <MeasurementChart rows={measurements} metric={chartMetric} isMobile={isMobile}/>

            {measurements.length>0&&(
              <div style={{marginTop:16,borderTop:"1px solid #1e1e1e",paddingTop:12}}>
                {/* Widok tabelaryczny — każda liczba z wykresu jest też do odczytania tekstem. */}
                <div style={{display:"grid",gridTemplateColumns:"minmax(72px,1fr) repeat(3,minmax(44px,1fr)) auto",
                  gap:6,fontSize:10,color:INK.soft,fontWeight:700,letterSpacing:"0.06em",padding:"0 2px 6px"}}>
                  <span>DATA</span><span style={{textAlign:"right"}}>WAGA</span>
                  <span style={{textAlign:"right"}}>TALIA</span><span style={{textAlign:"right"}}>TK. TŁ.</span><span/>
                </div>
                <div style={{maxHeight:200,overflowY:"auto"}}>
                  {[...measurements].reverse().map(r=>(
                    <div key={r.id} style={{display:"grid",gridTemplateColumns:"minmax(72px,1fr) repeat(3,minmax(44px,1fr)) auto",
                      gap:6,alignItems:"center",padding:"5px 2px",borderTop:"1px solid #151515",fontSize:12,fontVariantNumeric:"tabular-nums"}}>
                      <span style={{color:"#bbb"}}>{plDate(r.day)}</span>
                      <span style={{textAlign:"right",color:"#e8e8e8"}}>{r.weightKg!=null?`${r.weightKg} kg`:"—"}</span>
                      <span style={{textAlign:"right",color:"#8a8a8a"}}>{r.waistCm!=null?`${r.waistCm} cm`:"—"}</span>
                      <span style={{textAlign:"right",color:"#8a8a8a"}}>{r.bodyFatPct!=null?`${String(r.bodyFatPct).replace(".",",")} %`:"—"}</span>
                      <DeleteBtn onDelete={()=>deleteMeasurement(r.id)} title="Usuń pomiar" size={22}/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showMeasForm?(
              <div style={{background:"#0f0f0f",border:"1px solid #2a2a2a",borderRadius:10,padding:12,marginTop:12}}>
                <div style={{fontSize:12,fontWeight:600,color:"#aaa",marginBottom:8}}>Pomiar z innego dnia</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:10}}>
                  <input type="date" value={measForm.day} max={today()}
                    onChange={e=>setMeasForm(f=>({...f,day:e.target.value}))}
                    style={{background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"8px 10px",color:"#fff",fontSize:13,colorScheme:"dark",outline:"none"}}/>
                  {[["Waga (kg)","weight"],["Szyja (cm)","neck"],["Talia (cm)","waist"],
                    ...(profile.sex==="F"?[["Biodra (cm)","hips"]]:[])].map(([label,key])=>(
                    <input key={key} type="number" step="any" inputMode="decimal" placeholder={label} value={measForm[key]}
                      onChange={e=>setMeasForm(f=>({...f,[key]:e.target.value}))}
                      style={{background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"8px 10px",color:"#fff",fontSize:13,outline:"none"}}/>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={addMeasurement} disabled={!measForm.day||!(measForm.weight||measForm.neck||measForm.waist||measForm.hips)}
                    style={{flex:1,background:measForm.day&&(measForm.weight||measForm.neck||measForm.waist||measForm.hips)?"#8d4fbc":"#222",
                      color:measForm.day&&(measForm.weight||measForm.neck||measForm.waist||measForm.hips)?"#fff":INK.muted,
                      border:"none",borderRadius:8,padding:"9px 16px",fontWeight:700,fontSize:13,cursor:"pointer"}}>Zapisz pomiar</button>
                  <button onClick={()=>setShowMeasForm(false)} style={{background:"#222",border:"1px solid #444",borderRadius:8,color:"#aaa",padding:"9px 16px",fontSize:13,cursor:"pointer"}}>Anuluj</button>
                </div>
                <div style={{fontSize:10.5,color:INK.muted,marginTop:8,lineHeight:1.5}}>
                  Jeden pomiar na dzień — ponowny zapis tej samej daty nadpisuje poprzedni.
                </div>
              </div>
            ):(
              <button onClick={()=>{setMeasForm(f=>({...f,day:today()}));setShowMeasForm(true);}}
                style={{width:"100%",marginTop:12,padding:"10px",borderRadius:10,border:"2px dashed #333",
                  background:"transparent",color:"#888",fontWeight:600,fontSize:13,cursor:"pointer"}}>
                + Dopisz pomiar z innego dnia
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tracker */}
      {bmiTab==="tracker"&&(
        <div style={{display:"grid",gap:16,alignItems:"start",
          gridTemplateColumns:isWide?"minmax(260px,320px) minmax(300px,1fr) minmax(290px,370px)":"1fr"}}>

          {/* lewa kolumna — postęp dnia. Na telefonie idzie za produktami:
              pierwszy ekran licznika ma pokazywać przycisk dodawania, nie 500 px pierścieni. */}
          <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:16,order:isWide?0:2,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"#ccc"}}>Postęp dnia</div>
            <NutrientRings totals={totToday} targets={serverProfile?.targets}/>
          </div>

          {/* środkowa kolumna — produkty dnia */}
          <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:16,minWidth:0}}>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6,flex:"1 1 auto",justifyContent:isMobile?"space-between":"flex-start"}}>
                <button onClick={()=>{const d=new Date(calDate+"T00:00:00");d.setDate(d.getDate()-1);setCalDate(toISO(d));}} style={{background:"#222",border:"none",borderRadius:8,color:"#aaa",cursor:"pointer",fontSize:16,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>‹</button>
                <div style={{textAlign:"center",minWidth:118}}>
                  <div style={{fontWeight:700,fontSize:15,textTransform:"capitalize"}}>{(()=>{const t=today();if(calDate===t)return"Dzisiaj";const y=new Date();y.setDate(y.getDate()-1);if(calDate===toISO(y))return"Wczoraj";return new Date(calDate+"T00:00:00").toLocaleDateString("pl-PL",{weekday:"short",day:"numeric",month:"short"});})()}</div>
                  <div style={{fontSize:11,color:INK.soft}}>{dayGroups.length} produktów{todayEntries.length!==dayGroups.length?` · ${todayEntries.length} wpisów`:""}</div>
                </div>
                <button onClick={()=>{if(calDate>=today())return;const d=new Date(calDate+"T00:00:00");d.setDate(d.getDate()+1);setCalDate(toISO(d));}} disabled={calDate>=today()} style={{background:calDate>=today()?"#161616":"#222",border:"none",borderRadius:8,color:calDate>=today()?INK.faint:"#aaa",cursor:calDate>=today()?"default":"pointer",fontSize:16,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>›</button>
              </div>
              <button onClick={()=>setModal(true)} style={{background:"linear-gradient(135deg,#667eea,#764ba2)",color:"#fff",border:"none",borderRadius:10,padding:isMobile?"11px 16px":"8px 16px",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0,width:isMobile?"100%":"auto"}}>➕ Dodaj produkt</button>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="date" value={calDate} max={today()} onChange={e=>e.target.value&&setCalDate(e.target.value)} style={{background:"#0a0a0a",border:"1px solid #333",borderRadius:8,padding:"6px 10px",color:"#fff",fontSize:12,colorScheme:"dark",outline:"none"}}/>
              {calDate!==today()&&<button onClick={()=>setCalDate(today())} style={{background:"#222",border:"1px solid #444",borderRadius:8,color:"#aaa",fontSize:12,padding:"6px 12px",cursor:"pointer"}}>↩ Wróć do dziś</button>}
            </div>
          </div>
            {dayLoading&&todayEntries.length===0&&(
              <div style={{textAlign:"center",padding:"36px 0",color:INK.muted,fontSize:13}}>Ładowanie…</div>
            )}
            {!dayLoading&&todayEntries.length===0&&(
              <div style={{textAlign:"center",padding:"36px 0",color:INK.muted}}>
                <div style={{fontSize:30,marginBottom:10}}>🍽️</div>
                <div style={{fontSize:13}}>Brak produktów tego dnia.</div>
              </div>
            )}
            {todayEntries.length>0&&(
              <div style={{marginTop:12,borderTop:"1px solid #1e1e1e",paddingTop:12}}>
                {dayGroups.map((g,gi)=>{
                  const multi=g.entries.length>1;
                  const open=!!openGroups[g.key];
                  return(
                    <div key={g.key} style={{padding:"7px 0",borderBottom:gi<dayGroups.length-1?"1px solid #1a1a1a":"none"}}>
                      {/* flexWrap: przy „Na pewno?" albo edycji gramatury akcje
                          schodzą do drugiego wiersza zamiast wypychać kartę poza ekran */}
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                        <div style={{flex:"1 1 110px",minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</span>
                            {multi&&(
                              <button onClick={()=>setOpenGroups(o=>({...o,[g.key]:!o[g.key]}))}
                                title={open?"Zwiń wpisy":"Pokaż pojedyncze wpisy"}
                                style={{flexShrink:0,background:"#222",border:"1px solid #333",borderRadius:20,color:"#999",
                                  cursor:"pointer",fontSize:10,fontWeight:700,padding:"1px 7px"}}>
                                ×{g.entries.length} {open?"▾":"▸"}
                              </button>
                            )}
                          </div>
                          <div style={{fontSize:11,color:INK.muted}}>{n1(g.grams)}g · T:{n1(g.fatG)}g W:{n1(g.carbsG)}g B:{n1(g.proteinG)}g Bł:{n1(g.fiberG)}g Sól:{n1(g.saltG)}g</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:"auto"}}>
                          <span style={{fontSize:14,fontWeight:700,color:NUTRIENT.kcal}}>{Math.round(g.kcal)} kcal</span>
                          {!multi&&entryActions(g.entries[0])}
                        </div>
                      </div>
                      {multi&&open&&(
                        <div style={{marginTop:6,paddingLeft:10,borderLeft:"2px solid #222"}}>
                          {g.entries.map(e=>(
                            <div key={e.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"5px 0",flexWrap:"wrap"}}>
                              <div style={{fontSize:11,color:INK.soft,flex:"1 1 100px",minWidth:0}}>
                                {n1(e.grams)}g · T:{n1(e.fatG)}g W:{n1(e.carbsG)}g B:{n1(e.proteinG)}g
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:"auto"}}>
                                <span style={{fontSize:12,fontWeight:700,color:NUTRIENT.kcal}}>{Math.round(e.kcal)} kcal</span>
                                {entryActions(e)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* prawa kolumna — historia */}
          <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:16,order:isWide?0:3,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#ccc"}}>📅 Historia kalorii</div>
            <CalYearView calLogs={dailyTotals} tdee={tdee} onYear={ensureYear} onPickDay={d=>{if(d<=today())setCalDate(d);}}/>
          </div>
        </div>
      )}
    </div>
    {modal&&(
      <div role="dialog" aria-modal="true" aria-label="Dodaj produkt" tabIndex={-1}
        style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:999,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:20}}
        onClick={e=>{if(e.target===e.currentTarget)closeModal();}}>
        {/* na telefonie panel dolny, na desktopie wyśrodkowane okno */}
        <div style={{background:"#161616",borderRadius:isMobile?"20px 20px 0 0":16,padding:isMobile?"20px 16px calc(20px + env(safe-area-inset-bottom))":24,width:"100%",maxWidth:600,maxHeight:isMobile?"88vh":"85vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(0,0,0,.4)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={{margin:0,fontSize:17,fontWeight:700}}>Dodaj produkt</h3>
            <button onClick={closeModal} aria-label="Zamknij" style={{background:"#222",border:"none",borderRadius:8,color:"#aaa",fontSize:18,cursor:"pointer",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
          {/* Baner błędu strony leży pod przyciemnionym tłem — tu musi być własny,
              inaczej nieudany import z OFF czy zapis produktu wyglądają na „nic". */}
          {error&&(
            <div style={{background:"#2a0f0f",border:"1px solid #6b2020",borderRadius:10,padding:"9px 12px",marginBottom:12,
              color:"#f87171",fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
              <span>{error}</span>
              <button onClick={()=>setError("")} aria-label="Zamknij" style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:16,flexShrink:0}}>✕</button>
            </div>
          )}
          <div style={{display:"flex",gap:4,background:"#0a0a0a",borderRadius:10,padding:3,marginBottom:10}}>
            {[[false,"📦 Baza lokalna"],[true,"🌍 Open Food Facts"]].map(([online,label])=>(
              <button key={label} onClick={()=>{setSelFood(null);setOffInfo(null);setOffResults(online?[]:null);}}
                style={{flex:1,background:(offResults!==null)===online?"#2a2a2a":"transparent",border:"none",borderRadius:8,padding:"7px",
                  color:(offResults!==null)===online?"#fff":INK.soft,fontWeight:600,cursor:"pointer",fontSize:12}}>{label}</button>
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
                  style={{background:offQuery.trim().length>1?"#667eea":"#222",color:offQuery.trim().length>1?"#fff":INK.muted,
                    border:"none",borderRadius:10,padding:"0 16px",fontWeight:700,fontSize:13,flexShrink:0,
                    cursor:offQuery.trim().length>1?"pointer":"not-allowed"}}>
                  {offLoading?"⏳":"Szukaj"}
                </button>
              </div>
              <div style={{fontSize:11,color:INK.muted,lineHeight:1.5}}>
                Dane z bazy Open Food Facts. Wybrany produkt trafia na stałe do Twojego katalogu,
                więc kolejnym razem znajdziesz go już lokalnie.
              </div>
              {/* Open Food Facts zwraca wszystko, co pasuje do któregokolwiek słowa —
                  serwer zostawia tylko trafienia w co najmniej dwa. Bez tej linijki
                  krótsza lista wyglądałaby jak pusta baza. */}
              {offInfo&&offInfo.dropped>0&&(
                <div style={{fontSize:11,color:INK.soft,lineHeight:1.5,marginTop:4}}>
                  Pasować musi {offInfo.need===1?"co najmniej 1 słowo":"co najmniej 2 słowa"} z zapytania.
                  Odrzuconych luźnych trafień: {offInfo.dropped}.
                </div>
              )}
            </div>
          ):(
            <>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Szukaj produktu…"
            style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1px solid #333",background:"#0a0a0a",color:"#fff",fontSize:14,marginBottom:10,boxSizing:"border-box",outline:"none"}}/>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:10}}>
            {["Wszystkie",...foodCats.map(c=>c.category)].map(cat=>(
              <button key={cat} onClick={()=>setSelCat(cat)} style={{whiteSpace:"nowrap",padding:"5px 10px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:selCat===cat?"#667eea":"#222",color:selCat===cat?"#fff":INK.soft}}>{cat.replace(/^.\s/,"")}</button>
            ))}
          </div>
            </>
          )}
          <button onClick={()=>showCustomForm?closeCustomForm():setShowCustomForm(true)} style={{width:"100%",padding:"9px",borderRadius:10,border:`2px dashed ${showCustomForm?"#ef4444":"#667eea"}`,background:"transparent",color:showCustomForm?"#ef4444":"#667eea",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:10}}>
            {showCustomForm?"❌ Anuluj":"➕ Dodaj własny produkt"}
          </button>
          {showCustomForm&&(
            <div style={{background:"#0a0a0a",borderRadius:12,padding:14,marginBottom:12,border:"1px solid #2a2a2a"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#c084fc",marginBottom:2}}>{editFoodId?"Edycja własnego produktu (na 100g)":"Własny produkt (na 100g)"}</div>
              <div style={{fontSize:11,color:INK.soft,marginBottom:10}}>
                {editFoodId
                  ?"Zmiana dotyczy katalogu. Wpisy już dodane do dziennika zostają z wartościami z chwili dodania."
                  :"Wymagane są nazwa i kalorie. Puste pole składnika liczy się jako zero."}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8}}>
                <input placeholder="Nazwa" value={customForm.name} onChange={e=>setCustomForm(f=>({...f,name:e.target.value}))}
                  style={{gridColumn:"1/-1",padding:"8px 12px",borderRadius:8,border:"1px solid #333",background:"#161616",color:"#fff",fontSize:13,outline:"none"}}/>
                {[["Kalorie (kcal)","cal",NUTRIENT.kcal],["Białko (g)","p",NUTRIENT.protein],
                  ["Węglowodany (g)","c",NUTRIENT.carbs],["Tłuszcze (g)","f",NUTRIENT.fat],
                  ["Błonnik (g)","fb",NUTRIENT.fiber],["Sól (g)","s",NUTRIENT.salt]].map(([label,key,color])=>(
                  <input key={key} type="number" step="any" inputMode="decimal" placeholder={label} value={customForm[key]}
                    onChange={e=>setCustomForm(f=>({...f,[key]:e.target.value}))}
                    style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${customForm[key]!==""?color+"66":"#333"}`,background:"#161616",color:"#fff",fontSize:13,outline:"none"}}/>
                ))}
              </div>
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button onClick={saveCustomFood} disabled={!customForm.name.trim()||customForm.cal===""}
                  style={{flex:1,padding:"9px",borderRadius:8,border:"none",
                    background:customForm.name&&customForm.cal!==""?"#c084fc":"#333",
                    color:customForm.name&&customForm.cal!==""?"#000":INK.soft,fontWeight:700,fontSize:13,
                    cursor:customForm.name&&customForm.cal!==""?"pointer":"not-allowed"}}>
                  {editFoodId?"💾 Zapisz zmiany":"✅ Zapisz"}
                </button>
                {editFoodId&&(
                  <button onClick={closeCustomForm} style={{background:"#222",border:"1px solid #444",borderRadius:8,color:"#aaa",padding:"9px 16px",fontSize:13,cursor:"pointer"}}>Anuluj</button>
                )}
              </div>
            </div>
          )}
          <div style={{maxHeight:220,overflowY:"auto",border:"1px solid #2a2a2a",borderRadius:10,marginBottom:14}}>
            {offLoading&&<div style={{padding:20,textAlign:"center",color:"#667eea"}}>⏳ Pytam Open Food Facts…</div>}
            {!offLoading&&filtered.length===0&&(
              <div style={{padding:20,textAlign:"center",color:INK.muted}}>
                {offResults!==null?(offQuery?"Brak wyników w Open Food Facts":"Wpisz nazwę i kliknij Szukaj"):"Brak wyników"}
              </div>
            )}
            {filtered.map(f=>(
              <div key={f.offCode||f.id} {...kb(()=>setSelFood(f))} aria-pressed={!!selFood&&(selFood.offCode||selFood.id)===(f.offCode||f.id)} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid #1a1a1a",background:selFood&&(selFood.offCode||selFood.id)===(f.offCode||f.id)?"#1a1030":"transparent",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                    {f.name}
                    {f.source==="custom"&&<span style={{fontSize:10,background:"#c084fc",color:"#000",padding:"1px 5px",borderRadius:4,fontWeight:700}}>WŁASNY</span>}
                  </div>
                  <div style={{fontSize:11,color:INK.muted}}>{f.category}</div>
                </div>
                <div style={{textAlign:"right",fontSize:11,display:"flex",alignItems:"center",gap:8}}>
                  <div><div style={{fontWeight:700,color:NUTRIENT.kcal}}>{f.kcal} kcal</div><div style={{color:INK.muted}}>B:{f.proteinG}g W:{f.carbsG}g T:{f.fatG}g</div></div>
                  {f.source==="custom"&&<IconBtn onClick={()=>startEditFood(f)} title="Edytuj produkt" bg={editFoodId===f.id?"#2a1a3a":"#1c2030"} border={editFoodId===f.id?"#c084fc":"#2f3550"} color={editFoodId===f.id?"#c084fc":"#8fa6e8"}>✎</IconBtn>}
                  {f.source==="custom"&&<DeleteBtn onDelete={()=>deleteCustomFood(f.id)} title="Usuń produkt"/>}
                </div>
              </div>
            ))}
          </div>
          {selFood&&(
            <div style={{background:"#0a0a0a",borderRadius:12,padding:12,marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <label style={{fontSize:13,fontWeight:600,color:"#888",whiteSpace:"nowrap"}}>Ilość (g):</label>
                <input type="number" value={grams} min={0} step="any" inputMode="decimal"
                  onChange={e=>setGrams(e.target.value)}
                  style={{width:90,padding:"7px 10px",borderRadius:8,border:`1px solid ${grams!==""&&!(gramsNum>0)?"#6b2020":"#333"}`,background:"#161616",color:"#fff",fontSize:14,outline:"none"}}/>
                {!(gramsNum>0)&&<span style={{fontSize:11,color:INK.soft}}>Wpisz ilość większą od zera</span>}
              </div>
              <div style={{display:"flex",gap:8}}>
                {[["Kcal",Math.round(selFood.kcal*gramsNum/100),NUTRIENT.kcal],["B",(selFood.proteinG*gramsNum/100).toFixed(1)+"g",NUTRIENT.protein],["W",(selFood.carbsG*gramsNum/100).toFixed(1)+"g",NUTRIENT.carbs],["T",(selFood.fatG*gramsNum/100).toFixed(1)+"g",NUTRIENT.fat]].map(([k,v,c])=>(
                  <div key={k} style={{flex:1,textAlign:"center",background:"#161616",borderRadius:8,padding:"8px 4px"}}>
                    <div style={{fontSize:15,fontWeight:800,color:c}}>{v}</div>
                    <div style={{fontSize:10,color:INK.muted}}>{k}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={addFood} disabled={!selFood||!(gramsNum>0)} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:selFood&&gramsNum>0?"linear-gradient(135deg,#667eea,#764ba2)":"#222",color:selFood&&gramsNum>0?"#fff":INK.muted,fontWeight:700,fontSize:15,cursor:selFood&&gramsNum>0?"pointer":"not-allowed"}}>
            ✅ Dodaj produkt
          </button>
        </div>
      </div>
    )}
  </>);
}
