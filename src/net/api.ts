// Tiny same-origin API client. Works when the Fastify server hosts the built game
// (or via the Vite dev proxy). All calls fail soft so the game stays playable offline.
export interface ScorePayload {
  name: string;
  tokens: number;
  durationMs: number;
  weaponUsage: Record<string, number>;
}
export interface ScoreRow extends ScorePayload {
  id: number;
  createdAt: string;
}

const BASE = "/api";

function playerId(): string {
  let id = localStorage.getItem("tq_player_id");
  if (!id) {
    id = crypto.randomUUID?.() ?? `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("tq_player_id", id);
  }
  return id;
}

export function getPlayerName(): string {
  return localStorage.getItem("tq_player_name") ?? "";
}
export function setPlayerName(name: string): void {
  localStorage.setItem("tq_player_name", name.slice(0, 24));
}
export function getPlayerId(): string {
  return playerId();
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function submitScore(p: ScorePayload): Promise<ScoreRow> {
  const res = await fetch(`${BASE}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  const { score } = await json<{ score: ScoreRow }>(res);
  return score;
}

export async function fetchLeaderboard(limit = 20): Promise<ScoreRow[]> {
  const res = await fetch(`${BASE}/leaderboard?limit=${limit}`);
  const { scores } = await json<{ scores: ScoreRow[] }>(res);
  return scores;
}

// Best-effort; never throws to the caller.
export async function saveProgress(state: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${BASE}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: playerId(), name: getPlayerName() || "Anón", state }),
    });
  } catch {
    /* offline — ignore */
  }
}
