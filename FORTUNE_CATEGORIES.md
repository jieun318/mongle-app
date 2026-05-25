# 운세 카테고리 분리 + 수익화 진입 자리

> 2026-05-22 작업 메모. 카테고리별 운세 구조로 확장하고 추후 구독·광고 수익화를
> 붙일 수 있는 자리를 미리 깔아둔 작업의 정리.

---

## 1. 배경 / 결정 사항

- **운세 데이터는 LLM 호출 없이 시드 기반 결정론적 생성**을 유지한다 (런타임 비용 0).
- **콘텐츠 풀만 키워서 완성도를 끌어올린다** — 카테고리 5종 × 점수 5단계 × 메시지·팁
  각 7개 = 350개 콘텐츠 + 종합 메시지 풀 확장.
- **수익화 모델 가정** (확정은 아님, 진입 자리만 깔아둠):
  - 무료: 종합 등급 + 종합 메시지 + 행운 + 팁 — 가벼운 모달 유지
  - 잠금: 카테고리 5장 **전체를 게이트 1개**로 묶음 ("오늘의 자세히 보기")
  - 해제: 구독(프리미엄, 매일 자동) 또는 광고 시청(오늘 1회)
- **UX 결정 (2026-05-22 변경)**: 처음엔 카테고리 카드 5장을 모달에 펼쳐서
  각각 잠금/해제하려 했으나 — 모달이 무거워 보이고 결제·광고 가치도 흐려져서,
  **섹션 1개 게이트**로 변경. 무료 모달은 전과 동일한 무드, 카테고리는 명확한
  추가 가치로 포지셔닝.
- **시드 분리**: 종합/카테고리/행운이 각각 독립 sub-seed.
  무료 영역을 손봐도 카테고리 시드에 영향 없음.

---

## 2. 완료한 작업

### 2.1 타입 / 스키마
- `types/fortune.ts`
  - `FortuneCategoryKey = "love" | "work" | "money" | "health" | "social"`
  - `CategoryScore = 1~5`
  - `FortuneCategory = { score, message, tip }`
  - `FortuneLucky = { number, color, item, direction, time }`
  - `Fortune` 에 `categories?`, `lucky?` 추가 (legacy DB row 호환 위해 optional)
  - 기존 `message`/`caution`/`luckyNumber`/`luckyColor` 는 top-level 유지 (하위호환)

### 2.2 콘텐츠 풀 분리
새로 만든 `features/fortune/content/`:
- `overall.ts` — 종합 메시지 등급당 12개 (4 × 12 = 48), 공통 팁 20개
- `categories.ts` — 카테고리 5 × 점수 5 × 메시지·팁 각 7 = 350개
  - `CATEGORY_META` (라벨/아이콘/색)
  - `SCORE_WEIGHTS` (점수 픽 가중치 — 평균 3~4 쪽, 1/5 드물게)
- `lucky.ts` — `LUCKY_COLORS` / `LUCKY_ITEMS` / `LUCKY_DIRECTIONS` / `LUCKY_TIMES`

### 2.3 시드 분리
`features/fortune/dailyFortune.ts`:
- `generateFortune` 을 종합/lucky/카테고리별로 **독립 sub-seed** 로 분리.
  - 종합: `hash("${seedId}::${dKey}")` — 기존 키 유지 → 기존 사용자의 오늘 등급 안 바뀜
  - lucky: `hash("${seedId}::${dKey}::lucky")`
  - 카테고리: `hash("${seedId}::${dKey}::cat::${key}")`
- `backfillFortune` 추가 — legacy DB row (`categories`/`lucky` 없음) 로딩 시
  시드로 즉시 채워서 반환.
- `rollRandomFortune` 도 `generateFortune` 재사용으로 단순화.

### 2.4 수익화 진입 자리
- `features/entitlement/useEntitlement.ts`
  - `{ isPremium, detailUnlockedToday, canSeeDetail, unlockDetailToday }`
  - 현재 `isPremium = false`. 게이트 UX 검증을 위해 잠금 기본.
  - 즉시 해제 테스트는 `DEV_FORCE_PREMIUM = true` 로 토글.
- `components/ads/AdSlot.tsx` — 빈 스텁. AdMob 연동 시 여기만 손보면 됨.

### 2.5 컴포넌트 / UI
- `components/fortune/CategoryCard.tsx` — 카테고리 1장 (별점 + 메시지 + 팁)
- `components/fortune/DetailUnlockCard.tsx` — 잠긴 게이트 카드
  - 광고/결제 SDK 도입 전까지 "곧 만나요 ✨" 안내만 노출 (버튼 비활성).
  - SDK 도입 시 광고 버튼(rewarded ad) + 프리미엄 링크(결제 화면) 재부착.
- `app/(app)/(tabs)/index.tsx` 홈 모달:
  - 종합 메시지 → **게이트 1개 OR 카테고리 5장** → 행운 5항목 → 팁 → AdSlot → 확인
  - `canSeeDetail` 분기로 토글 (잠긴 상태가 기본)
  - 행운은 라벨-값 리스트 (숫자/색/아이템/방향/시간)
  - `LuckyRow` 헬퍼 추가

### 2.6 부수 정리
- `features/fortune/mockFortune.ts` — 새 구조 맞게 갱신 (어디서도 import 안 됨)
- 안 쓰이게 된 모달 스타일 (`luckyRow`/`luckyBox`/`luckyLabel`/`luckyValue`/
  `luckyColorRow`/`colorSwatch`) 제거하고 새 스타일로 대체

### 2.7 타입 체크
- 운세 관련 코드 통과.
- 남은 3개 에러는 본 작업과 무관 (`ChatBotModal` ExpoGoConfig,
  `next-components/*.module.css`).

---

## 3. 해야 할 작업

### 3.1 수익화 SDK 연동 (우선순위 ↑)
- [ ] `useEntitlement` 의 `isPremium` 을 실제 구독 상태로 교체
  - 후보: **RevenueCat** (Apple/Google 통합) — 가장 빠름
  - 또는 react-native-iap 직접 연동 (백엔드 서버 필요)
- [ ] Supabase 에 `user_entitlements` 테이블 추가 (서버 측 검증용)
  - `user_id, plan ('free'|'premium'), expires_at, source ('apple'|'google'|'web')`
- [ ] 구독 결제 화면 (`app/(app)/premium.tsx` 등) 신규

### 3.2 광고 SDK 연동
- [ ] `AdSlot` 안에 AdMob banner 연동 (`react-native-google-mobile-ads`)
  - slot 키별 광고 단위 ID 매핑
- [ ] `DetailUnlockCard` 의 광고 버튼에 AdMob **rewarded ad** 연결
  - 시청 완료 콜백 → `unlockDetailToday()` 호출
- [ ] iOS ATT 권한 처리 (ATT 동의 안 하면 광고 단가 떨어짐)

### 3.3 카테고리 활용 확장
- [ ] mypage 의 "이번 주 운세" 위젯에 카테고리 점수 평균 또는 최고/최저 카테고리 노출
- [ ] `fortune-history.tsx` 카드에 카테고리 별점 요약 추가
- [ ] 종합 등급이 카테고리 평균과 너무 동떨어질 때 보정 로직 검토
  (현재는 완전 독립이라 "대길 + 연애 1" 같은 어색한 조합 가능)

### 3.4 잠금 UI 검증
- [ ] `DEV_FORCE_PREMIUM = true` 로 토글 후 펼친 카테고리 디자인 확인
- [ ] 광고 시청 후 해제되는 **자정 리셋** 동작 정의 (광고 SDK 도입 시)
  - 현재 `DetailUnlockCard` 는 "곧 만나요" 안내만 노출 → 해제 동작 자체가 없음.
  - SDK 도입 시 `detailUnlockedToday` 를 오늘 날짜 키와 함께 AsyncStorage 에
    저장해서 모달 재오픈 시에도 유지되도록 글로벌 상태로 승격 필요.

### 3.5 DB 마이그레이션 (필요 시점에)
- 지금은 불필요 — `daily_fortunes.payload jsonb` 안에 카테고리/lucky 다 들어감.
- 카테고리 점수로 **검색·집계 인덱싱** 이 필요해지는 시점에만:
  ```sql
  alter table daily_fortunes
    add column love_score smallint generated always as ((payload->'categories'->'love'->>'score')::int) stored,
    ...
  ```

### 3.6 콘텐츠 추가 (운영)
- [ ] 카테고리별 메시지 7개 → 15~20개로 확장 (질리지 않게)
- [ ] 절기/명절/생일 등 **시즌 메시지** 풀 추가 검토
- [ ] 카테고리 등급 안내 가이드 (`FortuneGradeGuide` 의 카테고리 버전)

---

## 4. 파일 맵 (이 작업의 핵심)

```
types/fortune.ts                            # 타입 (카테고리/럭키 추가)
features/fortune/
  ├─ dailyFortune.ts                        # 시드 분리 + backfill
  ├─ mockFortune.ts                         # 새 구조 맞게 갱신
  └─ content/
       ├─ overall.ts                        # 종합 메시지/팁
       ├─ categories.ts                     # 카테고리별 메시지/팁 + meta
       └─ lucky.ts                          # 럭키 아이템 풀
features/entitlement/
  └─ useEntitlement.ts                      # 수익화 진입 훅 (현재 no-op)
components/fortune/CategoryCard.tsx         # 카테고리 1장 (잠금 지원)
components/ads/AdSlot.tsx                   # 광고 자리 (현재 빈 스텁)
app/(app)/(tabs)/index.tsx                  # 홈 모달 재구성
```

---

## 5. 운영 노트

- **시드 안정성**: 시드 ID 는 로그인 시 `auth.user.id`, 비로그인 시 `deviceId`.
  로그인 전후로 같은 날짜의 운세가 바뀔 수 있다 (의도된 동작).
- **DB 저장 시점**: 사용자가 홈 화면 구슬을 처음 탭한 순간 (`commitDailyFortuneToDB`).
  단순 마운트로는 저장 안 됨 → mypage 의 "이번 주 운세" 에 반영 안 됨.
- **legacy row 처리**: `backfillFortune` 이 로딩 시 카테고리/럭키 자동 채움.
  DB 마이그레이션 없이 호환됨.
