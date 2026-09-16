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
const HOME = "/stabilizacja";

// /kalorie ma dwie podstrony; bmiTab w kodzie nazywa je "bmi" i "tracker".
const CAL_SUB = { profil: "bmi", licznik: "tracker" };
const CAL_PATH = { bmi: "/kalorie/profil", tracker: "/kalorie/licznik" };

export function parseRoute(pathname) {
  const [, seg1 = "", seg2 = ""] = pathname.split("/");
  const tab = TABS.find(t => t.key === seg1);
  if (!tab) return { tab: null, sub: null };
  return { tab: tab.key, sub: tab.key === "kalorie" ? (CAL_SUB[seg2] || null) : null };
}
export const calPath = bmiTab => CAL_PATH[bmiTab] || "/kalorie";

export function useRoute() {
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
  // stabilizacji — bez wpisu w historii, żeby wstecz nie wracał na pustkę.
  useEffect(() => {
    if (!parseRoute(path).tab) navigate(HOME, { replace: true });
  }, [path]);
  return { path, navigate, route: parseRoute(path) };
}
