import express from "express";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "6mb" }));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function initDb(retries = 15) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS kv_store (
          key        text PRIMARY KEY,
          value      text NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )`);
      console.log("DB gotowa");
      return;
    } catch (e) {
      console.log("DB niedostępna, ponawiam...", e.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error("Nie udało się połączyć z bazą");
}

// --- API klucz–wartość (odpowiednik window.storage) ---
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/kv", async (req, res) => {
  const prefix = req.query.prefix || "";
  const { rows } = await pool.query(
    "SELECT key FROM kv_store WHERE key LIKE $1 ORDER BY key",
    [prefix + "%"]
  );
  res.json({ keys: rows.map((r) => r.key) });
});

app.get("/api/kv/:key", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT key, value FROM kv_store WHERE key = $1",
    [req.params.key]
  );
  if (!rows.length) return res.status(404).json({ error: "not found" });
  res.json(rows[0]);
});

app.put("/api/kv", async (req, res) => {
  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({ error: "key required" });
  await pool.query(
    `INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, String(value ?? "")]
  );
  res.json({ key, value });
});

app.delete("/api/kv/:key", async (req, res) => {
  await pool.query("DELETE FROM kv_store WHERE key = $1", [req.params.key]);
  res.json({ key: req.params.key, deleted: true });
});

// --- serwowanie zbudowanego frontendu (SPA) ---
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

const PORT = process.env.PORT || 3000;
initDb().then(() => app.listen(PORT, () => console.log("API na :" + PORT)));
