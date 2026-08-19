import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

export interface NoticeRow {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

// 활성 공지 목록 — 최신순
export async function listActiveNotices() {
  return supabase
    .from("notices")
    .select("id, title, content, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .returns<NoticeRow[]>();
}

// 읽음 처리는 사용자별 row 가 아닌 전역 공지라 AsyncStorage 로 관리.
// id 배열을 JSON 으로 저장. 모달 닫을 때 현재 보여진 id 들을 합집합으로 머지.
// 로그아웃 정리(lib/sessionCleanup)에서도 지워야 해 export 한다.
export const READ_KEY = "notice.readIds";

export async function getReadNoticeIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(READ_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export async function markNoticesRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const current = await getReadNoticeIds();
    const merged = Array.from(new Set([...current, ...ids]));
    await AsyncStorage.setItem(READ_KEY, JSON.stringify(merged));
  } catch {
    // 저장 실패해도 UX 흐름은 막지 않음 — 다음 진입 시 다시 시도됨
  }
}

// 활성 공지 중 아직 안 읽은 게 하나라도 있는지 — 벨 빨간 점 표시용
export async function hasUnreadNotices(): Promise<boolean> {
  const { data, error } = await listActiveNotices();
  if (error || !data) return false;
  if (data.length === 0) return false;
  const readIds = new Set(await getReadNoticeIds());
  return data.some((n) => !readIds.has(n.id));
}
