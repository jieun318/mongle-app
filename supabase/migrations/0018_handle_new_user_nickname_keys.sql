-- ============================================================
-- handle_new_user() — 닉네임 키 후보 확장
--
--   기존 트리거는 raw_user_meta_data->>'nickname' 하나만 봤다. 그런데
--   Supabase 의 카카오 OAuth 는 'nickname' 키를 만들지 않는다. 실제 구조:
--     { "name": "...", "full_name": "...", "user_name": "...",
--       "preferred_username": "...", "avatar_url": "...", ... }
--   → NULL 로 떨어져 모든 카카오 가입자의 닉네임이 '몽글이' 가 됐다.
--   (대시보드 Display name 에는 정상으로 보이는 이유 = 그건 name 을 읽는다)
--
--   우선순위: nickname 을 맨 앞에 둔다. 사용자가 직접 지정한 값이나
--   다른 provider(애플 등)가 그 키를 쓸 수 있어 명시값이 항상 이겨야 한다.
--
--   coalesce 는 NULL 만 거르므로 빈 문자열이 통과한다.
--   nullif(trim(...), '') 로 공백만 있는 값도 함께 걸러낸다.
--
--   avatar_url 은 의도적으로 다루지 않는다 — profiles.profile_image_url 은
--   Storage 경로를 담고 createSignedUrl 로 표시하므로, 카카오의 HTTP URL 을
--   넣으면 조회가 깨진다.
-- 멱등성: 여러 번 실행해도 안전합니다.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (uid, nickname)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'nickname'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'user_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'preferred_username'), ''),
      '몽글이'
    )
  )
  on conflict (uid) do nothing;
  return new;
end;
$$;

-- 트리거 자체는 그대로 유지된다(함수만 교체). 재생성은 불필요하지만
-- schema.sql 만 적용된 환경에서도 확실히 붙도록 멱등하게 다시 건다.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
