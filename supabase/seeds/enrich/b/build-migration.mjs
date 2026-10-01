// B 묶음(0021) → 마이그레이션 SQL 생성. 사용: node build-migration.mjs <dict-now.json>
//   dict-now.json: 지금 운영 DB 의 dream_items 전체(anon REST 로 받은 것). 키워드 변경 전 값의 기준.
// 먼저 node validate.mjs <dict-now.json> 이 통과해야 한다.
// 출력:
//   supabase/migrations/0021_dream_items_enrich_b.sql   (적용용, do 블록 하나 + 백업 테이블)
//   supabase/scripts/0021_precheck.sql                   (적용 전 확인, 읽기 전용)
//   supabase/scripts/0021_rollback.sql                   (백업 테이블로 되돌리기)
import fs from "node:fs";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const root = path.resolve(here, "../../../..");
const dict = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const now = Object.fromEntries(dict.map((i) => [i.id, i]));
const items = JSON.parse(fs.readFileSync(path.join(here, "new.json"), "utf8"));
const kwChanges = JSON.parse(fs.readFileSync(path.join(here, "keywords.json"), "utf8"));

const IS_LUCKY = { 길몽: "lucky", 흉몽: "unlucky", 보통: "neutral" };
const newRows = items.map((it) => ({
  id: it.id,
  category_id: it.category_id,
  title: it.title,
  preview: it.preview,
  description: it.description,
  emoji: it.emoji,
  tags: it.tags,
  keywords: it.keywords,
  luck_index: it.luck_index,
  is_warning: it.badge === "흉몽",
  mood_tags: it.mood_tags,
  is_lucky: IS_LUCKY[it.badge],
  conditions: it.conditions,
}));
const kwRows = kwChanges.map((k) => {
  const cur = now[k.id];
  if (!cur) throw new Error(`DB 에 없는 id: ${k.id}`);
  const next = [...cur.keywords.filter((x) => !k.remove.includes(x)), ...k.add.filter((x) => !cur.keywords.includes(x))];
  return { id: k.id, old_keywords: cur.keywords, keywords: next };
});

const N = newRows.length, K = kwRows.length;
const json = (rows) => "[\n" + rows.map((r) => JSON.stringify(r)).join(",\n") + "\n]";
const newJson = json(newRows), kwJson = json(kwRows);
for (const tag of ["$new$", "$kw$", "$mig$", "$rb$"]) if ((newJson + kwJson).includes(tag)) throw new Error(`데이터에 ${tag} 포함`);
const dist = items.reduce((a, i) => ((a[i.badge] = (a[i.badge] || 0) + 1), a), {});
const gen = "생성: node supabase/seeds/enrich/b/build-migration.mjs (원본 데이터: supabase/seeds/enrich/b/new.json·keywords.json — 직접 수정하지 말 것)";
const header = (title, lines) => `-- ============================================================\n-- ${title}\n${[...lines, gen].map((l) => (l ? `-- ${l}` : "--")).join("\n")}\n-- ============================================================\n`;

const migration = `${header("0021_dream_items_enrich_b — 꿈 사전 B 묶음: 신규 꿈 추가 + 검색 키워드 보완", [
  `- 신규 ${N}건 (길몽 ${dist["길몽"] ?? 0} · 보통 ${dist["보통"] ?? 0} · 흉몽 ${dist["흉몽"] ?? 0}): 사전에 없던 검색어`,
  "  (닭·원숭이·독수리·여우·늑대·코끼리·개구리·나비·상어·고래·짝사랑·수술·지각·납치·교통사고·키스·바람피우는·이혼)",
  `- keywords ${K}건: 한 글자 검색에서 빠지던 합성어 항목 보완(코피→피, 첫눈→눈 …), people-006 의 '이혼' 키워드 정리`,
  "",
  "적용 방법: Supabase SQL Editor 에 통째로 붙여 한 번에 실행. 파일 전체가 do 블록 하나(= SQL 문 하나)라",
  "중간에 실패하면 백업까지 포함해 아무것도 바뀌지 않는다. 임시 테이블 없이 JSON 을 jsonb_to_recordset 으로 읽는다.",
  "적용 전 supabase/scripts/0021_precheck.sql 로 확인.",
  "되돌리기: supabase/scripts/0021_rollback.sql (backup.dream_items_0021 기준 — 신규 행 삭제 + keywords 복구).",
  "멱등성: 다시 실행해도 결과가 같다. 신규 행은 on conflict do nothing, 백업은 첫 실행 때 값만 보존.",
  "keywords 는 생성 시점 값과 같을 때만 바꾼다 — 그 사이 누가 고쳤으면 전체 취소.",
])}
do $mig$
declare
  new_rows jsonb := $new$
${newJson}
$new$;
  kw_rows jsonb := $kw$
${kwJson}
$kw$;
  n int;
begin
  -- 1) 점검 — 신규 id 가 다른 항목으로 이미 쓰이고 있으면 취소 (재실행으로 이미 들어간 같은 행은 통과)
  select count(*) into n
  from public.dream_items d
  join jsonb_to_recordset(new_rows) as e(id text, title text) using (id)
  where d.title is distinct from e.title;
  if n > 0 then
    raise exception '신규 id % 건이 다른 항목으로 이미 있습니다. 적용을 취소합니다.', n;
  end if;

  -- keywords 대상이 전부 있고, 생성 시점 값(또는 이미 반영된 새 값)인지
  select count(*) into n
  from public.dream_items d
  join jsonb_to_recordset(kw_rows) as e(id text, old_keywords text[], keywords text[]) using (id)
  where d.keywords = e.old_keywords or d.keywords = e.keywords;
  if n <> ${K} then
    raise exception 'keywords 대상 % / ${K} 건만 생성 시점 값과 같습니다. build-migration.mjs 를 다시 돌리세요.', n;
  end if;

  -- 2) 백업 — PostgREST 에 노출되지 않는 backup 스키마. action = insert(되돌릴 때 삭제) / keywords(값 복구)
  create schema if not exists backup;
  create table if not exists backup.dream_items_0021 (
    id           text primary key,
    action       text not null check (action in ('insert', 'keywords')),
    keywords     text[],
    backed_up_at timestamptz not null default now()
  );
  insert into backup.dream_items_0021 (id, action, keywords)
  select d.id, 'keywords', d.keywords
  from public.dream_items d
  join jsonb_to_recordset(kw_rows) as e(id text) using (id)
  on conflict (id) do nothing;
  insert into backup.dream_items_0021 (id, action)
  select e.id, 'insert'
  from jsonb_to_recordset(new_rows) as e(id text)
  where not exists (select 1 from public.dream_items d where d.id = e.id)
  on conflict (id) do nothing;

  -- 3) 신규 항목
  insert into public.dream_items (
    id, category_id, title, preview, description, emoji,
    tags, keywords, bookmark_count, luck_index, is_warning,
    mood_tags, is_lucky, conditions, source_url
  )
  select e.id, e.category_id, e.title, e.preview, e.description, e.emoji,
         e.tags, e.keywords, 0, e.luck_index, e.is_warning,
         e.mood_tags, e.is_lucky, e.conditions, null
  from jsonb_to_recordset(new_rows) as e(
    id text, category_id text, title text, preview text, description text, emoji text,
    tags text[], keywords text[], luck_index integer, is_warning boolean,
    mood_tags jsonb, is_lucky text, conditions jsonb
  )
  on conflict (id) do nothing;

  -- 4) keywords 보완
  update public.dream_items d
  set keywords = e.keywords
  from jsonb_to_recordset(kw_rows) as e(id text, keywords text[])
  where d.id = e.id;

  -- 5) 결과 확인
  select count(*) into n
  from public.dream_items d
  join jsonb_to_recordset(new_rows) as e(id text, description text) using (id)
  where d.description = e.description;
  if n <> ${N} then
    raise exception '신규 반영 확인 실패: % / ${N} 건. 적용을 취소합니다.', n;
  end if;
  select count(*) into n
  from public.dream_items d
  join jsonb_to_recordset(kw_rows) as e(id text, keywords text[]) using (id)
  where d.keywords = e.keywords;
  if n <> ${K} then
    raise exception 'keywords 반영 확인 실패: % / ${K} 건. 적용을 취소합니다.', n;
  end if;

  raise notice '0021 적용 완료: 신규 ${N} 건, keywords ${K} 건';
end
$mig$;
`;

// 사전 점검 — 쓰기 없음. 신규 id·제목 충돌, keywords 대상이 생성 시점 값인지.
const q = (v) => `$q$${v}$q$`;
const arr = (a) => `array[${a.map((t) => `'${t.replace(/'/g, "''")}'`).join(",")}]::text[]`;
for (const r of newRows) if ((r.title + r.id).includes("$q$")) throw new Error(`$q$ 포함: ${r.id}`);
const precheck = `${header("0021 적용 전 점검 (읽기 전용)", [
  "0021_dream_items_enrich_b.sql 을 적용하기 전에 실행한다. 아무것도 쓰지 않는다.",
  `기대값: 신규 id 이미 있음 0 · 같은 제목 이미 있음 0 · keywords 대상 ${K} · 생성 시점 값과 같음 ${K} · 지금 전체 ${dict.length}건 → 적용 후 ${dict.length + N}건`,
  "숫자가 다르면 생성 이후 DB 가 바뀐 것 — 적용하지 말고 build-migration.mjs 를 다시 돌릴 것.",
])}
with n(id, title) as (
  values
${newRows.map((r) => `    ('${r.id}', ${q(r.title)})`).join(",\n")}
),
k(id, old_keywords) as (
  values
${kwRows.map((r) => `    ('${r.id}', ${arr(r.old_keywords)})`).join(",\n")}
)
select
  (select count(*) from public.dream_items)                                              as "지금 전체 (=${dict.length})",
  (select count(*) from public.dream_items d join n using (id))                          as "신규 id 이미 있음 (=0)",
  (select count(*) from public.dream_items d join n on d.title = n.title)                as "같은 제목 이미 있음 (=0)",
  (select count(*) from public.dream_items d join k using (id))                          as "keywords 대상 (=${K})",
  (select count(*) from public.dream_items d join k using (id) where d.keywords = k.old_keywords) as "생성 시점 값과 같음 (=${K})";

-- keywords 가 바뀌는 항목: 지금 값 → 새 값
with k(id, keywords) as (
  values
${kwRows.map((r) => `    ('${r.id}', ${arr(r.keywords)})`).join(",\n")}
)
select d.id, d.title, d.keywords as "지금 keywords", k.keywords as "새 keywords"
from public.dream_items d join k using (id)
order by d.id;
`;

const rollback = `${header("0021 되돌리기 — 백업 테이블로 복구", [
  "0021_dream_items_enrich_b.sql 이 만든 backup.dream_items_0021 기준으로",
  `신규 ${N}건을 지우고 keywords ${K}건을 되돌린다. do 블록 하나라 SQL Editor 에 그대로 붙여 실행해도 원자적이다.`,
  "신규 항목을 지우면 그 항목의 북마크(bookmarks)도 함께 지워지고, 꿈 기록(dreams)의 연결은 null 이 된다.",
])}
do $rb$
declare n_ins int; n_kw int;
begin
  select count(*) filter (where action = 'insert'), count(*) filter (where action = 'keywords')
    into n_ins, n_kw
  from backup.dream_items_0021;
  if n_ins <> ${N} or n_kw <> ${K} then
    raise exception '백업 행 insert % · keywords % — ${N} · ${K} 이어야 합니다. 되돌리기를 취소합니다.', n_ins, n_kw;
  end if;

  delete from public.dream_items d
  using backup.dream_items_0021 b
  where b.action = 'insert' and d.id = b.id;

  update public.dream_items d
  set keywords = b.keywords
  from backup.dream_items_0021 b
  where b.action = 'keywords' and d.id = b.id;

  raise notice '0021 되돌리기 완료: 신규 % 건 삭제, keywords % 건 복구', n_ins, n_kw;
end
$rb$;

-- 확인 후 백업을 지우려면:
-- drop table backup.dream_items_0021;
`;

fs.writeFileSync(path.join(root, "supabase/migrations/0021_dream_items_enrich_b.sql"), migration);
fs.writeFileSync(path.join(root, "supabase/scripts/0021_precheck.sql"), precheck);
fs.writeFileSync(path.join(root, "supabase/scripts/0021_rollback.sql"), rollback);
console.log(`0021: 신규 ${N}건 · keywords ${K}건 → migration / precheck / rollback 생성`);
