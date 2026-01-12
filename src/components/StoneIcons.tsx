import React from 'react';

// Common props
interface IconProps {
    className?: string;
    style?: React.CSSProperties;
}

// Kawaii Go Stone SVGs
// Style matches ChessIcons: Thick outlines, flat colors, cute faces

export const StoneBlackIcon: React.FC<IconProps> = ({ className, style }) => (
    <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shadow */}
        <ellipse cx="50" cy="85" rx="35" ry="10" fill="black" opacity="0.2" />

        {/* Body - Slightly imperfect circle for organic feel */}
        <path d="M50 15C30 15 15 30 15 50C15 70 30 85 50 85C70 85 85 70 85 50C85 30 70 15 50 15Z"
            fill="#4a4a4a" stroke="#2d3436" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

        {/* Highlight/Shine */}
        <ellipse cx="35" cy="35" rx="10" ry="5" fill="white" opacity="0.1" transform="rotate(-45 35 35)" />

        {/* Face - Angry/Serious */}
        <path d="M35 45L45 50" stroke="#2d3436" strokeWidth="3" strokeLinecap="round" />
        <path d="M65 45L55 50" stroke="#2d3436" strokeWidth="3" strokeLinecap="round" />
        <circle cx="40" cy="55" r="4" fill="#fab1a0" /> {/* Cheeks - faint red eyes? No, angry eyes */}
        <circle cx="40" cy="55" r="2" fill="white" />

        <circle cx="60" cy="55" r="4" fill="#fab1a0" />
        <circle cx="60" cy="55" r="2" fill="white" />

        {/* Mouth */}
        <path d="M45 65Q50 62 55 65" stroke="#2d3436" strokeWidth="3" strokeLinecap="round" />
    </svg>
);

export const StoneWhiteIcon: React.FC<IconProps> = ({ className, style }) => (
    <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shadow */}
        <ellipse cx="50" cy="85" rx="35" ry="10" fill="black" opacity="0.2" />

        {/* Body */}
        <path d="M50 15C30 15 15 30 15 50C15 70 30 85 50 85C70 85 85 70 85 50C85 30 70 15 50 15Z"
            fill="#ffffff" stroke="#2d3436" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

        {/* Shading */}
        <path d="M20 50Q20 75 50 80" stroke="#dcdde1" strokeWidth="4" fill="none" opacity="0.5" />

        {/* Face - Cute/Determined */}
        <circle cx="38" cy="50" r="4" fill="#2d3436" />
        <circle cx="62" cy="50" r="4" fill="#2d3436" />

        {/* Cheeks */}
        <circle cx="32" cy="58" r="3" fill="#ff7675" opacity="0.6" />
        <circle cx="68" cy="58" r="3" fill="#ff7675" opacity="0.6" />

        {/* Mouth */}
        <path d="M45 58Q50 62 55 58" stroke="#2d3436" strokeWidth="3" strokeLinecap="round" />
    </svg>
);

// ============ BOSS VARIANTS ============
// Bosses are larger, have spikes/horns, and angrier faces

const BossBase: React.FC<IconProps & { color: string; accent: string; aura: string }> = ({ className, style, color, accent, aura }) => (
    <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Aura/Glow */}
        <circle cx="50" cy="50" r="48" fill={aura} opacity="0.3" filter="blur(4px)" />

        {/* Shadow */}
        <ellipse cx="50" cy="90" rx="40" ry="8" fill="black" opacity="0.3" />

        {/* Spikes / Horns - Behind body */}
        <path d="M20 30L10 10L35 25" fill={accent} stroke="#2d3436" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M80 30L90 10L65 25" fill={accent} stroke="#2d3436" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Body - Larger and slightly jagged */}
        <path d="M50 10C25 10 10 30 10 55C10 80 30 90 50 90C70 90 90 80 90 55C90 30 75 10 50 10Z"
            fill={color} stroke="#2d3436" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

        {/* Face - Very Angry */}
        {/* Eyebrows */}
        <path d="M30 40L45 48" stroke="#2d3436" strokeWidth="4" strokeLinecap="round" />
        <path d="M70 40L55 48" stroke="#2d3436" strokeWidth="4" strokeLinecap="round" />

        {/* Eyes - Glowing */}
        <path d="M35 55L45 55" stroke="white" strokeWidth="4" strokeLinecap="round" />
        <circle cx="40" cy="55" r="2" fill="red" />
        <path d="M55 55L65 55" stroke="white" strokeWidth="4" strokeLinecap="round" />
        <circle cx="60" cy="55" r="2" fill="red" />

        {/* Mouth - Sharp Teeth */}
        <path d="M35 70L40 75L45 70L50 75L55 70L60 75L65 70" stroke="#2d3436" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="white" />

        {/* Scar/Marking */}
        <path d="M25 35L30 45" stroke="#2d3436" strokeWidth="2" opacity="0.5" />
    </svg>
);

export const StoneBossRed: React.FC<IconProps> = (props) => (
    <BossBase {...props} color="#ff6b6b" accent="#c0392b" aura="#ff7675" />
);

export const StoneBossBlue: React.FC<IconProps> = (props) => (
    <BossBase {...props} color="#54a0ff" accent="#2e86de" aura="#74b9ff" />
);

export const StoneBossGreen: React.FC<IconProps> = (props) => (
    <BossBase {...props} color="#00b894" accent="#006266" aura="#55efc4" />
);

export const StoneBossPurple: React.FC<IconProps> = (props) => (
    <BossBase {...props} color="#a29bfe" accent="#6c5ce7" aura="#d6a2e8" />
);

export const StoneBossGold: React.FC<IconProps> = (props) => (
    <BossBase {...props} color="#fdcb6e" accent="#d63031" aura="#ffeaa7" />
);

export const StoneBossCyan: React.FC<IconProps> = (props) => (
    <BossBase {...props} color="#00cec9" accent="#0984e3" aura="#81ecec" />
);

export const StoneBossRainbow: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 100 100" className={props.className} style={props.style} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="rainbowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff7675" />
                <stop offset="20%" stopColor="#fdcb6e" />
                <stop offset="40%" stopColor="#55efc4" />
                <stop offset="60%" stopColor="#74b9ff" />
                <stop offset="80%" stopColor="#a29bfe" />
                <stop offset="100%" stopColor="#fd79a8" />
            </linearGradient>
        </defs>
        {/* Aura */}
        <circle cx="50" cy="50" r="48" fill="url(#rainbowGrad)" opacity="0.4" filter="blur(5px)" />

        {/* Crown Spikes */}
        <path d="M20 25L10 5L35 20 M80 25L90 5L65 20 M50 20L50 5" fill="#2d3436" stroke="#2d3436" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Body */}
        <path d="M50 10C25 10 10 30 10 55C10 80 30 90 50 90C70 90 90 80 90 55C90 30 75 10 50 10Z"
            fill="#2d3436" stroke="url(#rainbowGrad)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Face */}
        <path d="M30 45L45 52" stroke="white" strokeWidth="4" strokeLinecap="round" />
        <path d="M70 45L55 52" stroke="white" strokeWidth="4" strokeLinecap="round" />

        <circle cx="40" cy="60" r="3" fill="red" />
        <circle cx="60" cy="60" r="3" fill="red" />

        {/* Evil Grin */}
        <path d="M35 75Q50 85 65 75" stroke="white" strokeWidth="3" fill="none" />
        <path d="M35 75L37 70M65 75L63 70" stroke="white" strokeWidth="2" />
    </svg>
);
