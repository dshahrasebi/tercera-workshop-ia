// One Node service: serves the built Phaser frontend (dist/) and a tiny JSON API.
// Railway-ready: set DATABASE_URL for a shared leaderboard; runs in-memory without it.
// Start: node server/index.mjs   (after `npm run build`)
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { createStore } from "./store.mjs";
import { sanitizeScore } from "./validate.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dir, "..", "dist");
const PORT = Number(process.env.PORT) || 3000;

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || "info" } });
const store = await createStore();

app.get("/api/health", async () => ({ ok: true, store: store.mode }));

app.post("/api/score", async (req, reply) => {
  let s;
  try {
    s = sanitizeScore(req.body);
  } catch {
    return reply.code(400).send({ error: "invalid score" });
  }
  const row = await store.addScore(s);
  return { ok: true, score: row };
});

app.get("/api/leaderboard", async (req) => {
  const limit = Math.min(100, Math.max(1, Number(req.query?.limit) || 20));
  return { scores: await store.topScores(limit) };
});

app.post("/api/progress", async (req, reply) => {
  const b = req.body;
  if (!b || typeof b.playerId !== "string" || !b.playerId) return reply.code(400).send({ error: "playerId required" });
  const name = typeof b.name === "string" ? b.name.slice(0, 24) : "Anón";
  const state = b.state && typeof b.state === "object" ? b.state : {};
  await store.saveProgress(b.playerId.slice(0, 64), name, state);
  return { ok: true };
});

app.get("/api/progress/:playerId", async (req) => {
  return { progress: await store.getProgress(String(req.params.playerId).slice(0, 64)) };
});

// Serve the built frontend if present; SPA-style fallback to index.html.
if (existsSync(DIST)) {
  await app.register(fastifyStatic, { root: DIST, prefix: "/" });
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith("/api")) return reply.code(404).send({ error: "not found" });
    return reply.sendFile("index.html");
  });
} else {
  app.log.warn(`dist/ not found at ${DIST} — run 'npm run build'. API still available.`);
}

app.listen({ port: PORT, host: "0.0.0.0" }).then((addr) => {
  app.log.info(`Token Quest server on ${addr} (store: ${store.mode})`);
});
