// Supabase 무료 플랜 keep-alive.
// 무료 프로젝트는 7일간 요청이 없으면 일시중지된다. 출시 직후나 심사 대기처럼
// 실사용자가 0인 구간에서 그대로 잠기면 앱이 통째로 죽으므로, Vercel Cron 이
// 하루 1회 여기를 때려서 비활성 카운터를 리셋한다(vercel.json 의 crons).
//
// dream_items 는 0010 마이그레이션으로 public read 가 열려 있어 anon key 로 읽힌다.
// → service role 키를 Vercel 에 둘 필요가 없다.
export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export default async function handler(req: Request): Promise<Response> {
  // Vercel Cron 은 CRON_SECRET 이 설정돼 있으면 Authorization: Bearer <secret> 을
  // 붙여 호출한다. 외부에서 아무나 두드리는 걸 막는다.
  if (CRON_SECRET) {
    if (req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json({ ok: false, error: "missing_supabase_env" }, 500);
  }

  const started = Date.now();
  try {
    // 가장 가벼운 형태의 실제 DB 접근. 1행만 읽고 버린다.
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/dream_items?select=id&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    const ms = Date.now() - started;

    if (!res.ok) {
      return json({ ok: false, error: `supabase_${res.status}`, ms }, 502);
    }
    const rows = (await res.json()) as unknown[];
    return json({ ok: true, rows: Array.isArray(rows) ? rows.length : 0, ms });
  } catch {
    return json({ ok: false, error: "fetch_error", ms: Date.now() - started }, 502);
  }
}
