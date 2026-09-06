import pg from "pg";

// Postgres oddaje numeric jako string, żeby nie gubić precyzji. Tutaj wszystkie
// numeric to wagi i wartości odżywcze — mieszczą się w double bez strat, a JSON
// z liczbami zamiast stringów oszczędza konwersji po stronie frontendu.
pg.types.setTypeParser(1700, v => (v === null ? null : parseFloat(v)));
// date bez konwersji na obiekt Date: inaczej sterownik interpretuje "2026-09-06"
// w strefie serwera i przy ujemnym offsecie potrafi cofnąć dzień.
pg.types.setTypeParser(1082, v => v);
// bigint domyślnie wraca jako string (ochrona przed utratą precyzji powyżej
// 2^53). Identyfikatory z sekwencji nie zbliżą się do tej granicy nawet
// teoretycznie, a liczby zamiast stringów oszczędzają porównań typów w UI.
pg.types.setTypeParser(20, v => (v === null ? null : parseInt(v, 10)));

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const query = (text, params) => pool.query(text, params);

export async function waitForDb(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT 1");
      console.log("DB gotowa");
      return;
    } catch (e) {
      console.log("DB niedostępna, ponawiam...", e.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error("Nie udało się połączyć z bazą");
}
