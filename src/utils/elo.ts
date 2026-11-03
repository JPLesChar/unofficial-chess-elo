import { GameOutcome, RatingTier, TimeControl, TimeControlConfig } from '../types/chess';

export const TIME_CONTROLS: TimeControlConfig[] = [
  {
    id: 'blitz',
    name: 'Blitz (3+2)',
    initialSeconds: 180,
    incrementSeconds: 2,
    description: 'Fast tactical battle with 3 minutes and 2s bonus per move',
  },
  {
    id: 'rapid',
    name: 'Rapid (10 min)',
    initialSeconds: 600,
    incrementSeconds: 0,
    description: 'Standard competitive rating format with 10 minutes per player',
  },
  {
    id: 'bullet',
    name: 'Bullet (1+1)',
    initialSeconds: 60,
    incrementSeconds: 1,
    description: 'Lightning-fast instincts with 1 minute and 1s increment',
  },
  {
    id: 'classical',
    name: 'Classical (30 min)',
    initialSeconds: 1800,
    incrementSeconds: 0,
    description: 'Deep strategic calculation with 30 minutes each',
  },
];

export const RATING_TIERS: RatingTier[] = [
  {
    id: 'wood',
    name: 'Beginner',
    minRating: 0,
    maxRating: 799,
    color: '#94a3b8',
    badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  {
    id: 'bronze',
    name: 'Novice',
    minRating: 800,
    maxRating: 1099,
    color: '#d97706',
    badgeBg: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
  },
  {
    id: 'silver',
    name: 'Club Intermediate',
    minRating: 1100,
    maxRating: 1399,
    color: '#38bdf8',
    badgeBg: 'bg-sky-950/60 text-sky-300 border-sky-800/60',
  },
  {
    id: 'gold',
    name: 'Advanced',
    minRating: 1400,
    maxRating: 1699,
    color: '#f59e0b',
    badgeBg: 'bg-yellow-950/60 text-yellow-300 border-yellow-700/60',
  },
  {
    id: 'platinum',
    name: 'Expert',
    minRating: 1700,
    maxRating: 1999,
    color: '#10b981',
    badgeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60',
  },
  {
    id: 'diamond',
    name: 'Candidate Master',
    minRating: 2000,
    maxRating: 2199,
    color: '#818cf8',
    badgeBg: 'bg-indigo-950/60 text-indigo-300 border-indigo-700/60',
  },
  {
    id: 'master',
    name: 'National Master',
    minRating: 2200,
    maxRating: 2399,
    color: '#f43f5e',
    badgeBg: 'bg-rose-950/60 text-rose-300 border-rose-700/60',
  },
  {
    id: 'elite',
    name: 'Grandmaster',
    minRating: 2400,
    maxRating: 3200,
    color: '#a855f7',
    badgeBg: 'bg-purple-950/60 text-purple-300 border-purple-700/60',
  },
];

export function getRatingTier(rating: number): RatingTier {
  for (const tier of RATING_TIERS) {
    if (rating >= tier.minRating && rating <= tier.maxRating) {
      return tier;
    }
  }
  return RATING_TIERS[RATING_TIERS.length - 1];
}

export function getNextRatingTier(rating: number): { nextTier: RatingTier | null; pointsNeeded: number; progressPercent: number } {
  const currentTier = getRatingTier(rating);
  const currentIndex = RATING_TIERS.findIndex((t) => t.id === currentTier.id);

  if (currentIndex === RATING_TIERS.length - 1) {
    return {
      nextTier: null,
      pointsNeeded: 0,
      progressPercent: 100,
    };
  }

  const nextTier = RATING_TIERS[currentIndex + 1];
  const tierRange = currentTier.maxRating - currentTier.minRating + 1;
  const progressInTier = rating - currentTier.minRating;
  const progressPercent = Math.min(100, Math.max(0, Math.round((progressInTier / tierRange) * 100)));
  const pointsNeeded = Math.max(0, nextTier.minRating - rating);

  return { nextTier, pointsNeeded, progressPercent };
}

/**
 * Calculates win probability according to standard Elo formula
 */
export function getWinProbability(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculates rating delta for a finished game
 */
export function calculateEloDelta(
  playerRating: number,
  opponentRating: number,
  outcome: GameOutcome,
  gamesPlayedCount: number
): { playerDelta: number; opponentDelta: number; expectedScore: number } {
  const expectedPlayer = getWinProbability(playerRating, opponentRating);
  const expectedOpponent = 1 - expectedPlayer;

  // K-factor: higher for provisional / fewer games, standard for established
  let kFactor = 32;
  if (gamesPlayedCount > 30) {
    kFactor = playerRating >= 2400 ? 16 : playerRating >= 2000 ? 20 : 24;
  }

  const actualScore = outcome === 'win' ? 1.0 : outcome === 'draw' ? 0.5 : 0.0;
  const playerDelta = Math.round(kFactor * (actualScore - expectedPlayer));

  // Opponent delta
  const actualOpponentScore = 1.0 - actualScore;
  const opponentDelta = Math.round(kFactor * (actualOpponentScore - expectedOpponent));

  return { playerDelta, opponentDelta, expectedScore: expectedPlayer };
}

/**
 * Estimates overall percentile based on USCF / FIDE bell curve
 */
export function getRatingPercentile(rating: number): number {
  // Mean ~ 1250, SD ~ 300 in typical online chess population
  const z = (rating - 1250) / 320;
  // Cumulative normal distribution approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  const pct = Math.max(1, Math.min(99.9, Math.round(p * 1000) / 10));
  return pct;
}

/**
 * Identifies common chess opening names from initial moves
 */
export function identifyOpening(moves: string[]): string {
  if (!moves || moves.length === 0) return 'Standard Opening';

  const moveStr = moves.slice(0, 6).join(' ');

  if (moveStr.startsWith('e4 c5')) return 'Sicilian Defense';
  if (moveStr.startsWith('e4 e5 Nf3 Nc6 Bb5')) return 'Ruy Lopez (Spanish Opening)';
  if (moveStr.startsWith('e4 e5 Nf3 Nc6 Bc4')) return 'Italian Game';
  if (moveStr.startsWith('e4 e6')) return 'French Defense';
  if (moveStr.startsWith('e4 c6')) return 'Caro-Kann Defense';
  if (moveStr.startsWith('e4 d5')) return 'Scandinavian Defense';
  if (moveStr.startsWith('e4 e5 Nf3 Nf6')) return "Petrov's Defense";
  if (moveStr.startsWith('e4 e5 f4')) return "King's Gambit";
  if (moveStr.startsWith('d4 d5 c4')) return "Queen's Gambit";
  if (moveStr.startsWith('d4 Nf6 c4 g6')) return "King's Indian Defense";
  if (moveStr.startsWith('d4 Nf6 c4 e6 Nf3 b6')) return "Queen's Indian Defense";
  if (moveStr.startsWith('d4 Nf6 c4 e6 Nc3 Bb4')) return 'Nimzo-Indian Defense';
  if (moveStr.startsWith('d4 d5 Bf4') || moveStr.startsWith('d4 Nf6 Bf4')) return 'London System';
  if (moveStr.startsWith('d4 f5')) return 'Dutch Defense';
  if (moveStr.startsWith('c4')) return 'English Opening';
  if (moveStr.startsWith('Nf3')) return 'Réti Opening';
  if (moveStr.startsWith('e4 e5')) return "King's Pawn Game";
  if (moveStr.startsWith('d4 d5')) return "Queen's Pawn Game";
  if (moveStr.startsWith('e4')) return "King's Pawn Opening";
  if (moveStr.startsWith('d4')) return "Queen's Pawn Opening";

  return 'Flank Opening';
}
