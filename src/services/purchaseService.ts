/**
 * Apps in Toss 인앱 결제 서비스
 *
 * SDK: @apps-in-toss/web-framework
 * 문서: https://developers-apps-in-toss.toss.im/iap/develop.html
 */

import { IAP } from '@apps-in-toss/web-framework';

// 상품 ID (토스 개발자 콘솔에서 발급)
export const PRODUCT_IDS = {
  // 비소비성 상품 (한 번 구매하면 영구)
  AD_REMOVAL: 'ait.0000017178.795abd69.c494162ae4.8057490942',
  PERMANENT_BOOSTER: 'ait.0000017178.8a11ea9b.a57f64af2d.8057553824',

  // 소비성 상품 (다이아 패키지)
  DIAMOND_100: 'ait.0000017178.5d4d4d29.d8bdeff469.8057600115',
  DIAMOND_320: 'ait.0000017178.0d9419f4.c1009700b5.8057639095',
  DIAMOND_550: 'ait.0000017178.925d685e.2c64694c75.8057690543',
  DIAMOND_1000: 'ait.0000017178.95386b8e.6a31190c18.8057721282',
  DIAMOND_2000: 'ait.0000017178.81ff5a8b.3c7806322f.8057769831',
};

// 다이아 수량 매핑
export const DIAMOND_AMOUNTS: Record<string, number> = {
  [PRODUCT_IDS.DIAMOND_100]: 100,
  [PRODUCT_IDS.DIAMOND_320]: 320,   // 300 + 20 보너스
  [PRODUCT_IDS.DIAMOND_550]: 550,   // 500 + 50 보너스
  [PRODUCT_IDS.DIAMOND_1000]: 1000, // 900 + 100 보너스
  [PRODUCT_IDS.DIAMOND_2000]: 2000, // 1800 + 200 보너스
};

// 상품 가격 정보 (표시용)
export const PRODUCT_PRICES: Record<string, string> = {
  [PRODUCT_IDS.AD_REMOVAL]: '₩3,900',
  [PRODUCT_IDS.PERMANENT_BOOSTER]: '₩5,900',
  [PRODUCT_IDS.DIAMOND_100]: '₩1,200',
  [PRODUCT_IDS.DIAMOND_320]: '₩3,500',
  [PRODUCT_IDS.DIAMOND_550]: '₩5,900',
  [PRODUCT_IDS.DIAMOND_1000]: '₩11,000',
  [PRODUCT_IDS.DIAMOND_2000]: '₩22,000',
};

// 구매 결과 타입
export interface PurchaseResult {
  success: boolean;
  productId?: string;
  orderId?: string;
  error?: string;
}

// 콜백 타입
type PurchaseSuccessCallback = (productId: string, orderId: string) => void | Promise<void>;
type PurchaseErrorCallback = (error: unknown) => void;

// 현재 cleanup 함수 저장
let currentCleanup: (() => void) | null = null;

// 상품 구매
export function purchaseProduct(
  productId: string,
  onSuccess: PurchaseSuccessCallback,
  onError?: PurchaseErrorCallback
): () => void {
  // 기존 cleanup 호출
  currentCleanup?.();

  const cleanup = IAP.createOneTimePurchaseOrder({
    options: {
      sku: productId,
      processProductGrant: async ({ orderId }) => {
        // 상품 지급 처리
        console.log('Processing product grant:', productId, orderId);
        try {
          await onSuccess(productId, orderId);
          return true;
        } catch (error) {
          console.error('Product grant failed:', error);
          return false;
        }
      },
    },
    onEvent: (event) => {
      if (event.type === 'success') {
        console.log('Purchase successful:', event.data);
      }
    },
    onError: (error) => {
      console.error('Purchase error:', error);
      onError?.(error);
    },
  });

  currentCleanup = cleanup;
  return cleanup;
}

// 상품 목록 가져오기
export async function getProductList() {
  try {
    const result = await IAP.getProductItemList();
    return result?.products || [];
  } catch (error) {
    console.error('Failed to get product list:', error);
    return [];
  }
}

// 대기 중인 주문 가져오기
export async function getPendingOrders() {
  try {
    const result = await IAP.getPendingOrders();
    return result?.orders || [];
  } catch (error) {
    console.error('Failed to get pending orders:', error);
    return [];
  }
}

// 다이아 수량 가져오기
export function getDiamondAmount(productId: string): number {
  return DIAMOND_AMOUNTS[productId] || 0;
}

// 상품 가격 가져오기
export function getProductPrice(productId: string): string {
  return PRODUCT_PRICES[productId] || '가격 정보 없음';
}

// 비소비성 상품인지 확인
export function isNonConsumable(productId: string): boolean {
  return productId === PRODUCT_IDS.AD_REMOVAL || productId === PRODUCT_IDS.PERMANENT_BOOSTER;
}

// 다이아 상품인지 확인
export function isDiamondProduct(productId: string): boolean {
  return productId in DIAMOND_AMOUNTS;
}

// Promise 기반 구매 함수 (App.tsx 호환용)
export async function purchaseProductAsync(productId: string): Promise<PurchaseResult> {
  return new Promise((resolve) => {
    console.log('Starting purchase for:', productId);

    const cleanup = purchaseProduct(
      productId,
      (pid, orderId) => {
        console.log('Purchase success callback:', pid, orderId);
        cleanup();
        resolve({ success: true, productId: pid, orderId });
      },
      (error) => {
        console.error('Purchase error callback:', error);
        cleanup();
        resolve({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    );
  });
}

// 구매 복원 (비소비성 상품)
export async function restorePurchases(): Promise<string[]> {
  try {
    const result = await IAP.getCompletedOrRefundedOrders();
    if (!result?.orders) return [];

    // COMPLETED 상태인 비소비성 상품만 필터링
    const restoredProducts = result.orders
      .filter(order => order.status === 'COMPLETED' && isNonConsumable(order.sku))
      .map(order => order.sku);

    console.log('Restored products:', restoredProducts);
    return restoredProducts;
  } catch (error) {
    console.error('Restore failed:', error);
    return [];
  }
}

// 결제 서비스 초기화 (호환성 유지)
export async function initializePurchases(onPurchaseApproved: (productId: string) => void): Promise<void> {
  console.log('Purchase service initialized');
  // 대기 중인 주문 처리
  try {
    const pendingOrders = await getPendingOrders();
    for (const order of pendingOrders) {
      console.log('Processing pending order:', order.orderId);
      onPurchaseApproved(order.sku);
      // 상품 지급 완료 알림
      await IAP.completeProductGrant({ params: { orderId: order.orderId } });
    }
  } catch (error) {
    console.error('Failed to process pending orders:', error);
  }
}
