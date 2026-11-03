import React, { useState } from 'react';
import { UserProfile } from '../types/chess';
import { X, User, Check, RefreshCw, Award } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onSaveProfile: (updated: Partial<UserProfile>) => void;
  onResetRatings: (baseRating: number) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onSaveProfile,
  onResetRatings,
}) => {
  const [username, setUsername] = useState(userProfile.username);
  const [countryName, setCountryName] = useState(userProfile.countryName);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      username: username.trim() || 'Player',
      countryName,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 font-bold text-slate-950 text-lg">
            {username.slice(0, 2).toUpperCase() || 'PL'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Player Profile Settings</h3>
            <p className="text-xs text-slate-400">Configure your chess handle and preferences</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Player Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={24}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              placeholder="Your chess handle"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Country / Region</label>
            <input
              type="text"
              value={countryName}
              onChange={(e) => setCountryName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              placeholder="e.g. United States, Germany, Japan"
            />
          </div>

          <div className="pt-2 border-t border-slate-800">
            <span className="block text-xs font-semibold text-slate-300 mb-2">
              Recalibrate Rating Placement
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Beginner', elo: 800 },
                { label: 'Club Player', elo: 1200 },
                { label: 'Advanced', elo: 1500 },
                { label: 'Master', elo: 1900 },
              ].map((tier) => (
                <button
                  type="button"
                  key={tier.elo}
                  onClick={() => {
                    if (confirm(`Reset all time control ratings to ${tier.elo} Elo?`)) {
                      onResetRatings(tier.elo);
                      onClose();
                    }
                  }}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-left hover:border-amber-400/60 hover:bg-slate-800 transition-colors"
                >
                  <div className="text-xs font-semibold text-white">{tier.label}</div>
                  <div className="font-mono text-[11px] text-amber-400">{tier.elo} Elo</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
