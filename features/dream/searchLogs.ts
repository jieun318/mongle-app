import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// 꿈 사전 검색어 기록과 인기 검색어 — supabase/migrations/0020_search_logs.sql.
// 검색어·결과 수·시각만 서버에 남는다(user_id 없음). 둘 다 실패해도 검색에는 영향이 없다.

const MAX_LEN = 30;
// 같은 앱 실행 동안 같은 검색어(+결과 유무)는 한 번만 보낸다 — 결과 화면을 오가며
// 같은 말을 다시 보는 것까지 세면 인기 검색어가 한 사람 행동에 끌려간다.
const sent = new Set<string>();

/** 검색 결과 화면에서 입력이 멈췄을 때 부른다. fire-and-forget. */
export function logSearch(query: string, resultCount: number): void {
  const q = query.trim().replace(/\s+/g, " ");
  if (!q || q.length > MAX_LEN) return;
  const key = `${q.toLowerCase()}|${resultCount > 0 ? 1 : 0}`;
  if (sent.has(key)) return;
  sent.add(key);
  supabase
    .rpc("log_search", { p_query: q, p_result_count: Math.max(0, resultCount) })
    .then(({ error }) => {
      // 0020 적용 전이거나 비로그인이면 실패한다 — 조용히 넘긴다(다음 실행 때 다시 시도).
      if (error) {
        sent.delete(key);
        if (__DEV__) console.warn("[search] log_search failed:", error.message);
      }
    });
}

/** 최근 30일 인기 검색어(결과 1건 이상, 3회 이상). 실패하면 빈 배열 — 화면은 큐레이션으로 채운다. */
export function useTrendingSearches() {
  return useQuery({
    queryKey: ["trendingSearches", 30],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.rpc("trending_searches", {
        p_days: 30,
        p_limit: 8,
        p_min_count: 3,
      });
      if (error) return [];
      return ((data as { query: string }[] | null) ?? []).map((r) => r.query).filter(Boolean);
    },
    staleTime: 60 * 60 * 1000, // 1h
    retry: 0,
  });
}
