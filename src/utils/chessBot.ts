import { Chess, Move, Square } from 'chess.js';
import { BotPlayer } from '../types/chess';

// Standard piece values in centipawns
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Positional bonuses for center control & piece development
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

function squareToIndex(square: Square, isWhite: boolean): number {
  const file = square.charCodeAt(0) - 97; // a -> 0
  const rank = parseInt(square[1], 10) - 1; // 1 -> 0
  if (isWhite) {
    return (7 - rank) * 8 + file;
  } else {
    return rank * 8 + file;
  }
}

function evaluatePosition(chess: Chess, isWhiteBot: boolean): number {
  if (chess.isCheckmate()) {
    return chess.turn() === (isWhiteBot ? 'w' : 'b') ? -30000 : 30000;
  }
  if (chess.isDraw()) {
    return 0;
  }

  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const pieceValue = PIECE_VALUES[piece.type] || 0;
      let positionalBonus = 0;
      const square = `${String.fromCharCode(97 + c)}${8 - r}` as Square;
      const isWhite = piece.color === 'w';
      const sqIndex = squareToIndex(square, isWhite);

      if (piece.type === 'p') {
        positionalBonus = PAWN_TABLE[sqIndex] || 0;
      } else if (piece.type === 'n') {
        positionalBonus = KNIGHT_TABLE[sqIndex] || 0;
      } else if (piece.type === 'b') {
        positionalBonus = BISHOP_TABLE[sqIndex] || 0;
      }

      const totalPieceVal = pieceValue + positionalBonus;
      if (piece.color === (isWhiteBot ? 'w' : 'b')) {
        score += totalPieceVal;
      } else {
        score -= totalPieceVal;
      }
    }
  }

  if (chess.inCheck()) {
    score += chess.turn() === (isWhiteBot ? 'w' : 'b') ? -40 : 40;
  }

  return score;
}

function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  isWhiteBot: boolean
): number {
  if (depth === 0 || chess.isGameOver()) {
    return evaluatePosition(chess, isWhiteBot);
  }

  const moves = chess.moves({ verbose: true });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const evaluation = minimax(chess, depth - 1, alpha, beta, false, isWhiteBot);
      chess.undo();
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const evaluation = minimax(chess, depth - 1, alpha, beta, true, isWhiteBot);
      chess.undo();
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

/**
 * Calculates best move according to the bot's configured skill & error tolerance
 */
export function getBotMove(chess: Chess, bot: BotPlayer, isWhiteBot: boolean): Move | null {
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  // Check for immediate mate-in-1 opportunity
  for (const move of legalMoves) {
    chess.move(move);
    if (chess.isCheckmate()) {
      chess.undo();
      return move;
    }
    chess.undo();
  }

  // Error simulation based on bot Elo
  // If error triggered, bot picks a random move or a lower-quality move
  const shouldBlunder = Math.random() < bot.errorProbability;
  if (shouldBlunder && legalMoves.length > 1) {
    // Pick non-optimal move to simulate human club player slips
    const filtered = legalMoves.filter((m) => !m.captured);
    const candidatePool = filtered.length > 0 ? filtered : legalMoves;
    return candidatePool[Math.floor(Math.random() * candidatePool.length)];
  }

  // If low depth (beginner bot), pick best 1-ply capture or random move
  if (bot.depth <= 1) {
    // Sort captures highest value first
    const captureMoves = legalMoves.filter((m) => m.captured);
    if (captureMoves.length > 0 && Math.random() < 0.7) {
      captureMoves.sort((a, b) => {
        const valA = a.captured ? PIECE_VALUES[a.captured] : 0;
        const valB = b.captured ? PIECE_VALUES[b.captured] : 0;
        return valB - valA;
      });
      return captureMoves[0];
    }
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  // Search using minimax with alpha-beta pruning
  const searchDepth = Math.min(bot.depth, 3); // Keep within snappy browser execution budget
  let bestScore = -Infinity;
  let bestMoves: Move[] = [];

  for (const move of legalMoves) {
    chess.move(move);
    const score = minimax(chess, searchDepth - 1, -Infinity, Infinity, false, isWhiteBot);
    chess.undo();

    // Add slight aggression bonus if configured
    let adjustedScore = score;
    if (move.captured && bot.tacticalAggressiveness > 0.5) {
      adjustedScore += Math.round(bot.tacticalAggressiveness * 25);
    }
    if (move.san.includes('+')) {
      adjustedScore += 15;
    }

    if (adjustedScore > bestScore) {
      bestScore = adjustedScore;
      bestMoves = [move];
    } else if (adjustedScore === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)] || legalMoves[0];
}
