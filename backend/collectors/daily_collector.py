"""
Daily data collector — runs via APScheduler or directly from CLI.

Schedules:
  2:00 AM  — collect results from yesterday
  8:00 AM  — collect probable pitchers for today
  9:00 AM  — generate AI predictions (called from predictor.py)
"""

import asyncio
import sys
import os
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from collectors.games import fetch_games, save_games, fetch_boxscore, save_boxscore
from collectors.pitchers import fetch_probable_pitchers, save_probable_pitchers
from collectors.h2h import update_h2h_for_game
from database.db import get_db, init_db


async def collect_results(target_date: str | None = None):
    """2 AM job: fetch all games + boxscores for target_date (default: yesterday)."""
    if not target_date:
        target_date = (date.today() - timedelta(days=1)).isoformat()

    print(f"[collect_results] Collecting games for {target_date}")
    games = await fetch_games(target_date)
    if not games:
        print(f"[collect_results] No games found for {target_date}")
        return

    await save_games(games)
    print(f"[collect_results] Saved {len(games)} games")

    finished = [g for g in games if "Final" in g.get("status", "")]
    print(f"[collect_results] Fetching boxscores for {len(finished)} finished games")

    for g in finished:
        try:
            boxscore = await fetch_boxscore(g["game_id"])
            await save_boxscore(g["game_id"], boxscore)
            await update_h2h_for_game(g["game_id"])
            print(f"[collect_results] ✓ Game {g['game_id']}: {g['away_team']} @ {g['home_team']}")
        except Exception as e:
            print(f"[collect_results] ✗ Game {g['game_id']} failed: {e}")

    print(f"[collect_results] Done for {target_date}")


async def collect_probables(target_date: str | None = None):
    """8 AM job: fetch probable pitchers for today (or target_date)."""
    if not target_date:
        target_date = date.today().isoformat()

    print(f"[collect_probables] Fetching probable pitchers for {target_date}")
    try:
        pitchers = await fetch_probable_pitchers(target_date)
        await save_probable_pitchers(pitchers)
        print(f"[collect_probables] Saved {len(pitchers)} probable pitcher entries")
    except Exception as e:
        print(f"[collect_probables] Failed: {e}")


def start_scheduler():
    """Start APScheduler with all cron jobs."""
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger

    scheduler = AsyncIOScheduler()

    scheduler.add_job(
        collect_results,
        CronTrigger(hour=2, minute=0),
        id="collect_results",
        name="Collect yesterday results",
        misfire_grace_time=3600,
    )
    scheduler.add_job(
        collect_probables,
        CronTrigger(hour=8, minute=0),
        id="collect_probables",
        name="Collect probable pitchers",
        misfire_grace_time=3600,
    )

    scheduler.start()
    print("[scheduler] Started. Jobs: collect_results@2AM, collect_probables@8AM")
    return scheduler


# ─── CLI entry point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="MLB daily data collector")
    parser.add_argument("--mode", choices=["results", "probables", "scheduler"], required=True)
    parser.add_argument("--date", help="Target date YYYY-MM-DD (default: auto)")
    args = parser.parse_args()

    init_db()

    if args.mode == "results":
        asyncio.run(collect_results(args.date))
    elif args.mode == "probables":
        asyncio.run(collect_probables(args.date))
    elif args.mode == "scheduler":
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        start_scheduler()
        try:
            loop.run_forever()
        except KeyboardInterrupt:
            print("[scheduler] Stopped.")
