import React, { useState, useMemo } from 'react';
import { ClubMatch } from '../types/club';
import { Search, Calendar, Trash2, ArrowRight, Edit3, X, AlertTriangle } from 'lucide-react';

interface MatchHistoryLedgerProps {
  matches: ClubMatch[];
  onDeleteMatch: (matchId: string) => void;
  onEditMatch: (match: ClubMatch) => void;
}

export const MatchHistoryLedger: React.FC<MatchHistoryLedgerProps> = ({
  matches,
  onDeleteMatch,
  onEditMatch,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRound, setSelectedRound] = useState<string>('All');
  const [matchToDelete, setMatchToDelete] = useState<ClubMatch | null>(null);

  // Unique rounds list
  const roundsList = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (m.roundName) set.add(m.roundName);
    });
    return ['All', ...Array.from(set)];
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const matchSearch =
        m.whitePlayerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.blackPlayerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.openingOrNotes && m.openingOrNotes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchRound = selectedRound === 'All' || m.roundName === selectedRound;
      return matchSearch && matchRound;
    });
  }, [matches, searchTerm, selectedRound]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search matches by player or opening..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        {roundsList.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter Round:</span>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 focus:border-amber-400 focus:outline-none"
            >
              {roundsList.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-xs font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4 w-28">Date & Board</th>
                <th className="py-3 px-4">White Player</th>
                <th className="py-3 px-3 text-center w-24">Result</th>
                <th className="py-3 px-4">Black Player</th>
                <th className="py-3 px-3">Format / Notes</th>
                <th className="py-3 pr-4 pl-2 text-right w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-xs">
              {filteredMatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                    {matches.length === 0
                      ? 'No games recorded yet. Click "Record Game Result" above to add your first match!'
                      : 'No matches found matching your search filter.'}
                  </td>
                </tr>
              ) : (
                filteredMatches.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Date & Board */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{m.date}</div>
                      <div className="text-[11px] text-slate-400">
                        {m.boardNumber ? `Board ${m.boardNumber}` : 'Match'}
                        {m.roundName ? ` · ${m.roundName}` : ''}
                      </div>
                    </td>

                    {/* White Player */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-3 w-3 rounded-sm bg-white border border-slate-400 shrink-0" />
                        <span className="font-semibold text-white">{m.whitePlayerName}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                        <span>{m.whiteRatingBefore}</span>
                        <ArrowRight className="h-3 w-3 text-slate-600" />
                        <span className="text-white font-bold">{m.whiteRatingAfter}</span>
                        <span
                          className={`font-bold ${
                            m.whiteDelta > 0
                              ? 'text-emerald-400'
                              : m.whiteDelta < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          ({m.whiteDelta > 0 ? `+${m.whiteDelta}` : m.whiteDelta})
                        </span>
                      </div>
                    </td>

                    {/* Result */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block font-mono font-bold text-xs px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-amber-300">
                        {m.result}
                      </span>
                    </td>

                    {/* Black Player */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-3 w-3 rounded-sm bg-slate-950 border border-slate-700 shrink-0" />
                        <span className="font-semibold text-white">{m.blackPlayerName}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                        <span>{m.blackRatingBefore}</span>
                        <ArrowRight className="h-3 w-3 text-slate-600" />
                        <span className="text-white font-bold">{m.blackRatingAfter}</span>
                        <span
                          className={`font-bold ${
                            m.blackDelta > 0
                              ? 'text-emerald-400'
                              : m.blackDelta < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          ({m.blackDelta > 0 ? `+${m.blackDelta}` : m.blackDelta})
                        </span>
                      </div>
                    </td>

                    {/* Format & Notes */}
                    <td className="py-3 px-3">
                      <div className="text-slate-300">{m.timeControl}</div>
                      {m.openingOrNotes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs" title={m.openingOrNotes}>
                          {m.openingOrNotes}
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 pr-4 pl-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditMatch(m)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                          title="Edit Game Result"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setMatchToDelete(m)}
                          className="rounded-lg p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Delete / Undo Game Result"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Match Confirmation Modal */}
      {matchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setMatchToDelete(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Match Record</h3>
                <p className="text-xs text-slate-400">Reverts Elo rating deltas & records</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 mb-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>
                  {matchToDelete.date} {matchToDelete.roundName ? `· ${matchToDelete.roundName}` : ''}
                  {matchToDelete.boardNumber ? ` · Board ${matchToDelete.boardNumber}` : ''}
                </span>
                <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
                  {matchToDelete.result}
                </span>
              </div>

              <div className="pt-1 space-y-1.5 font-medium border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-white flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-white border border-slate-400 inline-block" />
                    {matchToDelete.whitePlayerName}
                  </span>
                  <span className="font-mono text-slate-300">
                    Rating change: <strong className={matchToDelete.whiteDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {matchToDelete.whiteDelta > 0 ? `+${matchToDelete.whiteDelta}` : matchToDelete.whiteDelta}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-slate-950 border border-slate-700 inline-block" />
                    {matchToDelete.blackPlayerName}
                  </span>
                  <span className="font-mono text-slate-300">
                    Rating change: <strong className={matchToDelete.blackDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {matchToDelete.blackDelta > 0 ? `+${matchToDelete.blackDelta}` : matchToDelete.blackDelta}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to delete this game? It will be removed from the ledger and both players&apos; ratings will be rolled back.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMatchToDelete(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteMatch(matchToDelete.id);
                  setMatchToDelete(null);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-950/50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Match & Revert Ratings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
