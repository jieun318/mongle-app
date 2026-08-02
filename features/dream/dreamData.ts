// 카테고리 / 필터 메타데이터 + 순수 유틸. 실제 dream_items 데이터는
// Supabase 의 public.dream_items 테이블에서 useDreamItem* 훅으로 조회.

export interface DreamCategory {
  id: string;
  label: string;
  emoji: string;
  bg: string;
}

export interface DreamMoodTag {
  label: string;
  emoji: string;
  bg: string;
  color: string;
}

export interface DreamItem {
  id: string;
  categoryId: string;
  title: string;
  preview: string;
  description: string;
  emoji: string;
  tags: string[]; // '길몽' | '흉몽' | '태몽' | '보통' | '조건부' 등
  keywords: string[];
  bookmarkCount: number;
  luckIndex: number;
  isWarning?: boolean;
  moodTags?: DreamMoodTag[];
}

// ── mood_tags 정규화 ──────────────────────────────────────
//   jsonb 라 DB 에 두 가지 형태가 섞여 있음:
//   1) [{label, emoji, bg, color}]   — 기존 수동 시드
//   2) ['길몽', '흉몽', ...]           — 크롤링 시드 (tags 복사)
//   2번을 1번 모양으로 표준화해서 컴포넌트가 안전하게 렌더하도록.
//   문자열 배열을 그대로 렌더하면 t.label 이 undefined 라 key 가 비고
//   (React key 경고) 필터·스타일도 전부 무력화된다.
const TAG_FALLBACK_STYLE: Record<string, { bg: string; color: string; emoji: string }> = {
  길몽: { bg: "#E8F5E8", color: "#4A9050", emoji: "🍀" },
  흉몽: { bg: "#FFE0D0", color: "#C86040", emoji: "⚠️" },
  태몽: { bg: "#FBE3EC", color: "#C868A0", emoji: "🌸" },
  보통: { bg: "#F0E8FF", color: "#7868C8", emoji: "🌙" },
  조건부: { bg: "#EDE8F5", color: "#7868B8", emoji: "🔀" },
};

export function normalizeMoodTags(raw: unknown): DreamMoodTag[] {
  if (!Array.isArray(raw)) return [];
  const out: DreamMoodTag[] = [];
  for (const t of raw) {
    if (typeof t === "string") {
      const style = TAG_FALLBACK_STYLE[t] ?? {
        bg: "#F0E8FF",
        color: "#7868C8",
        emoji: "",
      };
      out.push({ label: t, emoji: style.emoji, bg: style.bg, color: style.color });
    } else if (t && typeof t === "object" && "label" in t) {
      const o = t as Record<string, unknown>;
      out.push({
        label: String(o.label ?? ""),
        emoji: String(o.emoji ?? ""),
        bg: String(o.bg ?? "#F0E8FF"),
        color: String(o.color ?? "#7868C8"),
      });
    }
  }
  return out;
}

// 카드/모달 공용 — 정규화 + 길몽/흉몽 제외(별도 뱃지로 이미 표시됨).
export function displayMoodTags(raw: unknown): DreamMoodTag[] {
  return normalizeMoodTags(raw).filter(
    (t) => t.label !== "길몽" && t.label !== "흉몽",
  );
}

export const TRENDING_KEYWORDS = ["#돼지", "#불", "#좀비"] as const;

export const CATEGORIES: DreamCategory[] = [
  { id: "animal",    label: "동물",      emoji: "🐷", bg: "#FFEEDF" }, // peach
  { id: "nature",    label: "자연/현상",  emoji: "☀️", bg: "#FFF7D8" }, // banana
  { id: "people",    label: "인물",      emoji: "👥", bg: "#DEE8FD" }, // sky
  { id: "daily",     label: "생활/행동",  emoji: "🏠", bg: "#DEEFE3" }, // mint
  { id: "lucky",     label: "길몽",      emoji: "🍀", bg: "#FDF1D0" }, // gold cream
  { id: "unlucky",   label: "흉몽",      emoji: "⚠️", bg: "#FBDDD5" }, // coral
  { id: "pregnancy", label: "태몽",      emoji: "🌸", bg: "#FBE3EC" }, // rose
  { id: "body",      label: "신체/건강",  emoji: "💫", bg: "#EBDAF7" }, // lavender
  { id: "mystic",    label: "신비/영적",  emoji: "🌀", bg: "#D8E0F8" }, // periwinkle
];

const DEFAULT_FILTERS = ["전체"] as const;

export const FILTER_TAGS_BY_CATEGORY: Record<string, readonly string[]> = {
  animal:    ["전체", "#돼지", "#뱀", "#호랑이", "#강아지", "#고양이", "#길몽", "#흉몽"],
  nature:    ["전체", "#불", "#물", "#해", "#달", "#비", "#눈", "#하늘", "#무지개"],
  people:    ["전체", "#가족", "#연인", "#친구", "#낯선사람", "#아기", "#죽은사람"],
  daily:     ["전체", "#이사", "#여행", "#돈", "#옷", "#음식", "#싸움", "#운전"],
  lucky:     ["전체", "#재물", "#명예", "#건강", "#사랑", "#합격", "#출산"],
  unlucky:   ["전체", "#손실", "#이별", "#사고", "#싸움", "#병", "#실패"],
  pregnancy: ["전체", "#과일", "#동물", "#보석", "#꽃", "#해/달", "#물고기"],
  body:      ["전체", "#이빨", "#머리카락", "#피", "#눈", "#손", "#발"],
  mystic:    ["전체", "#귀신", "#천사", "#죽음", "#하늘", "#점쟁이", "#환생"],
};

export function getFilterTags(categoryId: string): readonly string[] {
  return FILTER_TAGS_BY_CATEGORY[categoryId] ?? DEFAULT_FILTERS;
}

export function getCategoryById(id: string): DreamCategory | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

// 카테고리 페이지 내부의 # 필터 칩 — 클라이언트 사이드 필터.
//   - DB의 tags 컬럼: '길몽' / '흉몽' / '태몽' / '조건부' (mood 분류)
//   - DB의 keywords 컬럼: 의미 태그 ('재물', '사고' 등) + 시드에서 주입한 주어 키워드
//   - title 도 함께 검사 → 시드가 keywords 에 주어를 채워주지 못한 경우에도 매치.
export function filterDreams(items: DreamItem[], filter: string): DreamItem[] {
  if (filter === "전체") return items;
  const key = filter.replace(/^#/, "");
  if (key === "길몽" || key === "흉몽" || key === "태몽") {
    return items.filter((d) => d.tags.includes(key));
  }
  return items.filter(
    (d) =>
      d.title.includes(key) ||
      d.keywords.includes(key) ||
      d.tags.includes(key),
  );
}
