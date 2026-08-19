import { supabase } from "@/lib/supabase";
import type { Fortune, FortuneGrade } from "@/types/fortune";

export interface DailyFortuneRow {
  user_id: string;
  date: string; // YYYY-MM-DD
  grade: FortuneGrade;
  payload: Fortune;
  created_at: string;
}

// 오늘 (혹은 임의 dateKey) 의 운세 1건 조회. 비로그인/없음 → null.
export async function loadDailyFortuneFromDB(
  dateKey: string,
): Promise<Fortune | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("daily_fortunes")
    .select("payload")
    .eq("user_id", user.id)
    .eq("date", dateKey)
    .maybeSingle();

  if (error) {
    console.warn("[daily_fortunes] load failed:", error.message);
    return null;
  }
  if (!data) return null;
  return data.payload as Fortune;
}

// 운세 영속화 (upsert). 비로그인 시 no-op.
export async function saveDailyFortuneToDB(
  dateKey: string,
  fortune: Fortune,
  expectedUserId?: string,
): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return;
  // 호출부가 소유자 검증에 쓴 uid 와 실제 저장 대상이 같은지 확인.
  // getUser() 가 두 번 불리는 사이에 계정이 바뀌는 좁은 창을 막는다.
  if (expectedUserId && user.id !== expectedUserId) return;

  const { error } = await supabase
    .from("daily_fortunes")
    .upsert(
      {
        user_id: user.id,
        date: dateKey,
        grade: fortune.grade,
        payload: fortune,
      },
      { onConflict: "user_id,date" },
    );

  if (error) {
    console.warn("[daily_fortunes] save failed:", error.message);
  }
}

// 기간 내 모든 운세 조회 (mypage 주간 / 지난 운세 페이지에서 사용).
export async function listDailyFortunesInRange(
  startYMD: string,
  endYMD: string,
): Promise<DailyFortuneRow[]> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from("daily_fortunes")
    .select("user_id, date, grade, payload, created_at")
    .eq("user_id", user.id)
    .gte("date", startYMD)
    .lte("date", endYMD)
    .order("date", { ascending: true });

  if (error) {
    console.warn("[daily_fortunes] range load failed:", error.message);
    return [];
  }
  if (!data) return [];
  return data as DailyFortuneRow[];
}

// ── 이번 주 (월~일) 일별 등급 ─────────────────────────────────
export interface WeekDayFortune {
  ymd: string;
  weekday: number; // 0=월 ... 6=일
  weekdayLabel: string;
  date: number;
  grade: FortuneGrade | null; // 그날 운세를 본 적이 없으면 null
  payload: Fortune | null;    // 그날 운세 본문 (메시지/팁/럭키 등)
}

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function startOfThisWeekMonday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=일 ... 6=토
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d;
}

function dateToYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function loadThisWeekFortunes(): Promise<WeekDayFortune[]> {
  const monday = startOfThisWeekMonday();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const rows = await listDailyFortunesInRange(
    dateToYMD(monday),
    dateToYMD(sunday),
  );
  const byDate = new Map(rows.map((r) => [r.date, r] as const));

  const out: WeekDayFortune[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const ymd = dateToYMD(d);
    const row = byDate.get(ymd);
    out.push({
      ymd,
      weekday: i,
      weekdayLabel: WEEKDAY_LABELS[i],
      date: d.getDate(),
      grade: row?.grade ?? null,
      payload: row?.payload ?? null,
    });
  }
  return out;
}

// ── 지난 주(들) — 이번 주 월요일 이전의 모든 운세를 주 단위로 묶어 반환 ──
export interface PastWeek {
  weekStartYMD: string; // 월요일 YMD
  weekEndYMD: string;   // 일요일 YMD
  monthLabel: string;   // "5월" (월요일 기준)
  rangeLabel: string;   // "5월 1일 ~ 5월 7일"
  days: WeekDayFortune[]; // 월~일 7개 (운세 없으면 grade/payload null)
}

function mondayOfYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  const wd = dt.getDay();
  const offset = wd === 0 ? -6 : 1 - wd;
  dt.setDate(dt.getDate() + offset);
  return dt;
}

export async function loadPastWeeksFortunes(): Promise<PastWeek[]> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return [];

  const thisMonday = startOfThisWeekMonday();
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  const lastSundayYMD = dateToYMD(lastSunday);

  // 이번 주 월요일 이전의 모든 운세
  const { data, error } = await supabase
    .from("daily_fortunes")
    .select("user_id, date, grade, payload, created_at")
    .eq("user_id", user.id)
    .lte("date", lastSundayYMD)
    .order("date", { ascending: false });

  if (error || !data || data.length === 0) return [];
  const rows = data as DailyFortuneRow[];

  // 주(월요일 키) 별로 그룹핑
  const byWeek = new Map<string, DailyFortuneRow[]>();
  for (const r of rows) {
    const key = dateToYMD(mondayOfYMD(r.date));
    const arr = byWeek.get(key) ?? [];
    arr.push(r);
    byWeek.set(key, arr);
  }

  const weeks: PastWeek[] = [];
  // Map iteration 순서는 insertion 순. 최신 row 부터 들어왔으니 최신 주가 먼저.
  for (const [weekStartYMD, weekRows] of byWeek) {
    const monday = mondayOfYMD(weekRows[0].date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const byDate = new Map(weekRows.map((r) => [r.date, r] as const));

    const days: WeekDayFortune[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ymd = dateToYMD(d);
      const row = byDate.get(ymd);
      days.push({
        ymd,
        weekday: i,
        weekdayLabel: WEEKDAY_LABELS[i],
        date: d.getDate(),
        grade: row?.grade ?? null,
        payload: row?.payload ?? null,
      });
    }

    const startMonth = monday.getMonth() + 1;
    const startDay = monday.getDate();
    const endMonth = sunday.getMonth() + 1;
    const endDay = sunday.getDate();
    weeks.push({
      weekStartYMD,
      weekEndYMD: dateToYMD(sunday),
      monthLabel: `${startMonth}월`,
      rangeLabel: `${startMonth}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`,
      days,
    });
  }
  return weeks;
}
