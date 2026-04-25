from fastapi import APIRouter, HTTPException, Query
from datetime import date
import httpx
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database.db import get_db
from collectors.games import fetch_games, save_games, fetch_boxscore, save_boxscore
from collectors.pitchers import fetch_probable_pitchers, save_probable_pitchers
from collectors.players import fetch_player_info, fetch_player_last_n_games, search_players, fetch_team_roster, fetch_player_season_stats
from collectors.pitchers import fetch_pitcher_last_n_starts
from collectors.h2h import get_h2h_from_db, fetch_h2h, save_h2h
from config import MLB_API_BASE

router = APIRouter()


# ─── Games ────────────────────────────────────────────────────────────────────

def _all_final(rows) -> bool:
    """True only when every game in rows has a finished status."""
    if not rows:
        return False
    terminal = ("final", "game over", "completed", "postponed", "cancelled", "suspended")
    return all(any(t in (r["status"] or "").lower() for t in terminal) for r in rows)


@router.get("/games")
async def get_games(target_date: str = Query(default=None, alias="date")):
    if not target_date:
        target_date = date.today().isoformat()

    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM games WHERE date=? ORDER BY game_id",
            (target_date,),
        ).fetchall()

    # Re-fetch from MLB API if we have no data, or if some games are not yet finished
    if not rows or not _all_final(rows):
        games = await fetch_games(target_date)
        await save_games(games)
        with get_db() as conn:
            rows = conn.execute(
                "SELECT * FROM games WHERE date=? ORDER BY game_id",
                (target_date,),
            ).fetchall()

    return [dict(r) for r in rows]


@router.get("/games/{game_id}")
async def get_game_detail(game_id: int):
    with get_db() as conn:
        game = conn.execute("SELECT * FROM games WHERE game_id=?", (game_id,)).fetchone()
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")

        stats = conn.execute(
            "SELECT * FROM player_game_stats WHERE game_id=? ORDER BY type, hits DESC",
            (game_id,),
        ).fetchall()

        probables = conn.execute(
            "SELECT * FROM probable_pitchers WHERE game_id=?",
            (game_id,),
        ).fetchall()

    if not stats:
        try:
            boxscore = await fetch_boxscore(game_id)
            await save_boxscore(game_id, boxscore)
            with get_db() as conn:
                stats = conn.execute(
                    "SELECT * FROM player_game_stats WHERE game_id=? ORDER BY type, hits DESC",
                    (game_id,),
                ).fetchall()
        except Exception:
            pass

    return {
        "game": dict(game),
        "stats": [dict(s) for s in stats],
        "probable_pitchers": [dict(p) for p in probables],
    }


# ─── Players ──────────────────────────────────────────────────────────────────

@router.get("/players/search")
async def search(q: str = Query(min_length=2)):
    return await search_players(q)


@router.get("/players/{player_id}")
async def get_player(player_id: int):
    info = await fetch_player_info(player_id)
    if not info:
        raise HTTPException(status_code=404, detail="Player not found")

    pos_code = info.get("primaryPosition", {}).get("code", "")
    is_pitcher = pos_code == "1"

    recent_hitting = await fetch_player_last_n_games(player_id, 20)
    recent_pitching = await fetch_pitcher_last_n_starts(player_id, 10)

    # Season stats from MLB API
    season_stats = {}
    try:
        raw = await fetch_player_season_stats(player_id)
        for group in raw.get("stats", []):
            splits = group.get("splits", [])
            if splits:
                stat_group = group.get("group", {}).get("displayName", "")
                season_stats[stat_group] = splits[0].get("stat", {})
    except Exception:
        pass

    return {
        "info": info,
        "is_pitcher": is_pitcher,
        "recent_games": recent_hitting,
        "recent_pitching": recent_pitching,
        "season_stats": season_stats,
    }


@router.get("/players/{player_id}/h2h/{pitcher_id}")
async def get_h2h(player_id: int, pitcher_id: int):
    cached = await get_h2h_from_db(player_id, pitcher_id)
    if cached:
        return cached
    try:
        stats = await fetch_h2h(player_id, pitcher_id)
        await save_h2h(player_id, pitcher_id, "", "", stats)
        return stats
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/players/{player_id}/vs-pitchers")
async def get_player_vs_pitchers(player_id: int):
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT * FROM batter_vs_pitcher
            WHERE batter_id=? AND at_bats >= 3
            ORDER BY at_bats DESC
            """,
            (player_id,),
        ).fetchall()
    return [dict(r) for r in rows]


@router.get("/players/{player_id}/vs-batters")
async def get_pitcher_vs_batters(player_id: int):
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT * FROM batter_vs_pitcher
            WHERE pitcher_id=? AND at_bats >= 3
            ORDER BY at_bats DESC
            """,
            (player_id,),
        ).fetchall()
    return [dict(r) for r in rows]


# ─── Standings ────────────────────────────────────────────────────────────────

@router.get("/standings")
async def get_standings(season: int = Query(default=2026)):
    url = f"{MLB_API_BASE}/standings"
    params = {"leagueId": "103,104", "season": season, "standingsTypes": "regularSeason"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    return data.get("records", [])


# ─── Probable pitchers ────────────────────────────────────────────────────────

@router.get("/probables")
async def get_probables(target_date: str = Query(default=None, alias="date")):
    if not target_date:
        target_date = date.today().isoformat()

    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM probable_pitchers WHERE date=?",
            (target_date,),
        ).fetchall()

    if not rows:
        pitchers = await fetch_probable_pitchers(target_date)
        await save_probable_pitchers(pitchers)
        with get_db() as conn:
            rows = conn.execute(
                "SELECT * FROM probable_pitchers WHERE date=?",
                (target_date,),
            ).fetchall()

    return [dict(r) for r in rows]


# ─── Predictions ──────────────────────────────────────────────────────────────

@router.get("/predictions")
async def get_predictions(target_date: str = Query(default=None, alias="date")):
    if not target_date:
        target_date = date.today().isoformat()

    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM predictions WHERE date=? ORDER BY confidence DESC",
            (target_date,),
        ).fetchall()

    return [dict(r) for r in rows]


@router.get("/predictions/accuracy")
async def get_prediction_accuracy():
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT
                COUNT(*) as total,
                AVG(ABS(predicted_hits - actual_hits)) as mae_hits,
                SUM(CASE WHEN predicted_hits >= 1 AND actual_hits >= 1 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as hit_rate
            FROM predictions
            WHERE actual_hits IS NOT NULL
            """,
        ).fetchone()
    return dict(rows) if rows else {}


# ─── Stats leaders ────────────────────────────────────────────────────────────

async def _fetch_leaders(group: str, sort_stat: str, season: int, limit: int, team_id: int | None) -> list[dict]:
    url = f"{MLB_API_BASE}/stats"
    params = {
        "stats": "season",
        "group": group,
        "sportId": 1,
        "season": season,
        "sortStat": sort_stat,
        "limit": limit,
        "gameType": "R",
        "playerPool": "ALL",
    }
    if team_id:
        params["teamId"] = team_id
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    results = []
    for group_data in data.get("stats", []):
        for split in group_data.get("splits", []):
            player = split.get("player", {})
            team = split.get("team", {})
            results.append({
                "player_id": player.get("id"),
                "player_name": player.get("fullName"),
                "team_id": team.get("id"),
                "team_name": team.get("name"),
                **split.get("stat", {}),
            })
    return results


@router.get("/leaders/batting")
async def get_batting_leaders(
    season: int = Query(default=2026),
    sort: str = Query(default="battingAverage"),
    limit: int = Query(default=100, le=250),
    team_id: int = Query(default=None),
):
    return await _fetch_leaders("hitting", sort, season, limit, team_id)


@router.get("/leaders/pitching")
async def get_pitching_leaders(
    season: int = Query(default=2026),
    sort: str = Query(default="era"),
    limit: int = Query(default=100, le=250),
    team_id: int = Query(default=None),
):
    return await _fetch_leaders("pitching", sort, season, limit, team_id)


# ─── Calendar ─────────────────────────────────────────────────────────────────

@router.get("/calendar")
async def get_calendar(year: int = Query(default=2026), month: int = Query(default=None)):
    import calendar as cal_mod
    if not month:
        month = date.today().month

    first_day = date(year, month, 1)
    last_day = date(year, month, cal_mod.monthrange(year, month)[1])

    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT date,
                   COUNT(*) as total,
                   SUM(CASE WHEN status LIKE '%Final%' THEN 1 ELSE 0 END) as finished
            FROM games
            WHERE date >= ? AND date <= ?
            GROUP BY date
            """,
            (first_day.isoformat(), last_day.isoformat()),
        ).fetchall()
    db_data = {r["date"]: {"total": r["total"], "finished": r["finished"]} for r in rows}

    url = f"{MLB_API_BASE}/schedule"
    params = {
        "sportId": 1,
        "startDate": first_day.isoformat(),
        "endDate": last_day.isoformat(),
        "gameType": "R",
    }
    schedule_counts: dict[str, int] = {}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            sched = resp.json()
        for de in sched.get("dates", []):
            schedule_counts[de["date"]] = len(de.get("games", []))
    except Exception:
        pass

    all_dates = sorted(set(schedule_counts) | set(db_data))
    result = {}
    for d in all_dates:
        collected = db_data.get(d, {})
        result[d] = {
            "scheduled": schedule_counts.get(d, 0),
            "collected": collected.get("total", 0),
            "finished": collected.get("finished", 0),
            "has_data": collected.get("total", 0) > 0,
        }
    return result


@router.post("/collect/backfill")
async def backfill_range(start_date: str = Query(...), end_date: str = Query(...)):
    from collectors.daily_collector import collect_results
    from datetime import timedelta
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    if (end - start).days > 30:
        raise HTTPException(status_code=400, detail="Max 30 days per backfill request")

    async def _run():
        cur = start
        while cur <= end:
            await collect_results(cur.isoformat())
            cur += timedelta(days=1)

    asyncio.create_task(_run())
    return {"status": "started", "from": start_date, "to": end_date, "days": (end - start).days + 1}


# ─── Teams ────────────────────────────────────────────────────────────────────

@router.get("/teams")
async def get_teams():
    url = f"{MLB_API_BASE}/teams"
    params = {"sportId": 1, "activeStatus": "Y", "season": 2026}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    # Only MLB active teams that belong to a division
    teams = [t for t in data.get("teams", []) if t.get("division") and t.get("sport", {}).get("id") == 1]
    return teams


@router.get("/teams/{team_id}/roster")
async def get_roster(team_id: int):
    return await fetch_team_roster(team_id)


# ─── Collect triggers (manual) ────────────────────────────────────────────────

@router.post("/collect/results")
async def trigger_collect_results(target_date: str = Query(default=None, alias="date")):
    from collectors.daily_collector import collect_results
    asyncio.create_task(collect_results(target_date))
    return {"status": "started", "date": target_date or "yesterday"}


@router.post("/collect/probables")
async def trigger_collect_probables(target_date: str = Query(default=None, alias="date")):
    from collectors.daily_collector import collect_probables
    import asyncio
    asyncio.create_task(collect_probables(target_date))
    return {"status": "started", "date": target_date or "today"}


import asyncio
