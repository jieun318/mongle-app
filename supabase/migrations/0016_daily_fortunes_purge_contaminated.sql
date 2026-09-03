-- 계정별 운세 오염 행 정리
--
-- 배경: dailyFortune 의 AsyncStorage 캐시("dailyFortune")가 날짜만 비교해,
-- 한 기기에서 계정을 바꾸면 이전 계정의 운세가 화면에 뜨고 구슬을 탭한 순간
-- commitDailyFortuneToDB 가 그 payload 를 새 계정 user_id 로 저장했다.
-- (캐시는 seedId 검증으로, 저장은 commitDailyFortuneToDB 의 소유자 검증으로 차단됨)
--  
-- 삭제 범위를 "오늘(KST) 이후"로 제한하는 이유:
-- getDailyFortune 은 오늘 날짜만 다루므로 과거 행은 재생성 경로가 없다.
-- 과거 행을 지우면 mypage 의 주간/지난 운세에서 그날이 영구히 사라진다.
-- (오염은 다계정 사용 기기에만 발생 — 대다수 단일 계정 이력은 정상)
--
-- current_date 를 그냥 쓰면 서버 UTC 기준이라 KST 오늘과 어긋난다
-- (KST 오전 9시 이전에는 UTC 로 아직 어제).
delete from public.daily_fortunes
where date >= (now() at time zone 'Asia/Seoul')::date;
