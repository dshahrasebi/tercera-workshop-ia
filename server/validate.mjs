// Trust-boundary sanitiser for submitted scores. Pure + self-checked (run: node server/validate.mjs).
const WEAPON_IDS = ["nano", "standard", "frontier"];
const clampInt = (v, lo, hi, dflt = lo) => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.min(hi, Math.max(lo, n));
};

export function sanitizeScore(body) {
  if (!body || typeof body !== "object") throw new Error("invalid body");

  let name = typeof body.name === "string" ? body.name : "";
  // Strip control chars, collapse whitespace, clamp length.
  name = name.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);
  if (!name) name = "Anón";

  const tokens = clampInt(body.tokens, 0, 1_000_000, 0);
  const durationMs = clampInt(body.durationMs, 0, 24 * 60 * 60 * 1000, 0);

  const usage = {};
  const src = body.weaponUsage && typeof body.weaponUsage === "object" ? body.weaponUsage : {};
  for (const id of WEAPON_IDS) usage[id] = clampInt(src[id], 0, 1_000_000, 0);

  return { name, tokens, durationMs, weaponUsage: usage };
}

// --- self-check ---
import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = sanitizeScore({ name: "  Dawy\n\t", tokens: "150", durationMs: 42000, weaponUsage: { nano: 3, bogus: 9 } });
  console.assert(a.name === "Dawy", "name trim", a.name);
  console.assert(a.tokens === 150, "tokens coerce", a.tokens);
  console.assert(a.weaponUsage.nano === 3 && a.weaponUsage.frontier === 0 && !("bogus" in a.weaponUsage), "usage whitelist", JSON.stringify(a.weaponUsage));
  const b = sanitizeScore({ name: "x".repeat(80), tokens: -5, durationMs: 9e15 });
  console.assert(b.name.length === 24, "name clamp", b.name.length);
  console.assert(b.tokens === 0, "tokens floor", b.tokens);
  console.assert(b.durationMs === 24 * 60 * 60 * 1000, "duration cap", b.durationMs);
  const c = sanitizeScore({});
  console.assert(c.name === "Anón" && c.tokens === 0, "defaults", JSON.stringify(c));
  let threw = false;
  try { sanitizeScore(null); } catch { threw = true; }
  console.assert(threw, "null throws");
  console.log("validate.mjs self-check OK");
}
