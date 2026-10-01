-- ============================================================
-- 0019 되돌리기 — 백업 테이블에서 복구
-- 0019_dream_items_enrich_a.sql 이 만든 backup.dream_items_0019 의 값으로 되돌린다.
-- 백업 테이블이 없으면 0019_rollback_snapshot.sql 을 쓸 것(생성 시점 값).
-- do 블록 하나(= SQL 문 하나)라 SQL Editor 에 그대로 붙여 실행해도 원자적이다.
-- 생성: node supabase/seeds/enrich/a/build-migration.mjs (원본 데이터: supabase/seeds/enrich/a/*.json — 직접 수정하지 말 것)
-- ============================================================

do $rb$
declare n int;
begin
  select count(*) into n from backup.dream_items_0019;
  if n <> 157 then
    raise exception '백업 행 % 건 — 157 건이어야 합니다. 되돌리기를 취소합니다.', n;
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
