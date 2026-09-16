import { createContext, useContext } from "react";

// Stan i akcje żyją w App; zakładki dostają je stąd zamiast przez kilkadziesiąt
// propsów. To świadomy pierwszy krok podziału: pliki per zakładka bez zmiany
// zachowania. Przeniesienie stanu do zakładek to osobna decyzja.
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
