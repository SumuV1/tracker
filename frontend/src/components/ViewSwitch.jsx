import { INK } from "../lib/ui.js";

// Przełącznik widoków zakładki (Nawyki | Cele, Stabilizacja | Przekonania).
// Wygląda i stoi tak jak główna nawigacja (680 px, wyśrodkowany) — wcześniej
// pasek nawyków siedział przyklejony do lewej krawędzi szerokiej zakładki.
// `opts` to pary [klucz, etykieta].
export function ViewSwitch({ opts, value, onChange, isMobile, label = "Widok zakładki" }) {
  return (
    <div role="tablist" aria-label={label} style={{display:"flex",gap:4,background:"#161616",
      borderRadius:10,padding:4,margin:"0 auto 16px",maxWidth:680}}>
      {opts.map(([k,text])=>{
        const on=value===k;
        return(
          <button key={k} role="tab" aria-selected={on} onClick={()=>onChange(k)}
            style={{flex:1,minHeight:isMobile?44:36,border:"none",borderRadius:8,cursor:"pointer",fontSize:isMobile?13:14,fontWeight:600,
              background:on?"#2a2a2a":"transparent",color:on?"#fff":INK.soft,transition:"background .15s"}}>{text}</button>
        );
      })}
    </div>
  );
}
