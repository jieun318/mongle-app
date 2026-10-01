-- ============================================================
-- 0021 되돌리기 — 백업 테이블로 복구
-- 0021_dream_items_enrich_b.sql 이 만든 backup.dream_items_0021 기준으로
-- 신규 39건을 지우고 keywords 18건을 되돌린다. do 블록 하나라 SQL Editor 에 그대로 붙여 실행해도 원자적이다.
-- 신규 항목을 지우면 그 항목의 북마크(bookmarks)도 함께 지워지고, 꿈 기록(dreams)의 연결은 null 이 된다.
-- 생성: node supabase/seeds/enrich/b/build-migration.mjs (원본 데이터: supabase/seeds/enrich/b/new.json·keywords.json — 직접 수정하지 말 것)
-- ============================================================

do $rb$
declare n_ins int; n_kw int;
begin
  select count(*) filter (where action = 'insert'), count(*) filter (where action = 'keywords')
    into n_ins, n_kw
  from backup.dream_items_0021;
  if n_ins <> 39 or n_kw <> 18 then
    raise exception '백업 행 insert % · keywords % — 39 · 18 이어야 합니다. 되돌리기를 취소합니다.', n_ins, n_kw;
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
