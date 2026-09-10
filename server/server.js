import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import { waitForDb } from "./db.js";
import { authRoutes, requireAuth } from "./auth.js";
import { habitRoutes } from "./routes/habits.js";
import { profileRoutes } from "./routes/profile.js";
import { foodRoutes } from "./routes/foods.js";
import { mealRoutes } from "./routes/meals.js";
import { anchorRoutes } from "./routes/anchors.js";
import { avoidRoutes } from "./routes/avoid.js";
import { measurementRoutes } from "./routes/measurements.js";
import { offRoutes } from "./routes/off.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Za nginx-em: bez tego req.ip pokazuje adres proxy i licznik prób logowania
// obejmowałby wszystkich naraz.
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);

// Wszystko poniżej wymaga zalogowania.
app.use("/api/habits", requireAuth, habitRoutes);
app.use("/api/profile", requireAuth, profileRoutes);
app.use("/api/foods", requireAuth, foodRoutes);
app.use("/api/meals", requireAuth, mealRoutes);
app.use("/api/anchors", requireAuth, anchorRoutes);
app.use("/api/avoid", requireAuth, avoidRoutes);
app.use("/api/measurements", requireAuth, measurementRoutes);
app.use("/api/off", requireAuth, offRoutes);

// Nieznana ścieżka /api/* musi kończyć się błędem, a nie stroną aplikacji —
// inaczej literówka w adresie zwraca HTML-a ze statusem 200 i klient
// wywraca się dopiero na parsowaniu JSON-a.
app.use("/api", (_req, res) => res.status(404).json({ error: "Nie ma takiej trasy API." }));

// ── Frontend ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// ── Błędy ─────────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "Błąd serwera." : err.message });
});

const PORT = process.env.PORT || 3000;
waitForDb().then(() => app.listen(PORT, () => console.log("API na :" + PORT)));
