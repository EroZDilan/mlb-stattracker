import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { api } from "../api";

// ─── Config ───────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: "battingAverage", label: "AVG",  apiKey: "battingAverage" },
  { key: "homeRuns",       label: "HR",   apiKey: "homeRuns" },
  { key: "rbi",            label: "RBI",  apiKey: "rbi" },
  { key: "ops",            label: "OPS",  apiKey: "ops" },
  { key: "hits",           label: "H",    apiKey: "hits" },
  { key: "runs",           label: "R",    apiKey: "runs" },
  { key: "stolenBases",    label: "SB",   apiKey: "stolenBases" },
  { key: "baseOnBalls",    label: "BB",   apiKey: "baseOnBalls" },
  { key: "obp",            label: "OBP",  apiKey: "onBasePercentage" },
  { key: "slg",            label: "SLG",  apiKey: "sluggingPercentage" },
];

const STAT_COLS = [
  { key: "gamesPlayed",         label: "G",    fmt: v => v ?? 0 },
  { key: "atBats",              label: "AB",   fmt: v => v ?? 0 },
  { key: "hits",                label: "H",    fmt: v => v ?? 0 },
  { key: "doubles",             label: "2B",   fmt: v => v ?? 0 },
  { key: "triples",             label: "3B",   fmt: v => v ?? 0 },
  { key: "homeRuns",            label: "HR",   fmt: v => v ?? 0,  highlight: (v) => v >= 15 },
  { key: "rbi",                 label: "RBI",  fmt: v => v ?? 0,  highlight: (v) => v >= 50 },
  { key: "runs",                label: "R",    fmt: v => v ?? 0 },
  { key: "baseOnBalls",         label: "BB",   fmt: v => v ?? 0 },
  { key: "strikeOuts",          label: "K",    fmt: v => v ?? 0,  dim: (v) => v >= 80 },
  { key: "stolenBases",         label: "SB",   fmt: v => v ?? 0 },
  { key: "avg",                 label: "AVG",  fmt: v => v ? String(v).padEnd(5, "0") : ".000", highlight: (v) => parseFloat(v) >= 0.300 },
  { key: "obp",                 label: "OBP",  fmt: v => v ? String(v).padEnd(5, "0") : ".000", highlight: (v) => parseFloat(v) >= 0.370 },
  { key: "slg",                 label: "SLG",  fmt: v => v ? String(v).padEnd(5, "0") : ".000", highlight: (v) => parseFloat(v) >= 0.500 },
  { key: "ops",                 label: "OPS",  fmt: v => v ? String(v).padEnd(5, "0") : ".000", highlight: (v) => parseFloat(v) >= 0.900 },
];

const MLB_PHOTO = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;

const TEAM_LOGO = (id) =>
  `https://www.mlbstatic.com/team-logos/${id}.svg`;

// ─── Medal ────────────────────────────────────────────────────────────────────

function Rank({ n }) {
  if (n === 1) return <span className="font-display text-base font-black text-yellow-400">1</span>;
  if (n === 2) return <span className="font-display text-base font-black text-slate-300">2</span>;
  if (n === 3) return <span className="font-display text-base font-black text-amber-600">3</span>;
  return <span className="text-white/25 text-sm tabular-nums">{n}</span>;
}

// ─── Sort button ──────────────────────────────────────────────────────────────

function SortPill({ opt, active, onClick }) {
  return (
    <button
      onClick={() => onClick(opt.key)}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all duration-200
        ${active ? "bg-mlb-red text-white shadow-lg shadow-mlb-red/20" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"}`}
    >
      {opt.label}
    </button>
  );
}

// ─── Player row ───────────────────────────────────────────────────────────────

function PlayerRow({ player, rank, sortKey, index }) {
  const rowRef = useRef(null);
  const [imgErr, setImgErr] = useState(false);
  const [logoErr, setLogoErr] = useState(false);

  const sortCol = STAT_COLS.find(c => c.key === sortKey || c.label === SORT_OPTIONS.find(o => o.key === sortKey)?.label);
  const highlight = rank <= 3;

  return (
    <tr
      ref={rowRef}
      className={`border-b border-white/[0.04] transition-colors group
        hover:bg-white/[0.04] cursor-pointer
        ${highlight ? "bg-white/[0.025]" : ""}`}
    >
      {/* Rank */}
      <td className="px-3 py-3 w-10 text-center">
        <Rank n={rank} />
      </td>

      {/* Player */}
      <td className="px-2 py-2">
        <Link to={`/player/${player.player_id}`} className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className={`w-9 h-9 rounded-full overflow-hidden ring-2
              ${rank === 1 ? "ring-yellow-400/40" : rank === 2 ? "ring-slate-300/30" : rank === 3 ? "ring-amber-600/30" : "ring-white/5"}`}>
              {!imgErr ? (
                <img
                  src={MLB_PHOTO(player.player_id)}
                  alt={player.player_name}
                  className="w-full h-full object-cover object-top"
                  onError={() => setImgErr(true)}
                />
              ) : (
                <div className="w-full h-full bg-bg-accent flex items-center justify-center text-xs font-bold text-white/50">
                  {player.player_name?.[0]}
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-white group-hover:text-mlb-red transition-colors truncate">
              {player.player_name}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {player.team_id && !logoErr && (
                <img
                  src={TEAM_LOGO(player.team_id)}
                  alt=""
                  className="w-3.5 h-3.5 object-contain"
                  onError={() => setLogoErr(true)}
                />
              )}
              <span className="text-white/30 text-[11px] truncate">{player.team_name}</span>
            </div>
          </div>
        </Link>
      </td>

      {/* Stats */}
      {STAT_COLS.map(col => {
        const val = player[col.key];
        const formatted = col.fmt(val);
        const isActiveSort = SORT_OPTIONS.find(o => o.key === sortKey)?.label === col.label;
        return (
          <td
            key={col.key}
            className={`px-2 py-3 text-center text-sm tabular-nums font-medium
              ${isActiveSort ? "bg-mlb-red/10 font-bold" : ""}
              ${col.highlight?.(val) ? "text-mlb-win" : ""}
              ${col.dim?.(val) ? "text-mlb-loss/70" : ""}
              ${!col.highlight?.(val) && !col.dim?.(val) ? "text-white/70" : ""}`}
          >
            {formatted}
          </td>
        );
      })}
    </tr>
  );
}

// ─── Header with GSAP ─────────────────────────────────────────────────────────

function PageHeader({ total, sortLabel }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const children = Array.from(ref.current.children);
    const tween = gsap.fromTo(children,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: "power3.out", clearProps: "opacity,y,transform" }
    );
    return () => { tween.kill(); gsap.set(children, { clearProps: "all" }); };
  }, []);

  return (
    <div ref={ref} className="mb-6">
      <div className="text-mlb-red font-display text-xs font-bold tracking-[0.3em] uppercase mb-2">
        Temporada 2026
      </div>
      <h1 className="font-display text-4xl md:text-5xl font-black">
        Estadísticas de <span className="text-mlb-red">Bateadores</span>
      </h1>
      <p className="text-white/40 text-sm mt-2">
        {total} jugadores · Ordenado por {sortLabel}
      </p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Batters() {
  const [sortKey, setSortKey] = useState("battingAverage");
  const [search, setSearch] = useState("");
  const [minAB, setMinAB] = useState(50);
  const tableRef = useRef(null);

  const { data: raw = [], isLoading, isFetching } = useQuery({
    queryKey: ["leaders-batting", sortKey],
    queryFn: () => api.battingLeaders(sortKey),
    staleTime: 300_000,
  });

  const filtered = useMemo(() => {
    return raw
      .filter(p => p.atBats >= minAB)
      .filter(p => !search || p.player_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.team_name?.toLowerCase().includes(search.toLowerCase()));
  }, [raw, minAB, search]);

  // Animate sort change
  useEffect(() => {
    if (!tableRef.current) return;
    const rows = tableRef.current.querySelectorAll("tbody tr");
    if (!rows.length) return;
    gsap.fromTo(rows,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, stagger: 0.008, duration: 0.3, ease: "power2.out", overwrite: true, clearProps: "opacity,y,transform" }
    );
  }, [sortKey, filtered.length]);

  const sortLabel = SORT_OPTIONS.find(o => o.key === sortKey)?.label ?? sortKey;

  return (
    <div className="min-h-screen pt-6 pb-16">
      <div className="max-w-[1400px] mx-auto px-4">
        <PageHeader total={filtered.length} sortLabel={sortLabel} />

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center mb-5">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar jugador o equipo…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-bg-card border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white
                placeholder-white/30 focus:outline-none focus:border-mlb-red/60 transition-colors w-56"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Min AB */}
          <div className="flex items-center gap-2">
            <span className="text-white/30 text-xs">Mín. AB</span>
            {[0, 30, 50, 100, 150].map(n => (
              <button key={n} onClick={() => setMinAB(n)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all
                  ${minAB === n ? "bg-bg-accent text-white border border-white/20" : "text-white/30 hover:text-white"}`}>
                {n}
              </button>
            ))}
          </div>

          {isFetching && <div className="w-4 h-4 border-2 border-mlb-red border-t-transparent rounded-full animate-spin" />}
        </div>

        {/* Sort pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {SORT_OPTIONS.map(opt => (
            <SortPill key={opt.key} opt={opt} active={sortKey === opt.key} onClick={setSortKey} />
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="h-14 card animate-pulse" style={{ animationDelay: `${i * 0.03}s` }} />
            ))}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto" ref={tableRef}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-bg-accent/30">
                    <th className="px-3 py-3 text-white/30 text-xs font-bold w-10 text-center">#</th>
                    <th className="px-2 py-3 text-white/30 text-xs font-bold text-left min-w-[180px]">Jugador</th>
                    {STAT_COLS.map(col => {
                      const isActive = SORT_OPTIONS.find(o => o.key === sortKey)?.label === col.label;
                      return (
                        <th
                          key={col.key}
                          onClick={() => {
                            const opt = SORT_OPTIONS.find(o => o.label === col.label);
                            if (opt) setSortKey(opt.key);
                          }}
                          className={`px-2 py-3 text-xs font-bold text-center cursor-pointer select-none
                            transition-colors min-w-[44px] whitespace-nowrap
                            ${isActive ? "text-mlb-red bg-mlb-red/10" : "text-white/30 hover:text-white/60"}`}
                        >
                          {col.label}
                          {isActive && <span className="ml-1">↓</span>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <PlayerRow
                      key={p.player_id}
                      player={p}
                      rank={i + 1}
                      sortKey={sortKey}
                      index={i}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={STAT_COLS.length + 2} className="text-center py-16 text-white/20">
                        No hay jugadores con los filtros actuales
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
