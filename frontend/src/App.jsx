import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api.js";
import { STATE_MAP } from "./stability.js";
import { MOBILE, NARROW, WIDE, XWIDE, useMedia, CATEGORIES, FONT, INK, toISO, today, getLast7, getBMILabel, bfColor, plDate } from "./lib/ui.js";
import { LoginScreen } from "./components/LoginScreen.jsx";
import { AppContext } from "./lib/appContext.js";
import { TABS, useRoute, calPath } from "./lib/router.js";
import HabitsTab from "./tabs/Habits.jsx";
import CaloriesTab from "./tabs/Calories.jsx";
import StabilityTab from "./tabs/Stability.jsx";
import { MuscleMap } from "./tabs/Muscles.jsx";

// ── MAIN ──────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile=useMedia(MOBILE);
  const isNarrow=useMedia(NARROW);
  const isWide=useMedia(WIDE);
  const isXWide=useMedia(XWIDE);
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
  const [loginNotice,setLoginNotice]=useState("");
  const [authChecked,setAuthChecked]=useState(false);
  const [profile,setProfile]=useState({weight:"",height:"",age:"",sex:"M",activity:1,neck:"",waist:"",hips:""});
  // Serwer → pola formularza. Używane przy starcie i po każdym pomiarze z dzisiaj,
  // bo ten przepisuje się do profilu — formularz obok musi to zobaczyć, inaczej
  // kolejne „Oblicz" nadpisałoby pomiar starą wagą.
  const profileToForm=p=>({
    weight:p.weightKg??"",height:p.heightCm??"",age:p.ageYears??"",
    sex:p.sex||"M",activity:p.activity??1,
    neck:p.neckCm??"",waist:p.waistCm??"",hips:p.hipsCm??"",
  });
  const [serverProfile,setServerProfile]=useState(null);
  const [offQuery,setOffQuery]=useState("");
  const [offResults,setOffResults]=useState(null);   // null = tryb bazy lokalnej
  const [offInfo,setOffInfo]=useState(null);         // { dropped, need } z ostatniego wyszukiwania
  const [offLoading,setOffLoading]=useState(false);
  const [calDate,setCalDate]=useState(today());
  const [modal,setModal]=useState(false);
  const [search,setSearch]=useState("");
  const [selCat,setSelCat]=useState("Wszystkie");
  // Gramatura trzymana jako tekst, nie liczba: inaczej wyczyszczenie pola
  // natychmiast wskakiwało na 1 i nie dawało się wpisać wartości od początku.
  const [grams,setGrams]=useState("100");
  // "" i "abc" → 0; wtedy dodawanie jest zablokowane zamiast wysyłać śmieć.
  const gramsNum=Number(grams)||0;
  const [selFood,setSelFood]=useState(null);
  const [editGramsId,setEditGramsId]=useState(null);
  const [editGramsVal,setEditGramsVal]=useState("");
  const [openGroups,setOpenGroups]=useState({});
  const [showCustomForm,setShowCustomForm]=useState(false);
  const [editFoodId,setEditFoodId]=useState(null);
  const [measurements,setMeasurements]=useState([]);
  const [chartMetric,setChartMetric]=useState("weightKg");
  const [showMeasForm,setShowMeasForm]=useState(false);
  const [measForm,setMeasForm]=useState({day:"",weight:"",neck:"",waist:"",hips:""});
  const [customForm,setCustomForm]=useState({name:"",cal:"",p:"",c:"",f:"",fb:"",s:""});

  // Zakładka i podzakładka wynikają z adresu; "/" idzie na stabilizację —
  // aplikacja pyta „jak jest", zanim pokaże listy.
  const { navigate, route }=useRoute();
  const mainTab=route.tab||"stabilizacja";
  const setMainTab=k=>navigate(TABS.find(t=>t.key===k)?.path||"/stabilizacja");

  // ── STABILIZACJA ──
  const [principles,setPrinciples]=useState([]);
  const [principleOffset,setPrincipleOffset]=useState(0);
  const [showPrinciples,setShowPrinciples]=useState(false);
  const [principleForm,setPrincipleForm]=useState(null);   // null = zamknięty; {id?,text,source,states,note}
  const [checkins,setCheckins]=useState([]);
  const [ciState,setCiState]=useState(null);
  const [ciIntensity,setCiIntensity]=useState(3);
  const [ciNote,setCiNote]=useState("");
  const [techUses,setTechUses]=useState({});                // key → {count,lastAt}
  const [techExpanded,setTechExpanded]=useState({});
  const [showAllTech,setShowAllTech]=useState(false);
  const [kotwice,setKotwice]=useState([]);
  const [kotwicaInput,setKotwicaInput]=useState("");
  const [kotwicaEmoji,setKotwicaEmoji]=useState("🎵");

  const addKotwica=()=>run(async()=>{
    if(!kotwicaInput.trim())return;
    const a=await api.addAnchor({emoji:kotwicaEmoji,label:kotwicaInput.trim()});
    setKotwice(k=>[...k,a]);setKotwicaInput("");
  });
  const delKotwica=id=>run(async()=>{
    await api.deleteAnchor(id);
    setKotwice(k=>k.filter(x=>x.id!==id));
  });

  // ── Historia pomiarów ──
  const addMeasurement=()=>run(async()=>{
    const {day,weight,neck,waist,hips}=measForm;
    if(!day)return;
    await api.addMeasurement({day,weightKg:weight,neckCm:neck,waistCm:waist,hipsCm:hips});
    setMeasurements(await api.measurements());
    // Pomiar z dzisiaj serwer przepisuje też do profilu — dociągamy go, żeby
    // formularz obok nie pokazywał starych liczb.
    if(day===today()){const p=await api.profile();setServerProfile(p);setProfile(profileToForm(p));}
    setMeasForm({day:"",weight:"",neck:"",waist:"",hips:""});setShowMeasForm(false);
  });
  const deleteMeasurement=id=>run(async()=>{
    await api.deleteMeasurement(id);
    setMeasurements(m=>m.filter(x=>x.id!==id));
  });

  // ── Lista niewolnika ──
  const addAvoid=()=>run(async()=>{
    if(!avoidName.trim())return;
    const it=await api.addAvoid({name:avoidName.trim(),note:avoidNote.trim()});
    setAvoidItems(l=>[...l,it]);
    setAvoidName("");setAvoidNote("");setShowAvoidForm(false);
  });
  const startEditAvoid=it=>{
    setEditAvoidId(it.id);setEditAvoidVal(it.name);setEditAvoidNote(it.note||"");
  };
  const saveAvoid=id=>run(async()=>{
    if(!editAvoidVal.trim()){setEditAvoidId(null);return;}
    // Notatkę wysyłamy zawsze — wyczyszczone pole ma ją skasować, a nie zostawić.
    const it=await api.patchAvoid(id,{name:editAvoidVal.trim(),note:editAvoidNote.trim()});
    setAvoidItems(l=>l.map(x=>x.id===id?it:x));
    setEditAvoidId(null);
  });
  const deleteAvoid=id=>run(async()=>{
    await api.deleteAvoid(id);
    setAvoidItems(l=>l.filter(x=>x.id!==id));
  });

  // Zasady
  const savePrinciple=()=>run(async()=>{
    const f=principleForm;
    if(!f||!f.text.trim())return;
    const body={text:f.text.trim(),source:f.source.trim(),states:f.states,note:f.note.trim()};
    if(f.id){const p=await api.patchPrinciple(f.id,body);setPrinciples(l=>l.map(x=>x.id===f.id?p:x));}
    else{const p=await api.addPrinciple(body);setPrinciples(l=>[...l,p]);}
    setPrincipleForm(null);
  });
  const deletePrinciple=id=>run(async()=>{
    await api.deletePrinciple(id);
    setPrinciples(l=>l.filter(x=>x.id!==id));
    if(principleForm?.id===id)setPrincipleForm(null);
  });
  const seedPrinciples=()=>run(async()=>setPrinciples(await api.seedPrinciples()));
  const editPrinciple=p=>setPrincipleForm(p
    ?{id:p.id,text:p.text,source:p.source||"",states:p.states||[],note:p.note||""}
    :{text:"",source:"",states:[],note:""});

  // Check-iny
  const reloadCheckins=async()=>setCheckins(await api.checkins(14));
  const [ciSaved,setCiSaved]=useState("");
  const addCheckin=()=>run(async()=>{
    if(!ciState)return;
    const st=STATE_MAP[ciState];
    await api.addCheckin({state:ciState,intensity:ciIntensity,note:ciNote.trim()});
    // Domknięcie: formularz się zwija, a w miejscu podpowiedzi stoi potwierdzenie.
    // Techniki i tak biorą stan z ostatniego check-inu, nie z zaznaczenia.
    setCiNote("");setShowAllTech(false);setCiState(null);
    setCiSaved(`Zapisano · ${st.icon} ${st.label.toLowerCase()} ${ciIntensity}/5`);
    setTimeout(()=>setCiSaved(""),5000);
    await reloadCheckins();
  });
  const deleteCheckin=id=>run(async()=>{
    await api.deleteCheckin(id);
    setCheckins(l=>l.filter(x=>x.id!==id));
  });
  // Ostatni check-in steruje resztą strony: technikami i wyborem zasady.
  const lastCheckin=checkins.length?checkins[checkins.length-1]:null;
  const todayCheckins=checkins.filter(c=>plDate(c.at)===plDate(today()));
  const currentState=ciState||lastCheckin?.state||null;

  // Użycia technik
  const reloadUses=async()=>{
    const rows=await api.techniqueUses(30);
    setTechUses(Object.fromEntries(rows.map(r=>[r.technique,r])));
  };
  const useTechnique=key=>run(async()=>{
    await api.addTechniqueUse(key);
    await reloadUses();
  });

  const [expandedHabit,setExpandedHabit]=useState({});
  const [avoidItems,setAvoidItems]=useState([]);
  // Plany treningowe — wiersze z API: { id, name, data } gdzie `data` to plan
  // w formacie sledzik-plan/1. Edytor zwraca wynik zamiast używać `run`, bo
  // błąd zapisu ma pokazać się w otwartym edytorze, nie w banerze pod nim.
  const [plans,setPlans]=useState([]);
  const savePlan=async(plan,id)=>{
    try{
      const row=id?await api.updatePlan(id,plan):await api.addPlan(plan);
      setPlans(l=>id?l.map(p=>p.id===id?row:p):[...l,row]);
      return {ok:true,row};
    }catch(e){
      if(e.status===401){setLoginNotice("Sesja wygasła — zaloguj się ponownie.");setUser(null);}
      return {ok:false,error:e.message};
    }
  };
  const deletePlan=id=>run(async()=>{
    await api.deletePlan(id);
    setPlans(l=>l.filter(p=>p.id!==id));
  });
  // Dziennik pozycji planu: `today` to stan z dzisiejszej daty (odhaczenie +
  // zanotowany ciężar), `last` — ostatni ciężar sprzed dzisiaj, czyli punkt
  // odniesienia na ten trening. Klucz: „plan|rodzaj|dzień|pozycja"; rodzaj,
  // bo ćwiczenia i warianty cardio numerowane są osobno.
  const [exLog,setExLog]=useState({today:{},last:{}});
  const exKey=(planId,kind,dayKey,i)=>`${planId}|${kind}|${dayKey}|${i}`;
  const exToMap=rows=>Object.fromEntries((rows||[]).map(r=>[exKey(r.planId,r.kind,r.dayKey,r.exIndex),r]));
  const exEntry=(planId,kind,dayKey,i)=>exLog.today[exKey(planId,kind,dayKey,i)]||null;
  const exLast=(planId,kind,dayKey,i)=>exLog.last[exKey(planId,kind,dayKey,i)]||null;
  // patch to { done } albo { maxLoad } — resztę dobieramy z obecnego stanu,
  // bo serwer przyjmuje całe ustawienie pozycji, nie zmianę jednego pola.
  const saveEx=(planId,kind,dayKey,i,name,patch)=>run(async()=>{
    const key=exKey(planId,kind,dayKey,i);
    const prev=exLog.today[key]||{done:false,maxLoad:null};
    const next={...prev,...patch};
    // Pozycja bez odhaczenia i bez ciężaru nie ma czego pamiętać — serwer
    // kasuje wtedy wiersz, więc i tutaj znika z mapy.
    const put=e=>setExLog(l=>{const t={...l.today};if(e.done||e.maxLoad!=null)t[key]={...e};else delete t[key];return {...l,today:t};});
    put(next);
    try{
      await api.setPlanLog({planId,dayKey,kind,exIndex:i,exName:name,date:today(),done:!!next.done,maxLoad:next.maxLoad});
    }catch(e){
      put(prev);   // cofamy optymistyczną zmianę
      throw e;
    }
  });
  const [avoidName,setAvoidName]=useState("");
  const [avoidNote,setAvoidNote]=useState("");
  const [showAvoidForm,setShowAvoidForm]=useState(false);
  const [editAvoidId,setEditAvoidId]=useState(null);
  const [editAvoidVal,setEditAvoidVal]=useState("");
  const [editAvoidNote,setEditAvoidNote]=useState("");
  // /kalorie bez podstrony: licznik, jeśli BMI już policzone — inaczej profil.
  const bmiTab=route.sub||(serverProfile?.bmi?"tracker":"bmi");
  const setBmiTab=k=>navigate(calPath(k));
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
    loadedYears.current=new Set([year-1,year]);
  };

  // Odhaczenia trzymamy jako mapę "<idNawyku>_<data>" — taki kształt jest
  // wygodny dla widoków miesiąca i roku, które sięgają po konkretny dzień.
  const logsToMap=rows=>Object.fromEntries(rows.map(r=>[`${r.habitId}_${r.day}`,true]));

  // Lata trzymane w pamięci. Od startu bieżący i poprzedni — bez poprzedniego
  // 1–6 stycznia seria i „% w tygodniu" sięgały w grudzień, którego nie było,
  // i spadały do zera. Kolejne lata dociąga nawigacja ‹ w widoku roku.
  const loadedYears=useRef(new Set([year-1,year]));
  const yearSpan=()=>{const ys=[...loadedYears.current];return [Math.min(...ys),Math.max(...ys)];};

  const reloadLogs=useCallback(async()=>{
    const [from,to]=yearSpan();
    const rows=await api.logs(`${from}-01-01`,`${to}-12-31`);
    setHabitLogs(logsToMap(rows));
  },[year]);

  const reloadFoods=useCallback(async()=>{
    setFoods(await api.foods({}));
  },[]);

  const reloadDay=useCallback(async(day)=>{
    setDayEntries(await api.meals(day));
  },[]);

  const reloadTotals=useCallback(async()=>{
    const all=await Promise.all([...loadedYears.current].map(y=>api.dailyTotals(y)));
    setDailyTotals(Object.fromEntries(all.flat().map(r=>[r.day,Math.round(r.kcal)])));
  },[year]);

  // Widok roku poszedł w rok, którego jeszcze nie ma w pamięci.
  const ensureYear=useCallback(async y=>{
    if(loadedYears.current.has(y))return;
    loadedYears.current.add(y);
    await Promise.all([reloadLogs(),reloadTotals()]);
  },[reloadLogs,reloadTotals]);

  useEffect(()=>{
    if(!user)return;
    (async()=>{
      try{
        const [h,p,f,c,a,av,ms,pr,ci,tu,pl,xl]=await Promise.all([
          api.habits(),api.profile(),api.foods({}),api.foodCategories(),api.anchors(),api.avoid(),
          api.measurements(),api.principles(),api.checkins(14),api.techniqueUses(30),api.plans(),
          api.planLog(today()),
        ]);
        setHabits(h);setServerProfile(p);setFoods(f);setFoodCats(c);setKotwice(a);setAvoidItems(av);setPlans(pl);
        setExLog({today:exToMap(xl.today),last:exToMap(xl.last)});
        setMeasurements(ms);setPrinciples(pr);setCheckins(ci);
        setTechUses(Object.fromEntries(tu.map(r=>[r.technique,r])));
        setProfile(profileToForm(p));
        await Promise.all([reloadLogs(),reloadTotals(),reloadDay(calDate)]);
      }catch(e){
        setError(e.message);
      }
      setLoading(false);
    })();
  },[user,reloadLogs,reloadTotals,reloadDay]);

  // Zmiana wybranego dnia dociąga tylko ten dzień, zamiast trzymać w pamięci
  // cały dziennik — sumy roczne przychodzą osobno, policzone w SQL.
  const [dayLoading,setDayLoading]=useState(false);
  useEffect(()=>{
    if(user&&!loading){
      setDayLoading(true);
      reloadDay(calDate).catch(e=>setError(e.message)).finally(()=>setDayLoading(false));
    }
    // Edycja dotyczy konkretnego wpisu — po zmianie dnia nie ma czego edytować.
    setEditGramsId(null);
  },[calDate,user]);

  // `savingRef` zamiast samego stanu: stan aktualizuje się po renderze, więc dwa
  // szybkie tapnięcia „Zapisz" zdążyły wysłać dwa żądania i zrobić duplikat.
  const savingRef=useRef(false);
  const run=async fn=>{
    if(savingRef.current)return;
    savingRef.current=true;setSaving(true);setError("");
    try{ await fn(); }
    catch(e){
      // Wygasła sesja to nie błąd do banera — to powrót do logowania z wyjaśnieniem.
      if(e.status===401){setLoginNotice("Sesja wygasła — zaloguj się ponownie.");setUser(null);}
      else setError(e.message);
    }
    finally{ savingRef.current=false;setSaving(false); }
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
  // Seria „do utrzymania": jeśli dziś jeszcze nie odhaczone, liczy się od wczoraj.
  // Wcześniej 30-dniowa seria znikała o północy i wracała po odhaczeniu —
  // bodziec dokładnie odwrotny do zamierzonego.
  const getStreak=id=>{
    const d=new Date();
    if(!habitLogs[`${id}_${toISO(d)}`])d.setDate(d.getDate()-1);
    let s=0;
    while(habitLogs[`${id}_${toISO(d)}`]){s++;d.setDate(d.getDate()-1);}
    return s;
  };
  const getWeeklyRate=id=>{const d=getLast7();return Math.round((d.filter(x=>habitLogs[`${id}_${x}`]).length/7)*100);};
  const getView=id=>progressView[id]||"7dni";
  const setView=(id,v)=>setProgressView(p=>({...p,[id]:v}));
  // Nawyk z nieznaną kategorią trafia do pierwszego kafla — nie ma własnego
  // koloru, więc dostaje kolor tego kafla.
  const habitsByCat=Object.fromEntries(CATEGORIES.map(c=>[c.label,[]]));
  const sortedHabits=[...habits].sort((a,b)=>{
    const at=a.reminderTime,bt=b.reminderTime;
    if(!at&&!bt)return 0;if(!at)return 1;if(!bt)return-1;return at.localeCompare(bt);
  });
  for(const h of sortedHabits)(habitsByCat[h.category]||habitsByCat[CATEGORIES[0].label]).push(h);

  // ── Profil ──
  const calcAll=()=>run(async()=>{
    const {weight:w,height:h,age,sex,activity,neck,waist,hips}=profile;
    if(!w||!h||!age)return;
    const p=await api.saveProfile({
      weightKg:+w,heightCm:+h,ageYears:+age,sex,activity:+activity,
      // Puste pole zostaje puste — serwer traktuje "" jako brak pomiaru
      // i po prostu nie liczy z niego tkanki tłuszczowej. Biodra zapisujemy
      // także dla mężczyzn: pole jest wtedy ukryte, ale wpisana wcześniej
      // wartość nie znika przy zmianie płci w formularzu.
      neckCm:neck,waistCm:waist,hipsCm:hips,
    });
    setServerProfile(p);
    setMeasurements(await api.measurements());
  });

  const todayStr=today();
  const todayEntries=dayEntries;
  // Ten sam produkt dopisany kilka razy w ciągu dnia pokazuje się jako jedna
  // pozycja z sumą. Wpisy zostają osobnymi wierszami w bazie — grupujemy
  // dopiero przy wyświetlaniu, więc każdy da się nadal poprawić i skasować.
  const dayGroups=(()=>{
    const map=new Map();
    for(const e of todayEntries){
      // Produkt usunięty z katalogu ma foodId = null; wtedy łączy nazwa.
      const key=e.foodId!=null?`f:${e.foodId}`:`n:${e.name}`;
      const g=map.get(key);
      if(g){
        g.entries.push(e);
        for(const k of ["grams","kcal","proteinG","carbsG","fatG","fiberG","saltG"])g[k]+=e[k];
      }else{
        map.set(key,{key,name:e.name,entries:[e],
          grams:e.grams,kcal:e.kcal,proteinG:e.proteinG,carbsG:e.carbsG,
          fatG:e.fatG,fiberG:e.fiberG,saltG:e.saltG});
      }
    }
    return [...map.values()];
  })();
  const n1=v=>Math.round(v*10)/10;
  const totToday=todayEntries.reduce((a,e)=>({
    cal:a.cal+e.kcal,p:a.p+e.proteinG,c:a.c+e.carbsG,
    f:a.f+e.fatG,fb:a.fb+e.fiberG,s:a.s+e.saltG,
  }),{cal:0,p:0,c:0,f:0,fb:0,s:0});
  const tdee=serverProfile?.tdee??null;
  const bmiVal=serverProfile?.bmi??null;

  // ── Posiłki ──
  const addFood=()=>run(async()=>{
    if(!selFood||!(gramsNum>0))return;
    const ratio=gramsNum/100;
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
      day:calDate,foodId,name:selFood.name,grams:gramsNum,
      kcal:Math.round(selFood.kcal*ratio),
      proteinG:r1(selFood.proteinG),carbsG:r1(selFood.carbsG),
      fatG:r1(selFood.fatG),fiberG:r1(selFood.fiberG),saltG:r1(selFood.saltG),
    });
    await Promise.all([reloadDay(calDate),reloadTotals()]);
    setModal(false);setSelFood(null);setSearch("");setGrams("100");setOffResults(null);setOffQuery("");closeCustomForm();
  });
  const removeEntry=id=>run(async()=>{
    await api.deleteMeal(id);
    await Promise.all([reloadDay(calDate),reloadTotals()]);
  });
  const saveGrams=id=>run(async()=>{
    const g=Number(editGramsVal);
    if(!(g>0))return;
    // Serwer przeskalowuje wartości odżywcze sam — przeglądarka wysyła samą
    // gramaturę i przyjmuje to, co wróci.
    await api.updateMeal(id,{grams:g});
    setEditGramsId(null);setEditGramsVal("");
    await Promise.all([reloadDay(calDate),reloadTotals()]);
  });
  // Kafel pojedynczego nawyku wewnątrz kolumny kategorii. Postęp siedzi
  // w rozwinięciu pod spodem, więc zakładka nie potrzebuje już osobnego
  // widoku „Postęp" — te same trzy horyzonty są tutaj, w wersji zwartej.

  const closeModal=()=>{setModal(false);setSelFood(null);setSearch("");setGrams("100");setOffResults(null);setOffQuery("");closeCustomForm();};
  // Escape zamyka okno produktu i arkusz ćwiczeń; otwarte okno blokuje przewijanie strony.
  useEffect(()=>{
    if(!modal)return;
    const onKey=e=>{if(e.key==="Escape")closeModal();};
    document.addEventListener("keydown",onKey);
    const prev=document.body.style.overflow; document.body.style.overflow="hidden";
    return()=>{document.removeEventListener("keydown",onKey);document.body.style.overflow=prev;};
  },[modal]);
  const closeCustomForm=()=>{
    setCustomForm({name:"",cal:"",p:"",c:"",f:"",fb:"",s:""});
    setShowCustomForm(false);setEditFoodId(null);
  };
  const startEditFood=food=>{
    setEditFoodId(food.id);
    setCustomForm({name:food.name,cal:String(food.kcal),p:String(food.proteinG),
      c:String(food.carbsG),f:String(food.fatG),fb:String(food.fiberG),s:String(food.saltG)});
    setShowCustomForm(true);
  };
  const saveCustomFood=()=>run(async()=>{
    const {name,cal,p,c,f,fb,s}=customForm;
    if(!name.trim()||cal==="")return;
    // Błonnik i sól mają własne pierścienie i dzienne cele, więc produkt bez
    // nich zaniżałby dzienną sumę zamiast po prostu jej nie ruszać.
    const body={name,kcal:+cal,proteinG:+p||0,carbsG:+c||0,fatG:+f||0,fiberG:+fb||0,saltG:+s||0};
    // Poprawka katalogu nie rusza wpisów w dzienniku — te trzymają wartości
    // z chwili dodania i opisują zjedzony posiłek, a nie dzisiejszy katalog.
    if(editFoodId)await api.patchFood(editFoodId,body);
    else await api.addFood(body);
    await Promise.all([reloadFoods(),api.foodCategories().then(setFoodCats)]);
    closeCustomForm();
  });
  const deleteCustomFood=id=>run(async()=>{
    await api.deleteFood(id);
    // Kasowanie produktu, który akurat siedzi w formularzu, zostawiłoby
    // otwartą edycję czegoś, czego już nie ma.
    if(editFoodId===id)closeCustomForm();
    await Promise.all([reloadFoods(),api.foodCategories().then(setFoodCats)]);
  });

  // ── Open Food Facts ──
  const searchOff=()=>run(async()=>{
    if(offQuery.trim().length<2)return;
    setOffLoading(true);
    try{
      const {results,dropped,need}=await api.offSearch(offQuery.trim());
      setOffResults(results);
      setOffInfo({dropped:dropped||0,need:need||1});
    } finally { setOffLoading(false); }
  });

  const filtered=(offResults!==null?offResults.map(r=>({...r,offCode:r.code,category:"🌍 Open Food Facts"})):foods)
    .filter(f=>{
      if(offResults!==null)return true;   // wyniki z sieci filtruje już serwer
      const matchCat=selCat==="Wszystkie"||f.category===selCat;
      return matchCat&&f.name.toLowerCase().includes(search.toLowerCase());
    });
  const bmiInfo=bmiVal?getBMILabel(bmiVal):null;
  const bf=serverProfile?.bodyFat??null;
  const bfCol=bf?bfColor(serverProfile.sex,bf.category):null;
  const days7=getLast7();

  const splash=txt=><div style={{background:"#0a0a0a",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:INK.soft,fontFamily:FONT}}>{txt}</div>;
  if(!authChecked)return splash("");
  if(!user)return <LoginScreen notice={loginNotice} onLogged={u=>{setLoginNotice("");setUser(u);setLoading(true);}}/>;
  if(loading)return splash("Ładowanie…");

  const ctx={ addAvoid, addCheckin, addFood, addHabit, addKotwica, addMeasurement, authChecked, avoidItems, avoidName, avoidNote, bf, bfCol, bmiInfo, bmiTab, bmiVal, calDate, calcAll, chartMetric, checkins, ciIntensity, ciNote, ciSaved, ciState, closeCustomForm, closeModal, currentState, customForm, dailyTotals, dayEntries, dayGroups, dayLoading, days7, delKotwica, deleteAvoid, deleteCheckin, deleteCustomFood, deleteHabit, deleteMeasurement, deletePlan, deletePrinciple, editAvoidId, editAvoidNote, editAvoidVal, editFoodId, editGramsId, editGramsVal, editNameId, editNameVal, editPrinciple, editTimeId, ensureYear, error, exEntry, exLast, expandedHabit, filtered, foodCats, foods, getStreak, getView, getWeeklyRate, grams, gramsNum, habitLogs, habits, habitsByCat, isChecked, isMobile, isNarrow, isWide, isXWide, kotwicaEmoji, kotwicaInput, kotwice, lastCheckin, loadedYears, loading, loginNotice, logout, logsToMap, mainTab, measForm, measurements, modal, n1, newCat, newName, newTime, offInfo, offLoading, offQuery, offResults, openGroups, plans, principleForm, principleOffset, principles, profile, profileToForm, progressView, reloadCheckins, reloadDay, reloadFoods, reloadLogs, reloadTotals, reloadUses, removeEntry, run, saveAvoid, saveCustomFood, saveEx, savePlan, saveGrams, savePrinciple, saving, savingRef, search, searchOff, seedPrinciples, selCat, selFood, serverProfile, setAuthChecked, setAvoidItems, setAvoidName, setAvoidNote, setBmiTab, setCalDate, setChartMetric, setCheckins, setCiIntensity, setCiNote, setCiSaved, setCiState, setCustomForm, setDailyTotals, setDayEntries, setDayLoading, setEditAvoidId, setEditAvoidNote, setEditAvoidVal, setEditFoodId, setEditGramsId, setEditGramsVal, setEditNameId, setEditNameVal, setEditTimeId, setError, setExpandedHabit, setFoodCats, setFoods, setGrams, setHabitLogs, setHabits, setKotwicaEmoji, setKotwicaInput, setKotwice, setLoading, setLoginNotice, setMainTab, setMeasForm, setMeasurements, setModal, setNewCat, setNewName, setNewTime, setOffInfo, setOffLoading, setOffQuery, setOffResults, setOpenGroups, setPrincipleForm, setPrincipleOffset, setPrinciples, setProfile, setProgressView, setSaving, setSearch, setSelCat, setSelFood, setServerProfile, setShowAllTech, setShowAvoidForm, setShowCustomForm, setShowForm, setShowMeasForm, setShowPrinciples, setTechExpanded, setTechUses, setUser, setView, showAllTech, showAvoidForm, showCustomForm, showForm, showMeasForm, showPrinciples, sortedHabits, splash, startEditAvoid, startEditFood, tdee, techExpanded, techUses, todayCheckins, todayEntries, todayStr, toggleHabit, totToday, updateName, updateTime, useTechnique, user, year, yearSpan };
  return(
    <AppContext.Provider value={ctx}>
    <div style={{background:"#0a0a0a",minHeight:"100vh",fontFamily:FONT,color:"#f1f1f1",padding:isMobile?"16px 12px 32px":"24px 16px"}}>
      {/* Nagłówek ma własny kontener o stałej szerokości: treść zakładek
          bywa szersza (mapa mięśni), a bez tego tytuł i przycisk wylogowania
          przeskakiwały przy każdej zmianie zakładki. */}
      <div style={{maxWidth:680,margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:isMobile?16:24}}>
          <div style={{minWidth:0}}>
            <h1 style={{margin:0,fontSize:isMobile?20:24,fontWeight:700}}>🐟 Śledzik 🐠</h1>
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
          {TABS.map(({key:k,long,short})=>(
            <button key={k} onClick={()=>setMainTab(k)} aria-current={mainTab===k?"page":undefined} style={{flex:1,minWidth:0,background:mainTab===k?"#2a2a2a":"transparent",border:"none",borderRadius:8,padding:isMobile?"9px 2px":"8px 4px",color:mainTab===k?"#fff":INK.soft,fontWeight:600,cursor:"pointer",fontSize:isNarrow?11:isMobile?12:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{isMobile?short:long}</button>
          ))}
        </div>
      </div>

      {/* mapa mięśni i licznik kalorii potrzebują więcej szerokości; nawyki
          jeszcze więcej, bo mieszczą cztery kafle kategorii obok listy niewolnika */}
      <div style={{maxWidth:mainTab==="nawyki"?1400:mainTab==="miesnie"||mainTab==="kalorie"?1180:680,margin:"0 auto"}}>
        {mainTab==="nawyki"&&<HabitsTab/>}
        {mainTab==="kalorie"&&<CaloriesTab/>}
        {mainTab==="miesnie"&&<MuscleMap profile={serverProfile}/>}
        {mainTab==="stabilizacja"&&<StabilityTab/>}
      </div>
    </div>
    </AppContext.Provider>
  );
}
