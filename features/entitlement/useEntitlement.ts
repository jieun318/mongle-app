// 수익화 진입을 위한 entitlement 훅.
//
// 현재 상태: 모든 사용자 isPremium=false (광고/결제 흐름 검증을 위해).
// 추후 도입 시 이 훅의 구현만 교체:
//   - isPremium: RevenueCat / Apple IAP / Google Billing 구독 상태로 대체
//   - unlockDetailToday: 광고 시청 콜백 ( AdMob rewarded ad 등 ) 에서 호출
//   - detailUnlockedToday: 자정 기준 리셋 (오늘 광고 시청했으면 true)
//
// UX 결정 (2026-05-22): 카테고리별 잠금 → "오늘의 자세히 보기" 단일 게이트로 변경.
//   - 무료 모달은 가볍게 (종합 메시지 + 행운 + 팁)
//   - 카테고리 5장은 게이트 1번에 모두 펼쳐짐 = 광고 1회 / 프리미엄 1회로 충분
//
// 잠금 UI 테스트가 필요할 때 DEV_FORCE_PREMIUM 토글로 즉시 해제.

import { useCallback, useState } from "react";

const DEV_FORCE_PREMIUM = false;

export interface Entitlement {
  isPremium: boolean;
  detailUnlockedToday: boolean;
  // 종합 운세 외 카테고리 디테일을 볼 수 있는 상태인지 — 위 둘의 OR
  canSeeDetail: boolean;
  // 광고 시청 등으로 오늘 1회 디테일 해제 (자정에 리셋되어야 함 — 추후 처리)
  unlockDetailToday: () => void;
}

export function useEntitlement(): Entitlement {
  const [detailUnlockedToday, setDetailUnlockedToday] = useState(false);

  const isPremium = DEV_FORCE_PREMIUM;
  const canSeeDetail = isPremium || detailUnlockedToday;

  const unlockDetailToday = useCallback(() => {
    setDetailUnlockedToday(true);
  }, []);

  return { isPremium, detailUnlockedToday, canSeeDetail, unlockDetailToday };
}
