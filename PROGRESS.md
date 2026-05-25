# 몽글 (Mongle) — 프로젝트 진행 상황

> 2026-05-25 기준. 운세 + 꿈해몽 + AI 챗봇 모바일 앱.
>
> 운세 카테고리 분리 작업의 상세는 [FORTUNE_CATEGORIES.md](./FORTUNE_CATEGORIES.md) 참고.

---

## 0. 프로젝트 개요

- **이름**: mongle-app
- **장르**: 운세 + 꿈해몽 + AI 챗봇 (감성 / 무드 위주)
- **스택**:
  - **앱**: React Native 0.81 + Expo 54 + Expo Router 6
  - **상태/쿼리**: TanStack Query 5
  - **백엔드**: Supabase (Auth / Postgres / Storage / RLS)
  - **AI**: Vercel AI SDK v6 + `@ai-sdk/google` (Gemini)
  - **웹**: 정적 export + Vercel native API route
  - **스타일**: NativeWind 4 + Tailwind 4
- **플랫폼**: iOS / Android / Web (Vercel)

---

## 1. 화면 구조 (현재 작동 중)

```
(auth)/
  └─ login.tsx              # 카카오/애플 소셜 로그인 (애플 임시 비활성화)
(app)/
  ├─ (tabs)/
  │   ├─ index.tsx          # 홈 — 구슬 + 일일 운세 모달 (카테고리 5종)
  │   ├─ search/            # 꿈 해몽 검색 — 카테고리/키워드/결과
  │   ├─ storage/index.tsx  # 보관함 — 카드 해몽 + AI 챗봇 기록
  │   └─ mypage/
  │       ├─ index.tsx      # 마이페이지 — 프로필 + 이번 주 운세 위젯
  │       ├─ fortune-history.tsx  # 지난 운세 보기
  │       ├─ edit.tsx       # 프로필 편집
  │       └─ settings.tsx   # 설정 (로그아웃/탈퇴)
  └─ dream/new.tsx          # 꿈 기록 작성/편집
```

---

## 2. 완료한 작업 (커밋 흐름 기준)

### 2.1 인프라 / 빌드
- Expo 프로젝트 초기 세팅 (`78803f7`)
- Vercel 웹 익스포트 설정 + 정적 + API route (`e65029a`, `e387bd5`, `c72ad18`)
- react-native-web SSR 가드, `.npmrc legacy-peer-deps` (`92d68b9`, `c79ef23`)
- `cleanUrls` 로 `/login` 같은 top-level 라우트 정상화 (`19155db`)
- AI SDK v6 마이그레이션 (`CoreMessage` → `ModelMessage`) (`bae85b8`)

### 2.2 인증
- Supabase 이메일 가입/로그인 + 회원가입 중복 이메일 인라인 에러
- 카카오/애플 네이티브 소셜 로그인 (`21d59d6`, `278adc7`)
- 애플 로그인 임시 비활성화 (`APPLE_LOGIN_ENABLED` 플래그, `f11e4c1`)
- 로그인 화면 소셜 전용으로 단순화 (`b9e4b7f`)
- 로그아웃/탈퇴 인앱 `ConfirmDialog` (`a6a9279`)
- 개발용 우회 로그인 (`3ce08c6`)

### 2.3 운세 (구슬)
- 데일리 운세 + (tabs) 구조 + 챗봇/공지/알림 일괄 (`fa45636`)
- 운세 저장 시점/RLS 정리 — 구슬 탭 시점에만 DB 저장 (`3ce08c6`)
- **카테고리 분리 + 수익화 진입 자리** (2026-05-22)
  - 카테고리 5종(연애·직장·금전·건강·대인) × 점수 1~5
  - 시드 분리(종합/럭키/카테고리 독립)
  - **게이트 패턴**: 무료 모달은 가볍게(종합 + 행운 + 팁), 카테고리 5장은
    "오늘의 자세히 보기" 1개 게이트 뒤로 — 광고 시청 또는 프리미엄 가입으로 해제
  - `useEntitlement` 훅, `CategoryCard`, `DetailUnlockCard`, `AdSlot` 스텁
  - 상세: [FORTUNE_CATEGORIES.md](./FORTUNE_CATEGORIES.md)

### 2.4 꿈 해몽
- 해몽 DB 연동 + search/mypage/storage 화면 구현 + 디자인 (`f7e51dc`)
- 꿈 기록 CRUD, 해몽 시드 데이터, 프로필 스키마 (`429acd7`)
- 해몽 요약 컬럼 추가 (`0009_dreams_interpretation_summary.sql`)
- `dream_items` public read 정책 (`0010`)

### 2.5 AI 챗봇
- `/api/chat` CORS + OPTIONS preflight (`00a38f0`)
- `streamText onError` 로 실제 원인 노출 (`98faec0`)
- 401 detail / 스트림 일반 에러 원인 노출 제거 — 운영 응답은 제네릭 메시지,
  진단은 서버 콘솔 로그로만 남김.
- (Gemini 기반, Vercel API route)

### 2.6 마이페이지 / 부수
- 프로필 편집 — 아바타 업로드 (Supabase Storage signed URL)
- 설정 화면 — 알림 토글, 로그아웃, 탈퇴 (`delete_my_account` RPC)
- iPhone XR 헤더 위치 보정 (`57831f9`, `644b5f4`)
- 공지 시스템 (`0008_notices.sql`)

### 2.7 DB 마이그레이션 (10개)
```
0001 dream_items 크롤링 컬럼
0002 dream_items is_lucky
0003 profiles avatar / notify
0004 delete_my_account RPC
0005 avatars storage bucket
0006 dreams update/delete 정책
0007 daily_fortunes
0008 notices
0009 dreams interpretation_summary
0010 dream_items public read
```

---

## 3. 진행 중 / 유보

- **iOS 앱스토어 배포** — 디자인/수정 마무리 후 공식 출시 예정 (메모리 노트:
  [[ios-appstore-deploy-deferred]])
- **애플 로그인** — `APPLE_LOGIN_ENABLED=false` 로 비활성. 코드는 완성, Apple
  Developer 계정 + Supabase Apple provider 설정 끝나면 플래그만 켜면 됨.
  iOS 출시 시 동반 필요 (Guideline 4.8).
- **카카오 로그인** — 개발 키로 운영 중 → 운영 키 / 심사 단계 필요.
- **수익화 게이트** — `DetailUnlockCard` 가 "곧 만나요" 안내만 노출 (광고/결제
  SDK 도입 전까지 잠금 유지). 사업자 등록 후 AdMob/RevenueCat 붙일 때 복구.

---

## 4. 해야 할 작업

### 4.1 출시 전 필수
- [ ] iOS 빌드 / TestFlight / 심사 제출
- [ ] 카카오 운영 키 발급 + 비즈니스 채널 심사
- [ ] 애플 로그인 재활성화 (Sign in with Apple 심사 요건)
- [ ] Supabase Dashboard → Authentication → **Anonymous Sign-ins 토글 off**
  확인 (개발용 우회 로그인이 백엔드 토글로도 막혀있어야 안전)
- [ ] 개인정보 처리방침 / 이용약관 페이지 (스토어 등록 시 필수)
- [ ] 앱 아이콘 / 스플래시 최종본 / 스토어 스크린샷

> 로컬 알림(아침 운세/꿈 리마인더)은 `lib/notifications.ts` 에 구현 완료.
> 원격 푸시(Expo push token + 서버 발송)는 출시 후 리텐션 작업에서 추가.

### 4.2 수익화 (오늘 진입 자리만 깔음)
- [ ] **RevenueCat** 또는 react-native-iap 로 구독 결제 연동
- [ ] Supabase `user_entitlements` 테이블 + 서버 검증
- [ ] **AdMob** banner + rewarded ad 연동 (`AdSlot` / `unlockCategory`)
- [ ] 프리미엄 결제 화면 (`app/(app)/premium.tsx`)
- [ ] iOS ATT 권한 요청 다이얼로그
- 상세: [FORTUNE_CATEGORIES.md §3](./FORTUNE_CATEGORIES.md)

### 4.3 기능 확장
- [ ] 마이페이지 "이번 주 운세" 에 카테고리 점수 시각화
- [ ] `fortune-history` 카드에 카테고리 요약
- [ ] 원격 푸시 알림 (Expo push token 발급/저장 + 서버 발송)
- [ ] 꿈 해몽 결과 공유 (이미지/링크)
- [ ] 챗봇 대화 이력 저장 / 재개

### 4.4 콘텐츠 / 운영
- [ ] 카테고리 메시지·팁 풀 확장 (현재 카테고리·점수당 7개 → 15~20개)
- [ ] 시즌/명절/생일 특별 메시지 풀
- [ ] 카테고리 등급 가이드 (`FortuneGradeGuide` 의 카테고리 버전)
- [ ] 해몽 데이터 보강 / 정리

### 4.5 기술 부채
- [ ] `ChatBotModal` 의 `ExpoGoConfig.hostUri` 타입 에러 정리
- [ ] `next-components/*.module.css` 타입 선언 추가
- [ ] 웹 빌드와 네이티브 빌드 분기 정리 (`next-components` 와 `components` 중복 검토)
- [ ] 테스트 한 줄도 없음 — 핵심 도메인(시드 결정성, RLS) 최소한이라도

---

## 5. 의사 결정 메모

- **운세 생성은 LLM 호출 없이 시드 기반 유지** (런타임 비용 0, 오프라인 동작).
  콘텐츠 다양성은 풀 확장으로 해결.
- **카테고리 = 게이트 1개로 묶인 수익화 자리**. 무료 모달은 종합 메시지 + 행운 +
  팁만 노출해 가볍게 유지. 카테고리 5장은 "오늘의 자세히 보기" 게이트 뒤로
  → 광고 1회 시청(오늘 한정) 또는 프리미엄 가입(매일 자동)으로 5장 동시 해제.
  카드별 개별 잠금은 모달이 무거워 보이고 결제 가치도 흐려져서 폐기.
- **운세 DB 저장은 사용자가 구슬을 처음 탭한 순간에만** — 마운트 시점에 저장하면
  mypage 위젯이 본 적 없는 운세를 표시하는 문제가 있었다.
- **시드 ID 우선순위**: `auth.user.id` > `deviceId`. 같은 계정이면 기기 바뀌어도
  동일 운세.
