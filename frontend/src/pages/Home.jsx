import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useGsapStagger } from "../hooks/useGsapReveal";

gsap.registerPlugin(ScrollTrigger);

const EASE = "cubic-bezier(0.18, 0.98, 0.45, 1)";

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ gameCount, liveCount }) {
  const sectionRef  = useRef(null);
  const contentRef  = useRef(null);
  const statRef     = useRef(null);
  const trackerRef  = useRef(null);
  const overlineRef = useRef(null);
  const subtitleRef = useRef(null);
  const badgesRef   = useRef(null);
  const lineRef     = useRef(null);
  const scrollRef   = useRef(null);
  const orb1Ref     = useRef(null);
  const orb2Ref     = useRef(null);
  const orb3Ref     = useRef(null);
  const imgZoneRef  = useRef(null);
  const player1Ref  = useRef(null); // Ohtani — front
  const player2Ref  = useRef(null); // Elly — mid
  const player3Ref  = useRef(null); // Tatis — back

  const chars = "TRACKER".split("");

  useEffect(() => {
    const ctx = gsap.context(() => {

      // ── 1. Floating orbs ────────────────────────────────────────────────────
      gsap.to(orb1Ref.current, { x: 70, y: -55, duration: 9,  ease: "sine.inOut", repeat: -1, yoyo: true });
      gsap.to(orb2Ref.current, { x: -55, y: 65,  duration: 11, ease: "sine.inOut", repeat: -1, yoyo: true, delay: 1 });
      gsap.to(orb3Ref.current, { x: 40,  y: 55,  duration: 7,  ease: "sine.inOut", repeat: -1, yoyo: true, delay: 2 });

      // ── 2. Content entrance ─────────────────────────────────────────────────
      const enter = gsap.timeline({ delay: 0.1 });

      enter.from(overlineRef.current, { y: 16, opacity: 0, duration: 0.6, ease: EASE }, 0.2);
      enter.from(statRef.current,     { x: -90, opacity: 0, duration: 0.9, ease: EASE }, 0.35);

      const charEls = trackerRef.current?.querySelectorAll(".char");
      if (charEls?.length) {
        enter.from(charEls, {
          y: 80, opacity: 0, rotateX: -90,
          duration: 0.6, ease: "back.out(1.8)", stagger: 0.05,
        }, 0.55);
      }

      enter.from(subtitleRef.current, { y: 20, opacity: 0, duration: 0.6, ease: EASE }, 0.85);
      enter.from(badgesRef.current?.children ?? [], {
        scale: 0, opacity: 0, stagger: 0.08, ease: "back.out(2)", duration: 0.4,
      }, 1.0);
      enter.to(lineRef.current, { width: "88%", duration: 1.4, ease: EASE }, 1.1);
      enter.from(scrollRef.current, { y: 14, opacity: 0, duration: 0.6, ease: EASE }, 1.45);

      // ── 3. Image entrance (slides in from right, staggered) ─────────────────
      // Images start off-screen and come in as the hero loads
      gsap.fromTo(player3Ref.current,
        { x: "100%", opacity: 0, scale: 1.08 },
        { x: "0%", opacity: 1, scale: 1, duration: 1.5, ease: "power3.out", delay: 0.2 }
      );
      gsap.fromTo(player2Ref.current,
        { x: "80%", opacity: 0, scale: 1.05 },
        { x: "0%", opacity: 1, scale: 1, duration: 1.6, ease: "power3.out", delay: 0.4 }
      );
      gsap.fromTo(player1Ref.current,
        { x: "60%", opacity: 0, scale: 1.04 },
        { x: "0%", opacity: 1, scale: 1, duration: 1.7, ease: "power3.out", delay: 0.6 }
      );

      // ── 4. Scroll: pinned cinematic parallax ─────────────────────────────────
      // While the hero is in view, each player image moves at a different rate
      // creating a deep parallax / layered depth effect
      const scrubTrigger = {
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 1.2,
      };

      gsap.to(player3Ref.current, { y: 100, ease: "none", scrollTrigger: scrubTrigger });
      gsap.to(player2Ref.current, { y: 150, ease: "none", scrollTrigger: scrubTrigger });
      gsap.to(player1Ref.current, { y: 200, ease: "none", scrollTrigger: scrubTrigger });

      // Content parallax — moves up slightly slower than images
      gsap.to(contentRef.current,  { y: 70,  ease: "none", scrollTrigger: scrubTrigger });

      // Orbs also move on scroll
      gsap.to(orb1Ref.current,     { y: 60,  ease: "none", scrollTrigger: scrubTrigger });
      gsap.to(orb3Ref.current,     { y: 80,  ease: "none", scrollTrigger: scrubTrigger });

      // Grid moves up (existing parallax)
      gsap.to(".hero-grid",        { yPercent: 40, ease: "none", scrollTrigger: scrubTrigger });

      // ── 5. Hero exit — images scale + fade out as hero leaves viewport ────────
      const exitTrigger = {
        trigger: sectionRef.current,
        start: "60% top",
        end: "bottom top",
        scrub: 0.8,
      };
      gsap.to(imgZoneRef.current, { opacity: 0, scale: 0.94, ease: "power2.in", scrollTrigger: exitTrigger });

    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ height: "100vh", minHeight: "640px", background: "#07070f" }}
    >
      {/* Animated grid */}
      <div className="hero-grid absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(233,69,96,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(233,69,96,0.5) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Faint crowd texture */}
      <div className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/crowd.jpg)", opacity: 0.04, filter: "grayscale(100%)" }}
      />

      {/* Glow orbs */}
      <div ref={orb1Ref} className="absolute rounded-full blur-[140px]"
        style={{ width: 520, height: 520, background: "#e94560", opacity: 0.18, top: "-18%", left: "-12%" }} />
      <div ref={orb2Ref} className="absolute rounded-full blur-[110px]"
        style={{ width: 340, height: 340, background: "#131a36", opacity: 0.9, bottom: "-8%", right: "-3%" }} />
      <div ref={orb3Ref} className="absolute rounded-full blur-[80px]"
        style={{ width: 240, height: 240, background: "#e94560", opacity: 0.09, top: "48%", right: "28%" }} />

      {/* ── Player images — right half ───────────────────────────────────── */}
      <div ref={imgZoneRef} className="absolute right-0 top-0 bottom-0 w-[58%] hidden md:block pointer-events-none overflow-hidden">
        {/* Left fade: blends images into the dark left side */}
        <div className="absolute left-0 top-0 bottom-0 w-[60%] z-10"
          style={{ background: "linear-gradient(to right, #07070f 0%, rgba(7,7,15,0.55) 55%, transparent 100%)" }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-[32%] z-10"
          style={{ background: "linear-gradient(to top, #07070f 0%, transparent 100%)" }} />
        {/* Right edge fade */}
        <div className="absolute right-0 top-0 bottom-0 w-[10%] z-10"
          style={{ background: "linear-gradient(to left, #07070f 0%, transparent 100%)" }} />

        {/* Tatis — back (most desaturated) */}
        <img
          ref={player3Ref}
          src="/images/tatis.jpg"
          alt=""
          className="absolute top-0 left-0 h-full object-cover select-none"
          style={{ width: "47%", objectPosition: "center top",
            filter: "grayscale(40%) contrast(1.05) brightness(0.6)" }}
          draggable={false}
        />
        {/* Elly — mid */}
        <img
          ref={player2Ref}
          src="/images/elly.jpg"
          alt=""
          className="absolute top-0 left-[20%] h-full object-cover select-none"
          style={{ width: "43%", objectPosition: "center top",
            filter: "grayscale(22%) contrast(1.08) brightness(0.72)" }}
          draggable={false}
        />
        {/* Ohtani — front (most vivid) */}
        <img
          ref={player1Ref}
          src="/images/ohtani.jpg"
          alt=""
          className="absolute top-0 right-0 h-full object-cover select-none"
          style={{ width: "57%", objectPosition: "center top",
            filter: "grayscale(8%) contrast(1.12) brightness(0.88)" }}
          draggable={false}
        />
      </div>

      {/* Mobile background */}
      <div className="absolute inset-0 md:hidden">
        <img src="/images/ohtani.jpg" alt="" className="w-full h-full object-cover"
          style={{ objectPosition: "center top", filter: "grayscale(30%) brightness(0.22)" }} />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to right, #07070f 5%, rgba(7,7,15,0.75) 100%)" }} />
      </div>

      {/* ── Left content ─────────────────────────────────────────────────────── */}
      <div
        ref={contentRef}
        className="relative z-20 h-full flex flex-col justify-center px-6 sm:px-12 md:px-16 lg:px-20"
        style={{ maxWidth: "min(52%, 620px)", minWidth: "280px" }}
      >
        {/* Overline */}
        <div ref={overlineRef} className="flex items-center gap-3 mb-5">
          <div className="w-5 h-[2px] bg-mlb-red flex-shrink-0" />
          <span className="text-mlb-red font-display text-[11px] font-bold tracking-[0.4em] uppercase">
            Temporada 2026
          </span>
        </div>

        {/* Giant title */}
        <div className="font-display font-black leading-[0.88] mb-5" style={{ perspective: "700px" }}>
          {/* STAT — outline ghost (ACES splash__title technique) */}
          <div
            ref={statRef}
            className="text-transparent font-black block select-none"
            style={{
              fontSize: "clamp(3rem, 9vw, 9.5rem)",
              WebkitTextStroke: "1.5px rgba(233,69,96,0.72)",
              letterSpacing: "-0.025em",
            }}
          >
            STAT
          </div>

          {/* TRACKER — char-by-char, solid white */}
          <div ref={trackerRef} className="flex" style={{ perspective: "600px" }}>
            {chars.map((c, i) => (
              <span
                key={i}
                className="char inline-block text-white font-black select-none"
                style={{
                  fontSize: "clamp(3rem, 9vw, 9.5rem)",
                  letterSpacing: "-0.025em",
                  lineHeight: 0.9,
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Subtitle */}
        <p ref={subtitleRef} className="text-white/28 text-[10px] tracking-[0.38em] uppercase font-medium mb-7">
          Estadísticas · Predicciones · Tiempo Real
        </p>

        {/* Badges */}
        <div ref={badgesRef} className="flex gap-2 flex-wrap">
          {liveCount > 0 && (
            <span className="badge-live text-xs px-3 py-1.5">🔴 {liveCount} EN VIVO</span>
          )}
          {gameCount > 0 && (
            <span className="bg-white/[0.07] border border-white/[0.09] text-white/60 text-xs px-3 py-1.5 rounded-full font-medium">
              {gameCount} juegos hoy
            </span>
          )}
          <span className="bg-mlb-red/[0.12] border border-mlb-red/25 text-mlb-red/65 text-xs px-3 py-1.5 rounded-full font-medium">
            MLB API
          </span>
        </div>

        {/* Red accent line */}
        <div className="mt-9 h-px overflow-hidden">
          <div ref={lineRef} className="h-full bg-mlb-red" style={{ width: 0 }} />
        </div>

        {/* Scroll indicator */}
        <div ref={scrollRef} className="mt-8 flex items-center gap-3 opacity-[0.28] hover:opacity-50 transition-opacity cursor-default select-none">
          <div className="w-5 h-8 rounded-full border border-white/35 flex items-start justify-center pt-1.5">
            <div className="w-0.5 h-2 bg-white rounded-full animate-bounce" />
          </div>
          <span className="text-[9px] tracking-[0.4em] text-white uppercase font-medium">Scroll</span>
        </div>
      </div>

      {/* Bottom blend into page content */}
      <div className="absolute bottom-0 left-0 right-0 h-32 z-20 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent 0%, #07070f 100%)" }}
      />
    </section>
  );
}

// ─── Team Logo ─────────────────────────────────────────────────────────────────

const AL_TEAMS = new Set([
  "Seattle Mariners","Houston Astros","Los Angeles Angels","Oakland Athletics",
  "Texas Rangers","Minnesota Twins","Chicago White Sox","Cleveland Guardians",
  "Detroit Tigers","Kansas City Royals","New York Yankees","Boston Red Sox",
  "Toronto Blue Jays","Baltimore Orioles","Tampa Bay Rays",
]);

function TeamLogo({ teamId, name, size = 28 }) {
  const [err, setErr] = useState(false);
  if (err || !teamId) return (
    <div className="rounded-full bg-bg-accent flex items-center justify-center text-xs font-bold text-white/50"
      style={{ width: size, height: size }}>
      {name?.[0] ?? "?"}
    </div>
  );
  return (
    <img
      src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
      alt={name}
      onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

// ─── Game Card ────────────────────────────────────────────────────────────────

function GameCard({ game }) {
  const cardRef = useRef(null);
  const isLive  = game.status?.toLowerCase().includes("progress") || game.status?.toLowerCase().includes("live");
  const isFinal = game.status?.toLowerCase().includes("final");
  const homeWon = isFinal && game.home_score > game.away_score;
  const awayWon = isFinal && game.away_score > game.home_score;

  // 3D tilt on hover
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const onMove = (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      gsap.to(card, { rotateY: x * 7, rotateX: -y * 7, duration: 0.3, ease: "power2.out", transformPerspective: 900 });
    };
    const onLeave = () => gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" });
    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
    return () => { card.removeEventListener("mousemove", onMove); card.removeEventListener("mouseleave", onLeave); };
  }, []);

  return (
    <Link to={`/game/${game.game_id}`} data-stagger>
      <div
        ref={cardRef}
        className="relative card p-4 cursor-pointer overflow-hidden transition-all duration-200
          hover:border-white/12 hover:bg-white/[0.025] group"
        style={{ transformStyle: "preserve-3d" }}
      >
        {isLive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-mlb-red animate-pulse rounded-t-xl" />}

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2.5 flex-1 min-w-0 transition-opacity
            ${isFinal && !awayWon ? "opacity-35" : ""}`}>
            <TeamLogo teamId={game.away_team_id} name={game.away_team} size={26} />
            <span className="font-semibold text-sm truncate leading-tight">{game.away_team}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`font-display text-[22px] font-black tabular-nums w-7 text-right
              ${awayWon ? "text-white" : isFinal ? "text-white/28" : "text-white/65"}`}>
              {game.away_score ?? "—"}
            </span>
            <div className="text-center w-14">
              {isLive  && <div className="badge-live  text-[9px] px-1.5 py-0.5">LIVE</div>}
              {isFinal && <div className="badge-final text-[9px] px-1.5 py-0.5">FINAL</div>}
              {!isLive && !isFinal && <div className="text-white/22 text-[10px] font-medium">{game.status}</div>}
            </div>
            <span className={`font-display text-[22px] font-black tabular-nums w-7 text-left
              ${homeWon ? "text-white" : isFinal ? "text-white/28" : "text-white/65"}`}>
              {game.home_score ?? "—"}
            </span>
          </div>

          <div className={`flex items-center gap-2.5 flex-1 min-w-0 justify-end transition-opacity
            ${isFinal && !homeWon ? "opacity-35" : ""}`}>
            <span className="font-semibold text-sm truncate text-right leading-tight">{game.home_team}</span>
            <TeamLogo teamId={game.home_team_id} name={game.home_team} size={26} />
          </div>
        </div>

        {game.venue && (
          <div className="text-white/13 text-[10px] text-center mt-2 tracking-wide">{game.venue}</div>
        )}
      </div>
    </Link>
  );
}

// ─── Date Nav ─────────────────────────────────────────────────────────────────

function DateNav({ selected, onChange }) {
  const today = new Date();
  const dates = [-1, 0, 1].map((offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().split("T")[0];
  });
  const labels = ["Ayer", "Hoy", "Mañana"];
  return (
    <div className="inline-flex gap-0.5 bg-bg-card/80 backdrop-blur-sm rounded-xl p-1 border border-white/[0.06]">
      {dates.map((d, i) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`px-5 py-1.5 rounded-lg text-sm font-bold transition-all duration-200
            ${selected === d
              ? "bg-mlb-red text-white shadow-lg shadow-mlb-red/20"
              : "text-white/38 hover:text-white hover:bg-white/[0.06]"
            }`}
        >
          {labels[i]}
        </button>
      ))}
    </div>
  );
}

// ─── League divider ───────────────────────────────────────────────────────────

function LeagueDivider({ label }) {
  return (
    <div className="flex items-center gap-3 mb-3 px-1">
      <div className="w-2 h-2 rotate-45 bg-mlb-red shrink-0" />
      <span className="text-[10px] font-bold tracking-[0.3em] text-white/22 uppercase">{label}</span>
      <div className="flex-1 h-px bg-white/[0.05]" />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);

  const { data: games = [], isLoading } = useQuery({
    queryKey: ["games", date],
    queryFn: () => api.games(date),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const data = query.state.data ?? [];
      const hasLive = data.some(g =>
        g.status?.toLowerCase().includes("progress") || g.status?.toLowerCase().includes("live")
      );
      return hasLive ? 30_000 : 120_000;
    },
  });

  const liveCount = games.filter(g =>
    g.status?.toLowerCase().includes("progress") || g.status?.toLowerCase().includes("live")
  ).length;

  const alRef = useGsapStagger({ deps: games.length });
  const nlRef = useGsapStagger({ deps: games.length });

  const alGames = games.filter(g => AL_TEAMS.has(g.home_team) || AL_TEAMS.has(g.away_team));
  const nlGames = games.filter(g => !AL_TEAMS.has(g.home_team) && !AL_TEAMS.has(g.away_team));
  const allGames = alGames.length === 0 && nlGames.length === 0 ? games : null;

  return (
    <div className="min-h-screen" style={{ background: "#07070f" }}>
      <HeroSection gameCount={games.length} liveCount={liveCount} />

      {/* Games section — sits below hero with proper spacing */}
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-20">

        <div className="flex justify-center mb-8">
          <DateNav selected={date} onChange={setDate} />
        </div>

        {isLoading && (
          <div className="flex flex-col gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card h-[76px] animate-pulse" style={{ animationDelay: `${i * 0.04}s` }} />
            ))}
          </div>
        )}

        {!isLoading && games.length === 0 && (
          <div className="text-center text-white/18 py-20">
            <div className="text-5xl mb-4">⚾</div>
            <p className="text-base font-medium">No hay juegos para esta fecha</p>
          </div>
        )}

        {!isLoading && games.length > 0 && (
          <>
            {allGames ? (
              <div ref={alRef} className="flex flex-col gap-2">
                {allGames.map(g => <GameCard key={g.game_id} game={g} />)}
              </div>
            ) : (
              <>
                {alGames.length > 0 && (
                  <div className="mb-8">
                    <LeagueDivider label="American League" />
                    <div ref={alRef} className="flex flex-col gap-2">
                      {alGames.map(g => <GameCard key={g.game_id} game={g} />)}
                    </div>
                  </div>
                )}
                {nlGames.length > 0 && (
                  <div className="mb-8">
                    <LeagueDivider label="National League" />
                    <div ref={nlRef} className="flex flex-col gap-2">
                      {nlGames.map(g => <GameCard key={g.game_id} game={g} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
