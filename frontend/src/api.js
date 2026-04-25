const BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  games: (date) => get(`/games${date ? `?date=${date}` : ""}`),
  game: (id) => get(`/games/${id}`),
  probables: (date) => get(`/probables${date ? `?date=${date}` : ""}`),
  standings: () => get("/standings"),
  predictions: (date) => get(`/predictions${date ? `?date=${date}` : ""}`),
  predictionAccuracy: () => get("/predictions/accuracy"),
  player: (id) => get(`/players/${id}`),
  playerVsPitchers: (id) => get(`/players/${id}/vs-pitchers`),
  playerVsBatters: (id) => get(`/players/${id}/vs-batters`),
  h2h: (batterId, pitcherId) => get(`/players/${batterId}/h2h/${pitcherId}`),
  searchPlayers: (q) => get(`/players/search?q=${encodeURIComponent(q)}`),
  teams: () => get("/teams"),
  roster: (teamId) => get(`/teams/${teamId}/roster`),
  // Leaders
  battingLeaders: (sort = "battingAverage", limit = 200) =>
    get(`/leaders/batting?sort=${sort}&limit=${limit}`),
  pitchingLeaders: (sort = "era", limit = 100) =>
    get(`/leaders/pitching?sort=${sort}&limit=${limit}`),
  // Calendar
  calendar: (year, month) => get(`/calendar?year=${year}&month=${month}`),
  backfill: (start, end) => {
    return fetch(`${BASE}/collect/backfill?start_date=${start}&end_date=${end}`, { method: "POST" })
      .then(r => r.json());
  },
  backfillRange: (start, end) => {
    return fetch(`${BASE}/collect/backfill?start_date=${start}&end_date=${end}`, { method: "POST" })
      .then(r => r.json());
  },
};
