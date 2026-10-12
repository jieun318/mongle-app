import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import type { QueryKey } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

// 탭 화면은 한 번 마운트되면 계속 살아 있어서 useQuery 의 refetchOnMount 가 다시
// 돌지 않는다. 화면에 다시 들어올 때 staleTime 이 지난 캐시만 조용히 갱신한다.
// 신선한 캐시면 네트워크를 타지 않는다 — 예전처럼 진입마다 전체를 다시 받지 않는다.
// 이미 받는 중인 쿼리(첫 진입 등)는 건드리지 않는다. refetch 가 진행 중인 요청을
// 취소하고 다시 시작하기 때문.
export function useRefetchStaleOnFocus(queryKey: QueryKey | null): void {
  const keyHash = JSON.stringify(queryKey);
  useFocusEffect(
    useCallback(() => {
      if (!queryKey) return;
      void queryClient.refetchQueries({
        queryKey,
        exact: true,
        stale: true,
        predicate: (q) => q.state.fetchStatus === "idle",
      });
      // queryKey 는 렌더마다 새 배열이라 내용(keyHash)으로만 비교한다.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keyHash]),
  );
}
