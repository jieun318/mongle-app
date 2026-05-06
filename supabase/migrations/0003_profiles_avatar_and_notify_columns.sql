-- ============================================================
-- profiles: 아바타 이모지 + 알림 설정 컬럼 추가
--   - avatar_emoji          : 프로필 사진이 없을 때 폴백으로 보여줄 이모지
--                             (features/auth/profile.ts AVATAR_OPTIONS 참조)
--   - notify_enabled        : 푸시 알림 전체 on/off
--   - notify_dream_reminder : '오늘 꿈 기록' 리마인더 on/off
-- 멱등성: 여러 번 실행해도 안전합니다.
-- ============================================================

alter table public.profiles
  add column if not exists avatar_emoji          text    not null default '🐷',
  add column if not exists notify_enabled        boolean not null default true,
  add column if not exists notify_dream_reminder boolean not null default true;
