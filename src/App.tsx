import React, { useState, useEffect } from 'react';
import { ClubMatch, ClubPlayer, ChessClub } from './types/club';
import { INITIAL_CLUB_PLAYERS } from './data/initialClubRoster';
import { DEFAULT_CLUBS } from './data/initialClubs';
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
import { ClubSelector } from './components/ClubSelector';
import { CreateClubModal } from './components/CreateClubModal';
import { ClubDirectoryModal } from './components/ClubDirectoryModal';
import {
  PlusCircle,
  UserPlus,
  Download,
  RefreshCw,
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
  Building2,
  MapPin,
} from 'lucide-react';
import {
  initializeFirestoreIfNeeded,
  subscribeToClubs,
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

  // Multi-club state
  const [clubs, setClubs] = useState<ChessClub[]>(DEFAULT_CLUBS);
  const [activeClubId, setActiveClubId] = useState<string>(() => {
    try {
      return localStorage.getItem('club_elo_active_club_id') || 'geneva-chess-club';
    } catch {
      return 'geneva-chess-club';
    }
  });

  // Modals for multi-club
  const [isCreateClubOpen, setIsCreateClubOpen] = useState<boolean>(false);
  const [isClubDirectoryOpen, setIsClubDirectoryOpen] = useState<boolean>(false);

  // Active club object
  const currentClub: ChessClub =
    clubs.find((c) => c.id === activeClubId) || clubs[0] || DEFAULT_CLUBS[0];

  // Admin access state (persisted across tab refreshes in localStorage)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('club_elo_is_admin_active') === 'true';
    } catch {
      return false;
    }
  });
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Club roster state for active club
  const [players, setPlayers] = useState<ClubPlayer[]>(() => {
    try {
      const saved = localStorage.getItem(`club_elo_players_${activeClubId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_CLUB_PLAYERS;
  });

  // Club matches history state for active club
  const [matches, setMatches] = useState<ClubMatch[]>(() => {
    try {
      const saved = localStorage.getItem(`club_elo_matches_${activeClubId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
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

  // Synchronize active club data to localStorage as fast client-side cache
  useEffect(() => {
    localStorage.setItem(`club_elo_players_${activeClubId}`, JSON.stringify(players));
  }, [players, activeClubId]);

  useEffect(() => {
    localStorage.setItem(`club_elo_matches_${activeClubId}`, JSON.stringify(matches));
  }, [matches, activeClubId]);

  // 1. Subscribe to Clubs Directory
  useEffect(() => {
    let unsubClubs: (() => void) | undefined;

    ensureAuthenticated()
      .then(async () => {
        // Initialize Firestore with default clubs & rosters if needed
        await initializeFirestoreIfNeeded();
        setFirestoreStatus('connected');

        unsubClubs = subscribeToClubs((liveClubs) => {
          if (liveClubs && liveClubs.length > 0) {
            setClubs(liveClubs);
          }
        });
      })
      .catch((err) => {
        console.error('Failed to initialize clubs in Firebase:', err);
        setFirestoreStatus('error');
        setFirestoreError('Could not initialize Firebase.');
      });

    return () => {
      if (unsubClubs) unsubClubs();
    };
  }, []);

  // 2. Connect to Cloud Firestore and listen to real-time updates for the active club
  useEffect(() => {
    let unsubPlayers: (() => void) | undefined;
    let unsubMatches: (() => void) | undefined;

    setFirestoreStatus('connecting');

    ensureAuthenticated()
      .then(() => {
        setFirestoreStatus('connected');

        unsubPlayers = subscribeToPlayers(
          activeClubId,
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
          activeClubId,
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
  }, [activeClubId]);

  // Handle switching active chess club
  const handleSelectClub = (club: ChessClub) => {
    setActiveClubId(club.id);
    localStorage.setItem('club_elo_active_club_id', club.id);
    setSelectedPlayer(null);
    setEditingPlayer(null);
    setEditingMatch(null);
  };

  // Handle creating a new chess club
  const handleClubCreated = (newClub: ChessClub) => {
    setClubs((prev) => [newClub, ...prev.filter((c) => c.id !== newClub.id)]);
    setActiveClubId(newClub.id);
    localStorage.setItem('club_elo_active_club_id', newClub.id);
    setSelectedPlayer(null);
    setEditingPlayer(null);
    setEditingMatch(null);
  };

  // Update an existing player's details
  const handleUpdatePlayer = (updated: ClubPlayer) => {
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (selectedPlayer && selectedPlayer.id === updated.id) {
      setSelectedPlayer(updated);
    }
    savePlayerToFirestore(updated, activeClubId).catch((err) => {
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

    const matchWithClub: ClubMatch = { ...match, clubId: activeClubId };

    // 1. Prepend match to ledger (optimistic)
    setMatches((prev) => [matchWithClub, ...prev]);

    // 2. Update White & Black players in roster (optimistic)
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === match.whitePlayerId) {
          const isWin = match.result === '1-0';
          const isDraw = match.result === '1/2-1/2';
          const isLoss = match.result === '0-1';
          const newRating = match.whiteRatingAfter;

          return {
            ...p,
            clubId: activeClubId,
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
            clubId: activeClubId,
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

    // 3. Persist permanently to Cloud Firestore
    if (whitePlayer && blackPlayer) {
      saveMatchToFirestore(matchWithClub, whitePlayer, blackPlayer, activeClubId).catch((err) => {
        console.error('Failed to save match to Firestore:', err);
      });
    }
  };

  // Handle deleting a mistakenly entered match
  const handleDeleteMatch = (matchId: string) => {
    const targetMatch = matches.find((m) => m.id === matchId);
    if (!targetMatch) return;

    const whitePlayer = players.find((p) => p.id === targetMatch.whitePlayerId);
    const blackPlayer = players.find((p) => p.id === targetMatch.blackPlayerId);

    // Remove from ledger (optimistic)
    setMatches((prev) => prev.filter((m) => m.id !== matchId));

    // Rollback player ratings and stats (optimistic)
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

    // Persist deletion and rollbacks to Cloud Firestore
    deleteMatchFromFirestore(targetMatch, whitePlayer, blackPlayer).catch((err) => {
      console.error('Failed to delete match from Firestore:', err);
    });
  };

  // Handle updating an existing match result
  const handleUpdateMatch = (originalMatch: ClubMatch, updatedMatch: ClubMatch) => {
    const whitePlayer = players.find((p) => p.id === updatedMatch.whitePlayerId);
    const blackPlayer = players.find((p) => p.id === updatedMatch.blackPlayerId);

    const matchWithClub = { ...updatedMatch, clubId: activeClubId };

    // 1. Update the match in the ledger
    setMatches((prev) => prev.map((m) => (m.id === originalMatch.id ? matchWithClub : m)));

    // 2. Adjust player ratings and records
    setPlayers((prev) => {
      let updatedList = prev.map((p) => {
        if (p.id === originalMatch.whitePlayerId) {
          const isWin = originalMatch.result === '1-0';
          const isDraw = originalMatch.result === '1/2-1/2';
          const isLoss = originalMatch.result === '0-1';
          return {
            ...p,
            currentRating: p.currentRating - originalMatch.whiteDelta,
            gamesPlayed: Math.max(0, p.gamesPlayed - 1),
            wins: isWin ? Math.max(0, p.wins - 1) : p.wins,
            draws: isDraw ? Math.max(0, p.draws - 1) : p.draws,
            losses: isLoss ? Math.max(0, p.losses - 1) : p.losses,
            whiteWins: isWin ? Math.max(0, (p.whiteWins ?? 0) - 1) : p.whiteWins,
          };
        }
        if (p.id === originalMatch.blackPlayerId) {
          const isWin = originalMatch.result === '0-1';
          const isDraw = originalMatch.result === '1/2-1/2';
          const isLoss = originalMatch.result === '1-0';
          return {
            ...p,
            currentRating: p.currentRating - originalMatch.blackDelta,
            gamesPlayed: Math.max(0, p.gamesPlayed - 1),
            wins: isWin ? Math.max(0, p.wins - 1) : p.wins,
            draws: isDraw ? Math.max(0, p.draws - 1) : p.draws,
            losses: isLoss ? Math.max(0, p.losses - 1) : p.losses,
            blackWins: isWin ? Math.max(0, (p.blackWins ?? 0) - 1) : p.blackWins,
          };
        }
        return p;
      });

      updatedList = updatedList.map((p) => {
        if (p.id === updatedMatch.whitePlayerId) {
          const newRating = p.currentRating + updatedMatch.whiteDelta;
          const isWin = updatedMatch.result === '1-0';
          const isDraw = updatedMatch.result === '1/2-1/2';
          const isLoss = updatedMatch.result === '0-1';
          return {
            ...p,
            currentRating: newRating,
            peakRating: Math.max(p.peakRating, newRating),
            gamesPlayed: p.gamesPlayed + 1,
            wins: isWin ? p.wins + 1 : p.wins,
            draws: isDraw ? p.draws + 1 : p.draws,
            losses: isLoss ? p.losses + 1 : p.losses,
            whiteWins: isWin ? (p.whiteWins ?? 0) + 1 : (p.whiteWins ?? 0),
            lastActiveDate: updatedMatch.date,
          };
        }
        if (p.id === updatedMatch.blackPlayerId) {
          const newRating = p.currentRating + updatedMatch.blackDelta;
          const isWin = updatedMatch.result === '0-1';
          const isDraw = updatedMatch.result === '1/2-1/2';
          const isLoss = updatedMatch.result === '1-0';
          return {
            ...p,
            currentRating: newRating,
            peakRating: Math.max(p.peakRating, newRating),
            gamesPlayed: p.gamesPlayed + 1,
            wins: isWin ? p.wins + 1 : p.wins,
            draws: isDraw ? p.draws + 1 : p.draws,
            losses: isLoss ? p.losses + 1 : p.losses,
            blackWins: isWin ? (p.blackWins ?? 0) + 1 : (p.blackWins ?? 0),
            lastActiveDate: updatedMatch.date,
          };
        }
        return p;
      });

      return updatedList;
    });

    // Persist update in Cloud Firestore
    updateMatchInFirestore(originalMatch, matchWithClub, whitePlayer, blackPlayer, activeClubId).catch((err) => {
      console.error('Failed to update match in Firestore:', err);
    });
  };

  // Add new player to current club roster
  const handleAddPlayer = (newPlayer: ClubPlayer) => {
    const playerWithClub = { ...newPlayer, clubId: activeClubId };
    setPlayers((prev) => [playerWithClub, ...prev]);
    savePlayerToFirestore(playerWithClub, activeClubId).catch((err) => {
      console.error('Failed to add player to Firestore:', err);
    });
  };

  // Export current club data to backup JSON
  const handleExportData = () => {
    const backup = {
      exportDate: new Date().toISOString(),
      clubId: currentClub.id,
      clubName: currentClub.name,
      city: currentClub.city,
      players,
      matches,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentClub.id}_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset all players in this club to 0 games played and 1400 starting Elo
  const handleExecuteResetTo1400 = async () => {
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
    localStorage.setItem(`club_elo_players_${activeClubId}`, JSON.stringify(resetList));
    localStorage.setItem(`club_elo_matches_${activeClubId}`, JSON.stringify([]));
    setIsResetConfirmOpen(false);

    try {
      await resetAllClubRatingsInFirestore(activeClubId, resetList);
    } catch (err) {
      console.error('Failed to reset ratings in Firestore:', err);
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    localStorage.setItem('club_elo_is_admin_active', 'true');
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('club_elo_is_admin_active');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Zone 1: Brand & Club Selector Dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 font-bold text-white tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black text-base shadow-sm">
                ♔
              </span>
              <span className="hidden sm:inline-block font-display">ClubElo</span>
            </div>

            <div className="h-5 w-px bg-slate-800 hidden sm:block" />

            {/* Prominent Club Selector Dropdown */}
            <ClubSelector
              clubs={clubs}
              currentClub={currentClub}
              onSelectClub={handleSelectClub}
              onCreateClubClick={() => setIsCreateClubOpen(true)}
              isAdmin={isAdmin}
              playerCount={players.length}
              matchCount={matches.length}
            />

            {/* Quick Browse All Clubs button */}
            <button
              type="button"
              onClick={() => setIsClubDirectoryOpen(true)}
              className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-amber-400 transition-colors px-2 py-1 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
              title="Browse full list of all hosted chess clubs"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Browse Clubs</span>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button
              onClick={() => setActiveTab('standings')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'standings' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              Standings ({players.length})
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'matches' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              Match Ledger ({matches.length})
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'stats' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              Analytics
            </button>
          </nav>

          {/* Zone 3: Actions & Admin Authentication */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Versioning & Snapshots */}
            <button
              onClick={() => setIsVersionManagerOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors whitespace-nowrap shadow-sm"
              title="Manage Snapshots and Version Checkpoints for this club"
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
                  className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-colors"
                  title="Admin Mode Active (Full write access for this club). Click to lock or switch credentials."
                >
                  <Unlock className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow hover:bg-amber-400 transition-all whitespace-nowrap shrink-0 active:scale-95"
                title={`Enter admin passcode for ${currentClub.name} to record games or edit data`}
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
        {/* Club Brand Header & Metadata Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                {currentClub.name}
              </h1>
              {currentClub.city && (
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs font-medium text-slate-300">
                  <MapPin className="h-3 w-3 text-amber-400" />
                  {currentClub.city}
                </span>
              )}
              {!isAdmin && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                  View-Only Mode
                </span>
              )}
            </div>

            {currentClub.description && (
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                {currentClub.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-1">
              <span className="font-semibold text-slate-300">{players.length} Club Members</span>
              <span aria-hidden="true">·</span>
              <span>{matches.length} Rated Games Recorded</span>
              <span aria-hidden="true">·</span>
              <span>Independent Rating Pool</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <Cloud className="h-3 w-3" />
                Firestore Isolated
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => setIsClubDirectoryOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Switch Club</span>
            </button>

            <button
              onClick={handleExportData}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              title="Download JSON Backup of this club's records"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 transition-colors"
                title={`Reset ${currentClub.name} members to 0 games and 1400 Elo`}
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

        {/* Active Tab View */}
        {activeTab === 'standings' ? (
          <div className="space-y-6">
            <ClubStatsOverview players={players} matches={matches} />
            <ClubStandingsTable
              players={players}
              isAdmin={isAdmin}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
              onRecordMatchForPlayer={() => setIsEnterResultOpen(true)}
              onEditPlayer={(p) => setEditingPlayer(p)}
              onDeletePlayer={handleDeletePlayer}
            />
          </div>
        ) : activeTab === 'matches' ? (
          <MatchHistoryLedger
            matches={matches}
            isAdmin={isAdmin}
            onDeleteMatch={handleDeleteMatch}
            onEditMatch={(m) => setEditingMatch(m)}
          />
        ) : (
          <div className="space-y-6">
            <ClubStatsOverview players={players} matches={matches} />
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-base font-bold text-white mb-2">Independent Club Rating System</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl mb-4">
                Each chess club on ClubElo operates as a completely separate rating pool. Matches recorded in {currentClub.name} only alter ratings within this club&apos;s membership ledger.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800">
                  <span className="font-semibold text-amber-400 block mb-1">Isolated Leaderboards</span>
                  <span className="text-slate-400 text-[11px]">
                    Players registered in {currentClub.name} compete only against fellow club attendees, preventing cross-organization rating distortion.
                  </span>
                </div>
                <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800">
                  <span className="font-semibold text-amber-400 block mb-1">Club Passcode Security</span>
                  <span className="text-slate-400 text-[11px]">
                    Club administrators can log in using their own club-specific secret key to record matches and manage member statistics.
                  </span>
                </div>
                <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800">
                  <span className="font-semibold text-amber-400 block mb-1">Real-Time Cloud Sync</span>
                  <span className="text-slate-400 text-[11px]">
                    All matches, Elo updates, and club snapshots are synced in real-time to Google Cloud Firestore with zero data leakage between clubs.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-5 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ClubElo Manager · Multi-Club Chess Attendance & Elo Rating System</span>
          <span className="text-slate-400 font-mono">
            {currentClub.name} · {players.length} Members · {matches.length} Games Tracked
          </span>
        </div>
      </footer>

      {/* Modals */}
      <EnterResultModal
        isOpen={isEnterResultOpen}
        onClose={() => setIsEnterResultOpen(false)}
        players={players}
        onSaveMatch={handleSaveMatch}
        defaultRoundName={`${currentClub.name} - Round ${Math.floor(matches.length / 10) + 1}`}
      />

      <AddPlayerModal
        isOpen={isAddPlayerOpen}
        onClose={() => setIsAddPlayerOpen(false)}
        onAddPlayer={handleAddPlayer}
      />

      <PlayerDetailModal
        player={selectedPlayer}
        isOpen={selectedPlayer !== null}
        onClose={() => setSelectedPlayer(null)}
        matches={matches}
        isAdmin={isAdmin}
        onRecordMatchForPlayer={() => setIsEnterResultOpen(true)}
        onEditPlayer={(p) => setEditingPlayer(p)}
        onEditMatch={(m) => setEditingMatch(m)}
      />

      <EditPlayerModal
        player={editingPlayer}
        isOpen={editingPlayer !== null}
        onClose={() => setEditingPlayer(null)}
        onUpdatePlayer={handleUpdatePlayer}
        onDeletePlayer={handleDeletePlayer}
      />

      <EditResultModal
        isOpen={editingMatch !== null}
        onClose={() => setEditingMatch(null)}
        match={editingMatch}
        players={players}
        onUpdateMatch={handleUpdateMatch}
      />

      <VersionManagerModal
        isOpen={isVersionManagerOpen}
        onClose={() => setIsVersionManagerOpen(false)}
        currentPlayers={players}
        currentMatches={matches}
        isAdmin={isAdmin}
        clubId={currentClub.id}
        clubName={currentClub.name}
        onRestoreState={(newPlayers, newMatches) => {
          setPlayers(newPlayers);
          setMatches(newMatches);
          restoreSnapshotToFirestore(
            {
              id: `restored_${Date.now()}`,
              clubId: currentClub.id,
              name: `Restored ${currentClub.name} State`,
              createdAt: new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }),
              playersCount: newPlayers.length,
              matchesCount: newMatches.length,
              players: newPlayers,
              matches: newMatches,
            },
            currentClub.id
          ).catch((err) => {
            console.error('Failed to sync restored state to Firestore:', err);
          });
        }}
      />

      {/* Admin Login & Security Modal */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isAdmin={isAdmin}
        currentClub={currentClub}
        onLoginSuccess={handleAdminLoginSuccess}
        onLogout={handleAdminLogout}
      />

      {/* Create New Club Modal */}
      <CreateClubModal
        isOpen={isCreateClubOpen}
        onClose={() => setIsCreateClubOpen(false)}
        onClubCreated={handleClubCreated}
        existingClubs={clubs}
      />

      {/* Browse All Clubs Directory Modal */}
      <ClubDirectoryModal
        isOpen={isClubDirectoryOpen}
        onClose={() => setIsClubDirectoryOpen(false)}
        clubs={clubs}
        currentClub={currentClub}
        onSelectClub={handleSelectClub}
        onCreateClubClick={() => setIsCreateClubOpen(true)}
        isAdmin={isAdmin}
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
                <h3 className="text-base font-bold text-white">Reset {currentClub.name} Roster</h3>
                <p className="text-xs text-slate-400">Restore members of this club to baseline</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              This will reset all members of <strong className="text-white">{currentClub.name}</strong> back to{' '}
              <strong className="text-amber-300">0 games played</strong> and{' '}
              <strong className="text-amber-300">1400 starting Elo</strong>. All match records for this club will be cleared. Other clubs remain unaffected.
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
                <span>Yes, Reset {currentClub.name}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
