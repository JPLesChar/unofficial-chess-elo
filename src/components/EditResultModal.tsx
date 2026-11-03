import React, { useState, useEffect, useMemo } from 'react';
import { ClubMatch, ClubPlayer, MatchResult } from '../types/club';
import { calculateClubGameElo } from '../utils/eloCalc';
import { X, Check, ArrowRight, Edit3, AlertCircle } from 'lucide-react';

interface EditResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: ClubMatch | null;
  players: ClubPlayer[];
  onUpdateMatch: (originalMatch: ClubMatch, updatedMatch: ClubMatch) => void;
}

export const EditResultModal: React.FC<EditResultModalProps> = ({
  isOpen,
  onClose,
  match,
  players,
  onUpdateMatch,
}) => {
  const [date, setDate] = useState<string>('');
  const [roundName, setRoundName] = useState<string>('');
  const [boardNumber, setBoardNumber] = useState<string>('1');
  const [whitePlayerId, setWhitePlayerId] = useState<string>('');
  const [blackPlayerId, setBlackPlayerId] = useState<string>('');
  const [result, setResult] = useState<MatchResult>('1-0');
  const [timeControl, setTimeControl] = useState<'Classical' | 'Rapid' | 'Blitz'>('Classical');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (match) {
      setDate(match.date);
      setRoundName(match.roundName || '');
      setBoardNumber(match.boardNumber ? String(match.boardNumber) : '1');
      setWhitePlayerId(match.whitePlayerId);
      setBlackPlayerId(match.blackPlayerId);
      setResult(match.result);
      setTimeControl(match.timeControl);
      setNotes(match.openingOrNotes || '');
    }
  }, [match, isOpen]);

  // Sorted players by name
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => a.name.localeCompare(b.name));
  }, [players]);

  const whitePlayer = useMemo(() => {
    return players.find((p) => p.id === whitePlayerId) || null;
  }, [players, whitePlayerId]);

  const blackPlayer = useMemo(() => {
    return players.find((p) => p.id === blackPlayerId) || null;
  }, [players, blackPlayerId]);

  // Determine starting rating baseline for calculation
  // If the same player as original match, their baseline before this game is match.whiteRatingBefore / blackRatingBefore!
  const whiteBaselineRating = useMemo(() => {
    if (!match || !whitePlayer) return 1400;
    if (whitePlayer.id === match.whitePlayerId) {
      return match.whiteRatingBefore;
    }
    return whitePlayer.currentRating;
  }, [match, whitePlayer]);

  const blackBaselineRating = useMemo(() => {
    if (!match || !blackPlayer) return 1400;
    if (blackPlayer.id === match.blackPlayerId) {
      return match.blackRatingBefore;
    }
    return blackPlayer.currentRating;
  }, [match, blackPlayer]);

  // Live calculation preview
  const eloPreview = useMemo(() => {
    if (!whitePlayer || !blackPlayer || whitePlayer.id === blackPlayer.id) {
      return null;
    }
    return calculateClubGameElo(
      whiteBaselineRating,
      whitePlayer.gamesPlayed,
      blackBaselineRating,
      blackPlayer.gamesPlayed,
      result
    );
  }, [whitePlayer, blackPlayer, whiteBaselineRating, blackBaselineRating, result]);

  if (!isOpen || !match) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whitePlayer || !blackPlayer || whitePlayer.id === blackPlayer.id || !eloPreview) {
      return;
    }

    const updatedMatch: ClubMatch = {
      ...match,
      date,
      boardNumber: boardNumber ? parseInt(boardNumber, 10) : undefined,
      roundName: roundName.trim() || undefined,
      whitePlayerId: whitePlayer.id,
      whitePlayerName: whitePlayer.name,
      whiteRatingBefore: whiteBaselineRating,
      whiteRatingAfter: eloPreview.whiteNewRating,
      whiteDelta: eloPreview.whiteDelta,
      blackPlayerId: blackPlayer.id,
      blackPlayerName: blackPlayer.name,
      blackRatingBefore: blackBaselineRating,
      blackRatingAfter: eloPreview.blackNewRating,
      blackDelta: eloPreview.blackDelta,
      result,
      timeControl,
      openingOrNotes: notes.trim() || undefined,
    };

    onUpdateMatch(match, updatedMatch);
    onClose();
  };

  const isInvalid = !whitePlayer || !blackPlayer || whitePlayer.id === blackPlayer.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[95vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-amber-400" />
            Edit Game Result
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Modify match details or outcome; ratings for both players will recalculate automatically
          </p>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Round metadata: Date, Round Name, Board # */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Round / Event</label>
              <input
                type="text"
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                placeholder="e.g. Round 5"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Board #</label>
              <input
                type="number"
                min="1"
                max="50"
                value={boardNumber}
                onChange={(e) => setBoardNumber(e.target.value)}
                placeholder="1"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Player Selection: White vs Black */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            {/* White Player */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-1.5">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-white border border-slate-400" />
                White Player
              </label>
              <select
                value={whitePlayerId}
                onChange={(e) => setWhitePlayerId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="">Select White Player...</option>
                {sortedPlayers.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === blackPlayerId}>
                    {p.name} ({p.currentRating} Elo)
                  </option>
                ))}
              </select>
              {whitePlayer && (
                <div className="mt-1.5 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Pre-game Elo: <strong className="text-white font-mono">{whiteBaselineRating}</strong></span>
                </div>
              )}
            </div>

            {/* Black Player */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-1.5">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-slate-900 border border-slate-600" />
                Black Player
              </label>
              <select
                value={blackPlayerId}
                onChange={(e) => setBlackPlayerId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="">Select Black Player...</option>
                {sortedPlayers.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === whitePlayerId}>
                    {p.name} ({p.currentRating} Elo)
                  </option>
                ))}
              </select>
              {blackPlayer && (
                <div className="mt-1.5 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Pre-game Elo: <strong className="text-white font-mono">{blackBaselineRating}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Match Result Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Match Result</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setResult('1-0')}
                className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                  result === '1-0'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                1 - 0 (White Won)
              </button>
              <button
                type="button"
                onClick={() => setResult('1/2-1/2')}
                className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                  result === '1/2-1/2'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                ½ - ½ (Draw)
              </button>
              <button
                type="button"
                onClick={() => setResult('0-1')}
                className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                  result === '0-1'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                0 - 1 (Black Won)
              </button>
            </div>
          </div>

          {/* Format & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Time Control</label>
              <select
                value={timeControl}
                onChange={(e) => setTimeControl(e.target.value as 'Classical' | 'Rapid' | 'Blitz')}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="Classical">Classical (Standard OTB)</option>
                <option value="Rapid">Rapid (Club Rapid)</option>
                <option value="Blitz">Blitz (Club Blitz)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Opening / Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Sicilian Defense, Queen's Gambit"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Live Elo Preview Box */}
          {eloPreview && whitePlayer && blackPlayer ? (
            <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-slate-950 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-3">
                Updated Rating Adjustments (Recalculated)
              </span>
              <div className="grid grid-cols-2 gap-4">
                {/* White Elo Delta */}
                <div className="rounded-lg bg-slate-900/90 p-3 border border-slate-800">
                  <span className="text-xs font-semibold text-white block truncate">
                    {whitePlayer.name}
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-400 tabular-nums">
                      {whiteBaselineRating}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                    <span className="font-mono text-base font-bold text-white tabular-nums">
                      {eloPreview.whiteNewRating}
                    </span>
                    <span
                      className={`font-mono text-xs font-bold tabular-nums px-1.5 py-0.5 rounded ${
                        eloPreview.whiteDelta > 0
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : eloPreview.whiteDelta < 0
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {eloPreview.whiteDelta > 0 ? `+${eloPreview.whiteDelta}` : eloPreview.whiteDelta}
                    </span>
                  </div>
                </div>

                {/* Black Elo Delta */}
                <div className="rounded-lg bg-slate-900/90 p-3 border border-slate-800">
                  <span className="text-xs font-semibold text-white block truncate">
                    {blackPlayer.name}
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-400 tabular-nums">
                      {blackBaselineRating}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                    <span className="font-mono text-base font-bold text-white tabular-nums">
                      {eloPreview.blackNewRating}
                    </span>
                    <span
                      className={`font-mono text-xs font-bold tabular-nums px-1.5 py-0.5 rounded ${
                        eloPreview.blackDelta > 0
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : eloPreview.blackDelta < 0
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {eloPreview.blackDelta > 0 ? `+${eloPreview.blackDelta}` : eloPreview.blackDelta}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : isInvalid ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <AlertCircle className="h-4 w-4" />
              <span>Select both White and Black players to recalculate Elo progression.</span>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isInvalid}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400 transition-all disabled:opacity-40"
            >
              <Check className="h-4 w-4 stroke-[3]" />
              Save Updated Result
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
