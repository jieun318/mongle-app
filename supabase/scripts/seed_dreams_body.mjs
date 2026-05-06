// ============================================================
// supabase/scripts/seed_dreams_body.mjs
//   supabase/seeds/dreams_body.json -> public.dream_items 업서트
//
// 실행:
//   node supabase/scripts/seed_dreams_body.mjs
//
// 사전 조건 (.env):
//   SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
//
// 사전 조건 (DB):
//   supabase/migrations/0001_dream_items_crawled_columns.sql
//   supabase/migrations/0002_dream_items_is_lucky_column.sql  ← is_lucky 컬럼
//   ※ 컬럼이 없으면 스크립트가 사전 점검 단계에서 안내 후 종료합니다.
//
// ID 규칙:
//   JSON 의 정수 id 1..39 는 그대로 쓰면 기존 수동 시드(id='1'..'6') 와
//   충돌하므로, `body-001`...`body-039` 로 변환해서 upsert 합니다.
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

// ── is_lucky → 파생 필드 매핑 ─────────────────────────────
//   luck_index 는 is_lucky 분류별로 정해진 범위 안에서 결정됨.
//   같은 id 는 항상 같은 luck_index 가 나오도록 id 를 시드로 사용.
//     → 재실행해도 값이 바뀌지 않으므로 화면상 "지수" 가 안정적.
const LUCK_INDEX_RANGE = {
  lucky:       { min: 60, max: 100 },
  conditional: { min: 35, max: 65  },
  unlucky:     { min: 1,  max: 40  },
};

// 외부 라이브러리 없이 결정론적 0~1 난수.
//   Math.sin 의 비트 노이즈를 PRNG 처럼 활용 — 통계적 품질은 낮지만
//   "같은 seed → 같은 값" 이 보장되어 시드용으로는 충분.
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function randomLuckIndex(isLucky, id) {
  const range = LUCK_INDEX_RANGE[isLucky];
  if (!range) return 50;
  // id 예: "body-001" → 1.  매칭 실패하면 0 으로 fallback.
  const seed = parseInt(String(id).replace(/\D/g, ""), 10) || 0;
  return Math.floor(seededRandom(seed) * (range.max - range.min + 1)) + range.min;
}

function buildRow(item) {
  const id = `body-${String(item.id).padStart(3, "0")}`;
  const tags = item.tags ?? [];
  return {
    id,
    category_id: item.category_id,
    title: item.title,
    preview: item.preview ?? "",
    description: item.description ?? "",
    emoji: item.emoji ?? "💭",
    tags,
    keywords: item.keywords ?? [],
    bookmark_count: 0,
    luck_index: randomLuckIndex(item.is_lucky, id),
    is_warning: item.is_lucky === "unlucky",
    mood_tags: tags,
    is_lucky: item.is_lucky ?? null,
    conditions: item.conditions ?? [],
    source_url: null,
  };
}

// ── 실행 ───────────────────────────────────────────────────
const dataPath = resolve(ROOT, "supabase", "seeds", "dreams_body.json");
const items = JSON.parse(readFileSync(dataPath, "utf8"));
const rows = items.map(buildRow);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── 사전 점검: is_lucky 컬럼 존재 여부 ──────────────────────
const { error: probeError } = await supabase
  .from("dream_items")
  .select("is_lucky", { count: "exact", head: true });

if (probeError) {
  // 42703 = undefined_column
  if (probeError.code === "42703" || /is_lucky/.test(probeError.message ?? "")) {
    console.error("\n❌ dream_items 테이블에 is_lucky 컬럼이 없습니다.");
    console.error("   먼저 아래 SQL 을 Supabase SQL Editor 에 붙여 실행해 주세요:\n");
    console.error("   alter table public.dream_items");
    console.error("     add column if not exists is_lucky text;\n");
    console.error("   (또는 supabase/migrations/0002_dream_items_is_lucky_column.sql 적용)");
    process.exit(1);
  }
  console.error("❌ 사전 점검 실패:", probeError.message);
  process.exit(1);
}

console.log(`📦 ${rows.length}개 항목을 dream_items에 업서트합니다 (id: body-001 ~ body-${String(rows.length).padStart(3, "0")})...`);

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
