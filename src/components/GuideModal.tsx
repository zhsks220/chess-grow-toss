import React, { useState } from 'react';
import './GuideModal.css';

// 가이드 이미지 import (나중에 실제 이미지로 교체)
// import guideClick from '../assets/guide/guide_click.png';
// import guideEnhance from '../assets/guide/guide_enhance.png';
// ...

interface GuideStep {
  id: string;
  title: string;
  description: string;
  image?: string; // 이미지 경로 (선택)
  icon: string;   // 이모지 아이콘
  tip?: string;   // 추가 팁
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'click',
    title: '바둑돌 클릭!',
    description: '화면의 바둑돌을 탭해서\n골드를 획득하세요!',
    icon: '👆',
    tip: '연속 탭으로 빠르게 파괴!'
  },
  {
    id: 'enhance',
    title: '강화하기',
    description: '강화 탭에서 골드를 사용해\n공격력을 올리세요!',
    icon: '⬆️',
    tip: '레벨이 오를수록 비용 증가'
  },
  {
    id: 'rank',
    title: '계급 승진',
    description: '이병부터 시작해서\n대장까지 승진하세요!',
    icon: '🎖️',
    tip: '높은 계급 = 더 강한 공격력'
  },
  {
    id: 'chess',
    title: '체스말 진화',
    description: '폰 → 나이트 → 비숍 → 룩\n→ 퀸 → 킹으로 진화!',
    icon: '♟️',
    tip: '대장 달성 시 다음 체스말 해금'
  },
  {
    id: 'tools',
    title: '도구 장착',
    description: '도구 탭에서 자동 파괴\n장비를 구매하세요!',
    icon: '🔧',
    tip: '도구가 자동으로 돌 파괴'
  },
  {
    id: 'boss',
    title: '보스 도전',
    description: '일정 수 파괴 후\n강력한 보스가 출현!',
    icon: '👹',
    tip: '보스 처치 시 대량 보상!'
  },
  {
    id: 'goal',
    title: '최종 목표',
    description: '킹갓제네럴임페리얼 체스킹이 되어\n체스 왕국을 지켜주세요!',
    icon: '👑',
    tip: '강화와 진화를 거듭해 최강이 되자!'
  }
];

interface GuideModalProps {
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = GUIDE_STEPS[currentStep];
  const isLastStep = currentStep === GUIDE_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="guide-overlay">
      <div className="guide-modal">
        {/* 헤더 */}
        <div className="guide-header">
          <span className="guide-title">게임 가이드</span>
          <button className="guide-skip-btn" onClick={handleSkip}>
            건너뛰기
          </button>
        </div>

        {/* 진행 표시 */}
        <div className="guide-progress">
          {GUIDE_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`guide-progress-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
            />
          ))}
        </div>

        {/* 콘텐츠 */}
        <div className="guide-content">
          {/* 이미지 영역 (placeholder 또는 실제 이미지) */}
          <div className="guide-image-container">
            {step.image ? (
              <img src={step.image} alt={step.title} className="guide-image" />
            ) : (
              <div className="guide-icon-placeholder">
                <span className="guide-icon">{step.icon}</span>
              </div>
            )}
          </div>

          {/* 텍스트 영역 */}
          <h2 className="guide-step-title">{step.title}</h2>
          <p className="guide-step-description">{step.description}</p>

          {step.tip && (
            <div className="guide-tip">
              <span className="tip-icon">💡</span>
              <span className="tip-text">{step.tip}</span>
            </div>
          )}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="guide-navigation">
          <button
            className="guide-nav-btn prev"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            ◀ 이전
          </button>

          <span className="guide-page-indicator">
            {currentStep + 1} / {GUIDE_STEPS.length}
          </span>

          <button
            className="guide-nav-btn next"
            onClick={handleNext}
          >
            {isLastStep ? '시작하기! 🎮' : '다음 ▶'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideModal;
