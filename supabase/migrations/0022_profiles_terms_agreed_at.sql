-- ============================================================
-- 0022_profiles_terms_agreed_at — 약관·개인정보 동의 시각
--
-- 목적
--   - 카카오 첫 로그인은 곧 가입인데, 앱 자체 동의 절차가 없었다
--     ("로그인하면 동의로 간주" 문구뿐). 앱이 동의 화면(/consent)을 띄우고
--     동의 시각을 여기에 남긴다.
--   - null 이면 아직 동의하지 않은 계정 → (app)/_layout 이 /consent 로 보낸다.
--   - 동의 항목: 이용약관 / 개인정보 수집·이용 / 국외 이전 / 만 14세 이상.
--     네 항목은 모두 필수라 시각 하나로 기록한다.
--
-- 백필
--   - 기존 이메일 가입자는 가입 폼에서 약관·처리방침 필수 동의를 이미 거쳤으므로
--     profiles.created_at 으로 채운다. (만 14세·국외 이전 항목은 이번에 추가돼
--     엄밀히는 받지 않았다 — 재동의가 필요하다고 판단되면 이 update 를 빼고
--     적용하면 이메일 가입자도 동의 화면을 한 번 거친다.)
--   - 카카오 가입자는 null 로 둔다 → 다음 실행 때 동의 화면을 본다.
--   - 판정은 auth.identities.provider = 'email'. 카카오 identity 가 같이 있는
--     계정은 없지만(연결 기능 없음), 있더라도 email identity 가 있으면 가입 폼을
--     거친 것이므로 채운다.
--
-- 권한
--   - profiles_update_own 정책(schema.sql)이 본인 row 갱신을 이미 허용한다.
--
-- 적용: SQL Editor 에 통째로 붙여 실행. 멱등 — 여러 번 실행해도 안전하다.
--       (update 는 terms_agreed_at is null 인 행만 건드린다.)
-- ============================================================

alter table public.profiles
  add column if not exists terms_agreed_at timestamptz;

update public.profiles p
   set terms_agreed_at = p.created_at
 where p.terms_agreed_at is null
   and exists (
     select 1
       from auth.identities i
      where i.user_id = p.uid
        and i.provider = 'email'
   );
