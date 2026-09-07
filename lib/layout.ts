import { useSafeAreaInsets } from "react-native-safe-area-context";

// 화면 아래쪽 여백을 한 곳에서 계산한다.
//
// 왜 필요한가 — 예전에는 화면마다 `paddingBottom: 60`, `120` 처럼 숫자를 직접
// 박아뒀다. 기기마다 다른 값(시스템 내비 높이)을 상수로 고정한 셈이라,
// 3버튼 내비게이션 기기에서는 마지막 버튼이 내비바에 물려 잘렸다.
// 반대로 인셋만 더하면 제스처 내비 기기가 깨진다 — 인셋이 0이나 아주 작게
// 잡히는데 화면 맨 아래엔 여전히 제스처 핸들이 깔려 있어서, 탭이 앱이 아니라
// 시스템으로 먹힌다. 그래서 "인셋과 최소 간격 중 큰 쪽"을 쓴다.

/** 시스템 내비/제스처 영역 위로 항상 확보하는 최소 간격 */
export const MIN_SYSTEM_GAP = 12;

/** 떠 있는 BottomNav 를 화면 아래에서 띄우는 기본 거리 */
export const BOTTOM_NAV_GAP = 20;

/** BottomNav 알약 자체의 높이 (paddingVertical 14×2 + 아이콘 24) */
export const BOTTOM_NAV_HEIGHT = 52;

export interface BottomSpace {
  /**
   * 시스템 내비/제스처 영역이 먹는 높이.
   * 화면 고유의 디자인 여백에 **더해서** 쓴다 — 대체하지 말 것.
   * 예: `paddingBottom: 60 + space.system`
   */
  system: number;
  /** BottomNav 를 화면 아래에서 띄울 거리 */
  navOffset: number;
  /** BottomNav 바로 위에 떠야 하는 요소(챗봇 FAB 등)의 bottom */
  aboveNav: number;
  /** BottomNav 가 떠 있는 탭 화면에서 스크롤 콘텐츠의 끝 여백 */
  withNav: number;
}

export function useBottomSpace(): BottomSpace {
  const insets = useSafeAreaInsets();
  const system = Math.max(insets.bottom, MIN_SYSTEM_GAP);

  return {
    system,
    navOffset: BOTTOM_NAV_GAP + system,
    // 알약 위로 20 띄운다.
    aboveNav: BOTTOM_NAV_GAP + BOTTOM_NAV_HEIGHT + 20 + system,
    // 알약에 가리지 않도록 알약 높이만큼 비우고 36 더. 인셋이 0인 기기에서
    // 기존 하드코딩 값(120)과 같아지도록 맞춘 숫자다 — 어느 화면도 예전보다
    // 좁아지지 않는다.
    withNav: BOTTOM_NAV_GAP + BOTTOM_NAV_HEIGHT + 36 + system,
  };
}
