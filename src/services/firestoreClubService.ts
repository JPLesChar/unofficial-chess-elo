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
import { ClubMatch, ClubPlayer } from '../types/club';

const PLAYERS_COLLECTION = 'players';
const MATCHES_COLLECTION = 'matches';
const SNAPSHOTS_COLLECTION = 'snapshots';

export interface SnapshotDoc {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  playersCount: number;
  matchesCount: number;
  players: ClubPlayer[];
  matches: ClubMatch[];
}

/**
 * Initializes Firestore connection.
 */
export async function initializeFirestoreIfNeeded() {
  try {
    await ensureAuthenticated();
  } catch (err) {
    handleFirestoreError(err, { operation: 'list', targetCollection: PLAYERS_COLLECTION });
  }
}

/**
 * Subscribe to real-time changes in Players collection
 */
export function subscribeToPlayers(
  onUpdate: (players: ClubPlayer[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const playersCol = collection(db, PLAYERS_COLLECTION);
  return onSnapshot(
    playersCol,
    (snapshot) => {
      const list: ClubPlayer[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ClubPlayer);
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
 * Subscribe to real-time changes in Matches collection
 */
export function subscribeToMatches(
  onUpdate: (matches: ClubMatch[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const matchesCol = collection(db, MATCHES_COLLECTION);
  return onSnapshot(
    matchesCol,
    (snapshot) => {
      const list: ClubMatch[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ClubMatch);
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
 * Add or update a single player
 */
export async function savePlayerToFirestore(player: ClubPlayer): Promise<void> {
  await ensureAuthenticated();
  const playerRef = doc(db, PLAYERS_COLLECTION, player.id);
  const data: ClubPlayer = {
    id: player.id,
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
  blackPlayer: ClubPlayer
): Promise<void> {
  await ensureAuthenticated();
  const batch = writeBatch(db);

  // 1. Save match document
  const matchRef = doc(db, MATCHES_COLLECTION, match.id);
  batch.set(matchRef, match);

  // 2. Update White player
  const isWhiteWin = match.result === '1-0';
  const isDraw = match.result === '1/2-1/2';
  const isWhiteLoss = match.result === '0-1';

  const updatedWhite: ClubPlayer = {
    ...whitePlayer,
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
  blackPlayer?: ClubPlayer
): Promise<void> {
  await ensureAuthenticated();
  const batch = writeBatch(db);

  // 1. Update match document
  const matchRef = doc(db, MATCHES_COLLECTION, updatedMatch.id);
  batch.set(matchRef, updatedMatch, { merge: true });

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
 * Reset all players to 1400 starting Elo and 0 games played, and clear match records
 */
export async function resetAllClubRatingsInFirestore(currentPlayers: ClubPlayer[]): Promise<void> {
  await ensureAuthenticated();

  // 1. Delete all matches
  const matchesCol = collection(db, MATCHES_COLLECTION);
  const matchDocs = await getDocs(matchesCol);
  const matchBatch = writeBatch(db);
  matchDocs.forEach((d) => {
    matchBatch.delete(d.ref);
  });
  await matchBatch.commit();

  // 2. Reset each player to 1400 / 0
  const playerBatch = writeBatch(db);
  for (const p of currentPlayers) {
    const pRef = doc(db, PLAYERS_COLLECTION, p.id);
    playerBatch.set(
      pRef,
      {
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
        lastActiveDate: new Date().toISOString().split('T')[0],
      },
      { merge: true }
    );
  }
  await playerBatch.commit();
}

/**
 * Save a snapshot to Firestore
 */
export async function saveSnapshotToFirestore(snapshot: SnapshotDoc): Promise<void> {
  await ensureAuthenticated();
  const snapRef = doc(db, SNAPSHOTS_COLLECTION, snapshot.id);
  await setDoc(snapRef, snapshot);
}

/**
 * Fetch all snapshots from Firestore
 */
export async function getSnapshotsFromFirestore(): Promise<SnapshotDoc[]> {
  await ensureAuthenticated();
  const snapCol = collection(db, SNAPSHOTS_COLLECTION);
  const snapshot = await getDocs(snapCol);
  const list: SnapshotDoc[] = [];
  snapshot.forEach((d) => {
    list.push(d.data() as SnapshotDoc);
  });
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list;
}

/**
 * Restore a snapshot to Firestore (overwrites roster & matches)
 */
export async function restoreSnapshotToFirestore(snapshot: SnapshotDoc): Promise<void> {
  await ensureAuthenticated();

  // 1. Clear existing matches
  const matchesCol = collection(db, MATCHES_COLLECTION);
  const existingMatches = await getDocs(matchesCol);
  const deleteBatch = writeBatch(db);
  existingMatches.forEach((d) => {
    deleteBatch.delete(d.ref);
  });
  await deleteBatch.commit();

  // 2. Write snapshot matches
  if (snapshot.matches.length > 0) {
    const matchBatch = writeBatch(db);
    for (const m of snapshot.matches) {
      matchBatch.set(doc(db, MATCHES_COLLECTION, m.id), m);
    }
    await matchBatch.commit();
  }

  // 3. Write snapshot players
  const playerBatch = writeBatch(db);
  for (const p of snapshot.players) {
    playerBatch.set(doc(db, PLAYERS_COLLECTION, p.id), p);
  }
  await playerBatch.commit();
}
