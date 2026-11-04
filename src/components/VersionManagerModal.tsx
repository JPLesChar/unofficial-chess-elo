import React, { useState, useRef } from 'react';
import { ClubMatch, ClubPlayer } from '../types/club';
import { INITIAL_CLUB_PLAYERS } from '../data/initialClubRoster';
import { X, Upload, Bookmark, RotateCcw, Clock, Trash2, Check, Download, ShieldCheck, Cloud } from 'lucide-react';
import { saveSnapshotToFirestore, getSnapshotsFromFirestore, SnapshotDoc } from '../services/firestoreClubService';

export interface ClubSnapshot {
  id: string;
  name: string;
  date: string;
  playersCount: number;
  matchesCount: number;
  players: ClubPlayer[];
  matches: ClubMatch[];
}

interface VersionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlayers: ClubPlayer[];
  currentMatches: ClubMatch[];
  isAdmin?: boolean;
  clubId?: string;
  clubName?: string;
  onRestoreState: (players: ClubPlayer[], matches: ClubMatch[]) => void;
}

export const VersionManagerModal: React.FC<VersionManagerModalProps> = ({
  isOpen,
  onClose,
  currentPlayers,
  currentMatches,
  isAdmin = false,
  clubId = 'geneva-chess-club',
  clubName = 'Club',
  onRestoreState,
}) => {
  const [snapshotName, setSnapshotName] = useState<string>('');
  const [snapshots, setSnapshots] = useState<ClubSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(`club_elo_snapshots_${clubId}`) || localStorage.getItem('club_elo_snapshots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch Firestore snapshots when modal opens
  React.useEffect(() => {
    if (isOpen) {
      getSnapshotsFromFirestore(clubId)
        .then((remoteList) => {
          if (remoteList && remoteList.length > 0) {
            const mapped: ClubSnapshot[] = remoteList.map((s) => ({
              id: s.id,
              name: s.name,
              date: s.createdAt,
              playersCount: s.playersCount,
              matchesCount: s.matchesCount,
              players: s.players,
              matches: s.matches,
            }));
            setSnapshots(mapped);
            localStorage.setItem(`club_elo_snapshots_${clubId}`, JSON.stringify(mapped));
          }
        })
        .catch((err) => console.log('Could not load Firestore snapshots:', err));
    }
  }, [isOpen, clubId]);

  const [masterVersion, setMasterVersion] = useState<ClubSnapshot | null>(() => {
    try {
      const saved = localStorage.getItem('club_elo_master_version');
      if (saved) return JSON.parse(saved);

      // Auto-lock the clean 1400 baseline as default Master Version
      const defaultMaster: ClubSnapshot = {
        id: 'master_baseline_1400',
        name: 'Master Baseline (40 Players @ 1400 Elo · 0 Games)',
        date: 'Clean Master Template',
        playersCount: INITIAL_CLUB_PLAYERS.length,
        matchesCount: 0,
        players: INITIAL_CLUB_PLAYERS,
        matches: [],
      };
      localStorage.setItem('club_elo_master_version', JSON.stringify(defaultMaster));
      return defaultMaster;
    } catch {
      return null;
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const showErrorFeedback = (msg: string) => {
    setErrorFeedback(msg);
    setTimeout(() => setErrorFeedback(null), 4500);
  };

  // Save current state as Master Version
  const handleSaveMaster = () => {
    const master: ClubSnapshot = {
      id: `master_${Date.now()}`,
      name: 'Master Baseline (1400 Elo Clean Roster)',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      playersCount: currentPlayers.length,
      matchesCount: currentMatches.length,
      players: currentPlayers,
      matches: currentMatches,
    };
    setMasterVersion(master);
    localStorage.setItem('club_elo_master_version', JSON.stringify(master));
    showFeedback('Saved current state as the official Master Version!');
  };

  // Restore Master Version
  const handleRestoreMaster = () => {
    if (!masterVersion) return;
    onRestoreState(masterVersion.players, masterVersion.matches);
    showFeedback('Restored to Master Version!');
    onClose();
  };

  // Create a named snapshot
  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    const name = snapshotName.trim() || `Snapshot ${snapshots.length + 1}`;
    const newSnapshot: ClubSnapshot = {
      id: `snap_${Date.now()}`,
      name,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      playersCount: currentPlayers.length,
      matchesCount: currentMatches.length,
      players: currentPlayers,
      matches: currentMatches,
    };

    const updated = [newSnapshot, ...snapshots];
    setSnapshots(updated);
    localStorage.setItem(`club_elo_snapshots_${clubId}`, JSON.stringify(updated));
    setSnapshotName('');

    // Persist to Cloud Firestore
    saveSnapshotToFirestore({
      id: newSnapshot.id,
      clubId,
      name: newSnapshot.name,
      createdAt: newSnapshot.date,
      playersCount: newSnapshot.playersCount,
      matchesCount: newSnapshot.matchesCount,
      players: newSnapshot.players,
      matches: newSnapshot.matches,
    }, clubId)
      .then(() => showFeedback(`Saved to Cloud & Snapshot: "${name}"`))
      .catch((err) => {
        console.error('Firestore snapshot save err:', err);
        showFeedback(`Saved snapshot locally: "${name}"`);
      });
  };

  // Restore a snapshot
  const handleRestoreSnapshot = (snap: ClubSnapshot) => {
    onRestoreState(snap.players, snap.matches);
    showFeedback(`Restored to "${snap.name}"!`);
    onClose();
  };

  // Delete a snapshot
  const handleDeleteSnapshot = (snapId: string) => {
    const updated = snapshots.filter((s) => s.id !== snapId);
    setSnapshots(updated);
    localStorage.setItem('club_elo_snapshots', JSON.stringify(updated));
  };

  // Import from JSON file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.players)) {
          onRestoreState(parsed.players, Array.isArray(parsed.matches) ? parsed.matches : []);
          showFeedback('Imported backup file successfully!');
          onClose();
        } else {
          showErrorFeedback('Invalid backup file format. Expected a valid ClubElo backup JSON.');
        }
      } catch {
        showErrorFeedback('Failed to parse the uploaded file. Please make sure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[95vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-amber-400" />
            Version & Snapshot Manager
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Keep a locked Master Version, create version milestones, and import previous club files
          </p>
        </div>

        {/* Admin or View-Only Banner */}
        {!isAdmin && (
          <div className="mb-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold">🔒 View-Only Mode</span>
              <span>· Snapshot creation, restoring, and file imports require Admin Passcode.</span>
            </div>
          </div>
        )}

        {errorFeedback && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs font-semibold text-rose-300 flex items-center gap-2">
            <X className="h-4 w-4" />
            {errorFeedback}
          </div>
        )}

        {feedback && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/50 p-3 text-xs font-semibold text-emerald-300 flex items-center gap-2">
            <Check className="h-4 w-4" />
            {feedback}
          </div>
        )}

        <div className="space-y-6">
          {/* Master Version Section */}
          <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-slate-950 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Master Baseline Version</h3>
              </div>
              {masterVersion && (
                <span className="text-[11px] font-mono text-amber-300">
                  Saved on {masterVersion.date}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              {masterVersion
                ? `Locked with ${masterVersion.playersCount} players and ${masterVersion.matchesCount} matches. You can restore this clean state whenever a new season begins.`
                : 'Save your clean roster (e.g. 40 players at 1400 Elo with 0 games) as the permanent Master Baseline.'}
            </p>

            {isAdmin ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveMaster}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-colors"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  {masterVersion ? 'Update Master Version' : 'Set Current State as Master'}
                </button>

                {masterVersion && (
                  <button
                    type="button"
                    onClick={handleRestoreMaster}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore to Master Version
                  </button>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-amber-300/80 italic flex items-center gap-1.5">
                <span>🔒 Protected baseline (Admin passcode required to restore or update)</span>
              </div>
            )}
          </div>

          {/* Create Named Snapshot (Admin Only) */}
          {isAdmin && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Save Current Progress Snapshot
              </h3>
              <form onSubmit={handleCreateSnapshot} className="flex gap-2">
                <input
                  type="text"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  placeholder="e.g. Week 1 Results, Autumn Round 3"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Save Snapshot
                </button>
              </form>
            </div>
          )}

          {/* List of Saved Snapshots */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Saved Club Snapshots ({snapshots.length})
            </h3>
            {snapshots.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{snap.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {snap.date} · {snap.playersCount} Players · {snap.matchesCount} Matches Logged
                      </div>
                    </div>

                    {isAdmin ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRestoreSnapshot(snap)}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleDeleteSnapshot(snap.id)}
                          className="rounded-lg p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete Snapshot"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        Archived
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 text-center">
                No snapshots saved yet. Save a snapshot before entering games each round to preserve previous standings.
              </p>
            )}
          </div>

          {/* Import Backup File From Computer (Admin Only) */}
          {isAdmin ? (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-300 block">
                  Import Saved JSON Backup File
                </span>
                <span className="text-[11px] text-slate-500">
                  Restore a backup file exported previously from your computer
                </span>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload Backup File
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 italic text-center">
              File restoration and imports are reserved for club administrators.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
