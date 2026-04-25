import httpx
from datetime import date, timedelta
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from config import MLB_API_BASE
from database.db import get_db


async def fetch_probable_pitchers(target_date: str) -> list[dict]:
    """Fetch probable pitchers for a given date."""
    url = f"{MLB_API_BASE}/schedule"
    params = {
        "sportId": 1,
        "date": target_date,
        "hydrate": "probablePitcher(note),team",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    pitchers = []
    for date_entry in data.get("dates", []):
        for g in date_entry.get("games", []):
            game_id = g["gamePk"]
            for side in ("home", "away"):
                team = g["teams"][side]
                probable = team.get("probablePitcher")
                if not probable:
                    continue
                pitcher_id = probable["id"]
                pitcher_stats = await _fetch_pitcher_current_stats(pitcher_id)
                pitchers.append({
                    "game_id": game_id,
                    "date": target_date,
                    "team": team["team"]["name"],
                    "team_id": team["team"]["id"],
                    "pitcher_id": pitcher_id,
                    "pitcher_name": probable.get("fullName", ""),
                    "era": pitcher_stats.get("era"),
                    "season_wins": pitcher_stats.get("wins"),
                    "season_losses": pitcher_stats.get("losses"),
                })
    return pitchers


async def _fetch_pitcher_current_stats(pitcher_id: int) -> dict:
    url = f"{MLB_API_BASE}/people/{pitcher_id}/stats"
    params = {"stats": "season", "group": "pitching"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        for stat_group in data.get("stats", []):
            splits = stat_group.get("splits", [])
            if splits:
                s = splits[0].get("stat", {})
                return {
                    "era": float(s.get("era", 0) or 0),
                    "wins": s.get("wins", 0),
                    "losses": s.get("losses", 0),
                    "whip": float(s.get("whip", 0) or 0),
                    "strikeouts": s.get("strikeOuts", 0),
                    "innings_pitched": float(s.get("inningsPitched", 0) or 0),
                }
    except Exception:
        pass
    return {}


async def save_probable_pitchers(pitchers: list[dict]):
    with get_db() as conn:
        for p in pitchers:
            conn.execute(
                """
                INSERT INTO probable_pitchers
                    (game_id, date, team, team_id, pitcher_id, pitcher_name, era, season_wins, season_losses)
                VALUES (:game_id, :date, :team, :team_id, :pitcher_id, :pitcher_name, :era, :season_wins, :season_losses)
                ON CONFLICT(game_id, team_id) DO UPDATE SET
                    pitcher_id=excluded.pitcher_id,
                    pitcher_name=excluded.pitcher_name,
                    era=excluded.era,
                    season_wins=excluded.season_wins,
                    season_losses=excluded.season_losses
                """,
                p,
            )


async def fetch_pitcher_last_n_starts(pitcher_id: int, n: int = 5) -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT pgs.*, g.date
            FROM player_game_stats pgs
            JOIN games g ON g.game_id = pgs.game_id
            WHERE pgs.player_id = ? AND pgs.type = 'pitching'
            ORDER BY g.date DESC
            LIMIT ?
            """,
            (pitcher_id, n),
        ).fetchall()
    return [dict(r) for r in rows]
