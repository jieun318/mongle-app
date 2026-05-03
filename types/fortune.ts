export type FortuneGrade = "대길" | "소길" | "평범" | "조심";

export interface Fortune {
  date: string;
  grade: FortuneGrade;
  gradeTitle: string;
  gradeColor: string;
  gradeBgColor: string;
  gradeIcon: string;
  message: string;
  luckyNumber: string;
  luckyColor: string;
  caution: string;
}
