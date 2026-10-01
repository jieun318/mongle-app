import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
// 사전 판정 규칙과 같은 기준을 쓴다. Edge 번들이라 '@/...' 별칭 대신 상대 경로.
import { LUCK_BAD_MAX, LUCK_GOOD_MIN } from "../../lib/luck";

// 꿈 보관함 카드·해몽 결과 화면에 쓰일 메타데이터 — 첫 사용자 턴에서만 추출.
// api/chat.ts 가 본 답변 스트림과 병렬로 만들고, 스트림이 끝난 뒤 <<META>> 센티널로 붙인다
// (await 하지 않으므로 첫 토큰 지연에 영향 없음).
// summary/badge/keywords/actions 는 결과 화면용. 예전 앱은 모르는 필드를 무시한다.
// 개수·길이 상한은 설명에만 두고 스키마(.max)에는 걸지 않는다. 모델이 키워드를 4개 주는 식으로
// 하나만 넘어도 검증이 실패해 메타 전체가 사라졌다(→ 결과 카드 버튼·보관함 메타 없음, 측정 시
// 8회 중 2회). 대신 생성 직후 tidyMeta 가 개수를 자르고 범위를 맞춘다.
const dreamMetaSchema = z.object({
  title: z
    .string()
    .min(1)
    .describe(
      "꿈 내용을 6자 이내로 요약한 제목. 예: '계주 1등 꿈', '좀비 쫓기는 꿈', '하늘 나는 꿈'",
    ),
  emoji: z
    .string()
    .min(1)
    .describe(
      `꿈 내용과 가장 잘 어울리는 이모지 1개. 달리기 꿈이면 🏃, 무서운 꿈이면 😨, 하늘 나는 꿈이면 🕊️. 절대 🌙 기본값 쓰지 말 것 — 꿈에 등장한 구체적인 대상·행동을 반드시 짚어내야 함.
분위기(공포/슬픔)보다 실제 등장한 대상/행동(좀비/달리기/물 등)을 더 우선.
예시 매핑(꿈 키워드 → 이모지):
- 달리기/뛰는/도망/계주 → 🏃 (여성 화자면 🏃‍♀️, 남성이면 🏃‍♂️)
- 쫓기는 → 😨
- 좀비 → 🧟
- 물에 빠지는/홍수/바다 → 🌊
- 수영 → 🏊
- 뱀 → 🐍
- 용 → 🐉
- 호랑이 → 🐯
- 개/강아지 → 🐶
- 고양이 → 🐱
- 새/날아다니는 → 🕊️
- 추락/떨어지는 → 🪂
- 하늘을 나는/비행기 → ✈️
- 운전/자동차 → 🚗
- 학교/시험/공부 → 📝
- 시험 떨어지는 → 😰
- 사랑/연애 → 💖
- 이별 → 💔
- 결혼 → 💍
- 임신/태몽 → 🤰
- 아기 → 👶
- 죽음 → 💀
- 피 → 🩸
- 불 → 🔥
- 집/이사 → 🏠
- 돈/금/로또 → 💰
- 똥 → 💩
- 음식/먹는 → 🍽️
- 노래/공연 → 🎤
- 춤추는 → 💃
- 싸움 → 🥊
- 별/우주 → ✨
- 해/태양 → ☀️
- 꽃 → 🌸
- 나무/숲 → 🌳
- 산 → ⛰️
- 비/우산 → 🌧️
- 눈/겨울 → ❄️`,
    ),
  luckIndex: z
    .number()
    .int()
    .describe(
      `0~100 사이 길운 지수. 한국 꿈 해석 관습 반영. badge 와 반드시 맞출 것.
- 길몽 ${LUCK_GOOD_MIN}~95: 전통적으로 길몽으로 알려진 꿈(돼지, 용, 똥, 불이 활활 타는 집, 뱀에 물림, 임신·태몽, 돈·보물 등).
- 보통 40~65: 불안·스트레스·긴장 같은 심리 해석이 중심인 꿈(쫓기기, 떨어지기, 시험, 늦기, 길 잃기, 발표·준비 부족 등).
  꿈속에서 무섭거나 불안했다는 것만으로는 흉몽이 아니다. 길흉이 상황에 따라 갈리는 꿈도 보통.
- 흉몽 15~${LUCK_BAD_MAX}: 전통적으로 흉몽으로 알려진 꿈(이빨이 빠짐, 검은 뱀, 신발을 잃어버림, 거울이 깨짐 등)이거나,
  사용자가 꿈속에서 큰 고통(심한 통증, 피를 많이 흘림, 가족의 큰 사고)을 겪었다고 말한 경우에만.
- 꿈속 죽음·장례·돌아가신 분은 새 출발·재생으로 풀이되는 경우가 많다 — 그것만으로 흉몽 판정 금지.`,
    ),
  badge: z
    .enum(["길몽", "흉몽", "보통"])
    .describe(
      `꿈의 길흉 판정. luckIndex 가 ${LUCK_GOOD_MIN} 이상이면 "길몽", ${LUCK_BAD_MAX} 이하면 "흉몽", 그 사이면 "보통".
결과 화면에 배지와 강도 막대로 크게 보이므로, 확실한 근거(위 luckIndex 기준)가 없으면 "보통"으로 둔다.`,
    ),
  summary: z
    .string()
    .min(1)
    .describe(
      `해몽 결과를 한 줄로. 15~40자, "~꿈" / "~길몽" / "~흉몽" 처럼 결론으로 끝맺음. 호칭·이모지·질문 금지.
예: "막혔던 일이 풀리고 재물이 들어오는 길몽", "마음의 부담을 정리하라는 신호의 꿈"`,
    ),
  keywords: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      "꿈속에 실제로 등장한 상징 1~3개. 한국어 짧은 명사, # 없이. moodTags(감정)와 겹치지 말 것. 예: 구렁이, 계주, 할머니, 옥상",
    ),
  actions: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      `"오늘 해볼 것" 실천 제안 1~2개. 각 40자 이내, "~해 보세요" 로 끝맺음. 꿈 내용과 이어지는 가볍고 구체적인 행동.
진단·치료·투자·복권 권유 금지, 단정 금지. 예: "미뤄 둔 연락 하나를 오늘 먼저 해 보세요"`,
    ),
  isWarning: z
    .boolean()
    .describe(
      'badge 가 "흉몽"일 때만 true. 심리 해석 중심의 "보통" 꿈(쫓기기·떨어지기·시험 등)이나 길몽이면 false.',
    ),
  moodTags: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      "꿈의 무드/주제 한국어 짧은 단어 1~4개. # 기호 없이. 예: 공포, 불안, 추격, 가족, 성공, 변화, 일상, 생활/행동, 학업, 연애, 이별.",
    ),
  interpretation: z
    .string()
    .min(1)
    .describe(
      `꿈에 대한 해몽 본문 요약. 2~3문장. 보관함 카드/상세에서 단독으로 보여지므로:
- 챗봇 대화 스타일의 공감 멘트("그런 꿈을 꾸셨군요" 등) 금지
- 사용자에게 묻는 질문 금지
- 이모지 금지
- "당신/지은님" 같은 호칭 없이 평서문으로 꿈의 의미를 한국 꿈 해석 관습 기반으로 차분하게 서술.
예: "쫓기는 꿈은 현실에서 마주하기 부담스러운 일이나 감정이 있을 때 자주 나타납니다. 그 압박을 정면으로 바라보기 두려운 마음이 꿈으로 드러난 것일 수 있어요."`,
    ),
  feeling: z
    .string()
    .min(1)
    .describe(
      `해몽 결과 화면 "지금 나의 마음" 칸. 꿈을 꾼 사람이 요즘 느끼고 있을 법한 감정 상태를 1~2문장으로.
- 꿈의 의미·상징 해석 금지(그건 interpretation 몫). 길몽/흉몽, 재물·운 같은 말 쓰지 말 것.
- 단정 금지 — "~한 마음일 수 있어요", "~가 느껴져요"처럼 부드럽게. 진단(우울, 불안장애 등) 금지.
- 호칭·이모지·질문 금지.
예: "새로운 일을 앞두고 설렘과 긴장이 함께 올라와 있는 마음일 수 있어요."`,
    ),
});
export type DreamMeta = z.infer<typeof dreamMetaSchema>;

const clampArr = (a: string[] | undefined, n: number) =>
  (a ?? []).map((x) => x.trim().replace(/^#/, "")).filter(Boolean).slice(0, n);

function tidyMeta(m: DreamMeta): DreamMeta {
  const luckIndex = Math.max(0, Math.min(100, Math.round(m.luckIndex)));
  return {
    ...m,
    luckIndex,
    keywords: clampArr(m.keywords, 3),
    actions: clampArr(m.actions, 2),
    moodTags: clampArr(m.moodTags, 4),
  };
}

// 본 답변 생성과 병렬 실행. 실패해도 본 답변은 정상 동작하도록 try/catch 로 격리.
export async function extractDreamMeta(
  userDreamText: string,
): Promise<DreamMeta | null> {
  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: dreamMetaSchema,
      system: `사용자가 입력한 꿈 내용을 분석해 보관함 카드와 해몽 결과 화면에 표시할 메타데이터(title/emoji/luckIndex/badge/isWarning/moodTags/keywords/summary/interpretation/feeling/actions) 를 JSON 으로 반환하세요. 한국 문화권 꿈 해석 관습을 반영하세요.

길흉 판정(badge/luckIndex)은 보수적으로 하세요. 불안·스트레스 같은 심리 해석이 중심인 꿈
(쫓기기, 떨어지기, 시험, 늦기, 길 잃기 등)은 "보통"(luckIndex 40~65)입니다. "흉몽"은 전통적으로
흉몽으로 알려진 꿈(이빨이 빠짐, 검은 뱀 등)이거나 사용자가 꿈속의 큰 고통을 말한 경우에만 쓰세요.
결과 화면에서 흉몽은 붉은 강도 막대로 크게 보여 사용자가 겁먹을 수 있습니다.

단, 입력에 사용자 본인의 자살·자해 관련 상태 표현("죽고 싶다", "사라지고 싶다",
"자해했다" 등)이 포함된 경우에는 그 부분을 꿈 상징으로 해석하지 마세요.
이때는 emoji 를 "🌙" 로, badge 를 "보통" 으로, interpretation 과 summary 는 해석 대신
"힘든 마음이 담긴 기록이에요." 한 문장으로만 두세요. feeling 은 "많이 지치고 힘든 마음이 느껴져요." 로 두세요. keywords 는 ["마음"], actions 는
["믿을 수 있는 사람에게 지금 마음을 이야기해 보세요"] 하나만 두세요.
("죽는 꿈을 꿨다"처럼 꿈 내용만 서술한 경우는 평소대로 해몽 관습을 적용합니다.)`,
      prompt: `다음 꿈 내용을 분석해 메타데이터를 추출하세요.\n\n꿈 내용:\n${userDreamText}`,
      // 본 답변과 같은 이유로 추론을 끈다. 메타는 스트림 뒤에 붙으므로 첫 토큰과는
      // 무관하지만, 추론을 하면 메타가 본문보다 늦게 끝나 결과 카드 버튼이 늦게 뜬다.
      providerOptions: {
        google: { thinkingConfig: { thinkingBudget: 0 } },
      },
    });
    return tidyMeta(object);
  } catch (err) {
    console.error("[chat api] meta extract error:", err);
    return null;
  }
}

