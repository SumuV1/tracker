import express from "express";
import { query } from "../db.js";
import { wrap, reqText, BadRequest } from "../http.js";

export const offRoutes = express.Router();

// Wyszukiwanie pełnotekstowe nie istnieje w API v2 Open Food Facts — służy do
// niego osobna usługa Search-a-licious. Odczyt pojedynczego produktu idzie już
// przez zwykłe API produktowe.
const SEARCH_URL = "https://search.openfoodfacts.org/search";
const PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";
const FIELDS = "code,product_name,brands,quantity,nutriments";

// Open Food Facts prosi o identyfikację aplikacji w każdym żądaniu.
// Wyłącznie ASCII — nagłówki HTTP to ByteString, polski znak wywala fetch.
const USER_AGENT = "Tracker/1.0 (self-hosted instance)";
const TIMEOUT_MS = 8000;

// ── Budżet zapytań ────────────────────────────────────────────────────────
// Limity są liczone na adres IP, a serwer odpytuje w imieniu wszystkich
// użytkowników naraz — budżet jest więc wspólny i pilnujemy go tutaj.
// Oficjalnie: 10/min dla wyszukiwania, 15/min dla odczytu produktu.
// Zostawiamy zapas, żeby nie doprowadzić do zablokowania całej instancji.
function budget(maxPerMinute) {
  let calls = [];
  return () => {
    const now = Date.now();
    calls = calls.filter(t => now - t < 60_000);
    if (calls.length >= maxPerMinute) return false;
    calls.push(now);
    return true;
  };
}
const searchBudget = budget(8);
const productBudget = budget(12);

// Powtórzone wyszukiwanie tej samej frazy nie powinno zjadać budżetu —
// w praktyce użytkownik poprawia zapytanie i wraca do poprzedniego.
const searchCache = new Map();
const CACHE_MS = 10 * 60 * 1000;

function cacheGet(key) {
  const hit = searchCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_MS) {
    searchCache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  // Prosty limit rozmiaru: przy przepełnieniu wypada najstarszy wpis.
  if (searchCache.size > 200) searchCache.delete(searchCache.keys().next().value);
  searchCache.set(key, { at: Date.now(), value });
}

async function offFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = new Error(`Open Food Facts odpowiedziało kodem ${res.status}.`);
      err.status = res.status === 429 ? 429 : 502;
      throw err;
    }
    return await res.json();
  } catch (e) {
    if (e.name === "AbortError") {
      const err = new Error("Open Food Facts nie odpowiedziało na czas.");
      err.status = 504;
      throw err;
    }
    if (!e.status) e.status = 502;
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const num = v => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);

// Zamienia rekord z Open Food Facts na nasz kształt produktu (wartości na 100 g).
function normalize(p) {
  const n = p?.nutriments || {};
  const kcal = n["energy-kcal_100g"];
  // Produkt bez kalorii jest w liczniku bezużyteczny — pomijamy go już tutaj,
  // zamiast wpuszczać do interfejsu pozycję, której nie da się dodać.
  if (!Number.isFinite(kcal) || !p.code) return null;

  const brands = Array.isArray(p.brands) ? p.brands.join(", ") : p.brands || "";
  const base = (p.product_name || "").trim();
  if (!base) return null;
  const name = [base, brands && `(${brands})`].filter(Boolean).join(" ").slice(0, 160);

  return {
    code: String(p.code),
    name,
    quantity: p.quantity || null,
    kcal: num(kcal),
    proteinG: num(n.proteins_100g),
    carbsG: num(n.carbohydrates_100g),
    fatG: num(n.fat_100g),
    fiberG: num(n.fiber_100g),
    saltG: num(n.salt_100g),
  };
}

// ── Wyszukiwanie ──────────────────────────────────────────────────────────
offRoutes.get("/search", wrap(async (req, res) => {
  const q = reqText(req.query.q, "q", { max: 80, min: 2 });
  const key = q.toLowerCase();

  const cached = cacheGet(key);
  if (cached) return res.json({ results: cached, cached: true });

  if (!searchBudget()) {
    return res.status(429).json({
      error: "Limit zapytań do Open Food Facts (10/min) wyczerpany. Spróbuj za chwilę.",
    });
  }

  const url = `${SEARCH_URL}?q=${encodeURIComponent(q)}&page_size=25&fields=${FIELDS}`;
  const data = await offFetch(url);
  const results = (data.hits || []).map(normalize).filter(Boolean).slice(0, 20);

  cacheSet(key, results);
  res.json({ results, cached: false });
}));

// ── Import do katalogu ────────────────────────────────────────────────────
// Wartości odżywcze pobieramy z Open Food Facts po kodzie kreskowym, zamiast
// przyjmować je z przeglądarki — klient wskazuje wyłącznie, który produkt.
// Tabela foods jest zarazem cache'em: raz zaimportowany produkt nie generuje
// już ruchu do API.
offRoutes.post("/import", wrap(async (req, res) => {
  const code = reqText(req.body?.code, "code", { max: 32, min: 4 });
  if (!/^\d+$/.test(code)) throw new BadRequest("Kod kreskowy może zawierać wyłącznie cyfry.");

  const existing = await query(
    `SELECT id, source, name, category, kcal,
            protein_g AS "proteinG", carbs_g AS "carbsG",
            fat_g AS "fatG", fiber_g AS "fiberG", salt_g AS "saltG"
       FROM foods WHERE source = 'off' AND off_barcode = $1`,
    [code]
  );
  if (existing.rows.length) return res.json({ ...existing.rows[0], cached: true });

  if (!productBudget()) {
    return res.status(429).json({
      error: "Limit zapytań do Open Food Facts wyczerpany. Spróbuj za chwilę.",
    });
  }

  const data = await offFetch(`${PRODUCT_URL}/${encodeURIComponent(code)}?fields=${FIELDS}`);
  const food = data?.status === 1 || data?.product ? normalize(data.product) : null;
  if (!food) {
    return res.status(404).json({ error: "Nie znaleziono produktu albo brakuje w nim wartości odżywczych." });
  }

  const { rows } = await query(
    `INSERT INTO foods (source, off_barcode, name, category, kcal, protein_g, carbs_g, fat_g, fiber_g, salt_g, fetched_at)
     VALUES ('off', $1, $2, '🌍 Open Food Facts', $3, $4, $5, $6, $7, $8, now())
     ON CONFLICT (off_barcode) WHERE source = 'off' DO UPDATE SET
       name = EXCLUDED.name, kcal = EXCLUDED.kcal,
       protein_g = EXCLUDED.protein_g, carbs_g = EXCLUDED.carbs_g,
       fat_g = EXCLUDED.fat_g, fiber_g = EXCLUDED.fiber_g,
       salt_g = EXCLUDED.salt_g, fetched_at = now()
     RETURNING id, source, name, category, kcal,
               protein_g AS "proteinG", carbs_g AS "carbsG",
               fat_g AS "fatG", fiber_g AS "fiberG", salt_g AS "saltG"`,
    [food.code, food.name, food.kcal, food.proteinG, food.carbsG, food.fatG, food.fiberG, food.saltG]
  );
  res.status(201).json({ ...rows[0], cached: false });
}));
