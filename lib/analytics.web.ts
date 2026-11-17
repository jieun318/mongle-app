// 사용 분석 — 웹(mongle-app.vercel.app)용. 앱은 lib/analytics.ts.
// 원칙과 이벤트 목록은 lib/analyticsEvents.ts 참고. 같은 PostHog 프로젝트로 보낸다.
//
// 키(EXPO_PUBLIC_POSTHOG_KEY)는 Vercel Production 환경 변수에만 있다. expo export 때 코드에
// 들어가므로 키를 바꾸면 다시 배포해야 한다. 키가 없으면 아무것도 보내지 않는다.
import posthog, { type CaptureResult } from "posthog-js";
import {
  ANALYTICS_OPT_OUT_KEY,
  POSTHOG_HOST,
  POSTHOG_KEY,
  type AnalyticsEventName,
  type TrackArgs,
} from "./analyticsEvents";

let started = false;
/** 지금 화면의 패턴 이름 (/search/[category]). 모든 이벤트의 URL 을 이걸로 바꿔 보낸다. */
let currentScreen: string | null = null;

const isBrowser = typeof window !== "undefined";

// URL 이 들어가는 속성 — 쿼리(?q=검색어)·해시(#access_token=…, /auth-callback)를 지운다.
const URL_KEYS = [
  "$current_url",
  "$referrer",
  "$initial_current_url",
  "$initial_referrer",
  "$prev_pageview_url",
  "$session_entry_url",
  "$session_entry_referrer",
];
const PATH_KEYS = [
  "$pathname",
  "$initial_pathname",
  "$prev_pageview_pathname",
  "$session_entry_pathname",
];

function stripUrl(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const cut = v.search(/[?#]/);
  return cut === -1 ? v : v.slice(0, cut);
}

function scrub(props: Record<string, unknown> | undefined): void {
  if (!props) return;
  for (const k of URL_KEYS) if (k in props) props[k] = stripUrl(props[k]);
  for (const k of PATH_KEYS) if (k in props) props[k] = stripUrl(props[k]);
  // 이 앱 안의 URL 은 실제 경로 대신 화면 패턴으로 — 앱의 $screen_name 과 같은 이름이 된다.
  if (currentScreen && isBrowser) {
    props.$current_url = window.location.origin + currentScreen;
    props.$pathname = currentScreen;
  }
}

function beforeSend(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  scrub(event.properties);
  scrub(event.$set as Record<string, unknown> | undefined);
  scrub(event.$set_once as Record<string, unknown> | undefined);
  return event;
}

function readOptOut(): boolean {
  try {
    return window.localStorage.getItem(ANALYTICS_OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * 앱 시작 시 한 번 (app/_layout.tsx). 정적 렌더링(서버) 중에는 아무것도 하지 않는다.
 * '이용 통계 보내기'가 꺼져 있으면 초기화하지 않는다 — 초기화만 해도 설정 파일·web vitals
 * 스크립트를 PostHog 서버에서 받아 오므로, 끈 사람의 브라우저는 PostHog 에 접속하지 않게 한다.
 */
export function initAnalytics(): void {
  if (started || !POSTHOG_KEY || !isBrowser || readOptOut()) return;
  started = true;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    persistence: "localStorage",
    // 자동 수집 전부 끔 — 화면 이동과 주요 행동만 직접 기록한다.
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: true, // 어디서 나가는지
    rageclick: false,
    capture_dead_clicks: false,
    enable_heatmaps: false,
    capture_heatmaps: false,
    capture_exceptions: false,
    disable_session_recording: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    // 웹 성능 지표만 — 요청 URL 이 남는 network timing 은 끔
    capture_performance: { web_vitals: true, network_timing: false },
    // 쓰지 않는 기능
    advanced_disable_feature_flags: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    before_send: beforeSend,
  });
}

export function track<K extends AnalyticsEventName>(name: K, ...args: TrackArgs<K>): void {
  if (!started) return;
  posthog.capture(name, args[0]);
}

/** 화면 이동 — 앱과 같은 패턴 이름. 웹 표준인 $pageview 로 보낸다. */
export function trackScreen(name: string): void {
  if (!started) return;
  currentScreen = name;
  posthog.capture("$pageview");
}

/** '이용 통계 보내기' 현재 값 (기본 켜짐) */
export async function getAnalyticsEnabled(): Promise<boolean> {
  return isBrowser ? !readOptOut() : true;
}

export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(ANALYTICS_OPT_OUT_KEY, enabled ? "0" : "1");
  } catch {
    // 저장소를 못 쓰는 브라우저 — posthog 쪽 상태만 바꾼다.
  }
  if (!started) {
    // 꺼진 채 시작했다가 켬 → 이제 초기화. 이전에 SDK 에 남은 거부 상태가 있으면 푼다.
    if (enabled) {
      initAnalytics();
      if (started && posthog.has_opted_out_capturing()) {
        posthog.opt_in_capturing({ captureEventName: false });
      }
    }
    return;
  }
  if (enabled) posthog.opt_in_capturing({ captureEventName: false });
  else posthog.opt_out_capturing();
}
