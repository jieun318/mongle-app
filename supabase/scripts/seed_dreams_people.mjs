// ============================================================
// supabase/scripts/seed_dreams_people.mjs
//   supabase/seeds/dreams_people.json -> public.dream_items 업서트
//
// 실행:
//   node supabase/scripts/seed_dreams_people.mjs
//
// 사전 조건 (.env):
//   SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
//
// 사전 조건 (DB):
//   supabase/migrations/0001_dream_items_crawled_columns.sql  ← conditions / source_url
//   supabase/migrations/0002_dream_items_is_lucky_column.sql  ← is_lucky
//   categories 테이블에 id='people' 행 존재 (schema.sql 시드)
//
// 특징 (body 시드와 다른 점):
//   - luck_index / is_warning / mood_tags 를 재계산하지 않고 JSON 의 지정값을 그대로 보존.
//     (사람이 직접 큐레이션한 완성 데이터이기 때문)
//   - _category_slug 'person' → category_id 'people' 로 매핑(카테고리 테이블 id 기준).
//   - id 는 'people-001' ... 로 부여. onConflict(id) upsert 라 재실행해도 안전.
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
    "❌ .env에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 필요합니다.",
  );
  process.exit(1);
}

// _category_slug → categories.id 매핑. (테이블 id 는 'people')
const SLUG_TO_CATEGORY = { person: "people", people: "people" };

function buildRow(item, i) {
  const id = `people-${String(i + 1).padStart(3, "0")}`;
  const slug = item._category_slug;
  const category_id = SLUG_TO_CATEGORY[slug] ?? slug;
  return {
    id,
    category_id,
    title: item.title,
    preview: item.preview ?? "",
    description: item.description ?? "",
    emoji: item.emoji ?? "💭",
    tags: item.tags ?? [],
    keywords: item.keywords ?? [],
    bookmark_count: 0,
    // ↓ 재계산 없이 JSON 지정값 보존
    luck_index: typeof item.luck_index === "number" ? item.luck_index : 50,
    is_warning: item.is_warning ?? false,
    mood_tags: item.mood_tags ?? [],
    is_lucky: item.is_lucky ?? null,
    conditions: item.conditions ?? [],
    source_url: item.source_url ?? null,
  };
}

// ── 실행 ───────────────────────────────────────────────────
const dataPath = resolve(ROOT, "supabase", "seeds", "dreams_people.json");
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
  if (probeError.code === "42703" || /is_lucky/.test(probeError.message ?? "")) {
    console.error("\n❌ dream_items 테이블에 is_lucky 컬럼이 없습니다.");
    console.error("   supabase/migrations/0002_dream_items_is_lucky_column.sql 를 먼저 적용해 주세요.");
    process.exit(1);
  }
  console.error("❌ 사전 점검 실패:", probeError.message);
  process.exit(1);
}

console.log(
  `📦 ${rows.length}개 항목을 dream_items에 업서트합니다 (id: people-001 ~ people-${String(rows.length).padStart(3, "0")})...`,
);

const BATCH = 100;
let done = 0;

for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const { error } = await supabase
    .from("dream_items")
    .upsert(chunk, { onConflict: "id" });

  if (error) {
    console.error(`❌ ${i + 1}~${i + chunk.length} 실패: ${error.message}`);
    if (/foreign key|category/i.test(error.message ?? "")) {
      console.error(
        "   → categories 테이블에 id='people' 행이 있는지 확인해 주세요 (schema.sql 시드).",
      );
    }
    process.exit(1);
  }

  done += chunk.length;
  console.log(`  ✓ ${done}/${rows.length}`);
}

console.log(`\n✅ 완료: dream_items에 ${rows.length}건(people) 업서트되었습니다.`);
