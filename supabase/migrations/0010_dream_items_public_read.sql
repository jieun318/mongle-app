-- ============================================================
-- 0010_dream_items_public_read
--   dream_items 는 공개 해몽 사전이므로 비인증(anon) 사용자도 읽을 수 있게 허용.
--   (categories 도 같은 이유로 anon 읽기 허용)
--   기존 authenticated-only 정책을 anon, authenticated 둘 다 읽기 가능하도록 교체.
-- 멱등성: 여러 번 실행해도 안전합니다.
-- ============================================================

-- dream_items
drop policy if exists "dream_items_select_authenticated" on public.dream_items;
drop policy if exists "dream_items_select_public"         on public.dream_items;

create policy "dream_items_select_public"
  on public.dream_items
  for select
  to anon, authenticated
  using (true);

-- categories (앱 부팅 시 카테고리도 함께 읽음)
drop policy if exists "categories_select_authenticated" on public.categories;
drop policy if exists "categories_select_public"         on public.categories;

create policy "categories_select_public"
  on public.categories
  for select
  to anon, authenticated
  using (true);
