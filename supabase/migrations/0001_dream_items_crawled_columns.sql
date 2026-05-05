-- ============================================================
-- dream_items: 크롤링 데이터용 컬럼 추가
--   - conditions : 조건부 해몽 [{condition, type}, ...]
--   - source_url : 출처 URL
-- 멱등성: 여러 번 실행해도 안전합니다.
-- ============================================================

alter table public.dream_items
  add column if not exists conditions jsonb not null default '[]'::jsonb,
  add column if not exists source_url text;
