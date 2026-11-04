import React, { useState } from 'react';
import { X, Building2, Shield, Key, Eye, EyeOff, Loader2, Users, MapPin, FileText } from 'lucide-react';
import { ChessClub, ClubPlayer } from '../types/club';
import { createClubInFirestore, savePlayerToFirestore } from '../services/firestoreClubService';

interface CreateClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClubCreated: (club: ChessClub) => void;
  existingClubs: ChessClub[];
}

export const CreateClubModal: React.FC<CreateClubModalProps> = ({
  isOpen,
  onClose,
  onClubCreated,
  existingClubs,
}) => {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [seedStarterRoster, setSeedStarterRoster] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPasscode = adminPasscode.trim();

    if (!cleanName) {
      setError('Please provide an official club name.');
      return;
    }

    if (!cleanPasscode || cleanPasscode.length < 4) {
      setError('Please provide a secure club admin passcode (at least 4 characters).');
      return;
    }

    // Generate unique ID slug
    let baseSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    if (!baseSlug) {
      baseSlug = `club-${Date.now()}`;
    }

    // Check collision
    let clubId = baseSlug;
    let counter = 1;
    while (existingClubs.some((c) => c.id === clubId)) {
      clubId = `${baseSlug}-${counter}`;
      counter++;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newClub: ChessClub = {
        id: clubId,
        name: cleanName,
        city: city.trim() || undefined,
        description: description.trim() || undefined,
        adminPasscode: cleanPasscode,
        createdAt: new Date().toISOString().split('T')[0],
        playerCount: seedStarterRoster ? 8 : 0,
        matchCount: 0,
      };

      // 1. Create club document in Firestore
      await createClubInFirestore(newClub);

      // 2. Optionally seed initial starter players with 1400 baseline
      if (seedStarterRoster) {
        const starterNames = [
          'Alexander Morozevich',
          'Elena Borić',
          'David Bronstein',
          'Sofia Polgár',
          'Jan Timman',
          'Nona Gaprindashvili',
          'Bent Larsen',
          'Judit Varga',
        ];

        const starterCategories: Array<'Open' | 'Junior' | 'Veteran' | 'Women'> = [
          'Open',
          'Women',
          'Veteran',
          'Women',
          'Open',
          'Veteran',
          'Open',
          'Junior',
        ];

        for (let i = 0; i < starterNames.length; i++) {
          const starterPlayer: ClubPlayer = {
            id: `${clubId}-p${i + 1}`,
            clubId,
            name: starterNames[i],
            currentRating: 1400,
            initialRating: 1400,
            peakRating: 1400,
            category: starterCategories[i],
            gamesPlayed: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            whiteWins: 0,
            blackWins: 0,
            joinDate: new Date().toISOString().split('T')[0],
            lastActiveDate: new Date().toISOString().split('T')[0],
            attendanceCount: 1,
            notes: `Inaugural roster member for ${cleanName}`,
          };
          await savePlayerToFirestore(starterPlayer, clubId);
        }
      }

      onClubCreated(newClub);
      onClose();
    } catch (err) {
      console.error('Failed to create club in Firestore:', err);
      setError('Unable to save new club to Firestore. Please verify your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Create New Chess Club</h3>
            <p className="text-xs text-slate-400">
              Host an independent chess society with its own private ratings, match history, and admin key.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/50 bg-rose-500/15 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Club Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Club Name <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Zurich Knights, Bern Gambit Club"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* City / Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Location / City
            </label>
            <div className="relative">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., Zurich, Switzerland"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Club Bio / Meeting Details
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Meets every Tuesday 19:00 for rated Swiss rounds."
              rows={2}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Club-Specific Admin Passcode */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Club Admin Passcode <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPasscode ? 'text' : 'password'}
                value={adminPasscode}
                onChange={(e) => setAdminPasscode(e.target.value)}
                placeholder="Set secret admin password for this club"
                required
                minLength={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-3.5 pr-10 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPasscode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Organizers of this club will use this secret passcode to enter results, edit records, and update ratings.
            </p>
          </div>

          {/* Starter Roster Checkbox */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={seedStarterRoster}
                onChange={(e) => setSeedStarterRoster(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 mt-0.5"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Seed Initial Starter Roster (8 Players @ 1400 Elo)
                </span>
                <span className="text-[11px] text-slate-400 leading-normal">
                  Populate this new club with a clean 1400 baseline roster across Open, Junior, Veteran, and Women categories.
                </span>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating Club...
                </>
              ) : (
                <>
                  <Building2 className="h-3.5 w-3.5" />
                  Create Club
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
