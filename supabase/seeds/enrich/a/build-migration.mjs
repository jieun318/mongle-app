// A 묶음 157건 → 마이그레이션 SQL 생성. 사용: node build-migration.mjs <dict-now.json>
//   dict-now.json: 지금 운영 DB 의 dream_items 전체(anon REST 로 받은 것). 롤백 스냅샷·사전 점검 기준.
// 출력:
//   supabase/migrations/0019_dream_items_enrich_a.sql   (적용용, 트랜잭션 + 백업 테이블)
//   supabase/scripts/0019_precheck.sql                   (적용 전 변경 행 수 확인, 읽기 전용)
//   supabase/scripts/0019_rollback.sql                   (백업 테이블에서 복구)
//   supabase/scripts/0019_rollback_snapshot.sql          (백업 테이블이 없을 때: 생성 시점 값으로 복구)
import fs from "node:fs";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const root = path.resolve(here, "../../../..");
const dict = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const now = Object.fromEntries(dict.map((i) => [i.id, i]));
const result = JSON.parse(fs.readFileSync(path.join(here, "result.json"), "utf8"));
const rejudgeOut = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(here, "rejudge-out.json"), "utf8")).map((o) => [o.id, o]));
const rejudgeIn = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(here, "rejudge-input.json"), "utf8")).map((o) => [o.id, o]));

// 판정·데이터 변경 (사용자 확정)
const LUCK = {
  lucky: ["crawled-023", "crawled-063", "crawled-082", "crawled-091", "crawled-094", "crawled-097", "crawled-111", "crawled-121"],
  conditional: ["crawled-001", "crawled-003", "crawled-083", "crawled-093", "crawled-115", "crawled-117", "crawled-118", "crawled-119"],
  unlucky: ["crawled-088"],
  neutral: ["crawled-008", "crawled-110"],
};
const LUCK_INDEX = { lucky: 75, conditional: 50, unlucky: 30, neutral: 50 };
// 지금 배포된 앱은 '태몽' 태그를 길몽으로 본다 — 보통 판정인데 태몽 태그가 있는 항목은 태그를 뺀다.
const DROP_TAEMONG = ["crawled-008", "crawled-110", "crawled-083"];

const rows = result.map((r) => {
  const cur = now[r.id];
  if (!cur) throw new Error(`DB 에 없는 id: ${r.id}`);
  const rj = rejudgeOut[r.id];
  const badge = rejudgeIn[r.id]?.badge ?? r.badge;
  const crawled = r.id.startsWith("crawled-");
  const preview = crawled ? (rj?.preview_new ?? r.preview_new) : null;
  const description = rj?.description_new ?? r.description_new;
  let isLucky = null, luckIndex = null;
  for (const [k, ids] of Object.entries(LUCK)) if (ids.includes(r.id)) { isLucky = k; luckIndex = LUCK_INDEX[k]; }

  // 태그 정리: 길몽 → 흉몽 제거 / 보통 → 길몽·흉몽 제거 / 흉몽 → 길몽 제거
  let tags = [...cur.tags];
  if (badge === "길몽") tags = tags.filter((t) => t !== "흉몽");
  if (badge === "보통") tags = tags.filter((t) => t !== "길몽" && t !== "흉몽");
  if (badge === "흉몽") tags = tags.filter((t) => t !== "길몽");
  if (r.id === "body-033" && !tags.includes("길몽")) tags = ["길몽", ...tags]; // 판정 보통 → 길몽 (지시)
  if (DROP_TAEMONG.includes(r.id)) tags = tags.filter((t) => t !== "태몽");
  const tagsChanged = JSON.stringify(tags) !== JSON.stringify(cur.tags);
  return { id: r.id, badge, preview, description, tags: tagsChanged ? tags : null, isLucky, luckIndex, cur };
});

// ── 배지 검증: 적용 후 데이터로 지금 앱 규칙 / 새 규칙 모두 의도한 배지가 나오는지 ──
const oldRule = (x) => x.tags.includes("흉몽") ? "흉몽" : (x.tags.includes("길몽") || x.tags.includes("태몽")) ? "길몽" : x.is_warning ? "흉몽" : "보통";
const byLuck = (x) => x.is_lucky === "lucky" ? "길몽" : x.is_lucky === "unlucky" ? "흉몽" : (x.is_lucky === "conditional" || x.is_lucky === "neutral") ? "보통" : x.luck_index >= 70 ? "길몽" : x.luck_index <= 35 ? "흉몽" : "보통";
const newRule = (x) => { const g = x.tags.includes("길몽"), b = x.tags.includes("흉몽"); if (g && b) return byLuck(x); if (b) return "흉몽"; if (g) return "길몽"; if (x.is_lucky === "neutral") return "보통"; if (x.tags.includes("태몽")) return "길몽"; if (x.is_warning) return "흉몽"; return "보통"; };
const after = (r) => ({ ...r.cur, tags: r.tags ?? r.cur.tags, is_lucky: r.isLucky ?? r.cur.is_lucky, luck_index: r.luckIndex ?? r.cur.luck_index });
const mism = rows.filter((r) => oldRule(after(r)) !== r.badge || newRule(after(r)) !== r.badge);
if (mism.length) {
  for (const r of mism) console.error(`배지 불일치 ${r.id}: 의도 ${r.badge} / 지금앱 ${oldRule(after(r))} / 새규칙 ${newRule(after(r))}`);
  throw new Error("배지 검증 실패");
}
const changedBadge = rows.filter((r) => oldRule(r.cur) !== r.badge);

// ── SQL ──
// 본문에 작은따옴표('돈(豚)')가 있어 달러 인용을 쓴다. 본문에 $q$ 가 없는지 확인.
for (const r of rows) for (const v of [r.preview, r.description]) if (v && v.includes("$q$")) throw new Error(`$q$ 포함: ${r.id}`);
const q = (v) => (v == null ? "null" : `$q$${v}$q$`);
const arr = (a) => (a == null ? "null" : `array[${a.map((t) => `'${t.replace(/'/g, "''")}'`).join(",")}]::text[]`);
const ids = rows.map((r) => `'${r.id}'`).join(",");
const values = rows
  .map((r) => `  (${q(r.id).replace(/\$q\$/g, "'")}, ${q(r.preview)}, ${q(r.description)}, ${arr(r.tags)}, ${r.isLucky ? `'${r.isLucky}'` : "null"}, ${r.luckIndex ?? "null"})`)
  .join(",\n");
// 마이그레이션 do 블록 안에 넣을 새 값 JSON — 한 줄에 한 항목. 달러 인용 태그와 겹치면 안 된다.
const srcJson = "[\n" + rows
  .map((r) => JSON.stringify({ id: r.id, preview: r.preview, description: r.description, tags: r.tags, is_lucky: r.isLucky, luck_index: r.luckIndex }))
  .join(",\n") + "\n]";
for (const tag of ["$data$", "$mig$", "$rb$"]) if (srcJson.includes(tag)) throw new Error(`본문에 ${tag} 포함`);
const N = rows.length;
const cnt = {
  preview: rows.filter((r) => r.preview != null && r.preview !== r.cur.preview).length,
  description: rows.filter((r) => r.description !== r.cur.description).length,
  tags: rows.filter((r) => r.tags).length,
  isLucky: rows.filter((r) => r.isLucky && r.isLucky !== r.cur.is_lucky).length,
  luck: rows.filter((r) => r.luckIndex != null && r.luckIndex !== r.cur.luck_index).length,
};

const header = (title, lines) => `-- ============================================================\n-- ${title}\n${lines.map((l) => `-- ${l}`).join("\n")}\n-- 생성: node supabase/seeds/enrich/a/build-migration.mjs (원본 데이터: supabase/seeds/enrich/a/*.json — 직접 수정하지 말 것)\n-- ============================================================\n`;

const migration = `${header("0019_dream_items_enrich_a — 꿈 사전 A 묶음 본문 보강 + 길흉 재판정", [
  `대상 ${N}건 (본문 2문장 이하 · 요약이 본문 앞부분을 잘라 넣은 것 · 요약이 본문에 그대로 반복된 것).`,
  `- description ${cnt.description}건 다시 씀, preview ${cnt.preview}건(크롤링) 새로 씀`,
  `- is_lucky ${cnt.isLucky}건, luck_index ${cnt.luck}건 변경 (길몽·흉몽 태그 동시 항목 재판정 + 순화 해제 2건)`,
  `- tags ${cnt.tags}건 정리: 길몽 판정 → 흉몽 태그 제거 / 보통 → 길몽·흉몽 제거 / 흉몽 → 길몽 제거,`,
  `  body-033 길몽 추가, crawled-008·110·083 태몽 제거 (지금 배포된 앱 규칙에서도 배지가 맞도록)`,
  `- 현재 배포된 앱 기준으로 배지가 바뀌는 항목: ${changedBadge.length}건`,
  "",
  "적용 방법: Supabase SQL Editor 에 통째로 붙여 한 번에 실행. 파일 전체가 do 블록 하나(= SQL 문 하나)라",
  "Editor 가 문장을 나눠 자동 커밋으로 실행하더라도 원자적이다. 중간에 실패하면 백업까지 포함해 아무것도 바뀌지 않는다.",
  "임시 테이블을 쓰지 않는다 — 문장마다 자동 커밋되면 on commit drop 임시 테이블이 만들자마자 사라져",
  "42P01(relation does not exist)이 난다. 새 값은 아래 JSON 하나로 들고 jsonb_to_recordset 으로 읽는다.",
  "적용 전 supabase/scripts/0019_precheck.sql 로 변경 행 수 확인.",
  "되돌리기: supabase/scripts/0019_rollback.sql (아래에서 만드는 backup.dream_items_0019 에서 복구).",
  "멱등성: 다시 실행해도 같은 값으로 덮어쓴다. 백업은 첫 실행 때 값만 보존(on conflict do nothing).",
])}
do $mig$
declare
  -- 새 값. null = 그 컬럼은 그대로 둔다.
  src jsonb := $data$
${srcJson}
$data$;
  n int;
begin
  -- 1) 대상 행이 전부 있는지 확인 — 하나라도 없으면 전체 취소
  select count(*) into n
  from public.dream_items d
  join jsonb_to_recordset(src) as e(id text) using (id);
  if n <> ${N} then
    raise exception '대상 행 % 건 — ${N} 건이어야 합니다. 적용을 취소합니다.', n;
  end if;

  -- 2) 현재 값 백업 — PostgREST 에 노출되지 않는 backup 스키마에 둔다.
  create schema if not exists backup;
  create table if not exists backup.dream_items_0019 (
    id           text primary key,
    preview      text,
    description  text,
    tags         text[],
    is_lucky     text,
    luck_index   integer,
    backed_up_at timestamptz not null default now()
  );
  insert into backup.dream_items_0019 (id, preview, description, tags, is_lucky, luck_index)
  select d.id, d.preview, d.description, d.tags, d.is_lucky, d.luck_index
  from public.dream_items d
  join jsonb_to_recordset(src) as e(id text) using (id)
  on conflict (id) do nothing;

  -- 3) 반영
  update public.dream_items d
  set preview     = coalesce(e.preview, d.preview),
      description = e.description,
      tags        = coalesce(e.tags, d.tags),
      is_lucky    = coalesce(e.is_lucky, d.is_lucky),
      luck_index  = coalesce(e.luck_index, d.luck_index)
  from jsonb_to_recordset(src) as e(id text, preview text, description text, tags text[], is_lucky text, luck_index integer)
  where d.id = e.id;

  -- 4) 결과 확인 — 본문이 전부 새 값인지
  select count(*) into n
  from public.dream_items d
  join jsonb_to_recordset(src) as e(id text, description text) using (id)
  where d.description = e.description;
  if n <> ${N} then
    raise exception '반영 확인 실패: % / ${N} 건. 적용을 취소합니다.', n;
  end if;

  raise notice '0019 적용 완료: % 건', n;
end
$mig$;
`;

// 사전 점검 — 새 값을 CTE 로 들고 와서 현재 값과 비교만 한다(쓰기 없음).
const oldBadgeSql = (a) => `case when '흉몽' = any(${a}.tags) then '흉몽' when '길몽' = any(${a}.tags) or '태몽' = any(${a}.tags) then '길몽' when ${a}.is_warning then '흉몽' else '보통' end`;
const precheck = `${header("0019 적용 전 점검 (읽기 전용)", [
  "0019_dream_items_enrich_a.sql 을 적용하기 전에 실행해 변경 행 수를 확인한다. 아무것도 쓰지 않는다.",
  `생성 시점 기대값: 대상 ${N} · description ${cnt.description} · preview ${cnt.preview} · tags ${cnt.tags} · is_lucky ${cnt.isLucky} · luck_index ${cnt.luck} · 배지 변경(지금 앱 규칙) ${changedBadge.length}`,
  "숫자가 다르면 생성 이후 DB 가 바뀐 것 — 적용하지 말고 build-migration.mjs 를 다시 돌릴 것.",
])}
with e(id, preview, description, tags, is_lucky, luck_index) as (
  values
${values.replace(/^ {2}/gm, "    ")}
),
j as (
  select d.*, e.preview as n_preview, e.description as n_description,
         coalesce(e.tags, d.tags) as n_tags, coalesce(e.is_lucky, d.is_lucky) as n_is_lucky,
         coalesce(e.luck_index, d.luck_index) as n_luck_index
  from public.dream_items d join e using (id)
)
select
  (select count(*) from e)                                                        as "입력 행",
  count(*)                                                                         as "DB 에서 찾은 행 (=${N})",
  count(*) filter (where n_description is distinct from description)               as "description 변경 (=${cnt.description})",
  count(*) filter (where n_preview is not null and n_preview is distinct from preview) as "preview 변경 (=${cnt.preview})",
  count(*) filter (where n_tags is distinct from tags)                             as "tags 변경 (=${cnt.tags})",
  count(*) filter (where n_is_lucky is distinct from is_lucky)                     as "is_lucky 변경 (=${cnt.isLucky})",
  count(*) filter (where n_luck_index is distinct from luck_index)                 as "luck_index 변경 (=${cnt.luck})",
  count(*) filter (where ${oldBadgeSql("j")} is distinct from
    case when '흉몽' = any(n_tags) then '흉몽' when '길몽' = any(n_tags) or '태몽' = any(n_tags) then '길몽' when is_warning then '흉몽' else '보통' end)
                                                                                   as "배지 변경, 지금 앱 규칙 (=${changedBadge.length})"
from j;

-- 태그가 바뀌는 항목과 배지 전후 (지금 앱 규칙 기준). 배지가 그대로인 행(crawled-088)도 태그 정리 때문에 나온다.
with e(id, preview, description, tags, is_lucky, luck_index) as (
  values
${values.replace(/^ {2}/gm, "    ")}
)
select d.id, d.title, d.tags as "현재 tags", coalesce(e.tags, d.tags) as "새 tags",
       ${oldBadgeSql("d")} as "현재 배지",
       case when '흉몽' = any(coalesce(e.tags, d.tags)) then '흉몽'
            when '길몽' = any(coalesce(e.tags, d.tags)) or '태몽' = any(coalesce(e.tags, d.tags)) then '길몽'
            when d.is_warning then '흉몽' else '보통' end as "새 배지"
from public.dream_items d join e using (id)
where e.tags is not null
order by d.id;
`;

const rollback = `${header("0019 되돌리기 — 백업 테이블에서 복구", [
  "0019_dream_items_enrich_a.sql 이 만든 backup.dream_items_0019 의 값으로 되돌린다.",
  "백업 테이블이 없으면 0019_rollback_snapshot.sql 을 쓸 것(생성 시점 값).",
  "do 블록 하나(= SQL 문 하나)라 SQL Editor 에 그대로 붙여 실행해도 원자적이다.",
])}
do $rb$
declare n int;
begin
  select count(*) into n from backup.dream_items_0019;
  if n <> ${N} then
    raise exception '백업 행 % 건 — ${N} 건이어야 합니다. 되돌리기를 취소합니다.', n;
  end if;

  update public.dream_items d
  set preview = b.preview, description = b.description, tags = b.tags,
      is_lucky = b.is_lucky, luck_index = b.luck_index
  from backup.dream_items_0019 b
  where d.id = b.id;

  raise notice '0019 되돌리기 완료: % 건', n;
end
$rb$;

-- 확인 후 백업을 지우려면:
-- drop table backup.dream_items_0019;
`;

const snapValues = rows
  .map((r) => `  ('${r.id}', ${q(r.cur.preview)}, ${q(r.cur.description)}, ${arr(r.cur.tags)}, ${r.cur.is_lucky ? `'${r.cur.is_lucky}'` : "null"}, ${r.cur.luck_index ?? "null"})`)
  .join(",\n");
const snapshot = `${header("0019 되돌리기 (스냅샷) — 생성 시점 값으로 복구", [
  `마이그레이션을 만든 시점(${new Date().toISOString().slice(0, 10)})에 운영 DB 에서 받은 값을 그대로 담았다.`,
  "백업 테이블(backup.dream_items_0019)이 있으면 0019_rollback.sql 을 우선 쓸 것.",
  "update 문 하나라 그대로 붙여 실행해도 원자적이다.",
])}
update public.dream_items d
set preview = s.preview, description = s.description, tags = s.tags,
    is_lucky = s.is_lucky, luck_index = s.luck_index
from (values
${snapValues}
) as s(id, preview, description, tags, is_lucky, luck_index)
where d.id = s.id;
`;

fs.writeFileSync(path.join(root, "supabase/migrations/0019_dream_items_enrich_a.sql"), migration);
fs.writeFileSync(path.join(root, "supabase/scripts/0019_precheck.sql"), precheck);
fs.writeFileSync(path.join(root, "supabase/scripts/0019_rollback.sql"), rollback);
fs.writeFileSync(path.join(root, "supabase/scripts/0019_rollback_snapshot.sql"), snapshot);
fs.writeFileSync(path.join(here, "final.json"), JSON.stringify(rows.map(({ cur, ...r }) => ({ ...r, badge_now: oldRule(cur), title: cur.title ?? null })), null, 1));
console.log(JSON.stringify({ N, ...cnt, badgeChanged: changedBadge.length, badgeChangedIds: changedBadge.map((r) => `${r.id}:${oldRule(r.cur)}→${r.badge}`) }, null, 1));
