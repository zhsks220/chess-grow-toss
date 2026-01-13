import { useState, useEffect, useRef, useCallback } from 'react';
import { create } from 'zustand';
import { setupAds, showInterstitial, showRewarded } from './services/adService';
import { initializePurchases, purchaseProductAsync as purchaseProduct, restorePurchases, PRODUCT_IDS } from './services/purchaseService';
import { closeView, submitGameCenterLeaderBoardScore, openGameCenterLeaderboard } from '@apps-in-toss/web-framework';

// ============ Long Press Hook ============
const useLongPress = (
  callback: () => void,
  options: { delay?: number; interval?: number; disabled?: boolean } = {}
) => {
  const { delay = 300, interval = 100, disabled = false } = options;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPressingRef = useRef(false);

  const start = useCallback(() => {
    if (disabled) return;
    isPressingRef.current = true;

    // 첫 클릭은 즉시 실행
    callback();

    // delay 후 연속 실행 시작
    timeoutRef.current = setTimeout(() => {
      if (isPressingRef.current) {
        intervalRef.current = setInterval(() => {
          if (isPressingRef.current) {
            callback();
          }
        }, interval);
      }
    }, delay);
  }, [callback, delay, interval, disabled]);

  const stop = useCallback(() => {
    isPressingRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
  };
};

// ============ Long Press Button Component ============
interface LongPressButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  delay?: number;
  interval?: number;
}

const LongPressButton = ({ onClick, disabled, className, children, delay = 300, interval = 100 }: LongPressButtonProps) => {
  const longPress = useLongPress(onClick, { delay, interval, disabled });
  return (
    <button className={className} disabled={disabled} {...longPress}>
      {children}
    </button>
  );
};

import './App.css';

// Assets (2D Characters)
// King is missing due to quota, reusing Queen for now (logic handles this)
// SVG Components
import { PawnIcon, KnightIcon, BishopIcon, RookIcon, QueenIcon, KingIcon, ImperialKingIcon } from './components/ChessIcons';
import { StoneBlackIcon, StoneWhiteIcon, StoneBossRed, StoneBossBlue, StoneBossGreen, StoneBossPurple, StoneBossGold, StoneBossCyan, StoneBossRainbow } from './components/StoneIcons';
import { MILITARY_RANK_ICONS } from './components/MilitaryRankIcons';
import { GuideModal } from './components/GuideModal';
import { soundManager } from './utils/SoundManager';

// Background Images
import bgMainWide from './assets/bg_main_wide.png';
import bgBossFire from './assets/bg_boss_fire.png';
import bgBossIce from './assets/bg_boss_ice.png';
import bgBossPoison from './assets/bg_boss_poison.png';
import bgBossDark from './assets/bg_boss_dark.png';
import bgBossLightning from './assets/bg_boss_lightning.png';
import bgBossCyber from './assets/bg_boss_cyber.png';
import bgBossUltimate from './assets/bg_boss_ultimate.png';

// ============ 타입 정의 ============
type ChessPieceRank = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king' | 'imperial';
type StoneColor = 'black' | 'white';
type StoneSize = 'small' | 'medium' | 'large';
type BossType = 'none' | 'boss1' | 'boss2' | 'boss3' | 'boss4' | 'boss5' | 'boss6' | 'boss7';

interface GoStone {
  color: StoneColor;
  size: StoneSize;
  maxHp: number;
  currentHp: number;
  isBoss: boolean;
  bossType?: BossType;
}

interface ChessPiece {
  rank: ChessPieceRank;
  level: number;
  displayName: string;
  emoji: string;
}

interface UpgradeStat {
  id: string;
  name: string;
  level: number;
  baseValue: number;
  increment: number;
  baseCost: number;
  costMultiplier: number;
}

interface AutoClicker {
  id: string;
  name: string;
  emoji: string;
  clicksPerSec: number;
  baseCost: number;
  count: number;
  unlockRequirement?: { rank: ChessPieceRank; level: number }; // 해금 조건
  purchaseTiers?: { cap: number; requirement: { rank: ChessPieceRank; level: number } }[]; // 구매 티어 (마지막 티어 해금 후 무제한)
}

interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  goldCost: number;
  rubyCost: number;
  wonPrice?: string;  // 원화 결제 아이템용
  count: number;
}

interface Mission {
  id: string;
  name: string;
  description: string;
  target: number;
  current: number;
  reward: { gold: number; ruby: number };
  completed: boolean;
  claimed: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: string;  // 조건 타입: 'rank' | 'boss'
  target: number | string;  // rank name 또는 boss count
  reward: { gold: number; ruby: number };
  unlocked: boolean;
  claimed: boolean;
}

// ============ 상수 정의 ============
// Mapping ranks to images
const CHESS_PIECES: Record<ChessPieceRank, Omit<ChessPiece, 'level'>> = {
  pawn: { rank: 'pawn', displayName: '폰', emoji: '♟️' },
  knight: { rank: 'knight', displayName: '나이트', emoji: '♞' },
  bishop: { rank: 'bishop', displayName: '비숍', emoji: '♝' },
  rook: { rank: 'rook', displayName: '룩', emoji: '♜' },
  queen: { rank: 'queen', displayName: '퀸', emoji: '♛' },
  king: { rank: 'king', displayName: '킹', emoji: '♚' }, // Placeholder: Queen
  imperial: { rank: 'imperial', displayName: '킹갓제네럴임페리얼 체스킹', emoji: '👑' },
};

const RANK_ORDER: ChessPieceRank[] = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king', 'imperial'];

// 체스 랭크별 공격력 배율 (임페리얼 20x로 엔딩)
const RANK_MULTIPLIERS: Record<ChessPieceRank, number> = {
  pawn: 1,
  knight: 2,
  bishop: 3,
  rook: 5,
  queen: 8,
  king: 12,
  imperial: 20,
};

// 리더보드 점수 계산 함수
const calculateLeaderboardScore = (
  goldPerClick: number,
  attackPower: number,
  stonesDestroyed: number,
  chessPiece: ChessPieceRank,
  prestigeCount: number
): number => {
  const multiplier = (RANK_MULTIPLIERS[chessPiece] || 1) + (prestigeCount * 20);
  return Math.floor((goldPerClick + attackPower + stonesDestroyed) * multiplier);
};

// 군대 계급 17단계 강화 시스템 (ENHANCE_RATES에서 name으로 사용)
// const MILITARY_RANKS = [
//   '이병', '일병', '상병', '병장',     // 병사 (0-3)
//   '하사', '중사', '상사',             // 부사관 (4-6)
//   '소위', '중위', '대위',             // 위관 (7-9)
//   '소령', '중령', '대령',             // 영관 (10-12)
//   '준장', '소장', '중장', '대장'      // 장성 (13-16)
// ];


// ============ 밸런스 설계 (F2P 30일 엔딩, 7만원=15일 엔딩) ============
// 복리 성장 감안: 업그레이드×계급×체스 곱연산 효과 포함
// F2P 30일 획득 예상: 약 6,500억 / 총 필요: 약 6,300억
// 1사이클(이병→대장): 약 452억, 7사이클: 약 3,164억 (성공시)
// 폰 기준 강화 테이블 (계급별 배수 적용됨)
// 파괴율: 일병부터 시작 (이병은 항상 0%)
const ENHANCE_RATES = [
  // 병사 (일병부터 파괴 시작)
  { level: 0, name: '이병', successRate: 100, cost: 1000, destroyRate: 0 },
  { level: 1, name: '일병', successRate: 99, cost: 2600, destroyRate: 1 },
  { level: 2, name: '상병', successRate: 98, cost: 6400, destroyRate: 2 },
  { level: 3, name: '병장', successRate: 97, cost: 16000, destroyRate: 2.5 },
  // 부사관
  { level: 4, name: '하사', successRate: 96, cost: 40000, destroyRate: 3 },
  { level: 5, name: '중사', successRate: 94, cost: 90000, destroyRate: 3.5 },
  { level: 6, name: '상사', successRate: 92, cost: 200000, destroyRate: 4 },
  // 위관
  { level: 7, name: '소위', successRate: 90, cost: 440000, destroyRate: 4.5 },
  { level: 8, name: '중위', successRate: 88, cost: 960000, destroyRate: 5 },
  { level: 9, name: '대위', successRate: 85, cost: 2100000, destroyRate: 6 },
  // 영관
  { level: 10, name: '소령', successRate: 82, cost: 5200000, destroyRate: 7 },
  { level: 11, name: '중령', successRate: 78, cost: 8800000, destroyRate: 8 },
  { level: 12, name: '대령', successRate: 74, cost: 15000000, destroyRate: 8.5 },
  // 장성
  { level: 13, name: '준장', successRate: 69, cost: 25500000, destroyRate: 9 },
  { level: 14, name: '소장', successRate: 64, cost: 43400000, destroyRate: 9.5 },
  { level: 15, name: '중장', successRate: 58, cost: 73800000, destroyRate: 10 },
  { level: 16, name: '대장', successRate: 50, cost: 125400000, destroyRate: 10.5 }, // 대장→승급
];

// 계급별 강화 비용/확률 배수
// 배율: Pawn 1x → Knight 18x → Bishop 23x → Rook 30x → Queen 38x → King 45x
// 파괴율: 일병(level 1)부터 적용
const RANK_ENHANCE_MULTIPLIERS: Record<ChessPieceRank, { costMultiplier: number; successRateBonus: number; destroyRateBonus: number; destroyStartLevel: number }> = {
  pawn: { costMultiplier: 1, successRateBonus: 0, destroyRateBonus: 0, destroyStartLevel: 1 },            // 총합: 3억
  knight: { costMultiplier: 18, successRateBonus: -12, destroyRateBonus: 2, destroyStartLevel: 1 },       // 총합: 54억 (18배)
  bishop: { costMultiplier: 414, successRateBonus: -25, destroyRateBonus: 4, destroyStartLevel: 1 },      // 총합: 1,246억 (23배)
  rook: { costMultiplier: 12420, successRateBonus: -32, destroyRateBonus: 7, destroyStartLevel: 1 },      // 총합: 3.7조 (30배)
  queen: { costMultiplier: 471960, successRateBonus: -38, destroyRateBonus: 12, destroyStartLevel: 1 },   // 총합: 142조 (38배)
  king: { costMultiplier: 21238200, successRateBonus: -45, destroyRateBonus: 20, destroyStartLevel: 1 },  // 총합: 6,392조 (45배)
  imperial: { costMultiplier: 1, successRateBonus: 0, destroyRateBonus: 0, destroyStartLevel: 99 },       // 임페리얼은 최종 계급 (강화 없음)
};

// 계급별 강화 비용 계산
const getEnhanceCost = (rank: ChessPieceRank, level: number): number => {
  const baseInfo = ENHANCE_RATES[level];
  if (!baseInfo) return 0;
  const multiplier = RANK_ENHANCE_MULTIPLIERS[rank];
  return Math.floor(baseInfo.cost * multiplier.costMultiplier);
};

// 계급별 강화 성공률 계산
const getEnhanceSuccessRate = (rank: ChessPieceRank, level: number): number => {
  const baseInfo = ENHANCE_RATES[level];
  if (!baseInfo) return 0;
  const multiplier = RANK_ENHANCE_MULTIPLIERS[rank];
  return Math.max(10, Math.min(100, baseInfo.successRate + multiplier.successRateBonus));
};

// 계급별 강화 파괴율 계산
const getEnhanceDestroyRate = (rank: ChessPieceRank, level: number): number => {
  const baseInfo = ENHANCE_RATES[level];
  if (!baseInfo) return 0;
  const multiplier = RANK_ENHANCE_MULTIPLIERS[rank];
  // 해당 계급의 파괴 시작 레벨 이전이면 파괴율 0%
  if (level < multiplier.destroyStartLevel) return 0;
  return Math.min(50, baseInfo.destroyRate + multiplier.destroyRateBonus);
};

// 업그레이드 비용 (F2P 30일 기준 - 복리효과 감안)
const INITIAL_UPGRADES: UpgradeStat[] = [
  { id: 'goldPerClick', name: '클릭당 골드', level: 1, baseValue: 1, increment: 1, baseCost: 50, costMultiplier: 1.10 },
  { id: 'attackPower', name: '공격력', level: 1, baseValue: 1, increment: 1, baseCost: 100, costMultiplier: 1.20 },
  { id: 'critChance', name: '치명타 확률', level: 0, baseValue: 0, increment: 0.2, baseCost: 200, costMultiplier: 1.24 },
  { id: 'critDamage', name: '치명타 데미지', level: 0, baseValue: 150, increment: 2, baseCost: 300, costMultiplier: 1.22 },
];

// 도구 시스템 (오토클릭) - 단계별 구매 제한 (마지막 티어 해금 후 무제한)
const INITIAL_AUTO_CLICKERS: AutoClicker[] = [
  {
    id: 'hammer', name: '나무 망치', emoji: '🪵', clicksPerSec: 0.5, baseCost: 300, count: 0,
    purchaseTiers: [
      { cap: 10, requirement: { rank: 'pawn', level: 0 } },
      { cap: 30, requirement: { rank: 'pawn', level: 7 } },
      { cap: 50, requirement: { rank: 'knight', level: 0 } },
    ]
  },
  {
    id: 'pickaxe', name: '곡괭이', emoji: '⛏️', clicksPerSec: 1, baseCost: 7500, count: 0,
    unlockRequirement: { rank: 'pawn', level: 4 },
    purchaseTiers: [
      { cap: 10, requirement: { rank: 'pawn', level: 4 } },
      { cap: 30, requirement: { rank: 'pawn', level: 10 } },
      { cap: 50, requirement: { rank: 'knight', level: 7 } },
    ]
  },
  {
    id: 'mace', name: '철퇴', emoji: '🔨', clicksPerSec: 3, baseCost: 160000, count: 0,
    unlockRequirement: { rank: 'knight', level: 0 },
    purchaseTiers: [
      { cap: 10, requirement: { rank: 'knight', level: 0 } },
      { cap: 30, requirement: { rank: 'knight', level: 10 } },
      { cap: 50, requirement: { rank: 'bishop', level: 7 } },
    ]
  },
  {
    id: 'drill', name: '드릴', emoji: '⚙️', clicksPerSec: 8, baseCost: 3600000, count: 0,
    unlockRequirement: { rank: 'bishop', level: 0 },
    purchaseTiers: [
      { cap: 10, requirement: { rank: 'bishop', level: 0 } },
      { cap: 30, requirement: { rank: 'bishop', level: 10 } },
      { cap: 50, requirement: { rank: 'rook', level: 7 } },
    ]
  },
  {
    id: 'dynamite', name: '다이너마이트', emoji: '🧨', clicksPerSec: 20, baseCost: 75000000, count: 0,
    unlockRequirement: { rank: 'rook', level: 0 },
    purchaseTiers: [
      { cap: 10, requirement: { rank: 'rook', level: 0 } },
      { cap: 30, requirement: { rank: 'rook', level: 10 } },
      { cap: 50, requirement: { rank: 'queen', level: 7 } },
    ]
  },
  {
    id: 'laser', name: '레이저 빔', emoji: '🔴', clicksPerSec: 50, baseCost: 1600000000, count: 0,
    unlockRequirement: { rank: 'queen', level: 0 },
    purchaseTiers: [
      { cap: 10, requirement: { rank: 'queen', level: 0 } },
      { cap: 30, requirement: { rank: 'queen', level: 10 } },
      { cap: 50, requirement: { rank: 'king', level: 7 } },
    ]
  },
  {
    id: 'blackhole', name: '블랙홀', emoji: '🌀', clicksPerSec: 120, baseCost: 50000000000, count: 0,
    unlockRequirement: { rank: 'king', level: 0 },
    purchaseTiers: [
      { cap: 9999, requirement: { rank: 'king', level: 0 } },
    ]
  },
];

// 상점 아이템 (간소화: 6개 핵심 아이템)
// 강화 보조 3개 + 골드 구매 1개 + 캐시템 2개 (원화 결제)
const INITIAL_SHOP_ITEMS: ShopItem[] = [
  // 강화 보조 아이템 (다이아)
  { id: 'protectScroll', name: '파괴방지권', emoji: '🛡️', description: '파괴 발생 시 방어 (1회)', goldCost: 0, rubyCost: 50, count: 0 },
  { id: 'blessScroll', name: '축복주문서', emoji: '✨', description: '성공 확률 +10%', goldCost: 0, rubyCost: 80, count: 0 },
  { id: 'luckyScroll', name: '행운주문서', emoji: '🍀', description: '성공 확률 +20%', goldCost: 0, rubyCost: 150, count: 0 },
  // 골드 구매 (파괴한 돌 수에 비례, 무제한)
  { id: 'bulkGold', name: '골드 구매', emoji: '💰', description: '파괴한 돌 수에 비례한 골드', goldCost: 0, rubyCost: 450, count: 0 },
  // 캐시템 (원화 결제, 영구 효과)
  { id: 'permBoost', name: '영구 부스터', emoji: '🚀', description: '2X 부스트 영구 적용', goldCost: 0, rubyCost: 0, wonPrice: '₩5,900', count: 0 },
  { id: 'adRemove', name: '광고 제거', emoji: '🚫', description: '모든 광고 제거', goldCost: 0, rubyCost: 0, wonPrice: '₩3,900', count: 0 },
];

// 골드 대량 구매 복리 공식 (완만한 버전)
// 100돌=178만, 500돌=1,780만, 1000돌=3.16억, 2000돌=1000억
const GOLD_BULK_BASE = 1000000;      // 기본 100만 골드
const GOLD_BULK_GROWTH = 0.0058;     // 0.58% 복리 성장률

const calculateBulkGold = (stonesDestroyed: number): number => {
  return Math.floor(GOLD_BULK_BASE * Math.pow(1 + GOLD_BULK_GROWTH, stonesDestroyed));
};

// 미션 시스템 (일일 반복 + 누적 미션)
// 일일 미션: 매일 리셋, 하루 15~20루비 획득 가능
// 누적 미션: 달성 후 다음 단계로 자동 갱신
const INITIAL_MISSIONS: Mission[] = [
  // === 일일 미션 (매일 리셋) ===
  { id: 'daily_click', name: '📅 일일 클릭', description: '오늘 300번 클릭', target: 300, current: 0, reward: { gold: 1000, ruby: 5 }, completed: false, claimed: false },
  { id: 'daily_enhance', name: '📅 일일 강화', description: '오늘 강화 5번 시도', target: 5, current: 0, reward: { gold: 1500, ruby: 5 }, completed: false, claimed: false },
  { id: 'daily_gold', name: '📅 일일 수입', description: '오늘 5만 골드 획득', target: 50000, current: 0, reward: { gold: 0, ruby: 5 }, completed: false, claimed: false },
  // === 누적 미션 (단계별 갱신) ===
  { id: 'total_click', name: '🎯 클릭 마스터', description: '총 1,000번 클릭', target: 1000, current: 0, reward: { gold: 2000, ruby: 10 }, completed: false, claimed: false },
  { id: 'total_stone', name: '🎯 파괴왕', description: '총 바둑돌 100개 파괴', target: 100, current: 0, reward: { gold: 5000, ruby: 10 }, completed: false, claimed: false },
  { id: 'total_enhance', name: '🎯 강화 장인', description: '총 강화 50번 시도', target: 50, current: 0, reward: { gold: 10000, ruby: 15 }, completed: false, claimed: false },
  { id: 'total_gold', name: '🎯 부자 되기', description: '총 100만 골드 획득', target: 1000000, current: 0, reward: { gold: 0, ruby: 20 }, completed: false, claimed: false },
];

// 누적 미션 단계 정의 (claimed 후 다음 단계로 갱신)
const CUMULATIVE_MISSION_TIERS: Record<string, { targets: number[]; rewards: { gold: number; ruby: number }[] }> = {
  total_click: {
    targets: [1000, 5000, 20000, 50000, 100000],
    rewards: [
      { gold: 2000, ruby: 10 },
      { gold: 5000, ruby: 15 },
      { gold: 10000, ruby: 20 },
      { gold: 20000, ruby: 25 },
      { gold: 50000, ruby: 30 },
    ],
  },
  total_stone: {
    targets: [100, 500, 2000, 5000, 10000],
    rewards: [
      { gold: 5000, ruby: 10 },
      { gold: 15000, ruby: 15 },
      { gold: 50000, ruby: 20 },
      { gold: 100000, ruby: 25 },
      { gold: 200000, ruby: 30 },
    ],
  },
  total_enhance: {
    targets: [50, 200, 500, 1000, 2000],
    rewards: [
      { gold: 10000, ruby: 15 },
      { gold: 30000, ruby: 20 },
      { gold: 100000, ruby: 25 },
      { gold: 300000, ruby: 30 },
      { gold: 1000000, ruby: 40 },
    ],
  },
  total_gold: {
    targets: [1000000, 10000000, 100000000, 1000000000, 10000000000],
    rewards: [
      { gold: 0, ruby: 20 },
      { gold: 0, ruby: 30 },
      { gold: 0, ruby: 40 },
      { gold: 0, ruby: 50 },
      { gold: 0, ruby: 60 },
    ],
  },
};

// 업적 시스템 (승급 + 보스 처치) - 다이아 보상만
const INITIAL_ACHIEVEMENTS: Achievement[] = [
  // 체스말 승급 업적 (다이아 50씩 증가)
  { id: 'rank_knight', name: '♞ 나이트 승급', description: '나이트로 승급하기', condition: 'rank', target: 'knight', reward: { gold: 0, ruby: 50 }, unlocked: false, claimed: false },
  { id: 'rank_bishop', name: '♝ 비숍 승급', description: '비숍으로 승급하기', condition: 'rank', target: 'bishop', reward: { gold: 0, ruby: 100 }, unlocked: false, claimed: false },
  { id: 'rank_rook', name: '♜ 룩 승급', description: '룩으로 승급하기', condition: 'rank', target: 'rook', reward: { gold: 0, ruby: 150 }, unlocked: false, claimed: false },
  { id: 'rank_queen', name: '♛ 퀸 승급', description: '퀸으로 승급하기', condition: 'rank', target: 'queen', reward: { gold: 0, ruby: 200 }, unlocked: false, claimed: false },
  { id: 'rank_king', name: '♚ 킹 승급', description: '킹으로 승급하기', condition: 'rank', target: 'king', reward: { gold: 0, ruby: 250 }, unlocked: false, claimed: false },
  { id: 'rank_imperial', name: '👑 임페리얼 승급', description: '킹갓제네럴 임페리얼 체스킹 달성', condition: 'rank', target: 'imperial', reward: { gold: 0, ruby: 300 }, unlocked: false, claimed: false },
  // 보스 처치 업적 (다이아 50씩 증가)
  { id: 'boss_1', name: '👹 보스 사냥꾼', description: '보스 1마리 처치', condition: 'boss', target: 1, reward: { gold: 0, ruby: 50 }, unlocked: false, claimed: false },
  { id: 'boss_10', name: '👹 보스 헌터', description: '보스 10마리 처치', condition: 'boss', target: 10, reward: { gold: 0, ruby: 100 }, unlocked: false, claimed: false },
  { id: 'boss_50', name: '👹 보스 슬레이어', description: '보스 50마리 처치', condition: 'boss', target: 50, reward: { gold: 0, ruby: 150 }, unlocked: false, claimed: false },
  { id: 'boss_100', name: '👹 보스 마스터', description: '보스 100마리 처치', condition: 'boss', target: 100, reward: { gold: 0, ruby: 200 }, unlocked: false, claimed: false },
];

const STORAGE_KEY = 'pony-game-v3';
const APP_VERSION = '1.2.3';  // 앱 버전 (android/app/build.gradle과 동기화 필요)
const VERSION_STORAGE_KEY = 'pony-game-first-version';  // 최초 설치 버전 추적용

// ============ 바둑돌 HP 밸런스 시스템 ============
// 기본 HP 낮추고, 파괴할수록 크게 증가 (복리 성장)
// 골드 보상은 HP에 비례, 보스 HP는 현재 일반 돌 HP × 배율
const STONE_BASE_HP = 150;              // 기본 HP
const STONE_HP_GROWTH_RATE = 0.004;     // 복리 성장률 0.4%
const STONE_HP_GROWTH_INTERVAL = 1;     // 1개마다 복리 적용

// 기물별 HP 감소율 (레벨당) - 강화할수록 바둑돌이 쉬워짐
const RANK_HP_REDUCTION_RATES: Record<ChessPieceRank, number> = {
  pawn: 0.002,     // 0.2% per level (17레벨 완료시 3.4%)
  knight: 0.003,   // 0.3% per level (17레벨 완료시 5.1%)
  bishop: 0.005,   // 0.5% per level (17레벨 완료시 8.5%)
  rook: 0.007,     // 0.7% per level (17레벨 완료시 11.9%)
  queen: 0.008,    // 0.8% per level (17레벨 완료시 13.6%)
  king: 0.010,     // 1.0% per level (17레벨 완료시 17.0%)
  imperial: 0,     // Imperial은 고정 10% HP
};

// 바둑돌 사이즈별 설정 (HP는 동일, 사이즈만 다름)
const STONE_CONFIG: Record<StoneSize, { hpMultiplier: number; pixelSize: number }> = {
  small: { hpMultiplier: 1, pixelSize: 80 },
  medium: { hpMultiplier: 1, pixelSize: 110 },
  large: { hpMultiplier: 1, pixelSize: 150 },
};

// 보스 설정 - 7개 보스
// 보스 HP = 현재 일반 돌 HP × hpMultiplier
// goldMultiplier = 보스 처치 시 일반 돌 골드의 배율
const BOSS_CONFIG: Record<BossType, {
  name: string;
  hpMultiplier: number;      // 일반 돌 HP의 몇 배인지
  goldMultiplier: number;    // 골드 보상 배율
  element: string;
}> = {
  none: { name: '', hpMultiplier: 1, goldMultiplier: 0, element: '' },
  boss1: { name: '화염의 돌', hpMultiplier: 15, goldMultiplier: 30, element: '🔴' },
  boss2: { name: '빙결의 돌', hpMultiplier: 25, goldMultiplier: 50, element: '🔵' },
  boss3: { name: '맹독의 돌', hpMultiplier: 40, goldMultiplier: 70, element: '🟢' },
  boss4: { name: '암흑의 돌', hpMultiplier: 60, goldMultiplier: 100, element: '🟣' },
  boss5: { name: '번개의 돌', hpMultiplier: 85, goldMultiplier: 130, element: '🟡' },
  boss6: { name: '사이버 돌', hpMultiplier: 120, goldMultiplier: 170, element: '💠' },
  boss7: { name: '궁극의 돌', hpMultiplier: 300, goldMultiplier: 230, element: '🌈' },
};

const BOSS_ORDER: BossType[] = ['boss1', 'boss2', 'boss3', 'boss4', 'boss5', 'boss6', 'boss7'];
const STONES_PER_BOSS = 100; // 100개 파괴마다 보스 등장

// 현재 일반 돌 HP를 기반으로 보스 HP 계산
const calculateBossHp = (bossType: BossType, currentStoneHp: number): number => {
  if (bossType === 'none') return 1;
  const bossConfig = BOSS_CONFIG[bossType];
  return Math.floor(currentStoneHp * bossConfig.hpMultiplier);
};

// ============ 새로운 보상 시스템 (파괴 수 기반 복리) ============
const STONE_REWARD_BASE = 100;           // 기본 보상
const STONE_REWARD_COMPOUND = 1.004;     // 복리율 0.4%

// 돌 파괴 보상 계산 (파괴 수 기반 복리 × 체스말 배율)
const calculateStoneReward = (stonesDestroyed: number, rank: ChessPieceRank): number => {
  const compoundGrowth = Math.pow(STONE_REWARD_COMPOUND, stonesDestroyed);
  const rankMultiplier = RANK_MULTIPLIERS[rank];
  return Math.floor(STONE_REWARD_BASE * compoundGrowth * rankMultiplier);
};

// 보스 골드 보상 계산 (파괴 수 기반 복리 × 체스말 배율 × 보스 배율)
const calculateBossGoldReward = (bossType: BossType, stonesDestroyed: number, rank: ChessPieceRank): number => {
  if (bossType === 'none') return 0;
  const bossConfig = BOSS_CONFIG[bossType];
  const baseReward = calculateStoneReward(stonesDestroyed, rank);
  return Math.floor(baseReward * bossConfig.goldMultiplier);
};

// 보스 데미지 페널티 계산 (권장 스펙에 못 미치면 데미지 감소)
// 보스가 강해질수록 더 높은 체스말/계급이 필요
const BOSS_RECOMMENDED_SPEC: Record<BossType, { rank: ChessPieceRank; level: number }> = {
  none: { rank: 'pawn', level: 0 },
  boss1: { rank: 'pawn', level: 10 },     // 폰 소령
  boss2: { rank: 'knight', level: 8 },    // 나이트 중위
  boss3: { rank: 'bishop', level: 10 },   // 비숍 소령
  boss4: { rank: 'rook', level: 12 },     // 룩 대령
  boss5: { rank: 'queen', level: 14 },    // 퀸 소장
  boss6: { rank: 'king', level: 15 },     // 킹 중장
  boss7: { rank: 'imperial', level: 16 }, // 임페리얼 대장
};

const calculateBossDamageMultiplier = (
  playerRank: ChessPieceRank,
  playerLevel: number,
  bossType: BossType
): number => {
  if (bossType === 'none') return 1;

  const recommended = BOSS_RECOMMENDED_SPEC[bossType];
  const playerRankIndex = RANK_ORDER.indexOf(playerRank);
  const recommendedRankIndex = RANK_ORDER.indexOf(recommended.rank);

  // 플레이어의 총 스펙 점수 계산 (계급 × 17 + 레벨)
  const playerScore = playerRankIndex * 17 + playerLevel;
  const recommendedScore = recommendedRankIndex * 17 + recommended.level;

  // 권장 스펙 이상이면 100% 데미지
  if (playerScore >= recommendedScore) return 1;

  // 권장 스펙 미달 시 데미지 감소 (최소 10%)
  const scoreDiff = recommendedScore - playerScore;
  const penalty = Math.max(0.1, 1 - scoreDiff * 0.15); // 차이 1당 15% 감소, 최소 10%

  return penalty;
};

// 바둑돌 HP 계산 함수
// stonesDestroyed: 파괴한 돌 수 (HP 증가 요소)
// totalUpgradeLevel: 총 업그레이드 레벨 (HP 감소 요소 - 강해지는 느낌)
// totalUpgradeLevel = rankIndex * 17 + level (예: 나이트 5레벨 = 1*17+5 = 22)
const calculateStoneHp = (size: StoneSize, stonesDestroyed: number, totalUpgradeLevel: number): number => {
  const config = STONE_CONFIG[size];

  // HP 증가: 파괴할수록 어려워짐 (복리 성장)
  // 공식: (1 + rate)^(파괴수 / interval)
  const growthExponent = Math.floor(stonesDestroyed / STONE_HP_GROWTH_INTERVAL);
  const growthMultiplier = Math.pow(1 + STONE_HP_GROWTH_RATE, growthExponent);

  // HP 감소: 기물별 차등 감소율 적용
  let totalReduction = 0;

  // 현재 기물과 레벨 역산
  const currentRankIndex = Math.floor(totalUpgradeLevel / 17);
  const currentLevel = totalUpgradeLevel % 17;

  // Imperial(인덱스 6)은 고정 10% HP
  if (currentRankIndex >= 6) {
    totalReduction = 0.90; // 10% HP = 90% 감소
  } else {
    // 이전 기물들의 누적 감소 계산
    for (let i = 0; i < currentRankIndex; i++) {
      const rank = RANK_ORDER[i];
      totalReduction += 17 * RANK_HP_REDUCTION_RATES[rank];
    }
    // 현재 기물의 감소 추가
    if (currentRankIndex < RANK_ORDER.length) {
      const currentRank = RANK_ORDER[currentRankIndex];
      totalReduction += currentLevel * RANK_HP_REDUCTION_RATES[currentRank];
    }
  }

  const reductionMultiplier = Math.max(0.1, 1 - totalReduction);

  // 최종 HP = 기본HP × 사이즈배율 × 성장배율 × 감소배율
  const hp = Math.floor(STONE_BASE_HP * config.hpMultiplier * growthMultiplier * reductionMultiplier);

  return Math.max(10, hp); // 최소 HP 10
};

const createRandomStone = (stonesDestroyed: number, totalUpgradeLevel: number): GoStone => {
  const colors: StoneColor[] = ['black', 'white'];
  // 작은돌 50%, 중간돌 35%, 큰돌 15%
  const rand = Math.random();
  let size: StoneSize = 'small';
  if (rand > 0.85) size = 'large';
  else if (rand > 0.5) size = 'medium';

  const color = colors[Math.floor(Math.random() * colors.length)];

  // 새로운 HP 시스템: 파괴 수에 따라 증가, 강화 레벨에 따라 감소
  const hp = calculateStoneHp(size, stonesDestroyed, totalUpgradeLevel);

  return {
    color,
    size,
    maxHp: hp,
    currentHp: hp,
    isBoss: false,
    bossType: 'none',
  };
};

// 보스 생성 함수 (일반 돌 HP × 보스 배율)
const createBossStone = (_playerDps: number, bossIndex: number, stonesDestroyed: number = 0, totalUpgradeLevel: number = 0): GoStone => {
  const bossType = BOSS_ORDER[bossIndex % BOSS_ORDER.length];

  // 먼저 현재 일반 돌의 HP를 계산
  const normalStoneHp = calculateStoneHp('medium', stonesDestroyed, totalUpgradeLevel);

  // 보스 HP = 일반 돌 HP × 보스 배율
  const hp = calculateBossHp(bossType, normalStoneHp);

  return {
    color: 'black', // 보스는 색상 무관
    size: 'large',  // 보스는 항상 큰 사이즈
    maxHp: hp,
    currentHp: hp,
    isBoss: true,
    bossType: bossType,
  };
};

const formatNumber = (n: number): string => {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + '조';
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '억';
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '만';
  return n.toLocaleString();
};

const getUpgradeCost = (upgrade: UpgradeStat): number => {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
};

const getAutoClickerCost = (clicker: AutoClicker): number => {
  // 도구 중복 구매 시 가격 증가 (30%씩 증가)
  return Math.floor(clicker.baseCost * Math.pow(1.30, clicker.count));
};

// 도구 구매 가능 상태 확인 (UI용)
const getAutoClickerStatus = (
  clickerId: string,
  currentCount: number,
  playerRank: ChessPieceRank,
  playerLevel: number
): { canBuy: boolean; isLocked: boolean; maxCount: number; nextRequirement: string | null } => {
  const originalClicker = INITIAL_AUTO_CLICKERS.find(c => c.id === clickerId);
  if (!originalClicker) return { canBuy: false, isLocked: true, maxCount: 0, nextRequirement: null };

  const playerRankIndex = RANK_ORDER.indexOf(playerRank);

  // 해금 조건 체크
  if (originalClicker.unlockRequirement) {
    const reqRankIndex = RANK_ORDER.indexOf(originalClicker.unlockRequirement.rank);
    if (playerRankIndex < reqRankIndex ||
        (playerRankIndex === reqRankIndex && playerLevel < originalClicker.unlockRequirement.level)) {
      const reqRankName = CHESS_PIECES[originalClicker.unlockRequirement.rank].displayName;
      const reqLevelName = ENHANCE_RATES[originalClicker.unlockRequirement.level]?.name || '';
      return {
        canBuy: false,
        isLocked: true,
        maxCount: 0,
        nextRequirement: `${reqRankName} ${reqLevelName} 필요`
      };
    }
  }

  // 구매 티어 제한 체크
  if (originalClicker.purchaseTiers) {
    let maxPurchasable = 0;
    let nextReq: string | null = null;
    const lastTier = originalClicker.purchaseTiers[originalClicker.purchaseTiers.length - 1];

    for (let i = 0; i < originalClicker.purchaseTiers.length; i++) {
      const tier = originalClicker.purchaseTiers[i];
      const tierRankIndex = RANK_ORDER.indexOf(tier.requirement.rank);

      if (playerRankIndex > tierRankIndex ||
          (playerRankIndex === tierRankIndex && playerLevel >= tier.requirement.level)) {
        maxPurchasable = tier.cap;
      } else {
        // 다음 티어 요구사항
        const nextRankName = CHESS_PIECES[tier.requirement.rank].displayName;
        const nextLevelName = ENHANCE_RATES[tier.requirement.level]?.name || '';
        nextReq = `${nextRankName} ${nextLevelName}`;
        break;
      }
    }

    // 마지막 티어 해금 완료 시 무제한
    const lastTierRankIndex = RANK_ORDER.indexOf(lastTier.requirement.rank);
    const lastTierUnlocked = playerRankIndex > lastTierRankIndex ||
        (playerRankIndex === lastTierRankIndex && playerLevel >= lastTier.requirement.level);

    if (lastTierUnlocked) {
      return { canBuy: true, isLocked: false, maxCount: Infinity, nextRequirement: null };
    }

    return {
      canBuy: currentCount < maxPurchasable,
      isLocked: false,
      maxCount: maxPurchasable,
      nextRequirement: currentCount >= maxPurchasable ? nextReq : null
    };
  }

  return { canBuy: true, isLocked: false, maxCount: Infinity, nextRequirement: null };
};

// ============ Zustand 스토어 ============
interface GameState {
  gold: number;
  ruby: number;
  totalGold: number;
  totalClicks: number;
  currentStone: GoStone;
  stonesDestroyed: number;
  bossesDefeated: number;           // 처치한 보스 수
  stonesUntilBoss: number;          // 보스까지 남은 바둑돌 수
  currentPiece: ChessPiece;
  upgrades: UpgradeStat[];
  autoClickers: AutoClicker[];
  autoClicksPerSec: number;
  enhanceAttempts: number;
  enhanceSuccesses: number;
  shopItems: ShopItem[];
  megaBoostEndTime: number;      // 메가 부스터 효과 종료 시간
  megaBoostCooldownEnd: number;  // 메가 부스터 쿨타임 종료 시간 (2시간)
  missions: Mission[];
  achievements: Achievement[];
  dailyMissionDate: string;
  prestigeCount: number;
  prestigeBonus: number;
  lastOnlineTime: number;
  upgradeCount: number;
  goldPerClick: number;
  attackPower: number;
  critChance: number;
  critDamage: number;
  // 일일 미션용 카운터 (매일 리셋됨)
  dailyClicks: number;
  dailyStonesDestroyed: number;
  dailyEnhanceAttempts: number;
  dailyGoldEarned: number;
  // 영구 캐시템 상태
  permanentBoost: boolean;   // 영구 2X 부스터
  // 오프라인 보상 모달 관련
  showOfflineRewardModal: boolean;
  offlineRewardData: {
    gold: number;
    stonesDestroyed: number;
    bossesDefeated: number;
    time: number;
  } | null;
  // 엔딩 & 무한모드 관련
  hasReachedEnding: boolean;    // 엔딩 도달 여부
  isInfiniteMode: boolean;      // 무한모드 여부
  showEndingModal: boolean;     // 엔딩 모달 표시
  // 광고 관련 상태
  adRemoved: boolean;                 // 광고 제거 구매 여부
  adDestructionPreventUsed: number;   // 오늘 사용한 파괴방지 광고 횟수 (최대 2회)
  adFreeRubyUsed: number;             // 오늘 사용한 무료루비 광고 횟수 (최대 3회)
  enhanceAdCounter: number;           // 강화 시도 카운터 (7마다 전면광고)
  lastAdResetDate: string;            // 마지막 광고 리셋 날짜
  showInterstitialAd: boolean;        // 전면 광고 표시 여부
  pendingInterstitialCallback: (() => void) | null;  // 광고 후 실행할 콜백
  // 파괴 복구 광고 모달
  showDestroyRecoveryModal: boolean;  // 파괴 복구 모달 표시 여부
  pendingDestroyData: { rank: ChessPieceRank; level: number } | null;  // 파괴 대기 중인 데이터

  handleClick: () => { gold: number; isCrit: boolean; destroyed: boolean; bonusGold: number };
  upgradestat: (statId: string) => boolean;
  buyAutoClicker: (clickerId: string) => boolean;
  tryEnhance: (useProtect: boolean, useBlessing: number) => { success: boolean; destroyed: boolean; message: string };
  buyShopItem: (itemId: string) => boolean;
  useMegaBoost: () => { success: boolean; message: string };  // 메가 부스터 (광고 후 사용)
  claimMissionReward: (missionId: string) => boolean;
  claimAchievement: (achievementId: string) => boolean;
  doPrestige: () => { success: boolean; rubyEarned: number };
  collectOfflineReward: () => { gold: number; stonesDestroyed: number; bossesDefeated: number; time: number };
  claimOfflineReward: (double: boolean) => void;  // 오프라인 보상 수령 (2배 여부)
  closeOfflineRewardModal: () => void;
  // 엔딩 & 무한모드 관련
  chooseInfiniteMode: () => void;
  choosePrestigeFromEnding: () => { success: boolean; rubyEarned: number };
  closeEndingModal: () => void;
  // 전면 광고 관련
  showInterstitial: (callback?: () => void) => void;
  closeInterstitial: () => void;
  // 파괴 복구 광고 관련
  confirmDestroy: () => void;  // 파괴 확정
  watchAdToRecoverDestroy: () => void;  // 광고 보고 파괴 방지
  // 무료 루비 광고
  claimFreeRuby: () => { success: boolean; ruby: number };  // 광고 보고 무료 루비 획득
  autoTick: () => void;
  saveGame: () => void;
  loadGame: () => void;
  resetGame: () => void;
  checkMissions: () => void;
  checkAchievements: () => void;
  resetDailyMissions: () => void;
}

// 공격력 계산: 체스랭크 배율 x 업그레이드
const calculateStats = (upgrades: UpgradeStat[], piece: ChessPiece, prestigeBonus: number) => {
  // 체스 랭크 배율 (폰 1x ~ 임페리얼 20x)
  const rankMultiplier = RANK_MULTIPLIERS[piece.rank];

  // 프레스티지 보너스
  const prestige = 1 + prestigeBonus;

  const goldUpgrade = upgrades.find(u => u.id === 'goldPerClick')!;
  const attackUpgrade = upgrades.find(u => u.id === 'attackPower')!;
  const critChanceUpgrade = upgrades.find(u => u.id === 'critChance')!;
  const critDamageUpgrade = upgrades.find(u => u.id === 'critDamage')!;

  // 기본 공격력 = 업그레이드 값 x 랭크 배율
  const baseAttack = attackUpgrade.baseValue + attackUpgrade.increment * (attackUpgrade.level - 1);
  // 골드는 복리 성장: 각 업그레이드마다 증가량이 1.03배씩 증가
  // 레벨1=1, 레벨2=2, 레벨3=3.03, 레벨10=11.5, 레벨100=628
  const baseGold = 1 + (Math.pow(1.03, goldUpgrade.level - 1) - 1) / 0.03;

  return {
    goldPerClick: Math.max(1, Math.floor(baseGold * rankMultiplier * prestige)),
    attackPower: Math.floor(baseAttack * rankMultiplier * prestige),
    critChance: Math.min(100, critChanceUpgrade.baseValue + critChanceUpgrade.increment * critChanceUpgrade.level),
    critDamage: critDamageUpgrade.baseValue + critDamageUpgrade.increment * critDamageUpgrade.level,
  };
};

// 한국시간(KST) 기준 오늘 날짜 (자정에 초기화)
const getTodayString = () => {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
};

const getBackgroundImage = (currentStone: GoStone) => {
  if (currentStone.isBoss) {
    switch (currentStone.bossType) {
      case 'boss1': return bgBossFire;
      case 'boss2': return bgBossIce;
      case 'boss3': return bgBossPoison;
      case 'boss4': return bgBossDark;
      case 'boss5': return bgBossLightning;
      case 'boss6': return bgBossCyber;
      case 'boss7': return bgBossUltimate;
      default: return bgMainWide;
    }
  }
  return bgMainWide;
};

const useGameStore = create<GameState>((set, get) => ({
  gold: 0,
  ruby: 0,
  totalGold: 0,
  totalClicks: 0,
  currentStone: createRandomStone(0, 0), // 초기: 파괴 0, 업그레이드 0
  stonesDestroyed: 0,
  bossesDefeated: 0,
  stonesUntilBoss: STONES_PER_BOSS,
  currentPiece: { ...CHESS_PIECES.pawn, level: 0 },
  upgrades: INITIAL_UPGRADES.map(u => ({ ...u })),
  autoClickers: INITIAL_AUTO_CLICKERS.map(c => ({ ...c })),
  autoClicksPerSec: 0,
  enhanceAttempts: 0,
  enhanceSuccesses: 0,
  shopItems: INITIAL_SHOP_ITEMS.map(i => ({ ...i })),
  megaBoostEndTime: 0,
  megaBoostCooldownEnd: 0,
  missions: INITIAL_MISSIONS.map(m => ({ ...m })),
  achievements: INITIAL_ACHIEVEMENTS.map(a => ({ ...a })),
  dailyMissionDate: getTodayString(),
  prestigeCount: 0,
  prestigeBonus: 0,
  lastOnlineTime: Date.now(),
  upgradeCount: 0,
  goldPerClick: 1,
  attackPower: 1,
  critChance: 0,
  critDamage: 150,
  // 일일 미션용 카운터
  dailyClicks: 0,
  dailyStonesDestroyed: 0,
  dailyEnhanceAttempts: 0,
  dailyGoldEarned: 0,
  // 영구 캐시템 상태
  permanentBoost: false,
  // 오프라인 보상 모달 관련
  showOfflineRewardModal: false,
  offlineRewardData: null,
  // 엔딩 & 무한모드 관련
  hasReachedEnding: false,
  isInfiniteMode: false,
  showEndingModal: false,
  // 광고 관련 상태
  adRemoved: false,
  adDestructionPreventUsed: 0,
  adFreeRubyUsed: 0,
  enhanceAdCounter: 0,
  lastAdResetDate: getTodayString(),
  showInterstitialAd: false,
  pendingInterstitialCallback: null,
  showDestroyRecoveryModal: false,
  pendingDestroyData: null,

  handleClick: () => {
    const state = get();
    const isCrit = Math.random() * 100 < state.critChance;
    let baseGold = state.goldPerClick;

    // 영구 부스터 또는 메가 부스터 효과 (골드 2배)
    const isBoosted = state.permanentBoost || Date.now() < state.megaBoostEndTime;
    if (isBoosted) {
      baseGold *= 2;
    }

    const earnedGold = isCrit ? Math.floor(baseGold * state.critDamage / 100) : baseGold;

    // 보스 데미지 페널티 적용
    let damage = state.attackPower;
    if (state.currentStone.isBoss && state.currentStone.bossType) {
      const damageMultiplier = calculateBossDamageMultiplier(
        state.currentPiece.rank,
        state.currentPiece.level,
        state.currentStone.bossType
      );
      damage = Math.floor(damage * damageMultiplier);
    }

    const newHp = Math.max(0, state.currentStone.currentHp - damage);
    const destroyed = newHp <= 0;

    let bonusGold = 0;
    if (destroyed) {
      // 새로운 보상 시스템: 파괴 수 기반 복리 × 체스말 배율
      if (state.currentStone.isBoss) {
        // 보스 보상 = 기본보상 × 복리^파괴수 × 체스말배율 × 보스배율
        bonusGold = calculateBossGoldReward(
          state.currentStone.bossType || 'none',
          state.stonesDestroyed,
          state.currentPiece.rank
        );
      } else {
        // 일반 돌 보상 = 기본보상 × 복리^파괴수 × 체스말배율
        bonusGold = calculateStoneReward(state.stonesDestroyed, state.currentPiece.rank);
      }
    }
    const totalGoldEarned = earnedGold + bonusGold;

    if (destroyed) {
      const wasKillingBoss = state.currentStone.isBoss;
      let newStonesUntilBoss = state.stonesUntilBoss;
      let newBossesDefeated = state.bossesDefeated;
      let nextStone: GoStone;

      // 체스말 강화 레벨만 계산 (계급 × 17 + 현재 레벨)
      const chessPieceLevel = RANK_ORDER.indexOf(state.currentPiece.rank) * 17 + state.currentPiece.level;

      if (wasKillingBoss) {
        // 보스 처치 완료
        newBossesDefeated = state.bossesDefeated + 1;
        newStonesUntilBoss = STONES_PER_BOSS;
        nextStone = createRandomStone(state.stonesDestroyed, chessPieceLevel);

        // 보스 처치 시 전면 광고 (광고 제거 구매자는 스킵)
        if (!state.adRemoved) {
          // set에서 광고 표시 상태 업데이트
          setTimeout(() => {
            get().showInterstitial();
          }, 500);  // 0.5초 후 광고 표시 (보스 처치 이펙트 후)
        }
      } else {
        // 일반 돌 파괴 - stonesDestroyed + 1 (방금 파괴한 돌 포함)
        newStonesUntilBoss = state.stonesUntilBoss - 1;

        if (newStonesUntilBoss <= 0) {
          // 보스 등장!
          nextStone = createBossStone(state.attackPower, state.bossesDefeated, state.stonesDestroyed + 1, chessPieceLevel);
          newStonesUntilBoss = 0; // 보스전 중에는 0 유지
        } else {
          nextStone = createRandomStone(state.stonesDestroyed + 1, chessPieceLevel);
        }
      }

      set(s => ({
        gold: s.gold + totalGoldEarned,
        totalGold: s.totalGold + totalGoldEarned,
        totalClicks: s.totalClicks + 1,
        dailyClicks: s.dailyClicks + 1,
        dailyGoldEarned: s.dailyGoldEarned + totalGoldEarned,
        dailyStonesDestroyed: s.dailyStonesDestroyed + (wasKillingBoss ? 0 : 1),
        currentStone: nextStone,
        stonesDestroyed: s.stonesDestroyed + (wasKillingBoss ? 0 : 1),
        stonesUntilBoss: newStonesUntilBoss,
        bossesDefeated: newBossesDefeated,
      }));
    } else {
      set(s => ({
        gold: s.gold + earnedGold,
        totalGold: s.totalGold + earnedGold,
        totalClicks: s.totalClicks + 1,
        dailyClicks: s.dailyClicks + 1,
        dailyGoldEarned: s.dailyGoldEarned + earnedGold,
        currentStone: { ...s.currentStone, currentHp: newHp },
      }));
    }

    get().checkMissions();
    get().checkAchievements();  // 보스 처치 업적 체크
    return { gold: earnedGold, isCrit, destroyed, bonusGold };
  },

  upgradestat: (statId: string) => {
    const state = get();
    const upgradeIndex = state.upgrades.findIndex(u => u.id === statId);
    if (upgradeIndex === -1) return false;

    const upgrade = state.upgrades[upgradeIndex];

    // 치명타 확률 100% 도달 시 강화 불가
    if (statId === 'critChance') {
      const currentCritChance = upgrade.baseValue + upgrade.increment * upgrade.level;
      if (currentCritChance >= 100) return false;
    }

    const cost = getUpgradeCost(upgrade);
    if (state.gold < cost) return false;

    const newUpgrades = [...state.upgrades];
    newUpgrades[upgradeIndex] = { ...upgrade, level: upgrade.level + 1 };
    const newStats = calculateStats(newUpgrades, state.currentPiece, state.prestigeBonus);

    set({ gold: state.gold - cost, upgrades: newUpgrades, upgradeCount: state.upgradeCount + 1, ...newStats });
    get().checkMissions();
    return true;
  },

  buyAutoClicker: (clickerId: string) => {
    const state = get();
    const clickerIndex = state.autoClickers.findIndex(c => c.id === clickerId);
    if (clickerIndex === -1) return false;

    const clicker = state.autoClickers[clickerIndex];
    const originalClicker = INITIAL_AUTO_CLICKERS.find(c => c.id === clickerId);

    // 도구 해금 조건 체크
    if (originalClicker?.unlockRequirement) {
      const reqRankIndex = RANK_ORDER.indexOf(originalClicker.unlockRequirement.rank);
      const playerRankIndex = RANK_ORDER.indexOf(state.currentPiece.rank);

      if (playerRankIndex < reqRankIndex ||
          (playerRankIndex === reqRankIndex && state.currentPiece.level < originalClicker.unlockRequirement.level)) {
        return false; // 해금 조건 미달
      }
    }

    // 구매 티어 제한 체크
    if (originalClicker?.purchaseTiers) {
      const playerRankIndex = RANK_ORDER.indexOf(state.currentPiece.rank);
      const lastTier = originalClicker.purchaseTiers[originalClicker.purchaseTiers.length - 1];
      const lastTierRankIndex = RANK_ORDER.indexOf(lastTier.requirement.rank);

      // 마지막 티어 해금 여부 확인
      const lastTierUnlocked = playerRankIndex > lastTierRankIndex ||
          (playerRankIndex === lastTierRankIndex && state.currentPiece.level >= lastTier.requirement.level);

      if (!lastTierUnlocked) {
        // 현재 구매 가능한 최대 수량 계산
        let maxPurchasable = 0;
        for (const tier of originalClicker.purchaseTiers) {
          const tierRankIndex = RANK_ORDER.indexOf(tier.requirement.rank);
          if (playerRankIndex > tierRankIndex ||
              (playerRankIndex === tierRankIndex && state.currentPiece.level >= tier.requirement.level)) {
            maxPurchasable = tier.cap;
          } else {
            break;
          }
        }

        if (clicker.count >= maxPurchasable) {
          return false; // 현재 티어 최대 수량 도달
        }
      }
      // lastTierUnlocked가 true면 무제한 구매 가능
    }

    const cost = getAutoClickerCost(clicker);
    if (state.gold < cost) return false;

    const newClickers = [...state.autoClickers];
    newClickers[clickerIndex] = { ...clicker, count: clicker.count + 1 };
    const newAutoClicksPerSec = newClickers.reduce((sum, c) => sum + c.clicksPerSec * c.count, 0);

    set({ gold: state.gold - cost, autoClickers: newClickers, autoClicksPerSec: newAutoClicksPerSec });
    get().saveGame();
    return true;
  },

  tryEnhance: (useProtect: boolean, useBlessing: number) => {
    const state = get();
    const currentLevel = state.currentPiece.level;
    const currentRank = state.currentPiece.rank;

    // 임페리얼은 강화 불가 (단일 계급)
    if (currentRank === 'imperial') {
      return { success: false, destroyed: false, message: '임페리얼은 최종 계급입니다!' };
    }

    // 계급별 비용/확률 계산
    const enhanceCost = getEnhanceCost(currentRank, currentLevel);
    const baseSuccessRate = getEnhanceSuccessRate(currentRank, currentLevel);
    const destroyRate = getEnhanceDestroyRate(currentRank, currentLevel);

    if (!enhanceCost || state.gold < enhanceCost) {
      return { success: false, destroyed: false, message: '비용 부족 또는 최대 레벨' };
    }

    const protectItem = state.shopItems.find(i => i.id === 'protectScroll');
    const blessItem = state.shopItems.find(i => i.id === 'blessScroll');
    const luckyItem = state.shopItems.find(i => i.id === 'luckyScroll');

    if (useProtect && (!protectItem || protectItem.count < 1)) return { success: false, destroyed: false, message: '파괴방지권 부족' };
    if (useBlessing === 1 && (!blessItem || blessItem.count < 1)) return { success: false, destroyed: false, message: '축복주문서 부족' };
    if (useBlessing === 2 && (!luckyItem || luckyItem.count < 1)) return { success: false, destroyed: false, message: '행운주문서 부족' };

    // 강화 광고 카운터 증가 (7회마다 전면광고)
    const newAdCounter = (state.enhanceAdCounter + 1) % 7;
    const shouldShowAd = state.enhanceAdCounter === 6 && !state.adRemoved;  // 7번째 시도에 광고

    // 축복/행운 주문서만 강화 시도 시 소모 (파괴방지권은 나중에 처리)
    const consumeBlessingItems = state.shopItems.map(item => {
      if (useBlessing === 1 && item.id === 'blessScroll') return { ...item, count: item.count - 1 };
      if (useBlessing === 2 && item.id === 'luckyScroll') return { ...item, count: item.count - 1 };
      return item;
    });

    set(s => ({
      gold: s.gold - enhanceCost,
      enhanceAttempts: s.enhanceAttempts + 1,
      dailyEnhanceAttempts: s.dailyEnhanceAttempts + 1,
      shopItems: consumeBlessingItems,
      enhanceAdCounter: newAdCounter,
      // 7회마다 전면광고 표시
      showInterstitialAd: shouldShowAd ? true : s.showInterstitialAd,
    }));

    let successRate = baseSuccessRate;
    if (useBlessing === 1) successRate += 10;
    if (useBlessing === 2) successRate += 20;
    successRate = Math.min(100, successRate); // 최대 100%

    const roll = Math.random() * 100;
    if (roll < successRate) {
      const newLevel = currentLevel + 1;
      // 17단계 시스템: 16(대장)에서 다음 체스말로 승급
      if (newLevel > 16) {
        // Rank Up Logic - 체스말 승급
        const currentRankIndex = RANK_ORDER.indexOf(state.currentPiece.rank);
        if (currentRankIndex >= RANK_ORDER.length - 1) {
          // 이미 최고 체스말(imperial)이면 레벨 유지
          return { success: false, destroyed: false, message: '이미 최고 등급입니다!' };
        }
        const nextRank = RANK_ORDER[currentRankIndex + 1];
        const newPiece = { ...CHESS_PIECES[nextRank], level: 0 };
        const newStats = calculateStats(state.upgrades, newPiece, state.prestigeBonus);
        set(s => ({ currentPiece: newPiece, enhanceSuccesses: s.enhanceSuccesses + 1, ...newStats }));
        get().checkAchievements();  // 체스말 승급 업적 체크

        // 임페리얼 킹 달성 시 엔딩 표시 (이미 엔딩을 본 적이 없고, 무한모드가 아닐 때만)
        if (nextRank === 'imperial' && !state.hasReachedEnding && !state.isInfiniteMode) {
          set({ hasReachedEnding: true, showEndingModal: true });
        }
        // 승급 성공 시 즉시 저장
        get().saveGame();

        return { success: true, destroyed: false, message: `🎉 승급 성공! ${newPiece.displayName} (이병)` };
      }
      const newPiece = { ...state.currentPiece, level: newLevel };
      const newStats = calculateStats(state.upgrades, newPiece, state.prestigeBonus);
      set(s => ({ currentPiece: newPiece, enhanceSuccesses: s.enhanceSuccesses + 1, ...newStats }));
      get().checkMissions();
      // 강화 성공 시 즉시 저장
      get().saveGame();
      // 계급명 표시
      const rankNames = ['이병', '일병', '상병', '병장', '하사', '중사', '상사', '소위', '중위', '대위', '소령', '중령', '대령', '준장', '소장', '중장', '대장'];
      return { success: true, destroyed: false, message: `강화 성공! ${rankNames[newLevel]}` };
    }

    // 강화 실패 시 파괴 판정
    const destroyRoll = Math.random() * 100;
    if (destroyRoll < destroyRate) {
      if (useProtect) {
        // 파괴방지권은 파괴가 발생했을 때만 소모
        const consumeProtect = get().shopItems.map(item => {
          if (item.id === 'protectScroll') return { ...item, count: item.count - 1 };
          return item;
        });
        set({ shopItems: consumeProtect });
        return { success: false, destroyed: false, message: '🛡️ 파괴 방어 성공! (강화 실패)' };
      }

      // 광고 복구 가능 여부 확인 (하루 2회 제한)
      const canUseAdRecovery = state.adDestructionPreventUsed < 2;

      if (canUseAdRecovery) {
        // 광고 복구 모달 표시 (파괴 보류)
        set({
          showDestroyRecoveryModal: true,
          pendingDestroyData: { rank: state.currentPiece.rank, level: state.currentPiece.level }
        });
        return { success: false, destroyed: false, message: '💥 파괴 위험! 광고로 복구 가능' };
      }

      // 광고 복구 불가 - 즉시 파괴
      const resetPiece = { ...state.currentPiece, level: 0 };
      const newStats = calculateStats(state.upgrades, resetPiece, state.prestigeBonus);
      set({ currentPiece: resetPiece, ...newStats });
      return { success: false, destroyed: true, message: '💥 장비 파괴됨 (+0 초기화)' };
    }

    return { success: false, destroyed: false, message: '강화 실패' };
  },

  buyShopItem: (itemId: string) => {
    const state = get();
    const itemIndex = state.shopItems.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return false;
    const item = state.shopItems[itemIndex];
    if ((item.goldCost > 0 && state.gold < item.goldCost) || (item.rubyCost > 0 && state.ruby < item.rubyCost)) return false;

    // 영구 아이템 중복 구매 방지
    if (itemId === 'permBoost' && state.permanentBoost) return false;
    if (itemId === 'adRemove' && state.adRemoved) return false;

    const newItems = [...state.shopItems];
    newItems[itemIndex] = { ...item, count: item.count + 1 };

    // 특수 아이템 처리
    if (itemId === 'permBoost') {
      // 영구 부스터: 영구적으로 2X 부스트
      set({ ruby: state.ruby - item.rubyCost, shopItems: newItems, permanentBoost: true });
      get().saveGame();
      return true;
    }
    if (itemId === 'adRemove') {
      // 광고 제거
      set({ ruby: state.ruby - item.rubyCost, shopItems: newItems, adRemoved: true });
      get().saveGame();
      return true;
    }
    if (itemId === 'bulkGold') {
      // 골드 대량 구매: 파괴한 돌 수에 비례한 골드 획득
      const bulkGoldAmount = calculateBulkGold(state.stonesDestroyed);
      set({
        ruby: state.ruby - item.rubyCost,
        gold: state.gold + bulkGoldAmount,
        totalGold: state.totalGold + bulkGoldAmount,
        shopItems: newItems,
      });
      get().saveGame();
      return true;
    }

    set({ gold: state.gold - item.goldCost, ruby: state.ruby - item.rubyCost, shopItems: newItems });
    get().saveGame();
    return true;
  },

  useMegaBoost: () => {
    const state = get();
    const now = Date.now();

    // 이미 효과 중인지 체크
    if (now < state.megaBoostEndTime) {
      const remaining = Math.ceil((state.megaBoostEndTime - now) / 60000);
      return { success: false, message: `효과 진행 중 (${remaining}분 남음)` };
    }

    // 쿨타임 체크 (2시간 = 7200000ms)
    if (now < state.megaBoostCooldownEnd) {
      const remainingMin = Math.ceil((state.megaBoostCooldownEnd - now) / 60000);
      const hours = Math.floor(remainingMin / 60);
      const mins = remainingMin % 60;
      return { success: false, message: `쿨타임 ${hours}시간 ${mins}분 남음` };
    }

    // 메가 부스터 활성화: 15분 효과 + 1시간 쿨타임
    set({
      megaBoostEndTime: now + 900000,       // 15분 효과
      megaBoostCooldownEnd: now + 3600000,  // 1시간 쿨타임
    });

    return { success: true, message: '메가 부스터 발동! 15분간 모든 효과 2배!' };
  },

  claimMissionReward: (missionId: string) => {
    const state = get();
    const idx = state.missions.findIndex(m => m.id === missionId);
    if (idx === -1 || !state.missions[idx].completed || state.missions[idx].claimed) return false;

    const mission = state.missions[idx];
    const newMissions = [...state.missions];

    // 누적 미션인 경우 다음 단계로 갱신
    if (missionId.startsWith('total_') && CUMULATIVE_MISSION_TIERS[missionId]) {
      const tiers = CUMULATIVE_MISSION_TIERS[missionId];
      const currentTargetIdx = tiers.targets.indexOf(mission.target);

      if (currentTargetIdx < tiers.targets.length - 1) {
        // 다음 단계가 있으면 갱신
        const nextIdx = currentTargetIdx + 1;
        const nextTarget = tiers.targets[nextIdx];
        const nextReward = tiers.rewards[nextIdx];
        newMissions[idx] = {
          ...mission,
          target: nextTarget,
          reward: nextReward,
          description: `총 ${formatNumber(nextTarget)} 달성`,
          completed: false,
          claimed: false,
          // current는 그대로 유지 (누적값)
        };
      } else {
        // 마지막 단계면 claimed만 true
        newMissions[idx] = { ...mission, claimed: true };
      }
    } else {
      // 일일 미션 또는 일반 미션은 claimed만 true
      newMissions[idx] = { ...mission, claimed: true };
    }

    set({
      gold: state.gold + mission.reward.gold,
      ruby: state.ruby + mission.reward.ruby,
      missions: newMissions
    });
    // 즉시 저장하여 보상 중복 수령 방지
    get().saveGame();
    return true;
  },

  claimAchievement: (achId: string) => {
    const state = get();
    const idx = state.achievements.findIndex(a => a.id === achId);
    if (idx === -1 || !state.achievements[idx].unlocked || state.achievements[idx].claimed) return false;

    const achievement = state.achievements[idx];
    const newAchievements = [...state.achievements];
    newAchievements[idx] = { ...achievement, claimed: true };

    set({
      gold: state.gold + achievement.reward.gold,
      ruby: state.ruby + achievement.reward.ruby,
      achievements: newAchievements
    });
    // 즉시 저장하여 보상 중복 수령 방지
    get().saveGame();
    return true;
  },

  doPrestige: () => {
    const state = get();
    const rankIndex = RANK_ORDER.indexOf(state.currentPiece.rank);
    if (rankIndex < 1) return { success: false, rubyEarned: 0 };

    const rubyEarned = (rankIndex + 1) * (state.currentPiece.level + 1) * 10;
    const newPrestigeBonus = state.prestigeBonus + 0.1;
    const initialStats = calculateStats(INITIAL_UPGRADES, { ...CHESS_PIECES.pawn, level: 0 }, newPrestigeBonus);

    set({
      gold: 0, totalGold: 0, totalClicks: 0, currentPiece: { ...CHESS_PIECES.pawn, level: 0 },
      upgrades: INITIAL_UPGRADES.map(u => ({ ...u })), autoClickers: INITIAL_AUTO_CLICKERS.map(c => ({ ...c })),
      autoClicksPerSec: 0, enhanceAttempts: 0, enhanceSuccesses: 0, upgradeCount: 0,
      stonesDestroyed: 0, // 프레스티지 시 파괴 수 리셋
      stonesUntilBoss: STONES_PER_BOSS, // 보스 카운터 리셋
      bossesDefeated: 0, // 처치한 보스 수 리셋
      ruby: state.ruby + rubyEarned, prestigeCount: state.prestigeCount + 1, prestigeBonus: newPrestigeBonus,
      currentStone: createRandomStone(0, 0), // 프레스티지 후 초기화
      ...initialStats
    });
    // 즉시 저장하여 환생 보상 손실 방지
    get().saveGame();
    return { success: true, rubyEarned };
  },

  collectOfflineReward: () => {
    const state = get();
    const now = Date.now();
    const offlineTime = Math.min(now - state.lastOnlineTime, 28800000); // 최대 8시간

    // 1분 미만이면 무시
    if (offlineTime < 60000) {
      set({ lastOnlineTime: now });
      return { gold: 0, stonesDestroyed: 0, bossesDefeated: 0, time: 0 };
    }

    // 자동 클릭이 없으면 보상 없음
    if (state.autoClicksPerSec === 0) {
      set({ lastOnlineTime: now });
      return { gold: 0, stonesDestroyed: 0, bossesDefeated: 0, time: 0 };
    }

    // 오프라인 보상은 부스터 효과 미적용 (게임 접속 유도)
    // 부스터는 실시간 플레이 시에만 적용
    const goldMultiplier = 1;

    const totalOfflineSeconds = Math.floor(offlineTime / 1000);
    const autoClicksPerSec = state.autoClicksPerSec;
    const damagePerSecond = state.attackPower * autoClicksPerSec;

    // 체스말 레벨 계산 (계급 × 17 + 현재 레벨)
    const chessPieceLevel = RANK_ORDER.indexOf(state.currentPiece.rank) * 17 + state.currentPiece.level;

    // 시뮬레이션 변수
    let currentStoneHp = state.currentStone.currentHp;
    let currentStoneIsBoss = state.currentStone.isBoss;
    let currentStoneBossType = state.currentStone.bossType || 'none';
    let stonesDestroyed = state.stonesDestroyed;
    let bossesDefeated = state.bossesDefeated;
    let stonesUntilBoss = state.stonesUntilBoss;
    let offlineStonesDestroyed = 0;
    let offlineBossesDefeated = 0;

    // 클릭당 골드 계산 (온라인 autoTick과 동일하게)
    const totalAutoClicks = autoClicksPerSec * totalOfflineSeconds;
    // 평균 치명타 배율: 1 + (치명타확률 × (치명타데미지/100 - 1))
    const avgCritMultiplier = 1 + (state.critChance / 100) * (state.critDamage / 100 - 1);
    let totalGoldEarned = Math.floor(state.goldPerClick * avgCritMultiplier * totalAutoClicks * goldMultiplier);

    // 총 데미지 계산
    let remainingDamage = damagePerSecond * totalOfflineSeconds;

    // 돌 파괴 시뮬레이션 (최대 10000개로 제한 - 무한 루프 방지)
    let loopCount = 0;
    const maxLoops = 10000;

    while (remainingDamage > 0 && loopCount < maxLoops) {
      loopCount++;

      // 보스 데미지 페널티 적용
      let effectiveDamage = remainingDamage;
      if (currentStoneIsBoss && currentStoneBossType !== 'none') {
        const damageMultiplier = calculateBossDamageMultiplier(
          state.currentPiece.rank,
          state.currentPiece.level,
          currentStoneBossType as BossType
        );
        effectiveDamage = Math.floor(remainingDamage * damageMultiplier);
      }

      if (effectiveDamage >= currentStoneHp) {
        // 돌 파괴!
        const damageUsed = currentStoneIsBoss
          ? Math.ceil(currentStoneHp / calculateBossDamageMultiplier(state.currentPiece.rank, state.currentPiece.level, currentStoneBossType as BossType))
          : currentStoneHp;
        remainingDamage -= Math.max(damageUsed, 1);

        if (currentStoneIsBoss) {
          // 보스 처치
          const bossReward = calculateBossGoldReward(currentStoneBossType as BossType, stonesDestroyed, state.currentPiece.rank);
          totalGoldEarned += bossReward * goldMultiplier;
          bossesDefeated++;
          offlineBossesDefeated++;
          stonesUntilBoss = STONES_PER_BOSS;

          // 새 일반 돌 생성
          const newStone = createRandomStone(stonesDestroyed, chessPieceLevel);
          currentStoneHp = newStone.maxHp;
          currentStoneIsBoss = false;
          currentStoneBossType = 'none';
        } else {
          // 일반 돌 파괴 (온라인과 동일하게 goldMultiplier 미적용)
          const stoneReward = calculateStoneReward(stonesDestroyed, state.currentPiece.rank);
          totalGoldEarned += stoneReward;
          stonesDestroyed++;
          offlineStonesDestroyed++;
          stonesUntilBoss--;

          if (stonesUntilBoss <= 0) {
            // 보스 등장
            const bossStone = createBossStone(state.attackPower, bossesDefeated, stonesDestroyed, chessPieceLevel);
            currentStoneHp = bossStone.maxHp;
            currentStoneIsBoss = true;
            currentStoneBossType = bossStone.bossType || 'none';
            stonesUntilBoss = 0;
          } else {
            // 새 일반 돌 생성
            const newStone = createRandomStone(stonesDestroyed, chessPieceLevel);
            currentStoneHp = newStone.maxHp;
          }
        }
      } else {
        // 데미지 부족 - HP만 감소시키고 종료
        currentStoneHp -= effectiveDamage;
        remainingDamage = 0;
      }
    }

    // 최종 돌 상태 생성
    let finalStone: GoStone;
    if (currentStoneIsBoss) {
      finalStone = createBossStone(state.attackPower, bossesDefeated, stonesDestroyed, chessPieceLevel);
      finalStone = { ...finalStone, currentHp: Math.max(1, currentStoneHp) };
    } else {
      finalStone = createRandomStone(stonesDestroyed, chessPieceLevel);
      finalStone = { ...finalStone, currentHp: Math.max(1, currentStoneHp) };
    }

    // 오프라인 시간이 1분 이상이고 자동클릭이 있으면 항상 모달 표시
    // (돌 파괴가 없어도 데미지는 적용되고 진행 상황 표시)
    set({
      lastOnlineTime: now,
      showOfflineRewardModal: true,
      offlineRewardData: {
        gold: totalGoldEarned,
        stonesDestroyed: offlineStonesDestroyed,
        bossesDefeated: offlineBossesDefeated,
        time: offlineTime
      },
      // 돌 파괴 상태 및 현재 돌 데미지 적용
      stonesDestroyed: stonesDestroyed,
      bossesDefeated: bossesDefeated,
      stonesUntilBoss: stonesUntilBoss,
      currentStone: finalStone,
    });

    return {
      gold: totalGoldEarned,
      stonesDestroyed: offlineStonesDestroyed,
      bossesDefeated: offlineBossesDefeated,
      time: offlineTime
    };
  },

  // 오프라인 보상 수령 (2배 여부 선택)
  claimOfflineReward: (double: boolean) => {
    const state = get();
    if (!state.offlineRewardData) return;

    const multiplier = double ? 2 : 1;
    const goldToAdd = state.offlineRewardData.gold * multiplier;

    set({
      gold: state.gold + goldToAdd,
      totalGold: state.totalGold + goldToAdd,
      showOfflineRewardModal: false,
      offlineRewardData: null,
    });
    // 즉시 저장하여 오프라인 보상 중복 수령 방지
    get().saveGame();
  },

  // 오프라인 보상 모달 닫기 (1배로 수령)
  closeOfflineRewardModal: () => {
    get().claimOfflineReward(false);
  },

  // 무한모드 선택
  chooseInfiniteMode: () => {
    set({ isInfiniteMode: true, showEndingModal: false });
  },

  // 엔딩에서 환생 선택
  choosePrestigeFromEnding: () => {
    set({ showEndingModal: false });
    return get().doPrestige();
  },

  // 엔딩 모달 닫기 (무한모드로)
  closeEndingModal: () => {
    set({ isInfiniteMode: true, showEndingModal: false });
  },

  // 전면 광고 표시 (광고 제거 구매 시 스킵)
  showInterstitial: (callback?: () => void) => {
    const state = get();
    // 광고 제거 구매자는 스킵
    if (state.adRemoved) {
      if (callback) callback();
      return;
    }
    // 광고 표시
    set({
      showInterstitialAd: true,
      pendingInterstitialCallback: callback || null,
    });
  },

  // 전면 광고 닫기
  closeInterstitial: () => {
    const state = get();
    const callback = state.pendingInterstitialCallback;
    set({
      showInterstitialAd: false,
      pendingInterstitialCallback: null,
    });
    // 콜백 실행
    if (callback) callback();
  },

  // 파괴 확정 (광고 안 보고 파괴)
  confirmDestroy: () => {
    const state = get();
    if (!state.pendingDestroyData) return;

    // 파괴 실행
    const resetPiece = { ...state.currentPiece, level: 0 };
    const newStats = calculateStats(state.upgrades, resetPiece, state.prestigeBonus);
    set({
      currentPiece: resetPiece,
      ...newStats,
      showDestroyRecoveryModal: false,
      pendingDestroyData: null,
    });
  },

  // 광고 보고 파괴 방지
  watchAdToRecoverDestroy: () => {
    const state = get();
    if (!state.pendingDestroyData) return;
    if (state.adDestructionPreventUsed >= 2) return;  // 이미 2회 사용

    // TODO: 실제 광고 SDK 연동 시 여기서 광고 재생
    // 지금은 바로 복구 처리

    // 광고 사용 횟수 증가, 모달 닫기 (파괴 취소)
    set({
      adDestructionPreventUsed: state.adDestructionPreventUsed + 1,
      showDestroyRecoveryModal: false,
      pendingDestroyData: null,
    });
  },

  // 무료 루비 획득 (광고 시청)
  claimFreeRuby: () => {
    const state = get();

    // 하루 3회 제한
    if (state.adFreeRubyUsed >= 3) {
      return { success: false, ruby: 0 };
    }

    // TODO: 실제 광고 SDK 연동 시 여기서 광고 재생
    // 지금은 바로 루비 지급

    const rubyAmount = 25;
    set({
      ruby: state.ruby + rubyAmount,
      adFreeRubyUsed: state.adFreeRubyUsed + 1,
    });
    // 즉시 저장하여 무료 다이아 중복 수령 방지
    get().saveGame();

    return { success: true, ruby: rubyAmount };
  },

  autoTick: () => {
    const state = get();
    if (state.autoClicksPerSec === 0) return;

    // 영구 부스터 또는 메가 부스터 효과 (골드 2배 + 자동클릭 2배)
    const isBoosted = state.permanentBoost || Date.now() < state.megaBoostEndTime;
    const goldMultiplier = isBoosted ? 2 : 1;
    const autoMultiplier = isBoosted ? 2 : 1;

    const autoClicks = state.autoClicksPerSec * autoMultiplier;

    // 도구 치명타 계산 (클릭당 치명타 판정)
    let totalDamage = 0;
    let totalGoldEarned = 0;
    for (let i = 0; i < autoClicks; i++) {
      const isCrit = Math.random() * 100 < state.critChance;
      let damage = state.attackPower;
      let gold = state.goldPerClick;

      if (isCrit) {
        damage = Math.floor(damage * state.critDamage / 100);
        gold = Math.floor(gold * state.critDamage / 100);
      }

      totalDamage += damage;
      totalGoldEarned += gold;
    }

    // 보스 데미지 페널티 적용 (자동 클릭)
    if (state.currentStone.isBoss && state.currentStone.bossType) {
      const damageMultiplier = calculateBossDamageMultiplier(
        state.currentPiece.rank,
        state.currentPiece.level,
        state.currentStone.bossType
      );
      totalDamage = Math.floor(totalDamage * damageMultiplier);
    }

    totalGoldEarned = Math.floor(totalGoldEarned * goldMultiplier);

    let newHp = state.currentStone.currentHp - totalDamage;
    let currentStone = state.currentStone;
    let destroyed = 0;
    let bonusGold = 0;
    let newStonesUntilBoss = state.stonesUntilBoss;
    let newBossesDefeated = state.bossesDefeated;

    // 체스말 강화 레벨만 계산 (계급 × 17 + 현재 레벨)
    const chessPieceLevel = RANK_ORDER.indexOf(state.currentPiece.rank) * 17 + state.currentPiece.level;

    // 바둑돌/보스 파괴 처리
    while (newHp <= 0) {
      const wasKillingBoss = currentStone.isBoss;

      // 새로운 보상 시스템: 파괴 수 기반 복리 × 체스말 배율 (메가부스터 goldMultiplier 적용)
      if (wasKillingBoss) {
        // 보스 보상 = 기본보상 × 복리^파괴수 × 체스말배율 × 보스배율 × 메가부스터
        const bossReward = calculateBossGoldReward(
          currentStone.bossType || 'none',
          state.stonesDestroyed + destroyed,
          state.currentPiece.rank
        );
        bonusGold += bossReward * goldMultiplier;
      } else {
        // 일반 돌 보상 = 기본보상 × 복리^파괴수 × 체스말배율
        const stoneBonus = calculateStoneReward(state.stonesDestroyed + destroyed, state.currentPiece.rank);
        bonusGold += stoneBonus;
      }

      if (wasKillingBoss) {
        newBossesDefeated++;
        newStonesUntilBoss = STONES_PER_BOSS;
        currentStone = createRandomStone(state.stonesDestroyed + destroyed, chessPieceLevel);
      } else {
        destroyed++;
        newStonesUntilBoss--;

        if (newStonesUntilBoss <= 0) {
          currentStone = createBossStone(state.attackPower, newBossesDefeated, state.stonesDestroyed + destroyed, chessPieceLevel);
          newStonesUntilBoss = 0;
        } else {
          currentStone = createRandomStone(state.stonesDestroyed + destroyed, chessPieceLevel);
        }
      }

      newHp = currentStone.currentHp + newHp;
    }

    set(s => ({
      gold: s.gold + totalGoldEarned + bonusGold,
      totalGold: s.totalGold + totalGoldEarned + bonusGold,
      dailyGoldEarned: s.dailyGoldEarned + totalGoldEarned + bonusGold,
      dailyStonesDestroyed: s.dailyStonesDestroyed + destroyed,
      currentStone: { ...currentStone, currentHp: Math.max(0, newHp) },
      stonesDestroyed: s.stonesDestroyed + destroyed,
      stonesUntilBoss: newStonesUntilBoss,
      bossesDefeated: newBossesDefeated,
    }));

    get().checkMissions();
  },

  checkMissions: () => {
    const s = get();
    const newMissions = s.missions.map(m => {
      if (m.claimed) return m;
      let c = 0;
      // 일일 미션 (daily_ 접두어) - 일일 카운터 사용
      if (m.id === 'daily_click') c = s.dailyClicks;
      else if (m.id === 'daily_stone') c = s.dailyStonesDestroyed;
      else if (m.id === 'daily_enhance') c = s.dailyEnhanceAttempts;
      else if (m.id === 'daily_gold') c = s.dailyGoldEarned;
      // 누적 미션 (total_ 접두어)
      else if (m.id === 'total_click') c = s.totalClicks;
      else if (m.id === 'total_stone') c = s.stonesDestroyed;
      else if (m.id === 'total_enhance') c = s.enhanceAttempts;
      else if (m.id === 'total_gold') c = s.totalGold;
      return { ...m, current: c, completed: c >= m.target };
    });
    set({ missions: newMissions });
  },

  checkAchievements: () => {
    const s = get();
    const currentRankIndex = RANK_ORDER.indexOf(s.currentPiece.rank);

    const newAchievements = s.achievements.map(a => {
      if (a.unlocked) return a; // 이미 해금됨

      let shouldUnlock = false;

      if (a.condition === 'rank') {
        // 랭크 업적: 해당 랭크 이상이면 해금
        const targetRankIndex = RANK_ORDER.indexOf(a.target as ChessPieceRank);
        shouldUnlock = currentRankIndex >= targetRankIndex;
      } else if (a.condition === 'boss') {
        // 보스 처치 업적: 보스 처치 수가 타겟 이상이면 해금
        shouldUnlock = s.bossesDefeated >= (a.target as number);
      }

      return shouldUnlock ? { ...a, unlocked: true } : a;
    });

    // 변경 있을 때만 업데이트
    const hasChanges = newAchievements.some((a, i) => a.unlocked !== s.achievements[i].unlocked);
    if (hasChanges) {
      set({ achievements: newAchievements });
    }
  },

  resetDailyMissions: () => {
    const today = getTodayString();
    const s = get();
    if (s.dailyMissionDate !== today) {
      // 일일 미션만 리셋, 누적 미션은 유지
      const newMissions = s.missions.map(m => {
        if (m.id.startsWith('daily_')) {
          // 일일 미션은 current와 completed, claimed 초기화
          const initial = INITIAL_MISSIONS.find(im => im.id === m.id);
          return initial ? { ...initial } : m;
        }
        // 누적 미션은 그대로 유지
        return m;
      });
      // 일일 미션 및 일일 카운터 모두 리셋
      set({
        missions: newMissions,
        dailyMissionDate: today,
        dailyClicks: 0,
        dailyStonesDestroyed: 0,
        dailyEnhanceAttempts: 0,
        dailyGoldEarned: 0,
        adFreeRubyUsed: 0,  // 무료 다이아 횟수도 초기화
        adDestructionPreventUsed: 0  // 파괴방지 광고 횟수도 초기화
      });
    }
  },

  saveGame: () => {
    const s = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, handleClick: undefined, actions: undefined }));
  },

  loadGame: () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // 새 유저: 현재 버전을 최초 설치 버전으로 저장
      localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);
      return;
    }
    try {
      // 기존 유저: 최초 설치 버전이 없으면 저장 (마이그레이션)
      if (!localStorage.getItem(VERSION_STORAGE_KEY)) {
        localStorage.setItem(VERSION_STORAGE_KEY, 'legacy');  // 버전 추적 이전 유저
      }
      const d = JSON.parse(saved);

      // Re-map piece to ensure display name and image are correct for rank
      const pieceTemplate = CHESS_PIECES[d.currentPiece.rank as ChessPieceRank] || CHESS_PIECES.pawn;
      const restoredPiece = { ...pieceTemplate, level: d.currentPiece.level };

      // shopItems 가격 정보는 항상 최신 INITIAL_SHOP_ITEMS에서 가져옴
      const mergedShopItems = INITIAL_SHOP_ITEMS.map(initial => {
        const saved = d.shopItems?.find((s: ShopItem) => s.id === initial.id);
        return saved ? { ...initial, count: saved.count } : { ...initial };
      });

      // missions도 최신 INITIAL_MISSIONS 기준으로 병합 (삭제된 미션 제거, 새 미션 추가)
      const mergedMissions = INITIAL_MISSIONS.map(initial => {
        const saved = d.missions?.find((m: Mission) => m.id === initial.id);
        if (saved) {
          // 누적 미션(total_*)은 단계 정보(target, reward, description)도 유지
          if (initial.id.startsWith('total_')) {
            return {
              ...initial,
              target: saved.target,
              reward: saved.reward,
              description: saved.description,
              current: saved.current,
              completed: saved.completed,
              claimed: saved.claimed
            };
          }
          // 일일 미션은 진행상황만 유지
          return { ...initial, current: saved.current, completed: saved.completed, claimed: saved.claimed };
        }
        return { ...initial };
      });

      // autoClickers(도구) 마이그레이션: 구매 개수만 유지, 나머지는 최신 정보로
      const mergedAutoClickers = INITIAL_AUTO_CLICKERS.map(initial => {
        const saved = d.autoClickers?.find((c: AutoClicker) => c.id === initial.id);
        return saved ? { ...initial, count: saved.count } : { ...initial };
      });

      // upgrades(강화) 마이그레이션: 레벨만 유지, 나머지는 최신 정보로
      const mergedUpgrades = INITIAL_UPGRADES.map(initial => {
        const saved = d.upgrades?.find((u: UpgradeStat) => u.id === initial.id);
        return saved ? { ...initial, level: saved.level } : { ...initial };
      });

      // achievements(업적) 마이그레이션: 해금/수령 상태 유지, 나머지는 최신 정보로
      const mergedAchievements = INITIAL_ACHIEVEMENTS.map(initial => {
        const saved = d.achievements?.find((a: Achievement) => a.id === initial.id);
        return saved ? { ...initial, unlocked: saved.unlocked, claimed: saved.claimed } : { ...initial };
      });

      // 마이그레이션된 upgrades로 stats 재계산
      const migratedStats = calculateStats(mergedUpgrades, restoredPiece, d.prestigeBonus || 0);

      set({ ...d, currentPiece: restoredPiece, shopItems: mergedShopItems, missions: mergedMissions, autoClickers: mergedAutoClickers, upgrades: mergedUpgrades, achievements: mergedAchievements, ...migratedStats });
    } catch (e) { console.error(e); }
  },
  resetGame: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('pony_story_seen'); // 스토리 인트로도 초기화
    localStorage.removeItem('pony_guide_seen'); // 가이드도 초기화
    // 튜토리얼 초기화
    localStorage.removeItem('tutorial_first-click');
    localStorage.removeItem('tutorial_growth');
    localStorage.removeItem('tutorial_tool');
    localStorage.removeItem('tutorial_mission');
    window.location.reload();
  }
}));

// ============ UI 컴포넌트 ============
const vibrate = (pattern: number | number[] = 10) => {
  if (navigator.vibrate) navigator.vibrate(pattern);
};

// 애니메이션 텍스트
const FloatingText = ({ x, y, text, type }: { x: number, y: number, text: string, type: 'gold' | 'crit' | 'damage' | 'bonus' }) => {
  const colors = {
    crit: '#ff4757',
    gold: '#f1c40f',
    bonus: '#2ecc71',
    damage: '#fff'
  };
  return (
    <div className="effect-text" style={{
      left: x,
      top: y,
      color: colors[type] || '#fff',
      fontSize: type === 'bonus' ? '2rem' : '1.8rem',
      textShadow: type === 'bonus' ? '0 2px 8px rgba(46, 204, 113, 0.5)' : undefined
    }}>
      {text}
    </div>
  );
};

// 개선된 Crack Effect SVG - 단계별 크랙 패턴
const CrackSVG = ({ damagePercent }: { damagePercent: number }) => {
  // 피해량에 따른 크랙 단계 (0-4)
  const stage = Math.min(4, Math.floor(damagePercent * 5));

  // 기본 불투명도 - 피해에 비례
  const baseOpacity = Math.min(0.9, damagePercent * 1.2);

  // 단계별 크랙 패턴 생성
  const generateCrackPaths = () => {
    const paths: React.ReactNode[] = [];

    // Stage 1: 중앙에서 작은 균열 (20% 이상 피해)
    if (stage >= 1) {
      paths.push(
        <g key="stage1" className="crack-stage-1">
          <path
            d="M50 50 L45 35 L42 25"
            stroke="rgba(0,0,0,0.7)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M50 50 L58 38 L62 28"
            stroke="rgba(0,0,0,0.6)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    }

    // Stage 2: 가지치기 시작 (40% 이상 피해)
    if (stage >= 2) {
      paths.push(
        <g key="stage2" className="crack-stage-2">
          <path
            d="M45 35 L38 32 L30 35"
            stroke="rgba(0,0,0,0.6)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M58 38 L65 35 L72 38"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M50 50 L35 55 L25 52"
            stroke="rgba(0,0,0,0.6)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    }

    // Stage 3: 방사형 확장 (60% 이상 피해)
    if (stage >= 3) {
      paths.push(
        <g key="stage3" className="crack-stage-3">
          <path
            d="M50 50 L68 58 L78 55"
            stroke="rgba(0,0,0,0.7)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M50 50 L45 68 L40 78"
            stroke="rgba(0,0,0,0.6)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M50 50 L60 65 L65 75"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* 추가 분기 */}
          <path
            d="M42 25 L38 18 M42 25 L48 15"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    }

    // Stage 4: 파괴 직전 - 전면 균열 (80% 이상 피해)
    if (stage >= 4) {
      paths.push(
        <g key="stage4" className="crack-stage-4">
          <path
            d="M25 52 L18 48 L12 52"
            stroke="rgba(0,0,0,0.7)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M78 55 L85 58 L90 52"
            stroke="rgba(0,0,0,0.6)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M40 78 L35 85 M65 75 L70 82"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* 중앙 균열 강조 */}
          <circle
            cx="50" cy="50" r="5"
            fill="none"
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="2"
            strokeDasharray="3 2"
          />
          {/* 파편 느낌의 작은 선들 */}
          <path
            d="M30 35 L28 30 M72 38 L76 32 M25 52 L20 55 M78 55 L82 60"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    }

    return paths;
  };

  if (stage === 0) return null;

  return (
    <svg
      viewBox="0 0 100 100"
      className={`crack-svg crack-stage-${stage}`}
      style={{ opacity: baseOpacity }}
    >
      {/* 그림자/깊이 효과 레이어 */}
      <filter id="crack-shadow">
        <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.5" floodColor="rgba(0,0,0,0.3)" />
      </filter>

      <g filter="url(#crack-shadow)">
        {generateCrackPaths()}
      </g>

      {/* 파괴 직전 붉은 빛 효과 */}
      {stage >= 4 && (
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke="rgba(255,50,50,0.2)"
          strokeWidth="3"
          className="crack-danger-glow"
        />
      )}
    </svg>
  );
};

function StoryIntroModal({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const content = [
    { title: "체스 왕국의 위기", text: "평화롭던 체스 왕국에\n바둑 왕국의 침략이 시작되었다!" },
    { title: "용감한 폰의 등장", text: "작지만 용감한 폰이\n왕국을 지키기 위해 검을 들었다." },
    { title: "강화의 힘", text: "바둑돌을 부수고 골드를 모아\n더 강력한 체스말로 진화하라!" },
    { title: "전설의 시작", text: "지금 바로 모험을 떠나보세요!" }
  ];

  return (
    <div className="story-overlay">
      <div className="story-content">
        <h1>{content[page].title}</h1>
        <p style={{ whiteSpace: 'pre-line' }}>{content[page].text}</p>
      </div>
      <button
        className="story-start-btn"
        onClick={() => {
          if (page < content.length - 1) setPage(p => p + 1);
          else onClose();
        }}
        style={{ marginTop: '30px' }}
      >
        {page < content.length - 1 ? "다음 ▶" : "모험 시작! ⚔️"}
      </button>
    </div>
  );
}

// Modal 컴포넌트 제거됨 - 탭 기반 UI로 대체

// TODO 2: 연령 등급 배지 컴포넌트
function AgeRatingBadge({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div className="age-rating-overlay" onClick={() => { setVisible(false); onComplete(); }}>
      <div className="age-rating-content">
        <div className="age-rating-badge">
          <span className="age-rating-text">전체이용가</span>
          <span className="age-rating-sub">All Ages</span>
        </div>
        <div className="age-rating-info">
          <p className="info-item"><span>게임명:</span> 체스 키우기</p>
          <p className="info-item"><span>제작사:</span> 체스왕국 스튜디오</p>
          <p className="info-item"><span>등급분류:</span> 전체이용가</p>
          <p className="info-item"><span>내용정보:</span> 폭력성 없음, 선정성 없음</p>
        </div>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '20px', fontSize: '0.9rem' }}>
        터치하여 건너뛰기
      </p>
    </div>
  );
}

// TODO 1: 종료 확인 모달
function ExitConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-overlay">
      <div className="exit-modal">
        <p className="exit-modal-text">체스 키우기를 종료할까요?</p>
        <div className="exit-modal-buttons">
          <button className="exit-btn cancel" onClick={onCancel}>취소</button>
          <button className="exit-btn confirm" onClick={onConfirm}>종료하기</button>
        </div>
      </div>
    </div>
  );
}

// 더보기 메뉴 모달
function MoreMenuModal({ onClose, onReset, onShowGuide }: {
  onClose: () => void;
  onReset: () => void;
  onShowGuide: () => void;
}) {
  const [bgmMuted, setBgmMuted] = useState(soundManager.isBgmMuted());
  const [sfxMuted, setSfxMuted] = useState(soundManager.isSfxMuted());
  const [bgmVolume, setBgmVolume] = useState(soundManager.getBgmVolume());
  const [sfxVolume, setSfxVolume] = useState(soundManager.getSfxVolume());
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleBgmToggle = () => {
    const muted = soundManager.toggleBgmMute();
    setBgmMuted(muted);
  };

  const handleSfxToggle = () => {
    const muted = soundManager.toggleSfxMute();
    setSfxMuted(muted);
    if (!muted) soundManager.play('click');
  };

  const handleBgmVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setBgmVolume(vol);
    soundManager.setBgmVolume(vol);
  };

  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setSfxVolume(vol);
    soundManager.setSfxVolume(vol);
  };

  return (
    <div className="modal-overlay" onPointerUp={onClose}>
      <div className="more-menu-modal" onPointerUp={e => e.stopPropagation()}>
        <div className="more-menu-header">
          <h3>설정</h3>
          <button className="close-btn" onPointerUp={onClose}>✕</button>
        </div>
        <div className="more-menu-content">
          {/* 사운드 설정 섹션 */}
          <div className="sound-settings-section">
            <h4>🔊 사운드 설정</h4>

            {/* 배경음악 설정 */}
            <div className="sound-setting-item">
              <div className="sound-setting-row">
                <span className="sound-label">🎵 배경음악</span>
                <button
                  className={`sound-toggle-btn ${bgmMuted ? 'muted' : 'active'}`}
                  onPointerUp={handleBgmToggle}
                >
                  {bgmMuted ? 'OFF' : 'ON'}
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={bgmVolume}
                onChange={handleBgmVolumeChange}
                className="volume-slider"
                disabled={bgmMuted}
              />
              <span className="volume-value">{Math.round(bgmVolume * 100)}%</span>
            </div>

            {/* 효과음 설정 */}
            <div className="sound-setting-item">
              <div className="sound-setting-row">
                <span className="sound-label">🔔 효과음</span>
                <button
                  className={`sound-toggle-btn ${sfxMuted ? 'muted' : 'active'}`}
                  onPointerUp={handleSfxToggle}
                >
                  {sfxMuted ? 'OFF' : 'ON'}
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={sfxVolume}
                onChange={handleSfxVolumeChange}
                className="volume-slider"
                disabled={sfxMuted}
              />
              <span className="volume-value">{Math.round(sfxVolume * 100)}%</span>
            </div>
          </div>

          {/* 기타 설정 */}
          <div className="other-settings-section">
            <button className="more-menu-item" onPointerUp={() => { soundManager.play('click'); onShowGuide(); onClose(); }}>
              <span>📖</span>
              <span>게임 가이드</span>
            </button>
            <button className="more-menu-item" onPointerUp={async () => {
              soundManager.play('click');
              const restored = await restorePurchases();
              if (restored.length > 0) {
                restored.forEach(productId => {
                  if (productId === PRODUCT_IDS.AD_REMOVAL) {
                    useGameStore.setState({ adRemoved: true });
                  } else if (productId === PRODUCT_IDS.PERMANENT_BOOSTER) {
                    useGameStore.setState({ permanentBoost: true });
                  }
                });
                soundManager.play('success');
                alert(`✅ ${restored.length}개 구매 복원 완료!`);
              } else {
                alert('복원할 구매 내역이 없습니다');
              }
            }}>
              <span>🔄</span>
              <span>구매 복원</span>
            </button>
            {!showResetConfirm ? (
              <button className="more-menu-item danger" onPointerUp={() => { soundManager.play('click'); setShowResetConfirm(true); }}>
                <span>🔄</span>
                <span>게임 초기화</span>
              </button>
            ) : (
              <div className="reset-confirm-box">
                <p>⚠️ 정말 초기화하시겠습니까?</p>
                <p className="reset-warning">모든 진행 상황이 삭제됩니다!</p>
                <div className="reset-confirm-buttons">
                  <button className="confirm-btn cancel" onPointerUp={() => { soundManager.play('click'); setShowResetConfirm(false); }}>
                    취소
                  </button>
                  <button className="confirm-btn confirm" onPointerUp={() => { soundManager.play('click'); onReset(); onClose(); }}>
                    초기화
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="more-menu-info">
            <p>체스 키우기 v1.0</p>
            <p>제작: 체스왕국 스튜디오</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 오프라인 보상 모달
function OfflineRewardModal({
  data,
  onClaim
}: {
  data: { gold: number; stonesDestroyed: number; bossesDefeated: number; time: number };
  onClaim: (double: boolean) => void;
}) {
  const [isLoadingAd, setIsLoadingAd] = useState(false);
  const [adError, setAdError] = useState(false);

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    return `${minutes}분`;
  };

  // 광고 시청 시작
  const handleWatchAd = async () => {
    setIsLoadingAd(true);
    setAdError(false);
    try {
      const rewarded = await showRewarded();
      if (rewarded) {
        onClaim(true);
      } else {
        // 광고 실패/취소 시 모달 유지
        setAdError(true);
      }
    } catch (error) {
      console.error('Ad error:', error);
      setAdError(true);
    } finally {
      setIsLoadingAd(false);
    }
  };

  // 광고 로딩 중 화면
  if (isLoadingAd) {
    return (
      <div className="offline-reward-modal">
        <div className="offline-reward-content ad-watching">
          <div className="ad-placeholder">
            <div className="ad-label">광고 로딩 중...</div>
            <div className="ad-timer">⏳</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="offline-reward-modal">
      <div className="offline-reward-content">
        <h2 className="offline-reward-title">🎉 돌아오셨군요!</h2>
        <p className="offline-reward-time">⏱️ <span>{formatTime(data.time)}</span> 동안</p>

        <div className="offline-reward-stats">
          <div className="offline-reward-stat">
            <span className="stat-icon">💰</span>
            <span className="stat-label">골드</span>
            <span className="stat-value gold">{formatNumber(data.gold)}</span>
          </div>
          <div className="offline-reward-stat">
            <span className="stat-icon">🪨</span>
            <span className="stat-label">바둑돌</span>
            <span className="stat-value stones">{formatNumber(data.stonesDestroyed)}개</span>
          </div>
          {data.bossesDefeated > 0 && (
            <div className="offline-reward-stat">
              <span className="stat-icon">👹</span>
              <span className="stat-label">보스</span>
              <span className="stat-value boss">{data.bossesDefeated}마리</span>
            </div>
          )}
        </div>

        {adError && (
          <div className="ad-error-message">
            ⚠️ 광고를 불러올 수 없습니다
          </div>
        )}

        <div className="offline-reward-buttons">
          <button
            className="offline-reward-btn double"
            onPointerDown={(e) => e.currentTarget.classList.add('pressed')}
            onPointerUp={(e) => {
              e.currentTarget.classList.remove('pressed');
              vibrate(20);
              soundManager.play('click');
              handleWatchAd();
            }}
            onPointerLeave={(e) => e.currentTarget.classList.remove('pressed')}
          >
            📺 광고 보고 2배 받기
          </button>
          <button
            className="offline-reward-btn normal"
            onPointerDown={(e) => e.currentTarget.classList.add('pressed')}
            onPointerUp={(e) => {
              e.currentTarget.classList.remove('pressed');
              vibrate(15);
              soundManager.play('click');
              onClaim(false);
            }}
            onPointerLeave={(e) => e.currentTarget.classList.remove('pressed')}
          >
            그냥 보상받기
          </button>
        </div>
      </div>
    </div>
  );
}

// 엔딩 모달 (임페리얼 킹 달성 시)
function EndingModal({
  currentPiece,
  prestigeBonus,
  onInfiniteMode,
  onPrestige
}: {
  currentPiece: ChessPiece;
  prestigeBonus: number;
  onInfiniteMode: () => void;
  onPrestige: () => void;
}) {
  // 환생 시 예상 루비 보상 계산
  const rankIndex = RANK_ORDER.indexOf(currentPiece.rank);
  const estimatedRuby = (rankIndex + 1) * (currentPiece.level + 1) * 10;
  const newPrestigeBonus = Math.floor((prestigeBonus + 0.1) * 100);

  return (
    <div className="ending-modal">
      <div className="ending-content">
        <div className="ending-celebration">🎊</div>
        <h2 className="ending-title">축하합니다!</h2>
        <p className="ending-subtitle">최고 등급 <span>임페리얼 킹</span> 달성!</p>

        <div className="ending-message">
          당신은 전설의 체스 마스터가 되었습니다!<br />
          다음 여정을 선택하세요.
        </div>

        <div className="ending-options">
          <div className="ending-option infinite">
            <div className="option-icon">♾️</div>
            <div className="option-info">
              <div className="option-title">무한 모드</div>
              <div className="option-desc">현재 상태를 유지하며 계속 플레이</div>
            </div>
            <button className="option-btn" onClick={onInfiniteMode}>
              선택
            </button>
          </div>

          <div className="ending-option prestige">
            <div className="option-icon">🔄</div>
            <div className="option-info">
              <div className="option-title">환생</div>
              <div className="option-desc">
                처음부터 다시 시작<br />
                <span className="reward-preview">
                  💎 {formatNumber(estimatedRuby)} 다이아 + 영구 보너스 {newPrestigeBonus}%
                </span>
              </div>
            </div>
            <button className="option-btn" onClick={onPrestige}>
              선택
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 전면 광고 모달 (AdMob 연동 전 플레이스홀더)
function InterstitialAdModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    // 전면 광고 즉시 표시
    const showAd = async () => {
      try {
        await showInterstitial();
      } catch (error) {
        console.error('Interstitial ad error:', error);
      }
      // 광고 종료 후 모달 닫기
      onClose();
    };

    showAd();
  }, [onClose]);

  // 광고 로딩 중 표시
  return (
    <div className="interstitial-ad-modal">
      <div className="interstitial-ad-content">
        <div className="ad-placeholder">
          <div className="ad-placeholder-inner">
            <div className="ad-icon">⏳</div>
            <div className="ad-text">광고 로딩 중...</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 파괴 복구 모달
function DestroyRecoveryModal({
  pendingData,
  adUsedToday,
  onWatchAd,
  onConfirmDestroy
}: {
  pendingData: { rank: ChessPieceRank; level: number };
  adUsedToday: number;
  onWatchAd: () => void;
  onConfirmDestroy: () => void;
}) {
  const [isLoadingAd, setIsLoadingAd] = useState(false);
  const [adError, setAdError] = useState(false);

  const rankNames: Record<ChessPieceRank, string> = {
    pawn: '폰', knight: '나이트', bishop: '비숍',
    rook: '룩', queen: '퀸', king: '킹', imperial: '임페리얼'
  };
  const levelNames = ['이병', '일병', '상병', '병장', '하사', '중사', '상사', '소위', '중위', '대위', '소령', '중령', '대령', '준장', '소장', '중장', '대장'];
  const levelName = levelNames[pendingData.level] || `+${pendingData.level}`;
  const remainingAds = 2 - adUsedToday;

  // 광고 시청 후 복구
  const handleWatchAd = async () => {
    setIsLoadingAd(true);
    setAdError(false);
    try {
      const rewarded = await showRewarded();
      if (rewarded) {
        soundManager.play('success');
        vibrate([50, 50, 50]);
        onWatchAd();
      } else {
        // 광고 실패/취소 시 모달 유지
        setAdError(true);
      }
    } catch (error) {
      console.error('Ad error:', error);
      setAdError(true);
    } finally {
      setIsLoadingAd(false);
    }
  };

  // 광고 로딩 중
  if (isLoadingAd) {
    return (
      <div className="destroy-recovery-modal">
        <div className="destroy-recovery-content">
          <div className="destroy-warning-icon">⏳</div>
          <div className="destroy-warning-title">광고 로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="destroy-recovery-modal">
      <div className="destroy-recovery-content">
        {/* 경고 아이콘 */}
        <div className="destroy-warning-icon">💥</div>

        {/* 경고 메시지 */}
        <div className="destroy-warning-title">장비 파괴 위험!</div>
        <div className="destroy-warning-desc">
          <span className="piece-info">{rankNames[pendingData.rank]} {levelName}</span>이(가)
          <br />파괴될 위기입니다!
        </div>

        {adError && (
          <div className="ad-error-message">
            ⚠️ 광고를 불러올 수 없습니다
          </div>
        )}

        {/* 광고로 복구 버튼 */}
        <button
          className="destroy-recovery-btn watch-ad"
          onClick={handleWatchAd}
        >
          <span className="btn-icon">📺</span>
          <span className="btn-text">
            광고 보고 복구하기
            <span className="btn-subtext">오늘 {remainingAds}회 남음</span>
          </span>
        </button>

        {/* 파괴 확정 버튼 */}
        <button
          className="destroy-recovery-btn confirm-destroy"
          onClick={() => {
            soundManager.play('destroy');
            vibrate([100, 50, 100]);
            onConfirmDestroy();
          }}
        >
          <span className="btn-icon">💀</span>
          <span className="btn-text">파괴하기 (+0 초기화)</span>
        </button>
      </div>
    </div>
  );
}

// 탭 타입 정의
type TabType = 'enhance' | 'upgrade' | 'auto' | 'shop' | 'mission';

// 메인 앱
function App() {
  const [showStory, setShowStory] = useState(false);
  const [showGuide, setShowGuide] = useState(false); // 가이드 모달
  const [showAgeRating, setShowAgeRating] = useState(true); // TODO 2: 연령 등급
  const [showExitModal, setShowExitModal] = useState(false); // TODO 1: 종료 확인
  const [showMoreMenu, setShowMoreMenu] = useState(false); // 더보기 메뉴
  const [activeTab, setActiveTab] = useState<TabType>('enhance'); // 탭 기반 UI
  const [fx, setFx] = useState<{ id: number, x: number, y: number, text: string, type: any }[]>([]);

  // 강제 튜토리얼 시스템
  const [activeTutorial, setActiveTutorial] = useState<'first-click' | 'growth' | 'tool' | 'mission' | null>(null);
  const [tutorialStep, setTutorialStep] = useState<0 | 1>(0);
  const [spotlightRect, setSpotlightRect] = useState<{x: number, y: number, width: number, height: number} | null>(null);

  const {
    gold, ruby, currentPiece, currentStone, stonesDestroyed,
    attackPower, critChance, autoClicksPerSec, upgradeCount,
    stonesUntilBoss, bossesDefeated,
    goldPerClick, prestigeCount, // 리더보드 점수 계산용
    handleClick, tryEnhance, claimMissionReward, missions,
    loadGame, saveGame, autoTick, collectOfflineReward, resetDailyMissions,
    // 오프라인 보상 모달
    showOfflineRewardModal, offlineRewardData, claimOfflineReward,
    // 엔딩 & 무한모드
    isInfiniteMode, showEndingModal, prestigeBonus,
    chooseInfiniteMode, choosePrestigeFromEnding, doPrestige,
    // 전면 광고
    showInterstitialAd, closeInterstitial,
    // 파괴 복구 광고
    showDestroyRecoveryModal, pendingDestroyData, adDestructionPreventUsed,
    confirmDestroy, watchAdToRecoverDestroy,
    // 무료 루비 광고
    adFreeRubyUsed, claimFreeRuby,
    // 업적 시스템
    achievements, claimAchievement, checkAchievements,
  } = useGameStore();

  const [lastEnhanceMsg, setLastEnhanceMsg] = useState('');
  const [shake, setShake] = useState(false);
  const [rewardFx, setRewardFx] = useState<{ id: number; text: string } | null>(null);

  // 오토클릭커 방지용 ref
  const lastClickTimeRef = useRef<number>(0);
  const clickTimestampsRef = useRef<number[]>([]);
  const CLICK_COOLDOWN = 50; // 클릭 간 최소 간격 (ms)
  const MAX_CLICKS_PER_SEC = 15; // 초당 최대 클릭 수

  // 강화 아이템 적용 상태
  const [useProtect, setUseProtect] = useState(false);
  const [useBlessing, setUseBlessing] = useState<0 | 1 | 2>(0); // 0: 없음, 1: 축복주문서, 2: 행운주문서

  // 리더보드 점수 제출 함수
  const submitLeaderboardScore = useCallback(async () => {
    const score = calculateLeaderboardScore(
      goldPerClick,
      attackPower,
      stonesDestroyed,
      currentPiece.rank,
      prestigeCount
    );
    try {
      const result = await submitGameCenterLeaderBoardScore({ score: score.toString() });
      if (result && result.statusCode === 'SUCCESS') {
        console.log('리더보드 점수 제출 성공:', score);
      }
    } catch (error) {
      console.error('리더보드 점수 제출 실패:', error);
    }
  }, [goldPerClick, attackPower, stonesDestroyed, currentPiece.rank, prestigeCount]);

  // 리더보드 열기 함수
  const handleOpenLeaderboard = useCallback(async () => {
    // 먼저 현재 점수 제출
    await submitLeaderboardScore();
    // 리더보드 열기
    openGameCenterLeaderboard();
  }, [submitLeaderboardScore]);

  // 도구 공격 이펙트 상태
  const [autoAttackFx, setAutoAttackFx] = useState<{
    id: number;
    toolId: string;
    emoji: string;
    x: number;
    y: number;
    delay: number;
    particles?: { id: number; x: number; y: number; angle: number }[];
  }[]>([]);

  // 스케일링 상태
  const [scale, setScale] = useState(1);
  const [bgScale, setBgScale] = useState(1);
  const appRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  // 화면 크기에 맞춰 게임 스케일 계산 (Safe Zone 방식)
  const calculateScale = useCallback(() => {
    const DESIGN_WIDTH = 390;
    const DESIGN_HEIGHT = 844;

    // visualViewport API 사용 (모바일 브라우저 주소창/하단바 고려)
    const windowWidth = window.visualViewport?.width || window.innerWidth;
    const windowHeight = window.visualViewport?.height || window.innerHeight;

    const scaleX = windowWidth / DESIGN_WIDTH;
    const scaleY = windowHeight / DESIGN_HEIGHT;

    // Safe Zone 방식:
    // - 콘텐츠: Math.min (잘리지 않도록)
    // - 배경: Math.max (화면 전체 채우기)
    const contentScale = Math.min(scaleX, scaleY);
    const backgroundScale = Math.max(scaleX, scaleY);

    setScale(contentScale);
    setBgScale(backgroundScale);
  }, []);

  // 스케일링 이벤트 리스너
  useEffect(() => {
    calculateScale();
    window.addEventListener('resize', calculateScale);
    window.addEventListener('orientationchange', calculateScale);
    // visualViewport 리사이즈 이벤트 (모바일 브라우저 주소창 변화 감지)
    window.visualViewport?.addEventListener('resize', calculateScale);

    return () => {
      window.removeEventListener('resize', calculateScale);
      window.removeEventListener('orientationchange', calculateScale);
      window.visualViewport?.removeEventListener('resize', calculateScale);
    };
  }, [calculateScale]);

  // 앱 백그라운드/포그라운드 전환 시 오디오 제어 및 점수 제출
  // Web Visibility API로 앱 상태 감지 (토스 앱 내에서도 동작)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        soundManager.unmuteAll(); // 포그라운드: 음소거 해제
      } else {
        soundManager.muteAll();   // 백그라운드: 음소거
        // 백그라운드 전환 시 리더보드 점수 제출
        submitLeaderboardScore();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [submitLeaderboardScore]);

  // 구매 완료 콜백
  const handlePurchaseApproved = useCallback((productId: string) => {
    console.log('Purchase approved:', productId);
    const state = useGameStore.getState();

    switch (productId) {
      case PRODUCT_IDS.AD_REMOVAL:
        useGameStore.setState({ adRemoved: true });
        soundManager.play('success');
        vibrate([50, 50, 50]);
        break;
      case PRODUCT_IDS.PERMANENT_BOOSTER:
        useGameStore.setState({ permanentBoost: true });
        soundManager.play('success');
        vibrate([50, 50, 50]);
        break;
      case PRODUCT_IDS.DIAMOND_100:
        useGameStore.setState({ ruby: state.ruby + 100 });
        soundManager.play('success');
        vibrate([50, 50, 50]);
        break;
      case PRODUCT_IDS.DIAMOND_320:
        useGameStore.setState({ ruby: state.ruby + 320 });
        soundManager.play('success');
        vibrate([50, 50, 50]);
        break;
      case PRODUCT_IDS.DIAMOND_550:
        useGameStore.setState({ ruby: state.ruby + 550 });
        soundManager.play('success');
        vibrate([50, 50, 50]);
        break;
      case PRODUCT_IDS.DIAMOND_1000:
        useGameStore.setState({ ruby: state.ruby + 1000 });
        soundManager.play('success');
        vibrate([50, 50, 50]);
        break;
      case PRODUCT_IDS.DIAMOND_2000:
        useGameStore.setState({ ruby: state.ruby + 2000 });
        soundManager.play('success');
        vibrate([50, 50, 50]);
        break;
    }
    // 실결제 완료 후 즉시 저장 (결제 후 앱 종료 시 데이터 손실 방지)
    useGameStore.getState().saveGame();
  }, []);

  useEffect(() => {
    loadGame();
    // 로드 후 업적 체크 (기존 진행상황 기반)
    setTimeout(() => checkAchievements(), 100);
    setupAds(); // Apps in Toss 광고 초기화
    initializePurchases(handlePurchaseApproved); // 토스페이먼츠 초기화
    if (!localStorage.getItem('pony_story_seen')) setShowStory(true);

    // Initial Interaction for BGM - HTML5 오디오 잠금해제 후 재생
    const removeAudioListeners = () => {
      window.removeEventListener('pointerdown', startAudio, true);
      window.removeEventListener('touchstart', startAudio, true);
      window.removeEventListener('click', startAudio, true);
    };

    const startAudio = () => {
      // 먼저 오디오 잠금해제 시도
      soundManager.unlockAudio();
      // BGM 재생 요청
      soundManager.play('bgm');

      // BGM이 실제로 재생되면 이벤트 리스너 제거
      // 아직 로딩 중이면 100ms 후 재확인
      setTimeout(() => {
        if (soundManager.isBgmActuallyPlaying() || soundManager.isBgmMuted()) {
          removeAudioListeners();
        }
      }, 100);
    };

    // once 제거 - BGM 실제 재생 후에만 리스너 제거
    window.addEventListener('pointerdown', startAudio, { capture: true });
    window.addEventListener('touchstart', startAudio, { capture: true });
    window.addEventListener('click', startAudio, { capture: true });

    // 일일 미션 초기화 체크 (한국시간 자정 기준)
    resetDailyMissions();

    setTimeout(() => {
      collectOfflineReward(); // 모달로 표시됨
    }, 1000);

    // 백그라운드/화면 잠금 감지 (Page Visibility API)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 백그라운드로 갈 때: 현재 시간 저장 및 게임 저장
        useGameStore.setState({ lastOnlineTime: Date.now() });
        saveGame();
      } else if (document.visibilityState === 'visible') {
        // 포그라운드로 돌아올 때: 오프라인 보상 계산
        resetDailyMissions(); // 자정 넘었을 수 있으니 체크
        collectOfflineReward();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const i = setInterval(autoTick, 1000);
    const s = setInterval(saveGame, 10000);

    // 뒤로가기 방지 (앱인토스 가이드라인)
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
      setShowExitModal(true);
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      clearInterval(i);
      clearInterval(s);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      removeAudioListeners();
      soundManager.stopBgm();
    };
  }, []);

  // 강제 튜토리얼 트리거
  useEffect(() => {
    // 다른 모달이 열려있으면 체크 안함
    if (showGuide || showStory || showAgeRating) return;
    // 이미 튜토리얼 진행 중이면 체크 안함
    if (activeTutorial) return;

    const firstClickDone = localStorage.getItem('tutorial_first-click');
    const growthDone = localStorage.getItem('tutorial_growth');
    const toolDone = localStorage.getItem('tutorial_tool');
    const missionDone = localStorage.getItem('tutorial_mission');

    // 1. 첫 클릭 가이드
    if (!firstClickDone && stonesDestroyed === 0) {
      setActiveTutorial('first-click');
      setTutorialStep(0);
      return;
    }

    // 2. 성장 가이드 (55골드 이상, 업그레이드 0회)
    if (!growthDone && gold >= 55 && upgradeCount === 0) {
      setActiveTutorial('growth');
      setTutorialStep(0);
      return;
    }

    // 3. 도구 가이드 (300골드 이상, 자동클릭 0)
    if (!toolDone && gold >= 300 && autoClicksPerSec === 0) {
      setActiveTutorial('tool');
      setTutorialStep(0);
      return;
    }

    // 4. 미션 가이드 (첫 번째 미션 완료 시 한 번만)
    if (!missionDone && missions.some(m => m.completed && !m.claimed)) {
      // 미션 튜토리얼은 딱 한 번만 보여주기 위해 즉시 localStorage 설정
      localStorage.setItem('tutorial_mission', 'done');
      setActiveTutorial('mission');
      setTutorialStep(0);
      return;
    }
  }, [gold, stonesDestroyed, autoClicksPerSec, upgradeCount, missions, showGuide, showStory, showAgeRating, activeTutorial]);

  // 튜토리얼 완료 함수
  const completeTutorial = (type: 'first-click' | 'growth' | 'tool' | 'mission') => {
    localStorage.setItem(`tutorial_${type}`, 'done');
    setActiveTutorial(null);
    setTutorialStep(0);
    setSpotlightRect(null);
  };

  // 튜토리얼 spotlight 위치 계산
  useEffect(() => {
    if (!activeTutorial) {
      setSpotlightRect(null);
      return;
    }

    // 약간의 지연 후 위치 계산 (DOM 렌더링 대기)
    const timer = setTimeout(() => {
      // tutorial-highlight 클래스가 적용된 요소를 찾음
      const target = document.querySelector('.tutorial-highlight');
      if (target) {
        const rect = target.getBoundingClientRect();
        const padding = 8;
        setSpotlightRect({
          x: rect.left - padding,
          y: rect.top - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [activeTutorial, tutorialStep, activeTab]);

  // 도구 자동 공격 시각화 이펙트
  useEffect(() => {
    if (autoClicksPerSec === 0) return;

    const spawnAutoAttackFx = () => {
      const activeClickers = useGameStore.getState().autoClickers.filter(c => c.count > 0);
      if (activeClickers.length === 0) return;

      // 랜덤으로 도구 하나 선택하여 공격 이펙트 생성
      const randomClicker = activeClickers[Math.floor(Math.random() * activeClickers.length)];
      const toolId = randomClicker.id;

      // 도구별 시작 위치 및 파티클 설정
      let startX = 50; // 바둑돌 중앙 기준
      let startY = 50;
      let particles: { id: number; x: number; y: number; angle: number }[] = [];

      // 도구별 위치 및 파티클 생성
      switch (toolId) {
        case 'hammer': // 나무 망치 - 위에서 내려찍기
          startX = 45 + Math.random() * 10;
          startY = 10;
          particles = Array.from({ length: 3 }, (_, i) => ({
            id: i,
            x: -10 + Math.random() * 20,
            y: Math.random() * 10,
            angle: -30 + Math.random() * 60
          }));
          break;
        case 'pickaxe': // 곡괭이 - 측면에서 쪼기
          startX = 10 + Math.random() * 10;
          startY = 40 + Math.random() * 20;
          particles = Array.from({ length: 4 }, (_, i) => ({
            id: i,
            x: Math.random() * 30,
            y: -15 + Math.random() * 30,
            angle: -60 + Math.random() * 120
          }));
          break;
        case 'mace': // 철퇴 - 강하게 내리치기
          startX = 45 + Math.random() * 10;
          startY = 5;
          particles = Array.from({ length: 5 }, (_, i) => ({
            id: i,
            x: -20 + Math.random() * 40,
            y: Math.random() * 15,
            angle: -45 + Math.random() * 90
          }));
          break;
        case 'drill': // 드릴 - 바둑돌 위에서 회전
          startX = 48 + Math.random() * 4;
          startY = 30 + Math.random() * 10;
          particles = Array.from({ length: 6 }, (_, i) => ({
            id: i,
            x: -15 + Math.random() * 30,
            y: -15 + Math.random() * 30,
            angle: i * 60
          }));
          break;
        case 'dynamite': // 다이너마이트 - 폭발
          startX = 30 + Math.random() * 40;
          startY = 35 + Math.random() * 30;
          particles = Array.from({ length: 8 }, (_, i) => ({
            id: i,
            x: -25 + Math.random() * 50,
            y: -25 + Math.random() * 50,
            angle: i * 45
          }));
          break;
        case 'laser': // 레이저 빔 - 위에서 빔 발사
          startX = 45 + Math.random() * 10;
          startY = 0;
          particles = Array.from({ length: 4 }, (_, i) => ({
            id: i,
            x: -5 + Math.random() * 10,
            y: 20 + i * 15,
            angle: 0
          }));
          break;
        case 'blackhole': // 블랙홀 - 소용돌이
          startX = 50;
          startY = 50;
          particles = Array.from({ length: 12 }, (_, i) => ({
            id: i,
            x: Math.cos(i * 30 * Math.PI / 180) * (30 + Math.random() * 20),
            y: Math.sin(i * 30 * Math.PI / 180) * (30 + Math.random() * 20),
            angle: i * 30
          }));
          break;
        default:
          startX = 45 + Math.random() * 10;
          startY = 20;
      }

      const newFx = {
        id: Date.now() + Math.random(),
        toolId,
        emoji: randomClicker.emoji,
        x: startX,
        y: startY,
        delay: Math.random() * 0.1,
        particles
      };

      setAutoAttackFx(prev => [...prev.slice(-7), newFx]); // 최대 8개 이펙트 유지

      // 도구별 이펙트 지속시간
      const duration = toolId === 'drill' ? 1200 :
                       toolId === 'dynamite' ? 1000 :
                       toolId === 'blackhole' ? 1500 :
                       toolId === 'laser' ? 900 : 700;

      setTimeout(() => {
        setAutoAttackFx(prev => prev.filter(f => f.id !== newFx.id));
      }, duration);
    };

    // 초당 클릭 수에 비례하여 이펙트 생성 (최대 초당 4회)
    const fxPerSecond = Math.min(4, Math.max(1, Math.floor(autoClicksPerSec / 15) + 1));
    const interval = setInterval(spawnAutoAttackFx, 1000 / fxPerSecond);

    return () => clearInterval(interval);
  }, [autoClicksPerSec]);

  // 앱 종료 처리 (토스 앱 SDK closeView 사용)
  const handleExit = async () => {
    // 종료 전 게임 데이터 저장
    saveGame();

    // 토스 앱 SDK의 closeView로 앱 종료
    try {
      await closeView();
    } catch (error) {
      // SDK가 동작하지 않는 환경(개발 환경 등)에서는 fallback
      console.log('closeView failed, using fallback:', error);
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    }
  };

  const onStoryClose = () => {
    localStorage.setItem('pony_story_seen', 'true');
    setShowStory(false);
    // 가이드도 처음인 경우에만 표시
    const guideSeen = localStorage.getItem('pony_guide_seen');
    if (!guideSeen) {
      setShowGuide(true);
    }
  };

  const onGuideClose = () => {
    localStorage.setItem('pony_guide_seen', 'true');
    setShowGuide(false);
  };

  const handleAttack = (e: React.TouchEvent | React.PointerEvent) => {
    const now = Date.now();

    // 1. 멀티터치 방지: 터치 이벤트에서 2개 이상 터치 시 무시
    if ('touches' in e && e.touches.length > 1) {
      return;
    }

    // 2. 클릭 쿨다운: 50ms 이내 재클릭 무시
    if (now - lastClickTimeRef.current < CLICK_COOLDOWN) {
      return;
    }

    // 3. 초당 클릭 제한: 1초 내 15회 초과 시 무시
    const oneSecondAgo = now - 1000;
    clickTimestampsRef.current = clickTimestampsRef.current.filter(t => t > oneSecondAgo);
    if (clickTimestampsRef.current.length >= MAX_CLICKS_PER_SEC) {
      return;
    }

    // 클릭 기록 저장
    lastClickTimeRef.current = now;
    clickTimestampsRef.current.push(now);

    vibrate(5);
    const result = handleClick();
    soundManager.play('hit');
    if (result.isCrit) soundManager.play('coin');
    // 첫 클릭 튜토리얼 완료
    if (activeTutorial === 'first-click') completeTutorial('first-click');

    setShake(true);
    setTimeout(() => setShake(false), 50);

    // 타겟(바둑돌) 영역 기준으로 데미지 텍스트 위치 계산
    // battle-container 내에서 target-wrapper 위치 사용
    let x: number, y: number;
    if (targetRef.current) {
      const targetRect = targetRef.current.getBoundingClientRect();
      const parentRect = targetRef.current.parentElement?.getBoundingClientRect();
      if (parentRect) {
        // battle-container 내에서의 상대 위치 + 랜덤 오프셋
        x = (targetRect.left - parentRect.left) + targetRect.width / 2 + (Math.random() * 60 - 30);
        y = (targetRect.top - parentRect.top) + targetRect.height / 2 + (Math.random() * 40 - 20);
      } else {
        x = 200 + Math.random() * 60 - 30;
        y = 80 + Math.random() * 40 - 20;
      }
    } else {
      // fallback: 고정 위치
      x = 200 + Math.random() * 60 - 30;
      y = 80 + Math.random() * 40 - 20;
    }

    const newFx = {
      id: Date.now(),
      x, y,
      text: result.isCrit ? `💥${formatNumber(result.gold)}!` : `+${formatNumber(result.gold)}`,
      type: result.isCrit ? 'crit' : 'gold'
    };
    setFx(prev => [...prev, newFx]);
    setTimeout(() => setFx(prev => prev.filter(f => f.id !== newFx.id)), 800);

    if (result.destroyed && result.bonusGold > 0) {
      vibrate([30, 50, 30]);
      soundManager.play('destroy');
      soundManager.play('coin');
      const bonusFx = {
        id: Date.now() + 1,
        x: x + 20,
        y: y - 30,
        text: `🎉 +${formatNumber(result.bonusGold)}`,
        type: 'bonus' as const
      };
      setTimeout(() => {
        setFx(prev => [...prev, bonusFx]);
        setTimeout(() => setFx(prev => prev.filter(f => f.id !== bonusFx.id)), 1000);
      }, 200);
    }
  };

  const handleEnhanceClick = useCallback(() => {
    vibrate(10);
    const res = tryEnhance(useProtect, useBlessing);
    setLastEnhanceMsg(res.message);
    if (res.success) {
      vibrate([50, 100]);
      soundManager.play('success');
    } else if (res.destroyed) {
      vibrate([100, 50, 100]);
      soundManager.play('fail');
    } else {
      soundManager.play('fail');
    }
    setTimeout(() => setLastEnhanceMsg(''), 2000);
  }, [useProtect, useBlessing]);

  // 상점 아이템 개수 가져오기
  const getItemCount = (itemId: string) => {
    return useGameStore.getState().shopItems.find(i => i.id === itemId)?.count || 0;
  };

  // derived values for stone visualization
  const hpPercent = currentStone.currentHp / currentStone.maxHp;
  const stonePixelSize = STONE_CONFIG[currentStone.size].pixelSize;

  // Helper to render the correct icon
  const renderPieceIcon = (rank: ChessPieceRank, className: string) => {
    const props = { className };
    switch (rank) {
      case 'pawn': return <PawnIcon {...props} />;
      case 'knight': return <KnightIcon {...props} />;
      case 'bishop': return <BishopIcon {...props} />;
      case 'rook': return <RookIcon {...props} />;
      case 'queen': return <QueenIcon {...props} />;
      case 'king': return <KingIcon {...props} />;
      case 'imperial': return <ImperialKingIcon {...props} />;
      default: return <PawnIcon {...props} />;
    }
  };

  // 보스 아이콘 렌더링
  const renderBossIcon = (bossType: BossType, style: React.CSSProperties) => {
    switch (bossType) {
      case 'boss1': return <StoneBossRed style={style} />;
      case 'boss2': return <StoneBossBlue style={style} />;
      case 'boss3': return <StoneBossGreen style={style} />;
      case 'boss4': return <StoneBossPurple style={style} />;
      case 'boss5': return <StoneBossGold style={style} />;
      case 'boss6': return <StoneBossCyan style={style} />;
      case 'boss7': return <StoneBossRainbow style={style} />;
      default: return <StoneBlackIcon style={style} />;
    }
  };

  // 보스 정보
  const currentBossConfig = currentStone.isBoss ? BOSS_CONFIG[currentStone.bossType || 'none'] : null;
  const bossProgress = currentStone.isBoss ? 0 : ((STONES_PER_BOSS - stonesUntilBoss) / STONES_PER_BOSS) * 100;

  const backgroundImage = getBackgroundImage(currentStone);

  return (
    <div className="game-wrapper">
      {/* 배경 레이어: 화면 전체를 덮음 (Safe Zone 방식) */}
      <div
        className="app-background"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          transform: `scale(${bgScale})`,
        }}
      />
      {/* 콘텐츠 레이어: 잘리지 않도록 스케일링 */}
      <div
        ref={appRef}
        className={`app ${activeTutorial ? 'tutorial-active' : ''}`}
        style={{
          transform: `scale(${scale})`,
        }}
      >
{/* Top Header */}
      <div className="game-header">
        <div className="resource-bar">
          <div className="resource-item gold">🪙 {formatNumber(gold)}</div>
          <div className="resource-item ruby">💎 {formatNumber(ruby)}</div>
          <div className="stats-bar">
            <span className="stat-badge">⚔️ {formatNumber(attackPower)}</span>
            {critChance > 0 && <span className="stat-badge">💥 {critChance.toFixed(1)}%</span>}
            {autoClicksPerSec > 0 && <span className="stat-badge">🤖 {autoClicksPerSec}/s</span>}
          </div>
        </div>
        <div className="header-buttons-wrapper">
          {/* 2X 부스트 버튼 */}
          {(() => {
            const state = useGameStore.getState();
            const now = Date.now();
            const isPermanent = state.permanentBoost;  // 영구 부스터 보유 여부
            const isActive = now < state.megaBoostEndTime;
            const isCooldown = now < state.megaBoostCooldownEnd && !isActive;

            // 남은 시간 계산
            let timeText = '';
            if (isActive && !isPermanent) {
              const remainingSec = Math.ceil((state.megaBoostEndTime - now) / 1000);
              const mins = Math.floor(remainingSec / 60);
              const secs = remainingSec % 60;
              timeText = `${mins}:${secs.toString().padStart(2, '0')}`;
            } else if (isCooldown && !isPermanent) {
              const remainingMin = Math.ceil((state.megaBoostCooldownEnd - now) / 60000);
              const hours = Math.floor(remainingMin / 60);
              const mins = remainingMin % 60;
              timeText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            }

            return (
              <button
                className={`boost-btn-compact ${(isPermanent || isActive) ? 'active permanent' : ''} ${isCooldown && !isPermanent ? 'cooldown' : ''}`}
                onPointerUp={async () => {
                  if (isPermanent) {
                    vibrate(10);
                    return; // 영구 부스터는 항상 활성화 상태
                  }
                  if (isActive || isCooldown) {
                    vibrate(10);
                    return;
                  }
                  // 광고 시청 후 부스터 활성화
                  try {
                    const rewarded = await showRewarded();
                    if (rewarded) {
                      soundManager.play('success');
                      const result = useGameStore.getState().useMegaBoost();
                      if (result.success) {
                        vibrate([50, 50, 50]);
                      }
                    } else {
                      setRewardFx({ id: Date.now(), text: '⚠️ 광고를 불러올 수 없습니다' });
                      setTimeout(() => setRewardFx(null), 1500);
                    }
                  } catch (error) {
                    console.error('Mega boost ad failed:', error);
                    setRewardFx({ id: Date.now(), text: '⚠️ 광고를 불러올 수 없습니다' });
                    setTimeout(() => setRewardFx(null), 1500);
                  }
                }}
              >
                <span className="boost-text">
                  {isPermanent ? '🚀 영구 2X' : isActive ? `🚀 ${timeText}` : isCooldown ? `⏳ ${timeText}` : '📺 부스트 2X'}
                </span>
              </button>
            );
          })()}
          {/* 랭킹 & 설정 버튼 */}
          <div className="nav-buttons">
            <button className="nav-btn ranking" onPointerUp={() => { soundManager.play('click'); handleOpenLeaderboard(); }}>
              <span>👑</span>
            </button>
            <button className="nav-btn more" onPointerUp={() => { soundManager.play('click'); setShowMoreMenu(true); }}>
              <span>⚙️</span>
            </button>
          </div>
        </div>
      </div>

      {/* 무한모드 환생 버튼 */}
      {isInfiniteMode && (
        <button
          className="infinite-prestige-btn"
          onClick={() => {
            soundManager.play('success');
            vibrate([50, 100, 50]);
            const result = doPrestige();
            if (result.success) {
              // 환생 완료 - 화면이 자동으로 리셋됨
            }
          }}
        >
          <span className="prestige-icon">🔄</span>
          <span className="prestige-text">환생하기</span>
        </button>
      )}

      {/* Main Battle Area */}
      <div className="game-area" onTouchStart={handleAttack} onPointerDown={(e) => {
        // 터치 이벤트는 onTouchStart에서 처리하므로 터치 포인터는 무시
        if (e.pointerType === 'touch') return;
        handleAttack(e);
      }}>

        {/* 보스 게이지 - game-area 안에 배치 */}
        <div className="boss-gauge-container">
          {currentStone.isBoss ? (
            <div className="boss-active">
              <span className="boss-icon">{currentBossConfig?.element}</span>
              <span className="boss-name">⚔️ {currentBossConfig?.name} 전투중!</span>
              <span className="boss-count">처치: {bossesDefeated}</span>
            </div>
          ) : (
            <div className="boss-progress">
              <span className="boss-label">다음 보스까지</span>
              <div className="boss-progress-bar">
                <div className="boss-progress-fill" style={{ width: `${bossProgress}%` }} />
              </div>
              <span className="boss-count">{STONES_PER_BOSS - stonesUntilBoss}/{STONES_PER_BOSS}</span>
            </div>
          )}
        </div>

        <div className="battle-container">
          {/* Character */}
          <div className={`character-wrapper ${shake ? 'shake' : ''}`}>
            <div className="weapon-badge">
              {/* 계급장 아이콘 표시 (임페리얼은 최종 등급이라 계급장 없음) */}
              {currentPiece.rank !== 'imperial' && (() => {
                const RankIcon = MILITARY_RANK_ICONS[currentPiece.level];
                return RankIcon ? <RankIcon className="rank-icon" /> : null;
              })()}
              <span className="piece-name">{currentPiece.emoji} {currentPiece.displayName}</span>
            </div>
            {renderPieceIcon(currentPiece.rank, "character-img")}
          </div>

          {/* Target - CSS Rendered Stone / Boss */}
          <div ref={targetRef} className={`target-wrapper ${shake ? 'shake' : ''} ${currentStone.isBoss ? 'boss-mode' : ''}`}>

            {/* 2D SVG Stone Character / Boss */}
            <div className={`stone-character-wrapper ${currentStone.isBoss ? 'boss' : currentStone.color} ${activeTutorial === 'first-click' ? 'tutorial-highlight' : ''}`}
              style={{
                width: currentStone.isBoss ? 160 : stonePixelSize,
                height: currentStone.isBoss ? 160 : stonePixelSize,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
              {currentStone.isBoss ? (
                renderBossIcon(currentStone.bossType || 'none', { width: '100%', height: '100%' })
              ) : currentStone.color === 'black' ? (
                <StoneBlackIcon style={{ width: '100%', height: '100%' }} />
              ) : (
                <StoneWhiteIcon style={{ width: '100%', height: '100%' }} />
              )}

              {/* Crack Overlay (SVG) - Rendered ON TOP of the stone SVG */}
              {!currentStone.isBoss && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <CrackSVG damagePercent={1 - hpPercent} />
                </div>
              )}
            </div>

            {/* HP Bar */}
            <div className={`hp-bar-container ${currentStone.isBoss ? 'boss-hp' : ''}`}>
              <div
                className={`hp-bar-fill ${currentStone.isBoss ? 'boss-hp-fill' : ''}`}
                style={{ width: `${hpPercent * 100}%` }}
              />
            </div>

            {/* 보스 이름 표시 */}
            {currentStone.isBoss && currentBossConfig && (
              <div className="boss-name-tag">
                {currentBossConfig.element} {currentBossConfig.name}
              </div>
            )}
            {/* Auto Attack FX Layer - 도구 공격 이펙트 (바둑돌 기준) */}
            {autoAttackFx.map(f => (
              <div
                key={f.id}
                className={`tool-fx tool-fx-${f.toolId}`}
                style={{
                  left: `${f.x}%`,
                  top: `${f.y}%`,
                  animationDelay: `${f.delay}s`
                }}
              >
                <span className="tool-emoji">{f.emoji}</span>
                {/* 파티클 이펙트 */}
                {f.particles?.map(p => (
                  <span
                    key={p.id}
                    className={`tool-particle tool-particle-${f.toolId}`}
                    style={{
                      '--px': `${p.x}px`,
                      '--py': `${p.y}px`,
                      '--angle': `${p.angle}deg`
                    } as React.CSSProperties}
                  />
                ))}
                {/* 히트 이펙트 */}
                <span className={`tool-hit tool-hit-${f.toolId}`} />
              </div>
            ))}
          </div>

          {/* FX Layer */}
          {fx.map(f => <FloatingText key={f.id} x={f.x} y={f.y} text={f.text} type={f.type} />)}
        </div>

      </div>

      </div>{/* app div 종료 */}

      {/* Bottom Tab UI - app 밖, 화면 하단 고정 */}
      <div className="bottom-tab-container">
        {/* 파괴한 바둑돌 badge - container 상단에 붙어서 함께 움직임 */}
        <div className="stones-destroyed-badge">
          파괴한 바둑돌: {stonesDestroyed}
        </div>
        {/* 탭 네비게이션 - 여기만 이벤트 전파 차단 (스크롤 영역은 허용) */}
        <div className="tab-navigation" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className={`tab-btn ${activeTab === 'enhance' ? 'active' : ''}`}
            onPointerUp={() => { soundManager.play('click'); setActiveTab('enhance'); }}
          >
            <span className="tab-icon">⚔️</span>
            <span className="tab-label">강화</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'upgrade' ? 'active' : ''} ${activeTutorial === 'growth' && tutorialStep === 0 ? 'tutorial-highlight' : ''}`}
            data-tab="growth"
            onPointerUp={() => {
              soundManager.play('click');
              setActiveTab('upgrade');
              if (activeTutorial === 'growth' && tutorialStep === 0) setTutorialStep(1);
            }}
          >
            <span className="tab-icon">📈</span>
            <span className="tab-label">성장</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'auto' ? 'active' : ''} ${activeTutorial === 'tool' && tutorialStep === 0 ? 'tutorial-highlight' : ''}`}
            data-tab="tool"
            onPointerUp={() => {
              soundManager.play('click');
              setActiveTab('auto');
              if (activeTutorial === 'tool' && tutorialStep === 0) setTutorialStep(1);
            }}
          >
            <span className="tab-icon">🔧</span>
            <span className="tab-label">도구</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`}
            onPointerUp={() => { soundManager.play('click'); setActiveTab('shop'); }}
          >
            <span className="tab-icon">🛒</span>
            <span className="tab-label">상점</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'mission' ? 'active' : ''} ${activeTutorial === 'mission' && tutorialStep === 0 ? 'tutorial-highlight' : ''}`}
            data-tab="mission"
            onPointerUp={() => {
              soundManager.play('click');
              setActiveTab('mission');
              if (activeTutorial === 'mission' && tutorialStep === 0) setTutorialStep(1);
            }}
          >
            <span className="tab-icon">📜</span>
            <span className="tab-label">미션</span>
          </button>
        </div>

        {/* 탭 콘텐츠 영역 */}
        <div className="tab-content">
          {/* 강화 탭 */}
          {activeTab === 'enhance' && (
            <div className="tab-panel enhance-panel">
              <div className="enhance-items-row">
                <button
                  className={`enhance-item-toggle ${useProtect ? 'active' : ''} ${!useProtect && getItemCount('protectScroll') === 0 ? 'disabled' : ''}`}
                  onPointerUp={() => {
                    if (useProtect || getItemCount('protectScroll') > 0) setUseProtect(!useProtect);
                  }}
                >
                  <span className="item-emoji">🛡️</span>
                  <span className="item-name">파괴방지</span>
                  <span className="item-count">x{getItemCount('protectScroll')}</span>
                </button>
                <button
                  className={`enhance-item-toggle ${useBlessing === 1 ? 'active' : ''} ${useBlessing !== 1 && getItemCount('blessScroll') === 0 ? 'disabled' : ''}`}
                  onPointerUp={() => {
                    if (useBlessing === 1 || getItemCount('blessScroll') > 0) setUseBlessing(useBlessing === 1 ? 0 : 1);
                  }}
                >
                  <span className="item-emoji">✨</span>
                  <span className="item-name">축복 +10%</span>
                  <span className="item-count">x{getItemCount('blessScroll')}</span>
                </button>
                <button
                  className={`enhance-item-toggle ${useBlessing === 2 ? 'active' : ''} ${useBlessing !== 2 && getItemCount('luckyScroll') === 0 ? 'disabled' : ''}`}
                  onPointerUp={() => {
                    if (useBlessing === 2 || getItemCount('luckyScroll') > 0) setUseBlessing(useBlessing === 2 ? 0 : 2);
                  }}
                >
                  <span className="item-emoji">🍀</span>
                  <span className="item-name">행운 +20%</span>
                  <span className="item-count">x{getItemCount('luckyScroll')}</span>
                </button>
              </div>
              <button className="enhance-btn" onClick={handleEnhanceClick}>
                <div className="enhance-content">
                  <span className="enhance-main-text">강화하기</span>
                  <span className="enhance-cost">🪙 {formatNumber(getEnhanceCost(currentPiece.rank, currentPiece.level))}</span>
                </div>
                <div className="enhance-info">
                  <span className="prob success">
                    {Math.min(100, getEnhanceSuccessRate(currentPiece.rank, currentPiece.level) + (useBlessing === 1 ? 10 : useBlessing === 2 ? 20 : 0))}% 성공
                  </span>
                  <span className="prob destroy">
                    {useProtect ? '0%' : `${getEnhanceDestroyRate(currentPiece.rank, currentPiece.level)}%`} 파괴
                  </span>
                </div>
                {lastEnhanceMsg && <div className="enhance-msg-overlay">{lastEnhanceMsg}</div>}
              </button>
            </div>
          )}

          {/* 성장 탭 */}
          {activeTab === 'upgrade' && (
            <div className="tab-panel scroll-panel">
              {useGameStore.getState().upgrades.map((u, idx) => {
                // 골드는 복리 성장, 공격력은 level-1, 나머지는 level
                const currentValue = u.id === 'goldPerClick'
                  ? 1 + (Math.pow(1.03, u.level - 1) - 1) / 0.03
                  : u.id === 'attackPower'
                    ? u.baseValue + u.increment * (u.level - 1)
                    : u.baseValue + u.increment * u.level;
                const isMaxed = u.id === 'critChance' && currentValue >= 100;
                return (
                  <div key={u.id} className={`list-item ${activeTutorial === 'growth' && tutorialStep === 1 && idx === 0 ? 'tutorial-highlight' : ''}`}>
                    <div className="list-item-info">
                      <div className="list-item-name">{u.name} Lv.{u.level}</div>
                      <div className="list-item-desc">현재 효과: {u.id === 'critChance' ? currentValue.toFixed(1) : Math.floor(currentValue)}{(u.id === 'critChance' || u.id === 'critDamage') ? '%' : ''}</div>
                    </div>
                    <LongPressButton
                      className={`list-item-btn ${isMaxed ? 'maxed' : gold >= getUpgradeCost(u) ? 'can-buy' : ''}`}
                      disabled={isMaxed}
                      onClick={() => {
                        if (isMaxed) return;
                        const success = useGameStore.getState().upgradestat(u.id);
                        if (success) {
                          vibrate(5);
                          soundManager.play('success');
                          if (activeTutorial === 'growth' && tutorialStep === 1) completeTutorial('growth');
                        }
                      }}
                      delay={300}
                      interval={80}
                    >
                      {isMaxed ? '✨ 최대' : `🪙 ${formatNumber(getUpgradeCost(u))}`}
                    </LongPressButton>
                  </div>
                );
              })}
            </div>
          )}

          {/* 도구 탭 */}
          {activeTab === 'auto' && (
            <div className="tab-panel scroll-panel">
              {useGameStore.getState().autoClickers.map((ac, idx) => {
                const status = getAutoClickerStatus(ac.id, ac.count, currentPiece.rank, currentPiece.level);
                const cost = getAutoClickerCost(ac);
                const canAfford = gold >= cost;
                const canBuyNow = status.canBuy && canAfford && !status.isLocked;

                return (
                  <div key={ac.id} className={`list-item ${status.isLocked ? 'locked' : ''} ${activeTutorial === 'tool' && tutorialStep === 1 && idx === 0 ? 'tutorial-highlight' : ''}`}>
                    <div className="list-item-emoji">{status.isLocked ? '🔒' : ac.emoji}</div>
                    <div className="list-item-info">
                      <div className="list-item-name">
                        {ac.name}
                        {!status.isLocked && (
                          <span className="count-badge">
                            {status.maxCount === Infinity ? `x${ac.count}` : `${ac.count}/${status.maxCount}`}
                          </span>
                        )}
                      </div>
                      <div className="list-item-desc">
                        {status.isLocked ? (
                          <span className="lock-requirement">🔐 {status.nextRequirement}</span>
                        ) : status.nextRequirement ? (
                          <span className="tier-requirement">다음 티어: {status.nextRequirement}</span>
                        ) : (
                          `초당 ${ac.clicksPerSec}회 클릭`
                        )}
                      </div>
                    </div>
                    <LongPressButton
                      className={`list-item-btn purple ${canBuyNow ? 'can-buy' : ''} ${status.isLocked ? 'locked-btn' : ''}`}
                      disabled={status.isLocked || !status.canBuy}
                      onClick={() => {
                        if (status.isLocked || !status.canBuy) return;
                        const success = useGameStore.getState().buyAutoClicker(ac.id);
                        if (success) {
                          vibrate(5);
                          soundManager.play('coin');
                          if (activeTutorial === 'tool' && tutorialStep === 1) completeTutorial('tool');
                        }
                      }}
                      delay={300}
                      interval={80}
                    >
                      {status.isLocked ? '🔒 잠김' : !status.canBuy ? '최대' : `🪙 ${formatNumber(cost)}`}
                    </LongPressButton>
                  </div>
                );
              })}
            </div>
          )}

          {/* 상점 탭 */}
          {activeTab === 'shop' && (
            <div className="tab-panel scroll-panel">
              {/* 📅 일일 보상 섹션 */}
              <div className="shop-section daily-rewards-section">
                <div className="shop-section-title">📅 일일 보상</div>
                <div className="daily-reward-item">
                  <div className="daily-reward-info">
                    <div className="daily-reward-icon">📺</div>
                    <div className="daily-reward-text">
                      <div className="daily-reward-name">무료 다이아</div>
                      <div className="daily-reward-desc">광고를 시청하고 💎 25 다이아 획득</div>
                    </div>
                  </div>
                  <button
                    className={`daily-reward-btn ${adFreeRubyUsed >= 3 ? 'disabled' : ''}`}
                    disabled={adFreeRubyUsed >= 3}
                    onClick={async () => {
                      if (adFreeRubyUsed >= 3) return;
                      try {
                        // 광고 재생
                        const rewarded = await showRewarded();
                        if (rewarded) {
                          soundManager.play('success');
                          vibrate([50, 50, 50]);
                          const result = claimFreeRuby();
                          if (result.success) {
                            setRewardFx({ id: Date.now(), text: `💎 ${result.ruby} 다이아 획득!` });
                            setTimeout(() => setRewardFx(null), 1500);
                          }
                        } else {
                          setRewardFx({ id: Date.now(), text: '⚠️ 광고를 불러올 수 없습니다' });
                          setTimeout(() => setRewardFx(null), 1500);
                        }
                      } catch (error) {
                        console.error('Ad error:', error);
                        setRewardFx({ id: Date.now(), text: '⚠️ 광고를 불러올 수 없습니다' });
                        setTimeout(() => setRewardFx(null), 1500);
                      }
                    }}
                  >
                    {adFreeRubyUsed >= 3 ? '오늘 완료' : `받기 (${3 - adFreeRubyUsed}/3)`}
                  </button>
                </div>
              </div>

              {/* 🛒 상점 아이템 섹션 */}
              <div className="shop-section">
                <div className="shop-section-title">🛒 아이템 구매</div>
              </div>
              {useGameStore.getState().shopItems.map(item => {
                const state = useGameStore.getState();
                const isPermanentOwned = (item.id === 'permBoost' && state.permanentBoost) ||
                                         (item.id === 'adRemove' && state.adRemoved);
                const canBuy = !isPermanentOwned && (item.wonPrice || (item.goldCost > 0 && gold >= item.goldCost) || (item.rubyCost > 0 && ruby >= item.rubyCost));

                // 골드 대량 구매 금액 계산
                const bulkGoldAmount = item.id === 'bulkGold' ? calculateBulkGold(state.stonesDestroyed) : 0;

                return (
                  <div key={item.id} className={`list-item ${isPermanentOwned ? 'owned' : ''}`}>
                    <div className="list-item-emoji">{item.emoji}</div>
                    <div className="list-item-info">
                      <div className="list-item-name">
                        {item.name}
                        {!isPermanentOwned && item.id !== 'permBoost' && item.id !== 'adRemove' && item.id !== 'bulkGold' && (
                          <span className="count-badge">x{item.count}</span>
                        )}
                        {isPermanentOwned && <span className="owned-badge">✓ 보유중</span>}
                      </div>
                      <div className="list-item-desc">
                        {item.id === 'bulkGold' ? `💰 ${formatNumber(bulkGoldAmount)} 골드 획득` : item.description}
                      </div>
                    </div>
                    <button
                      className={`list-item-btn blue ${canBuy ? 'can-buy' : ''} ${isPermanentOwned ? 'disabled' : ''}`}
                      disabled={isPermanentOwned}
                      onPointerUp={async () => {
                        if (isPermanentOwned) return;
                        // 원화 결제 아이템
                        if (item.wonPrice) {
                          vibrate(10);
                          // 실제 인앱결제 호출
                          const productId = item.id === 'permBoost' ? PRODUCT_IDS.PERMANENT_BOOSTER : PRODUCT_IDS.AD_REMOVAL;
                          const result = await purchaseProduct(productId);
                          if (!result.success) {
                            console.error('Purchase failed:', result.error);
                          }
                          return;
                        }
                        const success = useGameStore.getState().buyShopItem(item.id);
                        if (success) {
                          vibrate([30, 30]);
                          soundManager.play('success');
                          const msg = item.id === 'bulkGold'
                            ? `💰 ${formatNumber(bulkGoldAmount)} 골드 획득!`
                            : `✅ ${item.name} 구매 완료!`;
                          setRewardFx({ id: Date.now(), text: msg });
                          setTimeout(() => setRewardFx(null), 1500);
                        } else {
                          vibrate(10);
                        }
                      }}
                    >
                      {isPermanentOwned ? '보유중' : (item.wonPrice ? item.wonPrice : (item.rubyCost > 0 ? `💎 ${item.rubyCost}` : `🪙 ${formatNumber(item.goldCost)}`))}
                    </button>
                  </div>
                );
              })}

              {/* 💎 다이아 충전 섹션 (인앱결제) - 하단 배치 */}
              <div className="shop-section diamond-section">
                <div className="shop-section-title">💎 다이아 충전</div>
                <div className="diamond-packages">
                  {[
                    { id: PRODUCT_IDS.DIAMOND_100, amount: 100, bonus: 0, price: '₩1,200', popular: false },
                    { id: PRODUCT_IDS.DIAMOND_320, amount: 300, bonus: 20, price: '₩3,500', popular: false },
                    { id: PRODUCT_IDS.DIAMOND_550, amount: 500, bonus: 50, price: '₩5,900', popular: true },
                    { id: PRODUCT_IDS.DIAMOND_1000, amount: 900, bonus: 100, price: '₩11,000', popular: false },
                    { id: PRODUCT_IDS.DIAMOND_2000, amount: 1800, bonus: 200, price: '₩22,000', popular: false },
                  ].map(pkg => (
                    <button
                      key={pkg.id}
                      className={`diamond-package ${pkg.popular ? 'popular' : ''}`}
                      onPointerUp={async () => {
                        vibrate(10);
                        const result = await purchaseProduct(pkg.id);
                        if (!result.success) {
                          console.error('Purchase failed:', result.error);
                        }
                      }}
                    >
                      {pkg.popular && <span className="popular-badge">인기!</span>}
                      <span className="diamond-amount">💎 {pkg.amount}</span>
                      {pkg.bonus > 0 && <span className="diamond-bonus">+{pkg.bonus} 보너스</span>}
                      <span className="diamond-price">{pkg.price}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* 미션 탭 */}
          {activeTab === 'mission' && (
            <div className="tab-panel scroll-panel">
              {[...missions].sort((a, b) => {
                // 1. 완료됨 + 보상 안받음 (보상받기 가능) → 맨 위
                const aClaimable = a.completed && !a.claimed;
                const bClaimable = b.completed && !b.claimed;
                if (aClaimable && !bClaimable) return -1;
                if (!aClaimable && bClaimable) return 1;

                // 2. 이미 완료함 (claimed) → 맨 아래
                if (a.claimed && !b.claimed) return 1;
                if (!a.claimed && b.claimed) return -1;

                // 3. 진행 중인 미션은 진행률 높은 순으로
                const aProgress = a.current / a.target;
                const bProgress = b.current / b.target;
                return bProgress - aProgress;
              }).map(m => {
                const progress = Math.min(100, (m.current / m.target) * 100);
                return (
                  <div key={m.id} className={`mission-item ${m.completed ? 'completed' : ''} ${m.claimed ? 'claimed' : ''} ${activeTutorial === 'mission' && tutorialStep === 1 && m.completed && !m.claimed ? 'tutorial-highlight' : ''}`}>
                    <div className="mission-header">
                      <span className="mission-name">{m.name}</span>
                      <span className="mission-progress">{m.current}/{m.target}</span>
                    </div>
                    <div className="mission-progress-bar">
                      <div className="mission-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mission-footer">
                      <div className="mission-reward">
                        {m.reward.gold > 0 && <span>🪙 {formatNumber(m.reward.gold)}</span>}
                        {m.reward.ruby > 0 && <span>💎 {m.reward.ruby}</span>}
                      </div>
                      {m.completed && !m.claimed && (
                        <button
                          className="claim-btn"
                          onPointerUp={() => {
                            const success = claimMissionReward(m.id);
                            if (success) {
                              vibrate([50, 50, 50]);
                              soundManager.play('success');
                              setRewardFx({
                                id: Date.now(),
                                text: `🎁 ${m.reward.gold > 0 ? `+${formatNumber(m.reward.gold)} 골드` : ''} ${m.reward.ruby > 0 ? `+${m.reward.ruby} 다이아` : ''}`
                              });
                              setTimeout(() => setRewardFx(null), 2000);
                              if (activeTutorial === 'mission' && tutorialStep === 1) completeTutorial('mission');
                            }
                          }}
                        >
                          보상받기
                        </button>
                      )}
                      {m.claimed && <span className="mission-done">✓ 완료</span>}
                    </div>
                  </div>
                );
              })}

              {/* 업적 섹션 */}
              <div className="section-divider">🏆 업적</div>
              {[...achievements].sort((a, b) => {
                // 1. 해금됨 + 보상 안받음 → 맨 위
                const aClaimable = a.unlocked && !a.claimed;
                const bClaimable = b.unlocked && !b.claimed;
                if (aClaimable && !bClaimable) return -1;
                if (!aClaimable && bClaimable) return 1;

                // 2. 이미 완료함 (claimed) → 맨 아래
                if (a.claimed && !b.claimed) return 1;
                if (!a.claimed && b.claimed) return -1;

                return 0;
              }).map(ach => (
                <div key={ach.id} className={`mission-item ${ach.unlocked ? 'completed' : ''} ${ach.claimed ? 'claimed' : ''}`}>
                  <div className="mission-header">
                    <span className="mission-name">{ach.name}</span>
                    <span className="mission-progress">{ach.unlocked ? '달성!' : '미달성'}</span>
                  </div>
                  <div className="mission-desc">{ach.description}</div>
                  <div className="mission-footer">
                    <div className="mission-reward">
                      {ach.reward.gold > 0 && <span>🪙 {formatNumber(ach.reward.gold)}</span>}
                      {ach.reward.ruby > 0 && <span>💎 {ach.reward.ruby}</span>}
                    </div>
                    {ach.unlocked && !ach.claimed && (
                      <button
                        className="claim-btn"
                        onPointerUp={() => {
                          const success = claimAchievement(ach.id);
                          if (success) {
                            vibrate([50, 50, 50]);
                            soundManager.play('success');
                            setRewardFx({
                              id: Date.now(),
                              text: `🏆 ${ach.reward.gold > 0 ? `+${formatNumber(ach.reward.gold)} 골드` : ''} ${ach.reward.ruby > 0 ? `+${ach.reward.ruby} 다이아` : ''}`
                            });
                            setTimeout(() => setRewardFx(null), 2000);
                          }
                        }}
                      >
                        보상받기
                      </button>
                    )}
                    {ach.claimed && <span className="mission-done">✓ 완료</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 모달들 - app 밖, 하단 UI보다 위에 표시 */}
      {showStory && <StoryIntroModal onClose={onStoryClose} />}
      {showGuide && <GuideModal onClose={onGuideClose} />}
      {showAgeRating && <AgeRatingBadge onComplete={() => setShowAgeRating(false)} />}
      {showExitModal && <ExitConfirmModal onCancel={() => setShowExitModal(false)} onConfirm={handleExit} />}
      {showOfflineRewardModal && offlineRewardData && (
        <OfflineRewardModal data={offlineRewardData} onClaim={claimOfflineReward} />
      )}
      {showEndingModal && (
        <EndingModal
          currentPiece={currentPiece}
          prestigeBonus={prestigeBonus}
          onInfiniteMode={chooseInfiniteMode}
          onPrestige={choosePrestigeFromEnding}
        />
      )}
      {showInterstitialAd && (
        <InterstitialAdModal onClose={closeInterstitial} />
      )}
      {showDestroyRecoveryModal && pendingDestroyData && (
        <DestroyRecoveryModal
          pendingData={pendingDestroyData}
          adUsedToday={adDestructionPreventUsed}
          onWatchAd={watchAdToRecoverDestroy}
          onConfirmDestroy={confirmDestroy}
        />
      )}
      {showMoreMenu && <MoreMenuModal
        onClose={() => setShowMoreMenu(false)}
        onReset={() => useGameStore.getState().resetGame()}
        onShowGuide={() => setShowGuide(true)}
      />}

      {/* 강제 튜토리얼 오버레이 - 모달들과 같은 레벨 */}
      {activeTutorial && spotlightRect && (
        <>
          {/* Spotlight hole - 구멍 뚫린 유리창 효과 */}
          <div
            className="tutorial-spotlight"
            style={{
              position: 'fixed',
              left: spotlightRect.x,
              top: spotlightRect.y,
              width: spotlightRect.width,
              height: spotlightRect.height,
            }}
          />
          {/* 메시지 */}
          <div className="tutorial-message-container">
            <div className="tutorial-message">
              {activeTutorial === 'first-click' && '👆 바둑돌을 터치해서 깨보세요!'}
              {activeTutorial === 'growth' && tutorialStep === 0 && '📈 성장 탭을 눌러보세요!'}
              {activeTutorial === 'growth' && tutorialStep === 1 && '⬆️ 첫 번째 업그레이드를 구매하세요!'}
              {activeTutorial === 'tool' && tutorialStep === 0 && '🔧 도구 탭을 눌러보세요!'}
              {activeTutorial === 'tool' && tutorialStep === 1 && '🔨 첫 번째 도구를 구매하세요!'}
              {activeTutorial === 'mission' && tutorialStep === 0 && '📜 미션 탭을 눌러보세요!'}
              {activeTutorial === 'mission' && tutorialStep === 1 && '🎁 보상을 받으세요!'}
            </div>
          </div>
        </>
      )}

      {/* Reward Toast */}
      {rewardFx && (
        <div className="reward-toast">{rewardFx.text}</div>
      )}

    </div>
  );
}

export default App;
