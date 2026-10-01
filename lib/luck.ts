// 길운 지수(luck_index, 0~100)로 길몽/흉몽을 가르는 기준 — 사전 판정 규칙과 채팅 메타가 함께 쓴다.
// 이 파일은 RN 의존성이 없어야 한다: api/chat.ts(Vercel Edge)도 상대 경로로 import 한다.
//
// 70/35 로 맞춘 이유: 0019 적용 후 사전에서 점수만으로 판정해 보면 70/35 는 지금 배지와
// 52건, 75/35 는 98건이 어긋나 70 쪽이 실제 데이터에 더 가깝다. (태그로 판정되는 항목이
// 대부분이라 어느 쪽을 골라도 사전 배지가 바뀌는 항목은 0건이었다.)

/** 이 점수 이상이면 길몽 */
export const LUCK_GOOD_MIN = 70;
/** 이 점수 이하면 흉몽 */
export const LUCK_BAD_MAX = 35;

export type LuckBadge = "길몽" | "흉몽" | "보통";

export function badgeFromLuckIndex(luckIndex: number): LuckBadge {
  if (luckIndex >= LUCK_GOOD_MIN) return "길몽";
  if (luckIndex <= LUCK_BAD_MAX) return "흉몽";
  return "보통";
}
