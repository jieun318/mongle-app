// 기본 좌표 (서울)
const FALLBACK_LAT = 37.5665;
const FALLBACK_LNG = 126.978;

// 일출/일몰 전후 트랜지션 윈도우 — 30분
export const TRANSITION_WINDOW_MS = 30 * 60 * 1000;

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
}

export interface SunState {
  // 0 = 완전 낮, 1 = 완전 밤 — 그라디언트 transitionProgress 와 동일
  darkness: number;
  // 호(arc) 위치 — 0(일출) → 1(일몰). null = 해 떠있지 않음
  arcT: number | null;
  stage: "predawn" | "sunrise" | "day" | "sunset" | "night";
}

export async function getCurrentLocation(): Promise<{
  lat: number;
  lng: number;
  fallback: boolean;
}> {
  // 다국어 작업 전까지 위치 권한 보류 — 항상 서울 기준으로 운영.
  // 실제 위치 기능을 켤 때: `expo-location` 재설치 후
  //   const { status } = await Location.requestForegroundPermissionsAsync();
  //   if (status === "granted") { const pos = await Location.getCurrentPositionAsync(...); ... }
  // 형태로 복원하고 app.json android.permissions 도 함께 추가.
  return { lat: FALLBACK_LAT, lng: FALLBACK_LNG, fallback: true };
}

export async function fetchSunTimes(
  lat: number,
  lng: number,
): Promise<SunTimes | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=sunrise,sunset&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const sunriseStr = data?.daily?.sunrise?.[0];
    const sunsetStr = data?.daily?.sunset?.[0];
    if (!sunriseStr || !sunsetStr) return null;
    return {
      sunrise: new Date(sunriseStr),
      sunset: new Date(sunsetStr),
    };
  } catch {
    return null;
  }
}

export function computeSunState(now: Date, times: SunTimes): SunState {
  const t = now.getTime();
  const sr = times.sunrise.getTime();
  const ss = times.sunset.getTime();
  const W = TRANSITION_WINDOW_MS;

  // 새벽 (일출 30분 전 이전) — 완전 밤
  if (t < sr - W) {
    return { darkness: 1, arcT: null, stage: "predawn" };
  }
  // 일출 트랜지션 (sr-30 → sr+30): darkness 1 → 0
  if (t < sr + W) {
    const progress = (t - (sr - W)) / (2 * W);
    const arcT = (t - sr) / (ss - sr); // 음수 가능
    return {
      darkness: 1 - progress,
      arcT: arcT > 0 ? arcT : 0,
      stage: "sunrise",
    };
  }
  // 낮 (sr+30 → ss-30) — 완전 낮, 해는 호 그리며 이동
  if (t < ss - W) {
    const arcT = (t - sr) / (ss - sr);
    return {
      darkness: 0,
      arcT: Math.max(0, Math.min(1, arcT)),
      stage: "day",
    };
  }
  // 일몰 트랜지션 (ss-30 → ss+30): darkness 0 → 1
  if (t < ss + W) {
    const progress = (t - (ss - W)) / (2 * W);
    const arcT = (t - sr) / (ss - sr);
    return {
      darkness: progress,
      arcT: Math.max(0, Math.min(1, arcT)),
      stage: "sunset",
    };
  }
  // 밤 (일몰 30분 후 이후) — 완전 밤, 해 사라짐
  return { darkness: 1, arcT: null, stage: "night" };
}

// 화면 좌표로 환산 — 호(arc) 위에서 해의 (x, y) 위치
// 화면 왼쪽 = 동(일출), 오른쪽 = 서(일몰). arcT 0 → 0.5 → 1.
// (좌→우 읽기 방향과 맞춰 대부분의 날씨앱이 쓰는 표준 컨벤션)
export function sunArcPosition(
  arcT: number,
  screenWidth: number,
): { cx: number; cy: number } {
  const t = Math.max(0, Math.min(1, arcT));
  const cx = t * screenWidth; // 0(왼쪽 일출) → W(오른쪽 일몰)
  const cy = 250 - 200 * Math.sin(Math.PI * t); // 250(낮음) → 50(높음) → 250(낮음)
  return { cx, cy };
}
