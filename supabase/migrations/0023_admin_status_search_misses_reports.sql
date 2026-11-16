-- ============================================================
-- 0023_admin_status_search_misses_reports — 어드민 준비
--
--   1) dream_items.status (draft / published / rejected)
--      - 기존 행은 published. 이후 새 행의 기본값은 draft(상태를 빠뜨려도 노출되지 않게).
--        → 앞으로 사전 보강 마이그레이션은 status = 'published' 를 직접 넣어야 앱에 보인다.
--      - 앱(anon·authenticated) 읽기 정책은 published 만.
--      - 앱 fetchAllDreamItems 도 .eq('status', 'published') 로 거른다
--        (admin 계정은 admin_all 정책으로 초안까지 보이므로).
--   2) search_misses — 결과 0건 검색어 집계 (user_id 없음)
--      - 0020 log_search 를 같은 시그니처·권한으로 교체해 0건이면 record_search_miss 호출.
--        집계가 실패해도 search_logs 저장은 그대로 된다(경고만).
--      - 기존 search_logs 의 0건 기록을 한 번 백필.
--   3) ai_message_reports — 처리 상태·메모 컬럼
--   4) auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' 사용자만 위 테이블 전체 읽기/쓰기
--
-- 0016·0018 은 건드리지 않는다 (handle_new_user·daily_fortunes 재정의 없음).
--
-- ── 적용 전 확인 (따로 실행) ─────────────────────────────────
--   -- 1. RLS 가 켜져 있는지 (세 행 모두 relrowsecurity = true 여야 정상. 꺼져 있어도 아래에서 켠다)
--   select relname, relrowsecurity from pg_class
--   where relnamespace = 'public'::regnamespace
--     and relname in ('dream_items', 'ai_message_reports', 'search_logs');
--
--   -- 2. dream_items 에 using(true) 인 다른 select 정책이 남아 있으면 초안이 샌다.
--   --    dream_items 는 dream_items_select_public 하나여야 한다.
--   select tablename, policyname, roles, cmd, qual
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('dream_items', 'ai_message_reports', 'search_logs');
--
--   -- 3. 0020 적용 여부 (null 이면 0020 먼저)
--   select to_regclass('public.search_logs');
--
-- 적용: SQL Editor 에 통째로 붙여 실행. 멱등 — 여러 번 실행해도 안전하다.
-- 주의: 이 마이그레이션 적용 전에는 status 필터가 들어간 앱(웹 배포·안드로이드 빌드)을 내보내지 말 것
--       — status 컬럼이 없으면 사전 전체 조회가 실패한다.
-- ============================================================
begin;

-- ── 0. 관리자 판별 ──────────────────────────────────────────
-- app_metadata 는 service role 만 바꿀 수 있어 사용자가 위조할 수 없다.
-- JWT 에 실리므로 role 을 넣은 뒤엔 다시 로그인해야 반영된다.
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ── 1. dream_items.status ──────────────────────────────────
alter table public.dream_items enable row level security;

-- default 'published' 로 추가 → 기존 행은 전부 published 로 채워진다.
alter table public.dream_items
  add column if not exists status text not null default 'published';
alter table public.dream_items
  drop constraint if exists dream_items_status_check;
alter table public.dream_items
  add constraint dream_items_status_check
  check (status in ('draft', 'published', 'rejected'));
-- 이후 새로 넣는 행은 기본 draft.
alter table public.dream_items alter column status set default 'draft';
create index if not exists dream_items_status_idx on public.dream_items (status);

drop policy if exists "dream_items_select_authenticated" on public.dream_items; -- schema.sql 의 옛 정책(혹시 남아 있으면)
drop policy if exists "dream_items_select_public"        on public.dream_items;
create policy "dream_items_select_public"
  on public.dream_items
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "dream_items_admin_all" on public.dream_items;
create policy "dream_items_admin_all"
  on public.dream_items
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- delete 는 주지 않는다: 지우면 bookmarks 는 cascade 삭제, dreams.dream_item_id 는 null.
-- 내릴 땐 status = 'rejected'.
grant insert, update on public.dream_items to authenticated;

-- ── 2. search_misses ───────────────────────────────────────
-- 0020 search_logs.query_norm 과 같은 정규화 규칙
create or replace function public.normalize_search_query(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(regexp_replace(btrim(p), '^#+', ''), '\s+', ' ', 'g'));
$$;

create table if not exists public.search_misses (
  query_norm text primary key check (char_length(query_norm) between 1 and 30),
  sample     text not null,                 -- 처음 들어온 원문 (표시용)
  miss_count integer not null default 1 check (miss_count >= 1),
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  status     text not null default 'open'
             check (status in ('open', 'added', 'ignored')),
  admin_note text
);
create index if not exists search_misses_status_idx
  on public.search_misses (status, miss_count desc);

alter table public.search_misses enable row level security;
revoke all on table public.search_misses from anon, authenticated;
grant select, update, delete on public.search_misses to authenticated;  -- RLS 로 관리자만

drop policy if exists "search_misses_admin_all" on public.search_misses;
create policy "search_misses_admin_all"
  on public.search_misses
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- 카운트 +1. 0020 과 같은 필터(1~30자, 숫자 6자리 이상·'@' 제외).
-- 'added' 로 처리했는데 또 0건이면 다시 open 으로 (보강이 안 먹힌 것).
create or replace function public.record_search_miss(p_query text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  q text := btrim(p_query);
  n text;
begin
  if q is null
     or char_length(q) not between 1 and 30
     or q ~ '[0-9]{6,}'
     or position('@' in q) > 0 then
    return;
  end if;
  n := public.normalize_search_query(q);
  if n = '' then
    return;
  end if;
  insert into public.search_misses (query_norm, sample)
  values (n, q)
  on conflict (query_norm) do update
    set miss_count = search_misses.miss_count + 1,
        last_seen  = now(),
        status     = case when search_misses.status = 'added' then 'open'
                          else search_misses.status end;
end;
$$;
-- 앱이 직접 부르지 않는다. log_search(security definer) 안에서만 호출.
revoke all on function public.record_search_miss(text) from public, anon, authenticated;

-- ── 기록 (0020 교체) ────────────────────────────────────────
-- 시그니처·권한·insert 문은 0020 그대로. 예외 블록을 쓰려고 language 만 plpgsql 로 바뀌었고,
-- 결과 0건이면 집계를 부른다. 집계가 실패해도 search_logs 저장은 유지(경고만).
create or replace function public.log_search(p_query text, p_result_count integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.search_logs (query, result_count)
  select btrim(p_query), greatest(coalesce(p_result_count, 0), 0)
  where p_query is not null
    and char_length(btrim(p_query)) between 1 and 30
    and btrim(p_query) !~ '[0-9]{6,}'
    and position('@' in p_query) = 0;

  if found and coalesce(p_result_count, 0) = 0 then
    begin
      perform public.record_search_miss(p_query);
    exception when others then
      raise warning '[log_search] record_search_miss failed: %', sqlerrm;
    end;
  end if;
end;
$$;

-- Supabase 는 public 스키마의 새 함수에 anon·authenticated 실행 권한을 기본 부여한다(default privileges).
-- from public 만으로는 anon 이 남으므로 명시적으로 회수한다.
revoke all on function public.log_search(text, integer) from public, anon, authenticated;
grant execute on function public.log_search(text, integer) to authenticated;

-- 기존 0건 기록 백필 (재실행 시 이미 있는 키는 건너뜀)
insert into public.search_misses (query_norm, sample, miss_count, first_seen, last_seen)
select query_norm, min(query), count(*), min(created_at), max(created_at)
from public.search_logs
where result_count = 0 and query_norm <> ''
group by query_norm
on conflict (query_norm) do nothing;

-- ── 3. ai_message_reports 처리 상태·메모 ────────────────────
alter table public.ai_message_reports enable row level security;

alter table public.ai_message_reports
  add column if not exists status     text not null default 'open',
  add column if not exists admin_note text,
  add column if not exists handled_at timestamptz,
  add column if not exists handled_by uuid references auth.users(id) on delete set null;
alter table public.ai_message_reports
  drop constraint if exists ai_message_reports_status_check;
alter table public.ai_message_reports
  add constraint ai_message_reports_status_check
  check (status in ('open', 'reviewing', 'resolved', 'dismissed'));
create index if not exists ai_message_reports_status_idx
  on public.ai_message_reports (status, created_at desc);

-- 신고자는 앱이 보내는 4개 컬럼만 insert (status·admin_note 위조 방지).
-- 앱(features/chat/reports.ts, 스토어 14번 포함)은 user_id·message·context·reason 만 보낸다.
revoke insert on public.ai_message_reports from authenticated;
grant insert (user_id, message, context, reason) on public.ai_message_reports to authenticated;
-- 처리 컬럼 update 는 RLS 로 관리자만
grant update (status, admin_note, handled_at, handled_by) on public.ai_message_reports to authenticated;

-- 주의: 신고자는 본인 신고 행을 select 할 수 있어 admin_note 도 API 로 읽힌다.
--       메모는 사용자가 봐도 되는 내용으로 쓸 것.
drop policy if exists "ai_message_reports_admin_all" on public.ai_message_reports;
create policy "ai_message_reports_admin_all"
  on public.ai_message_reports
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

commit;

-- ── 관리자 지정 (따로 실행) ─────────────────────────────────
--   -- 1) 내 uid 찾기 (카카오 로그인이면 email 은 카카오 계정 이메일. 닉네임으로 찾아도 된다)
--   select u.id, u.email, p.nickname, u.raw_app_meta_data
--   from auth.users u
--   left join public.profiles p on p.uid = u.id
--   where u.email = '<내 이메일>' or p.nickname = '<내 닉네임>';
--
--   -- 2) role 추가 (provider 등 기존 app_metadata 유지)
--   update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
--   where id = '<uid>';
--
--   -- 3) 앱·웹에서 로그아웃 후 다시 로그인 (JWT 갱신)
