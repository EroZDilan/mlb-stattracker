import { Link } from "react-router-dom";

function isFinalStatus(status) {
  const s = status?.toLowerCase() ?? "";
  return s.includes("final") || s.includes("game over") || s.includes("completed");
}

function StatusBadge({ status }) {
  const s = status?.toLowerCase() ?? "";
  const isLive = s.includes("progress") || s.includes("live");
  const isFinal = isFinalStatus(status);
  if (isLive) return <span className="badge-live">EN VIVO</span>;
  if (isFinal) return <span className="badge-final">FINAL</span>;
  return <span className="text-white/50 text-xs font-medium">{status}</span>;
}

export default function GameCard({ game }) {
  const homeWon = isFinalStatus(game.status) && game.home_score > game.away_score;
  const awayWon = isFinalStatus(game.status) && game.away_score > game.home_score;

  return (
    <Link
      to={`/game/${game.game_id}`}
      data-stagger
      className="card p-4 flex items-center justify-between gap-4 hover:border-mlb-red/40
        hover:bg-bg-card/80 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-semibold truncate ${awayWon ? "text-white" : "text-white/60"}`}>
            {game.away_team}
          </span>
          <span className={`text-2xl font-display font-bold ml-3 tabular-nums ${awayWon ? "text-white" : "text-white/50"}`}>
            {game.away_score ?? "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold truncate ${homeWon ? "text-white" : "text-white/60"}`}>
            {game.home_team}
          </span>
          <span className={`text-2xl font-display font-bold ml-3 tabular-nums ${homeWon ? "text-white" : "text-white/50"}`}>
            {game.home_score ?? "—"}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 min-w-[80px]">
        <StatusBadge status={game.status} />
        {game.venue && (
          <span className="text-white/30 text-xs text-center leading-tight line-clamp-1">
            {game.venue}
          </span>
        )}
      </div>

      <div className="text-white/20 group-hover:text-mlb-red transition-colors text-lg">›</div>
    </Link>
  );
}
