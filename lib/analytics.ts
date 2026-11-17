// 사용 분석 — 앱(Android/iOS)용. 웹은 lib/analytics.web.ts 를 Metro 가 대신 고른다.
// 원칙과 이벤트 목록은 lib/analyticsEvents.ts 참고.
//
// 키(EXPO_PUBLIC_POSTHOG_KEY)는 eas.json production 프로필에만 있다. 키가 없으면(개발·preview)
// 아무것도 보내지 않고 모든 함수가 조용히 넘어간다.
import AsyncStorage from "@react-native-async-storage/async-storage";
import PostHog from "posthog-react-native";
import {
  ANALYTICS_OPT_OUT_KEY,
  POSTHOG_HOST,
  POSTHOG_KEY,
  type AnalyticsEventName,
  type TrackArgs,
} from "./analyticsEvents";

let client: PostHog | null = null;

/** 앱 시작 시 한 번 (app/_layout.tsx). 저장된 '이용 통계 보내기' 설정을 반영한다. */
export function initAnalytics(): void {
  if (client || !POSTHOG_KEY) return;
  client = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    // 계정과 연결하지 않는 익명 집계 — identify 를 부르지 않으므로 사람 프로필도 만들지 않는다.
    personProfiles: "identified_only",
    // IP 는 PostHog 프로젝트에서 버린다(Discard client IP data). 위치 추정도 하지 않는다.
    disableGeoip: true,
    // 앱 열림·백그라운드 전환 — "어디서 나가는지"(마지막 화면 다음 Application Backgrounded)
    captureAppLifecycleEvents: true,
    // 세션 리플레이·오류 자동 수집(오류 메시지에 입력한 글이 섞일 수 있음) 끔
    enableSessionReplay: false,
    errorTracking: { autocapture: false },
    // 원격 설정·기능 플래그·설문은 쓰지 않는다 — 대시보드에서 켜도 앱 동작이 바뀌지 않게.
    disableRemoteConfig: true,
    preloadFeatureFlags: false,
    sendFeatureFlagEvent: false,
    disableSurveys: true,
  });
  // 터치 자동 수집(autocapture)은 PostHogProvider 를 쓸 때만 켜진다 — 이 앱은 Provider 를 쓰지 않는다.

  AsyncStorage.getItem(ANALYTICS_OPT_OUT_KEY)
    .then((v) => {
      if (v === "1") client?.optOut();
    })
    .catch(() => {});
}

export function track<K extends AnalyticsEventName>(name: K, ...args: TrackArgs<K>): void {
  if (!client) return;
  client.capture(name, args[0]);
}

/** 화면 이동 — screenNameFromSegments 로 만든 패턴 이름만 넘긴다. */
export function trackScreen(name: string): void {
  if (!client) return;
  client.screen(name);
}

/** '이용 통계 보내기' 현재 값 (기본 켜짐) */
export async function getAnalyticsEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ANALYTICS_OPT_OUT_KEY)) !== "1";
  } catch {
    return true;
  }
}

export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ANALYTICS_OPT_OUT_KEY, enabled ? "0" : "1");
  if (!client) return;
  if (enabled) await client.optIn();
  else await client.optOut();
}
