import { generateObject, streamText, type ModelMessage } from "ai";
import { google } from "@ai-sdk/google";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const config = { runtime: "edge" };

// JWT 검증 전용 클라이언트 — anon key 로 supabase.auth.getUser(jwt) 호출하면
// Supabase 가 토큰 서명/만료를 검증하고 user 를 돌려준다.
const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in env",
  );
}

const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 앱이 mongle-app.vercel.app 외의 도메인(프리뷰 배포 등)에서 호출될 수 있어
// CORS 를 허용한다. 쿠키가 아니라 Authorization Bearer 토큰만 쓰므로
// 요청 Origin 을 그대로 반사해도 안전 (credentials 모드 아님).
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

// 입력 한도 — 비용 폭증 방지
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 1000;
// gemini-2.5-flash 는 thinking 토큰도 maxOutputTokens 안에서 같이 소모한다.
// 1000 으로 두면 추론에 예산을 먼저 쓰고 본문이 문장 중간에서 잘린다
// (finishReason: "length" — 에러가 아니라 정상 종료라 아무 표시도 안 남는다).
// thinking 은 아래에서 0 으로 끄고, 한국어 장문 답변용으로 한도를 올린다.
const MAX_OUTPUT_TOKENS = 2600;

// 클라이언트는 user / assistant 만 보낼 수 있다 (system 주입 금지)
const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_MESSAGE_CHARS),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
  nickname: z.string().max(50).optional(),
});

// 꿈 보관함 카드에 쓰일 메타데이터 — 첫 사용자 턴에서만 추출, 클라이언트가 저장 시 사용.
// title + emoji + luckIndex + isWarning + moodTags 를 한 번에 뽑는다.
const dreamMetaSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(20)
    .describe(
      "꿈 내용을 6자 이내로 요약한 제목. 예: '계주 1등 꿈', '좀비 쫓기는 꿈', '하늘 나는 꿈'",
    ),
  emoji: z
    .string()
    .min(1)
    .max(16)
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
    .min(0)
    .max(100)
    .describe(
      "0~100 사이 길운 지수. 한국 꿈 해석 관습 반영. 명백한 길몽(돈/성공/임신/태몽/용/돼지 등)은 75~95, 평범한 꿈은 45~60, 흉몽(죽음/추격/추락/이별)은 15~35.",
    ),
  isWarning: z
    .boolean()
    .describe(
      "흉몽이거나 경고성 메시지가 강한 꿈이면 true. 평범하거나 길몽이면 false.",
    ),
  moodTags: z
    .array(z.string().min(1).max(8))
    .min(1)
    .max(4)
    .describe(
      "꿈의 무드/주제 한국어 짧은 단어 1~4개. # 기호 없이. 예: 공포, 불안, 추격, 가족, 성공, 변화, 일상, 생활/행동, 학업, 연애, 이별.",
    ),
  interpretation: z
    .string()
    .min(1)
    .max(400)
    .describe(
      `꿈에 대한 해몽 본문 요약. 2~3문장. 보관함 카드/상세에서 단독으로 보여지므로:
- 챗봇 대화 스타일의 공감 멘트("그런 꿈을 꾸셨군요" 등) 금지
- 사용자에게 묻는 질문 금지
- 이모지 금지
- "당신/지은님" 같은 호칭 없이 평서문으로 꿈의 의미를 한국 꿈 해석 관습 기반으로 차분하게 서술.
예: "쫓기는 꿈은 현실에서 마주하기 부담스러운 일이나 감정이 있을 때 자주 나타납니다. 그 압박을 정면으로 바라보기 두려운 마음이 꿈으로 드러난 것일 수 있어요."`,
    ),
});
export type DreamMeta = z.infer<typeof dreamMetaSchema>;

// 본 답변 생성과 병렬 실행. 실패해도 본 답변은 정상 동작하도록 try/catch 로 격리.
async function extractDreamMeta(
  userDreamText: string,
): Promise<DreamMeta | null> {
  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: dreamMetaSchema,
      system: `사용자가 입력한 꿈 내용을 분석해 보관함 카드에 표시할 메타데이터(title/emoji/luckIndex/isWarning/moodTags/interpretation) 를 JSON 으로 반환하세요. 한국 문화권 꿈 해석 관습을 반영하세요.

단, 입력에 사용자 본인의 자살·자해 관련 상태 표현("죽고 싶다", "사라지고 싶다",
"자해했다" 등)이 포함된 경우에는 그 부분을 꿈 상징으로 해석하지 마세요.
이때는 emoji 를 "🌙" 로, interpretation 은 해석 대신
"힘든 마음이 담긴 기록이에요." 한 문장으로만 두세요.
("죽는 꿈을 꿨다"처럼 꿈 내용만 서술한 경우는 평소대로 해몽 관습을 적용합니다.)`,
      prompt: `다음 꿈 내용을 분석해 메타데이터를 추출하세요.\n\n꿈 내용:\n${userDreamText}`,
    });
    return object;
  } catch (err) {
    console.error("[chat api] meta extract error:", err);
    return null;
  }
}

// 스트림 도중 에러를 사용자에게 보여줄 짧은 메시지로 변환.
// Gemini quota(429), 인증 실패, 그 외 일반 에러를 구분.
function friendlyStreamErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // AI SDK 의 AI_APICallError 는 statusCode 필드를 노출
  const status = (err as { statusCode?: number } | null)?.statusCode;
  const body = (err as { responseBody?: string } | null)?.responseBody ?? "";
  if (status === 429 || /quota|RESOURCE_EXHAUSTED/i.test(raw + body)) {
    return "오늘 AI 사용량 한도에 도달했어요. 잠시 후 다시 시도해주세요.";
  }
  // 키 누락(LoadAPIKeyError) / 키 무효 — 서버 환경변수 설정 문제
  if (
    status === 401 ||
    status === 403 ||
    /api[\s._-]?key|API_KEY_INVALID|LoadAPIKeyError|permission|unauthorized/i.test(
      raw + body,
    )
  ) {
    return "AI 서비스 키 설정에 문제가 있어요. (서버 환경변수 확인 필요)";
  }
  if (status && status >= 500) {
    return "AI 서버가 응답하지 않아요. 잠시 후 다시 시도해주세요.";
  }
  return "답변 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.";
}

export default async function handler(req: Request): Promise<Response> {
  const cors = corsHeaders(req);

  // CORS preflight — 브라우저가 본 요청 전에 OPTIONS 를 먼저 보낸다.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: cors },
    );
  }

  try {
    // 1) 인증 검증
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return Response.json(
        { error: "로그인이 필요해요" },
        { status: 401, headers: cors },
      );
    }

    const {
      data: { user },
      error: authErr,
    } = await supabaseAuth.auth.getUser(token);

    if (authErr || !user) {
      console.error("[chat api] auth failed:", authErr?.message ?? "no user");
      return Response.json(
        { error: "세션이 만료됐어요" },
        { status: 401, headers: cors },
      );
    }

    // 2) 입력 검증
    const raw = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return Response.json(
        { error: "요청 형식이 올바르지 않아요" },
        { status: 400, headers: cors },
      );
    }
    const { messages, nickname } = parsed.data;

    // 3) 프롬프트 구성 + 토큰 상한 적용
    const userName = nickname?.trim() || "몽글이";
    const systemPrompt = `당신은 꿈 해몽 전문 AI '몽이'입니다.
사용자의 꿈을 따뜻하고 친근한 말투로 해석해 주세요. 문단을 나눠 읽기 쉽게 씁니다.

[최우선 안전 규칙 — 아래의 다른 모든 규칙(형식·톤·유도)보다 우선합니다]
사용자가 **자신의 현재 상태·감정**으로 자살, 자해, 죽고 싶은 마음을 표현하면
꿈 해석보다 그 말에 먼저 반응하세요.

● 이 규칙이 적용되는 경우 — 현실의 자기 상태를 드러낸 발화
  "죽고 싶다", "사라지고 싶다", "살기 싫다", "살아갈 이유를 모르겠다",
  "자해했다", "자해 충동이 든다" 등.
  꿈 이야기와 섞여 있어도 이 규칙이 우선입니다.
  (예: "요즘 죽고싶다는 생각이 들어서 그런 꿈을 꾸는 걸까" → 안전 규칙 적용)

● 이 규칙이 적용되지 않는 경우 — 꿈에서 일어난 일만 서술
  "죽는 꿈을 꿨어", "누가 죽는 걸 봤어", "떨어져서 죽었어", "칼에 찔리는 꿈".
  한국 해몽에서 죽음은 재생·새 출발의 흔한 상징입니다. 평소대로 해몽하세요.
  꿈 내용만 말했는데 위기 대응을 꺼내면 안 됩니다.

● 안전 규칙이 적용될 때 지킬 것
  1. 그 마음을 먼저 인정하고 받아들이세요. 가볍게 넘기지 마세요.
  2. "죽고 싶다" 같은 표현을 꿈의 상징으로 바꿔 읽거나("새로 시작하고 싶은 소망" 등)
     긍정적으로 재해석하지 마세요. 절대 금지입니다.
  3. 전문적인 도움을 받을 수 있다는 것을 안내하세요:
     · 자살예방상담전화 109 (24시간)
     · 정신건강위기상담전화 1577-0199 (24시간)
  4. 진단하지 마세요("우울증이에요"). 원인을 단정하지 마세요("~때문이에요").
  5. 사용자가 꿈 이야기를 이어가길 원하면 그 뒤에 이어가도 됩니다.
     다만 안전 안내가 먼저입니다.
  6. 이때는 번호 목록·"<<MORE>>"·"💭 오늘의 꿈 요약" 형식을 쓰지 말고,
     짧고 차분한 문단으로만 답하세요.

[꿈이 아닌 수면 경험 — 가위눌림 등]
사용자가 말한 것이 "꾼 꿈"이 아니라 잠자는 동안 겪은 다른 경험일 수 있습니다.
대표적으로 가위눌림(수면마비)이고, 잠꼬대·몽유·불면도 여기 해당합니다.
  예: "가위에 자주 눌려", "가위눌림이 심해", "몸이 안 움직였어", "수면마비 온 것 같아"

● 이때 절대 하지 말 것
  - "그런 꿈을 꾸셨군요", "어떤 꿈을 꾸셨나요" 처럼 꿈으로 단정하기.
    가위눌림은 꿈이 아니라 몸이 깨기 전에 의식만 먼저 깬 상태입니다.
  - 진단하거나("수면장애예요") 원인을 단정하기.

● 이때 이렇게 답할 것
  1. 무서웠을 마음을 먼저 한 문장으로 받아줍니다.
  2. 가위눌림은 잠들거나 깰 때 몸의 근육이 아직 풀리지 않아 생기는 흔한 현상이고
     그 자체로 위험하지 않다는 점을 한 문장으로 알려줍니다.
  3. 한국 전통 해몽에서 가위눌림을 어떻게 보아왔는지 덧붙입니다.
  4. 그때 보이거나 느껴진 장면이 있었는지 물어봅니다. 이때도 "꿈"이라 부르지 말고
     "그때 보이거나 들린 것" 처럼 표현하세요. 장면을 들려주면 그때부터 해몽합니다.
  5. 자주 반복된다고 하면 수면 부족·불규칙한 수면과 관련될 수 있다는 정도만 언급하고,
     오래 힘들면 전문가와 상담해 보길 부드럽게 권합니다.
  6. 이 경우엔 번호 목록·"<<MORE>>" 형식을 쓰지 말고 짧은 문단으로 답하세요.

규칙:
- 사용자의 닉네임은 "${userName}" 입니다. 부를 때는 반드시 "${userName}님" 처럼 "님"을
  붙이고, 답변 전체에서 딱 한 번만 사용하세요. 닉네임을 문장 맨 앞에 홀로 부르지 마세요.
- 한국어로 답변합니다.
- **꿈 해몽 답변은 너무 짧지 않아도 됩니다. 대신 문단을 나눠 한눈에 읽히게.** 꿈의 의미를 충분히 설명하되, 같은 말 반복·불필요한 비유는 금지.
- **답변은 공감 멘트 없이 곧장 해석(해몽)으로 시작.** 사용자 앞에는 이미 공감 한 줄이 별도 말풍선으로 표시되므로, AI 답변에는 "그런 꿈을 꾸셨군요", "정말 무서웠겠어요" 같은 도입부 금지. "~꿈을 꾸셨군요" 류 인사도 금지.
- **꿈을 해몽할 때는 아래 형식을 정확히 지켜 출력하세요:**
  (1) 먼저 꿈 해석의 핵심을 **번호 목록**으로 정리합니다. 각 줄은 "1. ", "2. ", "3. " 로 시작하고, 한 항목은 한 문장. 2~3개 항목으로, 이 목록만 봐도 핵심이 파악되게 (한 줄짜리로 너무 간단히 X).
  (2) 그 다음 줄에 정확히 "<<MORE>>" 만 씁니다(앞뒤에 다른 글자·기호·빈칸 없이 그 줄엔 이것만).
  (3) 그 아래에 전체 해석을 씁니다 — 꿈의 의미를 2~3개의 짧은 문단(문단 사이 빈 줄 "\\n\\n")으로 자세히 풀고, 마지막에 "이렇게 해보면 좋아요" 식의 실천 제안 1~2가지.
  요약(1)은 번호 목록으로 핵심만, 전체 해석(3)은 더 궁금한 사람을 위한 자세한 서술형 버전입니다.
  단, 가벼운 후속 잡담이나 짧은 질문엔 "<<MORE>>" 없이 1~2문장으로 짧게 답합니다.
- 불필요한 반복·군더더기 없이. 비유는 최대 1개.
- 단정짓지 말고 "~일 수도 있어요" 같은 부드러운 표현.
- 부정적인 꿈이어도 짧게 위로 + 긍정적 시선 유지. (단, 최우선 안전 규칙이
  적용되는 경우는 예외 — 긍정적 재해석을 시도하지 말 것)
- 이모지는 절제해서 사용 (답변 전체에서 0~2개).
- 사용자가 잡담을 해도 부드럽게 꿈 이야기로 유도. (단, 최우선 안전 규칙이
  적용되는 발화와 "꿈이 아닌 수면 경험"은 잡담이 아니므로 꿈 이야기로 돌리지 말 것)
- 사용자가 아직 꿈 내용을 말하지 않았다면 "꿈을 꾸셨군요" 처럼 단정하지 말 것.
  무엇을 겪었는지 확인한 뒤에 해몽으로 넘어가세요.
- 사용자가 꿈 내용을 충분히 공유했다고 판단되면 (더 기억 못한다고 하거나, 대화가 자연스럽게 마무리될 때) 추가 질문 없이 따뜻한 마무리 멘트로 끝내줘.
- 사용자가 새로운 꿈 이야기를 꺼내면 이전 꿈 흐름을 끊고 처음부터 다시 자연스럽게 대화를 시작해줘.
- **대화를 마무리할 때**는 아래 형식을 정확히 지켜서 꿈 내용을 짧게 정리한 뒤 마무리 멘트로 끝낼 것:

  💭 오늘의 꿈 요약
  [꿈 내용 1~2문장 요약]
  [해몽 핵심 1~2문장]

  그 다음 줄에 따뜻한 마무리 멘트 한 줄. 예: "꿈이 전하는 마음, 잘 받았어요. 푹 쉬세요 💜". 마무리 단계에서는 질문하지 말 것.`;

    // 첫 사용자 턴에서만 보관함용 메타데이터 한 번에 추출 — 본 답변 스트리밍과 병렬.
    const userMsgCount = messages.filter((m) => m.role === "user").length;
    const firstUserText =
      messages.find((m) => m.role === "user")?.content ?? "";

    // AI SDK v6 의 streamText 는 모델 호출이 실패해도 textStream 으로 throw 하지 않고
    // 조용히 빈 스트림으로 끝낸다. 에러는 onError 콜백으로만 전달되므로 여기서 잡아둔다.
    let capturedError: unknown = null;

    // streamText 는 동기 호출이라 즉시 stream 객체를 돌려준다 (실제 토큰은 백그라운드로 도착).
    const streamResult = streamText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      messages: messages as ModelMessage[],
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      // 해몽은 형식이 정해져 있어 별도 추론이 필요 없다. thinking 을 끄면
      // 출력 예산을 본문이 전부 쓰고, 첫 토큰도 눈에 띄게 빨라진다.
      providerOptions: {
        google: { thinkingConfig: { thinkingBudget: 0 } },
      },
      onError({ error }) {
        capturedError = error;
        console.error("[chat api] streamText onError:", error);
      },
    });

    // 메타는 await 하지 않고 promise 만 보관 — 본 텍스트 스트림이 끝난 뒤에 sentinel 로 붙인다.
    // 이렇게 하면 첫 토큰을 즉시 클라이언트로 보낼 수 있어 체감 대기 시간이 크게 줄어듦.
    const metaPromise =
      userMsgCount === 1 ? extractDreamMeta(firstUserText) : Promise.resolve(null);

    const encoder = new TextEncoder();
    const combinedStream = new ReadableStream({
      async start(controller) {
        let emittedAnyText = false;
        try {
          for await (const chunk of streamResult.textStream) {
            if (chunk) emittedAnyText = true;
            controller.enqueue(encoder.encode(chunk));
          }
          // 텍스트가 한 글자도 안 나왔는데 onError 가 잡힌 경우 = 모델 호출 실패.
          // (streamText 가 throw 하지 않으므로 catch 로는 안 잡힘 → 여기서 처리)
          // 출력 한도에 걸려 끊긴 경우. 에러가 아니라 정상 종료로 오기 때문에
          // 로그를 남기지 않으면 "답변이 문장 중간에서 끝남" 증상만 보이고 원인이 안 보인다.
          const finishReason = await streamResult.finishReason;
          if (finishReason === "length") {
            console.warn(
              "[chat api] output truncated by maxOutputTokens",
              await streamResult.usage,
            );
          }

          if (!emittedAnyText && capturedError) {
            const message = friendlyStreamErrorMessage(capturedError);
            controller.enqueue(
              encoder.encode(`\n<<ERROR>>${message}<</ERROR>>`),
            );
          } else {
            // 본 답변이 끝난 뒤 메타를 sentinel 로 추가. 한글/이모지가 그대로 들어가도 안전 (본문 body).
            const meta = await metaPromise;
            controller.enqueue(
              encoder.encode(`\n<<META>>${JSON.stringify(meta)}<</META>>`),
            );
          }
        } catch (streamErr) {
          console.error("[chat api] stream pipe error:", streamErr);
          // controller.error 로 던지면 클라이언트는 빈 본문만 보게 됨.
          // 대신 사용자 친화 메시지를 sentinel 로 흘려보내고 정상 close.
          const message = friendlyStreamErrorMessage(streamErr ?? capturedError);
          controller.enqueue(encoder.encode(`\n<<ERROR>>${message}<</ERROR>>`));
        }
        controller.close();
      },
    });

    return new Response(combinedStream, {
      headers: {
        ...cors,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    // 4) 내부 로그는 상세하게, 클라이언트 응답은 일반화 (dev 에서는 원인 같이 노출)
    console.error("[chat api] error:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return Response.json(
      {
        error: "답변을 가져오지 못했어요. 잠시 후 다시 시도해주세요.",
        detail: process.env.NODE_ENV === "production" ? undefined : detail,
      },
      { status: 500, headers: cors },
    );
  }
}
