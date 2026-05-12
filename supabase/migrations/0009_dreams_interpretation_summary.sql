-- ============================================================
-- 0009_dreams_interpretation_summary
--   AI 챗봇 기반 꿈 기록에 별도의 "해몽 요약" 필드를 보관한다.
--   - chat_preview 는 사용자/AI 대화 그대로의 미리보기
--   - interpretation_summary 는 AI 가 추출한 해몽 본문 2~3문장 (공감/질문 제외)
--   - 카드 리스트 서브텍스트와 상세 페이지 "해몽 요약" 카드가 이 필드를 사용.
-- 멱등성: 여러 번 실행해도 안전합니다.
-- ============================================================

alter table public.dreams
  add column if not exists interpretation_summary text not null default '';
