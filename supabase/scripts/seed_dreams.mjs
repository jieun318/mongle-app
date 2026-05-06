// ============================================================
// supabase/scripts/seed_dreams.mjs
//   supabase/seeds/dreams_crawled.json -> public.dream_items 업서트
//
// 실행:
//   node supabase/scripts/seed_dreams.mjs
//
// 사전 조건 (.env):
//   SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
//
// 사전 조건 (DB):
//   supabase/migrations/0001_dream_items_crawled_columns.sql 적용 완료
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

// ── .env 로더 (의존성 없음) ────────────────────────────────
function loadDotEnv() {
  const envPath = resolve(ROOT, ".env");
  let text;
  try {
    text = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "❌ .env에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 필요합니다."
  );
  process.exit(1);
}

// ── 매핑 룰 ────────────────────────────────────────────────
const CATEGORY_EMOJI = {
  animal: "🐾",
  nature: "🌿",
  body: "👤",
  daily: "🏠",
  lucky: "🍀",
  unlucky: "⚡",
  pregnancy: "👶",
  mystic: "🔮",
  people: "👥",
  place: "📍",
};

// keyword(=title) 안에 substring 으로 들어 있으면 해당 emoji 사용.
// 순서가 곧 우선순위. 위에서 먼저 매칭된 것이 적용됨.
//   - 복합어 / 더 구체적인 단어가 먼저 와야 함.
//     예) '용상'(throne) → '용', '멧돼지' → '돼지', '땅거미'(거미) → '땅' 등
const KEYWORD_EMOJI_RULES = [
  // ── 복합어 / 충돌 방지용 (반드시 더 일반어보다 먼저)
  ["불꽃놀이", "🎆"],
  ["무지개", "🌈"],
  ["번개", "⚡"],
  ["벼락", "⚡"],
  ["지진", "🌋"],
  ["태양", "☀️"],
  ["머리카락", "💇"],
  ["이빨", "🦷"],
  ["동전", "💰"],
  ["용상", "👑"], // 임금이 앉는 자리 (용 ≠ dragon)
  ["멧돼지", "🐗"],
  ["산돼지", "🐗"],
  ["금붕어", "🐠"],
  ["물고기", "🐟"],
  ["땅거미", "🕷️"],

  // ── 구체 사물 / 동물
  ["옥새", "👑"],
  ["임금", "👑"],
  ["대통령", "🎖️"],
  ["자동차", "🚗"],
  ["권총", "🔫"],
  ["화장실", "🚽"],
  ["지옥", "🔥"],
  ["지도", "🗺️"],
  ["시체", "💀"],
  ["그림", "🖼️"],
  ["분꽃", "🌸"],
  ["연못", "💦"],
  ["나무", "🌳"],
  ["구렁이", "🐍"],
  ["지렁이", "🪱"],
  ["구더기", "🐛"],
  ["거미", "🕷️"],
  ["쥐", "🐭"],
  ["곤충", "🐛"],
  // '감' 은 substring 충돌이 많아 (감다/감기다/감기/공감 등) 룰에서 제외.
  ["쌀", "🍚"],
  ["옷", "👕"],
  ["칼", "🔪"],
  ["연장", "🔧"],
  ["쇠기둥", "🏛️"],

  // ── 동물 (단음절 키 포함, 대체로 모호하지 않음)
  ["뱀", "🐍"],
  ["돼지", "🐷"],
  ["호랑이", "🐯"],
  ["강아지", "🐶"],
  ["고양이", "🐱"],
  ["용", "🐉"],

  // ── 인물 / 영적
  ["귀신", "👻"],
  ["천사", "👼"],
  ["죽음", "💀"],
  ["아기", "👶"],
  ["가족", "👨‍👩‍👧"],

  // ── 재물 / 식음
  ["금은보화", "💎"],
  ["보석", "💎"],
  ["과일", "🍎"],
  ["꽃", "🌸"],
  ["음식", "🍽️"],
  ["돈", "💰"],

  // ── 자연 (구체적인 것 먼저)
  //   '물' 을 '불' 보다 먼저: '물이 불어나는 꿈' 같은 케이스에서 주어인 '물' 을 우선.
  ["별", "⭐"],
  ["하늘", "☁️"],
  ["땅", "🌍"],
  ["물", "💧"],
  ["불", "🔥"],

  // ── 모호한 substring — 후순위
  ["해", "☀️"],
  ["달", "🌙"],
  ["비", "🌧️"],
  ["눈", "❄️"],
  ["손", "🖐️"],
  ["발", "🦶"],
  ["피", "🩸"],
];

// 카테고리별로 "주어가 될 수 있는" 키워드 목록.
//   title 매칭이 카테고리와 무관한 단어(예: animal 카테고리에서 '칼')에
//   끌려가지 않도록, 카테고리 화이트리스트 안에서만 우선 매칭한다.
//   동일 카테고리 안에서는 더 구체적인 단어가 먼저 와야 substring 충돌을 피함.
const CATEGORY_PRIORITY_NEEDLES = {
  animal: [
    "멧돼지", "산돼지", "아기돼지", "새끼돼지",
    "금붕어", "물고기",
    "구렁이", "지렁이", "구더기", "땅거미", "거미", "곤충",
    "뱀", "돼지", "호랑이", "강아지", "고양이", "용", "쥐",
  ],
  nature: [
    "불꽃놀이", "무지개", "번개", "벼락", "지진", "태양",
    "연못", "나무", "별", "하늘", "땅", "물", "불",
    "해", "달", "비", "눈",
  ],
  body: ["머리카락", "이빨", "피", "손", "발", "눈"],
  daily: [
    "자동차", "권총", "화장실", "지옥", "지도", "시체", "그림",
    "연장", "쇠기둥", "옷", "음식", "돈", "쌀", "칼",
  ],
  people: ["가족", "아기", "임금", "대통령", "용상", "옥새"],
  pregnancy: ["금붕어", "물고기", "보석", "꽃", "분꽃", "과일", "용", "뱀", "돼지"],
  mystic: ["귀신", "천사", "죽음"],
  lucky: ["금은보화", "보석", "돈", "쌀"],
  unlucky: ["지옥", "시체", "죽음"],
};

const EMOJI_BY_NEEDLE = Object.fromEntries(KEYWORD_EMOJI_RULES);

// 카테고리 화이트리스트 안에서 title 에 등장하는 needle 들을 우선순위 순서로 수집.
//   resolveEmoji / 키워드 보강에서 공통으로 사용.
function matchedCategoryNeedles(item) {
  const title = item.keyword ?? "";
  const priority = CATEGORY_PRIORITY_NEEDLES[item.category];
  if (!priority) return [];
  const out = [];
  for (const needle of priority) {
    if (title.includes(needle)) out.push(needle);
  }
  return out;
}

// emoji 우선순위:
//   1) 카테고리 화이트리스트 안의 첫 매칭  (animal × '돼지' → 🐷, animal × '칼' 무시)
//   2) 카테고리 대표 emoji                   (animal × 매칭 없음 → 🐾)
//   3) 카테고리 화이트리스트가 없는 경우에만 글로벌 룰을 fallback 으로 적용
function resolveEmoji(item) {
  const matched = matchedCategoryNeedles(item);
  for (const needle of matched) {
    const emoji = EMOJI_BY_NEEDLE[needle];
    if (emoji) return emoji;
  }
  if (CATEGORY_PRIORITY_NEEDLES[item.category]) {
    return CATEGORY_EMOJI[item.category] ?? "💭";
  }
  const title = item.keyword ?? "";
  for (const [needle, emoji] of KEYWORD_EMOJI_RULES) {
    if (title.includes(needle)) return emoji;
  }
  return CATEGORY_EMOJI[item.category] ?? "💭";
}

const LUCK_BY_TYPE = {
  길몽: 80,
  태몽: 70,
  보통: 50,
  흉몽: 20,
};

function computeLuckIndex(item) {
  if (item.type !== "조건부") {
    return LUCK_BY_TYPE[item.type] ?? 50;
  }
  const types = new Set((item.conditions ?? []).map((c) => c.type));
  const hasGood = types.has("길몽") || types.has("태몽");
  const hasBad = types.has("흉몽");
  if (hasGood && !hasBad) return 70;
  if (hasBad && !hasGood) return 30;
  return 50;
}

function computeTags(item) {
  if (item.type === "조건부") {
    const inner = [...new Set((item.conditions ?? []).map((c) => c.type))];
    return ["조건부", ...inner];
  }
  return [item.type];
}

function buildRow(item, idx) {
  const id = `crawled-${String(idx + 1).padStart(3, "0")}`;
  const description = item.interpretation ?? "";
  const preview = description.slice(0, 50);
  const tags = computeTags(item);
  // 의미 태그(item.tags)에 더해 title 에서 뽑아낸 주어 키워드도 함께 저장.
  //   → 카테고리 화면의 #돼지 / #뱀 필터가 keywords 컬럼만으로 매칭 가능.
  const semanticKeywords = item.tags ?? [];
  const subjectKeywords = matchedCategoryNeedles(item);
  const keywords = [...new Set([...subjectKeywords, ...semanticKeywords])];
  return {
    id,
    category_id: item.category,
    title: item.keyword,
    preview,
    description,
    emoji: resolveEmoji(item),
    tags,
    keywords,
    bookmark_count: 0,
    luck_index: computeLuckIndex(item),
    is_warning: item.type === "흉몽",
    mood_tags: tags,
    conditions: item.conditions ?? [],
    source_url: item.source_url ?? null,
  };
}

// ── 실행 ───────────────────────────────────────────────────
const dataPath = resolve(ROOT, "supabase", "seeds", "dreams_crawled.json");
const items = JSON.parse(readFileSync(dataPath, "utf8"));
const rows = items.map(buildRow);

console.log(`📦 ${rows.length}개 항목을 dream_items에 업서트합니다...`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BATCH = 100;
let done = 0;

for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const { error } = await supabase
    .from("dream_items")
    .upsert(chunk, { onConflict: "id" });

  if (error) {
    console.error(
      `❌ ${i + 1}~${i + chunk.length} 실패: ${error.message}`
    );
    process.exit(1);
  }

  done += chunk.length;
  console.log(`  ✓ ${done}/${rows.length}`);
}

console.log(`\n✅ 완료: dream_items에 ${rows.length}건 업서트되었습니다.`);
