import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import type { DreamMoodTag } from "@/features/dream/dreamData";

// ── 보관함 목록 쿼리 키 ─────────────────────────────────────────
// 키에 userId 를 넣어 계정이 바뀌면 다른 캐시를 보게 한다(로그아웃 시엔
// clearUserScopedCaches 가 queryClient.clear() 로 통째로 비운다).
export const MY_DREAMS_KEY = ["myDreams"] as const;
export const myDreamsKey = (userId: string) => [...MY_DREAMS_KEY, userId] as const;
export const MY_DREAMS_STALE_MS = 5 * 60 * 1000;

// 꿈 저장·수정·삭제 뒤 보관함 목록만 다시 받게 한다. 다른 쿼리(꿈 사전 등)는 그대로.
// 이 모듈의 쓰기 함수들이 성공 시 직접 부르므로, 호출부(꿈 기록 화면·챗봇 저장·
// 보관함 삭제)마다 따로 챙길 필요가 없다.
function invalidateMyDreams(): void {
  void queryClient.invalidateQueries({ queryKey: MY_DREAMS_KEY });
}

export type DreamSource = "card" | "ai";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface DreamItemRow {
  id: string;
  category_id: string;
  title: string;
  preview: string;
  description: string;
  emoji: string;
  tags: string[];
  keywords: string[];
  bookmark_count: number;
  luck_index: number;
  is_warning: boolean;
  // jsonb — string[] | DreamMoodTag[] 가 섞여 있다. 렌더 전에 반드시
  // displayMoodTags()/normalizeMoodTags() 를 통과시킬 것.
  mood_tags: unknown;
  created_at: string;
}

export interface DreamRecord {
  id: string;
  user_id: string;
  title: string;
  content: string;
  dream_date: string; // YYYY-MM-DD
  created_at: string;
  source: DreamSource;
  dream_item_id: string | null;
  category_id: string | null;
  luck_index: number;
  is_warning: boolean;
  emoji: string;
  // jsonb — 위 DreamItemRow.mood_tags 와 같은 이유로 unknown.
  mood_tags: unknown;
  chat_preview: ChatTurn[];
  // AI 가 추출한 해몽 본문 요약 (공감 멘트/질문 제외). 카드 서브텍스트와 상세 "해몽 요약" 카드에 사용.
  interpretation_summary: string;
  // Supabase 의 embedded select 로 join 된 dream_items 마스터 row.
  // dream_item_id 가 null 이거나 원본이 삭제됐으면 null.
  dream_item: DreamItemRow | null;
}

export interface CreateDreamInput {
  title: string;
  content: string;
  dreamDate: string;
  source?: DreamSource;
  dreamItemId?: string | null;
  categoryId?: string | null;
  luckIndex?: number;
  isWarning?: boolean;
  emoji?: string;
  moodTags?: DreamMoodTag[];
  chatPreview?: ChatTurn[];
  interpretationSummary?: string;
}

export async function createDream(input: CreateDreamInput) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) return { data: null, error: userErr };
  const user = userRes.user;
  if (!user) {
    return {
      data: null,
      error: { message: "로그인이 필요해요", name: "AuthError" } as Error,
    };
  }

  const res = await supabase
    .from("dreams")
    .insert({
      user_id: user.id,
      title: input.title,
      content: input.content,
      dream_date: input.dreamDate,
      source: input.source ?? "card",
      dream_item_id: input.dreamItemId ?? null,
      category_id: input.categoryId ?? null,
      luck_index: input.luckIndex ?? 0,
      is_warning: input.isWarning ?? false,
      emoji: input.emoji ?? "",
      mood_tags: input.moodTags ?? [],
      chat_preview: input.chatPreview ?? [],
      interpretation_summary: input.interpretationSummary ?? "",
    })
    .select()
    .single<DreamRecord>();
  if (!res.error) invalidateMyDreams();
  return res;
}

export interface UpdateDreamInput {
  title?: string;
  content?: string;
  dreamDate?: string;
  source?: DreamSource;
  dreamItemId?: string | null;
  categoryId?: string | null;
  luckIndex?: number;
  isWarning?: boolean;
  emoji?: string;
  moodTags?: DreamMoodTag[];
  chatPreview?: ChatTurn[];
  interpretationSummary?: string;
}

// 본인 꿈만 수정 가능 — RLS(dreams_update_own) 가 user_id = auth.uid() 강제.
// 다른 사용자의 row 를 id 로 지정하면 RLS 가 0행 반환.
export async function updateDream(id: string, input: UpdateDreamInput) {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.content !== undefined) patch.content = input.content;
  if (input.dreamDate !== undefined) patch.dream_date = input.dreamDate;
  if (input.source !== undefined) patch.source = input.source;
  if (input.dreamItemId !== undefined) patch.dream_item_id = input.dreamItemId;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId;
  if (input.luckIndex !== undefined) patch.luck_index = input.luckIndex;
  if (input.isWarning !== undefined) patch.is_warning = input.isWarning;
  if (input.emoji !== undefined) patch.emoji = input.emoji;
  if (input.moodTags !== undefined) patch.mood_tags = input.moodTags;
  if (input.chatPreview !== undefined) patch.chat_preview = input.chatPreview;
  if (input.interpretationSummary !== undefined)
    patch.interpretation_summary = input.interpretationSummary;

  const res = await supabase
    .from("dreams")
    .update(patch)
    .eq("id", id)
    .select()
    .single<DreamRecord>();
  if (!res.error) invalidateMyDreams();
  return res;
}

// 본인 꿈만 삭제 가능 — RLS(dreams_delete_own) 가 user_id = auth.uid() 강제.
export async function deleteDream(id: string) {
  const res = await supabase.from("dreams").delete().eq("id", id);
  if (!res.error) invalidateMyDreams();
  return res;
}

export async function listMyDreams() {
  // dream_items 를 embedded join 으로 함께 조회.
  // PostgREST 문법: <별칭>:<관계테이블>(컬럼...) 또는 (*) 로 모든 컬럼.
  return supabase
    .from("dreams")
    .select("*, dream_item:dream_items(*)")
    .order("created_at", { ascending: false })
    .returns<DreamRecord[]>();
}

// 보관함 미리 받기(홈) — 탭 첫 진입에서 스피너 없이 바로 뜨게 한다.
// 이미 신선한 캐시가 있으면 prefetchQuery 가 네트워크를 타지 않는다.
export function prefetchMyDreams(userId: string): Promise<void> {
  return queryClient.prefetchQuery({
    queryKey: myDreamsKey(userId),
    queryFn: fetchMyDreams,
    staleTime: MY_DREAMS_STALE_MS,
  });
}

// useQuery/prefetch 용 — 에러를 throw 로 바꿔 Query 가 error 상태를 갖게 한다.
export async function fetchMyDreams(): Promise<DreamRecord[]> {
  const { data, error } = await listMyDreams();
  if (error) throw new Error(error.message);
  return data ?? [];
}

// 단건 조회 — 편집 화면에서 사용. RLS 가 본인 row 만 통과시킨다.
export async function getDream(id: string) {
  return supabase
    .from("dreams")
    .select("*, dream_item:dream_items(*)")
    .eq("id", id)
    .single<DreamRecord>();
}

export function todayISODate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function isValidISODate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

export interface DreamStats {
  total: number;
  avgLuck: number;
  daysSinceLast: number | null;
}

export function computeStats(dreams: DreamRecord[]): DreamStats {
  if (dreams.length === 0) {
    return { total: 0, avgLuck: 0, daysSinceLast: null };
  }
  const total = dreams.length;
  const avgLuck = Math.round(
    dreams.reduce((sum, d) => sum + (d.luck_index ?? 0), 0) / total,
  );
  // dreams 는 created_at DESC 정렬되어 들어온다고 가정 — 첫 행이 가장 최근
  const last = new Date(dreams[0].created_at);
  const now = new Date();
  const daysSinceLast = Math.max(
    0,
    Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)),
  );
  return { total, avgLuck, daysSinceLast };
}
