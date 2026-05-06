-- ============================================================
-- dreams: 본인 꿈만 수정/삭제 가능 RLS 정책
--   - GRANT 로 update/delete 권한 부여
--   - dreams_update_own / dreams_delete_own 정책으로 본인 row 한정
--
--   (참고) schema.sql 초기 버전에도 동일한 정책이 정의되어 있으나,
--   기존에 구버전 schema 로 배포된 환경을 위한 멱등 마이그레이션.
-- 멱등성: 여러 번 실행해도 안전합니다.
-- ============================================================

grant update, delete on public.dreams to authenticated;

drop policy if exists "dreams_update_own" on public.dreams;
create policy "dreams_update_own"
  on public.dreams
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "dreams_delete_own" on public.dreams;
create policy "dreams_delete_own"
  on public.dreams
  for delete
  to authenticated
  using (auth.uid() = user_id);
