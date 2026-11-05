import React, { useState, useEffect } from 'react';
import { ClubMatch, ClubPlayer } from './types/club';
import { ClubStandingsTable } from './components/ClubStandingsTable';
import { MatchHistoryLedger } from './components/MatchHistoryLedger';
import { ClubStatsOverview } from './components/ClubStatsOverview';
import { EnterResultModal } from './components/EnterResultModal';
import { AddPlayerModal } from './components/AddPlayerModal';
import { PlayerDetailModal } from './components/PlayerDetailModal';
import { EditPlayerModal } from './components/EditPlayerModal';
import { EditResultModal } from './components/EditResultModal';
import { VersionManagerModal } from './components/VersionManagerModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import {
  PlusCircle,
  UserPlus,
  Download,
  Trophy,
  Users,
  History,
  BarChart3,
  RotateCcw,
  Bookmark,
  AlertTriangle,
  X,
  Cloud,
  CheckCircle2,
  Lock,
  Unlock,
  ShieldCheck,
} from 'lucide-react';
import {
  initializeFirestoreIfNeeded,
  subscribeToPlayers,
  subscribeToMatches,
  saveMatchToFirestore,
  deleteMatchFromFirestore,
  updateMatchInFirestore,
  savePlayerToFirestore,
  deletePlayerFromFirestore,
  resetAllClubRatingsInFirestore,
  restoreSnapshotToFirestore,
} from './services/firestoreClubService';
import { ensureAuthenticated } from './lib/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'stats'>('standings');
  const [firestoreStatus, setFirestoreStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Admin authentication state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('club_elo_is_admin_active') === 'true';
    } catch {
      return false;
    }
  });
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Single club roster state
  const [players, setPlayers] = useState<ClubPlayer[]>(() => {
    try {
      const saved = localStorage.getItem('club_elo_players');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Single club matches history state
  const [matches, setMatches] = useState<ClubMatch[]>(() => {
    try {
      const saved = localStorage.getItem('club_elo_matches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Modals
  const [isEnterResultOpen, setIsEnterResultOpen] = useState<boolean>(false);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState<boolean>(false);
  const [selectedPlayer, setSelectedPlayer] = useState<ClubPlayer | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<ClubPlayer | null>(null);
  const [editingMatch, setEditingMatch] = useState<ClubMatch | null>(null);
  const [isVersionManagerOpen, setIsVersionManagerOpen] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  // Keep selected player synced when roster updates
  useEffect(() => {
    if (selectedPlayer) {
      const refreshed = players.find((p) => p.id === selectedPlayer.id);
      if (refreshed) {
        setSelectedPlayer(refreshed);
      }
    }
  }, [players]);

  // Synchronize data to localStorage as fast client cache
  useEffect(() => {
    localStorage.setItem('club_elo_players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('club_elo_matches', JSON.stringify(matches));
  }, [matches]);

  // Connect to Cloud Firestore and listen to direct real-time updates for players and matches
  useEffect(() => {
    let unsubPlayers: (() => void) | undefined;
    let unsubMatches: (() => void) | undefined;

    setFirestoreStatus('connecting');

    ensureAuthenticated()
      .then(async () => {
        await initializeFirestoreIfNeeded();
        setFirestoreStatus('connected');

        unsubPlayers = subscribeToPlayers(
          (livePlayers) => {
            setPlayers(livePlayers);
            setFirestoreStatus('connected');
          },
          (err) => {
            console.error('Firestore players sync error:', err);
            setFirestoreStatus('error');
            setFirestoreError('Cloud connection interrupted.');
          }
        );

        unsubMatches = subscribeToMatches(
          (liveMatches) => {
            setMatches(liveMatches);
            setFirestoreStatus('connected');
          },
          (err) => {
            console.error('Firestore matches sync error:', err);
            setFirestoreStatus('error');
            setFirestoreError('Cloud connection interrupted.');
          }
        );
      })
      .catch((err) => {
        console.error('Firebase Auth/Connection init failed:', err);
        setFirestoreStatus('error');
        setFirestoreError('Could not initialize Firebase.');
      });

    return () => {
      if (unsubPlayers) unsubPlayers();
      if (unsubMatches) unsubMatches();
    };
  }, []);

  // Update an existing player's details
  const handleUpdatePlayer = (updated: ClubPlayer) => {
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (selectedPlayer && selectedPlayer.id === updated.id) {
      setSelectedPlayer(updated);
    }
    savePlayerToFirestore(updated).catch((err) => {
      console.error('Failed to update player in Firestore:', err);
    });
  };

  // Delete a player from roster
  const handleDeletePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    if (selectedPlayer && selectedPlayer.id === playerId) {
      setSelectedPlayer(null);
    }
    deletePlayerFromFirestore(playerId).catch((err) => {
      console.error('Failed to delete player from Firestore:', err);
    });
  };

  // Handle saving a newly recorded match
  const handleSaveMatch = (match: ClubMatch) => {
    const whitePlayer = players.find((p) => p.id === match.whitePlayerId);
    const blackPlayer = players.find((p) => p.id === match.blackPlayerId);

    setMatches((prev) => [match, ...prev]);

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === match.whitePlayerId) {
          const isWin = match.result === '1-0';
          const isDraw = match.result === '1/2-1/2';
          const isLoss = match.result === '0-1';
          const newRating = match.whiteRatingAfter;

          return {
            ...p,
            currentRating: newRating,
            peakRating: Math.max(p.peakRating, newRating),
            gamesPlayed: p.gamesPlayed + 1,
            wins: isWin ? p.wins + 1 : p.wins,
            draws: isDraw ? p.draws + 1 : p.draws,
            losses: isLoss ? p.losses + 1 : p.losses,
            whiteWins: isWin ? (p.whiteWins ?? 0) + 1 : (p.whiteWins ?? 0),
            lastActiveDate: match.date,
            attendanceCount: p.attendanceCount + (p.lastActiveDate !== match.date ? 1 : 0),
          };
        }

        if (p.id === match.blackPlayerId) {
          const isWin = match.result === '0-1';
          const isDraw = match.result === '1/2-1/2';
          const isLoss = match.result === '1-0';
          const newRating = match.blackRatingAfter;

          return {
            ...p,
            currentRating: newRating,
            peakRating: Math.max(p.peakRating, newRating),
            gamesPlayed: p.gamesPlayed + 1,
            wins: isWin ? p.wins + 1 : p.wins,
            draws: isDraw ? p.draws + 1 : p.draws,
            losses: isLoss ? p.losses + 1 : p.losses,
            blackWins: isWin ? (p.blackWins ?? 0) + 1 : (p.blackWins ?? 0),
            lastActiveDate: match.date,
            attendanceCount: p.attendanceCount + (p.lastActiveDate !== match.date ? 1 : 0),
          };
        }

        return p;
      })
    );

    if (whitePlayer && blackPlayer) {
      saveMatchToFirestore(match, whitePlayer, blackPlayer).catch((err) => {
        console.error('Failed to save match to Firestore:', err);
      });
    }
  };

  // Handle deleting a match
  const handleDeleteMatch = (matchId: string) => {
    const targetMatch = matches.find((m) => m.id === matchId);
    if (!targetMatch) return;

    const whitePlayer = players.find((p) => p.id === targetMatch.whitePlayerId);
    const blackPlayer = players.find((p) => p.id === targetMatch.blackPlayerId);

    setMatches((prev) => prev.filter((m) => m.id !== matchId));

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === targetMatch.whitePlayerId) {
          const isWin = targetMatch.result === '1-0';
          const isDraw = targetMatch.result === '1/2-1/2';
          const isLoss = targetMatch.result === '0-1';

          return {
            ...p,
            currentRating: p.currentRating - targetMatch.whiteDelta,
            gamesPlayed: Math.max(0, p.gamesPlayed - 1),
            wins: isWin ? Math.max(0, p.wins - 1) : p.wins,
            draws: isDraw ? Math.max(0, p.draws - 1) : p.draws,
            losses: isLoss ? Math.max(0, p.losses - 1) : p.losses,
            whiteWins: isWin ? Math.max(0, (p.whiteWins ?? 0) - 1) : p.whiteWins,
          };
        }

        if (p.id === targetMatch.blackPlayerId) {
          const isWin = targetMatch.result === '0-1';
          const isDraw = targetMatch.result === '1/2-1/2';
          const isLoss = targetMatch.result === '1-0';

          return {
            ...p,
            currentRating: p.currentRating - targetMatch.blackDelta,
            gamesPlayed: Math.max(0, p.gamesPlayed - 1),
            wins: isWin ? Math.max(0, p.wins - 1) : p.wins,
            draws: isDraw ? Math.max(0, p.draws - 1) : p.draws,
            losses: isLoss ? Math.max(0, p.losses - 1) : p.losses,
            blackWins: isWin ? Math.max(0, (p.blackWins ?? 0) - 1) : p.blackWins,
          };
        }

        return p;
      })
    );

    deleteMatchFromFirestore(targetMatch, whitePlayer, blackPlayer).catch((err) => {
      console.error('Failed to delete match from Firestore:', err);
    });
  };

  // Handle updating an existing match
  const handleUpdateMatch = (originalMatch: ClubMatch, updatedMatch: ClubMatch) => {
    const whitePlayer = players.find((p) => p.id === updatedMatch.whitePlayerId);
    const blackPlayer = players.find((p) => p.id === updatedMatch.blackPlayerId);

    setMatches((prev) => prev.map((m) => (m.id === originalMatch.id ? updatedMatch : m)));

    setPlayers((prev) => {
      let updatedList = prev.map((p) => {
        if (p.id === originalMatch.whitePlayerId) {
          return {
            ...p,
            currentRating: p.currentRating - originalMatch.whiteDelta,
            gamesPlayed: Math.max(0, p.gamesPlayed - 1),
            wins: originalMatch.result === '1-0' ? Math.max(0, p.wins - 1) : p.wins,
            draws: originalMatch.result === '1/2-1/2' ? Math.max(0, p.draws - 1) : p.draws,
            losses: originalMatch.result === '0-1' ? Math.max(0, p.losses - 1) : p.losses,
            whiteWins: originalMatch.result === '1-0' ? Math.max(0, (p.whiteWins ?? 0) - 1) : p.whiteWins,
          };
        }
        if (p.id === originalMatch.blackPlayerId) {
          return {
            ...p,
            currentRating: p.currentRating - originalMatch.blackDelta,
            gamesPlayed: Math.max(0, p.gamesPlayed - 1),
            wins: originalMatch.result === '0-1' ? Math.max(0, p.wins - 1) : p.wins,
            draws: originalMatch.result === '1/2-1/2' ? Math.max(0, p.draws - 1) : p.draws,
            losses: originalMatch.result === '1-0' ? Math.max(0, p.losses - 1) : p.losses,
            blackWins: originalMatch.result === '0-1' ? Math.max(0, (p.blackWins ?? 0) - 1) : p.blackWins,
          };
        }
        return p;
      });

      updatedList = updatedList.map((p) => {
        if (p.id === updatedMatch.whitePlayerId) {
          const newRating = p.currentRating + updatedMatch.whiteDelta;
          return {
            ...p,
            currentRating: newRating,
            peakRating: Math.max(p.peakRating, newRating),
            gamesPlayed: p.gamesPlayed + 1,
            wins: updatedMatch.result === '1-0' ? p.wins + 1 : p.wins,
            draws: updatedMatch.result === '1/2-1/2' ? p.draws + 1 : p.draws,
            losses: updatedMatch.result === '0-1' ? p.losses + 1 : p.losses,
            whiteWins: updatedMatch.result === '1-0' ? (p.whiteWins ?? 0) + 1 : (p.whiteWins ?? 0),
          };
        }
        if (p.id === updatedMatch.blackPlayerId) {
          const newRating = p.currentRating + updatedMatch.blackDelta;
          return {
            ...p,
            currentRating: newRating,
            peakRating: Math.max(p.peakRating, newRating),
            gamesPlayed: p.gamesPlayed + 1,
            wins: updatedMatch.result === '0-1' ? p.wins + 1 : p.wins,
            draws: updatedMatch.result === '1/2-1/2' ? p.draws + 1 : p.draws,
            losses: updatedMatch.result === '1-0' ? p.losses + 1 : p.losses,
            blackWins: updatedMatch.result === '0-1' ? (p.blackWins ?? 0) + 1 : (p.blackWins ?? 0),
          };
        }
        return p;
      });

      return updatedList;
    });

    updateMatchInFirestore(originalMatch, updatedMatch, whitePlayer, blackPlayer).catch((err) => {
      console.error('Failed to update match in Firestore:', err);
    });
  };

  // Add new player to roster
  const handleAddPlayer = (newPlayer: ClubPlayer) => {
    setPlayers((prev) => [...prev, newPlayer]);
    savePlayerToFirestore(newPlayer).catch((err) => {
      console.error('Failed to save new player to Firestore:', err);
    });
  };

  // Execute full reset to 1400 baseline (Admin action)
  const handleExecuteResetTo1400 = () => {
    const resetList = players.map((p) => ({
      ...p,
      currentRating: 1400,
      initialRating: 1400,
      peakRating: 1400,
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      whiteWins: 0,
      blackWins: 0,
      attendanceCount: 0,
    }));

    setPlayers(resetList);
    setMatches([]);
    setIsResetConfirmOpen(false);

    resetAllClubRatingsInFirestore(players).catch((err) => {
      console.error('Failed to reset ratings in Firestore:', err);
    });
  };

  // Export current roster and matches as JSON
  const handleExportData = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      clubName: 'Gambit Elo Chess Club',
      playersCount: players.length,
      matchesCount: matches.length,
      players,
      matches,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-club-elo-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Admin login success
  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    try {
      localStorage.setItem('club_elo_is_admin_active', 'true');
    } catch {
      // Ignore
    }
  };

  // Admin logout
  const handleAdminLogout = () => {
    setIsAdmin(false);
    try {
      localStorage.removeItem('club_elo_is_admin_active');
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20 text-lg">
              ♔
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-base">
                  Gambit Elo
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-700/80 text-amber-400 px-1.5 py-0.5 rounded">
                  Chess Club
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block -mt-0.5">
                Official Rating &amp; Standings System
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button
              onClick={() => setActiveTab('standings')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'standings' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>Standings ({players.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'matches' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              <History className="h-4 w-4" />
              <span>Match Ledger ({matches.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'stats' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </button>
          </nav>

          {/* Actions & Admin Authentication */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsVersionManagerOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors whitespace-nowrap shadow-sm"
              title="Manage Snapshots and Version Checkpoints"
            >
              <Bookmark className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Snapshots</span>
            </button>

            {isAdmin ? (
              <>
                <button
                  onClick={() => setIsAddPlayerOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add Member</span>
                </button>

                <button
                  onClick={() => setIsEnterResultOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow hover:bg-amber-400 transition-all whitespace-nowrap shrink-0 active:scale-95"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Record Result</span>
                </button>

                <button
                  onClick={() => setIsAdminModalOpen(true)}
                  className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 px-2.5 py-1.5 text-xs font-bold transition-colors"
                  title="Admin Mode Active (Click to manage or lock)"
                >
                  <Unlock className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Admin Mode</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow hover:bg-amber-400 transition-all whitespace-nowrap shrink-0 active:scale-95"
                title="Enter admin password to unlock data modifications"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Club Brand Header & Overview Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                Club Championship Leaderboard
              </h1>
              {!isAdmin && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                  View-Only Mode
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Real-time Elo chess ratings calculated from official club match records and tournament rounds.
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-1">
              <span className="font-semibold text-slate-300">{players.length} Active Members</span>
              <span aria-hidden="true">·</span>
              <span>{matches.length} Rated Games Recorded</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <Cloud className="h-3 w-3" />
                Firestore Live Database
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={handleExportData}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              title="Download JSON Backup of all records"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Backup</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 transition-colors"
                title="Reset members to 0 games and 1400 Elo"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Roster</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab View Switcher (Mobile Friendly) */}
        <div className="flex md:hidden items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('standings')}
            className={`flex-1 py-1.5 rounded-lg text-center ${
              activeTab === 'standings' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            Standings ({players.length})
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-1.5 rounded-lg text-center ${
              activeTab === 'matches' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            Matches ({matches.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-1.5 rounded-lg text-center ${
              activeTab === 'stats' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            Analytics
          </button>
        </div>

        {/* View-Only Mode Information Banner for Visitors */}
        {!isAdmin && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-xs text-slate-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                <Lock className="h-3.5 w-3.5" />
              </div>
              <p className="text-xs text-slate-300 leading-normal">
                <strong className="text-white">View-Only Public Access:</strong> You can browse all leaderboards, player stats, and match histories. To enter match scores or register new players, click <strong className="text-amber-300">Admin Login</strong>.
              </p>
            </div>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="shrink-0 text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline px-2 py-1"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Tab 1: Standings Leaderboard */}
        {activeTab === 'standings' && (
          <div className="space-y-4">
            <ClubStandingsTable
              players={players}
              isAdmin={isAdmin}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
              onRecordMatchForPlayer={(p) => {
                if (!isAdmin) {
                  setIsAdminModalOpen(true);
                  return;
                }
                setIsEnterResultOpen(true);
              }}
              onEditPlayer={(p) => {
                if (!isAdmin) {
                  setIsAdminModalOpen(true);
                  return;
                }
                setEditingPlayer(p);
              }}
              onDeletePlayer={(playerId) => {
                if (!isAdmin) {
                  setIsAdminModalOpen(true);
                  return;
                }
                handleDeletePlayer(playerId);
              }}
            />
          </div>
        )}

        {/* Tab 2: Match History Ledger */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            <MatchHistoryLedger
              matches={matches}
              isAdmin={isAdmin}
              onDeleteMatch={(matchId) => {
                if (!isAdmin) {
                  setIsAdminModalOpen(true);
                  return;
                }
                handleDeleteMatch(matchId);
              }}
              onEditMatch={(m) => {
                if (!isAdmin) {
                  setIsAdminModalOpen(true);
                  return;
                }
                setEditingMatch(m);
              }}
            />
          </div>
        )}

        {/* Tab 3: Analytics & Visual Stats */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <ClubStatsOverview players={players} matches={matches} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 px-4 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Gambit Elo Chess Club · All ratings persisted to Cloud Firestore.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
              Firestore Active
            </span>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="text-slate-400 hover:text-amber-400 transition-colors"
            >
              {isAdmin ? 'Admin Mode (Active)' : 'Admin Login'}
            </button>
          </div>
        </div>
      </footer>

      {/* Modal: Enter Match Result */}
      {isAdmin && (
        <EnterResultModal
          isOpen={isEnterResultOpen}
          onClose={() => setIsEnterResultOpen(false)}
          players={players}
          onSaveMatch={handleSaveMatch}
        />
      )}

      {/* Modal: Add New Player */}
      {isAdmin && (
        <AddPlayerModal
          isOpen={isAddPlayerOpen}
          onClose={() => setIsAddPlayerOpen(false)}
          onAddPlayer={handleAddPlayer}
        />
      )}

      {/* Modal: Player Details & Elo Chart */}
      <PlayerDetailModal
        player={selectedPlayer}
        isOpen={Boolean(selectedPlayer)}
        onClose={() => setSelectedPlayer(null)}
        matches={matches}
        isAdmin={isAdmin}
        onRecordMatchForPlayer={(p) => {
          if (!isAdmin) {
            setIsAdminModalOpen(true);
            return;
          }
          setIsEnterResultOpen(true);
        }}
        onEditPlayer={(p) => {
          if (!isAdmin) {
            setIsAdminModalOpen(true);
            return;
          }
          setSelectedPlayer(null);
          setEditingPlayer(p);
        }}
        onEditMatch={(m) => {
          if (!isAdmin) {
            setIsAdminModalOpen(true);
            return;
          }
          setSelectedPlayer(null);
          setEditingMatch(m);
        }}
      />

      {/* Modal: Edit Player */}
      {isAdmin && (
        <EditPlayerModal
          player={editingPlayer}
          isOpen={Boolean(editingPlayer)}
          onClose={() => setEditingPlayer(null)}
          onUpdatePlayer={handleUpdatePlayer}
          onDeletePlayer={handleDeletePlayer}
        />
      )}

      {/* Modal: Edit Match Result */}
      {isAdmin && (
        <EditResultModal
          isOpen={Boolean(editingMatch)}
          onClose={() => setEditingMatch(null)}
          match={editingMatch}
          players={players}
          onUpdateMatch={handleUpdateMatch}
        />
      )}

      {/* Modal: Version Manager & Snapshots */}
      <VersionManagerModal
        isOpen={isVersionManagerOpen}
        onClose={() => setIsVersionManagerOpen(false)}
        currentPlayers={players}
        currentMatches={matches}
        isAdmin={isAdmin}
        onRestoreState={(restoredPlayers, restoredMatches) => {
          setPlayers(restoredPlayers);
          setMatches(restoredMatches);
          restoreSnapshotToFirestore({
            id: `restored_${Date.now()}`,
            name: 'Restored Version',
            createdAt: new Date().toISOString(),
            playersCount: restoredPlayers.length,
            matchesCount: restoredMatches.length,
            players: restoredPlayers,
            matches: restoredMatches,
          }).catch((err) => {
            console.error('Failed to sync restored state to Firestore:', err);
          });
        }}
      />

      {/* Admin Login & Security Modal */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isAdmin={isAdmin}
        onLoginSuccess={handleAdminLoginSuccess}
        onLogout={handleAdminLogout}
      />

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setIsResetConfirmOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Club Roster</h3>
                <p className="text-xs text-slate-400">Restore members to clean baseline</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              This will reset all club members back to{' '}
              <strong className="text-amber-300">0 games played</strong> and{' '}
              <strong className="text-amber-300">1400 starting Elo</strong>. All match records will be cleared from Firestore.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteResetTo1400}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Yes, Reset Roster</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
