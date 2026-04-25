import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api";
import { useGsapReveal, useGsapStagger } from "../hooks/useGsapReveal";

const LEAGUE_NAMES = { 103: "American League", 104: "National League" };

function TeamRow({ team, rank }) {
  const gb = team.gamesBack === "-" ? "—" : team.gamesBack;
  return (
    <tr data-stagger className="border-t border-white/5 hover:bg-white/5 transition-colors">
      <td className="py-2.5 px-3 text-white/40 text-sm w-8">{rank}</td>
      <td className="py-2.5 px-3 font-semibold text-sm">{team.team?.name}</td>
      <td className="py-2.5 px-3 text-center text-sm tabular-nums">{team.wins}</td>
      <td className="py-2.5 px-3 text-center text-sm tabular-nums">{team.losses}</td>
      <td className="py-2.5 px-3 text-center text-sm tabular-nums text-white/60">{team.pct?.toFixed(3)}</td>
      <td className="py-2.5 px-3 text-center text-sm tabular-nums text-white/60">{gb}</td>
      <td className="py-2.5 px-3 text-center text-sm tabular-nums text-white/60">
        {team.streak?.streakCode ?? "—"}
      </td>
    </tr>
  );
}

function DivisionTable({ division, teams, containerRef }) {
  return (
    <div className="card overflow-hidden mb-4">
      <div className="px-4 py-3 bg-bg-accent/30 border-b border-white/5">
        <h3 className="font-display font-bold text-sm tracking-wider">{division}</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-white/30 text-xs uppercase tracking-wider">
            <th className="px-3 py-2 text-left w-8">#</th>
            <th className="px-3 py-2 text-left">Equipo</th>
            <th className="px-3 py-2 text-center">W</th>
            <th className="px-3 py-2 text-center">L</th>
            <th className="px-3 py-2 text-center">PCT</th>
            <th className="px-3 py-2 text-center">GB</th>
            <th className="px-3 py-2 text-center">Racha</th>
          </tr>
        </thead>
        <tbody ref={containerRef}>
          {teams.map((t, i) => <TeamRow key={t.team?.id} team={t} rank={i + 1} />)}
        </tbody>
      </table>
    </div>
  );
}

export default function Standings() {
  const [leagueId, setLeagueId] = useState(103);
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["standings"],
    queryFn: api.standings,
    staleTime: 600_000,
  });

  const headerRef = useGsapReveal({ y: 20 });
  const tableRef = useGsapStagger({ deps: records.length });

  const filtered = records.filter((r) => r.league?.id === leagueId);
  const byDivision = filtered.reduce((acc, r) => {
    const div = r.division?.name ?? "División";
    acc[div] = r.teamRecords ?? [];
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-16">
      <div ref={headerRef} className="mb-6">
        <h1 className="font-display text-4xl font-bold mb-4">Standings</h1>
        <div className="flex gap-2 bg-bg-card rounded-xl p-1 border border-white/5 w-fit">
          {[103, 104].map((id) => (
            <button
              key={id}
              onClick={() => setLeagueId(id)}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                ${leagueId === id ? "bg-mlb-red text-white" : "text-white/60 hover:text-white"}`}
            >
              {LEAGUE_NAMES[id]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 card animate-pulse" />)}
        </div>
      )}

      {!isLoading && Object.entries(byDivision).map(([div, teams]) => (
        <DivisionTable key={div} division={div} teams={teams} containerRef={tableRef} />
      ))}
    </div>
  );
}
