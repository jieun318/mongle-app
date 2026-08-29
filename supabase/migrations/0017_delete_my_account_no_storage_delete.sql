-- ============================================================
-- delete_my_account() — storage.objects 직접 삭제 제거
--
--   0015 가 아바타 파일 정리를 위해 storage.objects 를 SQL DELETE 로 지웠는데,
--   Supabase 가 트리거로 이를 차단한다:
--     "Direct deletion from storage tables is not allowed.
--      Use the Storage API instead."
--   예외가 함수 전체를 롤백시켜 auth.users 삭제까지 무효화 → 탈퇴 자체가 실패.
--
--   아바타 삭제는 클라이언트가 Storage API 로 수행한다(features/auth/profile.ts).
--   avatars 버킷의 RLS(0005)가 본인 폴더 delete 를 이미 허용하므로 권한 확대가
--   필요 없고, 파일이 남더라도 탈퇴는 진행돼야 하므로 실패를 무시할 수 있다.
--
--   public 테이블(profiles/dreams/bookmarks/daily_fortunes/ai_message_reports)은
--   전부 auth.users(id) ON DELETE CASCADE 라 이 함수가 따로 지울 것이 없다.
--
--   search_path 에서 storage 를 뺀다 — 더 이상 참조하지 않는다.
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
