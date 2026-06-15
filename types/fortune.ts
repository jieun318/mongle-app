export type FortuneGrade = "대길" | "소길" | "평범" | "조심";

// 럭키 색·종합 팁 선택용 mood 그룹핑 (등급 4단계 → mood 3단계).
export type MoodType = "good" | "normal" | "caution";

// 카테고리 점수 1(매우 나쁨) ~ 5(매우 좋음).
// 카테고리는 종합 등급과 독립적으로 시드된다 — 종합이 "대길"이어도 특정 카테고리는 1이 나올 수 있다.
export type CategoryScore = 1 | 2 | 3 | 4 | 5;

export type FortuneCategoryKey =
  | "love"   // 연애운
  | "work"   // 직장/학업운
  | "money"  // 금전운
  | "health" // 건강운
  | "social"; // 대인관계운

export interface FortuneCategory {
  score: CategoryScore;
  message: string;
  tip: string;
}

export interface FortuneLucky {
  number: string;     // "7" or "7, 14"
  color: string;      // "라벤더"
  item: string;       // "동전", "손수건" 등 — 휴대 추천
  direction: string;  // "동쪽", "남쪽" 등
  time: string;       // "오전 10시", "저녁 무렵" 등
}

export interface Fortune {
  date: string;
  grade: FortuneGrade;
  gradeTitle: string;
  gradeColor: string;
  gradeBgColor: string;
  gradeIcon: string;

  // 종합 (무료 영역)
  message: string;  // 종합 메시지 — overall.message 와 동일, 하위호환을 위해 top-level 유지
  caution: string;  // 오늘의 팁 — overall.caution 과 동일, 하위호환을 위해 top-level 유지

  // 행운 아이템 (무료 영역, 광고 hook 자리)
  luckyNumber: string;  // hasta 하위호환 (= lucky.number)
  luckyColor: string;   // 하위호환 (= lucky.color)
  lucky?: FortuneLucky; // 신규 — 기존 row 에는 없을 수 있어 optional

  // 카테고리별 상세 (유료/광고 잠금 대상)
  // legacy DB row 와의 호환을 위해 optional. 없으면 시드로 즉시 재생성한다.
  categories?: Record<FortuneCategoryKey, FortuneCategory>;
}
