# 몽글 (Mongle) — 프로젝트 진행 상황

> 2026-08-05 기준. 꿈해몽 + 운세 + AI 챗봇 모바일 앱.
> (스토어 포지셔닝은 꿈해몽 우선 — `STORE_LISTING.md §1` 참고.)
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

### 2.7 DB 마이그레이션 (15개)
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
0011 dream_items 해·달 시드
0012 dream_items 인물 시드
0013 ai_message_reports (Play 생성형 AI 정책)
0014 dream_items 시드 270건
0015 delete_my_account — 아바타 Storage 정리   ← 프로덕션 미적용
```

### 2.8 안드로이드 배포 준비 (2026-06-23)
- **빌드 설정 점검 완료** — 패키지명(`com.mongle.app`), 버전(`1.0.0` + EAS
  `appVersionSource: remote` + `autoIncrement`), 적응형 아이콘 / 스플래시,
  권한 최소화, EAS production env 주입 모두 확인.
- **약관/정책 페이지** — `app/privacy.tsx`(기존) + `app/terms.tsx`(신규, 14개
  조항). 마이페이지 푸터 · 설정 "약관 및 정책" 섹션에 두 링크 모두 연결.
  공개 URL: `/privacy`, `/terms` (Vercel).
- **개발용 우회 로그인** — `__DEV__` 가드로 프로덕션 빌드 제외 확인.
- **Supabase Anonymous Sign-ins OFF** — 백엔드 토글까지 막아 익명 세션 생성
  차단 (보안 이슈 해결).
- **카카오 로그인 운영 전환 완료**
  - 개인 개발자 자격 **비즈 앱 전환** 완료 (사업자 정식 등록은 미진행 — 현 단계엔
    개인 개발자 비즈로 충분)
  - 동의항목 활성화: 닉네임 · 프로필사진 · 카카오계정(이메일) 전부 필수 동의
  - Supabase Auth Kakao Provider REST API 키 + Callback URL 정상 연동 확인
  - **Supabase OAuth 방식** 사용 (네이티브 카카오 SDK 미사용) → 카카오 플랫폼
    등록 불필요

---

## 3. 진행 중 / 유보

- **iOS 앱스토어 배포** — 디자인/수정 마무리 후 공식 출시 예정 (메모리 노트:
  [[ios-appstore-deploy-deferred]])
- **애플 로그인** — `APPLE_LOGIN_ENABLED=false` 로 비활성. 코드는 완성, Apple
  Developer 계정 + Supabase Apple provider 설정 끝나면 플래그만 켜면 됨.
  iOS 출시 시 동반 필요 (Guideline 4.8).
- **D-U-N-S 번호 발급 완료** (2026-07-01) — D&B Apple 경로 신청(2026-06-23) →
  발급됨. 이 번호로 Google Play 조직 계정 가입·검증까지 완료 (§4.1.1 🟢 참고).
- **수익화 게이트** — `DetailUnlockCard` 가 "곧 만나요" 안내만 노출 (광고/결제
  SDK 도입 전까지 잠금 유지). 사업자 등록 후 AdMob/RevenueCat 붙일 때 복구.

---

## 4. 해야 할 작업

### 4.1 안드로이드 출시 — 완료 (2026-06-23)
- [x] 빌드 설정 점검 (패키지명 / 버전 / 아이콘 / 스플래시 / 권한 / EAS env)
- [x] 개인정보처리방침 + 이용약관 페이지 (`/privacy`, `/terms`) + 인앱 링크
- [x] 개발용 우회 로그인 `__DEV__` 가드 (프로덕션 빌드 제외)
- [x] Supabase Authentication → **Anonymous Sign-ins 토글 off**
- [x] 카카오 비즈 앱 전환 (개인 개발자 비즈) + 동의항목 + Supabase 연동 확인

### 4.1.1 안드로이드 출시 — 다음 작업

**🔴 우선순위 1 — 스토어 등록물 (자산 제작 완료, 콘솔 입력만 남음)**
- [x] Play Store 폰 스크린샷 6장 → `assets/store/screenshots/` (1080×2021)
  - 태블릿 스크린샷은 세로 전용(`supportsTablet: false`)이라 미제작 — 선택 항목
- [x] 앱 설명 (짧은 80자 / 자세한 4000자) → `STORE_LISTING.md §1`
- [x] 앱 아이콘 512×512 → `assets/store/play-icon-512.png`
- [x] 그래픽 이미지 1024×500 → `assets/store/play-feature-1024x500.png`

**🟡 우선순위 2 — 정책 양식 (콘솔 입력용 답변 준비 완료)**
- [x] Google Play "데이터 안전" 양식 답변 정리 → `STORE_LISTING.md §2`
  (코드 검증 기반 — 위치·광고·분석 미수집 확인, Gemini=처리위탁이라 공유 아니요)
- [x] 콘텐츠 등급 설문 답변 준비 → `STORE_LISTING.md §3`
- [x] **⚠️ 생성형 AI 신고 기능** — AI 응답 버블에 "신고" → 확인 →
  `ai_message_reports` 저장 (Google Play AI 콘텐츠 정책 대응). 코드 완료.
  - [x] Supabase에 `0013_ai_message_reports.sql` 적용 완료 — 테이블·컬럼 존재,
    RLS 동작 확인(익명 insert 차단 42501)
  - [ ] 콘솔 심사 설문에서 "생성형 AI 기능 포함"에 **예** + 신고 수단 설명
  - 상세: `STORE_LISTING.md §3.3`
- [x] 인앱 정보 페이지 — `/about`(서비스 소개), `/guide`(이용 안내),
  `/business`(사업자 정보 + 문의) 작성 + 마이페이지 푸터·설정 링크 연결
  - 사업자 정보(`business.tsx`): 의무 없는 항목(전화번호·통신판매업 신고번호)
    제거, "통신판매 행위 없어 신고 대상 아님" 면제 안내 추가

**🟠 우선순위 3 — 스토어 포지셔닝 재정비 (2026-08-05)**
- [x] 꿈해몽 중심으로 재포지셔닝 — 앱 이름 `몽글 - 꿈해몽`, 짧은/자세한 설명
      전면 교체, 스크린샷 업로드 순서를 꿈 우선으로 재배치 (`STORE_LISTING.md §1`)
  - 초안에 있던 **포춘쿠키(미구현 기능) 제거**, 누락됐던 꿈해몽 검색·보관함 추가
- [x] 앱 콘텐츠 페이지 항목별 답변 정리 (`STORE_LISTING.md §5`)
- [x] 개인정보처리방침 URL 접속 검증 — `/privacy` 로그인 없이 12개 조항 노출
- [x] **계정 삭제 안내 페이지** `app/account-deletion.tsx` — Play 필수 요건
      (계정 생성 기능이 있는 앱은 웹 삭제 요청 경로 제공 의무)
- [x] `delete_my_account()` 가 Storage 아바타를 안 지우던 문제 수정 (0015)
- [x] **런처 이름** `app.json` `expo.name`: `mongle` → `몽글` (2026-08-05).
      `slug` 는 EAS 프로젝트 식별자라 `mongle` 유지.
      → **versionCode 8 재빌드 필요** (7번 AAB 는 아직 `mongle` 라벨)
- [ ] 피처 그래픽 카피가 구 포지셔닝(`매일의 운세와 꿈 해몽`) — 교체 보류 중

**🟢 출시 절차**
- [x] Google Play Console 조직 계정 가입 ($25) — 계정 활성화 확인
- [x] Google 조직 검증 완료
- [x] 앱 콘솔 등록 (`com.mongle.app`) — 현재 **임시(초안)** 상태
- [x] 프로덕션 AAB 빌드 (2026-07-29, versionCode 7 / `f2c99c4`) — §6.1 참고
- [ ] **0015 마이그레이션 프로덕션 적용** — 미적용 시 계정 삭제 안내와 실제
      동작이 불일치 (Supabase 대시보드 SQL Editor 에 파일 내용 붙여넣기)
- [ ] **심사용 카카오 테스트 계정** 발급 → 콘솔 앱 액세스 권한에 입력.
      카카오 디벨로퍼스에서 팀원 외 계정 로그인 가능 상태인지 먼저 확인
      (`STORE_LISTING.md §5.1`)
- [ ] AAB 를 Play Console 에 **수동 업로드** (1차 릴리스는 `eas submit` 미사용)
- [ ] 콘솔 폼 입력 — 스토어 등록정보 / 데이터 안전 / 콘텐츠 등급 / 생성형 AI 설문
      (답변은 `STORE_LISTING.md` §1~§3, §5 에 준비됨)
- [ ] 프로덕션 트랙 신청 (조직 계정 → 12명 20일 비공개 테스트 의무 면제)
- [ ] Google 앱 심사 (1~7일)

### 4.1.2 iOS 출시 전 필수 (안드로이드 이후)
- [ ] iOS 빌드 / TestFlight / 심사 제출
- [ ] 애플 로그인 재활성화 (Sign in with Apple 심사 요건)
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
- **카카오 = 개인 개발자 비즈로 출시**. 현 단계엔 사업자 정식 등록 없이 충분.
  사업자 정보 카카오 디벨로퍼스 정식 등록은 출시 후 작업으로 보류.

---

## 6. 배포 레퍼런스 (출시 작업용 메모)

- **카카오 디벨로퍼스 App ID**: `1461546`
- **Supabase Project URL**: `bpotmmtfheqjrvlwdugz.supabase.co`
- **사업자등록번호**: `213-07-26662`
- **영문 상호**: Mongle
- **사업장 주소**: 301, 5-2 Gaebong-ro 6-gil, Guro-gu, Seoul, 08334
- **D-U-N-S**: D&B Apple 경로 신청(2026-06-23) → **발급 완료(2026-07-01)**
  (Sole Proprietorship)
- **EAS 프로젝트**: `jieun0/mongle` (`76bbf748-44bf-4f6f-81d3-3c59602f1320`)

### 6.1 릴리스 빌드 이력

버전 관리는 EAS 원격 소스(`appVersionSource: "remote"` + production
`autoIncrement: true`). `app.json` 에 `android.versionCode` 를 두면 충돌하므로
**넣지 않는다**. 빌드가 취소돼도 번호는 소비된다(6번이 그렇게 날아감).

| versionCode | 커밋 | 날짜 | 상태 |
|---|---|---|---|
| 5 | `e116d50` | 2026-07-14 | FINISHED — Play 업로드 안 함 |
| 6 | `4758059` | 2026-07-15 | CANCELED (번호만 소비) |
| **7** | **`f2c99c4`** | **2026-07-29** | **1차 릴리스 후보** — `e116d50` 이후 19개 커밋 반영 |

versionCode 7 에 새로 들어간 것: 위치 기반 날씨 연출(비/눈), 검색·보관함 프리페치
성능 개선, 챗봇 문단 요약 + 전체 해석 펼치기, 스플래시 단축(1550→1100ms),
검색 카테고리 3열 복구, 개인정보 고지 정정, Play 스토어 자산.

### 6.2 Play 서비스 계정 키 발급 (2차 릴리스부터)

1차 릴리스를 수동 업로드해 앱이 정식 등록된 뒤에 진행한다.

1. Play Console > 설정 > **API 액세스** — Google Cloud 프로젝트 연결
2. 서비스 계정 생성 → Play Console 에서 **릴리스 관리자** 권한 부여
3. Google Cloud Console 에서 해당 계정의 JSON 키 다운로드
4. `secrets/play-service-account.json` 에 저장 (`.gitignore` 처리됨 — 커밋 금지)
5. `eas.json` 의 `submit.production.android` 주석 해제
6. 이후 `eas submit --platform android --profile production` 으로 자동 제출
