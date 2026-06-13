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
// thinking 을 끈 상태(아래 providerOptions)에서 이 한도는 온전히 본문 해몽에 쓰인다.
// 마무리 턴의 "오늘의 꿈 요약" 포맷까지 안 잘리도록 여유를 둔다.
const MAX_OUTPUT_TOKENS = 1500;

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
      system:
        "사용자가 입력한 꿈 내용을 분석해 보관함 카드에 표시할 메타데이터(title/emoji/luckIndex/isWarning/moodTags/interpretation) 를 JSON 으로 반환하세요. 한국 문화권 꿈 해석 관습을 반영하세요.",
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
사용자의 꿈을 따뜻하고 친근한 말투로 **짧게** 해석해 주세요.

규칙:
- 사용자의 닉네임은 "${userName}" 입니다. 답변 안에 한 번만 자연스럽게 호칭하세요.
- 한국어로 답변합니다.
- **답변은 짧은 문단 2~3개로 나누고, 문단 사이에 반드시 빈 줄("\\n\\n")을 넣어 읽기 쉽게 작성.** 한 문단은 1~2문장. 벽처럼 긴 한 덩어리로 쓰지 말 것.
- **첫 문단은 공감 멘트 없이 곧장 해몽 핵심으로 시작.** 사용자 앞에는 이미 공감 한 줄이 별도 말풍선으로 표시되므로, "그런 꿈을 꾸셨군요", "정말 무서웠겠어요", "~꿈을 꾸셨군요" 류 도입부·인사 금지.
- **둘째 문단**에서는 꿈에 등장한 상징·장면 하나를 골라 그 의미를 조금 더 풀어주거나, 부정적 꿈이면 부드러운 위로와 긍정적 시선을 더해줘.
- **마지막은 대화를 이어갈 수 있게, 그 꿈과 관련된 구체적이고 부드러운 질문 한 줄로 끝내줘.** (예: "혹시 그 꿈에서 가장 또렷하게 남은 장면이 있었나요?") 단, 사용자가 더 할 말이 없다거나 대화를 마무리하려는 분위기면 질문하지 말고 따뜻하게 정리.
- 같은 말 반복 / 장황한 설명 / 불필요한 비유 금지. 비유는 최대 1개.
- 단정짓지 말고 "~일 수도 있어요" 같은 부드러운 표현.
- 부정적인 꿈이어도 짧게 위로 + 긍정적 시선 유지.
- 이모지는 답변 전체에서 0~2개. 문단 끝이나 마무리에 자연스러울 때만 사용.
- 사용자가 잡담을 해도 부드럽게 꿈 이야기로 유도.
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

    // 대화가 길어질수록 질문을 줄이고 자연스럽게 마무리하도록 단계별 안내를 덧붙인다.
    // (질문이 끝없이 이어지면 사용자가 "언제 끝나지?" 하고 불편해짐)
    const conversationStage =
      userMsgCount >= 3
        ? `\n\n[대화 단계 안내] 이미 여러 차례 이야기를 주고받았습니다. 이번 답변에서는 새로운 질문을 절대 하지 말고, 위의 "💭 오늘의 꿈 요약" 형식으로 대화를 따뜻하게 마무리하세요.`
        : userMsgCount === 2
          ? `\n\n[대화 단계 안내] 사용자가 추가 이야기를 들려줬습니다. 해몽을 짧게 보태되 새 질문은 최대 1개까지만 하고, 대화가 마무리되는 분위기라면 질문 없이 "💭 오늘의 꿈 요약" 형식으로 정리하세요.`
          : "";
    const finalSystemPrompt = systemPrompt + conversationStage;

    // AI SDK v6 의 streamText 는 모델 호출이 실패해도 textStream 으로 throw 하지 않고
    // 조용히 빈 스트림으로 끝낸다. 에러는 onError 콜백으로만 전달되므로 여기서 잡아둔다.
    let capturedError: unknown = null;

    // streamText 는 동기 호출이라 즉시 stream 객체를 돌려준다 (실제 토큰은 백그라운드로 도착).
    const streamResult = streamText({
      model: google("gemini-2.5-flash"),
      system: finalSystemPrompt,
      messages: messages as ModelMessage[],
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      // gemini-2.5-flash 는 기본적으로 "thinking" 토큰을 쓰는데, 그 토큰이
      // maxOutputTokens 한도를 같이 깎아먹어 본문 해몽이 중간에 잘리는 원인이었다.
      // 해몽은 추론이 깊게 필요한 작업이 아니므로 thinking 을 꺼서 한도를 본문에 온전히 쓴다.
      providerOptions: {
        google: {
          thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
        },
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
