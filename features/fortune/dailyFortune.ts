import AsyncStorage from "@react-native-async-storage/async-storage";
import { Fortune, FortuneGrade } from "@/types/fortune";

export { LUCKY_SMOKE, getSmokePalette } from "./smokePalette";

const DEVICE_ID_KEY = "deviceId";
const FORTUNE_CACHE_KEY = "dailyFortune";

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
  "조심": { title: "주의가 필요한 날",   icon: "🌧", color: "#991B1B", bgColor: "#FEE2E2", weight: 2 },
};

const MESSAGES: Record<FortuneGrade, readonly string[]> = {
  "대길": [
    "오늘은 바라던 일이 술술 풀리는 날이에요.\n망설이던 일을 시작해보세요.",
    "기다려온 좋은 소식이 찾아올 거예요.\n마음을 열어두세요.",
    "주변 사람들의 응원이 큰 힘이 되는 하루예요.",
    "노력한 만큼의 결실이 보이기 시작할 거예요.",
    "행운이 가까이 있어요.\n작은 신호도 놓치지 마세요.",
    "오늘 시작한 일이 뜻밖의 행운으로 이어질 수 있어요.",
    "자신감을 가지고 움직이세요.\n모든 일이 매끄럽게 풀려요.",
  ],
  "소길": [
    "오늘은 뜻밖의 인연이 찾아올 거예요.\n마음을 열고 새로운 만남을 받아들여 보세요.",
    "작은 즐거움이 곳곳에 숨어있는 하루예요.",
    "다정한 한마디가 누군가의 하루를 바꿀 수 있어요.",
    "조용히 미소 짓게 하는 좋은 일이 생길 거예요.",
    "오랜만에 만나는 사람과 즐거운 시간이 기다려요.",
    "새로운 취미나 관심사가 눈에 들어올 수 있어요.",
    "마음에 두었던 일을 살짝 시도해보기 좋은 날이에요.",
  ],
  "평범": [
    "특별한 일은 없지만 평온한 하루를 보낼 거예요.",
    "익숙한 일에서 작은 깨달음을 얻을 수 있는 날이에요.",
    "급하지 않게 차근차근 진행하면 좋은 흐름이 생겨요.",
    "오늘은 충전의 날.\n무리하지 말고 자신을 돌봐주세요.",
    "지금 머무는 자리에서 안정감을 느낄 수 있을 거예요.",
    "주변을 정리하는 것만으로도 마음이 가벼워져요.",
    "잠시 멈춰 서서 하늘을 보는 여유를 가져보세요.",
  ],
  "조심": [
    "오늘은 신중하게 행동하는 게 좋아요.\n결정을 서두르지 마세요.",
    "감정이 크게 흔들릴 수 있어요.\n한 박자 쉬어가세요.",
    "예상치 못한 변수가 생길 수 있으니 여유를 두세요.",
    "사소한 말다툼을 피하는 게 좋은 날이에요.",
    "물건을 잃어버리지 않도록 주의하세요.",
    "큰 결정은 다음으로 미루는 게 안전해요.",
    "피곤할 수 있으니 충분히 쉬어주세요.",
  ],
};

const TIPS: readonly string[] = [
  "성급한 판단은 금물!\n결정을 서두르기보다 한 번 더 생각해보세요",
  "오늘 만나는 사람에게 먼저 인사를 건네보세요",
  "물 한 잔 마시고 깊게 숨을 쉬어보세요",
  "감사한 일 하나를 기록해보면 마음이 가벼워져요",
  "익숙한 길 대신 새로운 길로 다녀보세요",
  "오늘만큼은 휴대폰을 잠시 내려놓아도 좋아요",
  "작은 친절을 베풀면 더 큰 행운이 돌아올 수 있어요",
  "모르는 것은 솔직하게 묻는 용기가 필요해요",
  "혼자만의 시간을 짧게라도 가져보세요",
  "잠들기 전 오늘의 좋은 순간을 떠올려보세요",
  "오늘 한 가지는 미루지 말고 끝내보세요",
  "주변 사람에게 고맙다는 말을 전해보세요",
];

const LUCKY_COLORS: readonly string[] = [
  "라벤더", "보라", "파랑", "하늘", "초록", "민트", "연두",
  "노랑", "주황", "빨강", "분홍", "코랄", "베이지", "금색",
];

const GRADE_KEYS: readonly FortuneGrade[] = ["대길", "소길", "평범", "조심"];

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

export async function getDailyFortune(): Promise<Fortune> {
  const now = new Date();
  const dKey = dateKey(now);

  // 같은 날짜면 캐시된 운세 그대로
  try {
    const cached = await AsyncStorage.getItem(FORTUNE_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as { dateKey: string; fortune: Fortune };
      if (parsed.dateKey === dKey) return parsed.fortune;
    }
  } catch {
    // 캐시 손상 시 무시하고 새로 생성
  }

  const deviceId = await getDeviceId();
  const seed = hashString(`${deviceId}::${dKey}`);
  const rng = mulberry32(seed);

  const grade = pickWeighted(
    rng,
    GRADE_KEYS,
    GRADE_KEYS.map((g) => GRADE_META[g].weight)
  );
  const meta = GRADE_META[grade];
  const message = pickOne(rng, MESSAGES[grade]);
  const tip = pickOne(rng, TIPS);
  const luckyColor = pickOne(rng, LUCKY_COLORS);

  // 행운의 숫자: 1~49 사이 1~2개
  const n1 = 1 + Math.floor(rng() * 49);
  let n2 = 1 + Math.floor(rng() * 49);
  while (n2 === n1) n2 = 1 + Math.floor(rng() * 49);
  const twoNumbers = rng() < 0.7;
  const luckyNumber = twoNumbers ? `${n1}, ${n2}` : `${n1}`;

  const fortune: Fortune = {
    date: dateDisplay(now),
    grade,
    gradeTitle: meta.title,
    gradeColor: meta.color,
    gradeBgColor: meta.bgColor,
    gradeIcon: meta.icon,
    message,
    luckyNumber,
    luckyColor,
    caution: tip,
  };

  try {
    await AsyncStorage.setItem(
      FORTUNE_CACHE_KEY,
      JSON.stringify({ dateKey: dKey, fortune })
    );
  } catch {}

  return fortune;
}

// DEV: 캐시 비우고 새로 뽑기
export async function resetDailyFortune(): Promise<Fortune> {
  try {
    await AsyncStorage.removeItem(FORTUNE_CACHE_KEY);
  } catch {}
  return getDailyFortune();
}

// DEV: 랜덤 시드로 운세 한 번 굴려보기 — 캐시 건드리지 않음 (UI 테스트용)
export function rollRandomFortune(): Fortune {
  const now = new Date();
  const seed = (Math.random() * 0xffffffff) >>> 0;
  const rng = mulberry32(seed);

  const grade = pickWeighted(
    rng,
    GRADE_KEYS,
    GRADE_KEYS.map((g) => GRADE_META[g].weight)
  );
  const meta = GRADE_META[grade];
  const message = pickOne(rng, MESSAGES[grade]);
  const tip = pickOne(rng, TIPS);
  const luckyColor = pickOne(rng, LUCKY_COLORS);

  const n1 = 1 + Math.floor(rng() * 49);
  let n2 = 1 + Math.floor(rng() * 49);
  while (n2 === n1) n2 = 1 + Math.floor(rng() * 49);
  const twoNumbers = rng() < 0.7;
  const luckyNumber = twoNumbers ? `${n1}, ${n2}` : `${n1}`;

  return {
    date: dateDisplay(now),
    grade,
    gradeTitle: meta.title,
    gradeColor: meta.color,
    gradeBgColor: meta.bgColor,
    gradeIcon: meta.icon,
    message,
    luckyNumber,
    luckyColor,
    caution: tip,
  };
}
