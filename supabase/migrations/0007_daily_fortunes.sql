-- ============================================================
-- 0007_daily_fortunes
--   사용자별 일일 운세 영속화 테이블.
--   - 구슬 일일 운세 ( features/fortune/dailyFortune.ts ) 를 DB 저장
--   - mypage "이번 주 운세" 가 같은 소스를 읽어 표시
-- 멱등성: 여러 번 실행해도 안전합니다.
-- ============================================================

create table if not exists public.daily_fortunes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  grade      text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.daily_fortunes drop constraint if exists daily_fortunes_grade_check;
alter table public.daily_fortunes
  add constraint daily_fortunes_grade_check
  check (grade in ('대길', '소길', '평범', '조심'));

create index if not exists daily_fortunes_user_date_idx
  on public.daily_fortunes (user_id, date desc);

-- 권한
grant select, insert, update on public.daily_fortunes to authenticated;

-- RLS — 본인 row 만 읽기/쓰기
alter table public.daily_fortunes enable row level security;

drop policy if exists "daily_fortunes_select_own" on public.daily_fortunes;
create policy "daily_fortunes_select_own"
  on public.daily_fortunes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "daily_fortunes_insert_own" on public.daily_fortunes;
create policy "daily_fortunes_insert_own"
  on public.daily_fortunes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "daily_fortunes_update_own" on public.daily_fortunes;
create policy "daily_fortunes_update_own"
  on public.daily_fortunes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
