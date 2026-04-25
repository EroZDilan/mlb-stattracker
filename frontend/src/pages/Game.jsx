import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { api } from "../api";
import { useGsapReveal, useGsapStagger } from "../hooks/useGsapReveal";

function StatRow({ label, value, highlight }) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-white/5 last:border-0
      ${highlight ? "bg-mlb-red/5 -mx-4 px-4 rounded" : ""}`}
      data-stagger
    >
      <span className="text-white/60 text-sm">{label}</span>
      <span className="text-white font-semibold tabular-nums">{value ?? "—"}</span>
    </div>
  );
}

function PlayerCard({ player }) {
  return (
    <div data-stagger className="card p-3 hover:border-mlb-red/30 transition-colors">
      <Link to={`/player/${player.player_id}`} className="block">
        <div className="font-semibold text-sm truncate mb-2 hover:text-mlb-red transition-colors">
          {player.player_name}
        </div>
        {player.type === "hitting" ? (
          <div className="grid grid-cols-4 gap-1 text-xs">
            {[["AB", player.at_bats], ["H", player.hits], ["HR", player.home_runs], ["RBI", player.rbi]].map(([k, v]) => (
              <div key={k} className="text-center">
                <div className="text-white/40 text-[10px]">{k}</div>
                <div className={`font-bold ${k === "H" && v > 0 ? "text-mlb-win" : "text-white"}`}>{v ?? 0}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1 text-xs">
            {[["IP", player.innings_pitched], ["ER", player.earned_runs], ["K", player.strikeouts], ["ERA", player.era?.toFixed(2)]].map(([k, v]) => (
              <div key={k} className="text-center">
                <div className="text-white/40 text-[10px]">{k}</div>
                <div className="font-bold text-white">{v ?? "—"}</div>
              </div>
            ))}
          </div>
        )}
      </Link>
    </div>
  );
}

export default function Game() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["game", id],
    queryFn: () => api.game(Number(id)),
  });

  const headerRef = useGsapReveal({ y: 15 });
  const statsRef = useGsapStagger({ deps: data });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-16">
        <div className="h-32 card animate-pulse mb-6" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 card animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { game, stats, probable_pitchers } = data;
  const homeStats = stats.filter((s) => s.team === game.home_team && s.type === "hitting");
  const awayStats = stats.filter((s) => s.team === game.away_team && s.type === "hitting");
  const homePitching = stats.filter((s) => s.team === game.home_team && s.type === "pitching");
  const awayPitching = stats.filter((s) => s.team === game.away_team && s.type === "pitching");

  const isFinal = game.status?.toLowerCase().includes("final");
  const homeWon = isFinal && game.home_score > game.away_score;
  const awayWon = isFinal && game.away_score > game.home_score;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-16">
      <Link to="/" className="text-white/40 hover:text-white text-sm mb-6 inline-block transition-colors">
        ← Volver
      </Link>

      {/* Score card */}
      <div ref={headerRef} className="card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className={`text-center flex-1 ${awayWon ? "" : "opacity-60"}`}>
            <div className="font-display text-2xl font-bold mb-1">{game.away_team}</div>
            <div className="font-display text-6xl font-black text-mlb-red">{game.away_score ?? "—"}</div>
          </div>

          <div className="text-center px-6">
            <div className="text-white/30 text-xs uppercase tracking-widest mb-1">VS</div>
            {isFinal
              ? <span className="badge-final">FINAL</span>
              : <span className="badge-live">EN VIVO</span>
            }
            {game.venue && <div className="text-white/30 text-xs mt-2">{game.venue}</div>}
          </div>

          <div className={`text-center flex-1 ${homeWon ? "" : "opacity-60"}`}>
            <div className="font-display text-2xl font-bold mb-1">{game.home_team}</div>
            <div className="font-display text-6xl font-black text-mlb-red">{game.home_score ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* Probable pitchers */}
      {probable_pitchers?.length > 0 && (
        <div className="card p-4 mb-6">
          <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Pitchers Probables</h3>
          <div className="flex justify-around">
            {probable_pitchers.map((p) => (
              <div key={p.id} className="text-center">
                <div className="font-semibold text-sm">{p.pitcher_name}</div>
                <div className="text-white/40 text-xs">{p.team}</div>
                <div className="text-white/60 text-xs mt-1">ERA {p.era ?? "—"} | {p.season_wins ?? 0}-{p.season_losses ?? 0}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Box scores */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            { label: game.away_team, batting: awayStats, pitching: awayPitching },
            { label: game.home_team, batting: homeStats, pitching: homePitching },
          ].map(({ label, batting, pitching }) => (
            <div key={label}>
              <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">{label}</h3>

              {batting.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-mlb-red font-semibold mb-2">BATEO</div>
                  <div ref={statsRef} className="flex flex-col gap-2">
                    {batting.map((p) => <PlayerCard key={p.id} player={p} />)}
                  </div>
                </div>
              )}

              {pitching.length > 0 && (
                <div>
                  <div className="text-xs text-mlb-red font-semibold mb-2">PITCHEO</div>
                  <div className="flex flex-col gap-2">
                    {pitching.map((p) => <PlayerCard key={p.id} player={p} />)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
