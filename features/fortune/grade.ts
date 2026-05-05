// luck_index → 운세 등급 매핑
//   - 마이페이지 주간 캘린더: 3단계 (대길/평범/조심)
//   - 지난 운세 카드: 4단계 (대길/소길/평범/조심)

export type WeekGrade = "good" | "normal" | "warn" | "none";

export interface WeekGradeInfo {
  key: WeekGrade;
  label: string;
  emoji: string;
  bg: string;
  color: string;
}

const WEEK_GRADE_MAP: Record<WeekGrade, WeekGradeInfo> = {
  good:   { key: "good",   label: "대길", emoji: "☀️", bg: "#FFF8E0", color: "#B07020" },
  normal: { key: "normal", label: "평범", emoji: "🌤", bg: "#EAF1FB", color: "#4068A0" },
  warn:   { key: "warn",   label: "조심", emoji: "⚠️", bg: "#FFE8E0", color: "#C04030" },
  none:   { key: "none",   label: "기록 없음", emoji: "·", bg: "#F4F0FA", color: "#A898D0" },
};

export function gradeFromLuck(luck: number | null | undefined): WeekGradeInfo {
  if (luck === null || luck === undefined || Number.isNaN(luck)) {
    return WEEK_GRADE_MAP.none;
  }
  if (luck >= 70) return WEEK_GRADE_MAP.good;
  if (luck >= 50) return WEEK_GRADE_MAP.normal;
  return WEEK_GRADE_MAP.warn;
}

export type CardGrade = "great" | "good" | "normal" | "warn" | "none";

export interface CardGradeInfo {
  key: CardGrade;
  label: string;
  emoji: string;
  bg: string;
  color: string;
}

const CARD_GRADE_MAP: Record<CardGrade, CardGradeInfo> = {
  great:  { key: "great",  label: "대길", emoji: "☀️",  bg: "#FFF0DC", color: "#B05820" },
  good:   { key: "good",   label: "소길", emoji: "🌤", bg: "#FFF8E0", color: "#B08020" },
  normal: { key: "normal", label: "평범", emoji: "☁️",  bg: "#EAF1FB", color: "#4068A0" },
  warn:   { key: "warn",   label: "조심", emoji: "⚠️", bg: "#FFE8E0", color: "#C04030" },
  none:   { key: "none",   label: "기록 없음", emoji: "·", bg: "#F4F0FA", color: "#A898D0" },
};

export function cardGradeFromLuck(luck: number | null | undefined): CardGradeInfo {
  if (luck === null || luck === undefined || Number.isNaN(luck)) {
    return CARD_GRADE_MAP.none;
  }
  if (luck >= 80) return CARD_GRADE_MAP.great;
  if (luck >= 60) return CARD_GRADE_MAP.good;
  if (luck >= 40) return CARD_GRADE_MAP.normal;
  return CARD_GRADE_MAP.warn;
}
