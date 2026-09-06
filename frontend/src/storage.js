// Zastępuje window.storage z Claude.ai wywołaniami do własnego API.
// Zachowuje identyczny interfejs: get / set / delete / list.
const API = "/api/kv";

window.storage = {
  async get(key) {
    const r = await fetch(`${API}/${encodeURIComponent(key)}`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("storage.get failed");
    return r.json(); // { key, value }
  },
  async set(key, value) {
    const r = await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!r.ok) throw new Error("storage.set failed");
    return r.json(); // { key, value }
  },
  async delete(key) {
    const r = await fetch(`${API}/${encodeURIComponent(key)}`, { method: "DELETE" });
    return r.json(); // { key, deleted }
  },
  async list(prefix = "") {
    const r = await fetch(`${API}?prefix=${encodeURIComponent(prefix)}`);
    return r.json(); // { keys: [...] }
  },
};
