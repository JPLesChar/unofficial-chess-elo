import React, { useState, useEffect } from 'react';
import { BotPlayer, TimeControl, UserProfile } from '../types/chess';
import { TIME_CONTROLS, getRatingTier, getWinProbability } from '../utils/elo';
import { findMatchingOpponents } from '../data/mockPlayers';
import { soundManager } from '../utils/sound';
import { X, Search, Shield, Zap, Globe, Check, Swords } from 'lucide-react';

interface MatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  initialTimeControl?: TimeControl;
  onMatchFound: (opponent: BotPlayer, timeControl: TimeControl, userColor: 'white' | 'black') => void;
  directChallengeOpponent?: BotPlayer | null;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  initialTimeControl = 'rapid',
  onMatchFound,
  directChallengeOpponent = null,
}) => {
  const [selectedTc, setSelectedTc] = useState<TimeControl>(initialTimeControl);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchSeconds, setSearchSeconds] = useState<number>(0);
  const [matchedPlayer, setMatchedPlayer] = useState<BotPlayer | null>(null);
  const [acceptCountdown, setAcceptCountdown] = useState<number>(10);
  const [tolerance, setTolerance] = useState<number>(60);

  useEffect(() => {
    setSelectedTc(initialTimeControl);
  }, [initialTimeControl]);

  // If a direct challenge is passed, immediately stage them as matched
  useEffect(() => {
    if (isOpen && directChallengeOpponent) {
      setMatchedPlayer(directChallengeOpponent);
      setIsSearching(false);
      setAcceptCountdown(12);
      soundManager.playMatchFound();
    } else if (isOpen) {
      setMatchedPlayer(null);
      setIsSearching(false);
      setSearchSeconds(0);
      setTolerance(60);
    }
  }, [isOpen, directChallengeOpponent]);

  // Queue timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSearching) {
      timer = setInterval(() => {
        setSearchSeconds((s) => {
          const next = s + 1;
          // Every 3 seconds expand tolerance by 25
          if (next % 3 === 0) {
            setTolerance((t) => Math.min(250, t + 25));
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSearching]);

  // Simulate opponent match arrival
  useEffect(() => {
    let matchTimeout: NodeJS.Timeout;
    if (isSearching) {
      const waitTimeMs = Math.floor(Math.random() * 2000) + 2000; // 2 to 4 seconds
      matchTimeout = setTimeout(() => {
        const userRating = userProfile.ratings[selectedTc];
        const candidates = findMatchingOpponents(userRating, selectedTc, tolerance);
        const opponent = candidates[Math.floor(Math.random() * candidates.length)];
        setIsSearching(false);
        setMatchedPlayer(opponent);
        setAcceptCountdown(10);
        soundManager.playMatchFound();
      }, waitTimeMs);
    }
    return () => clearTimeout(matchTimeout);
  }, [isSearching, selectedTc, tolerance, userProfile.ratings]);

  // Accept countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (matchedPlayer && acceptCountdown > 0) {
      timer = setInterval(() => {
        setAcceptCountdown((c) => {
          if (c <= 1) {
            // Auto accept
            handleConfirmMatch();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [matchedPlayer, acceptCountdown]);

  if (!isOpen) return null;

  const userRating = userProfile.ratings[selectedTc];
  const userTier = getRatingTier(userRating);

  const startSearch = () => {
    setMatchedPlayer(null);
    setSearchSeconds(0);
    setTolerance(60);
    setIsSearching(true);
  };

  const handleConfirmMatch = () => {
    if (!matchedPlayer) return;
    // 50% chance White or Black for fair pairing
    const userColor: 'white' | 'black' = Math.random() > 0.5 ? 'white' : 'black';
    onMatchFound(matchedPlayer, selectedTc, userColor);
  };

  const opponentRating = matchedPlayer
    ? selectedTc === 'bullet'
      ? matchedPlayer.bulletRating
      : selectedTc === 'blitz'
      ? matchedPlayer.blitzRating
      : selectedTc === 'classical'
      ? matchedPlayer.classicalRating
      : matchedPlayer.rapidRating
    : 0;

  const opponentTier = matchedPlayer ? getRatingTier(opponentRating) : null;
  const ratingDelta = matchedPlayer ? opponentRating - userRating : 0;
  const winProb = matchedPlayer ? Math.round(getWinProbability(userRating, opponentRating) * 100) : 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Swords className="h-5 w-5 text-amber-400" />
            Ranked Matchmaking
          </h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            <span>Fair Elo Pairing</span>
            <span aria-hidden="true">·</span>
            <span>Skill Range: ±{tolerance} Rating</span>
            <span aria-hidden="true">·</span>
            <span>Anti-Smurf Protected</span>
          </div>
        </div>

        {!matchedPlayer ? (
          <div>
            {/* Time Control Picker */}
            <label className="block text-xs font-medium text-slate-400 mb-2">Select Format</label>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {TIME_CONTROLS.map((tc) => {
                const isSelected = selectedTc === tc.id;
                const tcRating = userProfile.ratings[tc.id];
                return (
                  <button
                    key={tc.id}
                    disabled={isSearching}
                    onClick={() => setSelectedTc(tc.id)}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-amber-400/80 bg-amber-500/10 text-white shadow-sm ring-1 ring-amber-400/40'
                        : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80'
                    } ${isSearching ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-semibold text-sm">{tc.name}</span>
                      <span className="font-mono text-xs font-bold text-amber-300 tabular-nums">
                        {tcRating}
                      </span>
                    </div>
                    <span className="mt-1 text-[11px] text-slate-400 line-clamp-1">
                      {tc.description}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Current Player Status Card */}
            <div className="mb-6 rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 font-bold text-amber-400 border border-slate-700 text-base">
                    {userProfile.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white">{userProfile.username}</span>
                      {userProfile.title && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded border border-amber-400/30">
                          {userProfile.title}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <span>{userTier.name}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-slate-300 font-medium">
                        {userRating} Elo
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">Match Target</span>
                  <span className="font-mono text-sm font-semibold text-emerald-400 tabular-nums">
                    {Math.max(100, userRating - tolerance)} - {userRating + tolerance}
                  </span>
                </div>
              </div>
            </div>

            {/* Queue Radar / Action */}
            {isSearching ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-6 text-center">
                <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-amber-400/30 animate-ping" />
                  <div className="absolute inset-2 rounded-full border border-amber-400/50 animate-pulse" />
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/60">
                    <Search className="h-5 w-5 animate-spin" />
                  </div>
                </div>

                <h3 className="text-base font-semibold text-white">Searching for Opponent</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Scanning active players within ±{tolerance} Elo of your rating...
                </p>

                <div className="mt-3 flex items-center justify-center gap-4 text-xs font-mono text-slate-400">
                  <span>
                    Queue Time:{' '}
                    <strong className="text-white tabular-nums">
                      {Math.floor(searchSeconds / 60)}:
                      {(searchSeconds % 60).toString().padStart(2, '0')}
                    </strong>
                  </span>
                </div>

                <button
                  onClick={() => setIsSearching(false)}
                  className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Cancel Queue
                </button>
              </div>
            ) : (
              <button
                onClick={startSearch}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-bold text-slate-950 shadow-lg hover:from-amber-400 hover:to-amber-500 transition-all active:scale-[0.99]"
              >
                <Zap className="h-4 w-4 fill-current" />
                Find Match Now
              </button>
            )}
          </div>
        ) : (
          /* Opponent Found Preview Card */
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-slate-950/80 p-5">
              <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Opponent Found!
                </span>
                <span className="font-mono text-xs font-semibold text-amber-300">
                  Starting in {acceptCountdown}s
                </span>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-800 font-bold text-xl text-amber-400 border border-slate-700 shadow-inner">
                  {matchedPlayer.name.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{matchedPlayer.name}</h3>
                    {matchedPlayer.title && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded border border-amber-400/30">
                        {matchedPlayer.title}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {matchedPlayer.countryName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-300 font-medium">{matchedPlayer.playStyle}</span>
                  </div>

                  {/* Rating comparison */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-400">Rating:</span>
                      <span className="font-mono text-sm font-bold text-white tabular-nums">
                        {opponentRating}
                      </span>
                      <span
                        className={`font-mono text-[11px] font-semibold tabular-nums ${
                          ratingDelta > 0
                            ? 'text-rose-400'
                            : ratingDelta < 0
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        ({ratingDelta > 0 ? `+${ratingDelta}` : ratingDelta})
                      </span>
                    </div>

                    <div className="h-3 w-px bg-slate-800" />

                    <div className="text-xs text-slate-400">
                      Tier: <span className="font-medium text-slate-300">{opponentTier?.name}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Expected Win Probability */}
              <div className="mt-4 rounded-lg bg-slate-900/90 p-3 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Win Expectancy</span>
                  <span className="font-mono font-semibold text-white tabular-nums">
                    {winProb}% You / {100 - winProb}% {matchedPlayer.name.split(' ')[0]}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${winProb}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMatchedPlayer(null);
                  setIsSearching(false);
                }}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 py-3 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Decline
              </button>
              <button
                onClick={handleConfirmMatch}
                className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-bold text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500 transition-all"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                Accept & Begin Game
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
