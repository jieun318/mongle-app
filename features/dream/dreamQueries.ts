import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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

// ── 카테고리별 목록 ──────────────────────────────────────
//   lucky/unlucky 는 가상 카테고리: tags 에 길몽/흉몽이 포함된 모든 항목.
export function useDreamItemsByCategory(categoryId: string | undefined | null) {
  return useQuery({
    queryKey: ["dreamItems", "category", categoryId ?? null],
    queryFn: async (): Promise<DreamItem[]> => {
      if (!categoryId) return [];
      let q = supabase.from("dream_items").select("*");
      if (categoryId === "lucky") q = q.contains("tags", ["길몽"]);
      else if (categoryId === "unlucky") q = q.contains("tags", ["흉몽"]);
      else q = q.eq("category_id", categoryId);
      const { data, error } = await q.order("id");
      if (error) throw error;
      return (data ?? []).map((r) => mapDreamItemRow(r as DreamItemRow));
    },
    enabled: !!categoryId,
    staleTime: 60 * 60 * 1000, // 1h
  });
}

// ── 검색 (debounce 300ms) ─────────────────────────────────
//   매칭: title / preview ilike, keywords / tags contains, 카테고리 라벨/ID.
//   PostgREST `.or()` 파서 안전을 위해 위험 문자 제거.
function sanitize(q: string): string {
  return q.replace(/[(),"\\%_]/g, " ").trim();
}

export function useSearchDreamItems(query: string) {
  const debounced = useDebouncedValue(query.trim(), 300);
  return useQuery({
    queryKey: ["dreamItems", "search", debounced],
    queryFn: async (): Promise<DreamItem[]> => {
      const safe = sanitize(debounced);
      if (!safe) return [];
      const lower = safe.toLowerCase();
      const catIds = CATEGORIES.filter(
        (c) =>
          c.label.toLowerCase().includes(lower) ||
          c.id.toLowerCase().includes(lower),
      ).map((c) => c.id);

      const orParts = [
        `title.ilike.%${safe}%`,
        `preview.ilike.%${safe}%`,
        `keywords.cs.{${safe}}`,
        `tags.cs.{${safe}}`,
      ];
      if (catIds.length > 0) {
        orParts.push(`category_id.in.(${catIds.join(",")})`);
      }

      const { data, error } = await supabase
        .from("dream_items")
        .select("*")
        .or(orParts.join(","))
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((r) => mapDreamItemRow(r as DreamItemRow));
    },
    enabled: debounced.length > 0,
    staleTime: 5 * 60 * 1000, // 5min
  });
}
