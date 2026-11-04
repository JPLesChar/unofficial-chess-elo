import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Plus, Search, MapPin, Users, Trophy, Sparkles } from 'lucide-react';
import { ChessClub } from '../types/club';

interface ClubSelectorProps {
  clubs: ChessClub[];
  currentClub: ChessClub;
  onSelectClub: (club: ChessClub) => void;
  onCreateClubClick: () => void;
  isAdmin: boolean;
  playerCount: number;
  matchCount: number;
}

export const ClubSelector: React.FC<ClubSelectorProps> = ({
  clubs,
  currentClub,
  onSelectClub,
  onCreateClubClick,
  isAdmin,
  playerCount,
  matchCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredClubs = clubs.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.city && c.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-800/90 px-3 py-1.5 transition-all shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs shrink-0">
          ♔
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate max-w-[150px] sm:max-w-[200px]">
              {currentClub.name}
            </span>
            <span className="rounded bg-slate-800 px-1 py-0.2 text-[9px] font-mono text-slate-400 border border-slate-700 hidden sm:inline-block">
              {playerCount} players
            </span>
          </div>
          {currentClub.city && (
            <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
              {currentClub.city}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-amber-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 pt-2 pb-1.5 border-b border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Select Chess Club
              </span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                {clubs.length} Clubs Active
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clubs by name or city..."
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Clubs List */}
          <div className="max-h-60 overflow-y-auto py-1 space-y-0.5 scrollbar-thin">
            {filteredClubs.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No clubs found matching &quot;{search}&quot;
              </div>
            ) : (
              filteredClubs.map((club) => {
                const isSelected = club.id === currentClub.id;
                return (
                  <button
                    key={club.id}
                    type="button"
                    onClick={() => {
                      onSelectClub(club);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? 'bg-amber-500/15 border border-amber-500/30 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        ♔
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                            {club.name}
                          </span>
                        </div>
                        {club.city && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <span>{club.city}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="h-4 w-4 text-amber-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Create New Club Button */}
          <div className="pt-1.5 mt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onCreateClubClick();
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 py-2 text-xs font-bold transition-colors border border-slate-700 hover:border-amber-400"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create New Chess Club</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
