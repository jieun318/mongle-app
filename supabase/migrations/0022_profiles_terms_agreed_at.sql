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
-- 기존 가입자
--   - 백필하지 않는다. 카카오·이메일 가입자 모두 null 로 두어 다음 실행 때
--     새 동의 4개를 받는다. (이메일 가입자가 예전에 동의한 건 약관·처리방침
--     2개뿐이라 국외 이전·만 14세 동의가 없다.)
--
-- 신규 이메일 가입자
--   - 가입 폼이 필수 동의 시각을 raw_user_meta_data.terms_agreed_at 에 실어
--     보낸다(features/auth/auth.ts signUpWithEmail). handle_new_user 가 이 값을
--     profiles 로 옮긴다 — 가입 직후 동의 화면이 다시 뜨지 않게.
--   - 값이 없거나 ISO 8601 형식(YYYY-MM-DDTHH:MM…)이 아니거나 변환에 실패하면
--     null. timestamptz 캐스트는 'now'·'infinity' 같은 특수 문자열도 받아들이므로
--     형식을 먼저 확인한다. 카카오 가입은 이 키가 없어 null → 동의 화면.
--
-- handle_new_user 재정의
--   - 0018 의 닉네임 로직은 그대로 두고 terms_agreed_at 만 추가한다.
--     (0018 은 avatar_url 을 의도적으로 다루지 않는다 — 그대로 유지.)
--
-- 권한
--   - profiles_update_own 정책(schema.sql)이 본인 row 갱신을 이미 허용한다
--     (동의 화면이 terms_agreed_at 을 직접 기록한다).
--
-- 적용: SQL Editor 에 통째로 붙여 실행. 멱등 — 여러 번 실행해도 안전하다.
-- ============================================================

alter table public.profiles
  add column if not exists terms_agreed_at timestamptz;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw    text := new.raw_user_meta_data->>'terms_agreed_at';
  v_agreed timestamptz := null;
begin
  if v_raw ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}' then
    begin
      v_agreed := v_raw::timestamptz;
    exception when others then
      -- 형식은 맞지만 날짜가 틀린 값(2026-13-40T…) — 가입은 막지 않는다
      v_agreed := null;
    end;
  end if;

  insert into public.profiles (uid, nickname, terms_agreed_at)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'nickname'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'user_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'preferred_username'), ''),
      '몽글이'
    ),
    v_agreed
  )
  on conflict (uid) do nothing;
  return new;
end;
$$;

-- 함수만 교체해도 기존 트리거가 새 함수를 쓴다. 0018 과 같이 멱등하게 다시 건다.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
