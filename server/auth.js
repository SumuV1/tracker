import crypto from "node:crypto";
import express from "express";
import { query } from "./db.js";

const COOKIE = "tracker_session";
const SESSION_DAYS = 30;

// ── Hasła ─────────────────────────────────────────────────────────────────
// Format zapisany przez scripts/create-user.sh: scrypt$N$r$p$salt_b64$hash_b64
function verifyPassword(password, stored) {
  const parts = String(stored).split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, N, r, p, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  let actual;
  try {
    actual = crypto.scryptSync(password, salt, expected.length, {
      N: +N, r: +r, p: +p, maxmem: 64 * 1024 * 1024,
    });
  } catch {
    return false;
  }
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

// ── Sesje ─────────────────────────────────────────────────────────────────
// W bazie leży wyłącznie skrót tokenu — sam podgląd tabeli sesji nie wystarczy,
// żeby podszyć się pod użytkownika.
const hashToken = t => crypto.createHash("sha256").update(t).digest("hex");

function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      return decodeURIComponent(part.slice(i + 1).trim());
    }
  }
  return null;
}

function setSessionCookie(res, token, maxAgeMs) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: true,       // ruch idzie przez nginx po HTTPS
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeMs,
  });
}

// ── Ograniczenie prób logowania ───────────────────────────────────────────
// Adres jest publiczny, więc gołe logowanie zaprasza do zgadywania haseł.
// Licznik siedzi w bazie, nie w pamięci procesu: wersja pamięciowa kasowała się
// przy każdym restarcie kontenera, a przy wdrożeniu co kilkanaście minut
// oznaczało to brak limitu w praktyce.
// UWAGA: rootless Podman przepuszcza ruch przez własny forwarder portów, więc
// nginx widzi jako adres klienta zawsze 10.89.0.x, a nie prawdziwy adres z sieci.
// `X-Forwarded-For` niesie ten sam adres, przez co licznik jest w praktyce
// wspólny dla wszystkich: cudze próby potrafią zablokować logowanie właścicielowi
// na kwadrans. To świadomy wybór — wolimy tę uciążliwość niż zgadywanie hasła bez
// limitu. Kolumna `ip` przestanie być fikcją, gdy nginx pójdzie na sieć hosta.
const MAX_ATTEMPTS = 10;
const WINDOW_MIN = 15;
// Po tym czasie wiersze nie służą już do niczego — kasujemy je przy okazji
// zapisu, żeby tabela nie rosła i nie trzeba było osobnego sprzątacza.
const KEEP_HOURS = 24;

async function rateLimited(ip) {
  const { rows } = await query(
    `SELECT count(*)::int AS n FROM login_attempts
      WHERE ip = $1 AND at > now() - ($2 || ' minutes')::interval`,
    [ip, String(WINDOW_MIN)]
  );
  return rows[0].n >= MAX_ATTEMPTS;
}

async function noteFailure(ip) {
  await query("INSERT INTO login_attempts (ip) VALUES ($1)", [ip]);
  await query("DELETE FROM login_attempts WHERE at < now() - ($1 || ' hours')::interval", [String(KEEP_HOURS)]);
}

// Udane logowanie czyści licznik tego adresu — inaczej kwadrans po pomyłkach
// blokowałby też właściciela konta, który już się przecież zalogował.
const clearAttempts = ip => query("DELETE FROM login_attempts WHERE ip = $1", [ip]);

// ── Middleware ────────────────────────────────────────────────────────────
export async function requireAuth(req, res, next) {
  try {
    const token = readCookie(req, COOKIE);
    if (!token) return res.status(401).json({ error: "unauthorized" });
    const { rows } = await query(
      `SELECT u.id, u.login
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = $1 AND s.expires_at > now()`,
      [hashToken(token)]
    );
    if (!rows.length) {
      res.clearCookie(COOKIE, { path: "/" });
      return res.status(401).json({ error: "unauthorized" });
    }
    req.user = rows[0];
    next();
  } catch (e) {
    next(e);
  }
}

// ── Trasy ─────────────────────────────────────────────────────────────────
export const authRoutes = express.Router();

authRoutes.post("/login", async (req, res, next) => {
  try {
    const ip = req.ip || "?";
    if (await rateLimited(ip)) {
      return res.status(429).json({ error: "Za dużo prób logowania. Spróbuj za kwadrans." });
    }
    const { login, password } = req.body || {};
    if (typeof login !== "string" || typeof password !== "string" || !login || !password) {
      return res.status(400).json({ error: "Podaj login i hasło." });
    }

    const { rows } = await query(
      "SELECT id, login, password_hash FROM users WHERE lower(login) = lower($1)",
      [login]
    );
    const user = rows[0];
    // Ta sama odpowiedź niezależnie od tego, czy zawiódł login czy hasło —
    // inaczej formularz zdradza, które konta istnieją.
    if (!user || !verifyPassword(password, user.password_hash)) {
      await noteFailure(ip);
      return res.status(401).json({ error: "Nieprawidłowy login lub hasło." });
    }

    await query("DELETE FROM sessions WHERE expires_at < now()");
    const token = crypto.randomBytes(32).toString("base64url");
    const maxAgeMs = SESSION_DAYS * 24 * 60 * 60 * 1000;
    await query(
      "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)",
      [hashToken(token), user.id, String(SESSION_DAYS)]
    );
    await clearAttempts(ip);
    setSessionCookie(res, token, maxAgeMs);
    res.json({ user: { id: user.id, login: user.login } });
  } catch (e) {
    next(e);
  }
});

authRoutes.post("/logout", async (req, res, next) => {
  try {
    const token = readCookie(req, COOKIE);
    if (token) await query("DELETE FROM sessions WHERE token = $1", [hashToken(token)]);
    res.clearCookie(COOKIE, { path: "/" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

authRoutes.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));
