import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

// ============ 병사 계급 (녹색 가로줄만) ============

// 이등병 - 가로줄 1개
export const RankPrivate2: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 60 40" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="17" width="44" height="6" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="1" rx="2"/>
  </svg>
);

// 일등병 - 가로줄 2개
export const RankPrivate1: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 60 40" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="11" width="44" height="6" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="1" rx="2"/>
    <rect x="8" y="23" width="44" height="6" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="1" rx="2"/>
  </svg>
);

// 상등병 - 가로줄 3개
export const RankCorporal: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 60 40" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="6" width="44" height="6" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="1" rx="2"/>
    <rect x="8" y="17" width="44" height="6" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="1" rx="2"/>
    <rect x="8" y="28" width="44" height="6" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="1" rx="2"/>
  </svg>
);

// 병장 - 가로줄 4개
export const RankSergeant: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 60 40" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="3" width="44" height="6" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="1" rx="2"/>
    <rect x="8" y="12" width="44" height="6" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="1" rx="2"/>
    <rect x="8" y="21" width="44" height="6" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="1" rx="2"/>
    <rect x="8" y="30" width="44" height="6" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="1" rx="2"/>
  </svg>
);

// ============ 부사관 계급 (녹색 V자 셰브론) ============

// 하사 - V자 1개
export const RankStaffSergeant: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 60 50" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <polygon points="30,10 10,35 18,35 30,20 42,35 50,35" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="2"/>
  </svg>
);

// 중사 - V자 2개
export const RankSergeantFirst: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 60 55" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <polygon points="30,5 10,30 18,30 30,15 42,30 50,30" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="2"/>
    <polygon points="30,20 10,45 18,45 30,30 42,45 50,45" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="2"/>
  </svg>
);

// 상사 - V자 3개
export const RankMasterSergeant: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 60 65" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <polygon points="30,2 10,25 18,25 30,12 42,25 50,25" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="2"/>
    <polygon points="30,17 10,40 18,40 30,27 42,40 50,40" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="2"/>
    <polygon points="30,32 10,55 18,55 30,42 42,55 50,55" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="2"/>
  </svg>
);

// ============ 위관 계급 (은색 다이아몬드) ============

// 소위 - 다이아몬드 1개
export const RankSecondLt: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 50 60" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e8e8e8"/>
        <stop offset="50%" stopColor="#c0c0c0"/>
        <stop offset="100%" stopColor="#a8a8a8"/>
      </linearGradient>
    </defs>
    <polygon points="25,5 40,30 25,55 10,30" fill="url(#silverGrad)" stroke="#666" strokeWidth="2"/>
  </svg>
);

// 중위 - 다이아몬드 2개
export const RankFirstLt: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 80 60" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="silverGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e8e8e8"/>
        <stop offset="50%" stopColor="#c0c0c0"/>
        <stop offset="100%" stopColor="#a8a8a8"/>
      </linearGradient>
    </defs>
    <polygon points="20,5 32,30 20,55 8,30" fill="url(#silverGrad2)" stroke="#666" strokeWidth="2"/>
    <polygon points="60,5 72,30 60,55 48,30" fill="url(#silverGrad2)" stroke="#666" strokeWidth="2"/>
  </svg>
);

// 대위 - 다이아몬드 3개 (삼각형 배열)
export const RankCaptain: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 80 70" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="silverGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e8e8e8"/>
        <stop offset="50%" stopColor="#c0c0c0"/>
        <stop offset="100%" stopColor="#a8a8a8"/>
      </linearGradient>
    </defs>
    {/* 상단 1개 */}
    <polygon points="40,2 50,20 40,38 30,20" fill="url(#silverGrad3)" stroke="#666" strokeWidth="1.5"/>
    {/* 하단 2개 */}
    <polygon points="22,32 32,50 22,68 12,50" fill="url(#silverGrad3)" stroke="#666" strokeWidth="1.5"/>
    <polygon points="58,32 68,50 58,68 48,50" fill="url(#silverGrad3)" stroke="#666" strokeWidth="1.5"/>
  </svg>
);

// ============ 영관 계급 (금색 무궁화) ============

// 무궁화 기본 형태
const Mugunghwa = ({ cx, cy, size = 12 }: { cx: number; cy: number; size?: number }) => (
  <g transform={`translate(${cx}, ${cy})`}>
    {/* 꽃잎 5개 */}
    {[0, 72, 144, 216, 288].map((angle, i) => (
      <ellipse
        key={i}
        cx="0"
        cy={-size * 0.8}
        rx={size * 0.4}
        ry={size * 0.7}
        fill="#d4af37"
        stroke="#8b7355"
        strokeWidth="1"
        transform={`rotate(${angle})`}
      />
    ))}
    {/* 중앙 */}
    <circle cx="0" cy="0" r={size * 0.3} fill="#c41e3a"/>
  </g>
);

// 소령 - 무궁화 1개
export const RankMajor: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 50 50" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <Mugunghwa cx={25} cy={25} size={15}/>
  </svg>
);

// 중령 - 무궁화 2개 (가로 배열)
export const RankLtColonel: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 80 50" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <Mugunghwa cx={20} cy={25} size={12}/>
    <Mugunghwa cx={60} cy={25} size={12}/>
  </svg>
);

// 대령 - 무궁화 2개 + 월계수 잎
export const RankColonel: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 90 60" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    {/* 월계수 잎 (왼쪽) */}
    <path d="M10,55 Q20,40 15,25 Q25,35 30,50 Z" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="1"/>
    {/* 월계수 잎 (오른쪽) */}
    <path d="M80,55 Q70,40 75,25 Q65,35 60,50 Z" fill="#4a7c4e" stroke="#2d4a30" strokeWidth="1"/>
    {/* 무궁화 2개 */}
    <Mugunghwa cx={30} cy={30} size={12}/>
    <Mugunghwa cx={60} cy={30} size={12}/>
  </svg>
);

// ============ 장성 계급 (은색/금색 별) ============

// 별 기본 형태
const Star = ({ cx, cy, size = 15, gold = false }: { cx: number; cy: number; size?: number; gold?: boolean }) => {
  const points = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 72 - 90) * Math.PI / 180;
    const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180;
    points.push(`${cx + size * Math.cos(outerAngle)},${cy + size * Math.sin(outerAngle)}`);
    points.push(`${cx + size * 0.4 * Math.cos(innerAngle)},${cy + size * 0.4 * Math.sin(innerAngle)}`);
  }
  return (
    <polygon
      points={points.join(' ')}
      fill={gold ? "#d4af37" : "#c0c0c0"}
      stroke={gold ? "#8b7355" : "#666"}
      strokeWidth="1.5"
    />
  );
};

// 준장 - 별 1개
export const RankBrigadier: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 50 50" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <Star cx={25} cy={25} size={18}/>
  </svg>
);

// 소장 - 별 2개
export const RankMajorGeneral: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 80 50" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <Star cx={20} cy={25} size={15}/>
    <Star cx={60} cy={25} size={15}/>
  </svg>
);

// 중장 - 별 3개 (삼각형 배열)
export const RankLtGeneral: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 80 60" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <Star cx={40} cy={15} size={14}/>
    <Star cx={20} cy={42} size={14}/>
    <Star cx={60} cy={42} size={14}/>
  </svg>
);

// 대장 - 별 4개 (다이아몬드 배열)
export const RankGeneral: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 80 70" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <Star cx={40} cy={12} size={13} gold/>
    <Star cx={20} cy={35} size={13} gold/>
    <Star cx={60} cy={35} size={13} gold/>
    <Star cx={40} cy={58} size={13} gold/>
  </svg>
);

// ============ 계급 아이콘 매핑 ============
export const MILITARY_RANK_ICONS: Record<number, React.FC<IconProps>> = {
  0: RankPrivate2,      // 이병
  1: RankPrivate1,      // 일병
  2: RankCorporal,      // 상병
  3: RankSergeant,      // 병장
  4: RankStaffSergeant, // 하사
  5: RankSergeantFirst, // 중사
  6: RankMasterSergeant,// 상사
  7: RankSecondLt,      // 소위
  8: RankFirstLt,       // 중위
  9: RankCaptain,       // 대위
  10: RankMajor,        // 소령
  11: RankLtColonel,    // 중령
  12: RankColonel,      // 대령
  13: RankBrigadier,    // 준장
  14: RankMajorGeneral, // 소장
  15: RankLtGeneral,    // 중장
  16: RankGeneral,      // 대장
};

// 계급 이름 매핑
export const MILITARY_RANK_NAMES: Record<number, string> = {
  0: '이병',
  1: '일병',
  2: '상병',
  3: '병장',
  4: '하사',
  5: '중사',
  6: '상사',
  7: '소위',
  8: '중위',
  9: '대위',
  10: '소령',
  11: '중령',
  12: '대령',
  13: '준장',
  14: '소장',
  15: '중장',
  16: '대장',
};
