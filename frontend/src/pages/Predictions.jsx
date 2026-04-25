import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useGsapReveal, useGsapStagger } from "../hooks/useGsapReveal";

function ConfidenceBadge({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color =
    pct >= 70 ? "text-mlb-win bg-mlb-win/10" :
    pct >= 50 ? "text-yellow-400 bg-yellow-400/10" :
    "text-mlb-loss bg-mlb-loss/10";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {pct}%
    </span>
  );
}

function PredictionCard({ pred }) {
  const hits = pred.predicted_hits?.toFixed(1) ?? "—";
  const runs = pred.predicted_runs?.toFixed(1) ?? "—";
  const hrPct = pred.predicted_hr != null ? Math.round(pred.predicted_hr * 100) : null;

  return (
    <div data-stagger className="card p-4 hover:border-mlb-red/30 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <Link
            to={`/player/${pred.player_id}`}
            className="font-semibold text-sm hover:text-mlb-red transition-colors truncate block"
          >
            {pred.player_name}
          </Link>
          <div className="text-white/40 text-xs mt-0.5">
            vs {pred.opposing_pitcher_name ?? "—"}
          </div>
        </div>
        <ConfidenceBadge value={pred.confidence} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        {[["Hits esperados", hits], ["Carreras", runs], ["P(HR)", hrPct != null ? `${hrPct}%` : "—"]].map(([label, val]) => (
          <div key={label} className="bg-bg-accent/20 rounded-lg p-2">
            <div className="text-white/40 text-[10px] uppercase tracking-wide">{label}</div>
            <div className="font-display font-bold text-lg text-white">{val}</div>
          </div>
        ))}
      </div>

      {pred.reasoning && (
        <p className="text-white/50 text-xs leading-relaxed border-t border-white/5 pt-3">
          {pred.reasoning}
        </p>
      )}
    </div>
  );
}

function AccuracyPanel({ data }) {
  if (!data?.total) return null;
  return (
    <div className="card p-4 mb-6 flex gap-6 items-center">
      <div className="text-center">
        <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Predicciones totales</div>
        <div className="font-display text-2xl font-bold">{data.total}</div>
      </div>
      <div className="w-px h-10 bg-white/10" />
      <div className="text-center">
        <div className="text-xs text-white/40 uppercase tracking-wider mb-1">MAE hits</div>
        <div className="font-display text-2xl font-bold">{data.mae_hits?.toFixed(2) ?? "—"}</div>
      </div>
      <div className="w-px h-10 bg-white/10" />
      <div className="text-center">
        <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Hit Rate</div>
        <div className="font-display text-2xl font-bold text-mlb-win">
          {data.hit_rate != null ? `${Math.round(data.hit_rate * 100)}%` : "—"}
        </div>
      </div>
    </div>
  );
}

export default function Predictions() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);

  const { data: predictions = [], isLoading } = useQuery({
    queryKey: ["predictions", date],
    queryFn: () => api.predictions(date),
    staleTime: 300_000,
  });

  const { data: accuracy } = useQuery({
    queryKey: ["accuracy"],
    queryFn: api.predictionAccuracy,
    staleTime: 3_600_000,
  });

  const headerRef = useGsapReveal({ y: 20 });
  const gridRef = useGsapStagger({ deps: predictions.length });

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-16">
      <div ref={headerRef} className="mb-6">
        <h1 className="font-display text-4xl font-bold mb-1">
          🤖 Predicciones <span className="text-mlb-red">IA</span>
        </h1>
        <p className="text-white/40 text-sm">Generadas por Claude · Basadas en H2H, tendencias y ERA</p>
      </div>

      <AccuracyPanel data={accuracy} />

      <div className="flex items-center gap-3 mb-6">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-bg-card border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white
            focus:outline-none focus:border-mlb-red transition-colors"
        />
        <span className="text-white/30 text-sm">{predictions.length} predicciones</span>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 card animate-pulse" />)}
        </div>
      )}

      {!isLoading && predictions.length === 0 && (
        <div className="text-center text-white/30 py-16">
          <div className="text-5xl mb-4">🤖</div>
          <p className="text-lg mb-2">No hay predicciones para esta fecha</p>
          <p className="text-sm">Las predicciones se generan automáticamente a las 9:00 AM</p>
        </div>
      )}

      <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {predictions.map((p) => (
          <PredictionCard key={p.id} pred={p} />
        ))}
      </div>
    </div>
  );
}
