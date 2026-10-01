-- ============================================================
-- 0020_search_logs — 꿈 사전 검색어 기록 + 인기 검색어
--
-- 목적
--   - 검색 탭 추천 키워드를 하드코딩 대신 실제 인기 검색어(최근 30일)로 채운다.
--   - 결과 0개 검색어를 모아 사전 보강 우선순위를 정한다
--     (supabase/scripts/search_zero_results.sql).
--
-- 개인정보
--   - 검색어·결과 수·시각만 저장한다. user_id·기기 식별자는 저장하지 않는다.
--   - 30자 초과, 숫자 6자리 이상, '@' 가 든 입력(전화번호·이메일로 보이는 것)은 남기지 않는다.
--   - 90일이 지난 기록은 지운다(아래 purge_search_logs 를 월 1회 실행하거나 Cron 으로).
--
-- 접근
--   - 테이블은 RLS 만 켜고 정책을 두지 않는다 → 앱(anon·authenticated)이 직접 읽고 쓸 수 없다.
--   - 앱은 security definer 함수 두 개로만 접근한다:
--       log_search(검색어, 결과 수)      기록 (로그인 사용자)
--       trending_searches(일, 개수, 최소) 집계된 인기 검색어 (로그인 사용자)
--   - 인기 검색어에는 결과가 1건 이상이고 최소 횟수 이상 검색된 것만 오른다
--     (오타·장난 입력, 한 사람의 반복 입력이 바로 노출되지 않게).
--
-- 적용: SQL Editor 에 통째로 붙여 실행. 멱등 — 여러 번 실행해도 안전하다.
-- ============================================================

create table if not exists public.search_logs (
  id           bigint generated always as identity primary key,
  query        text not null check (char_length(query) between 1 and 30),
  -- 집계 키: 앞뒤 공백 제거, 연속 공백 1칸, 앞의 '#' 제거, 소문자
  query_norm   text generated always as (
                 lower(regexp_replace(regexp_replace(btrim(query), '^#+', ''), '\s+', ' ', 'g'))
               ) stored,
  result_count integer not null check (result_count >= 0),
  created_at   timestamptz not null default now()
);

create index if not exists search_logs_created_idx on public.search_logs (created_at desc);
create index if not exists search_logs_norm_idx    on public.search_logs (query_norm, created_at desc);

alter table public.search_logs enable row level security;
-- 정책 없음: 앱에서 직접 select/insert/update/delete 불가
revoke all on table public.search_logs from anon, authenticated;

-- ── 기록 ────────────────────────────────────────────────────
create or replace function public.log_search(p_query text, p_result_count integer)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.search_logs (query, result_count)
  select btrim(p_query), greatest(coalesce(p_result_count, 0), 0)
  where p_query is not null
    and char_length(btrim(p_query)) between 1 and 30
    and btrim(p_query) !~ '[0-9]{6,}'
    and position('@' in p_query) = 0;
$$;

-- Supabase 는 public 스키마의 새 함수에 anon·authenticated 실행 권한을 기본 부여한다(default privileges).
-- from public 만으로는 anon 이 남으므로 명시적으로 회수한다.
revoke all on function public.log_search(text, integer) from public, anon, authenticated;
grant execute on function public.log_search(text, integer) to authenticated;

-- ── 인기 검색어 ─────────────────────────────────────────────
create or replace function public.trending_searches(
  p_days      integer default 30,
  p_limit     integer default 8,
  p_min_count integer default 3
)
returns table (query text, searches bigint)
language sql
stable
security definer
set search_path = public
as $$
  select l.query_norm as query, count(*) as searches
  from public.search_logs l
  where l.created_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 90))
    and l.result_count > 0
    and l.query_norm <> ''
  group by l.query_norm
  having count(*) >= greatest(coalesce(p_min_count, 3), 1)
  order by count(*) desc, max(l.created_at) desc
  limit least(greatest(coalesce(p_limit, 8), 1), 20);
$$;

revoke all on function public.trending_searches(integer, integer, integer) from public, anon, authenticated;
grant execute on function public.trending_searches(integer, integer, integer) to authenticated;

-- ── 보관 기간 정리 (90일) ───────────────────────────────────
-- 앱에서는 호출할 수 없다(권한 없음). SQL Editor 나 Cron 에서 실행: select public.purge_search_logs();
create or replace function public.purge_search_logs(p_keep_days integer default 90)
returns integer
language sql
security definer
set search_path = public
as $$
  with d as (
    delete from public.search_logs
    where created_at < now() - make_interval(days => greatest(coalesce(p_keep_days, 90), 30))
    returning 1
  )
  select count(*)::integer from d;
$$;

revoke all on function public.purge_search_logs(integer) from public, anon, authenticated;
