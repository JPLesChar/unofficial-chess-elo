import React, { useState, useMemo } from 'react';
import { ClubMatch } from '../types/club';
import { Search, Calendar, Trash2, ArrowRight } from 'lucide-react';

interface MatchHistoryLedgerProps {
  matches: ClubMatch[];
  onDeleteMatch: (matchId: string) => void;
}

export const MatchHistoryLedger: React.FC<MatchHistoryLedgerProps> = ({
  matches,
  onDeleteMatch,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRound, setSelectedRound] = useState<string>('All');

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
              {filteredMatches.map((m) => (
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
                    <button
                      onClick={() => {
                        if (confirm(`Delete game between ${m.whitePlayerName} and ${m.blackPlayerName}? Both players' ratings will revert.`)) {
                          onDeleteMatch(m.id);
                        }
                      }}
                      className="rounded-lg p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Delete / Undo Game Result"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
