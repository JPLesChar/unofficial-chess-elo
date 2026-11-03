import React, { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { MatchHistoryItem } from '../types/chess';
import { Chessboard } from './Chessboard';
import { X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Award, Clock } from 'lucide-react';

interface GameReviewModalProps {
  match: MatchHistoryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const GameReviewModal: React.FC<GameReviewModalProps> = ({ match, isOpen, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [boardHistory, setBoardHistory] = useState<{ fen: string; lastMove: { from: Square; to: Square } | null }[]>([]);
  const [reviewChess, setReviewChess] = useState<Chess>(new Chess());

  useEffect(() => {
    if (!match || !isOpen) return;

    // Replay the whole match into a sequence of FENs
    const engine = new Chess();
    const historyStates: { fen: string; lastMove: { from: Square; to: Square } | null }[] = [
      { fen: engine.fen(), lastMove: null },
    ];

    try {
      if (match.pgn) {
        engine.loadPgn(match.pgn);
        const historyMoves = engine.history({ verbose: true });
        const stepEngine = new Chess();
        historyStates.length = 0;
        historyStates.push({ fen: stepEngine.fen(), lastMove: null });

        for (const m of historyMoves) {
          stepEngine.move(m);
          historyStates.push({
            fen: stepEngine.fen(),
            lastMove: { from: m.from as Square, to: m.to as Square },
          });
        }
      }
    } catch {
      // Fallback if PGN parsing had issues
    }

    setBoardHistory(historyStates);
    setCurrentStepIndex(historyStates.length - 1); // Start at final position
  }, [match, isOpen]);

  // Update review chess instance whenever currentStepIndex changes
  useEffect(() => {
    if (boardHistory.length > 0 && currentStepIndex < boardHistory.length) {
      const state = boardHistory[currentStepIndex];
      const c = new Chess();
      c.load(state.fen);
      setReviewChess(c);
    }
  }, [currentStepIndex, boardHistory]);

  if (!isOpen || !match) return null;

  const currentMove = boardHistory[currentStepIndex]?.lastMove || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <div className="relative flex max-h-[95vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                match.result === 'win'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : match.result === 'loss'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {match.result.toUpperCase()}
            </span>
            <h3 className="text-lg font-bold text-white">Match Review & Analysis</h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>vs {match.opponent.name} ({match.opponentRating})</span>
            <span aria-hidden="true">·</span>
            <span>{match.openingName}</span>
            <span aria-hidden="true">·</span>
            <span>Reason: {match.reason.replace('_', ' ')}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-300">
              Elo Change: {match.ratingDelta > 0 ? `+${match.ratingDelta}` : match.ratingDelta}
            </span>
          </div>
        </div>

        {/* Main Content Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Chessboard view */}
          <div className="flex justify-center">
            <Chessboard
              chess={reviewChess}
              userColor={match.userColor}
              isInteractive={false}
              onMove={() => {}}
              lastMove={currentMove}
              flipped={match.userColor === 'black'}
            />
          </div>

          {/* Review Controls & Move list */}
          <div className="flex flex-col h-full justify-between space-y-4">
            {/* Step navigation */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                <span>Move Position</span>
                <span className="font-mono font-semibold text-white tabular-nums">
                  {currentStepIndex} / {boardHistory.length - 1}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  disabled={currentStepIndex === 0}
                  onClick={() => setCurrentStepIndex(0)}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  title="First Move"
                >
                  <ChevronsLeft className="h-5 w-5" />
                </button>
                <button
                  disabled={currentStepIndex === 0}
                  onClick={() => setCurrentStepIndex((i) => Math.max(0, i - 1))}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  title="Previous Move"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  disabled={currentStepIndex >= boardHistory.length - 1}
                  onClick={() => setCurrentStepIndex((i) => Math.min(boardHistory.length - 1, i + 1))}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  title="Next Move"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  disabled={currentStepIndex >= boardHistory.length - 1}
                  onClick={() => setCurrentStepIndex(boardHistory.length - 1)}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  title="Last Move"
                >
                  <ChevronsRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Move list transcript */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 max-h-56 overflow-y-auto">
              <span className="text-xs font-semibold text-slate-400 block mb-2">PGN Moves</span>
              {match.moves && match.moves.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                  {match.moves.map((m) => {
                    const whiteStep = m.moveNumber * 2 - 1;
                    const blackStep = m.moveNumber * 2;
                    return (
                      <div key={m.moveNumber} className="flex items-center gap-2 py-0.5">
                        <span className="text-slate-500 w-6">{m.moveNumber}.</span>
                        <span
                          onClick={() => whiteStep < boardHistory.length && setCurrentStepIndex(whiteStep)}
                          className={`cursor-pointer px-1 rounded hover:bg-slate-800 ${
                            currentStepIndex === whiteStep ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-200'
                          }`}
                        >
                          {m.white || '...'}
                        </span>
                        {m.black && (
                          <span
                            onClick={() => blackStep < boardHistory.length && setCurrentStepIndex(blackStep)}
                            className={`cursor-pointer px-1 rounded hover:bg-slate-800 ${
                              currentStepIndex === blackStep ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300'
                            }`}
                          >
                            {m.black}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No notation recorded.</p>
              )}
            </div>

            {/* Footer Summary */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 text-xs text-slate-400 flex items-center justify-between">
              <span>Date: {match.date}</span>
              <span className="font-mono tabular-nums">Total Moves: {match.movesCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
