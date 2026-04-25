import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { api } from "../api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS   = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

// MLB 2026 season approx. window
const SEASON_START = new Date(2026, 2, 20); // March 20
const SEASON_END   = new Date(2026, 9, 5);  // October 5

function inSeason(y, m) {
  const d = new Date(y, m, 1);
  return d >= new Date(SEASON_START.getFullYear(), SEASON_START.getMonth(), 1)
      && d <= new Date(SEASON_END.getFullYear(), SEASON_END.getMonth(), 1);
}

function buildGrid(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startDow = first.getDay();
  const days = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function isoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ─── Day cell ─────────────────────────────────────────────────────────────────

function DayCell({ day, year, month, info, today, onSelect, onBackfill }) {
  if (!day) return <div className="aspect-square" />;

  const dateStr = isoDate(year, month, day);
  const isToday = dateStr === today;
  const isPast  = dateStr < today;
  const scheduled = info?.scheduled ?? 0;
  const hasData    = info?.has_data ?? false;
  const finished   = info?.finished ?? 0;
  const collected  = info?.collected ?? 0;
  const hasGames   = scheduled > 0;
  const allCollected = hasData && collected >= scheduled && scheduled > 0;
  const partial    = hasData && !allCollected && scheduled > 0;

  let bg = "bg-transparent hover:bg-white/5";
  let ring = "ring-0";
  let dot  = null;

  if (isToday) { bg = "bg-mlb-red/10"; ring = "ring-2 ring-mlb-red"; }
  else if (allCollected) { bg = "bg-mlb-win/10 hover:bg-mlb-win/20"; }
  else if (partial) { bg = "bg-yellow-400/10 hover:bg-yellow-400/15"; }
  else if (hasGames && isPast) { bg = "bg-white/[0.03] hover:bg-white/[0.06]"; }

  if (hasGames) {
    dot = allCollected ? "bg-mlb-win" : partial ? "bg-yellow-400" : isPast ? "bg-white/20" : "bg-mlb-red/60";
  }

  return (
    <button
      onClick={() => hasGames && onSelect(dateStr)}
      className={`aspect-square relative flex flex-col items-center justify-center rounded-xl
        transition-all duration-150 ${bg} ${ring} ${hasGames ? "cursor-pointer" : "cursor-default"}`}
    >
      <span className={`font-display text-base md:text-lg font-bold leading-none
        ${isToday ? "text-mlb-red" : hasGames ? "text-white" : "text-white/20"}`}>
        {day}
      </span>

      {/* Game count */}
      {hasGames && (
        <span className={`text-[9px] font-bold mt-0.5 leading-none
          ${allCollected ? "text-mlb-win/80" : partial ? "text-yellow-400/80" : "text-white/30"}`}>
          {scheduled}j
        </span>
      )}

      {/* Status dot */}
      {dot && (
        <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${dot}`} />
      )}

      {/* Backfill button for past uncollected days */}
      {hasGames && isPast && !allCollected && (
        <button
          onClick={e => { e.stopPropagation(); onBackfill(dateStr); }}
          title="Recopilar datos"
          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/10 hover:bg-mlb-red/60
            text-white/40 hover:text-white text-[9px] flex items-center justify-center transition-all"
        >
          ↓
        </button>
      )}
    </button>
  );
}

// ─── Mini game list popover ───────────────────────────────────────────────────

function DayPopover({ dateStr, onClose, navigate }) {
  const { data: games = [], isLoading } = useQuery({
    queryKey: ["games", dateStr],
    queryFn: () => api.games(dateStr),
    staleTime: 60_000,
  });
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const tween = gsap.fromTo(ref.current,
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.25, ease: "power3.out", clearProps: "opacity,y,transform" }
    );
    return () => { tween.kill(); gsap.set(ref.current, { clearProps: "all" }); };
  }, []);

  return (
    <div ref={ref} className="card p-4 mt-3 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-sm text-white">{dateStr}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/?date=${dateStr}`)}
            className="text-mlb-red text-xs font-bold hover:underline">Ver todos →</button>
          <button onClick={onClose} className="text-white/30 hover:text-white text-lg leading-none">×</button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-1.5">
          {[...Array(3)].map((_, i) => <div key={i} className="h-9 bg-white/5 rounded-lg animate-pulse" />)}
        </div>
      )}

      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {games.map(g => {
          const isFinal = g.status?.toLowerCase().includes("final");
          const homeWon = isFinal && g.home_score > g.away_score;
          const awayWon = isFinal && g.away_score > g.home_score;
          return (
            <button key={g.game_id} onClick={() => navigate(`/game/${g.game_id}`)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04]
                hover:bg-white/[0.08] transition-colors text-left">
              <span className={`text-xs flex-1 truncate ${awayWon ? "font-bold text-white" : "text-white/50"}`}>
                {g.away_team}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className={`font-display text-sm font-bold tabular-nums ${awayWon ? "text-white" : "text-white/30"}`}>
                  {g.away_score ?? "–"}
                </span>
                <span className="text-white/20 text-[10px]">vs</span>
                <span className={`font-display text-sm font-bold tabular-nums ${homeWon ? "text-white" : "text-white/30"}`}>
                  {g.home_score ?? "–"}
                </span>
              </div>
              <span className={`text-xs flex-1 truncate text-right ${homeWon ? "font-bold text-white" : "text-white/50"}`}>
                {g.home_team}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-white/40 mt-4">
      {[
        { dot: "bg-mlb-win", label: "Datos recopilados" },
        { dot: "bg-yellow-400", label: "Parcial" },
        { dot: "bg-white/20", label: "Sin recopilar" },
        { dot: "bg-mlb-red/60", label: "Próximos juegos" },
      ].map(({ dot, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${dot}`} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Season summary bar ───────────────────────────────────────────────────────

function SeasonBar({ calData, year, month }) {
  if (!calData) return null;
  const total = Object.values(calData).reduce((a, v) => a + (v.scheduled || 0), 0);
  const collected = Object.values(calData).reduce((a, v) => a + (v.collected || 0), 0);
  const pct = total > 0 ? (collected / total) * 100 : 0;

  return (
    <div className="card p-3 mb-4 flex items-center gap-4">
      <div className="flex-1">
        <div className="flex justify-between text-xs text-white/40 mb-1.5">
          <span>Datos del mes recopilados</span>
          <span className="font-bold text-white/70">{collected}/{total} juegos</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-mlb-win rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-display text-xl font-bold text-mlb-win">{Math.round(pct)}%</div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date().toISOString().split("T")[0];
  const nowDate = new Date();
  const [year,  setYear]  = useState(nowDate.getFullYear());
  const [month, setMonth] = useState(nowDate.getMonth());
  const [selected, setSelected] = useState(null);
  const gridRef   = useRef(null);
  const headerRef = useRef(null);
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  const { data: calData, isLoading } = useQuery({
    queryKey: ["calendar", year, month],
    queryFn: () => api.calendar(year, month + 1),
    staleTime: 120_000,
  });

  const backfillMut = useMutation({
    mutationFn: (date) => api.backfill(date, date),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  });

  useEffect(() => {
    if (!gridRef.current) return;
    const children = Array.from(gridRef.current.children);
    if (!children.length) return;
    gsap.fromTo(children,
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, stagger: 0.015, duration: 0.3, ease: "power2.out", overwrite: true, clearProps: "opacity,scale,transform" }
    );
  }, [year, month]);

  useEffect(() => {
    if (!headerRef.current) return;
    const children = Array.from(headerRef.current.children);
    const tween = gsap.fromTo(children,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.07, duration: 0.6, ease: "power3.out", clearProps: "opacity,y,transform" }
    );
    return () => { tween.kill(); gsap.set(children, { clearProps: "all" }); };
  }, []);

  const changeMonth = (delta) => {
    setSelected(null);
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const grid = buildGrid(year, month);
  const canPrev = inSeason(year, month - 1) || new Date(year, month - 1, 1) >= SEASON_START;
  const canNext = new Date(year, month + 1, 1) <= new Date(nowDate.getFullYear(), nowDate.getMonth() + 3, 1);

  return (
    <div className="min-h-screen pt-6 pb-16">
      <div className="max-w-4xl mx-auto px-4">

        {/* Header */}
        <div ref={headerRef} className="mb-6">
          <div className="text-mlb-red font-display text-xs font-bold tracking-[0.3em] uppercase mb-2">
            Temporada 2026
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black">
            Calendario <span className="text-mlb-red">MLB</span>
          </h1>
          <p className="text-white/40 text-sm mt-2">
            Navega por la temporada · Haz clic en un día para ver los juegos
          </p>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => changeMonth(-1)} disabled={!canPrev}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors
              disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center
              font-bold text-white text-lg">
            ‹
          </button>

          <div className="text-center">
            <div className="font-display text-2xl font-black text-white">
              {MONTHS[month]}
            </div>
            <div className="text-white/40 text-sm">{year}</div>
          </div>

          <button onClick={() => changeMonth(1)} disabled={!canNext}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors
              disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center
              font-bold text-white text-lg">
            ›
          </button>
        </div>

        {/* Season progress bar */}
        <SeasonBar calData={calData} year={year} month={month} />

        {/* Quick jump to month */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {[2, 3, 4, 5, 6, 7, 8, 9].map(m => (
            <button key={m}
              onClick={() => { setYear(2026); setMonth(m); setSelected(null); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all
                ${month === m && year === 2026 ? "bg-mlb-red text-white" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"}`}>
              {MONTHS[m].slice(0, 3)}
            </button>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="card p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-white/25 text-xs font-bold py-1 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {[...Array(35)].map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse"
                  style={{ animationDelay: `${i * 0.01}s` }} />
              ))}
            </div>
          ) : (
            <div ref={gridRef} className="grid grid-cols-7 gap-1">
              {grid.map((day, i) => (
                <DayCell
                  key={i}
                  day={day}
                  year={year}
                  month={month}
                  info={day ? calData?.[isoDate(year, month, day)] : null}
                  today={today}
                  onSelect={(d) => setSelected(selected === d ? null : d)}
                  onBackfill={(d) => backfillMut.mutate(d)}
                />
              ))}
            </div>
          )}

          <Legend />
        </div>

        {/* Day popover */}
        {selected && (
          <DayPopover
            dateStr={selected}
            onClose={() => setSelected(null)}
            navigate={navigate}
          />
        )}

        {/* Backfill section */}
        <div className="card p-4 mt-4">
          <div className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-3">
            Recopilación masiva de datos
          </div>
          <p className="text-white/50 text-xs mb-3">
            Para cargar todos los datos de un rango de fechas pasadas (máx. 30 días por petición).
          </p>
          <BackfillForm onSubmit={(s, e) => backfillMut.mutate_range?.(s, e)} qc={qc} />
          {backfillMut.isPending && (
            <div className="flex items-center gap-2 mt-3 text-mlb-win text-xs font-medium">
              <div className="w-3 h-3 border-2 border-mlb-win border-t-transparent rounded-full animate-spin" />
              Recopilando datos en segundo plano…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Backfill form ────────────────────────────────────────────────────────────

function BackfillForm({ qc }) {
  const [start, setStart] = useState("");
  const [end,   setEnd]   = useState("");

  const mut = useMutation({
    mutationFn: () => api.backfillRange(start, end),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["games"] });
    },
  });

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div>
        <div className="text-white/30 text-xs mb-1">Desde</div>
        <input type="date" value={start} onChange={e => setStart(e.target.value)}
          className="bg-bg-card border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white
            focus:outline-none focus:border-mlb-red/60 transition-colors" />
      </div>
      <div>
        <div className="text-white/30 text-xs mb-1">Hasta</div>
        <input type="date" value={end} onChange={e => setEnd(e.target.value)}
          className="bg-bg-card border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white
            focus:outline-none focus:border-mlb-red/60 transition-colors" />
      </div>
      <button
        onClick={() => mut.mutate()}
        disabled={!start || !end || mut.isPending}
        className="px-4 py-2 bg-mlb-red rounded-lg text-sm font-bold text-white
          disabled:opacity-40 hover:bg-mlb-red/80 transition-colors"
      >
        {mut.isPending ? "Recopilando…" : "Recopilar"}
      </button>
    </div>
  );
}
