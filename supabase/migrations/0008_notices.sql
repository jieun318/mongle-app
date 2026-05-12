-- ============================================================
-- 0008_notices
--   공지사항 테이블.
--   - 홈 화면 벨 아이콘 → 공지 모달에서 노출
--   - is_active = true 인 공지만 클라이언트에 보임 (게시/숨김 토글용)
--   - 읽음 처리는 클라이언트 AsyncStorage 에서 관리 (전역 공지라 사용자별 read 컬럼 불필요)
-- 멱등성: 여러 번 실행해도 안전합니다.
-- ============================================================

create table if not exists public.notices (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  content    text not null default '',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists notices_active_created_idx
  on public.notices (is_active, created_at desc);

-- 권한 — 모든 로그인 사용자가 활성 공지 읽기 가능. 작성/수정/삭제는 service role(어드민) 만.
grant select on public.notices to authenticated;

-- RLS — 활성 공지만 읽기 허용
alter table public.notices enable row level security;

drop policy if exists notices_read_active on public.notices;
create policy notices_read_active
  on public.notices for select
  to authenticated
  using (is_active = true);
