-- ============================================================
-- delete_my_account() — 회원 탈퇴 RPC
--   현재 로그인한 사용자(auth.uid())를 auth.users 에서 삭제한다.
--   profiles / dreams / bookmarks 는 ON DELETE CASCADE 로 자동 정리.
--
--   security definer 로 실행되어 호출자 권한과 무관하게 auth.users 를
--   조작할 수 있으므로, 반드시 auth.uid() 로 본인 행만 삭제하도록 제한.
--
--   호출 예) supabase.rpc('delete_my_account')
-- 멱등성: 여러 번 실행해도 안전합니다.
-- ============================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
