import React, { useState, useEffect } from 'react';
import { ClubMatch, ClubPlayer } from './types/club';
import { INITIAL_CLUB_MATCHES, INITIAL_CLUB_PLAYERS } from './data/initialClubRoster';
import { ClubStandingsTable } from './components/ClubStandingsTable';
import { MatchHistoryLedger } from './components/MatchHistoryLedger';
import { ClubStatsOverview } from './components/ClubStatsOverview';
import { EnterResultModal } from './components/EnterResultModal';
import { AddPlayerModal } from './components/AddPlayerModal';
import { PlayerDetailModal } from './components/PlayerDetailModal';
import { EditPlayerModal } from './components/EditPlayerModal';
import { EditResultModal } from './components/EditResultModal';
import { VersionManagerModal } from './components/VersionManagerModal';
import { PlusCircle, UserPlus, Download, RefreshCw, Trophy, Users, History, BarChart3, RotateCcw, Bookmark, AlertTriangle, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'stats'>('standings');

  // Club roster state
  const [players, setPlayers] = useState<ClubPlayer[]>(() => {
    try {
      const resetApplied = localStorage.getItem('club_elo_v3_reset_1400_clean');
      if (!resetApplied) {
        localStorage.setItem('club_elo_v3_reset_1400_clean', 'true');
        localStorage.setItem('club_elo_players_roster', JSON.stringify(INITIAL_CLUB_PLAYERS));
        localStorage.setItem('club_elo_matches_ledger', JSON.stringify([]));
        return INITIAL_CLUB_PLAYERS;
      }
      const saved = localStorage.getItem('club_elo_players_roster');
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

  // Club matches history state
  const [matches, setMatches] = useState<ClubMatch[]>(() => {
    try {
      const resetApplied = localStorage.getItem('club_elo_v3_reset_1400_clean');
      if (!resetApplied) {
        return [];
      }
      const saved = localStorage.getItem('club_elo_matches_ledger');
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

  // Synchronize to localStorage
  useEffect(() => {
    localStorage.setItem('club_elo_players_roster', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('club_elo_matches_ledger', JSON.stringify(matches));
  }, [matches]);

  // Update an existing player's details
  const handleUpdatePlayer = (updated: ClubPlayer) => {
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (selectedPlayer && selectedPlayer.id === updated.id) {
      setSelectedPlayer(updated);
    }
  };

  // Delete a player from roster
  const handleDeletePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    if (selectedPlayer && selectedPlayer.id === playerId) {
      setSelectedPlayer(null);
    }
  };

  // Handle saving a newly recorded match
  const handleSaveMatch = (match: ClubMatch) => {
    // 1. Prepend match to ledger
    setMatches((prev) => [match, ...prev]);

    // 2. Update White & Black players in roster
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
            whiteWins: isWin ? p.whiteWins + 1 : p.whiteWins,
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
            blackWins: isWin ? p.blackWins + 1 : p.blackWins,
            lastActiveDate: match.date,
            attendanceCount: p.attendanceCount + (p.lastActiveDate !== match.date ? 1 : 0),
          };
        }

        return p;
      })
    );
  };

  // Handle deleting a mistakenly entered match
  const handleDeleteMatch = (matchId: string) => {
    const targetMatch = matches.find((m) => m.id === matchId);
    if (!targetMatch) return;

    // Remove from ledger
    setMatches((prev) => prev.filter((m) => m.id !== matchId));

    // Rollback player ratings and stats
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
            whiteWins: isWin ? Math.max(0, p.whiteWins - 1) : p.whiteWins,
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
            blackWins: isWin ? Math.max(0, p.blackWins - 1) : p.blackWins,
          };
        }

        return p;
      })
    );
  };

  // Handle updating an existing match result with automatic rating recalculation
  const handleUpdateMatch = (originalMatch: ClubMatch, updatedMatch: ClubMatch) => {
    // 1. Update the match in the ledger
    setMatches((prev) => prev.map((m) => (m.id === originalMatch.id ? updatedMatch : m)));

    // 2. Adjust player ratings and records: rollback originalMatch, then apply updatedMatch
    setPlayers((prev) => {
      // First pass: rollback originalMatch
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
            whiteWins: isWin ? Math.max(0, p.whiteWins - 1) : p.whiteWins,
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
            blackWins: isWin ? Math.max(0, p.blackWins - 1) : p.blackWins,
          };
        }
        return p;
      });

      // Second pass: apply updatedMatch
      updatedList = updatedList.map((p) => {
        if (p.id === updatedMatch.whitePlayerId) {
          const isWin = updatedMatch.result === '1-0';
          const isDraw = updatedMatch.result === '1/2-1/2';
          const isLoss = updatedMatch.result === '0-1';
          const newRating = p.currentRating + updatedMatch.whiteDelta;
          return {
            ...p,
            currentRating: newRating,
            peakRating: Math.max(p.peakRating, newRating),
            gamesPlayed: p.gamesPlayed + 1,
            wins: isWin ? p.wins + 1 : p.wins,
            draws: isDraw ? p.draws + 1 : p.draws,
            losses: isLoss ? p.losses + 1 : p.losses,
            whiteWins: isWin ? p.whiteWins + 1 : p.whiteWins,
            lastActiveDate: updatedMatch.date,
          };
        }
        if (p.id === updatedMatch.blackPlayerId) {
          const isWin = updatedMatch.result === '0-1';
          const isDraw = updatedMatch.result === '1/2-1/2';
          const isLoss = updatedMatch.result === '1-0';
          const newRating = p.currentRating + updatedMatch.blackDelta;
          return {
            ...p,
            currentRating: newRating,
            peakRating: Math.max(p.peakRating, newRating),
            gamesPlayed: p.gamesPlayed + 1,
            wins: isWin ? p.wins + 1 : p.wins,
            draws: isDraw ? p.draws + 1 : p.draws,
            losses: isLoss ? p.losses + 1 : p.losses,
            blackWins: isWin ? p.blackWins + 1 : p.blackWins,
            lastActiveDate: updatedMatch.date,
          };
        }
        return p;
      });

      return updatedList;
    });
  };

  // Add new player to roster
  const handleAddPlayer = (newPlayer: ClubPlayer) => {
    setPlayers((prev) => [newPlayer, ...prev]);
  };

  // Export club data to backup JSON
  const handleExportData = () => {
    const backup = {
      exportDate: new Date().toISOString(),
      clubName: 'Local Chess Club',
      players,
      matches,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess_club_elo_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset all players to 0 games played and 1400 starting Elo
  const handleExecuteResetTo1400 = () => {
    setPlayers(INITIAL_CLUB_PLAYERS);
    setMatches([]);
    localStorage.setItem('club_elo_players_roster', JSON.stringify(INITIAL_CLUB_PLAYERS));
    localStorage.setItem('club_elo_matches_ledger', JSON.stringify([]));
    localStorage.setItem('club_elo_v3_reset_1400_clean', 'true');
    setIsResetConfirmOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* 
        TOP BAR CONTRACT:
        [Brand title, one line] — [4–5 nav links, 1–2 word labels, single-line] — [1 primary action]
      */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black text-base shadow-sm">
              ♔
            </span>
            <span>ClubElo Manager</span>
          </div>

          {/* Zone 2: Clean single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button
              onClick={() => setActiveTab('standings')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'standings' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              Standings & Roster ({players.length})
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'matches' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              Rounds & Match Ledger
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'stats' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              Club Analytics
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action (+ secondary controls) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsVersionManagerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-colors whitespace-nowrap shadow-sm"
              title="Manage Master Version, Snapshots, and Import Backups"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Versions & Snapshots
            </button>

            <button
              onClick={() => setIsAddPlayerOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Member
            </button>

            <button
              onClick={() => setIsEnterResultOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow hover:bg-amber-400 transition-all whitespace-nowrap shrink-0 active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              Record Game Result
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Header Title & Summary Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
              Local Chess Club · Over-The-Board Elo System
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{players.length} Registered Attendance</span>
              <span aria-hidden="true">·</span>
              <span>{matches.length} Rated Games Recorded</span>
              <span aria-hidden="true">·</span>
              <span>FIDE K-Factor Formula</span>
              <span aria-hidden="true">·</span>
              <span>Live Attendance Sync</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportData}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              title="Download JSON Backup of Club Records"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Reset all 40 club members to 0 games played and 1400 Elo"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset All
            </button>
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
            Standings
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-1.5 rounded-lg text-center ${
              activeTab === 'matches' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            Matches
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
              onSelectPlayer={(p) => setSelectedPlayer(p)}
              onRecordMatchForPlayer={(p) => {
                setIsEnterResultOpen(true);
              }}
              onEditPlayer={(p) => setEditingPlayer(p)}
              onDeletePlayer={handleDeletePlayer}
            />
          </div>
        ) : activeTab === 'matches' ? (
          <MatchHistoryLedger
            matches={matches}
            onDeleteMatch={handleDeleteMatch}
            onEditMatch={(m) => setEditingMatch(m)}
          />
        ) : (
          <div className="space-y-6">
            <ClubStatsOverview players={players} matches={matches} />
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-base font-bold text-white mb-2">How Elo Progression Works in the Club</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl mb-4">
                When you record game results from your club meetings, the system calculates the expected score between the two players based on the difference in their pre-game Elo ratings.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800">
                  <span className="font-semibold text-amber-400 block mb-1">Expected Score</span>
                  <span className="text-slate-400 text-[11px]">
                    Higher-rated players are expected to win more often. Winning against an equal opponent grants approximately +12 to +16 Elo.
                  </span>
                </div>
                <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800">
                  <span className="font-semibold text-amber-400 block mb-1">Upset Wins</span>
                  <span className="text-slate-400 text-[11px]">
                    Beating a significantly higher-rated opponent yields a massive rating gain (up to +25 to +30 Elo points), while the loser drops proportionally.
                  </span>
                </div>
                <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800">
                  <span className="font-semibold text-amber-400 block mb-1">Draws</span>
                  <span className="text-slate-400 text-[11px]">
                    A draw against a stronger player awards points to the lower-rated player and subtracts a small amount from the higher-rated player.
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
          <span>ClubElo Manager · Local Chess Club Attendance & Rating Software</span>
          <span className="text-slate-400 font-mono">
            {players.length} Members · {matches.length} Games Tracked
          </span>
        </div>
      </footer>

      {/* Modals */}
      <EnterResultModal
        isOpen={isEnterResultOpen}
        onClose={() => setIsEnterResultOpen(false)}
        players={players}
        onSaveMatch={handleSaveMatch}
        defaultRoundName={`Club Night - Round ${Math.floor(matches.length / 10) + 1}`}
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
        onRecordMatchForPlayer={(p) => {
          setIsEnterResultOpen(true);
        }}
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
        onRestoreState={(newPlayers, newMatches) => {
          setPlayers(newPlayers);
          setMatches(newMatches);
        }}
      />

      {/* Reset All to 1400 Confirmation Modal */}
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
                <p className="text-xs text-slate-400">Restore all 40 members to baseline</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              This will reset all 40 club members back to <strong className="text-amber-300">0 games played</strong> and <strong className="text-amber-300">1400 starting Elo</strong>. All match ledger records will be cleared.
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
                Yes, Reset All to 1400
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
