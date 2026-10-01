import {
  displayMoodTags,
  getCategoryById,
  type DreamItem,
  type DreamMoodTag,
} from "@/features/dream/dreamData";
import { badgeFromLuckIndex } from "@/lib/luck";
import type { DreamMeta } from "@/features/chat/chatSession";
import { splitAnswer } from "@/features/chat/answer";

// 꿈 해몽 결과 화면(app/(app)/dream/result.tsx)이 그리는 단일 모양.
// 꿈 사전 항목과 AI 챗 해몽이 서로 다른 데이터를 갖고 있어서, 화면은 이 타입만
// 알고 출처별 어댑터(fromDreamItem …)가 차이를 흡수한다.

export type DreamBadge = "길몽" | "흉몽" | "보통";

export interface DreamResult {
  source: "dict" | "ai";
  title: string;
  emoji: string;
  badge: DreamBadge;
  categoryLabel?: string;
  // 한 줄 요약 — 화면에서 가장 크게 보인다.
  summary: string;
  // 상징·감정 칩 (3개 내외)
  chips: DreamMoodTag[];
  // 해몽 본문 — 마크다운. 화면은 Markdown 컴포넌트로 렌더한다.
  body: string;
  // "오늘 해볼 것" — 비어 있으면 섹션을 숨긴다.
  actions: string[];
  luckIndex: number;
  // 사전 항목이면 "꿈 기록하기"가 이 id 로 기록 화면을 연다.
  dreamItemId?: string;
  // 채팅 해몽에서만: "지금 나의 마음" — 감정 칩 + 차분한 2~3문장(메타 interpretation).
  moods?: DreamMoodTag[];
  feeling?: string;
}

export const BADGE_STYLE: Record<DreamBadge, { bg: string; color: string; emoji: string }> = {
  길몽: { bg: "#E8F5E8", color: "#4A9050", emoji: "🍀" },
  흉몽: { bg: "#FFE0D0", color: "#C86040", emoji: "⚠️" },
  보통: { bg: "#F0E8FF", color: "#7868C8", emoji: "🌙" },
};

const MAX_CHIPS = 4;
const CHIP_BG = "#F0E8FF";
const CHIP_COLOR = "#7868C8";
// tags 중 길흉 분류값 — 배지로 따로 보여주므로 칩에서는 뺀다.
const CLASSIFICATION_TAGS = new Set(["길몽", "흉몽", "보통", "조건부"]);

// 길몽·흉몽 태그가 함께 붙은 조건부 항목(크롤링 시드 17건)은 태그만으로는 길흉을
// 알 수 없다. 예전처럼 흉몽을 먼저 보면 "뱀에 물리는 꿈"처럼 원문이 대표적인
// 길몽이라는 항목까지 흉몽이 된다. 원본 분류값(is_lucky) → 점수 순으로 정한다.
function badgeByLuck(item: DreamItem): DreamBadge {
  if (item.isLucky === "lucky") return "길몽";
  if (item.isLucky === "unlucky") return "흉몽";
  if (item.isLucky === "conditional" || item.isLucky === "neutral") return "보통";
  return badgeFromLuckIndex(item.luckIndex);
}

// 사전의 tags 는 '길몽' / '흉몽' / '태몽' / '조건부' 등이 섞여 있다.
// - 길몽·흉몽이 함께 있으면 badgeByLuck
// - 하나만 있으면 그 태그
// - 둘 다 없으면: is_lucky 'neutral'(원문이 부정적인 태몽 등, 명시적으로 지정한 항목)은
//   보통, 태몽은 길몽(칩으로 '태몽'은 따로 남는다), 경고 표시면 흉몽, 나머지는 보통.
function badgeOf(item: DreamItem): DreamBadge {
  const good = item.tags.includes("길몽");
  const bad = item.tags.includes("흉몽");
  if (good && bad) return badgeByLuck(item);
  if (bad) return "흉몽";
  if (good) return "길몽";
  if (item.isLucky === "neutral") return "보통";
  if (item.tags.includes("태몽")) return "길몽";
  if (item.isWarning) return "흉몽";
  return "보통";
}

function chipsOf(item: DreamItem): DreamMoodTag[] {
  const seen = new Set<string>();
  const out: DreamMoodTag[] = [];
  const push = (t: DreamMoodTag) => {
    if (!t.label || seen.has(t.label) || CLASSIFICATION_TAGS.has(t.label)) return;
    seen.add(t.label);
    out.push(t);
  };
  // 상징(tags) 먼저, 감정(moodTags) 다음.
  for (const label of item.tags) {
    push({ label, emoji: "", bg: CHIP_BG, color: CHIP_COLOR });
  }
  for (const t of displayMoodTags(item.moodTags)) push(t);
  return out.slice(0, MAX_CHIPS);
}

// ── 길몽/흉몽 강도 게이지 ─────────────────────────────────
// luck_index 는 "길운" 점수(높을수록 좋음)라, 흉몽은 점수가 낮을수록 강한 흉몽이다
// (사전 흉몽 141건이 7~50, 중앙값 30). 그대로 단계를 매기면 가장 불길한 꿈이
// "흉몽 강도 · 약함"이 되므로 흉몽은 100 − luck_index 를 강도로 쓴다.
export type DreamIntensity = "약함" | "보통" | "강함";

export function intensityOf(strength: number): DreamIntensity {
  if (strength < 40) return "약함";
  if (strength < 70) return "보통";
  return "강함";
}

export function luckGauge(result: DreamResult): {
  bad: boolean;
  strength: number;
  label: string;
} {
  const bad = result.badge === "흉몽";
  const raw = bad ? 100 - result.luckIndex : result.luckIndex;
  const strength = Math.max(0, Math.min(100, raw));
  return { bad, strength, label: `${bad ? "흉몽" : "길몽"} 강도 · ${intensityOf(strength)}` };
}

function firstSentence(text: string): string {
  const m = text.match(/^.+?[.!?。](?=\s|$)/);
  return (m ? m[0] : text).trim();
}

// 크롤링 시드(crawled-*)의 preview 는 description 앞 50자를 잘라 넣은 것이라
// 문장 중간에서 끊긴다("…땅이 꺼지는"). 요약 자리에 그대로 쓰면 가장 큰 글씨가
// 잘린 문장이 되므로, 본문의 앞부분일 뿐이면 없는 것으로 보고 첫 문장을 쓴다.
// 이때 본문은 그 첫 문장을 뺀 나머지부터 — 요약과 본문 첫 줄이 반복되지 않게.
function summaryAndBody(item: DreamItem): { summary: string; description: string } {
  const preview = item.preview.trim();
  const desc = item.description.trim();
  const isCutPrefix = preview.length < desc.length && desc.startsWith(preview);
  if (preview && !isCutPrefix) return { summary: preview, description: desc };
  const first = firstSentence(desc);
  return { summary: first, description: desc.slice(first.length).trim() };
}

function bodyOf(item: DreamItem, description: string): string {
  const parts = [description];
  const conditions = item.conditions ?? [];
  if (conditions.length > 0) {
    parts.push(
      "### 이런 경우엔 달라져요",
      conditions.map((c) => `- **${c.when}** — ${c.meaning}`).join("\n"),
    );
  }
  return parts.filter(Boolean).join("\n\n");
}

export function fromDreamItem(item: DreamItem): DreamResult {
  const { summary, description } = summaryAndBody(item);
  return {
    source: "dict",
    title: item.title,
    emoji: item.emoji,
    badge: badgeOf(item),
    categoryLabel: getCategoryById(item.categoryId)?.label,
    summary,
    chips: chipsOf(item),
    // 본문이 한 문장뿐이었으면 요약으로 올라가 비어 있을 수 있다 — 화면이 카드를 숨긴다.
    body: bodyOf(item, description),
    // 사전 데이터엔 실천 제안이 없다 — 일괄 생성 전까지 섹션 숨김.
    actions: [],
    luckIndex: item.luckIndex,
    dreamItemId: item.id,
  };
}

// ── 채팅 해몽 ─────────────────────────────────────────────
// meta = 서버가 첫 턴 답변과 함께 내려준 메타, answer = 그 해몽 답변(요약 <<MORE>> 전체 해석).
// 예전 서버 응답이면 summary/badge/keywords/actions/feeling 이 없다 — 답변·점수로 채우고 섹션은 숨긴다.
// interpretation(보관함 카드용 해몽 요약)은 이 화면에서 쓰지 않는다 — 한 줄 요약·본문과 같은 말이 된다.

// 해몽 답변 끝의 실천 제안 문단을 여는 말. 채팅 프롬프트(api/chat.ts)가 전체 해석 마지막에
// "이렇게 해보면 좋아요" 식으로 1~2가지를 쓰게 되어 있다.
const ACTION_CUE = /이렇게\s*해\s*보면|해\s*보면\s*좋아요|해\s*보는\s*건\s*어떨까요|실천해\s*보|오늘\s*(?:해\s*볼|할\s*수\s*있는)/;
const RULE_LINE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const LIST_LINE = /^\s*([-*•]|\d+[.)])\s+/;

/**
 * 결과 화면 본문에서 끝부분의 실천 제안 문단을 뺀다 — "오늘 해볼 것" 섹션과 겹치지 않게.
 * 실천 제안을 여는 줄(제목·문단)부터 끝까지 자르고, 남은 끝의 구분선·빈 줄을 정리한다.
 * 첫 문단에서 걸리거나 자르고 나면 본문이 비는 경우는 그대로 둔다.
 */
export function stripActionSection(body: string): string {
  const lines = body.split("\n");
  const firstText = lines.findIndex((l) => l.trim());
  let cut = -1;
  for (let i = lines.length - 1; i > firstText; i--) {
    const plain = lines[i].replace(/^\s*(#{1,6}\s+|[-*•]\s+|\d+[.)]\s+)/, "").replace(/\*\*/g, "");
    if (ACTION_CUE.test(plain)) {
      cut = i;
      break;
    }
  }
  if (cut < 0) return body;
  // 실천 제안이 목록 중간 항목이면 목록 전체(바로 위 연속된 목록 줄)부터 자른다.
  while (cut > firstText + 1 && LIST_LINE.test(lines[cut]) && LIST_LINE.test(lines[cut - 1])) cut--;
  const kept = lines.slice(0, cut);
  while (kept.length && (!kept[kept.length - 1].trim() || RULE_LINE.test(kept[kept.length - 1]))) kept.pop();
  const out = kept.join("\n").trim();
  return out || body;
}

export function fromChat(meta: DreamMeta, answer: string): DreamResult {
  const { summary: head, full } = splitAnswer(answer);
  // 요약 목록의 첫 항목("1. …")을 한 줄 요약 대신 쓴다.
  const firstPoint = head
    .split("\n")
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
    .find(Boolean);
  const badge: DreamBadge =
    meta.badge ?? (meta.isWarning ? "흉몽" : badgeFromLuckIndex(meta.luckIndex));
  const toChip = (label: string): DreamMoodTag => ({ label, emoji: "", bg: CHIP_BG, color: CHIP_COLOR });
  const actions = meta.actions ?? [];
  // 전체 해석이 본문. 마커가 없는 예전 답변이면 답변 전체.
  const body = full || head;
  return {
    source: "ai",
    title: meta.title?.trim() || "AI 꿈 해몽",
    emoji: meta.emoji || "🌙",
    badge,
    summary: meta.summary?.trim() || firstPoint || "",
    chips: (meta.keywords ?? []).slice(0, MAX_CHIPS).map(toChip),
    // "오늘 해볼 것"이 있으면 본문 끝 실천 제안은 뺀다(채팅 말풍선은 그대로).
    body: actions.length > 0 ? stripActionSection(body) : body,
    actions,
    luckIndex: meta.luckIndex,
    moods: (meta.moodTags ?? []).map(toChip),
    feeling: meta.feeling?.trim() || undefined,
  };
}
