#!/usr/bin/env node
// Generuje frontend/src/lib/bodyArt.js z grafiki pakietu react-muscle-highlighter
// (licencja MIT). Uruchamiany ręcznie, tylko przy zmianie grafiki albo przypisań.
//
// Wymaga Chrome z portem debugowania (getBBox liczy przeglądarka) i
// puppeteer-core w katalogu, z którego się uruchamia — nie w zależnościach
// aplikacji:
//   podman run --rm -d --name chrome --network host docker.io/zenika/alpine-chrome \
//     --no-sandbox --headless --remote-debugging-port=9233 about:blank
//   cd $(mktemp -d) && npm i puppeteer-core && npm pack react-muscle-highlighter@1.2.0 \
//     && mkdir pkg && tar xzf react-muscle-highlighter-1.2.0.tgz -C pkg
//   node ~/tracker/scripts/gen-body-art.mjs pkg/package ~/tracker/frontend/src/lib/bodyArt.js
//
// Kształty przypisywane do naszych mięśni po GEOMETRII (lustrzana ramka), nie po
// indeksie — kolejność ścieżek po prawej stronie biblioteki różni się od lewej.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";
const puppeteer = createRequire(path.join(process.cwd(), "x.js"))("puppeteer-core");
const [PKG, OUT] = process.argv.slice(2);
if (!PKG || !OUT) { console.error("Użycie: gen-body-art.mjs <katalog pakietu> <plik wyjściowy>"); process.exit(1); }
const P = path.resolve(PKG) + "/dist/esm/";
const BROWSER = process.env.CHROME_URL || "http://127.0.0.1:9233";
const VERSION = JSON.parse(fs.readFileSync(path.join(PKG, "package.json"), "utf8")).version;

const { bodyFront } = await import(pathToFileURL(P+"assets/bodyFront.js")); const { bodyBack } = await import(pathToFileURL(P+"assets/bodyBack.js"));
const w=fs.readFileSync(P+"components/SvgMaleWrapper.js","utf8");
const outline=Object.fromEntries([...w.matchAll(/d: "([^"]+)", "aria-label": "male-body-outline-(front|back)"/g)].map(m=>[m[2],m[1]]));
const LICENSE=fs.readFileSync(path.join(PKG,"LICENSE"),"utf8").trim();
const items=[];
for(const [v,arr] of [["front",bodyFront],["back",bodyBack]]) for(const m of arr) for(const side of ["left","right","common"]) (m.path[side]||[]).forEach(d=>items.push({v,slug:m.slug,side,d}));
const b=await puppeteer.connect({browserURL:BROWSER});const p=await b.newPage();
const bbs=await p.evaluate(ds=>{const s=document.createElementNS("http://www.w3.org/2000/svg","svg");document.body.appendChild(s);
  return ds.map(d=>{const e=document.createElementNS("http://www.w3.org/2000/svg","path");e.setAttribute("d",d);s.appendChild(e);const bb=e.getBBox();return [bb.x,bb.y,bb.x+bb.width,bb.y+bb.height];});},items.map(i=>i.d));
await p.close();await b.disconnect();
const out={}, parts=[], hair=[], unassigned=[];
const add=(id,d)=>(out[id]||=[]).push(d);
items.forEach((it,i)=>{
  let [x0,y0,x1,y1]=bbs[i]; const c=it.v==="front"?364:1084;
  if(it.side==="right") [x0,x1]=[2*c-x1,2*c-x0];           // lustro na lewą stronę
  const h=y1-y0, F=it.v==="front";
  const s=it.slug;
  if(s==="hair") return hair.push(it.d);
  if(["head","hands","feet","knees","ankles"].includes(s)) return parts.push(it.d);
  if(F){
    if(s==="chest") return add("pectoralis",it.d);
    if(s==="abs") return add("rectus_abdominis",it.d);
    if(s==="biceps") return add("biceps",it.d);
    if(s==="triceps") return add("triceps",it.d);
    if(s==="trapezius") return add("trapezius",it.d);
    if(s==="deltoids") return add("deltoid_front",it.d);
    if(s==="quadriceps") return add("quadriceps",it.d);
    if(s==="tibialis") return add("tibialis",it.d);
    if(s==="calves") return add("gastrocnemius",it.d);
    if(s==="forearm") return add("forearm_front",it.d);
    // „neck": środek → szeroki szyi, ukośny pas od ucha do mostka →
    // mostkowo-obojczykowo-sutkowy, wąski pas z boku → pochyłe.
    if(s==="neck") return add(it.side==="common"?"platysma":y0<260?"sternocleidomastoid":"scalenes",it.d);
    // „obliques": trzy boczne palce pod pachą to zębaty przedni, reszta skośne.
    if(s==="obliques") return add(x0<=261&&y1<=495?"serratus":"obliques",it.d);
    // „adductors": najdłuższy ukośny pas do przyśrodkowej strony kolana to
    // krawiecki, krótsze kształty wewnątrz uda — przywodziciele.
    if(s==="adductors") return add(h>200?"sartorius":"adductors",it.d);
  } else {
    if(s==="neck"||s==="trapezius") return add("trapezius",it.d);
    if(s==="deltoids") return add("deltoid_back",it.d);
    if(s==="triceps") return add("triceps",it.d);
    if(s==="forearm") return add("forearm_back",it.d);
    if(s==="gluteal") return add("gluteus",it.d);
    if(s==="hamstring") return add("hamstrings",it.d);
    if(s==="calves") return add("gastrocnemius",it.d);
    if(s==="adductors") return add("adductors",it.d);
    if(s==="lower-back") return add("erector_spinae",it.d);
    // „upper-back": duży kształt sięgający do lędźwi to najszerszy, dwa
    // mniejsze na łopatce — podgrzebieniowy i obły (dołączony do niego).
    if(s==="upper-back") return add(y1>500?"latissimus":"infraspinatus",it.d);
  }
  unassigned.push(`${it.v}/${s}/${it.side}`);
});
if(unassigned.length){console.error("NIEPRZYPISANE:",unassigned);process.exit(1);}
const J=x=>JSON.stringify(x);
const src=`// ── Grafika sylwetki i mięśni ──────────────────────────────────────────────
// PLIK GENEROWANY (scripts/gen-body-art.mjs) — nie edytować ręcznie. Kształty pochodzą z pakietu
// react-muscle-highlighter ${VERSION} (licencja MIT, treść niżej). Generator
// przypisuje ścieżki biblioteki do NASZYCH identyfikatorów mięśni (MUSCLES
// w lib/muscles.js) po geometrii, nie po kolejności — po prawej stronie
// biblioteki ścieżki leżą w innej kolejności niż po lewej. Zbiorcze grupy
// biblioteki są rozdzielone: „neck" → szeroki szyi / mostkowo-obojczykowo-
// sutkowy / pochyłe, „obliques" → zębaty przedni / skośne, „adductors" →
// krawiecki / przywodziciele, „upper-back" → najszerszy / podgrzebieniowy
// (z obłym). Układ współrzędnych: 1448 × 1448, przód x 0–724 (oś 364),
// tył x 724–1448 (oś 1084).

/*! Grafika sylwetki i mięśni: react-muscle-highlighter ${VERSION}
 * https://github.com/soroojshehryar/react-muscle-highlighter
 *
 * ${LICENSE.split("\n").join("\n * ").replace(/ \* $/gm," *")}
 */

// Kadry: obie sylwetki albo jedna (telefon). Postać zajmuje y 96–1351.
export const BODY_VIEW = { both:"30 80 1388 1290", front:"30 80 668 1290", back:"750 80 668 1290" };
export const BODY_OUTLINE = ${J([outline.front,outline.back])};
// Części ciała bez mięśni w słowniku: głowa, dłonie, stopy, kolana, kostki.
export const BODY_PARTS = ${J(parts)};
export const BODY_HAIR = ${J(hair)};
export const MUSCLE_PATHS = {
${Object.entries(out).map(([k,v])=>`  ${k}:${J(v)},`).join("\n")}
};
`;
fs.writeFileSync(OUT,src);
console.log(Object.entries(out).map(([k,v])=>`${k}:${v.length}`).join(" "), "| parts",parts.length,"hair",hair.length, "| bajtów",src.length);
