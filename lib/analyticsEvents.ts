// 사용 분석(PostHog) 이벤트 목록 — 앱(lib/analytics.ts)과 웹(lib/analytics.web.ts)이 함께 쓴다.
//
// 개인정보 원칙 (개인정보처리방침 제2·5·6조와 맞춰 둘 것)
//   - 계정과 연결하지 않는다 (identify 호출 금지). 기기마다 무작위 익명 ID 로만 센다.
//   - 꿈 내용·챗봇 대화·검색어 같은 사용자 텍스트는 절대 넣지 않는다.
//     그래서 속성은 숫자·불리언·정해진 값(리터럴)만 허용한다 — 아무 string 은 타입에서 막힌다.
//   - 이벤트를 추가하면 개인정보처리방침의 "이용 기록" 설명과 Play 데이터 보안 양식도 확인한다.

export type AnalyticsEventProps = {
  /** 챗봇에 새 꿈을 처음 보냄 (= 해몽 요청). chat_message_sent 에도 함께 집계된다. */
  dream_interpretation_requested: undefined;
  /** 챗봇에 메시지를 보냄 (첫 메시지 포함) */
  chat_message_sent: undefined;
  /** 꿈 기록 새로 저장 (수정은 제외) — card: 사전 카드에서 직접 작성, chat: 챗봇 대화를 보관함에 저장 */
  dream_saved: { source: "card" | "chat" };
  /** 오늘의 운세 창 열기 — first_today: 오늘 처음 연 것인지 */
  fortune_viewed: { first_today: boolean };
  /** 꿈 사전 검색 — 검색어 없이 결과 개수만 */
  dictionary_searched: { result_count: number };
  /** 마이페이지 '문의하기' 클릭 */
  contact_clicked: undefined;
};

export type AnalyticsEventName = keyof AnalyticsEventProps;

/** 속성이 없는 이벤트는 인자 1개, 있는 이벤트는 속성까지 2개를 받게 한다. */
export type TrackArgs<K extends AnalyticsEventName> =
  AnalyticsEventProps[K] extends undefined ? [] : [AnalyticsEventProps[K]];

/**
 * Expo Router 세그먼트 → 화면 이름. 그룹 "(app)" "(tabs)" 를 빼고, 동적 경로는
 * 실제 값 대신 "[category]" 패턴을 그대로 쓴다. 쿼리(?q=검색어)는 세그먼트에 없다.
 *   ["(app)","(tabs)","search","[category]"] → "/search/[category]"
 *   [] → "/"
 */
export function screenNameFromSegments(segments: readonly string[]): string {
  const parts = segments.filter((s) => !(s.startsWith("(") && s.endsWith(")")));
  return "/" + parts.join("/");
}

/** '이용 통계 보내기' 설정 저장 키 — 앱은 AsyncStorage, 웹은 localStorage */
export const ANALYTICS_OPT_OUT_KEY = "mongle.analytics_opt_out";

export const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim() || null;
export const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
