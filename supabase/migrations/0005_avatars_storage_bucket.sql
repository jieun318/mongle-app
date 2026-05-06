-- ============================================================
-- Storage: avatars 버킷
--   - 비공개 버킷. 표시 시 createSignedUrl 로 1시간 유효 URL 생성.
--   - 파일 경로 규칙: {user.id}/avatar.jpg  (features/auth/profile.ts)
--   - RLS 는 storage.objects 에 적용. 본인 폴더({uid}/...) 안에서만
--     select/insert/update/delete 가능.
-- 멱등성: 여러 번 실행해도 안전합니다.
-- ============================================================

-- 1) 버킷 생성 (이미 있으면 그대로 둠)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;


-- 2) RLS 정책 — 본인 폴더 한정
--   storage.foldername(name) 은 'uid/avatar.jpg' → ['uid','avatar.jpg']
--   첫 세그먼트가 auth.uid() 와 일치할 때만 접근 허용.

drop policy if exists "avatars_select_own" on storage.objects;
create policy "avatars_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
