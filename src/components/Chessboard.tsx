import React, { useState, useEffect } from 'react';
import { Chess, Square, PieceSymbol, Move } from 'chess.js';
import { ChessPiece } from './ChessPieces';
import { PlayerColor } from '../types/chess';
import { soundManager } from '../utils/sound';

interface ChessboardProps {
  chess: Chess;
  userColor: PlayerColor;
  isInteractive: boolean;
  onMove: (move: { from: Square; to: Square; promotion?: string }) => void;
  lastMove: { from: Square; to: Square } | null;
  flipped?: boolean;
}

export const Chessboard: React.FC<ChessboardProps> = ({
  chess,
  userColor,
  isInteractive,
  onMove,
  lastMove,
  flipped = false,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayFiles = flipped ? [...files].reverse() : files;
  const displayRanks = flipped ? [...ranks].reverse() : ranks;

  // Clear selections if game is not interactive
  useEffect(() => {
    if (!isInteractive) {
      setSelectedSquare(null);
      setValidMoves([]);
      setPendingPromotion(null);
    }
  }, [isInteractive]);

  // Find if king is currently in check
  let inCheckSquare: Square | null = null;
  if (chess.inCheck()) {
    const turn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          inCheckSquare = `${String.fromCharCode(97 + c)}${8 - r}` as Square;
          break;
        }
      }
    }
  }

  const handleSquareClick = (square: Square) => {
    if (!isInteractive) return;

    // If already waiting for pawn promotion selection, ignore clicks on board
    if (pendingPromotion) return;

    const piece = chess.get(square);
    const isUserTurn = chess.turn() === (userColor === 'white' ? 'w' : 'b');

    // If clicking a target square that is valid
    if (selectedSquare) {
      const targetMove = validMoves.find((m) => m.to === square);
      if (targetMove) {
        // Check if pawn promotion
        const movingPiece = chess.get(selectedSquare);
        const isPawn = movingPiece && movingPiece.type === 'p';
        const isPromotionRank = (movingPiece?.color === 'w' && square[1] === '8') || (movingPiece?.color === 'b' && square[1] === '1');

        if (isPawn && isPromotionRank) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }

        executeMove(selectedSquare, square);
        return;
      }
    }

    // Select piece if it belongs to current player
    if (piece && piece.color === chess.turn() && isUserTurn) {
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setValidMoves(moves);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const executeMove = (from: Square, to: Square, promotion?: string) => {
    setSelectedSquare(null);
    setValidMoves([]);
    setPendingPromotion(null);
    onMove({ from, to, promotion });
  };

  const handleDragStart = (e: React.DragEvent, square: Square) => {
    if (!isInteractive) return;
    const piece = chess.get(square);
    const isUserTurn = chess.turn() === (userColor === 'white' ? 'w' : 'b');
    if (!piece || piece.color !== chess.turn() || !isUserTurn) {
      e.preventDefault();
      return;
    }
    setDraggedSquare(square);
    setSelectedSquare(square);
    const moves = chess.moves({ square, verbose: true });
    setValidMoves(moves);
  };

  const handleDrop = (e: React.DragEvent, square: Square) => {
    e.preventDefault();
    if (!draggedSquare || !isInteractive) return;

    const targetMove = validMoves.find((m) => m.to === square);
    if (targetMove) {
      const movingPiece = chess.get(draggedSquare);
      const isPawn = movingPiece && movingPiece.type === 'p';
      const isPromotionRank = (movingPiece?.color === 'w' && square[1] === '8') || (movingPiece?.color === 'b' && square[1] === '1');

      if (isPawn && isPromotionRank) {
        setPendingPromotion({ from: draggedSquare, to: square });
        setDraggedSquare(null);
        return;
      }

      executeMove(draggedSquare, square);
    }
    setDraggedSquare(null);
  };

  return (
    <div className="relative aspect-square w-full max-w-[580px] select-none rounded-xl bg-slate-900 p-2 sm:p-3 shadow-2xl border border-slate-800">
      <div className="relative grid h-full w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-lg border border-slate-700/60">
        {displayRanks.map((rank, rIdx) =>
          displayFiles.map((file, fIdx) => {
            const square = `${file}${rank}` as Square;
            const piece = chess.get(square);
            const isLightSquare = (file.charCodeAt(0) - 97 + parseInt(rank, 10)) % 2 !== 0;

            const isSelected = selectedSquare === square;
            const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
            const isCheckSquare = inCheckSquare === square;
            const isValidDestination = validMoves.some((m) => m.to === square);
            const isCapture = isValidDestination && piece !== undefined;

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, square)}
                className={`relative flex items-center justify-center transition-colors duration-100 ${
                  isLightSquare
                    ? 'bg-[#ebecd0] dark:bg-[#e2d6b5]'
                    : 'bg-[#779556] dark:bg-[#b88b4a]'
                } ${
                  isLastMove
                    ? 'after:absolute after:inset-0 after:bg-amber-400/35 after:pointer-events-none'
                    : ''
                } ${
                  isSelected
                    ? 'after:absolute after:inset-0 after:bg-sky-400/40 after:ring-2 after:ring-sky-400 after:pointer-events-none'
                    : ''
                } ${
                  isCheckSquare
                    ? 'after:absolute after:inset-0 after:bg-rose-500/50 after:ring-2 after:ring-rose-500 after:animate-pulse after:pointer-events-none'
                    : ''
                }`}
              >
                {/* Board Rank Label (on left edge) */}
                {fIdx === 0 && (
                  <span
                    className={`absolute left-1 top-0.5 text-[10px] sm:text-xs font-semibold leading-none pointer-events-none ${
                      isLightSquare ? 'text-[#779556] dark:text-[#8d6935]' : 'text-[#ebecd0] dark:text-[#eedfbe]'
                    }`}
                  >
                    {rank}
                  </span>
                )}

                {/* Board File Label (on bottom edge) */}
                {rIdx === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] sm:text-xs font-semibold leading-none pointer-events-none ${
                      isLightSquare ? 'text-[#779556] dark:text-[#8d6935]' : 'text-[#ebecd0] dark:text-[#eedfbe]'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Piece */}
                {piece && (
                  <div
                    draggable={isInteractive && piece.color === chess.turn() && chess.turn() === (userColor === 'white' ? 'w' : 'b')}
                    onDragStart={(e) => handleDragStart(e, square)}
                    className="relative z-10 flex h-[82%] w-[82%] items-center justify-center cursor-pointer transition-transform duration-100 hover:scale-[1.05] active:scale-95"
                  >
                    <ChessPiece type={piece.type} color={piece.color} />
                  </div>
                )}

                {/* Valid Move Indicator Marker */}
                {isValidDestination && !isCapture && (
                  <div className="absolute z-20 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-slate-900/30 dark:bg-slate-950/40 pointer-events-none shadow-sm" />
                )}

                {/* Valid Capture Ring Marker */}
                {isCapture && (
                  <div className="absolute inset-1 z-20 rounded-full border-4 border-slate-900/35 dark:border-slate-950/45 pointer-events-none" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pawn Promotion Modal Overlay */}
      {pendingPromotion && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 rounded-xl">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl text-center">
            <h4 className="text-sm font-semibold text-slate-200 mb-3">Promote Pawn</h4>
            <div className="flex gap-2">
              {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((pieceType) => (
                <button
                  key={pieceType}
                  onClick={() => executeMove(pendingPromotion.from, pendingPromotion.to, pieceType)}
                  className="flex h-14 w-14 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-2 hover:bg-slate-700 hover:border-amber-400 transition-colors"
                >
                  <ChessPiece type={pieceType} color={userColor === 'white' ? 'w' : 'b'} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
