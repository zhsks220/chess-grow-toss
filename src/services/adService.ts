/**
 * Apps in Toss 광고 서비스
 *
 * SDK: @apps-in-toss/web-framework
 * 문서: https://developers-apps-in-toss.toss.im/ads/develop.html
 */

import { GoogleAdMob } from '@apps-in-toss/web-framework';

// 광고 ID 설정
const AD_CONFIG = {
  // 실제 광고 ID (프로덕션용 - 토스 개발자 콘솔에서 발급)
  interstitialId: 'ait.v2.live.ba9d5f635fd340ea',
  rewardedId: 'ait.v2.live.1400f612a2cf4751',

  // 테스트 광고 ID (개발용)
  testInterstitialId: 'ait-ad-test-interstitial-id',
  testRewardedId: 'ait-ad-test-rewarded-id',
};

// 개발 모드 여부 (true면 테스트 광고 사용)
const IS_DEV_MODE = false; // 프로덕션 모드

// 광고 준비 상태 추적
let isRewardedAdReady = false;
let isInterstitialAdReady = false;
let isPreparingRewarded = false;
let isPreparingInterstitial = false;

// cleanup 함수 저장 (광고 로드 취소용)
let _rewardedCleanup: (() => void) | null = null;
let _interstitialCleanup: (() => void) | null = null;

// 현재 사용할 광고 ID
const getInterstitialId = () => IS_DEV_MODE ? AD_CONFIG.testInterstitialId : AD_CONFIG.interstitialId;
const getRewardedId = () => IS_DEV_MODE ? AD_CONFIG.testRewardedId : AD_CONFIG.rewardedId;

// SDK 지원 여부 확인
function isAdMobSupported(): boolean {
  return GoogleAdMob.loadAppsInTossAdMob.isSupported();
}

// ============ 전면 광고 (Interstitial) ============

// 전면 광고 준비
export async function prepareInterstitial(): Promise<void> {
  if (isPreparingInterstitial || isInterstitialAdReady) {
    return;
  }

  // SDK 지원 여부 확인
  if (!isAdMobSupported()) {
    console.log('GoogleAdMob not supported in this environment');
    return;
  }

  try {
    isPreparingInterstitial = true;

    // 기존 cleanup 호출 (있으면)
    _interstitialCleanup?.();

    _interstitialCleanup = GoogleAdMob.loadAppsInTossAdMob({
      options: { adGroupId: getInterstitialId() },
      onEvent: (event) => {
        if (event.type === 'loaded') {
          console.log('Interstitial ad loaded');
          isInterstitialAdReady = true;
          isPreparingInterstitial = false;
        }
      },
      onError: (error) => {
        console.error('Interstitial ad failed to load:', error);
        isInterstitialAdReady = false;
        isPreparingInterstitial = false;
      },
    });
  } catch (error) {
    isPreparingInterstitial = false;
    isInterstitialAdReady = false;
    console.error('Failed to prepare interstitial:', error);
  }
}

// 전면 광고 표시
export async function showInterstitial(): Promise<boolean> {
  if (!isAdMobSupported()) {
    console.log('GoogleAdMob not supported');
    return false;
  }

  if (!isInterstitialAdReady) {
    console.log('Interstitial ad not ready, skipping...');
    prepareInterstitial();
    return false;
  }

  return new Promise((resolve) => {
    isInterstitialAdReady = false;

    const cleanup = GoogleAdMob.showAppsInTossAdMob({
      options: { adGroupId: getInterstitialId() },
      onEvent: (event) => {
        console.log('Interstitial event:', event.type);
        // 광고가 표시되면 성공으로 처리
        if (event.type === 'show') {
          // 광고 표시 성공, 사용자가 닫을 때까지 기다림
        }
        // impression 이벤트로 광고 노출 완료 확인
        if (event.type === 'impression') {
          cleanup?.();
          prepareInterstitial();
          resolve(true);
        }
        // 클릭 시에도 완료로 처리
        if (event.type === 'clicked') {
          cleanup?.();
          prepareInterstitial();
          resolve(true);
        }
      },
      onError: (error) => {
        console.error('Failed to show interstitial:', error);
        cleanup?.();
        prepareInterstitial();
        resolve(false);
      },
    });
  });
}

// ============ 보상형 광고 (Rewarded) ============

// 보상형 광고 준비
export async function prepareRewarded(): Promise<void> {
  if (isPreparingRewarded || isRewardedAdReady) {
    return;
  }

  if (!isAdMobSupported()) {
    console.log('GoogleAdMob not supported in this environment');
    return;
  }

  try {
    isPreparingRewarded = true;

    // 기존 cleanup 호출 (있으면)
    _rewardedCleanup?.();

    _rewardedCleanup = GoogleAdMob.loadAppsInTossAdMob({
      options: { adGroupId: getRewardedId() },
      onEvent: (event) => {
        if (event.type === 'loaded') {
          console.log('Rewarded ad loaded');
          isRewardedAdReady = true;
          isPreparingRewarded = false;
        }
      },
      onError: (error) => {
        console.error('Rewarded ad failed to load:', error);
        isRewardedAdReady = false;
        isPreparingRewarded = false;
      },
    });
  } catch (error) {
    isPreparingRewarded = false;
    isRewardedAdReady = false;
    console.error('Failed to prepare rewarded:', error);
  }
}

// 보상형 광고 준비 상태 확인
export function isRewardedReady(): boolean {
  return isRewardedAdReady;
}

// 보상형 광고 표시 및 보상 받기
export async function showRewarded(): Promise<boolean> {
  if (!isAdMobSupported()) {
    console.log('GoogleAdMob not supported');
    return false;
  }

  // 광고가 준비되지 않았으면 먼저 준비
  if (!isRewardedAdReady) {
    console.log('Rewarded ad not ready, preparing...');

    // 준비 중이 아니면 새로 준비하고 대기
    if (!isPreparingRewarded) {
      const loadSuccess = await new Promise<boolean>((resolve) => {
        isPreparingRewarded = true;

        // 기존 cleanup 호출
        _rewardedCleanup?.();
        _rewardedCleanup = null;

        // 타임아웃 설정 (10초)
        const loadTimeout = setTimeout(() => {
          console.error('Rewarded ad load timeout');
          isPreparingRewarded = false;
          isRewardedAdReady = false;
          resolve(false);
        }, 10000);

        _rewardedCleanup = GoogleAdMob.loadAppsInTossAdMob({
          options: { adGroupId: getRewardedId() },
          onEvent: (event) => {
            if (event.type === 'loaded') {
              console.log('Rewarded ad prepared inline');
              clearTimeout(loadTimeout);
              isRewardedAdReady = true;
              isPreparingRewarded = false;
              resolve(true);
            }
          },
          onError: (error) => {
            console.error('Failed to prepare rewarded inline:', error);
            clearTimeout(loadTimeout);
            isPreparingRewarded = false;
            isRewardedAdReady = false;
            resolve(false);
          },
        });
      });

      if (!loadSuccess) {
        return false;
      }
    } else {
      // 준비 중이면 잠시 대기 (최대 5초, 500ms 간격으로 체크)
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (isRewardedAdReady) break;
        if (!isPreparingRewarded) break; // 준비 실패
      }
      if (!isRewardedAdReady) {
        console.error('Rewarded ad still not ready after waiting');
        return false;
      }
    }
  }

  // 광고 표시
  return new Promise((resolve) => {
    isRewardedAdReady = false;
    let rewarded = false;
    let resolved = false;

    const finalize = (result: boolean) => {
      if (resolved) return;
      resolved = true;
      cleanup?.();
      prepareRewarded(); // 다음 광고 미리 준비
      resolve(result);
    };

    const cleanup = GoogleAdMob.showAppsInTossAdMob({
      options: { adGroupId: getRewardedId() },
      onEvent: (event) => {
        console.log('Rewarded event:', event.type);

        // 보상 획득 이벤트
        if (event.type === 'userEarnedReward') {
          console.log('Reward earned:', event.data);
          rewarded = true;
        }

        // 광고 닫힘 - 보상 획득 여부와 함께 최종 결과 반환
        if (event.type === 'dismissed') {
          console.log('Rewarded ad dismissed, rewarded:', rewarded);
          finalize(rewarded);
        }

        // 광고 표시 실패
        if (event.type === 'failedToShow') {
          console.log('Rewarded ad failed to show');
          finalize(false);
        }
      },
      onError: (error) => {
        console.error('Failed to show rewarded:', error);
        finalize(false);
      },
    });

    // 타임아웃: 60초 후에도 완료되지 않으면 실패 처리
    setTimeout(() => {
      if (!resolved) {
        console.log('Rewarded ad timeout');
        finalize(false);
      }
    }, 60000);
  });
}

// ============ 초기화 ============

// 앱 시작 시 호출
export async function setupAds(): Promise<void> {
  if (!isAdMobSupported()) {
    console.log('GoogleAdMob not supported, skipping ad setup');
    return;
  }

  console.log('Apps in Toss Ad SDK initializing...');

  // 광고들을 미리 준비
  await Promise.all([
    prepareInterstitial(),
    prepareRewarded(),
  ]);

  console.log('Ads setup complete');
}

// AdMob 초기화 (호환성을 위해 유지)
export async function initializeAdMob(): Promise<void> {
  await setupAds();
}
