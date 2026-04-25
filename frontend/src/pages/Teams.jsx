import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { api } from "../api";

// ─── Team colors & accent ─────────────────────────────────────────────────────

const TEAM_COLORS = {
  108: { bg: "#BA0021", accent: "#C4CED4", name: "Angels" },
  109: { bg: "#A71930", accent: "#E3D4AD", name: "D-backs" },
  110: { bg: "#DF4601", accent: "#000000", name: "Orioles" },
  111: { bg: "#BD3039", accent: "#0C2340", name: "Red Sox" },
  112: { bg: "#0E3386", accent: "#CC3433", name: "Cubs" },
  113: { bg: "#C6011F", accent: "#000000", name: "Reds" },
  114: { bg: "#00385D", accent: "#E31937", name: "Guardians" },
  115: { bg: "#33006F", accent: "#C4CED4", name: "Rockies" },
  116: { bg: "#0C2340", accent: "#FA4616", name: "Tigers" },
  117: { bg: "#002D62", accent: "#EB6E1F", name: "Astros" },
  118: { bg: "#174885", accent: "#C09A5B", name: "Royals" },
  119: { bg: "#005A9C", accent: "#EF3E42", name: "Dodgers" },
  120: { bg: "#AB0003", accent: "#14225A", name: "Nationals" },
  121: { bg: "#002D72", accent: "#FF5910", name: "Mets" },
  133: { bg: "#003831", accent: "#EFB21E", name: "Athletics" },
  134: { bg: "#27251F", accent: "#FDB827", name: "Pirates" },
  135: { bg: "#2F241D", accent: "#FFC425", name: "Padres" },
  136: { bg: "#0C2C56", accent: "#005C5C", name: "Mariners" },
  137: { bg: "#27251F", accent: "#FD5A1E", name: "Giants" },
  138: { bg: "#C41E3A", accent: "#FEDB00", name: "Cardinals" },
  139: { bg: "#092C5C", accent: "#8FBCE6", name: "Rays" },
  140: { bg: "#003278", accent: "#C0111F", name: "Rangers" },
  141: { bg: "#134A8E", accent: "#E8291C", name: "Blue Jays" },
  142: { bg: "#002B5C", accent: "#D31145", name: "Twins" },
  143: { bg: "#E81828", accent: "#284898", name: "Phillies" },
  144: { bg: "#13274F", accent: "#CE1141", name: "Braves" },
  145: { bg: "#27251F", accent: "#C4CED4", name: "White Sox" },
  146: { bg: "#00A3E0", accent: "#000000", name: "Marlins" },
  147: { bg: "#003087", accent: "#C4CED4", name: "Yankees" },
  158: { bg: "#12284B", accent: "#B6922E", name: "Brewers" },
};

const TEAM_LOGO = (id) => `https://www.mlbstatic.com/team-logos/${id}.svg`;

// ─── Team card ────────────────────────────────────────────────────────────────

function TeamCard({ team, index }) {
  const cardRef = useRef(null);
  const colors = TEAM_COLORS[team.id] || { bg: "#16213e", accent: "#e94560" };

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const tween = gsap.fromTo(el,
      { opacity: 0, y: 30, scale: 0.92 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out", delay: Math.min(index * 0.04, 1.2), clearProps: "opacity,y,scale,transform" }
    );

    const onEnter = () => gsap.to(el, { y: -6, scale: 1.03, duration: 0.3, ease: "power2.out" });
    const onLeave = () => gsap.to(el, { y: 0, scale: 1, duration: 0.4, ease: "elastic.out(1, 0.6)" });

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      tween.kill();
      gsap.set(el, { clearProps: "all" });
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [index]);

  return (
    <Link
      ref={cardRef}
      to={`/team/${team.id}`}
      className="relative block rounded-2xl overflow-hidden cursor-pointer select-none"
      style={{ background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}cc 60%, ${colors.accent}33 100%)` }}
    >
      {/* Glow ring on hover via CSS */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: `0 0 40px ${colors.accent}55` }}
      />

      {/* Large watermark logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none select-none">
        <img
          src={TEAM_LOGO(team.id)}
          alt=""
          className="w-40 h-40 object-contain"
          draggable={false}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 p-5 flex flex-col items-center gap-3 min-h-[160px] justify-center">
        {/* Logo */}
        <img
          src={TEAM_LOGO(team.id)}
          alt={team.name}
          className="w-16 h-16 object-contain drop-shadow-lg"
          onError={(e) => { e.target.style.display = "none"; }}
        />

        <div className="text-center">
          <div className="font-display font-black text-white text-base leading-tight drop-shadow">
            {team.franchiseName || team.teamName}
          </div>
          <div className="text-white/50 text-xs mt-0.5 font-medium tracking-wide">
            {team.locationName}
          </div>
        </div>

        {/* Accent strip */}
        <div
          className="w-8 h-0.5 rounded-full opacity-70"
          style={{ background: colors.accent }}
        />
      </div>

      {/* Bottom shine */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />
    </Link>
  );
}

// ─── Division block ───────────────────────────────────────────────────────────

function DivisionBlock({ label, teams }) {
  const ref = useRef(null);

  useEffect(() => {
    const h2 = ref.current?.querySelector("h2");
    if (!h2) return;
    const tween = gsap.fromTo(h2,
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, ease: "power3.out", clearProps: "opacity,x,transform" }
    );
    return () => { tween.kill(); gsap.set(h2, { clearProps: "all" }); };
  }, []);

  return (
    <div ref={ref} className="mb-10">
      <h2 className="font-display text-sm font-bold tracking-[0.25em] uppercase text-white/30 mb-4 flex items-center gap-3">
        <span
          className="inline-block w-6 h-px bg-mlb-red"
        />
        {label}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {teams.map((t, i) => (
          <TeamCard key={t.id} team={t} index={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const DIVISION_MAP = {
  "American League East":    "AL Este",
  "American League Central": "AL Central",
  "American League West":    "AL Oeste",
  "National League East":    "NL Este",
  "National League Central": "NL Central",
  "National League West":    "NL Oeste",
};

const DIVISION_ORDER = ["AL Este", "AL Central", "AL Oeste", "NL Este", "NL Central", "NL Oeste"];

export default function Teams() {
  const headerRef = useRef(null);

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: api.teams,
    staleTime: 3_600_000,
  });

  useEffect(() => {
    if (!headerRef.current) return;
    const children = Array.from(headerRef.current.children);
    const tween = gsap.fromTo(children,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: "power3.out", clearProps: "opacity,y,transform" }
    );
    return () => { tween.kill(); gsap.set(children, { clearProps: "all" }); };
  }, []);

  // Group teams by division
  const byDivision = {};
  for (const team of teams) {
    const rawDiv = team.division?.name || "";
    const div = DIVISION_MAP[rawDiv] || rawDiv;
    if (!byDivision[div]) byDivision[div] = [];
    byDivision[div].push(team);
  }

  // Sort teams within each division by name
  for (const div of Object.keys(byDivision)) {
    byDivision[div].sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div className="min-h-screen pt-6 pb-16">
      <div className="max-w-[1300px] mx-auto px-4">
        {/* Header */}
        <div ref={headerRef} className="mb-10">
          <div className="text-mlb-red font-display text-xs font-bold tracking-[0.3em] uppercase mb-2">
            MLB 2026
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black">
            Los 30 <span className="text-mlb-red">Equipos</span>
          </h1>
          <p className="text-white/40 text-sm mt-2">
            Haz clic en un equipo para ver su plantilla completa
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[...Array(30)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-bg-card animate-pulse" style={{ animationDelay: `${i * 0.02}s` }} />
            ))}
          </div>
        ) : (
          DIVISION_ORDER.map(divLabel => {
            const divTeams = byDivision[divLabel];
            if (!divTeams?.length) return null;
            return (
              <DivisionBlock key={divLabel} label={divLabel} teams={divTeams} />
            );
          })
        )}
      </div>
    </div>
  );
}
