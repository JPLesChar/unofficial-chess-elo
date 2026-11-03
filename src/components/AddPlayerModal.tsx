import React, { useState } from 'react';
import { ClubCategory, ClubPlayer } from '../types/club';
import { X, UserPlus, Check } from 'lucide-react';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPlayer: (player: ClubPlayer) => void;
}

export const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  isOpen,
  onClose,
  onAddPlayer,
}) => {
  const [name, setName] = useState<string>('');
  const [initialRating, setInitialRating] = useState<string>('1400');
  const [category, setCategory] = useState<ClubCategory>('Open');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const ratingVal = parseInt(initialRating, 10) || 1400;
    const newPlayer: ClubPlayer = {
      id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      currentRating: ratingVal,
      initialRating: ratingVal,
      peakRating: ratingVal,
      category,
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      whiteWins: 0,
      blackWins: 0,
      joinDate: new Date().toISOString().split('T')[0],
      lastActiveDate: new Date().toISOString().split('T')[0],
      attendanceCount: 1,
      notes: notes.trim() || undefined,
    };

    onAddPlayer(newPlayer);
    setName('');
    setInitialRating('1400');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-amber-400" />
            Add Club Member
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Register a new player in the club Elo tracking roster
          </p>
        </div>

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
              placeholder="e.g. Daniel Miller"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Initial Rating (Elo)
              </label>
              <input
                type="number"
                min="400"
                max="2800"
                value={initialRating}
                onChange={(e) => setInitialRating(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Default: 1400 Elo</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ClubCategory)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="Open">Open</option>
                <option value="Junior">Junior (U18)</option>
                <option value="Veteran">Veteran (50+)</option>
                <option value="Women">Women</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Plays Board 3, FIDE ID 14205"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

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
              className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="h-4 w-4 stroke-[3]" />
              Add to Roster
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
