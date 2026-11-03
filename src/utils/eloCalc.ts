import { MatchResult } from '../types/club';

export function getExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function getKFactor(gamesPlayed: number, rating: number): number {
  if (gamesPlayed < 20) return 32;
  if (rating >= 2000) return 16;
  return 24;
}

export function calculateClubGameElo(
  whiteRating: number,
  whiteGames: number,
  blackRating: number,
  blackGames: number,
  result: MatchResult
): {
  whiteExpected: number;
  blackExpected: number;
  whiteDelta: number;
  blackDelta: number;
  whiteNewRating: number;
  blackNewRating: number;
} {
  const whiteExpected = getExpectedScore(whiteRating, blackRating);
  const blackExpected = 1 - whiteExpected;

  const whiteActual = result === '1-0' ? 1.0 : result === '1/2-1/2' ? 0.5 : 0.0;
  const blackActual = 1.0 - whiteActual;

  const whiteK = getKFactor(whiteGames, whiteRating);
  const blackK = getKFactor(blackGames, blackRating);

  // Standard club rating calculation:
  // Using balanced exchange or individual K
  const whiteDelta = Math.round(whiteK * (whiteActual - whiteExpected));
  const blackDelta = Math.round(blackK * (blackActual - blackExpected));

  const whiteNewRating = Math.max(400, whiteRating + whiteDelta);
  const blackNewRating = Math.max(400, blackRating + blackDelta);

  return {
    whiteExpected,
    blackExpected,
    whiteDelta,
    blackDelta,
    whiteNewRating,
    blackNewRating,
  };
}

export function getRatingCategory(rating: number): { name: string; badgeClass: string } {
  if (rating >= 2000) return { name: 'Expert (2000+)', badgeClass: 'text-purple-400 bg-purple-950/60 border-purple-800/60' };
  if (rating >= 1800) return { name: 'Class A (1800-1999)', badgeClass: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60' };
  if (rating >= 1600) return { name: 'Class B (1600-1799)', badgeClass: 'text-blue-400 bg-blue-950/60 border-blue-800/60' };
  if (rating >= 1400) return { name: 'Class C (1400-1599)', badgeClass: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' };
  if (rating >= 1200) return { name: 'Class D (1200-1399)', badgeClass: 'text-amber-400 bg-amber-950/60 border-amber-800/60' };
  return { name: 'Class E / Novice (<1200)', badgeClass: 'text-slate-400 bg-slate-800 border-slate-700' };
}
