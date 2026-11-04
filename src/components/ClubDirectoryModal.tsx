import React, { useState } from 'react';
import { X, Building2, MapPin, Users, Trophy, Plus, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ChessClub } from '../types/club';

interface ClubDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubs: ChessClub[];
  currentClub: ChessClub;
  onSelectClub: (club: ChessClub) => void;
  onCreateClubClick: () => void;
  isAdmin: boolean;
}

export const ClubDirectoryModal: React.FC<ClubDirectoryModalProps> = ({
  isOpen,
  onClose,
  clubs,
  currentClub,
  onSelectClub,
  onCreateClubClick,
  isAdmin,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = clubs.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
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
            <h3 className="text-base font-bold text-white">Select Chess Club</h3>
            <p className="text-xs text-slate-400">
              Browse independent chess societies or switch your active Elo leaderboard.
            </p>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter clubs by name or location..."
            className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => {
              onClose();
              onCreateClubClick();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 text-xs transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Club</span>
          </button>
        </div>

        {/* Club Grid */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No clubs match &quot;{searchTerm}&quot;. Click &quot;Create Club&quot; to start one!
            </div>
          ) : (
            filtered.map((club) => {
              const isActive = club.id === currentClub.id;
              return (
                <div
                  key={club.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1 mb-3 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{club.name}</span>
                      {isActive && (
                        <span className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                          <CheckCircle2 className="h-3 w-3" />
                          Active Club
                        </span>
                      )}
                    </div>
                    {club.city && (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3 text-slate-500" />
                        <span>{club.city}</span>
                      </div>
                    )}
                    {club.description && (
                      <p className="text-xs text-slate-400 max-w-md line-clamp-2">
                        {club.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isActive ? (
                      <span className="text-xs font-semibold text-amber-400 px-3 py-1.5 rounded-lg bg-amber-500/10">
                        Currently Selected
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectClub(club);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 px-4 py-1.5 text-xs font-bold transition-all shadow-sm"
                      >
                        <span>Select Club</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
