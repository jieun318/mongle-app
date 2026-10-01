import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { searchDreams } from "@/features/dream/dreamSearch";
import {
  normalizeConditions,
  normalizeMoodTags,
  type DreamItem,
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
  is_lucky?: string | null;
  conditions?: unknown;
  source_url?: string | null;
  created_at?: string;
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
    isLucky: row.is_lucky ?? null,
    moodTags: normalizeMoodTags(row.mood_tags),
    conditions: normalizeConditions(row.conditions),
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
    // 목록(검색·카테고리)에서 들어오면 전체 캐시에 이미 있다 — 네트워크 없이 즉시 렌더.
    initialData: () =>
      id
        ? queryClient
            .getQueryData<DreamItem[]>(ALL_DREAM_ITEMS_KEY)
            ?.find((i) => i.id === id)
        : undefined,
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(ALL_DREAM_ITEMS_KEY)?.dataUpdatedAt,
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

// 검색 규칙은 features/dream/dreamSearch.ts (순수 함수 — 커버리지 점검 스크립트와 공유).

// ── 검색 (메모리 필터링) ─────────────────────────────────
export function useSearchDreamItems(query: string) {
  const debounced = useDebouncedValue(query.trim(), 150);
  const q = useAllDreamItems();
  const data = useMemo(
    () => (q.data && debounced ? searchDreams(q.data, debounced) : []),
    [q.data, debounced],
  );
  return { ...q, data };
}
