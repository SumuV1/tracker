import { ACTIVITY, NUTRIENT, INK, MONO } from "../lib/ui.js";

// Wzory pod wynikami. Wszystkie liczby — łącznie z PPM i współczynnikiem —
// pochodzą z odpowiedzi serwera, więc działanie nie może rozminąć się z wynikiem.
export function FormulaPanel({profile}){
  const {weightKg:w, heightCm:h, ageYears:age, sex, bmi, bmr, tdee, activityFactor:factor,
         neckCm:neck, waistCm:waist, hipsCm:hips, bodyFat:bf}=profile;
  const act=ACTIVITY[profile.activity]||ACTIVITY[0];
  const n=v=>String(Math.round(v*100)/100).replace(".",",");
  const mono={fontFamily:MONO,fontSize:12.5,color:"#bbb",lineHeight:1.9,whiteSpace:"nowrap"};
  const res={color:"#fff",fontWeight:700};
  const head={fontSize:11,fontWeight:700,letterSpacing:"0.08em",color:NUTRIENT.kcal,marginBottom:6,fontFamily:MONO};
  const note={fontSize:11,color:INK.soft,marginBottom:8,lineHeight:1.5};
  return(
    <div style={{background:"#161616",border:"1px solid #1e1e1e",borderRadius:14,padding:20,marginTop:12}}>
      <div style={{fontSize:14,fontWeight:700,color:"#ccc",marginBottom:16}}>Jak to policzono</div>

      <div style={{marginBottom:18}}>
        <div style={head}>BMI</div>
        <div style={note}>Wskaźnik masy ciała — masa podzielona przez kwadrat wzrostu w metrach.</div>
        <div style={{overflowX:"auto"}}>
          <div style={mono}>BMI = waga [kg] / (wzrost [m])²</div>
          <div style={mono}>{"    "}= {n(w)} / {n(h/100)}² = <span style={res}>{bmi.toFixed(1)}</span></div>
        </div>
      </div>

      <div style={{marginBottom:18}}>
        <div style={head}>PPM — PODSTAWOWA PRZEMIANA MATERII</div>
        <div style={note}>Wzór Mifflina-St Jeora ({sex==="M"?"mężczyzna":"kobieta"}) — energia zużywana przez organizm w spoczynku.</div>
        <div style={{overflowX:"auto"}}>
          <div style={mono}>PPM = 10×waga + 6,25×wzrost − 5×wiek {sex==="M"?"+ 5":"− 161"}</div>
          <div style={mono}>{"    "}= 10×{n(w)} + 6,25×{n(h)} − 5×{n(age)} {sex==="M"?"+ 5":"− 161"}</div>
          <div style={mono}>{"    "}= <span style={res}>{bmr} kcal</span></div>
        </div>
      </div>

      <div style={{marginBottom:bf?18:0}}>
        <div style={head}>CPM — CAŁKOWITA PRZEMIANA MATERII</div>
        <div style={note}>PPM przemnożona przez współczynnik aktywności ({act.label} = {n(factor)}). To jest dzienne zapotrzebowanie.</div>
        <div style={{overflowX:"auto"}}>
          <div style={mono}>CPM = PPM × współczynnik aktywności</div>
          <div style={mono}>{"    "}= {bmr} × {n(factor)} = <span style={res}>{tdee} kcal</span></div>
        </div>
      </div>

      {bf&&(
        <div>
          <div style={head}>TKANKA TŁUSZCZOWA — METODA US NAVY</div>
          <div style={note}>
            Wzór Hodgdona–Becketta w wersji metrycznej ({sex==="M"?"mężczyzna":"kobieta"}) — szacunek
            z obwodów ciała. Logarytm dziesiętny, wszystkie wymiary w centymetrach.
          </div>
          <div style={{overflowX:"auto"}}>
            {sex==="F"?(
              <>
                <div style={mono}>BF% = 495 / (1,29579 − 0,35004×log(talia + biodra − szyja) + 0,221×log(wzrost)) − 450</div>
                <div style={mono}>{"    "}= 495 / (1,29579 − 0,35004×log({n(waist)}+{n(hips)}−{n(neck)}) + 0,221×log({n(h)})) − 450</div>
              </>
            ):(
              <>
                <div style={mono}>BF% = 495 / (1,0324 − 0,19077×log(talia − szyja) + 0,15456×log(wzrost)) − 450</div>
                <div style={mono}>{"    "}= 495 / (1,0324 − 0,19077×log({n(waist)}−{n(neck)}) + 0,15456×log({n(h)})) − 450</div>
              </>
            )}
            <div style={mono}>{"    "}= <span style={res}>{String(bf.pct).replace(".",",")} %</span></div>
            <div style={{...mono,marginTop:8}}>masa tłuszczu = waga × BF% / 100 = {n(w)} × {String(bf.pct).replace(".",",")}/100 = <span style={res}>{String(bf.fatMassKg).replace(".",",")} kg</span></div>
            <div style={mono}>masa beztłuszczowa = waga − masa tłuszczu = <span style={res}>{String(bf.leanMassKg).replace(".",",")} kg</span></div>
            {bf.milestones.length>0&&(
              <div style={mono}>masa przy X% = masa beztłuszczowa / (1 − X/100)</div>
            )}
          </div>
          <div style={{...note,marginTop:10,marginBottom:0}}>
            Błąd standardowy metody to ±3–4 punkty procentowe względem DXA, więc różnica między
            18 % a 17 % mieści się w szumie. Wartość ma sens w trendzie: mierz co 2–4 tygodnie
            w identycznych warunkach. Wzór zawyża wynik przy wąskiej szyi i szerokim tułowiu,
            zaniża u osób z rozbudowanym karkiem; nie stosuje się go u dzieci ani w ciąży.
          </div>
        </div>
      )}
    </div>
  );
}

// Pierścienie postępu: jedna wartość względem dziennego celu, osobno dla każdego
// składnika. To nie jest wykres kołowy w sensie "części całości" — składniki nie
// sumują się do wspólnej całości, więc każdy dostaje własny wskaźnik.
// Nazwa i liczby są zawsze wypisane tekstem: kolor wyłącznie wzmacnia odczyt,
// nigdy nie jest jedynym nośnikiem informacji.
