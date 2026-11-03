export type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'classical';

export interface TimeControlConfig {
  id: TimeControl;
  name: string;
  initialSeconds: number;
  incrementSeconds: number;
  description: string;
}

export type PlayerColor = 'white' | 'black';

export type GameOutcome = 'win' | 'loss' | 'draw';

export type GameEndReason =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'stalemate'
  | 'insufficient_material'
  | 'threefold'
  | 'agreed_draw';

export interface MatchOpponent {
  id: string;
  name: string;
  rating: number;
  countryCode: string;
  countryName: string;
  avatarSeed: string;
  playStyle: string;
  title?: string;
  winRate: number;
}

export interface MoveRecord {
  moveNumber: number;
  white?: string;
  black?: string;
  whiteFen?: string;
  blackFen?: string;
}

export interface MatchHistoryItem {
  id: string;
  date: string;
  opponent: MatchOpponent;
  timeControl: TimeControl;
  userColor: PlayerColor;
  result: GameOutcome;
  reason: GameEndReason;
  userRatingBefore: number;
  userRatingAfter: number;
  ratingDelta: number;
  opponentRating: number;
  movesCount: number;
  openingName: string;
  pgn: string;
  moves: MoveRecord[];
}

export interface UserRatings {
  bullet: number;
  blitz: number;
  rapid: number;
  classical: number;
}

export interface UserProfile {
  id: string;
  username: string;
  title?: string;
  avatarSeed: string;
  countryCode: string;
  countryName: string;
  ratings: UserRatings;
  peakRatings: UserRatings;
  gamesPlayed: Record<TimeControl, number>;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  whiteWins: number;
  blackWins: number;
  joinDate: string;
}

export interface RatingTier {
  id: string;
  name: string;
  minRating: number;
  maxRating: number;
  color: string;
  badgeBg: string;
}

export interface BotPlayer {
  id: string;
  name: string;
  rating: number;
  blitzRating: number;
  rapidRating: number;
  bulletRating: number;
  classicalRating: number;
  countryCode: string;
  countryName: string;
  avatarSeed: string;
  playStyle: string;
  title?: string;
  winRate: number;
  bio: string;
  tacticalAggressiveness: number; // 0 to 1
  errorProbability: number; // 0 to 1
  depth: number;
}
