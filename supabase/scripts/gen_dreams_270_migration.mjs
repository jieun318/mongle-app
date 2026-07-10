// ============================================================
// supabase/scripts/gen_dreams_270_migration.mjs
//   supabase/seeds/dreams_seed_270.json  ->  0014_dream_items_seed_270.sql 생성기
//
//   실행:
//     node supabase/scripts/gen_dreams_270_migration.mjs
//
//   특징:
//     - id 는 카테고리별로 '{slug}-001' ... '{slug}-030' 부여 (JSON 등장 순서).
//     - on conflict (id) do update 업서트라 여러 번 적용해도 안전.
//     - 레거시 시드(schema.sql 숫자 id, 0011 sun-*/moon-*) 를 정리해
//       카테고리별로 정확히 30건만 남긴다.
//     - luck_index / is_warning / mood_tags 등은 JSON 지정값을 그대로 보존.
//
//   생성만 담당한다. 실제 DB 반영은 Supabase 마이그레이션(0014...sql)으로.
// ============================================================

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

const SEED_PATH = resolve(ROOT, "supabase", "seeds", "dreams_seed_270.json");
const OUT_PATH = resolve(
  ROOT,
  "supabase",
  "migrations",
  "0014_dream_items_seed_270.sql",
);

const VALID_CATEGORIES = new Set([
  "animal",
  "nature",
  "people",
  "daily",
  "lucky",
  "unlucky",
  "pregnancy",
  "body",
  "mystic",
]);

// ── SQL 리터럴 헬퍼 ─────────────────────────────────────────
const q = (s) => `'${String(s).replace(/'/g, "''")}'`; // 텍스트 리터럴
const sqlArray = (arr) =>
  `array[${(arr ?? []).map((v) => q(v)).join(",")}]::text[]`;
const jsonb = (val) => `${q(JSON.stringify(val ?? []))}::jsonb`;
const orNull = (v) => (v === null || v === undefined ? "null" : q(v));

// ── 로드 & 검증 ─────────────────────────────────────────────
const items = JSON.parse(readFileSync(SEED_PATH, "utf8"));
const counters = Object.create(null);

const rows = items.map((item, i) => {
  const slug = item.category_slug;
  if (!VALID_CATEGORIES.has(slug)) {
    throw new Error(`알 수 없는 category_slug '${slug}' (index ${i}: ${item.title})`);
  }
  const seq = (counters[slug] = (counters[slug] ?? 0) + 1);
  const id = `${slug}-${String(seq).padStart(3, "0")}`;

  return (
    `  (\n` +
    `    ${q(id)}, ${q(slug)},\n` +
    `    ${q(item.title)},\n` +
    `    ${q(item.preview ?? "")},\n` +
    `    ${q(item.description ?? "")},\n` +
    `    ${q(item.emoji ?? "💭")},\n` +
    `    ${sqlArray(item.tags)}, ${sqlArray(item.keywords)},\n` +
    `    0, ${Number(item.luck_index) || 0}, ${item.is_warning ? "true" : "false"},\n` +
    `    ${jsonb(item.mood_tags)},\n` +
    `    ${orNull(item.is_lucky)},\n` +
    `    ${jsonb(item.conditions)},\n` +
    `    ${orNull(item.source_url)}\n` +
    `  )`
  );
});

// ── 마이그레이션 본문 ───────────────────────────────────────
const header = `-- ============================================================
-- 0014_dream_items_seed_270
--   꿈 해몽 사전 마스터 시드 270건 (카테고리 9종 × 30건).
--   id: '{category}-001' ~ '{category}-030'  (예: animal-001, nature-030)
--
-- 사전 조건:
--   0001_dream_items_crawled_columns.sql  (conditions / source_url)
--   0002_dream_items_is_lucky_column.sql  (is_lucky)
--   categories 에 9개 카테고리 행 존재 (schema.sql 시드)
--
-- 멱등성: on conflict (id) do update 업서트라 여러 번 적용해도 안전합니다.
--
-- 생성: node supabase/scripts/gen_dreams_270_migration.mjs
--   (원본 데이터: supabase/seeds/dreams_seed_270.json — 직접 수정하지 말 것)
-- ============================================================

insert into public.dream_items (
  id, category_id, title, preview, description, emoji,
  tags, keywords, bookmark_count, luck_index, is_warning,
  mood_tags, is_lucky, conditions, source_url
) values
${rows.join(",\n")}
on conflict (id) do update set
  category_id    = excluded.category_id,
  title          = excluded.title,
  preview        = excluded.preview,
  description    = excluded.description,
  emoji          = excluded.emoji,
  tags           = excluded.tags,
  keywords       = excluded.keywords,
  luck_index     = excluded.luck_index,
  is_warning     = excluded.is_warning,
  mood_tags      = excluded.mood_tags,
  is_lucky       = excluded.is_lucky,
  conditions     = excluded.conditions,
  source_url     = excluded.source_url;

-- ── 레거시 시드 정리 ────────────────────────────────────────
--   schema.sql 의 숫자 id 시드, 0011 의 sun-*/moon-* 를 제거해
--   각 카테고리가 정확히 30건만 노출되도록 한다.
--   (dreams.dream_item_id → set null, bookmarks.dream_item_id → cascade 라 안전)
delete from public.dream_items
where id ~ '^[0-9]+$'
   or id like 'sun-%'
   or id like 'moon-%';
`;

writeFileSync(OUT_PATH, header, "utf8");

const perCat = Object.entries(counters)
  .map(([k, v]) => `${k}:${v}`)
  .join("  ");
console.log(`✅ ${rows.length}건 → ${OUT_PATH}`);
console.log(`   카테고리별: ${perCat}`);
