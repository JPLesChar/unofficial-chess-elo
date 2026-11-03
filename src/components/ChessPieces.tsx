import React from 'react';
import { PieceSymbol, Color } from 'chess.js';

interface PieceProps {
  type: PieceSymbol;
  color: Color;
  className?: string;
}

export const ChessPiece: React.FC<PieceProps> = ({ type, color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';

  // SVG definitions for crisp, vector Staunton pieces
  switch (type) {
    case 'p': // Pawn
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 L 34,39.5 C 34,31.58 29.59,27.09 26.59,26.03 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
            fill={isWhite ? '#ffffff' : '#1e293b'}
            stroke={isWhite ? '#0f172a' : '#f8fafc'}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'n': // Knight
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="m 22,10 c 10.5,1 16.5,8 16,29 L 15,39 C 15,30 11.5,22 8,16 c 0,0 2.5,-3 8,-1 3,1 5,0 7,-3 z"
            fill={isWhite ? '#ffffff' : '#1e293b'}
            stroke={isWhite ? '#0f172a' : '#f8fafc'}
            strokeWidth="1.5"
          />
          <path
            d="m 24,18 c 0.38,2.91 -5.55,7.37 -8,9 -3,2 -2.82,4.34 -5,4 -1.04,-0.94 -1.45,-4.06 1,-6 2.5,-2 5,-2.5 6,-4 1.5,-2.25 -1,-2.5 -1,-2.5 1,-1.5 5,-1.5 7,-0.5 z"
            fill={isWhite ? '#ffffff' : '#1e293b'}
            stroke={isWhite ? '#0f172a' : '#f8fafc'}
            strokeWidth="1.5"
          />
          <circle cx="15" cy="14.5" r="1.5" fill={isWhite ? '#0f172a' : '#ffffff'} />
        </svg>
      );

    case 'b': // Bishop
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill="none"
            fillRule="evenodd"
            stroke={isWhite ? '#0f172a' : '#f8fafc'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,39.5 36,39.5 C 33,39.5 12,39.5 9,39.5 C 7.65,39.5 6.68,38.97 6,38 C 7.35,36.54 9,36 9,36 z"
              fill={isWhite ? '#ffffff' : '#1e293b'}
            />
            <path
              d="M 12,36 C 11,32 11,28 15,24 C 18,20 18,17 18,14 C 18,9.5 27,9.5 27,14 C 27,17 27,20 30,24 C 34,28 34,32 33,36 z"
              fill={isWhite ? '#ffffff' : '#1e293b'}
            />
            <circle cx="22.5" cy="8.5" r="2" fill={isWhite ? '#ffffff' : '#1e293b'} />
            <path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18" stroke={isWhite ? '#0f172a' : '#f8fafc'} />
          </g>
        </svg>
      );

    case 'r': // Rook
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill="none"
            fillRule="evenodd"
            stroke={isWhite ? '#0f172a' : '#f8fafc'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M 9,39 L 36,39 L 36,36 L 9,36 z"
              fill={isWhite ? '#ffffff' : '#1e293b'}
            />
            <path
              d="M 12,36 L 12,32 L 33,32 L 33,36 z"
              fill={isWhite ? '#ffffff' : '#1e293b'}
            />
            <path
              d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 z"
              fill={isWhite ? '#ffffff' : '#1e293b'}
            />
            <path
              d="M 12,14 L 33,14 L 31,32 L 14,32 z"
              fill={isWhite ? '#ffffff' : '#1e293b'}
            />
            <path d="M 14,29.5 L 31,29.5" stroke={isWhite ? '#0f172a' : '#f8fafc'} />
            <path d="M 14,16.5 L 31,16.5" stroke={isWhite ? '#0f172a' : '#f8fafc'} />
          </g>
        </svg>
      );

    case 'q': // Queen
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill="none"
            fillRule="evenodd"
            stroke={isWhite ? '#0f172a' : '#f8fafc'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 22.5,10 L 14,25 L 6.5,13.5 z"
              fill={isWhite ? '#ffffff' : '#1e293b'}
            />
            <path
              d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 10.5,36 10.5,36 C 9,37.5 11,38.5 11,38.5 L 34,38.5 C 34,38.5 36,37.5 34.5,36 C 34.5,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 z"
              fill={isWhite ? '#ffffff' : '#1e293b'}
            />
            <circle cx="6" cy="12" r="2" fill={isWhite ? '#ffffff' : '#1e293b'} />
            <circle cx="14" cy="9" r="2" fill={isWhite ? '#ffffff' : '#1e293b'} />
            <circle cx="22.5" cy="8" r="2" fill={isWhite ? '#ffffff' : '#1e293b'} />
            <circle cx="31" cy="9" r="2" fill={isWhite ? '#ffffff' : '#1e293b'} />
            <circle cx="39" cy="12" r="2" fill={isWhite ? '#ffffff' : '#1e293b'} />
          </g>
        </svg>
      );

    case 'k': // King
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill="none"
            fillRule="evenodd"
            stroke={isWhite ? '#0f172a' : '#f8fafc'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 22.5,11.5 L 22.5,4.5 M 19,8 L 26,8" stroke={isWhite ? '#0f172a' : '#f8fafc'} />
            <path
              d="M 11.5,37 C 17,40.5 28,40.5 33.5,37 C 36.5,35 37.5,32.5 37.5,30 C 37.5,27.5 36.5,25 33.5,23 C 28,19.5 17,19.5 11.5,23 C 8.5,25 7.5,27.5 7.5,30 C 7.5,32.5 8.5,35 11.5,37 z"
              fill={isWhite ? '#ffffff' : '#1e293b'}
            />
            <path
              d="M 20,8 C 17,11 12,14 12,18 C 12,23 15,26 22.5,26 C 30,26 33,23 33,18 C 33,14 28,11 25,8 z"
              fill={isWhite ? '#ffffff' : '#1e293b'}
            />
            <circle cx="22.5" cy="20" r="2.5" fill={isWhite ? '#0f172a' : '#ffffff'} />
          </g>
        </svg>
      );

    default:
      return null;
  }
};
