import React, { useState } from 'react';
import { BotPlayer, TimeControl, UserProfile } from '../types/chess';
import { SIMULATED_PLAYERS } from '../data/mockPlayers';
import { TIME_CONTROLS, getRatingTier } from '../utils/elo';
import { Trophy, Swords, Globe, Users, Filter } from 'lucide-react';

interface LeaderboardProps {
  userProfile: UserProfile;
  onChallengePlayer: (player: BotPlayer, timeControl: TimeControl) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ userProfile, onChallengePlayer }) => {
  const [selectedTc, setSelectedTc] = useState<TimeControl>('rapid');
  const [filterMode, setFilterMode] = useState<'all' | 'similar' | 'titled'>('similar');

  const userRating = userProfile.ratings[selectedTc];

  const getPlayerRating = (player: BotPlayer) => {
    switch (selectedTc) {
      case 'bullet':
        return player.bulletRating;
      case 'blitz':
        return player.blitzRating;
      case 'rapid':
        return player.rapidRating;
      case 'classical':
        return player.classicalRating;
    }
  };

  // Combine bot pool with user profile entry
  const userEntry: BotPlayer = {
    id: userProfile.id,
    name: userProfile.username,
    rating: userRating,
    blitzRating: userProfile.ratings.blitz,
    rapidRating: userProfile.ratings.rapid,
    bulletRating: userProfile.ratings.bullet,
    classicalRating: userProfile.ratings.classical,
    countryCode: userProfile.countryCode,
    countryName: userProfile.countryName,
    avatarSeed: userProfile.avatarSeed,
    playStyle: 'Adaptive Tactician',
    title: userProfile.title,
    winRate: userProfile.totalWins > 0
      ? Math.round((userProfile.totalWins / Math.max(1, userProfile.totalWins + userProfile.totalLosses)) * 100)
      : 50,
    bio: 'You',
    tacticalAggressiveness: 0.5,
    errorProbability: 0,
    depth: 3,
  };

  let combined = [...SIMULATED_PLAYERS, userEntry];

  // Sort descending by selected time control rating
  combined.sort((a, b) => getPlayerRating(b) - getPlayerRating(a));

  // Filter based on filterMode
  if (filterMode === 'similar') {
    combined = combined.filter((p) => Math.abs(getPlayerRating(p) - userRating) <= 180);
  } else if (filterMode === 'titled') {
    combined = combined.filter((p) => Boolean(p.title) || p.id === userProfile.id);
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-400" />
            Competitive Leaderboard
          </h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            <span>Real-time Elo Ratings</span>
            <span aria-hidden="true">·</span>
            <span>Match & Challenge Available</span>
            <span aria-hidden="true">·</span>
            <span>Global Matchmaking Pool</span>
          </div>
        </div>

        {/* Format Selector */}
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
                {tc.name.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterMode('similar')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
            filterMode === 'similar'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Players Near Your Elo (±180)
        </button>
        <button
          onClick={() => setFilterMode('all')}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
            filterMode === 'all'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          Top Global Rankings
        </button>
        <button
          onClick={() => setFilterMode('titled')}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
            filterMode === 'titled'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          Titled Masters (GM / IM / FM)
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-xs font-semibold text-slate-400">
              <tr>
                <th className="py-3 pl-4 pr-2 w-14">Rank</th>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4">Play Style</th>
                <th className="py-3 px-4 text-right">Rating</th>
                <th className="py-3 px-4 text-right">Win Rate</th>
                <th className="py-3 pr-4 pl-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {combined.map((player, idx) => {
                const isUser = player.id === userProfile.id;
                const rating = getPlayerRating(player);
                const tier = getRatingTier(rating);

                return (
                  <tr
                    key={player.id}
                    className={`transition-colors ${
                      isUser
                        ? 'bg-amber-500/10 hover:bg-amber-500/15 ring-1 ring-inset ring-amber-400/30'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 pl-4 pr-2 font-mono text-xs text-slate-400 tabular-nums">
                      {idx === 0 ? (
                        <span className="text-amber-400 font-bold">#1</span>
                      ) : idx === 1 ? (
                        <span className="text-slate-300 font-bold">#2</span>
                      ) : idx === 2 ? (
                        <span className="text-amber-600 font-bold">#3</span>
                      ) : (
                        `#${idx + 1}`
                      )}
                    </td>

                    {/* Player Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                            isUser
                              ? 'bg-amber-500 text-slate-950 shadow-sm'
                              : 'bg-slate-800 text-amber-300 border border-slate-700'
                          }`}
                        >
                          {player.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-semibold ${isUser ? 'text-amber-300' : 'text-white'}`}>
                              {player.name}
                            </span>
                            {isUser && (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/20 px-1.5 py-0.2 rounded">
                                YOU
                              </span>
                            )}
                            {player.title && (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1 py-0.2 rounded border border-amber-400/30">
                                {player.title}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Globe className="h-3 w-3 text-slate-500" />
                            <span>{player.countryName}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Playstyle */}
                    <td className="py-3 px-4 text-xs text-slate-300">
                      <span>{player.playStyle}</span>
                    </td>

                    {/* Rating */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono text-base font-bold text-white tabular-nums">
                        {rating}
                      </div>
                      <div className="text-[11px] text-slate-500">{tier.name}</div>
                    </td>

                    {/* Win Rate */}
                    <td className="py-3 px-4 text-right font-mono text-sm font-semibold text-emerald-400 tabular-nums">
                      {player.winRate}%
                    </td>

                    {/* Action */}
                    <td className="py-3 pr-4 pl-2 text-right">
                      {!isUser ? (
                        <button
                          onClick={() => onChallengePlayer(player, selectedTc)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-amber-400 hover:bg-amber-500 hover:text-slate-950 transition-all shadow-sm"
                        >
                          <Swords className="h-3.5 w-3.5" />
                          Challenge
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">Your Ranking</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
