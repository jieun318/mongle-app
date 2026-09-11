import { createContext, useContext } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * 앱 셸의 최대 폭.
 *
 * 이 앱은 폰 기준으로 짠 레이아웃인데 웹(react-native-web)에서는 창 너비가
 * 그대로 들어와 데스크톱에서 전체가 늘어난다. AppShell 이 이 폭으로 묶고
 * 가운데 정렬해 "가운데 뜬 폰 앱"처럼 보이게 한다.
 * 폰(≤480dp)에서는 상한에 걸리지 않으므로 레이아웃이 전혀 바뀌지 않는다.
 */
export const SHELL_MAX_W = 480;

/**
 * 셸 안에서 쓸 수 있는 실제 가로 폭.
 *
 * 셸 안의 화면이 useWindowDimensions() 를 그대로 쓰면 창 너비(예: 1512)를
 * 받아 셸 밖까지 계산해 버린다(해의 호, 구름 이동 범위, 날씨 파티클 등).
 * AppShell 과 같은 상수를 쓰므로 측정 없이 항상 셸 폭과 일치한다.
 */
/**
 * AppShell 이 onLayout 으로 잰 실제 셸 폭. 프로바이더 밖이면 null.
 */
export const ShellWidthContext = createContext<number | null>(null);

export function useShellWidth(): number {
  const measured = useContext(ShellWidthContext);
  const { width } = useWindowDimensions();

  // 측정값이 있으면 그게 정답이다.
  //
  // useWindowDimensions 만으로는 안 된다 — Expo 정적 익스포트에서는 프리렌더가
  // Node 에서 돌아 window 가 없고(0), 브라우저에서 하이드레이션된 뒤에도 리사이즈
  // 이벤트가 오기 전까지 0 으로 남는다(실측 확인: innerWidth 1280 인데 훅은 0).
  // 그래서 검색 카드 폭이 floor((0-60)/3) = -20px 로 HTML 에 박혔고, 브라우저가
  // 음수를 무시해 카드가 내용 크기(~60px)로 쪼그라들어 한 줄에 8개가 들어갔다.
  if (measured != null && measured > 0) return measured;

  // 아직 레이아웃 전(첫 렌더)인 경우. 0 을 그대로 흘리면 위 증상이 재현되므로
  // 셸 최대 폭으로 가정한다. 레이아웃 직후 측정값으로 교정된다.
  return Math.min(width || SHELL_MAX_W, SHELL_MAX_W);
}

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
