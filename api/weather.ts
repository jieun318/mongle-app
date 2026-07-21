// 위치 기반 날씨 — 홈 화면의 비/눈 연출용.
// IP 기반 대략 위치(Vercel geo 헤더) → 기상청 격자 변환 → 초단기실황(PTY) 조회.
// 기기 위치 권한을 쓰지 않으므로 Play 데이터안전 재신고가 필요 없다.
// 키(KMA_SERVICE_KEY)는 서버에만 두고, 앱엔 결과 상태(condition)만 내려준다.
export const config = { runtime: "edge" };

const KMA_KEY = process.env.KMA_SERVICE_KEY; // data.go.kr 활용신청 '일반 인증키(Encoding)'
const KMA_URL =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst";

// geo 헤더가 없을 때(로컬/일부 네트워크) 기본값 = 서울 종로.
const FALLBACK = { lat: 37.5665, lon: 126.978 };

type Condition = "clear" | "rain" | "snow" | "sleet";

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

// 기상청 공식 LCC 격자 변환 (dfs_xy_conv). 서울 종로 = (60,127) 로 검증됨.
function toGrid(lat: number, lon: number): { nx: number; ny: number } {
  const RE = 6371.00877, GRID = 5.0, SLAT1 = 30.0, SLAT2 = 60.0;
  const OLON = 126.0, OLAT = 38.0, XO = 43, YO = 136;
  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD, slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD, olat = OLAT * DEGRAD;
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;
  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx, ny };
}

// KST 기준 초단기실황 base_date/base_time. 매시 정시 생성·40분경 제공되므로
// 분<45 이면 직전 시각을 쓴다(여유). 자정 넘어가면 날짜도 하루 되돌린다.
function kmaBaseDateTime(): { baseDate: string; baseTime: string } {
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000); // UTC→KST
  let y = nowKst.getUTCFullYear();
  let mo = nowKst.getUTCMonth();
  let d = nowKst.getUTCDate();
  let h = nowKst.getUTCHours();
  const mi = nowKst.getUTCMinutes();
  if (mi < 45) h -= 1;
  if (h < 0) {
    const prev = new Date(Date.UTC(y, mo, d) - 24 * 60 * 60 * 1000);
    y = prev.getUTCFullYear();
    mo = prev.getUTCMonth();
    d = prev.getUTCDate();
    h = 23;
  }
  const p2 = (n: number) => String(n).padStart(2, "0");
  return {
    baseDate: `${y}${p2(mo + 1)}${p2(d)}`,
    baseTime: `${p2(h)}00`,
  };
}

// PTY(강수형태) → 연출 상태. 0 없음 / 1,5 비 / 2,6 비·눈 / 3,7 눈.
function ptyToCondition(pty: string): Condition {
  if (pty === "1" || pty === "5") return "rain";
  if (pty === "3" || pty === "7") return "snow";
  if (pty === "2" || pty === "6") return "sleet";
  return "clear";
}

function json(body: unknown, req: Request, cacheSec = 600): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${cacheSec}`,
      ...corsHeaders(req),
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  // Vercel 이 요청 IP 로 채워주는 대략 위치. 없으면 서울로 폴백.
  const latH = req.headers.get("x-vercel-ip-latitude");
  const lonH = req.headers.get("x-vercel-ip-longitude");
  const lat = latH ? parseFloat(latH) : FALLBACK.lat;
  const lon = lonH ? parseFloat(lonH) : FALLBACK.lon;
  const city = req.headers.get("x-vercel-ip-city") ?? null;
  const { nx, ny } = toGrid(lat, lon);

  // 키 미설정 시엔 조용히 clear (홈이 깨지지 않게). 배포 후 키만 넣으면 동작.
  if (!KMA_KEY) {
    return json({ condition: "clear", reason: "no_key", grid: { nx, ny }, city }, req, 60);
  }

  const { baseDate, baseTime } = kmaBaseDateTime();
  const url =
    `${KMA_URL}?serviceKey=${KMA_KEY}&pageNo=1&numOfRows=60&dataType=JSON` +
    `&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      return json({ condition: "clear", reason: `kma_${res.status}`, grid: { nx, ny }, city }, req, 60);
    }
    const data = await res.json();
    const items = data?.response?.body?.items?.item;
    if (!Array.isArray(items)) {
      const header = data?.response?.header;
      return json(
        { condition: "clear", reason: "kma_no_items", kma: header?.resultCode, grid: { nx, ny }, city },
        req,
        60,
      );
    }
    const ptyItem = items.find((it: { category?: string }) => it.category === "PTY");
    const pty = String(ptyItem?.obsrValue ?? "0");
    return json(
      { condition: ptyToCondition(pty), pty, city, grid: { nx, ny }, baseDate, baseTime },
      req,
    );
  } catch (e) {
    return json(
      { condition: "clear", reason: "fetch_error", grid: { nx, ny }, city },
      req,
      60,
    );
  }
}
