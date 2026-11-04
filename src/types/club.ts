export type ClubCategory = 'Open' | 'Junior' | 'Veteran' | 'Women';

export interface ChessClub {
  id: string;
  name: string;
  city?: string;
  description?: string;
  adminPasscode: string;
  createdAt: string;
  playerCount?: number;
  matchCount?: number;
}

export interface ClubPlayer {
  id: string;
  clubId?: string;
  name: string;
  currentRating: number;
  initialRating: number;
  peakRating: number;
  category: ClubCategory;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  whiteWins: number;
  blackWins: number;
  joinDate: string;
  lastActiveDate: string;
  attendanceCount: number;
  notes?: string;
}

export type MatchResult = '1-0' | '0-1' | '1/2-1/2';

export interface ClubMatch {
  id: string;
  clubId?: string;
  date: string;
  boardNumber?: number;
  whitePlayerId: string;
  whitePlayerName: string;
  whiteRatingBefore: number;
  whiteRatingAfter: number;
  whiteDelta: number;

  blackPlayerId: string;
  blackPlayerName: string;
  blackRatingBefore: number;
  blackRatingAfter: number;
  blackDelta: number;

  result: MatchResult;
  timeControl: 'Classical' | 'Rapid' | 'Blitz';
  roundName?: string;
  openingOrNotes?: string;
}

export interface PlayerRatingPoint {
  date: string;
  rating: number;
  opponentName: string;
  delta: number;
  result: string;
  color: 'white' | 'black';
}
