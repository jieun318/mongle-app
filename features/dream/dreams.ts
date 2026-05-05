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
  mood_tags: DreamMoodTag[];
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
  mood_tags: DreamMoodTag[];
  chat_preview: ChatTurn[];
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
    })
    .select()
    .single<DreamRecord>();
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

// 마이페이지 통계: 기록된 꿈 수 / 연속 기록 일수 / 최다 유형
export interface MypageStats {
  total: number;
  streak: number;
  topType: string | null; // '길몽' | '흉몽' | '태몽' | null
}

function isoToYMD(iso: string): string {
  // 'YYYY-MM-DDTHH:mm:ss...' → 'YYYY-MM-DD'
  return iso.slice(0, 10);
}

function todayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftYMD(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, "0");
  const nd = String(dt.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

export function computeMypageStats(dreams: DreamRecord[]): MypageStats {
  if (dreams.length === 0) return { total: 0, streak: 0, topType: null };

  // 기록된 꿈 수
  const total = dreams.length;

  // 연속 기록 일수 — dream_date 기준, 가장 최근 기록일부터 거꾸로 카운트.
  //   오늘 기록이 있으면 오늘부터, 없으면 가장 최근 기록일부터 시작.
  const dateSet = new Set(dreams.map((d) => d.dream_date));
  const today = todayYMD();
  let cursor = dateSet.has(today)
    ? today
    : [...dateSet].sort().reverse()[0] ?? today;
  let streak = 0;
  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = shiftYMD(cursor, -1);
  }

  // 최다 유형 — dream_item.tags[0] 기준 (없으면 mood_tags 첫 항목)
  const tagCount = new Map<string, number>();
  for (const d of dreams) {
    const item = d.dream_item;
    const tag =
      item?.tags?.[0] ??
      d.mood_tags?.[0]?.label ??
      null;
    if (!tag) continue;
    tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
  }
  let topType: string | null = null;
  let topCount = 0;
  for (const [tag, count] of tagCount) {
    if (count > topCount) {
      topCount = count;
      topType = tag;
    }
  }

  return { total, streak, topType };
}

// 이번 주 운세 — 월~일 7일치, 각 날짜의 평균 luck_index
export interface WeekDayFortune {
  ymd: string;
  weekday: number; // 0=월 ... 6=일
  weekdayLabel: string;
  date: number; // 일자
  luck: number | null;
  count: number; // 그날 기록한 꿈 수
}

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function startOfThisWeekMonday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // getDay(): 0=일 ... 6=토. 월요일 시작 보정.
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

export function computeThisWeekFortune(dreams: DreamRecord[]): WeekDayFortune[] {
  const weekStart = startOfThisWeekMonday();
  const buckets: Map<string, { sum: number; count: number }> = new Map();

  for (const d of dreams) {
    const ymd = isoToYMD(d.dream_date);
    const cur = buckets.get(ymd) ?? { sum: 0, count: 0 };
    cur.sum += d.luck_index ?? d.dream_item?.luck_index ?? 0;
    cur.count += 1;
    buckets.set(ymd, cur);
  }

  const result: WeekDayFortune[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(weekStart);
    dt.setDate(weekStart.getDate() + i);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    const ymd = `${y}-${m}-${d}`;
    const bucket = buckets.get(ymd);
    result.push({
      ymd,
      weekday: i,
      weekdayLabel: WEEKDAY_LABELS[i],
      date: dt.getDate(),
      luck: bucket && bucket.count > 0 ? Math.round(bucket.sum / bucket.count) : null,
      count: bucket?.count ?? 0,
    });
  }
  return result;
}

// 지난 운세 — 주 단위로 묶은 카드용 데이터
export interface WeeklyFortuneCard {
  weekStartYMD: string; // 월요일
  weekEndYMD: string;   // 일요일
  monthLabel: string;   // '5월' (월요일 기준)
  rangeLabel: string;   // '5월 1일 ~ 5월 7일'
  count: number;
  avgLuck: number;
  topTitle: string | null; // 그 주 최고 luck 의 꿈 제목
}

function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateToYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mondayOf(ymd: string): Date {
  const d = ymdToDate(ymd);
  d.setHours(0, 0, 0, 0);
  const wd = d.getDay();
  const offset = wd === 0 ? -6 : 1 - wd;
  d.setDate(d.getDate() + offset);
  return d;
}

export function computeWeeklyHistory(dreams: DreamRecord[]): WeeklyFortuneCard[] {
  if (dreams.length === 0) return [];

  const groups = new Map<
    string,
    {
      weekStart: Date;
      weekEnd: Date;
      luckSum: number;
      count: number;
      topLuck: number;
      topTitle: string | null;
    }
  >();

  for (const d of dreams) {
    const monday = mondayOf(d.dream_date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const key = dateToYMD(monday);
    const cur = groups.get(key) ?? {
      weekStart: monday,
      weekEnd: sunday,
      luckSum: 0,
      count: 0,
      topLuck: -1,
      topTitle: null,
    };
    const luck = d.luck_index ?? d.dream_item?.luck_index ?? 0;
    cur.luckSum += luck;
    cur.count += 1;
    if (luck > cur.topLuck) {
      cur.topLuck = luck;
      cur.topTitle = d.dream_item?.title ?? d.title;
    }
    groups.set(key, cur);
  }

  const cards: WeeklyFortuneCard[] = [];
  for (const [key, g] of groups) {
    const startMonth = g.weekStart.getMonth() + 1;
    const startDay = g.weekStart.getDate();
    const endMonth = g.weekEnd.getMonth() + 1;
    const endDay = g.weekEnd.getDate();
    cards.push({
      weekStartYMD: key,
      weekEndYMD: dateToYMD(g.weekEnd),
      monthLabel: `${startMonth}월`,
      rangeLabel: `${startMonth}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`,
      count: g.count,
      avgLuck: g.count > 0 ? Math.round(g.luckSum / g.count) : 0,
      topTitle: g.topTitle,
    });
  }

  cards.sort((a, b) => (a.weekStartYMD < b.weekStartYMD ? 1 : -1));
  return cards;
}
