-- ============================================================
-- 검색 결과가 없거나 적은 검색어 — 꿈 사전 보강 우선순위 (읽기 전용)
-- 0020_search_logs.sql 적용 후 SQL Editor 에서 쿼리를 하나씩 선택해 실행
-- (Editor 는 마지막 쿼리 결과만 보여준다).
-- ============================================================

-- 1) 최근 30일, 결과 0개 검색어 상위 50
select query_norm          as 검색어,
       count(*)            as 횟수,
       max(created_at)     as 마지막
from public.search_logs
where result_count = 0
  and created_at >= now() - interval '30 days'
group by query_norm
order by count(*) desc, max(created_at) desc
limit 50;

-- 2) 최근 30일, 결과가 1~2건뿐인 "약한" 검색어 상위 50
select query_norm                     as 검색어,
       count(*)                       as 횟수,
       round(avg(result_count), 1)    as 평균결과
from public.search_logs
where result_count between 1 and 2
  and created_at >= now() - interval '30 days'
group by query_norm
order by count(*) desc
limit 50;

-- 3) 최근 30일 인기 검색어 (앱 추천 칩과 같은 기준)
select * from public.trending_searches(30, 20, 3);
