import React, { useState, useMemo } from 'react';
import { ClubCategory, ClubPlayer } from '../types/club';
import { getRatingCategory } from '../utils/eloCalc';
import { Search, Trophy, ArrowUpRight, ArrowDownRight, Eye, PlusCircle, Filter, Edit3, Trash2, X } from 'lucide-react';

interface ClubStandingsTableProps {
  players: ClubPlayer[];
  isAdmin?: boolean;
  onSelectPlayer: (player: ClubPlayer) => void;
  onRecordMatchForPlayer: (player: ClubPlayer) => void;
  onEditPlayer: (player: ClubPlayer) => void;
  onDeletePlayer: (playerId: string) => void;
}

export const ClubStandingsTable: React.FC<ClubStandingsTableProps> = ({
  players,
  isAdmin = false,
  onSelectPlayer,
  onRecordMatchForPlayer,
  onEditPlayer,
  onDeletePlayer,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'rating' | 'gain' | 'games' | 'winrate'>('rating');
  const [playerToDelete, setPlayerToDelete] = useState<ClubPlayer | null>(null);

  // Sorted and filtered players list
  const filteredPlayers = useMemo(() => {
    let list = players.filter((p) => {
      const matchName = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchName && matchCat;
    });

    list.sort((a, b) => {
      if (sortBy === 'rating') {
        return b.currentRating - a.currentRating;
      }
      if (sortBy === 'gain') {
        return (b.currentRating - b.initialRating) - (a.currentRating - a.initialRating);
      }
      if (sortBy === 'games') {
        return b.gamesPlayed - a.gamesPlayed;
      }
      if (sortBy === 'winrate') {
        const rateA = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
        const rateB = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
        return rateB - rateA;
      }
      return 0;
    });

    return list;
  }, [players, searchTerm, selectedCategory, sortBy]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search 40 club members..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            {['All', 'Open', 'Junior', 'Veteran', 'Women'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 focus:border-amber-400 focus:outline-none"
          >
            <option value="rating">Sort: Rating (Highest)</option>
            <option value="gain">Sort: Rating Gain (Climbers)</option>
            <option value="games">Sort: Most Games Played</option>
            <option value="winrate">Sort: Win %</option>
          </select>
        </div>
      </div>

      {/* Standings Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-xs font-semibold text-slate-400">
              <tr>
                <th className="py-3 pl-4 pr-2 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Club Member</th>
                <th className="py-3 px-3 text-right">Current Elo</th>
                <th className="py-3 px-3 text-right">Net Change</th>
                <th className="py-3 px-3 text-right">Peak</th>
                <th className="py-3 px-4 text-center">Record (W-D-L)</th>
                <th className="py-3 px-3 text-right">Win %</th>
                <th className="py-3 px-3 text-center">Attendance</th>
                <th className="py-3 pr-4 pl-2 text-right">{isAdmin ? 'Action' : 'Progression'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-xs">
              {filteredPlayers.map((player, idx) => {
                const categoryInfo = getRatingCategory(player.currentRating);
                const netDelta = player.currentRating - player.initialRating;
                const winRate =
                  player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0;

                return (
                  <tr
                    key={player.id}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    onClick={() => onSelectPlayer(player)}
                  >
                    {/* Rank */}
                    <td className="py-3 pl-4 pr-2 font-mono text-xs text-slate-400 tabular-nums text-center">
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

                    {/* Member Name & Category */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 font-bold text-amber-300 border border-slate-700 text-xs">
                          {player.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                            {player.name}
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                              {player.category}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {categoryInfo.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Current Rating */}
                    <td className="py-3 px-3 text-right">
                      <span className="font-mono text-sm font-bold text-white tabular-nums">
                        {player.currentRating}
                      </span>
                    </td>

                    {/* Net Gain/Loss */}
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-mono text-xs font-semibold tabular-nums inline-flex items-center ${
                          netDelta > 0
                            ? 'text-emerald-400'
                            : netDelta < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {netDelta > 0 ? (
                          <>
                            <ArrowUpRight className="h-3 w-3" />+{netDelta}
                          </>
                        ) : netDelta < 0 ? (
                          <>
                            <ArrowDownRight className="h-3 w-3" />
                            {netDelta}
                          </>
                        ) : (
                          '±0'
                        )}
                      </span>
                    </td>

                    {/* Peak Rating */}
                    <td className="py-3 px-3 text-right font-mono text-slate-300 tabular-nums">
                      {player.peakRating}
                    </td>

                    {/* Record */}
                    <td className="py-3 px-4 text-center font-mono text-slate-300 tabular-nums">
                      {player.wins}W - {player.draws}D - {player.losses}L
                    </td>

                    {/* Win % */}
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 font-semibold tabular-nums">
                      {winRate}%
                    </td>

                    {/* Attendance */}
                    <td className="py-3 px-3 text-center text-slate-400 font-mono tabular-nums">
                      {player.attendanceCount} nights
                    </td>

                    {/* Actions */}
                    <td className="py-3 pr-4 pl-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectPlayer(player)}
                          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                          title="View Rating Progression Graph & History"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => onRecordMatchForPlayer(player)}
                              className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition-colors"
                              title="Record Match for This Player (Admin)"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onEditPlayer(player)}
                              className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-amber-400 hover:bg-slate-700 transition-colors"
                              title="Edit Member Information (Admin)"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setPlayerToDelete(player)}
                              className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                              title="Delete Member (Admin)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Member Confirmation Modal */}
      {playerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setPlayerToDelete(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Club Member</h3>
                <p className="text-xs text-slate-400">Remove player from active standings</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 mb-4 text-xs space-y-1.5">
              <div className="font-semibold text-white text-sm flex items-center gap-2">
                <span>{playerToDelete.name}</span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono">
                  {playerToDelete.currentRating} Elo
                </span>
              </div>
              <div className="text-slate-400">
                Category: <span className="text-slate-200">{playerToDelete.category}</span> · {playerToDelete.gamesPlayed} games played ({playerToDelete.wins}W / {playerToDelete.draws}D / {playerToDelete.losses}L)
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to remove <strong className="text-white">{playerToDelete.name}</strong> from the roster?
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPlayerToDelete(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePlayer(playerToDelete.id);
                  setPlayerToDelete(null);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-950/50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
