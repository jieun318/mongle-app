-- ============================================================
-- 0021 적용 전 점검 (읽기 전용)
-- 0021_dream_items_enrich_b.sql 을 적용하기 전에 실행한다. 아무것도 쓰지 않는다.
-- 기대값: 신규 id 이미 있음 0 · 같은 제목 이미 있음 0 · keywords 대상 18 · 생성 시점 값과 같음 18 · 지금 전체 418건 → 적용 후 457건
-- 숫자가 다르면 생성 이후 DB 가 바뀐 것 — 적용하지 말고 build-migration.mjs 를 다시 돌릴 것.
-- 생성: node supabase/seeds/enrich/b/build-migration.mjs (원본 데이터: supabase/seeds/enrich/b/new.json·keywords.json — 직접 수정하지 말 것)
-- ============================================================

with n(id, title) as (
  values
    ('animal-031', $q$닭이 힘차게 우는 꿈$q$),
    ('animal-032', $q$닭이 알을 낳는 꿈$q$),
    ('animal-033', $q$원숭이가 재주를 부리는 꿈$q$),
    ('animal-034', $q$원숭이에게 물건을 빼앗기는 꿈$q$),
    ('animal-035', $q$독수리가 하늘 높이 나는 꿈$q$),
    ('animal-036', $q$독수리가 먹이를 낚아채는 꿈$q$),
    ('animal-037', $q$여우가 집 안으로 들어오는 꿈$q$),
    ('animal-038', $q$여우를 잡는 꿈$q$),
    ('animal-039', $q$늑대에게 쫓기는 꿈$q$),
    ('animal-040', $q$늑대를 물리치는 꿈$q$),
    ('animal-041', $q$코끼리를 타는 꿈$q$),
    ('animal-042', $q$코끼리가 집으로 들어오는 꿈$q$),
    ('animal-043', $q$개구리가 집 안으로 뛰어드는 꿈$q$),
    ('animal-044', $q$개구리가 우는 소리를 듣는 꿈$q$),
    ('animal-045', $q$나비가 날아드는 꿈$q$),
    ('animal-046', $q$나비가 고치에서 나오는 꿈$q$),
    ('animal-047', $q$상어에게 쫓기는 꿈$q$),
    ('animal-048', $q$상어를 잡는 꿈$q$),
    ('animal-049', $q$고래를 보는 꿈$q$),
    ('animal-050', $q$고래 등에 올라타는 꿈$q$),
    ('people-031', $q$짝사랑하는 사람이 나오는 꿈$q$),
    ('people-032', $q$짝사랑하는 사람에게 고백받는 꿈$q$),
    ('people-033', $q$짝사랑하는 사람이 다른 사람과 있는 꿈$q$),
    ('people-034', $q$연인과 키스하는 꿈$q$),
    ('people-035', $q$모르는 사람과 키스하는 꿈$q$),
    ('people-036', $q$연인이 바람피우는 꿈$q$),
    ('people-037', $q$내가 바람피우는 꿈$q$),
    ('people-038', $q$배우자가 바람피우는 꿈$q$),
    ('people-039', $q$배우자와 이혼하는 꿈$q$),
    ('people-040', $q$부모님이 이혼하는 꿈$q$),
    ('body-040', $q$수술을 받는 꿈$q$),
    ('body-041', $q$가족이 수술을 받는 꿈$q$),
    ('daily-031', $q$약속이나 출근에 지각하는 꿈$q$),
    ('daily-032', $q$시험에 늦는 꿈$q$),
    ('daily-033', $q$누군가에게 납치당하는 꿈$q$),
    ('daily-034', $q$납치된 곳에서 빠져나오는 꿈$q$),
    ('daily-035', $q$교통사고가 나는 꿈$q$),
    ('daily-036', $q$교통사고를 목격하는 꿈$q$),
    ('daily-037', $q$교통사고에서 무사히 살아나는 꿈$q$)
),
k(id, old_keywords) as (
  values
    ('body-012', array['코피 나는 꿈','코피꿈 해몽','코피 흘리는 꿈']::text[]),
    ('lucky-028', array['첫눈 꿈','첫눈 맞는 꿈','첫눈꿈 해몽']::text[]),
    ('daily-004', array['집짓는 꿈','기와집 꿈','새집 짓는 꿈']::text[]),
    ('lucky-022', array['새집 얻는 꿈','좋은집 꿈','넓은집 꿈 해몽']::text[]),
    ('lucky-018', array['등불 꿈','등불꿈 해몽','밝은빛 꿈']::text[]),
    ('lucky-020', array['황금들판 꿈','들판 꿈','가을들판 꿈 해몽']::text[]),
    ('crawled-047', array['인기','몰락']::text[]),
    ('pregnancy-019', array['박꽃꿈 태몽','박꽃 보는 꿈','박꽃 태몽']::text[]),
    ('nature-009', array['흙탕물 꿈','흙탕물에 빠지는 꿈','더러운 물 꿈']::text[]),
    ('nature-010', array['큰물 꿈','홍수 꿈','물 넘치는 꿈']::text[]),
    ('nature-019', array['우물 마르는 꿈','우물꿈 해몽','샘물 마르는 꿈']::text[]),
    ('pregnancy-017', array['우물물꿈 태몽','우물 마시는 꿈','우물 태몽']::text[]),
    ('unlucky-017', array['검은강물 꿈','흐린물 꿈','강물꿈 흉몽']::text[]),
    ('animal-020', array['암말꿈','말이 집에 들어오는 꿈','결혼운 꿈']::text[]),
    ('crawled-112', array['불','자동차','목표달성','성공','열정']::text[]),
    ('daily-021', array['기차 놓치는 꿈','버스 놓치는 꿈','놓치는 꿈 해몽']::text[]),
    ('body-026', array['손발 묶이는 꿈','묶이는 꿈 해몽','밧줄꿈']::text[]),
    ('people-006', array['부부꿈','잔치 꿈','이혼 꿈 해몽']::text[])
)
select
  (select count(*) from public.dream_items)                                              as "지금 전체 (=418)",
  (select count(*) from public.dream_items d join n using (id))                          as "신규 id 이미 있음 (=0)",
  (select count(*) from public.dream_items d join n on d.title = n.title)                as "같은 제목 이미 있음 (=0)",
  (select count(*) from public.dream_items d join k using (id))                          as "keywords 대상 (=18)",
  (select count(*) from public.dream_items d join k using (id) where d.keywords = k.old_keywords) as "생성 시점 값과 같음 (=18)";

-- keywords 가 바뀌는 항목: 지금 값 → 새 값
with k(id, keywords) as (
  values
    ('body-012', array['코피 나는 꿈','코피꿈 해몽','코피 흘리는 꿈','피']::text[]),
    ('lucky-028', array['첫눈 꿈','첫눈 맞는 꿈','첫눈꿈 해몽','눈']::text[]),
    ('daily-004', array['집짓는 꿈','기와집 꿈','새집 짓는 꿈','집']::text[]),
    ('lucky-022', array['새집 얻는 꿈','좋은집 꿈','넓은집 꿈 해몽','집']::text[]),
    ('lucky-018', array['등불 꿈','등불꿈 해몽','밝은빛 꿈','불']::text[]),
    ('lucky-020', array['황금들판 꿈','들판 꿈','가을들판 꿈 해몽','금']::text[]),
    ('crawled-047', array['인기','몰락','꽃','분꽃']::text[]),
    ('pregnancy-019', array['박꽃꿈 태몽','박꽃 보는 꿈','박꽃 태몽','꽃']::text[]),
    ('nature-009', array['흙탕물 꿈','흙탕물에 빠지는 꿈','더러운 물 꿈','물']::text[]),
    ('nature-010', array['큰물 꿈','홍수 꿈','물 넘치는 꿈','물']::text[]),
    ('nature-019', array['우물 마르는 꿈','우물꿈 해몽','샘물 마르는 꿈','물']::text[]),
    ('pregnancy-017', array['우물물꿈 태몽','우물 마시는 꿈','우물 태몽','물']::text[]),
    ('unlucky-017', array['검은강물 꿈','흐린물 꿈','강물꿈 흉몽','물']::text[]),
    ('animal-020', array['암말꿈','말이 집에 들어오는 꿈','결혼운 꿈','말']::text[]),
    ('crawled-112', array['불','자동차','목표달성','성공','열정','차']::text[]),
    ('daily-021', array['기차 놓치는 꿈','버스 놓치는 꿈','놓치는 꿈 해몽','차']::text[]),
    ('body-026', array['손발 묶이는 꿈','묶이는 꿈 해몽','밧줄꿈','손','발']::text[]),
    ('people-006', array['부부꿈','잔치 꿈','부부 꿈 해몽']::text[])
)
select d.id, d.title, d.keywords as "지금 keywords", k.keywords as "새 keywords"
from public.dream_items d join k using (id)
order by d.id;
