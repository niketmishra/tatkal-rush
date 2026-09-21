// Leaderboard: Supabase PostgREST when configured, this device otherwise.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const RUNS_KEY = "tatkal_runs";
const NAME_KEY = "tatkal_name";
const NAME_RE = /^[A-Za-z0-9._ ]{2,16}$/;

export const remoteEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const cleanName = raw => {
  const n = (raw || "").trim().replace(/\s+/g, " ");
  return NAME_RE.test(n) ? n : null;
};
export const getSavedName = () => localStorage.getItem(NAME_KEY) || "";
export const saveName = n => localStorage.setItem(NAME_KEY, n);

function localRuns() {
  try { return JSON.parse(localStorage.getItem(RUNS_KEY)) || []; } catch { return []; }
}
export function saveLocalRun(run) {
  const runs = [...localRuns(), run].sort((a, b) => b.score - a.score || b.tickets - a.tickets).slice(0, 30);
  localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
}
export function getLocalBest(mode) {
  return localRuns().filter(r => r.mode === mode).reduce((m, r) => Math.max(m, r.score), 0);
}
function localBoard(mode, scope) {
  const today = new Date().toDateString();
  return localRuns()
    .filter(r => r.mode === mode && (scope === "all" || new Date(r.at).toDateString() === today))
    .sort((a, b) => b.score - a.score || b.tickets - a.tickets)
    .map(r => ({ name: r.name || "You", score: r.score, tickets: r.tickets }));
}

const headers = () => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
});

// scope: "today" | "all". Returns { rows, remote }.
export async function fetchBoard(mode, scope, limit = 50) {
  if (remoteEnabled) {
    try {
      const view = scope === "today" ? "tatkal_board_today" : "tatkal_board";
      const url = `${SUPABASE_URL}/rest/v1/${view}?select=name,score,tickets&mode=eq.${mode}&order=score.desc,tickets.desc&limit=${limit}`;
      const res = await fetch(url, { headers: headers() });
      if (res.ok) return { rows: await res.json(), remote: true };
    } catch { /* fall through to local */ }
  }
  return { rows: localBoard(mode, scope), remote: false };
}

export async function submitScore({ name, score, tickets, perfect, mode }) {
  if (!remoteEnabled || score < 1) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tatkal_scores`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name, score, tickets, perfect, mode }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
