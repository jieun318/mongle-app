import AsyncStorage from "@react-native-async-storage/async-storage";
import { queryClient } from "@/lib/queryClient";
import {
  FORTUNE_CACHE_KEY,
  FORTUNE_VIEWED_DATE_KEY,
} from "@/features/fortune/dailyFortune";
import { READ_KEY as NOTICE_READ_IDS_KEY } from "@/features/notice/notices";
import { resetMyDreamsCache } from "@/features/dream/dreams";

// 로그아웃 시 지워야 할 "사용자별 로컬 상태"를 한곳에 모은다.
// auth.ts 가 운세·꿈·공지 모듈을 직접 알지 않도록 하는 경계이기도 하다.
// 새 사용자별 캐시를 만들면 여기에 등록할 것.
//
// "deviceId" 는 의도적으로 제외 — 비로그인 시드용이라 기기에 남아야 한다.
const USER_SCOPED_KEYS = [
  FORTUNE_CACHE_KEY,
  FORTUNE_VIEWED_DATE_KEY,
  NOTICE_READ_IDS_KEY,
];

export async function clearUserScopedCaches(): Promise<void> {
  queryClient.clear(); // TanStack Query 전체
  resetMyDreamsCache(); // 모듈 전역 캐시 (Query 밖이라 clear() 로 안 지워짐)
  try {
    await AsyncStorage.multiRemove(USER_SCOPED_KEYS);
  } catch {}
}
