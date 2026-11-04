import React, { useMemo } from 'react';
import { ClubMatch, ClubPlayer, PlayerRatingPoint } from '../types/club';
import { getRatingCategory } from '../utils/eloCalc';
import { X, TrendingUp, Trophy, Calendar, PlusCircle, ArrowUpRight, ArrowDownRight, Edit3 } from 'lucide-react';

interface PlayerDetailModalProps {
  player: ClubPlayer | null;
  isOpen: boolean;
  onClose: () => void;
  matches: ClubMatch[];
  isAdmin?: boolean;
  onRecordMatchForPlayer: (player: ClubPlayer) => void;
  onEditPlayer: (player: ClubPlayer) => void;
  onEditMatch?: (match: ClubMatch) => void;
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  player,
  isOpen,
  onClose,
  matches,
  isAdmin = false,
  onRecordMatchForPlayer,
  onEditPlayer,
  onEditMatch,
}) => {
  if (!isOpen || !player) return null;

  const ratingCategory = getRatingCategory(player.currentRating);
  const netGain = player.currentRating - player.initialRating;

  // Filter matches involving this player
  const playerMatches = useMemo(() => {
    return matches.filter(
      (m) => m.whitePlayerId === player.id || m.blackPlayerId === player.id
    );
  }, [matches, player.id]);

  // Construct progression line points in chronological order
  const progressionTimeline: PlayerRatingPoint[] = useMemo(() => {
    const points: PlayerRatingPoint[] = [];

    // Initial baseline
    points.push({
      date: player.joinDate,
      rating: player.initialRating,
      opponentName: 'Starting Rating',
      delta: 0,
      result: 'Baseline',
      color: 'white',
    });

    // Chronological order (oldest to newest)
    const sorted = [...playerMatches].sort((a, b) => a.date.localeCompare(b.date));

    sorted.forEach((m) => {
      const isWhite = m.whitePlayerId === player.id;
      points.push({
        date: m.date,
        rating: isWhite ? m.whiteRatingAfter : m.blackRatingAfter,
        opponentName: isWhite ? m.blackPlayerName : m.whitePlayerName,
        delta: isWhite ? m.whiteDelta : m.blackDelta,
        result: m.result,
        color: isWhite ? 'white' : 'black',
      });
    });

    return points;
  }, [player, playerMatches]);

  // SVG Chart Geometry
  const svgWidth = 600;
  const svgHeight = 200;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 30;

  const ratings = progressionTimeline.map((p) => p.rating);
  const minVal = Math.floor(Math.min(...ratings, player.currentRating - 40) / 40) * 40;
  const maxVal = Math.ceil(Math.max(...ratings, player.peakRating + 40) / 40) * 40;
  const range = Math.max(80, maxVal - minVal);

  const innerW = svgWidth - padLeft - padRight;
  const innerH = svgHeight - padTop - padBottom;

  const getX = (idx: number) => {
    if (progressionTimeline.length <= 1) return padLeft + innerW / 2;
    return padLeft + (idx / (progressionTimeline.length - 1)) * innerW;
  };

  const getY = (val: number) => {
    return padTop + innerH - ((val - minVal) / range) * innerH;
  };

  const chartPoints = progressionTimeline.map((p, i) => `${getX(i)},${getY(p.rating)}`);
  const linePath = chartPoints.length > 0 ? `M ${chartPoints.join(' L ')}` : '';
  const areaPath =
    chartPoints.length > 0
      ? `M ${getX(0)},${padTop + innerH} L ${chartPoints.join(' L ')} L ${getX(
          progressionTimeline.length - 1
        )},${padTop + innerH} Z`
      : '';

  const winRate =
    player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[95vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Profile Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 font-bold text-amber-400 text-lg border border-slate-700">
              {player.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{player.name}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${ratingCategory.badgeClass}`}>
                  {ratingCategory.name}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {player.category}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {player.joinDate}
                </span>
                <span aria-hidden="true">·</span>
                <span>Attendance: {player.attendanceCount} Club Nights</span>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onEditPlayer(player);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                Edit Member
              </button>
              <button
                onClick={() => {
                  onClose();
                  onRecordMatchForPlayer(player);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                Record Game
              </button>
            </div>
          )}
        </div>

        {/* Rating Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <span className="text-[11px] text-slate-400 block">Current Elo</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-mono text-2xl font-extrabold text-white tabular-nums">
                {player.currentRating}
              </span>
              <span
                className={`font-mono text-xs font-bold tabular-nums flex items-center ${
                  netGain > 0
                    ? 'text-emerald-400'
                    : netGain < 0
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {netGain > 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3" />+{netGain}
                  </>
                ) : netGain < 0 ? (
                  <>
                    <ArrowDownRight className="h-3 w-3" />
                    {netGain}
                  </>
                ) : (
                  '±0'
                )}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <span className="text-[11px] text-slate-400 block">Peak Club Rating</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-mono text-2xl font-extrabold text-amber-300 tabular-nums">
                {player.peakRating}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <span className="text-[11px] text-slate-400 block">Club Record</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-mono text-lg font-bold text-white tabular-nums">
                {player.wins}W - {player.draws}D - {player.losses}L
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono tabular-nums">
              {winRate}% win rate ({player.gamesPlayed} games)
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <span className="text-[11px] text-slate-400 block">Color Splits</span>
            <div className="text-xs font-semibold text-slate-300 mt-1">
              White: {player.whiteWins}W · Black: {player.blackWins}W
            </div>
          </div>
        </div>

        {/* SVG Elo Progression Chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              Rating Progression Over Time
            </h3>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              Initial: {player.initialRating} ➔ Current: {player.currentRating}
            </span>
          </div>

          <div className="relative overflow-x-auto">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[450px]">
              <defs>
                <linearGradient id="playerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              {[0, 0.33, 0.66, 1].map((r) => {
                const val = Math.round(minVal + r * range);
                const y = getY(val);
                return (
                  <g key={r}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={svgWidth - padRight}
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padLeft - 6}
                      y={y + 3}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Area fill */}
              {areaPath && <path d={areaPath} fill="url(#playerGrad)" />}

              {/* Main line */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Points */}
              {progressionTimeline.map((p, idx) => {
                const cx = getX(idx);
                const cy = getY(p.rating);
                return (
                  <g key={idx}>
                    <circle cx={cx} cy={cy} r="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
                    <title>
                      {`${p.date}: ${p.rating} Elo (${p.delta > 0 ? `+${p.delta}` : p.delta}) vs ${p.opponentName}`}
                    </title>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Matches Ledger for this Player */}
        <div>
          <h3 className="text-sm font-bold text-white mb-2">Club Match History</h3>
          {playerMatches.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {playerMatches.map((m) => {
                const isWhite = m.whitePlayerId === player.id;
                const oppName = isWhite ? m.blackPlayerName : m.whitePlayerName;
                const oppRating = isWhite ? m.blackRatingBefore : m.whiteRatingBefore;
                const delta = isWhite ? m.whiteDelta : m.blackDelta;
                const endRating = isWhite ? m.whiteRatingAfter : m.blackRatingAfter;
                const userWon =
                  (isWhite && m.result === '1-0') || (!isWhite && m.result === '0-1');
                const isDraw = m.result === '1/2-1/2';

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-bold font-mono px-2 py-0.5 rounded text-xs ${
                          userWon
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isDraw
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {m.result}
                      </span>

                      <div>
                        <div className="font-semibold text-white">
                          vs {oppName} <span className="text-slate-400 font-mono">({oppRating})</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {m.date} {m.roundName ? `· ${m.roundName}` : ''} · Played as {isWhite ? 'White' : 'Black'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-white tabular-nums">
                          {endRating} Elo
                        </div>
                        <span
                          className={`font-mono text-xs font-semibold tabular-nums ${
                            delta > 0
                              ? 'text-emerald-400'
                              : delta < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      </div>
                      {isAdmin && onEditMatch && (
                        <button
                          onClick={() => {
                            onClose();
                            onEditMatch(m);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                          title="Edit Game Result (Admin)"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-3 text-center">
              No individual club matches recorded yet for this member.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
