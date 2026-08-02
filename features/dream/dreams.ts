import { supabase } from "@/lib/supabase";
import type { DreamMoodTag } from "@/features/dream/dreamData";

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

  return supabase
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

  return supabase
    .from("dreams")
    .update(patch)
    .eq("id", id)
    .select()
    .single<DreamRecord>();
}

// 본인 꿈만 삭제 가능 — RLS(dreams_delete_own) 가 user_id = auth.uid() 강제.
export async function deleteDream(id: string) {
  return supabase.from("dreams").delete().eq("id", id);
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

// ── 보관함 프리페치 캐시 ────────────────────────────────────────
// 홈이 준비된 뒤 보관함 목록을 백그라운드로 미리 당겨둔다. 보관함 탭 첫 진입에서
// 스피너 없이 즉시 뜨게 하는 용도. 보관함은 포커스마다 재조회하므로, 캐시가 조금
// 오래돼도 화면 진입 시 자동 갱신되어 안전하다(첫 마운트의 스피너만 제거).
let dreamsCache: { data: DreamRecord[]; at: number } | null = null;
let dreamsInflight: Promise<void> | null = null;

// 캐시가 maxAgeMs 이내면 반환, 아니면 null. 보관함 첫 마운트 초기 상태 seed 용.
export function getCachedMyDreams(maxAgeMs = 15000): DreamRecord[] | null {
  if (dreamsCache && Date.now() - dreamsCache.at < maxAgeMs) return dreamsCache.data;
  return null;
}

// 백그라운드 프리페치. 동시 호출은 진행 중인 하나로 합친다(fire-and-forget).
export function prefetchMyDreams(): Promise<void> {
  if (dreamsInflight) return dreamsInflight;
  dreamsInflight = listMyDreams()
    .then(({ data, error }) => {
      if (!error && data) dreamsCache = { data, at: Date.now() };
    })
    .catch(() => {})
    .finally(() => {
      dreamsInflight = null;
    });
  return dreamsInflight;
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
