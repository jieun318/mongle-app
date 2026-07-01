-- ============================================================
-- ai_message_reports — AI 챗봇 응답 신고
--   Google Play 생성형 AI 콘텐츠 정책: AI 가 생성한 콘텐츠를
--   사용자가 앱 내에서 신고할 수 있는 수단을 제공해야 한다.
--   - 본인 신고만 insert / select (RLS)
--   - 운영자는 service role 로 검토
-- 멱등성: 여러 번 실행해도 안전합니다.
-- ============================================================
create table if not exists public.ai_message_reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  message    text not null,                       -- 신고된 AI 응답 본문
  context    jsonb not null default '[]'::jsonb,  -- 직전 대화 맥락(선택)
  reason     text,                                -- 신고 사유(선택, 향후 확장)
  created_at timestamptz not null default now()
);

create index if not exists ai_message_reports_user_id_idx
  on public.ai_message_reports (user_id, created_at desc);

grant select, insert on public.ai_message_reports to authenticated;

alter table public.ai_message_reports enable row level security;

drop policy if exists "ai_message_reports_insert_own" on public.ai_message_reports;
create policy "ai_message_reports_insert_own"
  on public.ai_message_reports
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "ai_message_reports_select_own" on public.ai_message_reports;
create policy "ai_message_reports_select_own"
  on public.ai_message_reports
  for select
  to authenticated
  using (auth.uid() = user_id);
