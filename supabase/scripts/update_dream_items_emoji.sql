-- ============================================================
-- supabase/scripts/update_dream_items_emoji.sql
--   dream_items.emoji 를 title 의 행동/주어 키워드 기반으로 재계산.
--
-- 우선순위:
--   1) 행동/결과 키워드  (쫓기는, 무는, 죽이는, ...)
--   2) 주어 키워드        (뱀, 돼지, 호랑이, ...)
--   3) categories.emoji   (카테고리 기본값)
--   4) '💭'                (모든 단계 미스)
--
-- 사용법 — Supabase SQL Editor:
--   1) STEP 1 (SELECT) 만 먼저 실행해서 current_emoji vs new_emoji 비교
--   2) 결과가 만족스러우면 STEP 2 (UPDATE) 실행
-- ============================================================


-- ┌───────────────────────────────────────────────────────────┐
-- │  공통 CASE 식                                              │
-- │  주의: SELECT / UPDATE 양쪽에 동일하게 복붙되어 있음.      │
-- │       한 쪽만 바꾸지 말 것.                                │
-- └───────────────────────────────────────────────────────────┘
--
-- 오인식 회피를 위해 모호한 substring 은 제외:
--   - '먹는'  → '잡아먹' 만 사용 (꿀먹는/약먹는 등 일반 동사 충돌 방지)
--   - '나는'  → '승천','날아' 만 사용 ('나는 새가 보이는' 류 비-주어 충돌)
--   - '안는'  → '껴안' 만 사용     ('방 안','집 안' 류 명사 충돌)
--   - '보는'  → '바라보' 만 사용   ('해보는','시도해보는' 류 일반 동사)
--
-- substring 충돌 회피용 정렬 규칙:
--   - '잡아먹' 은 '잡아' 보다 먼저  → 🍽️ 우선
--   - 행동 키워드 전체가 주어 키워드보다 먼저
--
-- 단음절 '용' 은 '사용','용서' 등에도 매치되므로,
-- 앞단의 행동 키워드에 잡히지 않은 항목 한정으로만 적용됨.


-- ============================================================
-- STEP 1. 미리보기  (변경 예정 행만 노출)
-- ============================================================
SELECT
  d.id,
  d.category_id,
  d.title,
  d.emoji AS current_emoji,
  CASE
    -- ── 1) 행동/결과 키워드 ────────────────────────────────
    WHEN d.title LIKE '%잡아먹%'                               THEN '🍽️'
    WHEN d.title LIKE '%쫓기%'  OR d.title LIKE '%쫓아%'
      OR d.title LIKE '%도망%'                                 THEN '🏃'
    WHEN d.title LIKE '%무는%'  OR d.title LIKE '%물리는%'     THEN '😬'
    WHEN d.title LIKE '%잡는%'  OR d.title LIKE '%잡아%'       THEN '🤜'
    WHEN d.title LIKE '%죽이%'  OR d.title LIKE '%죽는%'
      OR d.title LIKE '%죽어%'                                 THEN '💀'
    WHEN d.title LIKE '%싸우%'  OR d.title LIKE '%싸움%'       THEN '⚔️'
    WHEN d.title LIKE '%승천%'  OR d.title LIKE '%날아%'       THEN '🕊️'
    WHEN d.title LIKE '%토해%'  OR d.title LIKE '%뱉는%'       THEN '🤮'
    WHEN d.title LIKE '%감기는%' OR d.title LIKE '%감고%'      THEN '🌀'
    WHEN d.title LIKE '%불나는%' OR d.title LIKE '%불이 붙%'   THEN '🔥'
    WHEN d.title LIKE '%빠지는%'                               THEN '🌊'
    WHEN d.title LIKE '%낳는%'  OR d.title LIKE '%출산%'       THEN '🍼'
    WHEN d.title LIKE '%잠자는%'                               THEN '😴'
    WHEN d.title LIKE '%떨어지%' OR d.title LIKE '%추락%'      THEN '⬇️'
    WHEN d.title LIKE '%타고%'                                 THEN '🚀'
    WHEN d.title LIKE '%껴안%'                                 THEN '🤗'
    WHEN d.title LIKE '%바라보%'                               THEN '👀'
    WHEN d.title LIKE '%굴러%'  OR d.title LIKE '%구르는%'     THEN '🔄'

    -- ── 2) 주어 키워드 ────────────────────────────────────
    WHEN d.title LIKE '%뱀%'      THEN '🐍'
    WHEN d.title LIKE '%돼지%'    THEN '🐷'
    WHEN d.title LIKE '%호랑이%'  THEN '🐯'
    WHEN d.title LIKE '%강아지%'  THEN '🐶'
    WHEN d.title LIKE '%고양이%'  THEN '🐱'
    WHEN d.title LIKE '%물고기%'  THEN '🐟'
    WHEN d.title LIKE '%지렁이%'  THEN '🪱'
    WHEN d.title LIKE '%용%'      THEN '🐉'

    -- ── 3) 카테고리 기본값 ────────────────────────────────
    ELSE COALESCE(
      (SELECT c.emoji FROM public.categories c WHERE c.id = d.category_id),
      '💭'
    )
  END AS new_emoji
FROM public.dream_items d
WHERE
  -- 변경되는 행만 미리보기 (이미 동일하면 노이즈)
  d.emoji IS DISTINCT FROM (
    CASE
      WHEN d.title LIKE '%잡아먹%'                               THEN '🍽️'
      WHEN d.title LIKE '%쫓기%'  OR d.title LIKE '%쫓아%'
        OR d.title LIKE '%도망%'                                 THEN '🏃'
      WHEN d.title LIKE '%무는%'  OR d.title LIKE '%물리는%'     THEN '😬'
      WHEN d.title LIKE '%잡는%'  OR d.title LIKE '%잡아%'       THEN '🤜'
      WHEN d.title LIKE '%죽이%'  OR d.title LIKE '%죽는%'
        OR d.title LIKE '%죽어%'                                 THEN '💀'
      WHEN d.title LIKE '%싸우%'  OR d.title LIKE '%싸움%'       THEN '⚔️'
      WHEN d.title LIKE '%승천%'  OR d.title LIKE '%날아%'       THEN '🕊️'
      WHEN d.title LIKE '%토해%'  OR d.title LIKE '%뱉는%'       THEN '🤮'
      WHEN d.title LIKE '%감기는%' OR d.title LIKE '%감고%'      THEN '🌀'
      WHEN d.title LIKE '%불나는%' OR d.title LIKE '%불이 붙%'   THEN '🔥'
      WHEN d.title LIKE '%빠지는%'                               THEN '🌊'
      WHEN d.title LIKE '%낳는%'  OR d.title LIKE '%출산%'       THEN '🍼'
      WHEN d.title LIKE '%잠자는%'                               THEN '😴'
      WHEN d.title LIKE '%떨어지%' OR d.title LIKE '%추락%'      THEN '⬇️'
      WHEN d.title LIKE '%타고%'                                 THEN '🚀'
      WHEN d.title LIKE '%껴안%'                                 THEN '🤗'
      WHEN d.title LIKE '%바라보%'                               THEN '👀'
      WHEN d.title LIKE '%굴러%'  OR d.title LIKE '%구르는%'     THEN '🔄'
      WHEN d.title LIKE '%뱀%'      THEN '🐍'
      WHEN d.title LIKE '%돼지%'    THEN '🐷'
      WHEN d.title LIKE '%호랑이%'  THEN '🐯'
      WHEN d.title LIKE '%강아지%'  THEN '🐶'
      WHEN d.title LIKE '%고양이%'  THEN '🐱'
      WHEN d.title LIKE '%물고기%'  THEN '🐟'
      WHEN d.title LIKE '%지렁이%'  THEN '🪱'
      WHEN d.title LIKE '%용%'      THEN '🐉'
      ELSE COALESCE(
        (SELECT c.emoji FROM public.categories c WHERE c.id = d.category_id),
        '💭'
      )
    END
  )
ORDER BY d.category_id, d.id;


-- ============================================================
-- STEP 2. 실제 업데이트  (STEP 1 결과 확인 후 실행)
-- ============================================================
UPDATE public.dream_items AS d
SET emoji = CASE
    -- ── 1) 행동/결과 키워드 ────────────────────────────────
    WHEN d.title LIKE '%잡아먹%'                               THEN '🍽️'
    WHEN d.title LIKE '%쫓기%'  OR d.title LIKE '%쫓아%'
      OR d.title LIKE '%도망%'                                 THEN '🏃'
    WHEN d.title LIKE '%무는%'  OR d.title LIKE '%물리는%'     THEN '😬'
    WHEN d.title LIKE '%잡는%'  OR d.title LIKE '%잡아%'       THEN '🤜'
    WHEN d.title LIKE '%죽이%'  OR d.title LIKE '%죽는%'
      OR d.title LIKE '%죽어%'                                 THEN '💀'
    WHEN d.title LIKE '%싸우%'  OR d.title LIKE '%싸움%'       THEN '⚔️'
    WHEN d.title LIKE '%승천%'  OR d.title LIKE '%날아%'       THEN '🕊️'
    WHEN d.title LIKE '%토해%'  OR d.title LIKE '%뱉는%'       THEN '🤮'
    WHEN d.title LIKE '%감기는%' OR d.title LIKE '%감고%'      THEN '🌀'
    WHEN d.title LIKE '%불나는%' OR d.title LIKE '%불이 붙%'   THEN '🔥'
    WHEN d.title LIKE '%빠지는%'                               THEN '🌊'
    WHEN d.title LIKE '%낳는%'  OR d.title LIKE '%출산%'       THEN '🍼'
    WHEN d.title LIKE '%잠자는%'                               THEN '😴'
    WHEN d.title LIKE '%떨어지%' OR d.title LIKE '%추락%'      THEN '⬇️'
    WHEN d.title LIKE '%타고%'                                 THEN '🚀'
    WHEN d.title LIKE '%껴안%'                                 THEN '🤗'
    WHEN d.title LIKE '%바라보%'                               THEN '👀'
    WHEN d.title LIKE '%굴러%'  OR d.title LIKE '%구르는%'     THEN '🔄'

    -- ── 2) 주어 키워드 ────────────────────────────────────
    WHEN d.title LIKE '%뱀%'      THEN '🐍'
    WHEN d.title LIKE '%돼지%'    THEN '🐷'
    WHEN d.title LIKE '%호랑이%'  THEN '🐯'
    WHEN d.title LIKE '%강아지%'  THEN '🐶'
    WHEN d.title LIKE '%고양이%'  THEN '🐱'
    WHEN d.title LIKE '%물고기%'  THEN '🐟'
    WHEN d.title LIKE '%지렁이%'  THEN '🪱'
    WHEN d.title LIKE '%용%'      THEN '🐉'

    -- ── 3) 카테고리 기본값 ────────────────────────────────
    ELSE COALESCE(
      (SELECT c.emoji FROM public.categories c WHERE c.id = d.category_id),
      '💭'
    )
  END
WHERE
  d.emoji IS DISTINCT FROM (
    CASE
      WHEN d.title LIKE '%잡아먹%'                               THEN '🍽️'
      WHEN d.title LIKE '%쫓기%'  OR d.title LIKE '%쫓아%'
        OR d.title LIKE '%도망%'                                 THEN '🏃'
      WHEN d.title LIKE '%무는%'  OR d.title LIKE '%물리는%'     THEN '😬'
      WHEN d.title LIKE '%잡는%'  OR d.title LIKE '%잡아%'       THEN '🤜'
      WHEN d.title LIKE '%죽이%'  OR d.title LIKE '%죽는%'
        OR d.title LIKE '%죽어%'                                 THEN '💀'
      WHEN d.title LIKE '%싸우%'  OR d.title LIKE '%싸움%'       THEN '⚔️'
      WHEN d.title LIKE '%승천%'  OR d.title LIKE '%날아%'       THEN '🕊️'
      WHEN d.title LIKE '%토해%'  OR d.title LIKE '%뱉는%'       THEN '🤮'
      WHEN d.title LIKE '%감기는%' OR d.title LIKE '%감고%'      THEN '🌀'
      WHEN d.title LIKE '%불나는%' OR d.title LIKE '%불이 붙%'   THEN '🔥'
      WHEN d.title LIKE '%빠지는%'                               THEN '🌊'
      WHEN d.title LIKE '%낳는%'  OR d.title LIKE '%출산%'       THEN '🍼'
      WHEN d.title LIKE '%잠자는%'                               THEN '😴'
      WHEN d.title LIKE '%떨어지%' OR d.title LIKE '%추락%'      THEN '⬇️'
      WHEN d.title LIKE '%타고%'                                 THEN '🚀'
      WHEN d.title LIKE '%껴안%'                                 THEN '🤗'
      WHEN d.title LIKE '%바라보%'                               THEN '👀'
      WHEN d.title LIKE '%굴러%'  OR d.title LIKE '%구르는%'     THEN '🔄'
      WHEN d.title LIKE '%뱀%'      THEN '🐍'
      WHEN d.title LIKE '%돼지%'    THEN '🐷'
      WHEN d.title LIKE '%호랑이%'  THEN '🐯'
      WHEN d.title LIKE '%강아지%'  THEN '🐶'
      WHEN d.title LIKE '%고양이%'  THEN '🐱'
      WHEN d.title LIKE '%물고기%'  THEN '🐟'
      WHEN d.title LIKE '%지렁이%'  THEN '🪱'
      WHEN d.title LIKE '%용%'      THEN '🐉'
      ELSE COALESCE(
        (SELECT c.emoji FROM public.categories c WHERE c.id = d.category_id),
        '💭'
      )
    END
  );


-- ============================================================
-- (선택) STEP 3. 사후 점검
-- ============================================================
-- 카테고리별 emoji 분포 확인
-- SELECT category_id, emoji, count(*) AS n
-- FROM public.dream_items
-- GROUP BY category_id, emoji
-- ORDER BY category_id, n DESC;
