import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, ensureAuthenticated, handleFirestoreError } from '../lib/firebase';
import { ClubMatch, ClubPlayer, ChessClub } from '../types/club';
import { INITIAL_CLUB_PLAYERS } from '../data/initialClubRoster';
import { DEFAULT_CLUBS, ZURICH_INITIAL_PLAYERS } from '../data/initialClubs';

const CLUBS_COLLECTION = 'clubs';
const PLAYERS_COLLECTION = 'players';
const MATCHES_COLLECTION = 'matches';
const SNAPSHOTS_COLLECTION = 'snapshots';

export interface SnapshotDoc {
  id: string;
  clubId?: string;
  name: string;
  description?: string;
  createdAt: string;
  playersCount: number;
  matchesCount: number;
  players: ClubPlayer[];
  matches: ClubMatch[];
}

/**
 * Initializes Firestore data:
 * 1. Checks and seeds default clubs (Geneva Chess Club, Zurich Knights)
 * 2. Seeds Geneva players and Zurich players if not present
 * 3. Migrates any legacy players/matches without clubId to 'geneva-chess-club'
 */
export async function initializeFirestoreIfNeeded(cachedPlayers?: ClubPlayer[], cachedMatches?: ClubMatch[]) {
  try {
    await ensureAuthenticated();

    // 1. Check Clubs collection
    const clubsCol = collection(db, CLUBS_COLLECTION);
    const existingClubsSnap = await getDocs(clubsCol);

    if (existingClubsSnap.empty) {
      console.log('[Firestore] Seeding default clubs directory...');
      const clubBatch = writeBatch(db);
      for (const club of DEFAULT_CLUBS) {
        const clubRef = doc(db, CLUBS_COLLECTION, club.id);
        clubBatch.set(clubRef, club);
      }
      await clubBatch.commit();
      console.log(`[Firestore] Seeded ${DEFAULT_CLUBS.length} initial chess clubs.`);
    }

    // 2. Check Players collection
    const playersCol = collection(db, PLAYERS_COLLECTION);
    const existingPlayersSnap = await getDocs(playersCol);

    if (existingPlayersSnap.empty) {
      const sourcePlayers = (cachedPlayers && cachedPlayers.length > 0)
        ? cachedPlayers
        : INITIAL_CLUB_PLAYERS;

      const batch = writeBatch(db);

      // Seed Geneva players
      for (const player of sourcePlayers) {
        const playerRef = doc(db, PLAYERS_COLLECTION, player.id);
        batch.set(playerRef, {
          id: player.id,
          clubId: 'geneva-chess-club',
          name: player.name,
          currentRating: player.currentRating ?? 1400,
          initialRating: player.initialRating ?? 1400,
          peakRating: player.peakRating ?? 1400,
          category: player.category || 'Open',
          gamesPlayed: player.gamesPlayed ?? 0,
          wins: player.wins ?? 0,
          draws: player.draws ?? 0,
          losses: player.losses ?? 0,
          whiteWins: player.whiteWins ?? 0,
          blackWins: player.blackWins ?? 0,
          joinDate: player.joinDate || '2026-01-10',
          lastActiveDate: player.lastActiveDate || '2026-11-04',
          attendanceCount: player.attendanceCount ?? 0,
          notes: player.notes || '',
        });
      }

      // Seed Zurich players
      for (const zkPlayer of ZURICH_INITIAL_PLAYERS) {
        const zkRef = doc(db, PLAYERS_COLLECTION, zkPlayer.id);
        batch.set(zkRef, zkPlayer);
      }

      // Seed matches if provided
      if (cachedMatches && cachedMatches.length > 0) {
        for (const match of cachedMatches) {
          const matchRef = doc(db, MATCHES_COLLECTION, match.id);
          batch.set(matchRef, {
            ...match,
            clubId: match.clubId || 'geneva-chess-club',
          });
        }
      }

      await batch.commit();
      console.log(`[Firestore] Successfully seeded players for Geneva and Zurich clubs.`);
    } else {
      // Migrate legacy players/matches without clubId to 'geneva-chess-club'
      const unassignedPlayers: ClubPlayer[] = [];
      existingPlayersSnap.forEach((d) => {
        const data = d.data() as ClubPlayer;
        if (!data.clubId) {
          unassignedPlayers.push(data);
        }
      });

      if (unassignedPlayers.length > 0) {
        const migrationBatch = writeBatch(db);
        for (const p of unassignedPlayers) {
          const pRef = doc(db, PLAYERS_COLLECTION, p.id);
          migrationBatch.set(pRef, { clubId: 'geneva-chess-club' }, { merge: true });
        }
        await migrationBatch.commit();
      }
    }
  } catch (err) {
    handleFirestoreError(err, { operation: 'create', targetCollection: CLUBS_COLLECTION });
  }
}

/**
 * Subscribe to real-time changes in Clubs collection
 */
export function subscribeToClubs(
  onUpdate: (clubs: ChessClub[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const clubsCol = collection(db, CLUBS_COLLECTION);
  return onSnapshot(
    clubsCol,
    (snapshot) => {
      const list: ChessClub[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ChessClub);
      });
      // Sort alphabetically by name
      list.sort((a, b) => a.name.localeCompare(b.name));
      onUpdate(list.length > 0 ? list : DEFAULT_CLUBS);
    },
    (err) => {
      handleFirestoreError(err, { operation: 'list', targetCollection: CLUBS_COLLECTION });
      if (onError) onError(err);
    }
  );
}

/**
 * Create a new chess club
 */
export async function createClubInFirestore(club: ChessClub): Promise<void> {
  await ensureAuthenticated();
  const clubRef = doc(db, CLUBS_COLLECTION, club.id);
  await setDoc(clubRef, club);
}

/**
 * Update an existing chess club
 */
export async function updateClubInFirestore(club: ChessClub): Promise<void> {
  await ensureAuthenticated();
  const clubRef = doc(db, CLUBS_COLLECTION, club.id);
  await setDoc(clubRef, club, { merge: true });
}

/**
 * Delete a chess club and its associated players & matches
 */
export async function deleteClubFromFirestore(clubId: string): Promise<void> {
  await ensureAuthenticated();

  // 1. Delete all matches for this club
  const matchesCol = collection(db, MATCHES_COLLECTION);
  const matchDocs = await getDocs(matchesCol);
  const matchBatch = writeBatch(db);
  matchDocs.forEach((d) => {
    const data = d.data() as ClubMatch;
    if (data.clubId === clubId) {
      matchBatch.delete(d.ref);
    }
  });
  await matchBatch.commit();

  // 2. Delete all players for this club
  const playersCol = collection(db, PLAYERS_COLLECTION);
  const playerDocs = await getDocs(playersCol);
  const playerBatch = writeBatch(db);
  playerDocs.forEach((d) => {
    const data = d.data() as ClubPlayer;
    if (data.clubId === clubId) {
      playerBatch.delete(d.ref);
    }
  });
  await playerBatch.commit();

  // 3. Delete club document
  const clubRef = doc(db, CLUBS_COLLECTION, clubId);
  await deleteDoc(clubRef);
}

/**
 * Subscribe to real-time changes in Players collection filtered by Club ID
 */
export function subscribeToPlayers(
  clubId: string,
  onUpdate: (players: ClubPlayer[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const playersCol = collection(db, PLAYERS_COLLECTION);
  return onSnapshot(
    playersCol,
    (snapshot) => {
      const list: ClubPlayer[] = [];
      snapshot.forEach((docSnap) => {
        const p = docSnap.data() as ClubPlayer;
        // Filter by active club ID (legacy documents without clubId default to geneva-chess-club)
        if (p.clubId === clubId || (!p.clubId && clubId === 'geneva-chess-club')) {
          list.push({ ...p, clubId });
        }
      });
      // Sort descending by current rating
      list.sort((a, b) => b.currentRating - a.currentRating || a.name.localeCompare(b.name));
      onUpdate(list);
    },
    (err) => {
      handleFirestoreError(err, { operation: 'list', targetCollection: PLAYERS_COLLECTION });
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to real-time changes in Matches collection filtered by Club ID
 */
export function subscribeToMatches(
  clubId: string,
  onUpdate: (matches: ClubMatch[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const matchesCol = collection(db, MATCHES_COLLECTION);
  return onSnapshot(
    matchesCol,
    (snapshot) => {
      const list: ClubMatch[] = [];
      snapshot.forEach((docSnap) => {
        const m = docSnap.data() as ClubMatch;
        // Filter by active club ID (legacy matches without clubId default to geneva-chess-club)
        if (m.clubId === clubId || (!m.clubId && clubId === 'geneva-chess-club')) {
          list.push({ ...m, clubId });
        }
      });
      // Sort descending by date/id
      list.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
      onUpdate(list);
    },
    (err) => {
      handleFirestoreError(err, { operation: 'list', targetCollection: MATCHES_COLLECTION });
      if (onError) onError(err);
    }
  );
}

/**
 * Add or update a single player scoped to a club
 */
export async function savePlayerToFirestore(player: ClubPlayer, clubId: string): Promise<void> {
  await ensureAuthenticated();
  const playerRef = doc(db, PLAYERS_COLLECTION, player.id);
  const data = {
    id: player.id,
    clubId,
    name: player.name,
    currentRating: player.currentRating,
    initialRating: player.initialRating,
    peakRating: player.peakRating,
    category: player.category,
    gamesPlayed: player.gamesPlayed,
    wins: player.wins,
    draws: player.draws,
    losses: player.losses,
    whiteWins: player.whiteWins ?? 0,
    blackWins: player.blackWins ?? 0,
    joinDate: player.joinDate,
    lastActiveDate: player.lastActiveDate,
    attendanceCount: player.attendanceCount,
    notes: player.notes || '',
  };
  await setDoc(playerRef, data, { merge: true });
}

/**
 * Delete a player from Firestore
 */
export async function deletePlayerFromFirestore(playerId: string): Promise<void> {
  await ensureAuthenticated();
  const playerRef = doc(db, PLAYERS_COLLECTION, playerId);
  await deleteDoc(playerRef);
}

/**
 * Record a new match in Firestore and update the players' ratings & stats atomically
 */
export async function saveMatchToFirestore(
  match: ClubMatch,
  whitePlayer: ClubPlayer,
  blackPlayer: ClubPlayer,
  clubId: string
): Promise<void> {
  await ensureAuthenticated();
  const batch = writeBatch(db);

  // 1. Save match document with clubId
  const matchRef = doc(db, MATCHES_COLLECTION, match.id);
  batch.set(matchRef, { ...match, clubId });

  // 2. Update White player
  const isWhiteWin = match.result === '1-0';
  const isDraw = match.result === '1/2-1/2';
  const isWhiteLoss = match.result === '0-1';

  const updatedWhite: ClubPlayer = {
    ...whitePlayer,
    clubId,
    currentRating: match.whiteRatingAfter,
    peakRating: Math.max(whitePlayer.peakRating, match.whiteRatingAfter),
    gamesPlayed: whitePlayer.gamesPlayed + 1,
    wins: isWhiteWin ? whitePlayer.wins + 1 : whitePlayer.wins,
    draws: isDraw ? whitePlayer.draws + 1 : whitePlayer.draws,
    losses: isWhiteLoss ? whitePlayer.losses + 1 : whitePlayer.losses,
    whiteWins: isWhiteWin ? (whitePlayer.whiteWins ?? 0) + 1 : (whitePlayer.whiteWins ?? 0),
    lastActiveDate: match.date,
    attendanceCount: whitePlayer.attendanceCount + (whitePlayer.lastActiveDate !== match.date ? 1 : 0),
  };
  const whiteRef = doc(db, PLAYERS_COLLECTION, whitePlayer.id);
  batch.set(whiteRef, updatedWhite, { merge: true });

  // 3. Update Black player
  const isBlackWin = match.result === '0-1';
  const isBlackLoss = match.result === '1-0';

  const updatedBlack: ClubPlayer = {
    ...blackPlayer,
    clubId,
    currentRating: match.blackRatingAfter,
    peakRating: Math.max(blackPlayer.peakRating, match.blackRatingAfter),
    gamesPlayed: blackPlayer.gamesPlayed + 1,
    wins: isBlackWin ? blackPlayer.wins + 1 : blackPlayer.wins,
    draws: isDraw ? blackPlayer.draws + 1 : blackPlayer.draws,
    losses: isBlackLoss ? blackPlayer.losses + 1 : blackPlayer.losses,
    blackWins: isBlackWin ? (blackPlayer.blackWins ?? 0) + 1 : (blackPlayer.blackWins ?? 0),
    lastActiveDate: match.date,
    attendanceCount: blackPlayer.attendanceCount + (blackPlayer.lastActiveDate !== match.date ? 1 : 0),
  };
  const blackRef = doc(db, PLAYERS_COLLECTION, blackPlayer.id);
  batch.set(blackRef, updatedBlack, { merge: true });

  await batch.commit();
}

/**
 * Delete a match from Firestore and roll back player stats atomically
 */
export async function deleteMatchFromFirestore(
  targetMatch: ClubMatch,
  whitePlayer?: ClubPlayer,
  blackPlayer?: ClubPlayer
): Promise<void> {
  await ensureAuthenticated();
  const batch = writeBatch(db);

  // 1. Delete match document
  const matchRef = doc(db, MATCHES_COLLECTION, targetMatch.id);
  batch.delete(matchRef);

  // 2. Revert White player
  if (whitePlayer) {
    const isWin = targetMatch.result === '1-0';
    const isDraw = targetMatch.result === '1/2-1/2';
    const isLoss = targetMatch.result === '0-1';

    const revertedWhite: ClubPlayer = {
      ...whitePlayer,
      currentRating: whitePlayer.currentRating - targetMatch.whiteDelta,
      gamesPlayed: Math.max(0, whitePlayer.gamesPlayed - 1),
      wins: isWin ? Math.max(0, whitePlayer.wins - 1) : whitePlayer.wins,
      draws: isDraw ? Math.max(0, whitePlayer.draws - 1) : whitePlayer.draws,
      losses: isLoss ? Math.max(0, whitePlayer.losses - 1) : whitePlayer.losses,
      whiteWins: isWin ? Math.max(0, (whitePlayer.whiteWins ?? 0) - 1) : whitePlayer.whiteWins,
    };
    const whiteRef = doc(db, PLAYERS_COLLECTION, whitePlayer.id);
    batch.set(whiteRef, revertedWhite, { merge: true });
  }

  // 3. Revert Black player
  if (blackPlayer) {
    const isWin = targetMatch.result === '0-1';
    const isDraw = targetMatch.result === '1/2-1/2';
    const isLoss = targetMatch.result === '1-0';

    const revertedBlack: ClubPlayer = {
      ...blackPlayer,
      currentRating: blackPlayer.currentRating - targetMatch.blackDelta,
      gamesPlayed: Math.max(0, blackPlayer.gamesPlayed - 1),
      wins: isWin ? Math.max(0, blackPlayer.wins - 1) : blackPlayer.wins,
      draws: isDraw ? Math.max(0, blackPlayer.draws - 1) : blackPlayer.draws,
      losses: isLoss ? Math.max(0, blackPlayer.losses - 1) : blackPlayer.losses,
      blackWins: isWin ? Math.max(0, (blackPlayer.blackWins ?? 0) - 1) : blackPlayer.blackWins,
    };
    const blackRef = doc(db, PLAYERS_COLLECTION, blackPlayer.id);
    batch.set(blackRef, revertedBlack, { merge: true });
  }

  await batch.commit();
}

/**
 * Update an existing match with new result/deltas and recalculate players
 */
export async function updateMatchInFirestore(
  originalMatch: ClubMatch,
  updatedMatch: ClubMatch,
  whitePlayer?: ClubPlayer,
  blackPlayer?: ClubPlayer,
  clubId?: string
): Promise<void> {
  await ensureAuthenticated();
  const batch = writeBatch(db);

  // 1. Update match document
  const matchRef = doc(db, MATCHES_COLLECTION, updatedMatch.id);
  batch.set(matchRef, { ...updatedMatch, clubId: clubId || updatedMatch.clubId || originalMatch.clubId || 'geneva-chess-club' }, { merge: true });

  // 2. Adjust White player
  if (whitePlayer) {
    const origWin = originalMatch.result === '1-0';
    const origDraw = originalMatch.result === '1/2-1/2';
    const origLoss = originalMatch.result === '0-1';

    const newWin = updatedMatch.result === '1-0';
    const newDraw = updatedMatch.result === '1/2-1/2';
    const newLoss = updatedMatch.result === '0-1';

    const ratingAfter = whitePlayer.currentRating - originalMatch.whiteDelta + updatedMatch.whiteDelta;
    const winsAdj = (newWin ? 1 : 0) - (origWin ? 1 : 0);
    const drawsAdj = (newDraw ? 1 : 0) - (origDraw ? 1 : 0);
    const lossesAdj = (newLoss ? 1 : 0) - (origLoss ? 1 : 0);
    const whiteWinsAdj = (newWin ? 1 : 0) - (origWin ? 1 : 0);

    const adjustedWhite: ClubPlayer = {
      ...whitePlayer,
      currentRating: ratingAfter,
      peakRating: Math.max(whitePlayer.peakRating, ratingAfter),
      wins: Math.max(0, whitePlayer.wins + winsAdj),
      draws: Math.max(0, whitePlayer.draws + drawsAdj),
      losses: Math.max(0, whitePlayer.losses + lossesAdj),
      whiteWins: Math.max(0, (whitePlayer.whiteWins ?? 0) + whiteWinsAdj),
    };
    const whiteRef = doc(db, PLAYERS_COLLECTION, whitePlayer.id);
    batch.set(whiteRef, adjustedWhite, { merge: true });
  }

  // 3. Adjust Black player
  if (blackPlayer) {
    const origWin = originalMatch.result === '0-1';
    const origDraw = originalMatch.result === '1/2-1/2';
    const origLoss = originalMatch.result === '1-0';

    const newWin = updatedMatch.result === '0-1';
    const newDraw = updatedMatch.result === '1/2-1/2';
    const newLoss = updatedMatch.result === '1-0';

    const ratingAfter = blackPlayer.currentRating - originalMatch.blackDelta + updatedMatch.blackDelta;
    const winsAdj = (newWin ? 1 : 0) - (origWin ? 1 : 0);
    const drawsAdj = (newDraw ? 1 : 0) - (origDraw ? 1 : 0);
    const lossesAdj = (newLoss ? 1 : 0) - (origLoss ? 1 : 0);
    const blackWinsAdj = (newWin ? 1 : 0) - (origWin ? 1 : 0);

    const adjustedBlack: ClubPlayer = {
      ...blackPlayer,
      currentRating: ratingAfter,
      peakRating: Math.max(blackPlayer.peakRating, ratingAfter),
      wins: Math.max(0, blackPlayer.wins + winsAdj),
      draws: Math.max(0, blackPlayer.draws + drawsAdj),
      losses: Math.max(0, blackPlayer.losses + lossesAdj),
      blackWins: Math.max(0, (blackPlayer.blackWins ?? 0) + blackWinsAdj),
    };
    const blackRef = doc(db, PLAYERS_COLLECTION, blackPlayer.id);
    batch.set(blackRef, adjustedBlack, { merge: true });
  }

  await batch.commit();
}

/**
 * Reset all players to 1400 starting Elo and 0 games played for a specific club, and clear that club's match records
 */
export async function resetAllClubRatingsInFirestore(clubId: string, currentPlayers: ClubPlayer[]): Promise<void> {
  await ensureAuthenticated();

  // 1. Delete only matches belonging to this club
  const matchesCol = collection(db, MATCHES_COLLECTION);
  const matchDocs = await getDocs(matchesCol);
  const matchBatch = writeBatch(db);
  matchDocs.forEach((d) => {
    const matchData = d.data() as ClubMatch;
    if (matchData.clubId === clubId || (!matchData.clubId && clubId === 'geneva-chess-club')) {
      matchBatch.delete(d.ref);
    }
  });
  await matchBatch.commit();

  // 2. Reset each player in this club to 1400 / 0
  const playerBatch = writeBatch(db);
  for (const p of currentPlayers) {
    const pRef = doc(db, PLAYERS_COLLECTION, p.id);
    playerBatch.set(
      pRef,
      {
        ...p,
        clubId,
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
        lastActiveDate: '2026-11-04',
      },
      { merge: true }
    );
  }
  await playerBatch.commit();
}

/**
 * Save a club snapshot to Firestore
 */
export async function saveSnapshotToFirestore(snapshot: SnapshotDoc, clubId?: string): Promise<void> {
  await ensureAuthenticated();
  const snapRef = doc(db, SNAPSHOTS_COLLECTION, snapshot.id);
  await setDoc(snapRef, { ...snapshot, clubId: clubId || snapshot.clubId || 'geneva-chess-club' });
}

/**
 * Fetch all snapshots from Firestore filtered by clubId
 */
export async function getSnapshotsFromFirestore(clubId?: string): Promise<SnapshotDoc[]> {
  await ensureAuthenticated();
  const snapCol = collection(db, SNAPSHOTS_COLLECTION);
  const snapshot = await getDocs(snapCol);
  const list: SnapshotDoc[] = [];
  snapshot.forEach((d) => {
    const data = d.data() as SnapshotDoc;
    if (!clubId || data.clubId === clubId || (!data.clubId && clubId === 'geneva-chess-club')) {
      list.push(data);
    }
  });
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list;
}

/**
 * Restore a snapshot to Firestore (overwrites roster & matches for this club)
 */
export async function restoreSnapshotToFirestore(snapshot: SnapshotDoc, clubId: string): Promise<void> {
  await ensureAuthenticated();

  // Clear existing matches for this club
  const matchesCol = collection(db, MATCHES_COLLECTION);
  const existingMatches = await getDocs(matchesCol);
  const deleteBatch = writeBatch(db);
  existingMatches.forEach((d) => {
    const m = d.data() as ClubMatch;
    if (m.clubId === clubId || (!m.clubId && clubId === 'geneva-chess-club')) {
      deleteBatch.delete(d.ref);
    }
  });
  await deleteBatch.commit();

  // Write snapshot matches with clubId
  if (snapshot.matches.length > 0) {
    const matchBatch = writeBatch(db);
    for (const m of snapshot.matches) {
      matchBatch.set(doc(db, MATCHES_COLLECTION, m.id), { ...m, clubId });
    }
    await matchBatch.commit();
  }

  // Write snapshot players with clubId
  const playerBatch = writeBatch(db);
  for (const p of snapshot.players) {
    playerBatch.set(doc(db, PLAYERS_COLLECTION, p.id), { ...p, clubId });
  }
  await playerBatch.commit();
}
