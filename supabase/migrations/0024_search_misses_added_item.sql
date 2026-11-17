-- ============================================================
-- 0024_search_misses_added_item — 검색 실패어 ↔ 보강 항목 연결
--
--   어드민 /generate 가 검색 실패어로 초안을 만들면 그 행에 새 항목 id 를 적어 둔다
--   (status 는 open 그대로). 어드민에서 그 항목을 게시하면 status = 'added' 로 바꾼다.
--   - 초안을 반려·삭제하면 실패어는 open 으로 남아 다시 후보에 뜬다.
--   - 항목이 지워지면 연결만 끊긴다 (on delete set null).
--   - record_search_miss 의 "added 인데 또 0건이면 open" 규칙은 그대로다.
--
--   권한·RLS 는 0023 그대로 — search_misses 는 관리자만 읽기/쓰기.
--
-- 적용: SQL Editor 에 통째로 붙여 실행. 멱등 — 여러 번 실행해도 안전하다.
-- ============================================================

alter table public.search_misses
  add column if not exists added_item_id text
    references public.dream_items (id) on delete set null;

create index if not exists search_misses_added_item_idx
  on public.search_misses (added_item_id)
  where added_item_id is not null;

-- 확인 (따로 실행)
--   select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'search_misses' and column_name = 'added_item_id';
