import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  fortuneHistoryKey,
  loadPastWeeksFortunes,
  loadThisWeekFortunes,
  thisMondayYMD,
  thisWeekFortunesKey,
} from "@/features/fortune/dailyFortuneRepo";

// 이번 주 월요일. 탭 화면은 계속 마운트돼 있어 렌더 때만 계산하면 주가 바뀐 뒤
// 다시 들어와도 지난주 키를 본다. 화면에 들어올 때마다 다시 계산한다
// (같은 값이면 setState 가 리렌더하지 않는다).
function useThisMonday(): string {
  const [monday, setMonday] = useState(thisMondayYMD);
  useFocusEffect(
    useCallback(() => {
      setMonday(thisMondayYMD());
    }, []),
  );
  return monday;
}

// 마이페이지 "이번 주 운세". 오늘 운세를 보면(commitDailyFortuneToDB) invalidate 되므로
// 기본 staleTime(1h) 으로 충분하다. 주가 바뀌면 키(월요일)가 바뀌어 새로 받는다.
export function useThisWeekFortunes(userId: string | null) {
  const monday = useThisMonday();
  return useQuery({
    queryKey: thisWeekFortunesKey(userId ?? "", monday),
    queryFn: () => loadThisWeekFortunes(userId!),
    enabled: !!userId,
  });
}

// 지난 운세. 지난 주들은 바뀌지 않으므로 주가 바뀔 때(키의 월요일)만 새로 받는다.
export function useFortuneHistory(userId: string | null) {
  const monday = useThisMonday();
  return useQuery({
    queryKey: fortuneHistoryKey(userId ?? "", monday),
    queryFn: () => loadPastWeeksFortunes(userId!),
    enabled: !!userId,
  });
}
