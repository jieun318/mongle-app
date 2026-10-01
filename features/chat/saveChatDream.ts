import { createDream, todayISODate, updateDream } from "@/features/dream/dreams";
import { MORE_MARKER } from "@/features/chat/answer";
import { isCrisisDisclosure } from "@/features/chat/safety";
import type { DreamMeta, SavedSegment, StoredChatMessage } from "@/features/chat/chatSession";

// 채팅 구간을 꿈 보관함에 저장한다. 채팅 모달의 닫기·새 대화·결과 카드 보기가 모두 이
// 함수 하나를 거친다 — 저장 경로가 여럿이면 같은 대화가 두 번 저장되기 쉽다.
//
// - 새 구간: messages[savedCount..] 를 새 행으로 만든다.
// - 이어가기(continuing): 결과 카드로 저장한 뒤 같은 꿈을 이어서 이야기한 경우.
//   새 행을 만들지 않고 lastSave.dreamId 행을 lastSave.from 부터의 대화로 갱신한다.

// AI 가 추출한 태그 라벨을 카드 컴포넌트들이 기대하는 DreamMoodTag 모양으로 감싼다.
// (bg/color 는 AiDreamCard 가 자체 스타일로 그리므로 일관된 기본값으로 두면 충분)
const DEFAULT_TAG_BG = "#F0E8FF";
const DEFAULT_TAG_COLOR = "#7868C8";

export interface SaveInput {
  messages: readonly StoredChatMessage[];
  savedCount: number;
  meta: DreamMeta | null;
  lastSave: SavedSegment | null;
  continuing: boolean;
}

export type SaveOutcome =
  | { status: "none" } // 저장할 새 사용자 메시지 없음
  | { status: "crisis" } // 위기 발화가 있어 저장하지 않음
  | { status: "saved"; title: string; segment: SavedSegment; updated: boolean }
  | { status: "error"; message: string };

// 같은 구간을 동시에 두 번 저장하지 않도록 직렬화한다(버튼 연타, 닫기와 결과 카드가 겹칠 때).
let queue: Promise<unknown> = Promise.resolve();

export function saveChatDream(input: SaveInput): Promise<SaveOutcome> {
  const run = queue.then(() => doSave(input), () => doSave(input));
  queue = run.catch(() => {});
  return run;
}

async function doSave({ messages, savedCount, meta, lastSave, continuing }: SaveInput): Promise<SaveOutcome> {
  const pendingUsers = messages.slice(savedCount).filter((m) => m.role === "user");
  if (pendingUsers.length === 0) return { status: "none" };

  const cont = continuing && lastSave ? lastSave : null;
  const from = cont ? cont.from : savedCount;
  const segment = messages.slice(from);
  const userMsgs = segment.filter((m) => m.role === "user");

  // 위기 발화가 한 턴이라도 있으면 보관함에 저장하지 않는다.
  // 저장하면 "✨ '요즘 죽고싶다는 생…' 보관함에 담겼어요" 토스트와 함께 꿈 카드로 남는다.
  if (userMsgs.some((m) => isCrisisDisclosure(m.content))) return { status: "crisis" };

  const content = userMsgs.map((m) => m.content).join("\n\n");
  const chatPreview = segment.map((m) => ({
    role: m.role,
    // 저장 미리보기엔 요약+전체를 한 흐름으로 (마커는 문단 구분으로 치환)
    text: m.content.split(MORE_MARKER).join("\n\n"),
  }));

  // 제목: AI 가 추출한 title 우선, 없으면 첫 메시지 앞 10자 + "…"
  const firstLine = userMsgs[0].content.split("\n")[0].trim();
  const fallbackTitle = firstLine.length > 10 ? `${firstLine.slice(0, 10)}…` : firstLine;
  const title = meta?.title?.trim() || fallbackTitle || "AI 꿈 해몽";

  try {
    if (cont) {
      const { error } = await updateDream(cont.dreamId, { content, chatPreview });
      if (error) return { status: "error", message: error.message };
      return { status: "saved", title, updated: true, segment: { dreamId: cont.dreamId, from, to: messages.length } };
    }
    const moodTags =
      meta?.moodTags?.map((label) => ({ label, emoji: "", bg: DEFAULT_TAG_BG, color: DEFAULT_TAG_COLOR })) ?? [];
    const { data, error } = await createDream({
      title,
      content,
      dreamDate: todayISODate(),
      source: "ai",
      emoji: meta?.emoji || "🌙",
      luckIndex: meta?.luckIndex ?? 0,
      isWarning: meta?.isWarning ?? false,
      moodTags,
      chatPreview,
      interpretationSummary: meta?.interpretation ?? "",
    });
    if (error || !data) return { status: "error", message: error?.message ?? "저장 결과 없음" };
    return { status: "saved", title, updated: false, segment: { dreamId: data.id, from, to: messages.length } };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }
}
