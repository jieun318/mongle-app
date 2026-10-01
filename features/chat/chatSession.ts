import AsyncStorage from "@react-native-async-storage/async-storage";

// 챗봇 대화 내역을 24시간 동안 기기에 보관한다.
//
// 왜 필요한가 — 지금까지는 모달을 닫거나 앱을 껐다 켜면 대화가 통째로 사라졌다.
// 꿈 검색으로 받은 해몽 결과도 같은 흐름 안에 있어서 함께 날아갔다.
// "어제 뭐라고 나왔더라"를 다시 볼 방법이 보관함밖에 없었던 셈.
//
// 왜 자정이 아니라 24시간인가 — 자정 기준으로 지우면 새벽 1시에 꾼 꿈을
// 아침에 열었을 때 이미 사라져 있다. 꿈 앱에서 이건 최악의 타이밍이라
// "마지막 활동으로부터 24시간"으로 둔다.

const KEY = "mongle.chat.session.v1";
const TTL_MS = 24 * 60 * 60 * 1000;

export interface StoredChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  // 클라이언트에서 즉시 띄운 공감 한 줄. API 요청엔 포함하지 않는다.
  isStub?: boolean;
}

// 서버가 첫 턴 응답에 함께 내려주는 보관함용 메타데이터.
export interface DreamMeta {
  title: string;
  emoji: string;
  luckIndex: number;
  isWarning: boolean;
  moodTags: string[];
  interpretation: string;
  // 해몽 결과 화면용(api/_lib/dreamMeta.ts). 예전 서버 응답·예전에 저장된 세션엔 없다.
  badge?: "길몽" | "흉몽" | "보통";
  summary?: string;
  // "지금 나의 마음" — 꿈꾼 사람의 감정 상태(해석 아님). interpretation 과 겹치지 않게 따로 받는다.
  feeling?: string;
  keywords?: string[];
  actions?: string[];
}

/** 마지막으로 보관함에 저장한 구간 — messages[from, to) 가 dreams 의 dreamId 한 행이다. */
export interface SavedSegment {
  dreamId: string;
  from: number;
  to: number;
}

export interface ChatSession {
  // 마지막으로 대화가 갱신된 시각. TTL 판정 기준.
  updatedAt: number;
  messages: StoredChatMessage[];
  meta: DreamMeta | null;
  // 마지막으로 보관함에 저장한 시점의 messages 길이.
  //
  // 복원된 대화를 다시 저장하면 보관함에 같은 꿈이 두 번 쌓인다. 그렇다고
  // "한 번 저장했으면 끝"으로 두면 이어서 새 꿈을 이야기했을 때 그건 영영
  // 저장되지 않는다. 그래서 "어디까지 저장했는지"를 인덱스로 들고 다니며
  // 그 뒤에 생긴 메시지만 새 꿈으로 저장한다.
  savedCount: number;
  // meta 가 어느 답변(해몽 말풍선)의 것인지. 결과 카드 버튼·결과 화면이 이 답변을 찾는다.
  metaMsgId?: string | null;
  lastSave?: SavedSegment | null;
  // 결과 카드로 저장한 뒤 "대화 이어가기" 중인지. true 면 이후 메시지는 같은 꿈의 후속이라
  // 서버에 lastSave.from 부터의 맥락을 보내고, 저장은 새 행 대신 lastSave.dreamId 를 갱신한다.
  continuing?: boolean;
}

function isValidMessage(v: unknown): v is StoredChatMessage {
  if (typeof v !== "object" || v === null) return false;
  const m = v as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    (m.role === "user" || m.role === "assistant") &&
    typeof m.content === "string"
  );
}

/**
 * 저장된 대화를 읽는다. 없거나 24시간이 지났으면 null.
 * 만료된 항목은 읽는 김에 지운다 — 따로 청소 스케줄을 둘 필요가 없다.
 */
export async function loadChatSession(): Promise<ChatSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ChatSession>;
    const updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;

    // 만료 + 시계가 과거로 돌아간 경우(updatedAt 이 미래)도 함께 버린다.
    if (!updatedAt || Date.now() - updatedAt > TTL_MS || updatedAt > Date.now() + TTL_MS) {
      await AsyncStorage.removeItem(KEY);
      return null;
    }

    const messages = Array.isArray(parsed.messages)
      ? parsed.messages.filter(isValidMessage)
      : [];
    if (messages.length === 0) return null;

    const savedCount =
      typeof parsed.savedCount === "number" &&
      parsed.savedCount >= 0 &&
      parsed.savedCount <= messages.length
        ? parsed.savedCount
        : 0;

    const ls = parsed.lastSave;
    const lastSave =
      ls &&
      typeof ls.dreamId === "string" &&
      typeof ls.from === "number" &&
      typeof ls.to === "number" &&
      ls.from >= 0 &&
      ls.to <= messages.length &&
      ls.from < ls.to
        ? ls
        : null;

    return {
      updatedAt,
      messages,
      meta: (parsed.meta as DreamMeta | null) ?? null,
      savedCount,
      metaMsgId: typeof parsed.metaMsgId === "string" ? parsed.metaMsgId : null,
      lastSave,
      continuing: !!parsed.continuing && !!lastSave,
    };
  } catch (err) {
    // 저장 포맷이 깨졌거나 스토리지 오류 — 대화 복원 실패로 앱을 막을 이유는 없다.
    console.warn("[chat] session load failed:", err);
    return null;
  }
}

/** 대화를 저장한다. 실패해도 조용히 넘어간다 — 어디까지나 편의 기능. */
export async function saveChatSession(
  session: Omit<ChatSession, "updatedAt">,
): Promise<void> {
  try {
    if (session.messages.length === 0) {
      await AsyncStorage.removeItem(KEY);
      return;
    }
    const payload: ChatSession = { ...session, updatedAt: Date.now() };
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[chat] session save failed:", err);
  }
}

/** 저장된 대화를 지운다 (새 대화 시작 / 로그아웃 / 회원탈퇴). */
export async function clearChatSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (err) {
    console.warn("[chat] session clear failed:", err);
  }
}
