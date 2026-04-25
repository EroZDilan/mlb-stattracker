import httpx
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from config import MLB_API_BASE
from database.db import get_db


async def fetch_player_season_stats(player_id: int, season: int = 2025) -> dict:
    url = f"{MLB_API_BASE}/people/{player_id}/stats"
    params = {"stats": "season", "group": "hitting,pitching", "season": season}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()


async def fetch_player_last_n_games(player_id: int, n: int = 15) -> list[dict]:
    """Get player stats from last N games stored in local DB."""
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT pgs.*, g.date, g.home_team, g.away_team
            FROM player_game_stats pgs
            JOIN games g ON g.game_id = pgs.game_id
            WHERE pgs.player_id = ? AND pgs.type = 'hitting'
            ORDER BY g.date DESC
            LIMIT ?
            """,
            (player_id, n),
        ).fetchall()
    return [dict(r) for r in rows]


async def fetch_player_info(player_id: int) -> dict:
    url = f"{MLB_API_BASE}/people/{player_id}"
    params = {"hydrate": "currentTeam"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    people = data.get("people", [])
    return people[0] if people else {}


async def search_players(name: str) -> list[dict]:
    url = f"{MLB_API_BASE}/people/search"
    params = {"names": name, "sportId": 1}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    return data.get("people", [])


async def fetch_team_roster(team_id: int) -> list[dict]:
    url = f"{MLB_API_BASE}/teams/{team_id}/roster"
    params = {"rosterType": "active"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    return data.get("roster", [])
