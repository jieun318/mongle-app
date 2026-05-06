-- ============================================================
-- dream_items: is_lucky 컬럼 추가
--   - 'lucky' / 'unlucky' / 'conditional' 등 길흉 분류 텍스트
--   - 기존 is_warning(boolean) / luck_index(int) 와 별도로,
--     원본 데이터의 분류값을 그대로 보존하기 위한 컬럼
-- 멱등성: 여러 번 실행해도 안전합니다.
-- ============================================================

alter table public.dream_items
  add column if not exists is_lucky text;
