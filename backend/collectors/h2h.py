import httpx
from datetime import datetime
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from config import MLB_API_BASE
from database.db import get_db


async def fetch_h2h(batter_id: int, pitcher_id: int) -> dict:
    """Fetch batter vs pitcher historical stats from MLB API."""
    url = f"{MLB_API_BASE}/people/{batter_id}/stats"
    params = {
        "stats": "vsPlayer",
        "opposingPlayerId": pitcher_id,
        "group": "hitting",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    result = {
        "batter_id": batter_id,
        "pitcher_id": pitcher_id,
        "at_bats": 0,
        "hits": 0,
        "home_runs": 0,
        "avg": 0.0,
        "last_updated": datetime.utcnow().isoformat(),
    }

    for stat_group in data.get("stats", []):
        splits = stat_group.get("splits", [])
        if splits:
            s = splits[0].get("stat", {})
            result["at_bats"] = s.get("atBats", 0)
            result["hits"] = s.get("hits", 0)
            result["home_runs"] = s.get("homeRuns", 0)
            result["avg"] = float(s.get("avg", 0) or 0)
            break

    return result


async def save_h2h(batter_id: int, pitcher_id: int, batter_name: str, pitcher_name: str, stats: dict):
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO batter_vs_pitcher
                (batter_id, pitcher_id, batter_name, pitcher_name, at_bats, hits, home_runs, avg, last_updated)
            VALUES (:batter_id, :pitcher_id, :batter_name, :pitcher_name, :at_bats, :hits, :home_runs, :avg, :last_updated)
            ON CONFLICT(batter_id, pitcher_id) DO UPDATE SET
                at_bats=excluded.at_bats,
                hits=excluded.hits,
                home_runs=excluded.home_runs,
                avg=excluded.avg,
                last_updated=excluded.last_updated
            """,
            {**stats, "batter_name": batter_name, "pitcher_name": pitcher_name},
        )


async def get_h2h_from_db(batter_id: int, pitcher_id: int) -> dict | None:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM batter_vs_pitcher WHERE batter_id=? AND pitcher_id=?",
            (batter_id, pitcher_id),
        ).fetchone()
    return dict(row) if row else None


async def update_h2h_for_game(game_id: int):
    """Update H2H stats for all matchups in a game based on stored boxscore data."""
    with get_db() as conn:
        batters = conn.execute(
            "SELECT DISTINCT player_id, player_name, team_id FROM player_game_stats WHERE game_id=? AND type='hitting'",
            (game_id,),
        ).fetchall()
        game = conn.execute(
            "SELECT home_team_id, away_team_id FROM games WHERE game_id=?",
            (game_id,),
        ).fetchone()

    if not game:
        return

    home_id, away_id = game["home_team_id"], game["away_team_id"]

    with get_db() as conn:
        home_pitchers = conn.execute(
            "SELECT DISTINCT player_id, player_name FROM player_game_stats WHERE game_id=? AND type='pitching' AND team_id=?",
            (game_id, home_id),
        ).fetchall()
        away_pitchers = conn.execute(
            "SELECT DISTINCT player_id, player_name FROM player_game_stats WHERE game_id=? AND type='pitching' AND team_id=?",
            (game_id, away_id),
        ).fetchall()

    for batter in batters:
        opposing_pitchers = home_pitchers if batter["team_id"] == away_id else away_pitchers
        for pitcher in opposing_pitchers:
            try:
                stats = await fetch_h2h(batter["player_id"], pitcher["player_id"])
                await save_h2h(
                    batter["player_id"],
                    pitcher["player_id"],
                    batter["player_name"],
                    pitcher["player_name"],
                    stats,
                )
            except Exception:
                pass
