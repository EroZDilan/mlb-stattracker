import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { gsap } from "gsap";
import { api } from "../api";

const TEAM_COLORS = {
  108: { bg: "#BA0021", accent: "#C4CED4" },
  109: { bg: "#A71930", accent: "#E3D4AD" },
  110: { bg: "#DF4601", accent: "#000000" },
  111: { bg: "#BD3039", accent: "#0C2340" },
  112: { bg: "#0E3386", accent: "#CC3433" },
  113: { bg: "#C6011F", accent: "#000000" },
  114: { bg: "#00385D", accent: "#E31937" },
  115: { bg: "#33006F", accent: "#C4CED4" },
  116: { bg: "#0C2340", accent: "#FA4616" },
  117: { bg: "#002D62", accent: "#EB6E1F" },
  118: { bg: "#174885", accent: "#C09A5B" },
  119: { bg: "#005A9C", accent: "#EF3E42" },
  120: { bg: "#AB0003", accent: "#14225A" },
  121: { bg: "#002D72", accent: "#FF5910" },
  133: { bg: "#003831", accent: "#EFB21E" },
  134: { bg: "#27251F", accent: "#FDB827" },
  135: { bg: "#2F241D", accent: "#FFC425" },
  136: { bg: "#0C2C56", accent: "#005C5C" },
  137: { bg: "#27251F", accent: "#FD5A1E" },
  138: { bg: "#C41E3A", accent: "#FEDB00" },
  139: { bg: "#092C5C", accent: "#8FBCE6" },
  140: { bg: "#003278", accent: "#C0111F" },
  141: { bg: "#134A8E", accent: "#E8291C" },
  142: { bg: "#002B5C", accent: "#D31145" },
  143: { bg: "#E81828", accent: "#284898" },
  144: { bg: "#13274F", accent: "#CE1141" },
  145: { bg: "#27251F", accent: "#C4CED4" },
  146: { bg: "#00A3E0", accent: "#000000" },
  147: { bg: "#003087", accent: "#C4CED4" },
  158: { bg: "#12284B", accent: "#B6922E" },
};

const POS_GROUPS = {
  "Todos":      null,
  "Pitchers":   ["P"],
  "Catchers":   ["C"],
  "Infield":    ["1B", "2B", "3B", "SS"],
  "Outfield":   ["LF", "CF", "RF", "OF"],
  "DH":         ["DH"],
};

const MLB_PHOTO = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;

const TEAM_LOGO = (id) =>
  `https://www.mlbstatic.com/team-logos/${id}.svg`;

// ─── Player card ──────────────────────────────────────────────────────────────

function PlayerCard({ player, index, accentColor }) {
  const cardRef = useRef(null);
  const [imgErr, setImgErr] = useState(false);
  const personId = player.person?.id;
  const name = player.person?.fullName ?? "—";
  const pos = player.position?.abbreviation ?? "?";
  const jersey = player.jerseyNumber ?? "—";

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const tween = gsap.fromTo(el,
      { opacity: 0, y: 20, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power3.out", delay: Math.min(index * 0.03, 0.8), clearProps: "opacity,y,scale,transform" }
    );
    return () => { tween.kill(); gsap.set(el, { clearProps: "all" }); };
  }, [index]);

  return (
    <Link
      ref={cardRef}
      to={`/player/${personId}`}
      className="bg-bg-card border border-white/[0.07] rounded-xl p-4 flex flex-col items-center gap-3
        hover:border-white/20 hover:bg-bg-accent/50 transition-all duration-200 group"
    >
      {/* Photo */}
      <div className="relative">
        <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-white/25 transition-all">
          {!imgErr ? (
            <img
              src={MLB_PHOTO(personId)}
              alt={name}
              className="w-full h-full object-cover object-top"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className="w-full h-full bg-bg-accent flex items-center justify-center text-lg font-black text-white/30">
              {name?.[0]}
            </div>
          )}
        </div>
        {/* Jersey badge */}
        <div
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white/80 ring-2 ring-bg-card"
          style={{ background: accentColor + "55", border: `1px solid ${accentColor}44` }}
        >
          {jersey}
        </div>
      </div>

      {/* Name */}
      <div className="text-center min-w-0 w-full">
        <div className="text-white text-xs font-semibold truncate group-hover:text-white transition-colors leading-tight">
          {name}
        </div>
        <div
          className="text-[11px] font-bold mt-1 px-2 py-0.5 rounded-md inline-block"
          style={{ background: accentColor + "22", color: accentColor }}
        >
          {pos}
        </div>
      </div>
    </Link>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Team() {
  const { id } = useParams();
  const teamId = parseInt(id);
  const [posFilter, setPosFilter] = useState("Todos");
  const headerRef = useRef(null);
  const gridRef = useRef(null);

  const colors = TEAM_COLORS[teamId] || { bg: "#16213e", accent: "#e94560" };

  const { data: roster = [], isLoading } = useQuery({
    queryKey: ["roster", teamId],
    queryFn: () => api.roster(teamId),
    staleTime: 3_600_000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: api.teams,
    staleTime: 3_600_000,
  });

  const teamInfo = teams.find(t => t.id === teamId);

  // Filter roster
  const filtered = roster.filter(p => {
    const allowed = POS_GROUPS[posFilter];
    if (!allowed) return true;
    return allowed.includes(p.position?.abbreviation);
  });

  // Header entrance
  useEffect(() => {
    if (!headerRef.current) return;
    const children = Array.from(headerRef.current.children);
    const tween = gsap.fromTo(children,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: "power3.out", clearProps: "opacity,y,transform" }
    );
    return () => { tween.kill(); gsap.set(children, { clearProps: "all" }); };
  }, [teamInfo]);

  // Re-animate grid when filter changes
  useEffect(() => {
    if (!gridRef.current) return;
    const children = Array.from(gridRef.current.children);
    if (!children.length) return;
    gsap.fromTo(children,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, stagger: 0.02, duration: 0.3, ease: "power2.out", overwrite: true, clearProps: "opacity,scale,transform" }
    );
  }, [posFilter]);

  if (isLoading) return (
    <div className="min-h-screen pt-6 pb-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="h-40 rounded-2xl animate-pulse bg-bg-card mb-8" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {[...Array(26)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl animate-pulse bg-bg-card" />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-6 pb-16">
      <div className="max-w-5xl mx-auto px-4">

        {/* Header band */}
        <div
          ref={headerRef}
          className="relative rounded-2xl overflow-hidden mb-8 p-7"
          style={{ background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}bb 70%, ${colors.accent}22 100%)` }}
        >
          {/* Watermark logo */}
          <div className="absolute right-0 top-0 bottom-0 flex items-center opacity-[0.07] pointer-events-none select-none pr-6">
            <img src={TEAM_LOGO(teamId)} alt="" className="h-40 w-40 object-contain" draggable={false} />
          </div>

          <Link to="/teams" className="text-white/40 text-xs font-medium hover:text-white/70 transition-colors mb-4 inline-flex items-center gap-1.5">
            ← Todos los equipos
          </Link>

          <div className="flex items-center gap-5 mt-2 relative z-10">
            <img src={TEAM_LOGO(teamId)} alt="" className="w-20 h-20 object-contain drop-shadow-xl" />
            <div>
              <div className="text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-1">
                {teamInfo?.league?.name ?? "MLB"}
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-black text-white">
                {teamInfo?.name ?? `Equipo ${teamId}`}
              </h1>
              <div className="text-white/50 text-sm mt-1">
                {roster.length} jugadores activos
              </div>
            </div>
          </div>
        </div>

        {/* Position filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.keys(POS_GROUPS).map(label => (
            <button
              key={label}
              onClick={() => setPosFilter(label)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200
                ${posFilter === label
                  ? "text-white shadow-lg"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                }`}
              style={posFilter === label ? { background: colors.bg, border: `1px solid ${colors.accent}66` } : {}}
            >
              {label}
              <span className="ml-1.5 text-white/40 font-medium">
                {posFilter === label
                  ? filtered.length
                  : (POS_GROUPS[label]
                    ? roster.filter(p => POS_GROUPS[label].includes(p.position?.abbreviation)).length
                    : roster.length)
                }
              </span>
            </button>
          ))}
        </div>

        {/* Roster grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/20">No hay jugadores en este filtro</div>
        ) : (
          <div ref={gridRef} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {filtered.map((p, i) => (
              <PlayerCard
                key={p.person?.id ?? i}
                player={p}
                index={i}
                accentColor={colors.accent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
