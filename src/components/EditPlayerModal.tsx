import React, { useState, useEffect } from 'react';
import { ClubCategory, ClubPlayer } from '../types/club';
import { X, Check, Trash2, Edit3, AlertTriangle } from 'lucide-react';

interface EditPlayerModalProps {
  player: ClubPlayer | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePlayer: (updated: ClubPlayer) => void;
  onDeletePlayer: (playerId: string) => void;
}

export const EditPlayerModal: React.FC<EditPlayerModalProps> = ({
  player,
  isOpen,
  onClose,
  onUpdatePlayer,
  onDeletePlayer,
}) => {
  const [name, setName] = useState<string>('');
  const [currentRating, setCurrentRating] = useState<string>('1200');
  const [initialRating, setInitialRating] = useState<string>('1200');
  const [category, setCategory] = useState<ClubCategory>('Open');
  const [attendanceCount, setAttendanceCount] = useState<string>('1');
  const [notes, setNotes] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

  useEffect(() => {
    if (player) {
      setName(player.name);
      setCurrentRating(String(player.currentRating));
      setInitialRating(String(player.initialRating));
      setCategory(player.category);
      setAttendanceCount(String(player.attendanceCount));
      setNotes(player.notes || '');
      setIsConfirmingDelete(false);
    }
  }, [player, isOpen]);

  if (!isOpen || !player) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const ratingVal = parseInt(currentRating, 10) || player.currentRating;
    const initialVal = parseInt(initialRating, 10) || player.initialRating;
    const attendanceVal = parseInt(attendanceCount, 10) || player.attendanceCount;

    const updated: ClubPlayer = {
      ...player,
      name: name.trim(),
      currentRating: ratingVal,
      initialRating: initialVal,
      peakRating: Math.max(player.peakRating, ratingVal),
      category,
      attendanceCount: Math.max(0, attendanceVal),
      notes: notes.trim() || undefined,
    };

    onUpdatePlayer(updated);
    onClose();
  };

  const handleDelete = () => {
    onDeletePlayer(player.id);
    setIsConfirmingDelete(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-amber-400" />
            Edit Club Member
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Update member information, rating, or remove from club roster
          </p>
        </div>

        {!isConfirmingDelete ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Player Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Current Elo Rating
                </label>
                <input
                  type="number"
                  min="400"
                  max="2900"
                  value={currentRating}
                  onChange={(e) => setCurrentRating(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Baseline / Initial Elo
                </label>
                <input
                  type="number"
                  min="400"
                  max="2900"
                  value={initialRating}
                  onChange={(e) => setInitialRating(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ClubCategory)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="Open">Open</option>
                  <option value="Junior">Junior (U18)</option>
                  <option value="Veteran">Veteran (50+)</option>
                  <option value="Women">Women</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Attendance (Nights)
                </label>
                <input
                  type="number"
                  min="0"
                  value={attendanceCount}
                  onChange={(e) => setAttendanceCount(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notes & Bio (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Plays Board 2, FIDE ID 4812"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* Quick stats info */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400 flex items-center justify-between">
              <span>Games Played: <strong className="text-white font-mono">{player.gamesPlayed}</strong></span>
              <span>Record: <strong className="text-white font-mono">{player.wins}W - {player.draws}D - {player.losses}L</strong></span>
            </div>

            {/* Buttons */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-900/60 bg-rose-950/40 px-3 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Member
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Confirmation before deletion */
          <div className="space-y-4 rounded-xl border border-rose-500/40 bg-rose-950/30 p-5 text-center">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete {player.name}?</h3>
              <p className="mt-1 text-xs text-rose-200/80 leading-relaxed">
                This will remove <strong>{player.name}</strong> from the club roster and future pairings. Their past recorded game entries will remain preserved in the historical ledger.
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-500 transition-colors shadow-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
