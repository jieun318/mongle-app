import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import {
  CATEGORIES,
  type DreamItem,
  type DreamMoodTag,
} from "@/features/dream/dreamData";

// ── DB row 타입 (snake_case) ──────────────────────────────
export interface DreamItemRow {
  id: string;
  category_id: string;
  title: string;
  preview: string;
  description: string;
  emoji: string;
  tags: string[] | null;
  keywords: string[] | null;
  bookmark_count: number | null;
  luck_index: number | null;
  is_warning: boolean | null;
  mood_tags: unknown; // jsonb — string[] | DreamMoodTag[]
  conditions?: unknown;
  source_url?: string | null;
  created_at?: string;
}

// ── mood_tags 정규화 ──────────────────────────────────────
//   seed 데이터엔 두 가지 형태가 섞여 있음:
//   1) [{label, emoji, bg, color}]   — 기존 수동 시드
//   2) ['길몽', '흉몽', ...]           — 크롤링 시드 (tags 복사)
//   2번을 1번 모양으로 표준화해서 컴포넌트가 안전하게 렌더하도록.
const TAG_FALLBACK_STYLE: Record<string, { bg: string; color: string; emoji: string }> = {
  길몽: { bg: "#E8F5E8", color: "#4A9050", emoji: "🍀" },
  흉몽: { bg: "#FFE0D0", color: "#C86040", emoji: "⚠️" },
  태몽: { bg: "#FBE3EC", color: "#C868A0", emoji: "🌸" },
  보통: { bg: "#F0E8FF", color: "#7868C8", emoji: "🌙" },
  조건부: { bg: "#EDE8F5", color: "#7868B8", emoji: "🔀" },
};

function normalizeMoodTags(raw: unknown): DreamMoodTag[] {
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

export function mapDreamItemRow(row: DreamItemRow): DreamItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    preview: row.preview ?? "",
    description: row.description ?? "",
    emoji: row.emoji ?? "🌙",
    tags: row.tags ?? [],
    keywords: row.keywords ?? [],
    bookmarkCount: row.bookmark_count ?? 0,
    luckIndex: row.luck_index ?? 0,
    isWarning: !!row.is_warning,
    moodTags: normalizeMoodTags(row.mood_tags),
  };
}

// ── debounce ─────────────────────────────────────────────
function useDebouncedValue<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// ── 단건 조회 ─────────────────────────────────────────────
export function useDreamItem(id: string | undefined | null) {
  return useQuery({
    queryKey: ["dreamItem", id ?? null],
    queryFn: async (): Promise<DreamItem | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("dream_items")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapDreamItemRow(data as DreamItemRow) : null;
    },
    enabled: !!id,
    staleTime: 60 * 60 * 1000, // 1h
  });
}

// ── 전체 목록(단일 소스) ─────────────────────────────────
// dream_items 는 수백 행 규모의 정적 사전 데이터라, 카테고리·검색을 매번 서버에
// 조회하지 않고 전체를 한 번만 받아 메모리에서 필터링한다. 카테고리/검색 훅이
// 모두 이 캐시에서 파생 → 첫 요청 후엔 네트워크 없이 즉시 동작.
const ALL_DREAM_ITEMS_KEY = ["dreamItems", "all"] as const;

async function fetchAllDreamItems(): Promise<DreamItem[]> {
  const { data, error } = await supabase
    .from("dream_items")
    .select("*")
    .order("id");
  if (error) throw error;
  return (data ?? []).map((r) => mapDreamItemRow(r as DreamItemRow));
}

export function useAllDreamItems() {
  return useQuery({
    queryKey: ALL_DREAM_ITEMS_KEY,
    queryFn: fetchAllDreamItems,
    staleTime: 60 * 60 * 1000, // 1h
  });
}

// 홈이 준비된 뒤 전체 목록을 백그라운드로 예열. 이후 검색/카테고리 첫 진입이
// 네트워크 없이 즉시 뜬다. prefetchQuery 는 이미 신선하면 재요청하지 않는다.
export function prefetchDreamBrowse(): Promise<void> {
  return queryClient
    .prefetchQuery({
      queryKey: ALL_DREAM_ITEMS_KEY,
      queryFn: fetchAllDreamItems,
      staleTime: 60 * 60 * 1000,
    })
    .catch(() => {});
}

// 한 카테고리의 항목만 골라낸다 — 기존 서버 queryFn 필터와 동일 규칙.
// (lucky/unlucky 는 tags 에 길몽/흉몽 포함하는 가상 카테고리)
function filterByCategory(items: DreamItem[], categoryId: string): DreamItem[] {
  if (categoryId === "lucky") return items.filter((i) => i.tags.includes("길몽"));
  if (categoryId === "unlucky") return items.filter((i) => i.tags.includes("흉몽"));
  return items.filter((i) => i.categoryId === categoryId);
}

// ── 카테고리별 목록 (메모리 필터링) ──────────────────────
export function useDreamItemsByCategory(categoryId: string | undefined | null) {
  const q = useAllDreamItems();
  const data = useMemo(
    () => (q.data && categoryId ? filterByCategory(q.data, categoryId) : []),
    [q.data, categoryId],
  );
  return { ...q, data };
}

// PostgREST 대신 클라이언트에서 매칭. 기존 서버 `.or()` 규칙과 동일하게:
//   title/preview 부분일치(대소문자 무시), keywords/tags 정확 원소 포함,
//   카테고리 라벨/ID 부분일치. sanitize 는 기존과 동일 문자 제거를 유지해
//   서버 결과와 일치시킨다.
function sanitize(q: string): string {
  return q.replace(/[(),"\\%_]/g, " ").trim();
}

function searchItems(items: DreamItem[], rawQuery: string): DreamItem[] {
  const safe = sanitize(rawQuery);
  if (!safe) return [];
  const lower = safe.toLowerCase();
  const catIds = new Set(
    CATEGORIES.filter(
      (c) =>
        c.label.toLowerCase().includes(lower) ||
        c.id.toLowerCase().includes(lower),
    ).map((c) => c.id),
  );
  // 메모리 필터라 네트워크 비용이 없어 상한을 두지 않는다(기존 서버 .limit(100) 은
  // payload 절감용이었음). 매칭 전체를 id 순으로 반환 — 카테고리 페이지도 동일
  // 규모(길몽 278개)를 이미 스크롤로 렌더한다.
  return items.filter(
    (i) =>
      i.title.toLowerCase().includes(lower) ||
      i.preview.toLowerCase().includes(lower) ||
      i.keywords.includes(safe) ||
      i.tags.includes(safe) ||
      catIds.has(i.categoryId),
  );
}

// ── 검색 (메모리 필터링) ─────────────────────────────────
export function useSearchDreamItems(query: string) {
  const debounced = useDebouncedValue(query.trim(), 150);
  const q = useAllDreamItems();
  const data = useMemo(
    () => (q.data && debounced ? searchItems(q.data, debounced) : []),
    [q.data, debounced],
  );
  return { ...q, data };
}
