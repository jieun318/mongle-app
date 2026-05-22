import { Fortune } from "@/types/fortune";

export const mockFortune: Fortune = {
  date: "",
  grade: "소길",
  gradeTitle: "좋은 날",
  gradeColor: "#166534",
  gradeBgColor: "#DCFCE7",
  gradeIcon: "🌿",
  message:
    "오늘은 뜻밖의 인연이 찾아올 거예요.\n마음을 열고 새로운 만남을 받아들여 보세요.",
  caution: "성급한 판단은 금물!\n결정을 서두르기보다 한 번 더 생각해보세요",
  luckyNumber: "7, 14",
  luckyColor: "빨강",
  lucky: {
    number: "7, 14",
    color: "빨강",
    item: "동전",
    direction: "동쪽",
    time: "오전 10시 무렵",
  },
  categories: {
    love:   { score: 4, message: "작은 다정함이 마음에 오래 남는 하루예요.", tip: "안부 문자 한 통을 보내보세요" },
    work:   { score: 3, message: "변화 없이 평이하게 진행되는 하루예요.", tip: "메일함을 짧게 정리해보세요" },
    money:  { score: 3, message: "큰 변화 없이 평이한 흐름이 이어져요.", tip: "오늘의 지출을 짧게 메모해보세요" },
    health: { score: 4, message: "기분 좋게 움직이기 좋은 하루예요.", tip: "물 한 컵 더 마셔보세요" },
    social: { score: 4, message: "기분 좋은 만남이 작게 찾아올 수 있어요.", tip: "안부 문자 한 통을 보내보세요" },
  },
};
