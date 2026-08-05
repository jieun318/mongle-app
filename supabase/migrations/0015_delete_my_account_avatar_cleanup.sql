-- ============================================================
-- delete_my_account() — 프로필 사진까지 삭제하도록 확장
--   기존 함수는 auth.users 행만 지웠다. profiles / dreams / bookmarks /
--   daily_fortunes / ai_message_reports 는 ON DELETE CASCADE 로 정리되지만,
--   Storage 의 avatars 버킷 객체는 auth.users 를 참조하는 FK 가 없어
--   {uid}/avatar.jpg 파일이 그대로 남아 있었다.
--
--   Play 데이터 삭제 안내(app/account-deletion.tsx)에 "프로필 사진 영구 삭제"
--   를 명시하므로, 안내와 실제 동작을 일치시킨다.
--
--   순서 주의: auth.users 를 먼저 지우면 auth.uid() 가 무효가 될 수 있어
--   storage 객체를 먼저 삭제한다.
-- 멱등성: 여러 번 실행해도 안전합니다.
-- ============================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- 프로필 사진 — 경로 규칙 {uid}/avatar.jpg (schema.sql avatars 버킷 참고)
  delete from storage.objects
  where bucket_id = 'avatars'
    and (storage.foldername(name))[1] = v_uid::text;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
