import { isCrisisDisclosure } from "@/features/chat/safety";

// AI 해몽 응답은 "요약 <<MORE>> 전체해석" 형태로 온다. 이 마커로 나눠
// 채팅 말풍선은 요약을 항상, 전체 해석은 "내용 더 보기"로 펼치고,
// 해몽 결과 화면은 전체 해석을 본문으로 쓴다.
export const MORE_MARKER = "<<MORE>>";

export function splitAnswer(content: string): { summary: string; full: string } {
  const idx = content.indexOf(MORE_MARKER);
  if (idx < 0) return { summary: content, full: "" };
  return {
    summary: content.slice(0, idx).trim(),
    full: content.slice(idx + MORE_MARKER.length).trim(),
  };
}

/** 해몽 답변(요약 + 전체 해석)인지 — 가위눌림 안내·짧은 잡담 답변은 마커가 없다. */
export function isInterpretation(content: string): boolean {
  return content.includes(MORE_MARKER);
}

interface MessageLike {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStub?: boolean;
}

/**
 * 이 답변이 속한 꿈 구간에 위기 발화가 있는지.
 * 구간 = 이 답변 직전의 사용자 메시지(꿈 첫 입력)부터 대화 끝까지. 답변 뒤에 이어진
 * 후속 대화에서 위기 발화가 나와도 결과 카드는 막는다.
 */
export function segmentHasCrisis(messages: readonly MessageLike[], answerId: string): boolean {
  const idx = messages.findIndex((m) => m.id === answerId);
  if (idx < 0) return false;
  let start = idx;
  while (start > 0 && messages[start].role !== "user") start--;
  return messages.slice(start).some((m) => m.role === "user" && isCrisisDisclosure(m.content));
}
