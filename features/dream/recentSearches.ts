import AsyncStorage from "@react-native-async-storage/async-storage";

// 사용자의 최근 검색어 — 검색 화면의 키워드 칩을 개인화하는 데 쓴다.
// 기기 로컬(AsyncStorage) 저장. 계정별이 아니라 기기별이며, 1인 사용 기준.
const KEY = "search.recent";
const MAX = 10;

export async function getRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

// 검색 실행 시 호출. 최신을 맨 앞에 두고 중복 제거, 상한 유지. 갱신된 목록을 반환.
export async function addRecentSearch(term: string): Promise<string[]> {
  const t = term.trim();
  if (!t) return getRecentSearches();
  try {
    const cur = await getRecentSearches();
    const next = [t, ...cur.filter((s) => s !== t)].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return getRecentSearches();
  }
}
