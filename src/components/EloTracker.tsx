import React, { useState } from 'react';
import { MatchHistoryItem, TimeControl, UserProfile } from '../types/chess';
import { TIME_CONTROLS, getNextRatingTier, getRatingPercentile, getRatingTier } from '../utils/elo';
import { TrendingUp, Award, Target, Trophy, Clock, Swords, ChevronRight } from 'lucide-react';

interface EloTrackerProps {
  userProfile: UserProfile;
  matchHistory: MatchHistoryItem[];
  onReviewMatch: (match: MatchHistoryItem) => void;
  onPlayNow: (timeControl: TimeControl) => void;
}

export const EloTracker: React.FC<EloTrackerProps> = ({
  userProfile,
  matchHistory,
  onReviewMatch,
  onPlayNow,
}) => {
  const [selectedTc, setSelectedTc] = useState<TimeControl>('rapid');
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    rating: number;
    date: string;
    opponent: string;
    delta: number;
    result: string;
    x: number;
    y: number;
  } | null>(null);

  const currentRating = userProfile.ratings[selectedTc];
  const peakRating = userProfile.peakRatings[selectedTc];
  const currentTier = getRatingTier(currentRating);
  const { nextTier, pointsNeeded, progressPercent } = getNextRatingTier(currentRating);
  const percentile = getRatingPercentile(currentRating);

  // Filter match history for this time control
  const filteredMatches = matchHistory.filter((m) => m.timeControl === selectedTc);

  // Compute rating progression timeline points
  // Construct a sequence of ratings starting from initial rating up to current
  const progressionData: { rating: number; match?: MatchHistoryItem; date: string }[] = [];

  // Build progression from matches in chronological order
  const chronological = [...filteredMatches].reverse();
  if (chronological.length > 0) {
    // Initial rating before first recorded game
    progressionData.push({
      rating: chronological[0].userRatingBefore,
      date: 'Baseline',
    });
    chronological.forEach((m) => {
      progressionData.push({
        rating: m.userRatingAfter,
        match: m,
        date: m.date,
      });
    });
  } else {
    // If no games yet in this format, provide placeholder initial point
    progressionData.push({ rating: currentRating, date: 'Initial' });
  }

  // Calculate opening stats for this format
  const openingMap: Record<string, { total: number; wins: number }> = {};
  filteredMatches.forEach((m) => {
    const op = m.openingName || 'Standard Opening';
    if (!openingMap[op]) {
      openingMap[op] = { total: 0, wins: 0 };
    }
    openingMap[op].total += 1;
    if (m.result === 'win') openingMap[op].wins += 1;
  });

  const openingStats = Object.entries(openingMap)
    .map(([name, data]) => ({
      name,
      total: data.total,
      wins: data.wins,
      winRate: Math.round((data.wins / data.total) * 100),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);

  // Chart Dimensions & Geometry
  const svgWidth = 700;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 35;

  const ratings = progressionData.map((d) => d.rating);
  const minVal = Math.floor(Math.min(...ratings, currentRating - 50) / 50) * 50;
  const maxVal = Math.ceil(Math.max(...ratings, peakRating + 50) / 50) * 50;
  const range = Math.max(100, maxVal - minVal);

  const chartInnerWidth = svgWidth - padLeft - padRight;
  const chartInnerHeight = svgHeight - padTop - padBottom;

  const getX = (idx: number) => {
    if (progressionData.length <= 1) return padLeft + chartInnerWidth / 2;
    return padLeft + (idx / (progressionData.length - 1)) * chartInnerWidth;
  };

  const getY = (val: number) => {
    return padTop + chartInnerHeight - ((val - minVal) / range) * chartInnerHeight;
  };

  // Generate SVG path line & area
  let linePath = '';
  let areaPath = '';
  if (progressionData.length > 0) {
    const points = progressionData.map((d, i) => `${getX(i)},${getY(d.rating)}`);
    linePath = `M ${points.join(' L ')}`;
    areaPath = `M ${getX(0)},${padTop + chartInnerHeight} L ${points.join(' L ')} L ${getX(
      progressionData.length - 1
    )},${padTop + chartInnerHeight} Z`;
  }

  // Format wins/losses
  const tcWins = filteredMatches.filter((m) => m.result === 'win').length;
  const tcLosses = filteredMatches.filter((m) => m.result === 'loss').length;
  const tcDraws = filteredMatches.filter((m) => m.result === 'draw').length;
  const tcTotal = filteredMatches.length;
  const tcWinRate = tcTotal > 0 ? Math.round((tcWins / tcTotal) * 100) : 50;

  // Streak calculation
  let streakCount = 0;
  let streakType: 'win' | 'loss' | 'draw' | null = null;
  for (const m of filteredMatches) {
    if (!streakType) {
      streakType = m.result;
      streakCount = 1;
    } else if (m.result === streakType) {
      streakCount++;
    } else {
      break;
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Format Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-amber-400" />
            Rating & Performance Analytics
          </h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            <span>FIDE / USCF Elo Standard</span>
            <span aria-hidden="true">·</span>
            <span>Dynamic K-Factor</span>
            <span aria-hidden="true">·</span>
            <span>Percentile Calibrated</span>
          </div>
        </div>

        {/* Time Control Segmented Button Control */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-900 border border-slate-800 p-1">
          {TIME_CONTROLS.map((tc) => {
            const isSelected = selectedTc === tc.id;
            return (
              <button
                key={tc.id}
                onClick={() => setSelectedTc(tc.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {tc.name.split(' ')[0]} ({userProfile.ratings[tc.id]})
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Current Elo Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Current Rating</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${currentTier.badgeBg}`}>
              {currentTier.name}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
              {currentRating}
            </span>
            <span className="text-xs text-slate-400 font-medium">Elo</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span>Top</span>
            <strong className="text-amber-400 font-mono tabular-nums">{percentile}%</strong>
            <span>of player pool</span>
          </div>
        </div>

        {/* Peak Rating */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span>Peak Rating</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-300 font-mono tabular-nums">
              {peakRating}
            </span>
            <span className="text-xs text-slate-400 font-medium">All-Time</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {currentRating >= peakRating ? 'Currently at your peak!' : `${peakRating - currentRating} pts below peak`}
          </div>
        </div>

        {/* Win Rate */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
            <Target className="h-3.5 w-3.5 text-emerald-400" />
            <span>Win Rate</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
              {tcWinRate}%
            </span>
            <span className="text-xs text-slate-400 font-medium font-mono tabular-nums">
              ({tcWins}W / {tcLosses}L / {tcDraws}D)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Across {tcTotal} {selectedTc} matches
          </div>
        </div>

        {/* Streak & Form */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
            <Award className="h-3.5 w-3.5 text-indigo-400" />
            <span>Recent Form</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                streakType === 'win'
                  ? 'text-emerald-400'
                  : streakType === 'loss'
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {streakCount > 0 ? `${streakCount} ${streakType?.toUpperCase()}S` : 'READY'}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1">
            {filteredMatches.slice(0, 5).map((m, idx) => (
              <span
                key={idx}
                title={`${m.result} vs ${m.opponent.name}`}
                className={`h-2.5 w-2.5 rounded-full ${
                  m.result === 'win'
                    ? 'bg-emerald-400'
                    : m.result === 'loss'
                    ? 'bg-rose-400'
                    : 'bg-amber-400'
                }`}
              />
            ))}
            <span className="text-[10px] text-slate-500 ml-1">last 5 games</span>
          </div>
        </div>
      </div>

      {/* Tier Milestone Progression Card */}
      {nextTier && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">Tier Milestone:</span>
              <span className="text-slate-300">{currentTier.name}</span>
              <ChevronRight className="h-3 w-3 text-slate-500" />
              <span className="font-bold text-amber-300">{nextTier.name} ({nextTier.minRating})</span>
            </div>
            <span className="font-mono text-xs text-amber-400 font-semibold tabular-nums">
              {pointsNeeded} Elo points to promotion
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Interactive Elo Progression Graph */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Rating Trajectory</h3>
            <p className="text-xs text-slate-400">Progression across completed rated matches</p>
          </div>
          <button
            onClick={() => onPlayNow(selectedTc)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
          >
            <Swords className="h-3.5 w-3.5" />
            Match in {selectedTc.charAt(0).toUpperCase() + selectedTc.slice(1)}
          </button>
        </div>

        {/* SVG Line Chart */}
        <div className="relative overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto min-w-[500px]"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const val = Math.round(minVal + ratio * range);
              const y = getY(val);
              return (
                <g key={ratio}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="11"
                    fontFamily="monospace"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Gradient Area Fill */}
            {areaPath && <path d={areaPath} fill="url(#eloGrad)" />}

            {/* Main Trend Line */}
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

            {/* Interactive Data Points */}
            {progressionData.map((d, idx) => {
              const cx = getX(idx);
              const cy = getY(d.rating);
              const isPeak = d.rating === peakRating;

              return (
                <g
                  key={idx}
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    setHoveredPoint({
                      index: idx,
                      rating: d.rating,
                      date: d.date,
                      opponent: d.match ? d.match.opponent.name : 'Starting Rating',
                      delta: d.match ? d.match.ratingDelta : 0,
                      result: d.match ? d.match.result : 'Baseline',
                      x: cx,
                      y: cy,
                    });
                  }}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isPeak ? 5 : 4}
                    fill={isPeak ? '#fbbf24' : '#0f172a'}
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                  {isPeak && (
                    <text
                      x={cx}
                      y={cy - 9}
                      textAnchor="middle"
                      fill="#fbbf24"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      Peak
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Hover Tooltip */}
          {hoveredPoint && (
            <div
              className="pointer-events-none absolute z-30 rounded-lg border border-slate-700 bg-slate-950/95 p-2 text-xs shadow-xl backdrop-blur-sm"
              style={{
                left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                transform: 'translate(-50%, -120%)',
              }}
            >
              <div className="font-mono font-bold text-white tabular-nums">
                {hoveredPoint.rating} Elo{' '}
                {hoveredPoint.delta !== 0 && (
                  <span
                    className={
                      hoveredPoint.delta > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }
                  >
                    ({hoveredPoint.delta > 0 ? `+${hoveredPoint.delta}` : hoveredPoint.delta})
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {hoveredPoint.opponent} · {hoveredPoint.date}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Opening Repertoire & Match Breakdown Split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Openings repertoire */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 md:col-span-1">
          <h3 className="text-sm font-bold text-white mb-3">Opening Repertoire</h3>
          {openingStats.length > 0 ? (
            <div className="space-y-3">
              {openingStats.map((op) => (
                <div key={op.name} className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-200 truncate pr-2" title={op.name}>
                      {op.name}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold tabular-nums">
                      {op.winRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{op.total} games</span>
                    <span>{op.wins} wins</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Play rated matches to unlock your opening repertoire statistics.
            </p>
          )}
        </div>

        {/* Recent Matches Log */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Recent Match History</h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {filteredMatches.length} Recorded
            </span>
          </div>

          {filteredMatches.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {filteredMatches.slice(0, 10).map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 hover:bg-slate-950 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Outcome Badge */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${
                        match.result === 'win'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : match.result === 'loss'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {match.result.slice(0, 1).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-white">
                          vs {match.opponent.name}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          ({match.opponentRating})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span>{match.openingName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{match.movesCount} moves</span>
                        <span aria-hidden="true">·</span>
                        <span>{match.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-white tabular-nums block">
                        {match.userRatingAfter}
                      </span>
                      <span
                        className={`font-mono text-xs font-semibold tabular-nums ${
                          match.ratingDelta > 0
                            ? 'text-emerald-400'
                            : match.ratingDelta < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {match.ratingDelta > 0 ? `+${match.ratingDelta}` : match.ratingDelta}
                      </span>
                    </div>

                    <button
                      onClick={() => onReviewMatch(match)}
                      className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400">No {selectedTc} games played yet.</p>
              <button
                onClick={() => onPlayNow(selectedTc)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
              >
                Play First {selectedTc.charAt(0).toUpperCase() + selectedTc.slice(1)} Match
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
