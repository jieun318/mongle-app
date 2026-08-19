import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CategoryScore,
  Fortune,
  FortuneCategory,
  FortuneCategoryKey,
  FortuneGrade,
  FortuneLucky,
  MoodType,
} from "@/types/fortune";
import { supabase } from "@/lib/supabase";
import {
  loadDailyFortuneFromDB,
  saveDailyFortuneToDB,
} from "./dailyFortuneRepo";
import { OVERALL_MESSAGES, OVERALL_TIPS_BY_MOOD } from "./content/overall";
import {
  CATEGORY_POOLS,
  SCORE_WEIGHTS,
} from "./content/categories";
import {
  LUCKY_COLORS_BY_MOOD,
  LUCKY_DIRECTIONS,
  LUCKY_ITEMS,
  LUCKY_TIMES,
} from "./content/lucky";

export { LUCKY_SMOKE, getSmokePalette } from "./smokePalette";

const DEVICE_ID_KEY = "deviceId";
// 로그아웃 정리(lib/sessionCleanup)에서도 지워야 해 export 한다.
export const FORTUNE_CACHE_KEY = "dailyFortune";
// 오늘 구슬을 이미 탭했는지. 쓰는 곳은 홈 화면이지만 운세 로컬 상태라
// 키는 여기서 함께 관리한다 (문자열이 두 곳에서 어긋나지 않게).
export const FORTUNE_VIEWED_DATE_KEY = "fortune.viewedDate";

// 캐시 payload — seedId 로 소유자를 함께 기록한다. 날짜가 같아도 계정이
// 다르면 무효여야 하기 때문.
type FortuneCache = { dateKey: string; seedId: string; fortune: Fortune };

// 등급별 메타
const GRADE_META: Record<FortuneGrade, {
  title: string;
  icon: string;
  color: string;
  bgColor: string;
  weight: number;
}> = {
  "대길": { title: "아주 좋은 날",      icon: "🌟", color: "#92400E", bgColor: "#FEF9C3", weight: 1 },
  "소길": { title: "좋은 날",            icon: "🌿", color: "#166534", bgColor: "#DCFCE7", weight: 3 },
  "평범": { title: "보통의 날",          icon: "🌤", color: "#0369A1", bgColor: "#E0F2FE", weight: 4 },
  "조심": { title: "주의가 필요한 날",   icon: "⚠️", color: "#991B1B", bgColor: "#FEE2E2", weight: 2 },
};

const GRADE_KEYS: readonly FortuneGrade[] = ["대길", "소길", "평범", "조심"];

// 등급(4단계) → mood(3단계). 럭키 색·종합 팁 선택에 사용.
const GRADE_TO_MOOD: Record<FortuneGrade, MoodType> = {
  "대길": "good",
  "소길": "good",
  "평범": "normal",
  "조심": "caution",
};

const CATEGORY_KEYS: readonly FortuneCategoryKey[] = [
  "love", "work", "money", "health", "social",
];

const SCORE_KEYS: readonly CategoryScore[] = [5, 4, 3, 2, 1];

// 시드 기반 RNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickWeighted<T>(rng: () => number, items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pickOne<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateDisplay(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id =
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 6);
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// 시드 ID: 로그인된 경우 userId 우선 (같은 계정이면 어느 기기에서든 동일 운세),
//          비로그인 시 deviceId 폴백.
async function getSeedId(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
  } catch {}
  return getDeviceId();
}

// 카테고리별 sub-seed — 종합 시드와 별개 namespace.
// 무료(overall/lucky) 영역의 변경이 유료(categories) 영역에 영향 주지 않도록 분리.
function generateCategory(
  baseSeedId: string,
  dKey: string,
  key: FortuneCategoryKey,
): FortuneCategory {
  const subSeed = hashString(`${baseSeedId}::${dKey}::cat::${key}`);
  const rng = mulberry32(subSeed);

  const score = pickWeighted(
    rng,
    SCORE_KEYS,
    SCORE_KEYS.map((s) => SCORE_WEIGHTS[s]),
  );
  const pool = CATEGORY_POOLS[key];
  const message = pickOne(rng, pool.messages[score]);
  const tip = pickOne(rng, pool.tips[score]);

  return { score, message, tip };
}

function generateAllCategories(
  baseSeedId: string,
  dKey: string,
): Record<FortuneCategoryKey, FortuneCategory> {
  return CATEGORY_KEYS.reduce(
    (acc, key) => {
      acc[key] = generateCategory(baseSeedId, dKey, key);
      return acc;
    },
    {} as Record<FortuneCategoryKey, FortuneCategory>,
  );
}

function generateLucky(seedId: string, dKey: string, mood: MoodType): FortuneLucky {
  const subSeed = hashString(`${seedId}::${dKey}::lucky`);
  const rng = mulberry32(subSeed);

  const n1 = 1 + Math.floor(rng() * 49);
  let n2 = 1 + Math.floor(rng() * 49);
  while (n2 === n1) n2 = 1 + Math.floor(rng() * 49);
  const twoNumbers = rng() < 0.7;
  const number = twoNumbers ? `${n1}, ${n2}` : `${n1}`;

  return {
    number,
    color: pickOne(rng, LUCKY_COLORS_BY_MOOD[mood]),
    item: pickOne(rng, LUCKY_ITEMS),
    direction: pickOne(rng, LUCKY_DIRECTIONS),
    time: pickOne(rng, LUCKY_TIMES),
  };
}

function generateFortune(seedId: string, dKey: string, now: Date): Fortune {
  // 종합 등급 / 메시지 / 팁 — 기존 시드 키 유지 (이전 사용자의 오늘 등급이 안 바뀌게)
  const overallSeed = hashString(`${seedId}::${dKey}`);
  const overallRng = mulberry32(overallSeed);

  const grade = pickWeighted(
    overallRng,
    GRADE_KEYS,
    GRADE_KEYS.map((g) => GRADE_META[g].weight),
  );
  const meta = GRADE_META[grade];
  const mood = GRADE_TO_MOOD[grade];
  const message = pickOne(overallRng, OVERALL_MESSAGES[grade]);
  const caution = pickOne(overallRng, OVERALL_TIPS_BY_MOOD[mood]);

  const lucky = generateLucky(seedId, dKey, mood);
  const categories = generateAllCategories(seedId, dKey);

  return {
    date: dateDisplay(now),
    grade,
    gradeTitle: meta.title,
    gradeColor: meta.color,
    gradeBgColor: meta.bgColor,
    gradeIcon: meta.icon,
    message,
    caution,
    luckyNumber: lucky.number,
    luckyColor: lucky.color,
    lucky,
    categories,
  };
}

// legacy DB row 호환: categories / lucky 가 비어있으면 시드로 채워서 반환.
// score 가 비정상이면 (이전 시드 알고리즘이 다르면) 다시 생성.
function backfillFortune(stored: Fortune, seedId: string, dKey: string): Fortune {
  let out = stored;
  if (!out.categories) {
    out = { ...out, categories: generateAllCategories(seedId, dKey) };
  }
  if (!out.lucky) {
    const lucky = generateLucky(seedId, dKey, GRADE_TO_MOOD[stored.grade]);
    out = {
      ...out,
      lucky,
      // top-level 도 비어있다면 같이 채움 (이전엔 둘 다 채워져 있었지만 방어적으로).
      luckyNumber: out.luckyNumber || lucky.number,
      luckyColor: out.luckyColor || lucky.color,
    };
  }
  return out;
}

async function cacheLocally(
  dKey: string,
  seedId: string,
  fortune: Fortune,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      FORTUNE_CACHE_KEY,
      JSON.stringify({ dateKey: dKey, seedId, fortune } satisfies FortuneCache),
    );
  } catch {}
}

// 우선순위: 캐시 > DB > 새로 생성. 캐시에 없으면 채우지만 DB 에는 자동 저장하지 않는다.
//   - 홈 화면 마운트 시 자동 호출되므로, 여기서 DB 저장을 해버리면 사용자가 구슬을
//     누르기 전에도 mypage 의 이번 주 운세에 표시되는 문제가 있었다.
//   - DB 영속화는 사용자가 구슬을 탭하는 시점에 commitDailyFortuneToDB 로 명시 호출.
//   - cache 없고 DB 있음 (이전에 이미 봐서 저장된 경우) → DB 값을 cache 로 백필.
export async function getDailyFortune(): Promise<Fortune> {
  const now = new Date();
  const dKey = dateKey(now);
  const seedId = await getSeedId();

  // 캐시 읽기
  let cached: Fortune | null = null;
  try {
    const raw = await AsyncStorage.getItem(FORTUNE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FortuneCache>;
      // seedId 불일치 = 다른 계정이 남긴 캐시.
      // seedId 없음 = 이 필드가 생기기 전 버전의 캐시라 소유자를 알 수 없으므로
      // 똑같이 버린다(= 오늘 1회 재생성되고 이후 정상).
      if (parsed.dateKey === dKey && parsed.seedId === seedId && parsed.fortune) {
        cached = parsed.fortune;
      }
    }
  } catch {
    // 캐시 손상 시 무시
  }

  // DB 확인 (로그인된 경우만 의미 있음)
  const dbFortune = await loadDailyFortuneFromDB(dKey).catch(() => null);

  // 우선순위: 캐시 > DB > 새로 생성
  let fortune: Fortune;
  if (cached) {
    fortune = backfillFortune(cached, seedId, dKey);
  } else if (dbFortune) {
    fortune = backfillFortune(dbFortune, seedId, dKey);
  } else {
    fortune = generateFortune(seedId, dKey, now);
  }

  // 캐시 백필만 수행 — DB 저장은 commitDailyFortuneToDB 에서.
  if (!cached) {
    await cacheLocally(dKey, seedId, fortune);
  }

  return fortune;
}

// 사용자가 구슬을 처음 탭한 시점에 호출 — 이번 주 운세 위젯에 표시되기 시작한다.
// upsert 라 여러 번 호출돼도 안전. 비로그인 시 no-op.
export async function commitDailyFortuneToDB(fortune: Fortune): Promise<void> {
  const dKey = dateKey(new Date());
  await saveDailyFortuneToDB(dKey, fortune).catch(() => {});
}
