import React, { useMemo } from 'react';
import { ClubMatch, ClubPlayer } from '../types/club';
import { Users, TrendingUp, Trophy, Award, Activity } from 'lucide-react';

interface ClubStatsOverviewProps {
  players: ClubPlayer[];
  matches: ClubMatch[];
}

export const ClubStatsOverview: React.FC<ClubStatsOverviewProps> = ({ players, matches }) => {
  const stats = useMemo(() => {
    const totalPlayers = players.length;
    const totalGames = matches.length;
    const avgRating =
      totalPlayers > 0
        ? Math.round(players.reduce((sum, p) => sum + p.currentRating, 0) / totalPlayers)
        : 0;

    // Biggest climber
    const sortedClimbers = [...players].sort((a, b) => {
      const gainA = a.currentRating - a.initialRating;
      const gainB = b.currentRating - b.initialRating;
      return gainB - gainA;
    });

    const topClimber = sortedClimbers[0] || null;

    // Rating tier counts
    const tiers = {
      expert: players.filter((p) => p.currentRating >= 2000).length,
      classA: players.filter((p) => p.currentRating >= 1800 && p.currentRating < 2000).length,
      classB: players.filter((p) => p.currentRating >= 1600 && p.currentRating < 1800).length,
      classC: players.filter((p) => p.currentRating >= 1400 && p.currentRating < 1600).length,
      classD: players.filter((p) => p.currentRating >= 1200 && p.currentRating < 1400).length,
      novice: players.filter((p) => p.currentRating < 1200).length,
    };

    return { totalPlayers, totalGames, avgRating, topClimber, tiers };
  }, [players, matches]);

  return (
    <div className="space-y-4">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Club Attendance</span>
            <Users className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
              {stats.totalPlayers}
            </span>
            <span className="text-xs text-slate-400">Players</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Active club members in roster
          </div>
        </div>

        {/* Average Club Rating */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Average Rating</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
              {stats.avgRating}
            </span>
            <span className="text-xs text-slate-400">Elo</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Across all rated club divisions
          </div>
        </div>

        {/* Over The Board Matches Logged */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Games Logged</span>
            <Trophy className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
              {stats.totalGames}
            </span>
            <span className="text-xs text-slate-400">Matches</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Over-the-board club rounds
          </div>
        </div>

        {/* Top Rating Climber */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Top Climber</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          {stats.topClimber ? (
            <div>
              <div className="font-semibold text-white text-base truncate">
                {stats.topClimber.name}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5 font-mono text-sm">
                <span className="text-emerald-400 font-bold tabular-nums">
                  +{stats.topClimber.currentRating - stats.topClimber.initialRating} pts
                </span>
                <span className="text-[11px] text-slate-400">
                  ({stats.topClimber.currentRating} Elo)
                </span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-500">None yet</span>
          )}
        </div>
      </div>

      {/* Tier Distribution Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <span className="text-xs font-semibold text-slate-300 block mb-2">
          Club Rating Distribution (FIDE Standard Tiers)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
          <div className="rounded-lg bg-slate-950/70 p-2 border border-slate-800">
            <span className="text-[10px] text-purple-400 block font-semibold">Expert (2000+)</span>
            <span className="font-mono text-base font-bold text-white tabular-nums">{stats.tiers.expert}</span>
          </div>
          <div className="rounded-lg bg-slate-950/70 p-2 border border-slate-800">
            <span className="text-[10px] text-indigo-400 block font-semibold">Class A (1800-1999)</span>
            <span className="font-mono text-base font-bold text-white tabular-nums">{stats.tiers.classA}</span>
          </div>
          <div className="rounded-lg bg-slate-950/70 p-2 border border-slate-800">
            <span className="text-[10px] text-blue-400 block font-semibold">Class B (1600-1799)</span>
            <span className="font-mono text-base font-bold text-white tabular-nums">{stats.tiers.classB}</span>
          </div>
          <div className="rounded-lg bg-slate-950/70 p-2 border border-slate-800">
            <span className="text-[10px] text-emerald-400 block font-semibold">Class C (1400-1599)</span>
            <span className="font-mono text-base font-bold text-white tabular-nums">{stats.tiers.classC}</span>
          </div>
          <div className="rounded-lg bg-slate-950/70 p-2 border border-slate-800">
            <span className="text-[10px] text-amber-400 block font-semibold">Class D (1200-1399)</span>
            <span className="font-mono text-base font-bold text-white tabular-nums">{stats.tiers.classD}</span>
          </div>
          <div className="rounded-lg bg-slate-950/70 p-2 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-semibold">Novice (&lt;1200)</span>
            <span className="font-mono text-base font-bold text-white tabular-nums">{stats.tiers.novice}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
