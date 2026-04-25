import httpx
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from config import MLB_API_BASE
from database.db import get_db


async def fetch_games(date: str) -> list[dict]:
    """Fetch all games for a given date (YYYY-MM-DD)."""
    url = f"{MLB_API_BASE}/schedule"
    params = {
        "sportId": 1,
        "date": date,
        "hydrate": "team,linescore,decisions,probablePitcher",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    games = []
    for date_entry in data.get("dates", []):
        for g in date_entry.get("games", []):
            games.append({
                "game_id": g["gamePk"],
                "date": date,
                "home_team": g["teams"]["home"]["team"]["name"],
                "away_team": g["teams"]["away"]["team"]["name"],
                "home_team_id": g["teams"]["home"]["team"]["id"],
                "away_team_id": g["teams"]["away"]["team"]["id"],
                "home_score": g["teams"]["home"].get("score"),
                "away_score": g["teams"]["away"].get("score"),
                "status": g["status"]["detailedState"],
                "venue": g.get("venue", {}).get("name"),
                "game_type": g.get("gameType", "R"),
            })
    return games


async def save_games(games: list[dict]):
    with get_db() as conn:
        for g in games:
            conn.execute(
                """
                INSERT INTO games (game_id, date, home_team, away_team, home_team_id,
                    away_team_id, home_score, away_score, status, venue, game_type)
                VALUES (:game_id, :date, :home_team, :away_team, :home_team_id,
                    :away_team_id, :home_score, :away_score, :status, :venue, :game_type)
                ON CONFLICT(game_id) DO UPDATE SET
                    home_score=excluded.home_score,
                    away_score=excluded.away_score,
                    status=excluded.status
                """,
                g,
            )


async def fetch_boxscore(game_id: int) -> dict:
    """Fetch full boxscore for a game."""
    url = f"{MLB_API_BASE}/game/{game_id}/boxscore"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


def _parse_batting(player_data: dict, game_id: int, team: str, team_id: int) -> dict | None:
    stats = player_data.get("stats", {}).get("batting", {})
    if not stats:
        return None
    info = player_data.get("person", {})
    return {
        "game_id": game_id,
        "player_id": info.get("id"),
        "player_name": info.get("fullName"),
        "team": team,
        "team_id": team_id,
        "type": "hitting",
        "at_bats": stats.get("atBats", 0),
        "hits": stats.get("hits", 0),
        "runs": stats.get("runs", 0),
        "rbi": stats.get("rbi", 0),
        "home_runs": stats.get("homeRuns", 0),
        "doubles": stats.get("doubles", 0),
        "triples": stats.get("triples", 0),
        "strikeouts": stats.get("strikeOuts", 0),
        "walks": stats.get("baseOnBalls", 0),
        "avg": float(stats.get("avg", 0) or 0),
    }


def _parse_pitching(player_data: dict, game_id: int, team: str, team_id: int) -> dict | None:
    stats = player_data.get("stats", {}).get("pitching", {})
    if not stats or not stats.get("inningsPitched"):
        return None
    info = player_data.get("person", {})
    ip_str = stats.get("inningsPitched", "0.0")
    try:
        ip = float(ip_str)
    except (ValueError, TypeError):
        ip = 0.0
    return {
        "game_id": game_id,
        "player_id": info.get("id"),
        "player_name": info.get("fullName"),
        "team": team,
        "team_id": team_id,
        "type": "pitching",
        "innings_pitched": ip,
        "earned_runs": stats.get("earnedRuns", 0),
        "era": float(stats.get("era", 0) or 0),
        "pitches": stats.get("pitchesThrown", 0) or stats.get("numberOfPitches", 0),
        "strikes": stats.get("strikes", 0),
        "strikeouts": stats.get("strikeOuts", 0),
        "walks": stats.get("baseOnBalls", 0),
        "hits": stats.get("hits", 0),
        "runs": stats.get("runs", 0),
    }


async def save_boxscore(game_id: int, boxscore: dict):
    teams = boxscore.get("teams", {})
    rows = []
    for side in ("home", "away"):
        team_data = teams.get(side, {})
        team_name = team_data.get("team", {}).get("name", "")
        team_id = team_data.get("team", {}).get("id", 0)
        for player_data in team_data.get("players", {}).values():
            row = _parse_batting(player_data, game_id, team_name, team_id)
            if row:
                rows.append(row)
            row = _parse_pitching(player_data, game_id, team_name, team_id)
            if row:
                rows.append(row)

    with get_db() as conn:
        for r in rows:
            cols = ", ".join(r.keys())
            placeholders = ", ".join(f":{k}" for k in r.keys())
            update_cols = ", ".join(
                f"{k}=excluded.{k}" for k in r.keys() if k not in ("game_id", "player_id", "type")
            )
            conn.execute(
                f"""
                INSERT INTO player_game_stats ({cols})
                VALUES ({placeholders})
                ON CONFLICT(game_id, player_id, type) DO UPDATE SET {update_cols}
                """,
                r,
            )
