import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square, Move } from 'chess.js';
import confetti from 'canvas-confetti';
import { BotPlayer, GameEndReason, GameOutcome, MatchHistoryItem, MatchOpponent, PlayerColor, TimeControl, UserProfile } from '../types/chess';
import { Chessboard } from './Chessboard';
import { calculateEloDelta, identifyOpening, TIME_CONTROLS } from '../utils/elo';
import { getBotMove } from '../utils/chessBot';
import { soundManager } from '../utils/sound';
import { Clock, Flag, RotateCcw, Volume2, VolumeX, Eye, Swords, Sparkles, Check, ChevronRight } from 'lucide-react';

interface ActiveGameViewProps {
  userProfile: UserProfile;
  opponent: BotPlayer;
  timeControl: TimeControl;
  userColor: PlayerColor;
  onFinishGame: (matchRecord: MatchHistoryItem) => void;
  onBackToLobby: () => void;
  onReviewMatch: (match: MatchHistoryItem) => void;
}

export const ActiveGameView: React.FC<ActiveGameViewProps> = ({
  userProfile,
  opponent,
  timeControl,
  userColor,
  onFinishGame,
  onBackToLobby,
  onReviewMatch,
}) => {
  const [chess] = useState<Chess>(() => new Chess());
  const [fen, setFen] = useState<string>(chess.fen());
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [boardFlipped, setBoardFlipped] = useState<boolean>(userColor === 'black');
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

  // Clocks
  const tcConfig = TIME_CONTROLS.find((t) => t.id === timeControl) || TIME_CONTROLS[1];
  const [whiteTime, setWhiteTime] = useState<number>(tcConfig.initialSeconds);
  const [blackTime, setBlackTime] = useState<number>(tcConfig.initialSeconds);

  // Moves list
  const [movesHistory, setMovesHistory] = useState<{ moveNumber: number; white?: string; black?: string }[]>([]);

  // Post Game State
  const [gameOverResult, setGameOverResult] = useState<{
    outcome: GameOutcome;
    reason: GameEndReason;
    ratingDelta: number;
    newRating: number;
    matchRecord: MatchHistoryItem;
  } | null>(null);

  const isUserTurn = chess.turn() === (userColor === 'white' ? 'w' : 'b');
  const isGameOver = chess.isGameOver() || gameOverResult !== null;

  // Clocks countdown effect
  useEffect(() => {
    if (isGameOver) return;

    const timer = setInterval(() => {
      const turn = chess.turn();
      if (turn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            handleTimeout('w');
            return 0;
          }
          if (prev <= 10 && userColor === 'white') {
            soundManager.playClockTick();
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            handleTimeout('b');
            return 0;
          }
          if (prev <= 10 && userColor === 'black') {
            soundManager.playClockTick();
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [chess, isGameOver, userColor]);

  // Handle timeout
  const handleTimeout = (timedOutColor: 'w' | 'b') => {
    const isUserTimeout = (timedOutColor === 'w' && userColor === 'white') || (timedOutColor === 'b' && userColor === 'black');
    finalizeMatch(isUserTimeout ? 'loss' : 'win', 'timeout');
  };

  // Bot move trigger
  useEffect(() => {
    if (isGameOver) return;

    // Check if it's the bot's turn
    const botColor = userColor === 'white' ? 'b' : 'w';
    if (chess.turn() === botColor) {
      setIsBotThinking(true);

      // Realistic thinking delay based on bot rating and move number
      const thinkTime = Math.floor(Math.random() * 800) + 600; // 600ms to 1400ms

      const timer = setTimeout(() => {
        const move = getBotMove(chess, opponent, botColor === 'w');
        if (move) {
          applyMove(move);
        }
        setIsBotThinking(false);
      }, thinkTime);

      return () => clearTimeout(timer);
    }
  }, [fen, isGameOver, userColor]);

  const applyMove = (moveInput: string | { from: Square; to: Square; promotion?: string }) => {
    try {
      const move = chess.move(moveInput);
      if (!move) return;

      setLastMove({ from: move.from as Square, to: move.to as Square });
      setFen(chess.fen());

      // Add time increment
      if (tcConfig.incrementSeconds > 0) {
        if (move.color === 'w') {
          setWhiteTime((t) => t + tcConfig.incrementSeconds);
        } else {
          setBlackTime((t) => t + tcConfig.incrementSeconds);
        }
      }

      // Play appropriate sound effect
      if (chess.isCheckmate()) {
        const userWon = chess.turn() !== (userColor === 'white' ? 'w' : 'b');
        if (userWon) {
          soundManager.playVictory();
        } else {
          soundManager.playDefeat();
        }
      } else if (chess.inCheck()) {
        soundManager.playCheck();
      } else if (move.captured) {
        soundManager.playCapture();
      } else {
        soundManager.playMove();
      }

      // Update moves transcript
      updateMoveHistory(move);

      // Check if game ended naturally
      if (chess.isGameOver()) {
        if (chess.isCheckmate()) {
          const userWon = chess.turn() !== (userColor === 'white' ? 'w' : 'b');
          finalizeMatch(userWon ? 'win' : 'loss', 'checkmate');
        } else if (chess.isStalemate()) {
          finalizeMatch('draw', 'stalemate');
        } else if (chess.isThreefoldRepetition()) {
          finalizeMatch('draw', 'threefold');
        } else if (chess.isInsufficientMaterial()) {
          finalizeMatch('draw', 'insufficient_material');
        } else if (chess.isDraw()) {
          finalizeMatch('draw', 'agreed_draw');
        }
      }
    } catch {
      // Invalid move safety
    }
  };

  const updateMoveHistory = (move: Move) => {
    setMovesHistory((prev) => {
      const next = [...prev];
      if (move.color === 'w') {
        next.push({
          moveNumber: next.length + 1,
          white: move.san,
        });
      } else {
        if (next.length > 0 && !next[next.length - 1].black) {
          next[next.length - 1] = {
            ...next[next.length - 1],
            black: move.san,
          };
        } else {
          next.push({
            moveNumber: next.length + 1,
            black: move.san,
          });
        }
      }
      return next;
    });
  };

  const finalizeMatch = (outcome: GameOutcome, reason: GameEndReason) => {
    const userRating = userProfile.ratings[timeControl];
    const oppRating =
      timeControl === 'bullet'
        ? opponent.bulletRating
        : timeControl === 'blitz'
        ? opponent.blitzRating
        : timeControl === 'classical'
        ? opponent.classicalRating
        : opponent.rapidRating;

    const { playerDelta } = calculateEloDelta(
      userRating,
      oppRating,
      outcome,
      userProfile.gamesPlayed[timeControl]
    );

    const newRating = Math.max(100, userRating + playerDelta);

    // Extract all SAN moves
    const sanMoves = chess.history();
    const openingName = identifyOpening(sanMoves);

    const opponentData: MatchOpponent = {
      id: opponent.id,
      name: opponent.name,
      rating: oppRating,
      countryCode: opponent.countryCode,
      countryName: opponent.countryName,
      avatarSeed: opponent.avatarSeed,
      playStyle: opponent.playStyle,
      title: opponent.title,
      winRate: opponent.winRate,
    };

    const record: MatchHistoryItem = {
      id: `match_${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      opponent: opponentData,
      timeControl,
      userColor,
      result: outcome,
      reason,
      userRatingBefore: userRating,
      userRatingAfter: newRating,
      ratingDelta: playerDelta,
      opponentRating: oppRating,
      movesCount: movesHistory.length,
      openingName,
      pgn: chess.pgn(),
      moves: movesHistory,
    };

    setGameOverResult({
      outcome,
      reason,
      ratingDelta: playerDelta,
      newRating,
      matchRecord: record,
    });

    onFinishGame(record);

    if (outcome === 'win') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const handleResign = () => {
    if (isGameOver) return;
    soundManager.playDefeat();
    finalizeMatch('loss', 'resignation');
  };

  const handleOfferDraw = () => {
    if (isGameOver) return;
    // Bot accepts draw if in lower or equal position
    const evalScore = chess.history().length;
    if (evalScore > 20) {
      finalizeMatch('draw', 'agreed_draw');
    } else {
      alert('Opponent declined the draw offer and plays on.');
    }
  };

  const toggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  // Compute captured pieces & material difference
  const board = chess.board();
  const currentPieces: Record<string, number> = {
    wp: 0, wn: 0, wb: 0, wr: 0, wq: 0,
    bp: 0, bn: 0, bb: 0, br: 0, bq: 0,
  };

  board.forEach((row) => {
    row.forEach((sq) => {
      if (sq) {
        currentPieces[`${sq.color}${sq.type}`]++;
      }
    });
  });

  const startingPieces = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const capturedByWhite = {
    p: Math.max(0, startingPieces.p - currentPieces.bp),
    n: Math.max(0, startingPieces.n - currentPieces.bn),
    b: Math.max(0, startingPieces.b - currentPieces.bb),
    r: Math.max(0, startingPieces.r - currentPieces.br),
    q: Math.max(0, startingPieces.q - currentPieces.bq),
  };
  const capturedByBlack = {
    p: Math.max(0, startingPieces.p - currentPieces.wp),
    n: Math.max(0, startingPieces.n - currentPieces.wn),
    b: Math.max(0, startingPieces.b - currentPieces.wb),
    r: Math.max(0, startingPieces.r - currentPieces.wr),
    q: Math.max(0, startingPieces.q - currentPieces.wq),
  };

  const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const whiteMatScore =
    capturedByWhite.p * 1 + capturedByWhite.n * 3 + capturedByWhite.b * 3 + capturedByWhite.r * 5 + capturedByWhite.q * 9;
  const blackMatScore =
    capturedByBlack.p * 1 + capturedByBlack.n * 3 + capturedByBlack.b * 3 + capturedByBlack.r * 5 + capturedByBlack.q * 9;
  const userMatDiff =
    userColor === 'white' ? whiteMatScore - blackMatScore : blackMatScore - whiteMatScore;

  const formatClock = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const opponentRating =
    timeControl === 'bullet'
      ? opponent.bulletRating
      : timeControl === 'blitz'
      ? opponent.blitzRating
      : timeControl === 'classical'
      ? opponent.classicalRating
      : opponent.rapidRating;

  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Game Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Center Column: Chessboard & HUDs */}
        <div className="lg:col-span-8 flex flex-col items-center">
          {/* Opponent HUD Card (Top) */}
          <div className="w-full max-w-[580px] mb-2.5 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 font-bold text-amber-400 border border-slate-700">
                {opponent.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-white">{opponent.name}</span>
                  {opponent.title && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/20 px-1 py-0.2 rounded">
                      {opponent.title}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="font-mono tabular-nums text-slate-300 font-medium">
                    {opponentRating} Elo
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{opponent.countryName}</span>
                  {isBotThinking && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-400 font-medium animate-pulse">Thinking...</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Opponent Clock */}
            <div
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-lg font-bold tabular-nums transition-colors ${
                (userColor === 'white' ? blackTime : whiteTime) <= 15
                  ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40'
                  : chess.turn() !== (userColor === 'white' ? 'w' : 'b')
                  ? 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30'
                  : 'bg-slate-800/80 text-slate-300'
              }`}
            >
              <Clock className="h-4 w-4" />
              {formatClock(userColor === 'white' ? blackTime : whiteTime)}
            </div>
          </div>

          {/* Chessboard */}
          <Chessboard
            chess={chess}
            userColor={userColor}
            isInteractive={isUserTurn && !isGameOver}
            onMove={applyMove}
            lastMove={lastMove}
            flipped={boardFlipped}
          />

          {/* User Player HUD Card (Bottom) */}
          <div className="w-full max-w-[580px] mt-2.5 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold">
                {userProfile.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-white">{userProfile.username}</span>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-400/20 px-1 py-0.2 rounded">
                    YOU
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="font-mono tabular-nums text-slate-300 font-medium">
                    {userProfile.ratings[timeControl]} Elo
                  </span>
                  {userMatDiff !== 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] font-bold text-amber-300">
                        {userMatDiff > 0 ? `+${userMatDiff}` : userMatDiff}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* User Clock */}
            <div
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-lg font-bold tabular-nums transition-colors ${
                (userColor === 'white' ? whiteTime : blackTime) <= 15
                  ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40 animate-pulse'
                  : isUserTurn
                  ? 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30'
                  : 'bg-slate-800/80 text-slate-300'
              }`}
            >
              <Clock className="h-4 w-4" />
              {formatClock(userColor === 'white' ? whiteTime : blackTime)}
            </div>
          </div>
        </div>

        {/* Right Column: Move Transcript, Match Info, Controls */}
        <div className="lg:col-span-4 space-y-4">
          {/* Match Info & Actions Bar */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div>
                <span className="text-xs font-bold text-white block">
                  {tcConfig.name}
                </span>
                <span className="text-[11px] text-slate-400">
                  Playing as {userColor.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setBoardFlipped((f) => !f)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                  title="Flip Board Orientation"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={toggleSound}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                  title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                >
                  {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* In-Game Action Buttons */}
            {!isGameOver ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleOfferDraw}
                  className="rounded-lg border border-slate-700 bg-slate-800 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Offer Draw
                </button>
                <button
                  onClick={handleResign}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-900/60 bg-rose-950/40 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 transition-colors"
                >
                  <Flag className="h-3.5 w-3.5" />
                  Resign
                </button>
              </div>
            ) : (
              <button
                onClick={onBackToLobby}
                className="w-full rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
              >
                Return to Lobby
              </button>
            )}
          </div>

          {/* Move Log Transcript */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Move Notation
              </h4>
              <span className="font-mono text-xs text-slate-500">
                {movesHistory.length} Moves
              </span>
            </div>

            <div className="h-64 overflow-y-auto rounded-lg bg-slate-950/60 p-2 border border-slate-800/80">
              {movesHistory.length > 0 ? (
                <div className="space-y-1 font-mono text-xs">
                  {movesHistory.map((m) => (
                    <div
                      key={m.moveNumber}
                      className="grid grid-cols-6 items-center px-2 py-1 rounded hover:bg-slate-800/40"
                    >
                      <span className="col-span-1 text-slate-500">{m.moveNumber}.</span>
                      <span className="col-span-2 font-medium text-slate-200">{m.white}</span>
                      <span className="col-span-3 font-medium text-slate-300">{m.black || ''}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500 italic">
                  Game starting... waiting for first move.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Post Game Outcome Modal */}
      {gameOverResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-center">
            {/* Outcome Icon / Header */}
            <div className="mb-4">
              <span
                className={`inline-block text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-3 ${
                  gameOverResult.outcome === 'win'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : gameOverResult.outcome === 'loss'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {gameOverResult.outcome === 'win'
                  ? 'VICTORY'
                  : gameOverResult.outcome === 'loss'
                  ? 'DEFEAT'
                  : 'DRAW'}
              </span>

              <h2 className="text-2xl font-bold text-white">
                {gameOverResult.reason === 'checkmate'
                  ? 'Checkmate'
                  : gameOverResult.reason === 'resignation'
                  ? 'Opponent Resigned'
                  : gameOverResult.reason === 'timeout'
                  ? 'Won on Time'
                  : gameOverResult.reason.replace('_', ' ')}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                vs {opponent.name} ({opponentRating} Elo)
              </p>
            </div>

            {/* Elo Rating Update Card */}
            <div className="my-6 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <span className="text-xs font-semibold text-slate-400 block mb-1">
                Rating Adjustment ({timeControl.toUpperCase()})
              </span>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-xl text-slate-400 tabular-nums">
                  {userProfile.ratings[timeControl]}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-600" />
                <span className="font-mono text-2xl font-extrabold text-white tabular-nums">
                  {gameOverResult.newRating}
                </span>
                <span
                  className={`font-mono text-base font-bold tabular-nums px-2 py-0.5 rounded ${
                    gameOverResult.ratingDelta > 0
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : gameOverResult.ratingDelta < 0
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {gameOverResult.ratingDelta > 0
                    ? `+${gameOverResult.ratingDelta}`
                    : gameOverResult.ratingDelta}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                onClick={() => onReviewMatch(gameOverResult.matchRecord)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-3 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <Eye className="h-4 w-4" />
                Review Game & Moves
              </button>
              <button
                onClick={onBackToLobby}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-bold text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500 transition-all"
              >
                <Swords className="h-4 w-4 fill-current" />
                Match New Opponent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
