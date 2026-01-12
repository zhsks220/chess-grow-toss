import React from 'react';

// Common props
interface IconProps {
    className?: string;
    style?: React.CSSProperties;
}

// Import character images
import pawnImg from '../assets/characters/pawn.png';
import knightImg from '../assets/characters/knight.png';
import bishopImg from '../assets/characters/bishop.png';
import rookImg from '../assets/characters/look.png';
import queenImg from '../assets/characters/queen.png';
import kingImg from '../assets/characters/king.png';
import imperialImg from '../assets/characters/imperierking.png';

const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
};

export const PawnIcon: React.FC<IconProps> = ({ className, style }) => (
    <img src={pawnImg} className={className} style={{ ...imgStyle, ...style }} alt="Pawn" />
);

export const KnightIcon: React.FC<IconProps> = ({ className, style }) => (
    <img src={knightImg} className={className} style={{ ...imgStyle, ...style }} alt="Knight" />
);

export const BishopIcon: React.FC<IconProps> = ({ className, style }) => (
    <img src={bishopImg} className={className} style={{ ...imgStyle, ...style }} alt="Bishop" />
);

export const RookIcon: React.FC<IconProps> = ({ className, style }) => (
    <img src={rookImg} className={className} style={{ ...imgStyle, ...style }} alt="Rook" />
);

export const QueenIcon: React.FC<IconProps> = ({ className, style }) => (
    <img src={queenImg} className={className} style={{ ...imgStyle, ...style }} alt="Queen" />
);

export const KingIcon: React.FC<IconProps> = ({ className, style }) => (
    <img src={kingImg} className={className} style={{ ...imgStyle, ...style }} alt="King" />
);

export const ImperialKingIcon: React.FC<IconProps> = ({ className, style }) => (
    <img src={imperialImg} className={className} style={{ ...imgStyle, ...style }} alt="Imperial King" />
);
