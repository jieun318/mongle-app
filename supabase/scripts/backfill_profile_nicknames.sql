-- 기존 계정 닉네임 백필 (일회성, 수동 실행)
--
-- 0018 이전에 가입한 카카오 계정은 트리거가 'nickname' 키만 봐서
-- profiles.nickname 이 전부 '몽글이' 로 저장됐다. metadata 에는 실제 값이
-- 남아 있으므로 되살릴 수 있다.
--
-- migrations/ 가 아니라 scripts/ 에 두는 이유: 일회성 데이터 보정이라
-- 마이그레이션으로 자동 적용되면 안 된다.
--
-- ⚠️ 반드시 STEP 1 로 영향 범위를 먼저 확인하고 STEP 2 를 실행할 것.
-- ⚠️ 일부러 '몽글이' 로 설정한 사용자는 구분할 수 없어 함께 덮어써진다.
-- ⚠️ 이메일 가입 계정은 metadata 가 비어 있어 new_nickname 이 NULL →
--    자동으로 제외된다(가입 시 닉네임을 수집하지 않으므로 정상 동작).

-- ── STEP 1. 영향 범위 확인 (읽기 전용) ──────────────────────
select
  u.created_at,
  u.email,
  p.nickname                    as "현재값",
  v.new_nickname                as "변경될값",
  u.raw_user_meta_data->>'name' as k_name
from public.profiles p
join auth.users u on u.id = p.uid
cross join lateral (
  select coalesce(
    nullif(trim(u.raw_user_meta_data->>'nickname'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'user_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'preferred_username'), '')
  ) as new_nickname
) v
where p.nickname = '몽글이'
  and v.new_nickname is not null
  and v.new_nickname <> '몽글이'
order by u.created_at desc;

-- ── STEP 2. 실제 백필 ───────────────────────────────────────
-- STEP 1 결과가 예상과 같을 때만 실행.
update public.profiles p
set nickname = v.new_nickname
from auth.users u
cross join lateral (
  select coalesce(
    nullif(trim(u.raw_user_meta_data->>'nickname'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'user_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'preferred_username'), '')
  ) as new_nickname
) v
where u.id = p.uid
  and p.nickname = '몽글이'          -- 기본값인 행만 — 사용자가 바꾼 값 보호
  and v.new_nickname is not null
  and v.new_nickname <> '몽글이';
