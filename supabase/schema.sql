-- ============================================================
-- 몽글 (Mongle) — Supabase 초기 스키마 + 시드 데이터
-- ============================================================
-- 사용법: Supabase 대시보드 > SQL Editor 에서 통째로 실행
-- 멱등성: 모든 DDL/DML 이 IF NOT EXISTS / ON CONFLICT 처리되어
--          여러 번 실행해도 안전합니다.
-- ============================================================


-- ============================================================
-- 1. categories — 꿈 카테고리 (마스터 데이터)
-- ============================================================
create table if not exists public.categories (
  id         text primary key,
  label      text not null,
  emoji      text not null,
  bg         text not null,
  created_at timestamptz not null default now()
);


-- ============================================================
-- 2. dream_items — 꿈 해몽 사전 (마스터 데이터)
-- ============================================================
create table if not exists public.dream_items (\
  id             text primary key,
  category_id    text not null references public.categories(id),
  title          text not null,
  preview        text not null default '',
  description    text not null default '',
  emoji          text not null,
  tags           text[] not null default '{}',     -- '길몽' / '흉몽' / '태몽'
  keywords       text[] not null default '{}',     -- 검색 키워드 (돼지, 뱀, ...)
  bookmark_count integer not null default 0,
  luck_index     integer not null default 0,       -- 0~100
  is_warning     boolean not null default false,
  mood_tags      jsonb   not null default '[]'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists dream_items_category_id_idx on public.dream_items (category_id);
create index if not exists dream_items_tags_gin_idx    on public.dream_items using gin (tags);
create index if not exists dream_items_keywords_gin_idx on public.dream_items using gin (keywords);


-- ============================================================
-- 3. profiles — 사용자 프로필 (auth.users 1:1)
-- ============================================================
create table if not exists public.profiles (
  uid               uuid primary key references auth.users(id) on delete cascade,
  nickname          text,
  profile_image_url text,
  created_at        timestamptz not null default now()
);


-- ============================================================
-- 4. dreams — 사용자가 기록한 꿈
-- ============================================================
create table if not exists public.dreams (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  content    text not null default '',
  dream_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists dreams_user_id_idx    on public.dreams (user_id);
create index if not exists dreams_dream_date_idx on public.dreams (dream_date desc);


-- ── dreams 메타데이터 컬럼 (보관함 디자인용) ─────────────────
--   source        : 'card' (해몽 카드 기반) | 'ai' (챗봇 기반)
--   dream_item_id : 카드 기반일 때 출처 dream_items.id
--   category_id   : 카테고리 (dream_items snapshot)
--   luck_index    : 길운 지수 0~100 (snapshot)
--   is_warning    : 흉몽 여부
--   emoji         : 카드 emoji (snapshot)
--   mood_tags     : 무드 태그 [{label,emoji,bg,color}]
--   chat_preview  : AI 챗봇 대화 미리보기 [{role,text}]
alter table public.dreams
  add column if not exists source        text    not null default 'card',
  add column if not exists dream_item_id text    references public.dream_items(id) on delete set null,
  add column if not exists category_id   text    references public.categories(id)  on delete set null,
  add column if not exists luck_index    integer not null default 0,
  add column if not exists is_warning    boolean not null default false,
  add column if not exists emoji         text    not null default '',
  add column if not exists mood_tags     jsonb   not null default '[]'::jsonb,
  add column if not exists chat_preview  jsonb   not null default '[]'::jsonb;

alter table public.dreams drop constraint if exists dreams_source_check;
alter table public.dreams
  add constraint dreams_source_check check (source in ('card', 'ai'));

create index if not exists dreams_source_idx        on public.dreams (source);
create index if not exists dreams_dream_item_id_idx on public.dreams (dream_item_id);
create index if not exists dreams_created_at_idx    on public.dreams (created_at desc);


-- ============================================================
-- 5. bookmarks — dream_items 북마크
-- ============================================================
create table if not exists public.bookmarks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  dream_item_id text not null references public.dream_items(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (user_id, dream_item_id)
);

create index if not exists bookmarks_user_id_idx       on public.bookmarks (user_id);
create index if not exists bookmarks_dream_item_id_idx on public.bookmarks (dream_item_id);


-- ============================================================
-- 권한 부여 (GRANT)
--   SQL Editor 로 직접 만든 테이블은 자동 grant 가 걸리지 않아
--   "permission denied for table ..." 에러가 발생합니다.
--   RLS 는 권한이 있는 역할에 대해 행 단위 제한만 걸 뿐이므로
--   먼저 GRANT 로 테이블 접근 권한을 열어줘야 합니다.
-- ============================================================
grant usage on schema public to anon, authenticated;

grant select on public.categories  to anon, authenticated;
grant select on public.dream_items to anon, authenticated;

grant select, insert, update, delete on public.dreams    to authenticated;
grant select, insert, update          on public.profiles to authenticated;
grant select, insert, delete          on public.bookmarks to authenticated;


-- ============================================================
-- RLS 활성화
-- ============================================================
alter table public.categories  enable row level security;
alter table public.dream_items enable row level security;
alter table public.profiles    enable row level security;
alter table public.dreams      enable row level security;
alter table public.bookmarks   enable row level security;


-- ============================================================
-- RLS 정책
-- ============================================================

-- ───── categories: 인증된 누구나 읽기 ─────
drop policy if exists "categories_select_authenticated" on public.categories;
create policy "categories_select_authenticated"
  on public.categories
  for select
  to authenticated
  using (true);


-- ───── dream_items: 인증된 누구나 읽기 ─────
drop policy if exists "dream_items_select_authenticated" on public.dream_items;
create policy "dream_items_select_authenticated"
  on public.dream_items
  for select
  to authenticated
  using (true);


-- ───── profiles: 본인 row 만 읽기/쓰기 ─────
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = uid);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = uid);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = uid)
  with check (auth.uid() = uid);


-- ───── dreams: 본인 데이터만 ─────
drop policy if exists "dreams_select_own" on public.dreams;
create policy "dreams_select_own"
  on public.dreams
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "dreams_insert_own" on public.dreams;
create policy "dreams_insert_own"
  on public.dreams
  for insert
  to authenticated
  with check (auth.uid() = user_id);

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


-- ───── bookmarks: 본인 데이터만 ─────
drop policy if exists "bookmarks_select_own" on public.bookmarks;
create policy "bookmarks_select_own"
  on public.bookmarks
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "bookmarks_insert_own" on public.bookmarks;
create policy "bookmarks_insert_own"
  on public.bookmarks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "bookmarks_delete_own" on public.bookmarks;
create policy "bookmarks_delete_own"
  on public.bookmarks
  for delete
  to authenticated
  using (auth.uid() = user_id);


-- ============================================================
-- 트리거: 회원가입 시 profiles 자동 생성
--   raw_user_meta_data.nickname 을 가져와 채움 (없으면 '몽글이')
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
    coalesce(new.raw_user_meta_data->>'nickname', '몽글이')
  )
  on conflict (uid) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ============================================================
-- Seed: categories (dreamData.ts 와 동기화)
-- ============================================================
insert into public.categories (id, label, emoji, bg) values
  ('animal',    '동물',     '🐷', '#FFEEDF'),
  ('nature',    '자연/현상', '☀️', '#FFF7D8'),
  ('people',    '인물',     '👥', '#DEE8FD'),
  ('daily',     '생활/행동', '🏠', '#DEEFE3'),
  ('lucky',     '길몽',     '🍀', '#FDF1D0'),
  ('unlucky',   '흉몽',     '⚠️', '#FBDDD5'),
  ('pregnancy', '태몽',     '🌸', '#FBE3EC'),
  ('body',      '신체/건강', '💫', '#EBDAF7'),
  ('mystic',    '신비/영적', '🌀', '#D8E0F8')
on conflict (id) do update
  set label = excluded.label,
      emoji = excluded.emoji,
      bg    = excluded.bg;


-- ============================================================
-- Seed: dream_items (dreamData.ts 와 동기화)
-- ============================================================
insert into public.dream_items (
  id, category_id, title, preview, description, emoji,
  tags, keywords, bookmark_count, luck_index, is_warning, mood_tags
) values
  (
    '1', 'animal',
    '돼지가 방 안으로 들어와 뒹구는 꿈',
    '꿈에서 돼지를 봤으면 집안에 재물이 들어올 징조...',
    E'돼지가 집 안으로 들어오는 꿈은 큰 재물운이 들어올 징조예요.\n오랫동안 기다려온 일이 풀리거나, 예상치 못한 곳에서 좋은 소식이 들려올 수 있어요.',
    '🐷',
    array['길몽'], array['돼지'],
    5, 88, false,
    '[
      {"label":"재물","emoji":"💰","bg":"#FFF8E0","color":"#B08020"},
      {"label":"행운","emoji":"🍀","bg":"#FFF0E8","color":"#C06030"}
    ]'::jsonb
  ),
  (
    '2', 'animal',
    '숲에서 흰 뱀을 만나는 꿈',
    '흰 뱀은 귀인을 만날 징조예요...',
    E'흰 뱀을 만나는 꿈은 귀인을 만날 징조예요.\n중요한 인연이 찾아오거나, 막혔던 일이 술술 풀릴 수 있어요.',
    '🐍',
    array['길몽'], array['뱀'],
    38, 75, false,
    '[
      {"label":"귀인","emoji":"😊","bg":"#FFF8E0","color":"#B08020"},
      {"label":"행운","emoji":"🍀","bg":"#FFF0E8","color":"#C06030"}
    ]'::jsonb
  ),
  (
    '3', 'animal',
    '검은 뱀에게 쫓기는 꿈',
    '주변과의 갈등을 조심해야 할 신호...',
    E'검은 뱀에게 쫓기는 꿈은 주변 사람과의 갈등이나 작은 다툼을 조심해야 한다는 신호예요.\n오늘은 말을 아끼고 한 박자 천천히 움직여보세요.',
    '🐍',
    array['흉몽'], array['뱀'],
    12, 28, true,
    '[
      {"label":"주의","emoji":"⚠️","bg":"#FFE8E0","color":"#C04030"}
    ]'::jsonb
  ),
  (
    '4', 'animal',
    '호랑이가 산에서 내려오는 꿈',
    '큰 권위와 명예를 얻을 징조...',
    E'호랑이가 산에서 내려오는 꿈은 큰 권위와 명예를 얻을 징조예요.\n중요한 자리에서 인정받거나, 새로운 기회가 열릴 수 있어요.',
    '🐯',
    array['길몽'], array['호랑이'],
    22, 92, false,
    '[
      {"label":"명예","emoji":"🌟","bg":"#FFF8E0","color":"#B08020"}
    ]'::jsonb
  ),
  (
    '5', 'animal',
    '강아지와 함께 산책하는 꿈',
    '다정한 인연이 찾아올 징조...',
    E'강아지와 함께 걷는 꿈은 따뜻한 인연이 찾아올 징조예요.\n친구나 가족과의 관계가 한층 더 깊어지는 시기예요.',
    '🐶',
    array['길몽'], array['강아지'],
    7, 70, false,
    '[
      {"label":"인연","emoji":"💛","bg":"#FFF8E0","color":"#B08020"}
    ]'::jsonb
  ),
  (
    '6', 'animal',
    '고양이가 무릎 위로 올라오는 꿈',
    '마음의 위안을 얻는 꿈이에요...',
    E'고양이가 다가와 무릎에 앉는 꿈은 마음의 평화와 작은 위안을 의미해요.\n바쁜 일상 속에서도 잠시 쉬어가는 시간을 가져보세요.',
    '🐱',
    array['길몽'], array['고양이'],
    15, 65, false,
    '[
      {"label":"평온","emoji":"🕊","bg":"#E8F0FF","color":"#3050A0"}
    ]'::jsonb
  )
on conflict (id) do update
  set category_id    = excluded.category_id,
      title          = excluded.title,
      preview        = excluded.preview,
      description    = excluded.description,
      emoji          = excluded.emoji,
      tags           = excluded.tags,
      keywords       = excluded.keywords,
      bookmark_count = excluded.bookmark_count,
      luck_index     = excluded.luck_index,
      is_warning     = excluded.is_warning,
      mood_tags      = excluded.mood_tags;
