import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "edge" };

// 회원 탈퇴 직전에 앱이 호출한다 — 카카오 계정이면 카카오 쪽 앱 연결을 끊는다.
// 안 끊으면 카카오 "연결된 서비스" 목록에 몽글이 남고, 재가입 시 동의 화면 없이
// 이전 연결이 그대로 이어진다.
//
// 반드시 delete_my_account RPC 보다 먼저 불려야 한다. auth.users 가 지워지면
// identities(카카오 회원번호)를 더는 조회할 수 없다.
//
// 어드민 키는 서버 전용(Vercel 환경변수 KAKAO_ADMIN_KEY). 앱 번들에 넣으면 안 된다 —
// 어드민 키는 아무 회원이나 연결 끊기를 할 수 있다.

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in env",
  );
}

const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KAKAO_UNLINK_URL = "https://kapi.kakao.com/v1/user/unlink";
// 탈퇴 버튼을 누른 사용자가 카카오 응답을 오래 기다리지 않게 한다.
const KAKAO_TIMEOUT_MS = 5000;

// api/chat.ts 와 같은 CORS 정책 — Bearer 토큰만 쓰므로 Origin 반사가 안전하다.
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

export default async function handler(req: Request): Promise<Response> {
  const cors = corsHeaders(req);

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
    // 1) 인증 — identities 가 필요해서 getClaims 가 아니라 getUser 로 받는다.
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

    const { data, error: authErr } = await supabaseAuth.auth.getUser(token);
    const user = data?.user;
    if (authErr || !user) {
      console.error("[kakao-unlink] auth failed:", authErr?.message ?? "no user");
      return Response.json(
        { error: "세션이 만료됐어요" },
        { status: 401, headers: cors },
      );
    }

    // 2) 카카오 회원번호 = auth.identities.provider_id 컬럼.
    // GoTrue 는 JSON 직렬화할 때 provider_id 를 "id" 로, 내부 uuid 를 "identity_id" 로
    // 내보낸다(supabase/auth internal/models/identity.go). 그래서 SDK 타입에 provider_id
    // 필드가 없고 identity.id 가 곧 provider_id 다. uuid 를 잘못 보내지 않게 숫자인지
    // 확인하고, 아니면 identity_data 쪽 값으로 한 번 더 찾는다.
    const kakao = user.identities?.find((i) => i.provider === "kakao");
    if (!kakao) {
      return Response.json({ skipped: true }, { status: 200, headers: cors });
    }
    const kakaoUserId = [
      kakao.id,
      kakao.identity_data?.provider_id,
      kakao.identity_data?.sub,
    ]
      .map((v) => (v == null ? "" : String(v)))
      .find((v) => /^\d+$/.test(v));
    if (!kakaoUserId) {
      console.error("[kakao-unlink] kakao identity without numeric provider_id", {
        uid: user.id,
        identityId: kakao.identity_id,
      });
      return Response.json(
        { error: "kakao id not found" },
        { status: 500, headers: cors },
      );
    }

    const adminKey = process.env.KAKAO_ADMIN_KEY;
    if (!adminKey) {
      console.error("[kakao-unlink] KAKAO_ADMIN_KEY is not set", { uid: user.id });
      return Response.json(
        { error: "server misconfigured" },
        { status: 500, headers: cors },
      );
    }

    // 3) 연결 끊기
    const res = await fetch(KAKAO_UNLINK_URL, {
      method: "POST",
      headers: {
        Authorization: `KakaoAK ${adminKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        target_id_type: "user_id",
        target_id: kakaoUserId,
      }).toString(),
      signal: AbortSignal.timeout(KAKAO_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[kakao-unlink] kakao api failed:", {
        uid: user.id,
        kakaoUserId,
        status: res.status,
        body,
      });
      return Response.json(
        { error: "kakao unlink failed" },
        { status: 502, headers: cors },
      );
    }

    return Response.json({ ok: true }, { status: 200, headers: cors });
  } catch (err) {
    console.error("[kakao-unlink] unexpected error:", err);
    return Response.json(
      { error: "internal error" },
      { status: 500, headers: cors },
    );
  }
}
