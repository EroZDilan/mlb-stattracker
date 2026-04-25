"""
AI predictor — uses Claude API to generate daily player performance predictions.
Run as: python predictor.py --mode=generate [--date=YYYY-MM-DD]
"""

import asyncio
import json
import sys
import os
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import anthropic
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL
from database.db import get_db, init_db
from collectors.players import fetch_player_last_n_games
from collectors.pitchers import fetch_pitcher_last_n_starts
from collectors.h2h import get_h2h_from_db, fetch_h2h, save_h2h


client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def _build_prompt(batter: dict, pitcher: dict, h2h: dict, recent_batter: list, recent_pitcher: list) -> str:
    recent_b_str = ""
    if recent_batter:
        totals = {
            "games": len(recent_batter),
            "hits": sum(g.get("hits", 0) for g in recent_batter),
            "ab": sum(g.get("at_bats", 0) for g in recent_batter),
            "hr": sum(g.get("home_runs", 0) for g in recent_batter),
            "r": sum(g.get("runs", 0) for g in recent_batter),
        }
        avg = round(totals["hits"] / totals["ab"], 3) if totals["ab"] else 0
        recent_b_str = (
            f"- Últimos {totals['games']} juegos: AVG {avg}, "
            f"{totals['hits']} H, {totals['r']} R, {totals['hr']} HR"
        )

    recent_p_str = ""
    if recent_pitcher:
        totals_p = {
            "starts": len(recent_pitcher),
            "er": sum(g.get("earned_runs", 0) for g in recent_pitcher),
            "ip": sum(g.get("innings_pitched", 0) for g in recent_pitcher),
            "k": sum(g.get("strikeouts", 0) for g in recent_pitcher),
        }
        era_recent = round((totals_p["er"] * 9) / totals_p["ip"], 2) if totals_p["ip"] else 0
        recent_p_str = (
            f"- Últimas {totals_p['starts']} salidas: ERA {era_recent}, "
            f"{totals_p['k']} K en {totals_p['ip']} IP"
        )

    h2h_str = (
        f"- Historial H2H: {h2h.get('at_bats', 0)} AB, "
        f"{h2h.get('hits', 0)} H, {h2h.get('home_runs', 0)} HR, "
        f"AVG {h2h.get('avg', 0):.3f}"
    ) if h2h else "- Sin historial H2H registrado"

    return f"""Eres un analista experto en béisbol de MLB. Analiza el siguiente matchup y predice el rendimiento del bateador para el juego de hoy.

BATEADOR: {batter.get('player_name', 'Unknown')} ({batter.get('team', '')})
{recent_b_str}
{h2h_str}

PITCHER: {pitcher.get('pitcher_name', 'Unknown')} ({pitcher.get('team', '')})
- ERA temporada: {pitcher.get('era', 'N/A')} | W-L: {pitcher.get('season_wins', 0)}-{pitcher.get('season_losses', 0)}
{recent_p_str}

Responde ÚNICAMENTE en JSON válido con exactamente estas claves:
{{
  "predicted_hits": <número decimal 0-4>,
  "predicted_runs": <número decimal 0-3>,
  "home_run_probability": <decimal 0-1>,
  "confidence": <decimal 0-1>,
  "reasoning": "<2 oraciones máximo explicando la predicción>"
}}"""


async def generate_predictions_for_date(target_date: str | None = None):
    if not target_date:
        target_date = date.today().isoformat()

    print(f"[predictor] Generating predictions for {target_date}")

    with get_db() as conn:
        probables = conn.execute(
            "SELECT * FROM probable_pitchers WHERE date=?",
            (target_date,),
        ).fetchall()
        games = conn.execute(
            "SELECT * FROM games WHERE date=?",
            (target_date,),
        ).fetchall()

    if not probables:
        print("[predictor] No probable pitchers found, skipping")
        return

    game_map = {g["game_id"]: g for g in games}
    pitchers_by_game: dict[int, list] = {}
    for p in probables:
        pitchers_by_game.setdefault(p["game_id"], []).append(dict(p))

    predictions_generated = 0

    for game_id, game_pitchers in pitchers_by_game.items():
        game = game_map.get(game_id)
        if not game:
            continue

        for pitcher_entry in game_pitchers:
            pitcher_team_id = pitcher_entry["team_id"]
            opposing_team_id = (
                game["away_team_id"] if pitcher_team_id == game["home_team_id"] else game["home_team_id"]
            )

            with get_db() as conn:
                batters = conn.execute(
                    """
                    SELECT DISTINCT player_id, player_name, team
                    FROM player_game_stats
                    WHERE team_id=? AND type='hitting'
                    ORDER BY (SELECT MAX(g.date) FROM games g WHERE g.game_id = player_game_stats.game_id) DESC
                    LIMIT 9
                    """,
                    (opposing_team_id,),
                ).fetchall()

            for batter_row in batters:
                batter = dict(batter_row)
                pitcher_id = pitcher_entry["pitcher_id"]
                batter_id = batter["player_id"]

                h2h = await get_h2h_from_db(batter_id, pitcher_id)
                if not h2h:
                    try:
                        h2h = await fetch_h2h(batter_id, pitcher_id)
                        await save_h2h(batter_id, pitcher_id, batter["player_name"], pitcher_entry["pitcher_name"], h2h)
                    except Exception:
                        h2h = {}

                recent_batter = await fetch_player_last_n_games(batter_id, 15)
                recent_pitcher = await fetch_pitcher_last_n_starts(pitcher_id, 5)

                prompt = _build_prompt(batter, pitcher_entry, h2h, recent_batter, recent_pitcher)

                try:
                    message = client.messages.create(
                        model=CLAUDE_MODEL,
                        max_tokens=256,
                        messages=[{"role": "user", "content": prompt}],
                        system="Responds only with valid JSON. No markdown, no explanation outside JSON.",
                    )
                    raw = message.content[0].text.strip()
                    pred = json.loads(raw)

                    with get_db() as conn:
                        conn.execute(
                            """
                            INSERT INTO predictions
                                (date, player_id, player_name, predicted_hits, predicted_runs,
                                 predicted_hr, confidence, reasoning, opposing_pitcher_id, opposing_pitcher_name)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                target_date,
                                batter_id,
                                batter["player_name"],
                                pred.get("predicted_hits", 0),
                                pred.get("predicted_runs", 0),
                                pred.get("home_run_probability", 0),
                                pred.get("confidence", 0),
                                pred.get("reasoning", ""),
                                pitcher_id,
                                pitcher_entry["pitcher_name"],
                            ),
                        )
                    predictions_generated += 1
                    print(f"[predictor] ✓ {batter['player_name']} vs {pitcher_entry['pitcher_name']}")

                except Exception as e:
                    print(f"[predictor] ✗ {batter['player_name']} failed: {e}")

    print(f"[predictor] Done. {predictions_generated} predictions generated.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["generate"], required=True)
    parser.add_argument("--date", help="YYYY-MM-DD")
    args = parser.parse_args()

    init_db()
    asyncio.run(generate_predictions_for_date(args.date))
