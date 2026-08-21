// Score/leaderboard/progress store. Postgres when DATABASE_URL is set (Railway),
// otherwise an in-memory fallback so the game runs locally with zero setup.
import pg from "pg";

function sslFor(url) {
  if (/sslmode=disable/.test(url) || process.env.PGSSL === "disable") return false;
  if (/localhost|127\.0\.0\.1|\.railway\.internal/.test(url)) return false;
  // Managed Postgres (Railway public proxy, etc.) terminates TLS with its own CA.
  // ponytail: rejectUnauthorized:false trusts the endpoint; tighten with a CA bundle if needed.
  return { rejectUnauthorized: false };
}

export async function createStore() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[store] No DATABASE_URL — using in-memory store (scores reset on restart).");
    return memoryStore();
  }
  const pool = new pg.Pool({ connectionString: url, ssl: sslFor(url), max: 5 });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      tokens INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      weapon_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS scores_tokens_idx ON scores (tokens DESC, created_at ASC);
    CREATE TABLE IF NOT EXISTS progress (
      player_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      state JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  console.log("[store] Postgres connected.");
  return {
    mode: "postgres",
    async addScore(s) {
      const { rows } = await pool.query(
        `INSERT INTO scores (name, tokens, duration_ms, weapon_usage)
         VALUES ($1,$2,$3,$4)
         RETURNING id, name, tokens, duration_ms AS "durationMs", weapon_usage AS "weaponUsage", created_at AS "createdAt"`,
        [s.name, s.tokens, s.durationMs, s.weaponUsage]
      );
      return rows[0];
    },
    async topScores(limit) {
      const { rows } = await pool.query(
        `SELECT id, name, tokens, duration_ms AS "durationMs", weapon_usage AS "weaponUsage", created_at AS "createdAt"
         FROM scores ORDER BY tokens DESC, created_at ASC LIMIT $1`,
        [limit]
      );
      return rows;
    },
    async saveProgress(playerId, name, state) {
      await pool.query(
        `INSERT INTO progress (player_id, name, state, updated_at)
         VALUES ($1,$2,$3, now())
         ON CONFLICT (player_id) DO UPDATE SET name=EXCLUDED.name, state=EXCLUDED.state, updated_at=now()`,
        [playerId, name, state]
      );
    },
    async getProgress(playerId) {
      const { rows } = await pool.query(
        `SELECT player_id AS "playerId", name, state, updated_at AS "updatedAt" FROM progress WHERE player_id=$1`,
        [playerId]
      );
      return rows[0] ?? null;
    },
  };
}

function memoryStore() {
  const scores = [];
  const progress = new Map();
  let seq = 1;
  return {
    mode: "memory",
    async addScore(s) {
      const row = { id: seq++, ...s, createdAt: new Date().toISOString() };
      scores.push(row);
      return row;
    },
    async topScores(limit) {
      return [...scores]
        .sort((a, b) => b.tokens - a.tokens || new Date(a.createdAt) - new Date(b.createdAt))
        .slice(0, limit);
    },
    async saveProgress(playerId, name, state) {
      progress.set(playerId, { playerId, name, state, updatedAt: new Date().toISOString() });
    },
    async getProgress(playerId) {
      return progress.get(playerId) ?? null;
    },
  };
}
