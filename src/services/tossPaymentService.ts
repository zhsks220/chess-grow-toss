/**
 * 토스페이먼츠 결제 서비스
 *
 * 참고: 실제 토스페이먼츠 SDK 연동은 별도 설정 필요
 * - 토스페이먼츠 개발자 센터에서 API 키 발급
 * - SDK 설치 및 초기화
 */

// 상품 ID (토스페이먼츠에 등록할 ID)
export const PRODUCT_IDS = {
  // 비소비성 상품 (한 번 구매하면 영구)
  AD_REMOVAL: 'ad_removal',           // 광고 제거 ₩3,900 (토스 버전에서는 사용 안함)
  PERMANENT_BOOSTER: 'permanent_booster', // 영구 부스터 ₩5,900

  // 소비성 상품 (다이아 패키지)
  DIAMOND_100: 'diamond_100',     // 다이아 100개 ₩1,200
  DIAMOND_320: 'diamond_320',     // 다이아 300+20개 ₩3,500
  DIAMOND_550: 'diamond_550',     // 다이아 500+50개 ₩5,900
  DIAMOND_1000: 'diamond_1000',   // 다이아 900+100개 ₩11,000
  DIAMOND_2000: 'diamond_2000',   // 다이아 1800+200개 ₩22,000
};

// 상품 정보 타입
export interface ProductInfo {
  id: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  rubyAmount?: number;
}

// 구매 결과 타입
export interface PurchaseResult {
  success: boolean;
  productId?: string;
  error?: string;
}

// 콜백 타입
type PurchaseCallback = (productId: string) => void;

let isInitialized = false;
let purchaseApprovedCallback: PurchaseCallback | null = null;

// 상품 정보 (토스페이먼츠 연동 전 하드코딩)
const PRODUCT_INFO: Record<string, ProductInfo> = {
  [PRODUCT_IDS.PERMANENT_BOOSTER]: {
    id: PRODUCT_IDS.PERMANENT_BOOSTER,
    title: '영구 부스터',
    description: '영구적으로 보스 데미지 2배, 루비 획득량 2배',
    price: '₩5,900',
    priceAmount: 5900,
  },
  [PRODUCT_IDS.DIAMOND_100]: {
    id: PRODUCT_IDS.DIAMOND_100,
    title: '다이아 100개',
    description: '다이아 100개를 획득합니다',
    price: '₩1,200',
    priceAmount: 1200,
    rubyAmount: 100,
  },
  [PRODUCT_IDS.DIAMOND_320]: {
    id: PRODUCT_IDS.DIAMOND_320,
    title: '다이아 320개',
    description: '다이아 300개 + 보너스 20개',
    price: '₩3,500',
    priceAmount: 3500,
    rubyAmount: 320,
  },
  [PRODUCT_IDS.DIAMOND_550]: {
    id: PRODUCT_IDS.DIAMOND_550,
    title: '다이아 550개',
    description: '다이아 500개 + 보너스 50개',
    price: '₩5,900',
    priceAmount: 5900,
    rubyAmount: 550,
  },
  [PRODUCT_IDS.DIAMOND_1000]: {
    id: PRODUCT_IDS.DIAMOND_1000,
    title: '다이아 1000개',
    description: '다이아 900개 + 보너스 100개',
    price: '₩11,000',
    priceAmount: 11000,
    rubyAmount: 1000,
  },
  [PRODUCT_IDS.DIAMOND_2000]: {
    id: PRODUCT_IDS.DIAMOND_2000,
    title: '다이아 2000개',
    description: '다이아 1800개 + 보너스 200개',
    price: '₩22,000',
    priceAmount: 22000,
    rubyAmount: 2000,
  },
};

// 결제 서비스 초기화
export async function initializePurchases(onPurchaseApproved: PurchaseCallback): Promise<void> {
  if (isInitialized) return;

  try {
    purchaseApprovedCallback = onPurchaseApproved;

    // TODO: 토스페이먼츠 SDK 초기화
    // const tossPayments = await loadTossPayments('클라이언트_키');

    isInitialized = true;
    console.log('Toss Payment service initialized');
  } catch (error) {
    console.error('Failed to initialize Toss Payments:', error);
  }
}

// 상품 정보 조회
export function getProduct(productId: string): ProductInfo | null {
  return PRODUCT_INFO[productId] || null;
}

// 모든 상품 정보 조회
export function getAllProducts(): ProductInfo[] {
  return Object.values(PRODUCT_INFO);
}

// 상품 구매
export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  const product = PRODUCT_INFO[productId];
  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  try {
    // TODO: 토스페이먼츠 결제 요청
    // const payment = await tossPayments.requestPayment('카드', {
    //   amount: product.priceAmount,
    //   orderId: generateOrderId(),
    //   orderName: product.title,
    //   customerName: '사용자',
    //   successUrl: `${window.location.origin}/payment/success`,
    //   failUrl: `${window.location.origin}/payment/fail`,
    // });

    // 임시: 결제 성공 시뮬레이션 (실제 구현에서는 제거)
    console.log('Purchase requested for:', product.title);

    // 결제 성공 콜백
    if (purchaseApprovedCallback) {
      purchaseApprovedCallback(productId);
    }

    return { success: true, productId };
  } catch (error) {
    console.error('Purchase failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// 구매 복원 (비소비성 상품)
export async function restorePurchases(): Promise<string[]> {
  // TODO: 토스페이먼츠에서 구매 내역 조회
  // 서버에서 사용자의 구매 기록을 확인해야 함
  console.log('Restore purchases not implemented for Toss yet');
  return [];
}

// 특정 상품 소유 여부 확인
export function isProductOwned(productId: string): boolean {
  // TODO: 서버에서 구매 기록 확인
  // localStorage나 서버에서 확인해야 함
  const owned = localStorage.getItem(`toss_owned_${productId}`);
  return owned === 'true';
}

// 상품 소유 상태 저장 (구매 성공 시 호출)
export function setProductOwned(productId: string): void {
  localStorage.setItem(`toss_owned_${productId}`, 'true');
}

// 상품 가격 조회
export function getProductPrice(productId: string): string {
  const product = PRODUCT_INFO[productId];
  return product?.price || '가격 정보 없음';
}
