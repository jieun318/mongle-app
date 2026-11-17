-- ============================================================
-- 0025_dream_item_reviews — AI 검수 메모 (어드민 전용)
--
--   어드민 /generate 가 초안을 만든 뒤 AI 검수 단계에서 남긴 메모를 저장한다
--   (어색한 문장, 해석, 카테고리, 기존 항목과 뜻·문장 겹침 등 사람이 판단할 것).
--   - dream_items 에 열로 두지 않는다 — 앱이 게시 항목을 읽을 때 메모까지 읽히지 않게.
--   - 관리자(0023 public.is_admin())만 읽기/쓰기. 앱(anon·일반 회원)은 접근 불가.
--   - 항목이 지워지면 메모도 지워진다.
--
-- 적용: SQL Editor 에 통째로 붙여 실행. 멱등 — 여러 번 실행해도 안전하다.
-- ============================================================

create table if not exists public.dream_item_reviews (
  item_id        text primary key references public.dream_items (id) on delete cascade,
  notes          text[] not null default '{}',
  similar_titles text[] not null default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.dream_item_reviews enable row level security;
revoke all on table public.dream_item_reviews from anon, authenticated;
grant select, insert, update, delete on public.dream_item_reviews to authenticated;  -- RLS 로 관리자만

drop policy if exists "dream_item_reviews_admin_all" on public.dream_item_reviews;
create policy "dream_item_reviews_admin_all"
  on public.dream_item_reviews
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- 확인 (따로 실행)
--   select relname, relrowsecurity from pg_class where relname = 'dream_item_reviews';
--   select policyname, roles, cmd from pg_policies where tablename = 'dream_item_reviews';
