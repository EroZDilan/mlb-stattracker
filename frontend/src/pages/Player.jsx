import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { api } from "../api";
import { useGsapStagger } from "../hooks/useGsapReveal";

gsap.registerPlugin(ScrollTrigger);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MLB_PHOTO = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_426,q_auto:best/v1/people/${id}/headshot/67/current`;

const TEAM_LOGO = (id) =>
  `https://www.mlbstatic.com/team-logos/${id}.svg`;

function avg(arr, key) {
  const vals = arr.map(r => r[key] || 0).filter(v => v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

// ─── Animated stat circle ────────────────────────────────────────────────────

function StatRing({ value, max, label, color = "#e94560", size = 80 }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const dashRef = useRef(null);
  const numRef = useRef(null);

  useEffect(() => {
    const pct = Math.min(value / max, 1);
    const dash = circ * pct;
    if (dashRef.current) {
      gsap.fromTo(dashRef.current,
        { strokeDashoffset: circ },
        { strokeDashoffset: circ - dash, duration: 1.4, ease: "power3.out",
          scrollTrigger: { trigger: dashRef.current, start: "top 90%", toggleActions: "play none none none" } }
      );
    }
    if (numRef.current) {
      const obj = { v: 0 };
      gsap.to(obj, {
        v: value, duration: 1.4, ease: "power3.out",
        onUpdate: () => { numRef.current.textContent = obj.v.toFixed(value < 10 ? 2 : 0); },
        scrollTrigger: { trigger: numRef.current, start: "top 90%", toggleActions: "play none none none" },
      });
    }
  }, [value, max, circ]);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle ref={dashRef} cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ} />
      </svg>
      <div className="text-center -mt-1" style={{ marginTop: -(size + 8) }}>
        <div ref={numRef} className="font-display font-bold text-white"
          style={{ fontSize: size * 0.22, lineHeight: `${size}px` }}>0</div>
      </div>
      <div className="text-white/40 text-[10px] uppercase tracking-widest font-medium">{label}</div>
    </div>
  );
}

// ─── Stat bar row ─────────────────────────────────────────────────────────────

function StatBar({ label, value, max, format, color = "#e94560" }) {
  const barRef = useRef(null);
  const valRef = useRef(null);
  const pct = Math.min((value / max) * 100, 100);

  useEffect(() => {
    gsap.fromTo(barRef.current,
      { width: "0%" },
      { width: `${pct}%`, duration: 1.2, ease: "power3.out",
        scrollTrigger: { trigger: barRef.current, start: "top 92%", toggleActions: "play none none none" } }
    );
    const obj = { v: 0 };
    gsap.to(obj, {
      v: value, duration: 1.2, ease: "power3.out",
      onUpdate: () => { if (valRef.current) valRef.current.textContent = format ? format(obj.v) : obj.v.toFixed(0); },
      scrollTrigger: { trigger: barRef.current, start: "top 92%", toggleActions: "play none none none" },
    });
  }, [value, pct]);

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="text-white/50 text-xs w-16 shrink-0 uppercase tracking-wider">{label}</div>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div ref={barRef} className="h-full rounded-full" style={{ background: color, width: "0%" }} />
      </div>
      <div ref={valRef} className="text-white font-bold tabular-nums text-sm w-12 text-right">0</div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function Tabs({ tabs, active, onChange }) {
  const indicatorRef = useRef(null);
  const tabsRef = useRef({});

  useEffect(() => {
    const el = tabsRef.current[active];
    const ind = indicatorRef.current;
    if (!el || !ind) return;
    const rect = el.getBoundingClientRect();
    const parentRect = el.parentElement.getBoundingClientRect();
    gsap.to(ind, {
      x: rect.left - parentRect.left,
      width: rect.width,
      duration: 0.35,
      ease: "power3.out",
    });
  }, [active]);

  return (
    <div className="relative flex gap-0 border-b border-white/10 mb-6">
      <div ref={indicatorRef} className="absolute bottom-0 h-0.5 bg-mlb-red rounded-full"
        style={{ width: 0 }} />
      {tabs.map(t => (
        <button
          key={t.id}
          ref={el => tabsRef.current[t.id] = el}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors duration-200 whitespace-nowrap
            ${active === t.id ? "text-white" : "text-white/40 hover:text-white/70"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Batting tab ─────────────────────────────────────────────────────────────

function BattingTab({ seasonStats, recentGames }) {
  const s = seasonStats?.hitting ?? {};
  const chartData = [...(recentGames || [])].reverse().map((g, i) => ({
    n: i + 1,
    H: g.hits || 0,
    HR: g.home_runs || 0,
    RBI: g.rbi || 0,
    K: g.strikeouts || 0,
  }));

  const tableRef = useGsapStagger({ deps: recentGames?.length });

  return (
    <div>
      {/* Rings row */}
      {Object.keys(s).length > 0 && (
        <div className="grid grid-cols-4 md:grid-cols-7 gap-4 mb-8 justify-items-center">
          <StatRing value={parseFloat(s.avg) || 0} max={0.4} label="AVG" />
          <StatRing value={parseFloat(s.obp) || 0} max={0.5} label="OBP" color="#4caf50" />
          <StatRing value={parseFloat(s.slg) || 0} max={0.7} label="SLG" color="#2196f3" />
          <StatRing value={parseFloat(s.ops) || 0} max={1.1} label="OPS" color="#ff9800" />
          <StatRing value={s.homeRuns || 0} max={50} label="HR" size={72} />
          <StatRing value={s.rbi || 0} max={130} label="RBI" size={72} color="#4caf50" />
          <StatRing value={s.stolenBases || 0} max={50} label="SB" size={72} color="#9c27b0" />
        </div>
      )}

      {/* Stat bars */}
      {Object.keys(s).length > 0 && (
        <div className="card p-4 mb-6">
          <div className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-3">
            Estadísticas de temporada
          </div>
          <StatBar label="AVG" value={parseFloat(s.avg) || 0} max={0.4} format={v => v.toFixed(3)} />
          <StatBar label="OBP" value={parseFloat(s.obp) || 0} max={0.5} format={v => v.toFixed(3)} color="#4caf50" />
          <StatBar label="SLG" value={parseFloat(s.slg) || 0} max={0.7} format={v => v.toFixed(3)} color="#2196f3" />
          <StatBar label="HR" value={s.homeRuns || 0} max={50} color="#ff9800" />
          <StatBar label="RBI" value={s.rbi || 0} max={130} color="#4caf50" />
          <StatBar label="BB" value={s.baseOnBalls || 0} max={100} color="#9c27b0" />
          <StatBar label="K" value={s.strikeOuts || 0} max={200} color="#f44336" />
        </div>
      )}

      {/* Game log chart */}
      {chartData.length > 0 && (
        <div className="card p-4 mb-6">
          <div className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-4">
            Últimos {chartData.length} partidos — Hits
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={chartData} barCategoryGap="35%">
              <XAxis dataKey="n" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "#16213e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: "rgba(255,255,255,0.5)" }}
              />
              <Bar dataKey="H" radius={[3,3,0,0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.H >= 3 ? "#e94560" : d.H >= 2 ? "#ff9800" : d.H === 1 ? "#4caf50" : "rgba(255,255,255,0.08)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Game log table */}
      {recentGames?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 text-[10px] font-bold tracking-widest text-white/30 uppercase">
            Registro de partidos
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/25 text-xs uppercase tracking-wider">
                  {["Fecha","AB","H","2B","3B","HR","RBI","BB","K","AVG"].map(h => (
                    <th key={h} className="px-3 py-2 text-center font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody ref={tableRef}>
                {recentGames.map((g, i) => {
                  const avg = g.at_bats > 0 ? (g.hits / g.at_bats).toFixed(3) : "—";
                  const good = g.hits >= 2 || g.home_runs >= 1;
                  const bad = g.at_bats >= 3 && g.hits === 0;
                  return (
                    <tr key={i} data-stagger
                      className={`border-t border-white/5 transition-colors hover:bg-white/[0.03]
                        ${good ? "bg-mlb-win/5" : bad ? "bg-mlb-loss/5" : ""}`}>
                      <td className="px-3 py-2 text-white/50 text-xs">{g.date}</td>
                      {[g.at_bats, g.hits, g.doubles, g.triples, g.home_runs, g.rbi, g.walks, g.strikeouts].map((v, j) => (
                        <td key={j} className={`px-3 py-2 text-center tabular-nums font-medium
                          ${j === 1 && v > 0 ? "text-mlb-win" : j === 4 && v > 0 ? "text-mlb-red" : "text-white/70"}`}>
                          {v ?? 0}
                        </td>
                      ))}
                      <td className={`px-3 py-2 text-center tabular-nums font-bold
                        ${parseFloat(avg) >= 0.300 ? "text-mlb-win" : parseFloat(avg) < 0.200 && avg !== "—" ? "text-mlb-loss" : "text-white/70"}`}>
                        {avg}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pitching tab ─────────────────────────────────────────────────────────────

function PitchingTab({ seasonStats, recentPitching }) {
  const s = seasonStats?.pitching ?? {};
  const chartData = [...(recentPitching || [])].reverse().map((g, i) => ({
    n: i + 1,
    IP: g.innings_pitched || 0,
    ER: g.earned_runs || 0,
    K: g.strikeouts || 0,
  }));
  const tableRef = useGsapStagger({ deps: recentPitching?.length });

  return (
    <div>
      {Object.keys(s).length > 0 && (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-4 mb-8 justify-items-center">
          <StatRing value={parseFloat(s.era) || 0} max={6} label="ERA" color="#ff9800" />
          <StatRing value={parseFloat(s.whip) || 0} max={2} label="WHIP" color="#2196f3" />
          <StatRing value={s.strikeOuts || 0} max={250} label="K" size={72} />
          <StatRing value={s.baseOnBalls || 0} max={100} label="BB" size={72} color="#9c27b0" />
          <StatRing value={s.wins || 0} max={20} label="W" size={72} color="#4caf50" />
          <StatRing value={s.losses || 0} max={20} label="L" size={72} color="#f44336" />
        </div>
      )}

      {Object.keys(s).length > 0 && (
        <div className="card p-4 mb-6">
          <div className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-3">Estadísticas de temporada</div>
          <StatBar label="ERA" value={parseFloat(s.era) || 0} max={6} format={v => v.toFixed(2)} color="#ff9800" />
          <StatBar label="WHIP" value={parseFloat(s.whip) || 0} max={2} format={v => v.toFixed(2)} color="#2196f3" />
          <StatBar label="K/9" value={parseFloat(s.strikeoutsPer9Inn) || 0} max={15} format={v => v.toFixed(1)} />
          <StatBar label="BB/9" value={parseFloat(s.walksPer9Inn) || 0} max={6} format={v => v.toFixed(1)} color="#9c27b0" />
          <StatBar label="HR/9" value={parseFloat(s.homeRunsPer9) || 0} max={3} format={v => v.toFixed(1)} color="#f44336" />
        </div>
      )}

      {chartData.length > 0 && (
        <div className="card p-4 mb-6">
          <div className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-4">
            Últimas {chartData.length} salidas — Innings pitcheados
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={chartData} barCategoryGap="35%">
              <XAxis dataKey="n" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 9]} />
              <Tooltip contentStyle={{ background: "#16213e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: "rgba(255,255,255,0.5)" }} />
              <ReferenceLine y={6} stroke="rgba(233,69,96,0.3)" strokeDasharray="4 4" />
              <Bar dataKey="IP" radius={[3,3,0,0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.IP >= 6 ? "#4caf50" : d.IP >= 4 ? "#ff9800" : "#f44336"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {recentPitching?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 text-[10px] font-bold tracking-widest text-white/30 uppercase">
            Registro de salidas
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/25 text-xs uppercase tracking-wider">
                  {["Fecha","IP","H","ER","BB","K","ERA"].map(h => (
                    <th key={h} className="px-3 py-2 text-center font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody ref={tableRef}>
                {recentPitching.map((g, i) => {
                  const qStart = g.innings_pitched >= 6 && g.earned_runs <= 3;
                  return (
                    <tr key={i} data-stagger
                      className={`border-t border-white/5 hover:bg-white/[0.03] transition-colors
                        ${qStart ? "bg-mlb-win/5" : g.earned_runs >= 5 ? "bg-mlb-loss/5" : ""}`}>
                      <td className="px-3 py-2 text-white/50 text-xs">{g.date}</td>
                      <td className="px-3 py-2 text-center font-bold text-white/80">{g.innings_pitched}</td>
                      <td className="px-3 py-2 text-center text-white/60">{g.hits ?? 0}</td>
                      <td className={`px-3 py-2 text-center font-bold ${g.earned_runs === 0 ? "text-mlb-win" : g.earned_runs >= 4 ? "text-mlb-loss" : "text-white/70"}`}>
                        {g.earned_runs ?? 0}
                      </td>
                      <td className="px-3 py-2 text-center text-white/60">{g.walks ?? 0}</td>
                      <td className="px-3 py-2 text-center text-mlb-red font-semibold">{g.strikeouts ?? 0}</td>
                      <td className="px-3 py-2 text-center text-white/50 text-xs">{g.era?.toFixed(2) ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── vs Pitchers tab ─────────────────────────────────────────────────────────

function VsPitchersTab({ data }) {
  const sorted = [...(data || [])].sort((a, b) => b.avg - a.avg);
  const best = sorted.slice(0, 5);
  const worst = sorted.slice(-5).reverse();
  const tableRef = useGsapStagger({ deps: data?.length });

  return (
    <div>
      {/* Best matchups */}
      {best.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-mlb-win" />
            <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Mejores matchups</span>
          </div>
          <div className="flex flex-col gap-2">
            {best.map(r => (
              <div key={r.pitcher_id} data-stagger
                className="card p-3 flex items-center gap-3 border-l-2 border-mlb-win">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{r.pitcher_name}</div>
                  <div className="text-white/30 text-xs">{r.at_bats} AB</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-xl font-bold text-mlb-win">.{String(Math.round(r.avg * 1000)).padStart(3,"0")}</div>
                  <div className="text-white/40 text-xs">{r.hits}H · {r.home_runs}HR</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Worst matchups */}
      {worst.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-mlb-loss" />
            <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Peores matchups</span>
          </div>
          <div className="flex flex-col gap-2">
            {worst.map(r => (
              <div key={r.pitcher_id} data-stagger
                className="card p-3 flex items-center gap-3 border-l-2 border-mlb-loss">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{r.pitcher_name}</div>
                  <div className="text-white/30 text-xs">{r.at_bats} AB</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-xl font-bold text-mlb-loss">.{String(Math.round(r.avg * 1000)).padStart(3,"0")}</div>
                  <div className="text-white/40 text-xs">{r.hits}H · {r.home_runs}HR</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full table */}
      {sorted.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 text-[10px] font-bold tracking-widest text-white/30 uppercase">
            Historial completo
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/25 text-xs uppercase tracking-wider">
                  {["Pitcher","AB","H","HR","BB","AVG"].map(h => (
                    <th key={h} className={`px-3 py-2 font-medium ${h === "Pitcher" ? "text-left" : "text-center"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody ref={tableRef}>
                {sorted.map(r => (
                  <tr key={r.pitcher_id} data-stagger className="border-t border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="px-3 py-2.5 font-medium text-white/80">{r.pitcher_name}</td>
                    <td className="px-3 py-2.5 text-center text-white/50">{r.at_bats}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-white">{r.hits}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-mlb-red">{r.home_runs}</td>
                    <td className="px-3 py-2.5 text-center text-purple-400">{r.walks ?? 0}</td>
                    <td className={`px-3 py-2.5 text-center font-bold
                      ${r.avg >= 0.300 ? "text-mlb-win" : r.avg < 0.200 ? "text-mlb-loss" : "text-white/80"}`}>
                      .{String(Math.round(r.avg * 1000)).padStart(3,"0")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sorted.length === 0 && (
        <div className="text-center text-white/20 py-12">
          <p>Sin datos H2H suficientes aún</p>
          <p className="text-xs mt-1">Se acumulan con los juegos recopilados</p>
        </div>
      )}
    </div>
  );
}

// ─── vs Batters tab ───────────────────────────────────────────────────────────

function VsBattersTab({ data }) {
  const sorted = [...(data || [])].sort((a, b) => b.at_bats - a.at_bats);
  const tableRef = useGsapStagger({ deps: data?.length });

  return (
    <div>
      {sorted.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 text-[10px] font-bold tracking-widest text-white/30 uppercase">
            Bateadores enfrentados
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/25 text-xs uppercase tracking-wider">
                  {["Bateador","AB","H","HR","AVG"].map(h => (
                    <th key={h} className={`px-3 py-2 font-medium ${h === "Bateador" ? "text-left" : "text-center"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody ref={tableRef}>
                {sorted.map(r => (
                  <tr key={r.batter_id} data-stagger className="border-t border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="px-3 py-2.5">
                      <Link to={`/player/${r.batter_id}`} className="font-medium text-white/80 hover:text-mlb-red transition-colors">
                        {r.batter_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-center text-white/50">{r.at_bats}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-white">{r.hits}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-mlb-red">{r.home_runs}</td>
                    <td className={`px-3 py-2.5 text-center font-bold
                      ${r.avg < 0.200 ? "text-mlb-win" : r.avg >= 0.300 ? "text-mlb-loss" : "text-white/80"}`}>
                      .{String(Math.round(r.avg * 1000)).padStart(3,"0")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center text-white/20 py-12">
          <p>Sin datos H2H suficientes aún</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Player page ─────────────────────────────────────────────────────────

export default function Player() {
  const { id } = useParams();
  const [tab, setTab] = useState("stats");
  const headerRef = useRef(null);
  const photoRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ["player", id],
    queryFn: () => api.player(Number(id)),
    staleTime: 300_000,
    refetchInterval: 86_400_000, // once per day
  });

  const { data: vsPitchers = [] } = useQuery({
    queryKey: ["player-vs", id],
    queryFn: () => api.playerVsPitchers(Number(id)),
    staleTime: 3_600_000,
  });

  const { data: vsBatters = [] } = useQuery({
    queryKey: ["pitcher-vs", id],
    queryFn: () => api.playerVsBatters ? api.playerVsBatters(Number(id)) : Promise.resolve([]),
    staleTime: 3_600_000,
    enabled: !!data?.is_pitcher,
  });

  // Header entrance
  useEffect(() => {
    if (!data || !headerRef.current) return;
    const tweens = [
      gsap.fromTo(photoRef.current,
        { x: -40, opacity: 0, scale: 0.9 },
        { x: 0, opacity: 1, scale: 1, duration: 0.8, ease: "power3.out", clearProps: "opacity,x,scale,transform" }
      ),
      gsap.fromTo(".player-info-text > *",
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: "power3.out", delay: 0.15, clearProps: "opacity,x,transform" }
      ),
      gsap.fromTo(".player-team-bg",
        { opacity: 0, scale: 1.1 },
        { opacity: 1, scale: 1, duration: 1.2, ease: "power3.out", clearProps: "opacity,scale,transform" }
      ),
    ];
    return () => { tweens.forEach(t => t.kill()); gsap.set([photoRef.current, ".player-info-text > *", ".player-team-bg"], { clearProps: "all" }); };
  }, [data]);

  if (isLoading) return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-16">
      <div className="h-48 card animate-pulse mb-6" />
      <div className="h-8 card animate-pulse mb-4" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 card animate-pulse" />)}
      </div>
    </div>
  );
  if (!data) return null;

  const { info, is_pitcher, recent_games, recent_pitching, season_stats } = data;
  const teamId = info?.currentTeam?.id;
  const teamName = info?.currentTeam?.name ?? "";

  const hittingTabs = [
    { id: "stats", label: "Temporada" },
    { id: "vsp", label: "vs Pitchers" },
  ];
  const pitchingTabs = [
    { id: "stats", label: "Temporada" },
    { id: "vsb", label: "vs Bateadores" },
  ];
  const tabList = is_pitcher ? pitchingTabs : hittingTabs;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-16">
      <Link to="/" className="text-white/30 hover:text-white text-sm mb-6 inline-flex items-center gap-1 transition-colors">
        ← Volver
      </Link>

      {/* Header card */}
      <div ref={headerRef} className="card overflow-hidden mb-6 relative">
        {/* Team logo watermark */}
        {teamId && (
          <div className="player-team-bg absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none">
            <img src={TEAM_LOGO(teamId)} alt="" style={{ width: 200, height: 200, objectFit: "contain" }} />
          </div>
        )}

        {/* Gradient overlay on card */}
        <div className="absolute inset-0 bg-gradient-to-r from-bg-card via-transparent to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-5 p-5">
          {/* Player photo */}
          <div ref={photoRef} className="shrink-0 relative">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-bg-accent ring-2 ring-white/10">
              <img
                src={MLB_PHOTO(id)}
                alt={info.fullName}
                className="w-full h-full object-cover object-top"
                onError={e => { e.target.src = `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_426,q_auto:best/v1/people/generic/headshot/67/current`; }}
              />
            </div>
            {is_pitcher && (
              <div className="absolute -bottom-1 -right-1 bg-mlb-red text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                P
              </div>
            )}
          </div>

          {/* Info */}
          <div className="player-info-text flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {info.primaryNumber && (
                <span className="text-mlb-red font-display font-black text-lg">#{info.primaryNumber}</span>
              )}
              <span className="text-white/30 text-xs uppercase tracking-widest">
                {info.primaryPosition?.abbreviation}
              </span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-black text-white leading-tight">
              {info.fullName}
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              {teamId && (
                <img src={TEAM_LOGO(teamId)} alt={teamName} style={{ width: 18, height: 18, objectFit: "contain" }} />
              )}
              <span className="text-white/50 text-sm">{teamName}</span>
              {info.batSide && (
                <span className="text-white/20 text-xs">· Batea {info.batSide.description}</span>
              )}
              {info.pitchHand && is_pitcher && (
                <span className="text-white/20 text-xs">· Lanza {info.pitchHand.description}</span>
              )}
            </div>
            {info.birthCity && (
              <div className="text-white/25 text-xs mt-1">
                {info.birthCity}, {info.birthCountry}
                {info.birthDate && <> · {new Date().getFullYear() - new Date(info.birthDate).getFullYear()} años</>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabList} active={tab} onChange={setTab} />

      {/* Tab content */}
      {tab === "stats" && (
        is_pitcher
          ? <PitchingTab seasonStats={season_stats} recentPitching={recent_pitching} />
          : <BattingTab seasonStats={season_stats} recentGames={recent_games} />
      )}
      {tab === "vsp" && <VsPitchersTab data={vsPitchers} />}
      {tab === "vsb" && <VsBattersTab data={vsBatters} />}
    </div>
  );
}
