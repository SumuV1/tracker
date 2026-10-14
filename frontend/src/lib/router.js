import { useState, useEffect } from "react";

// Router na `history.pushState`, bez zależności. Zakładki to ścieżki, więc
// przycisk wstecz na telefonie cofa do poprzedniej zakładki zamiast zamykać
// aplikację, a link do konkretnej zakładki da się wysłać albo dodać do ekranu
// głównego. Serwer oddaje index.html dla każdej ścieżki (SPA fallback), więc
// odświeżenie na /kalorie/licznik działa.
export const TABS = [
  { key: "stabilizacja", path: "/stabilizacja", long: "Stabilizacja", short: "Stabil." },
  { key: "nawyki",       path: "/nawyki",       long: "Nawyki",       short: "Nawyki" },
  { key: "kalorie",      path: "/kalorie",      long: "Kalorie & BMI", short: "Kalorie" },
  { key: "miesnie",      path: "/miesnie",      long: "Mięśnie",      short: "Mięśnie" },
];
export const HOME = "/stabilizacja";

// Zakładki do wyboru jako startowe (ustawienie konta). Cele to podstrona
// nawyków, ale ktoś, kto pracuje głównie na celach, chce lądować prosto tam.
// Lista musi się zgadzać z START_TABS w server/auth.js.
export const START_OPTIONS = [
  { path: "/stabilizacja", label: "Stabilizacja" },
  { path: "/nawyki",       label: "Nawyki" },
  { path: "/nawyki/cele",  label: "Cele" },
  { path: "/kalorie",      label: "Kalorie & BMI" },
  { path: "/miesnie",      label: "Mięśnie" },
];

// /kalorie ma dwie podstrony; bmiTab w kodzie nazywa je "bmi" i "tracker".
const CAL_SUB = { profil: "bmi", licznik: "tracker" };
const CAL_PATH = { bmi: "/kalorie/profil", tracker: "/kalorie/licznik" };

export function parseRoute(pathname) {
  const [, seg1 = "", seg2 = ""] = pathname.split("/");
  const tab = TABS.find(t => t.key === seg1);
  if (!tab) return { tab: null, sub: null };
  const sub = tab.key === "kalorie" ? (CAL_SUB[seg2] || null)
            : tab.key === "nawyki" && seg2 === "cele" ? "cele" : null;
  return { tab: tab.key, sub };
}
export const calPath = bmiTab => CAL_PATH[bmiTab] || "/kalorie";
// /nawyki ma dwa widoki: listę nawyków i cele.
export const habPath = view => (view === "cele" ? "/nawyki/cele" : "/nawyki");

// `home` to ścieżka, na którą idzie goły "/" — zakładka startowa z konta.
// Dopóki jej nie znamy (przed sprawdzeniem sesji), adres zostaje, jaki był:
// przekierowanie od razu na stabilizację, a chwilę później na zakładkę
// startową, zostawiałoby po drodze stronę, której nikt nie chciał.
export function useRoute(home) {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = (to, { replace = false } = {}) => {
    if (to === window.location.pathname) return;
    window.history[replace ? "replaceState" : "pushState"](null, "", to);
    setPath(to);
  };
  // Nieznana ścieżka (w tym "/", czyli start_url z manifestu) ląduje na
  // zakładce startowej — bez wpisu w historii, żeby wstecz nie wracał na pustkę.
  // Zakładka spoza listy (stara wartość w bazie) nie może zapętlić przekierowań.
  useEffect(() => {
    if (!home || parseRoute(path).tab) return;
    navigate(parseRoute(home).tab ? home : HOME, { replace: true });
  }, [path, home]);
  return { path, navigate, route: parseRoute(path) };
}
