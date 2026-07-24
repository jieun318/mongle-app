import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { getCurrentLocation } from "@/lib/sun";

// 홈 비/눈 연출용 날씨 상태. 앱이 GPS 좌표를 서버(api/weather)에 넘기면
// 서버가 기상청 초단기실황을 조회하고(키는 서버에만), 앱엔 상태만 내려준다.
// 좌표를 못 넘기면 서버가 IP 로 대략 위치를 잡는다(폴백).
export type WeatherCondition = "clear" | "rain" | "snow" | "sleet";

function getWeatherUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (base) return `${base.replace(/\/$/, "")}/api/weather`;
  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  if (hostUri) return `http://${hostUri.split(":")[0]}:8081/api/weather`;
  return "/api/weather";
}

const VALID: WeatherCondition[] = ["clear", "rain", "snow", "sleet"];

async function fetchWeatherCondition(): Promise<WeatherCondition> {
  try {
    // GPS 좌표를 쿼리로 전달(서버는 좌표 우선). 권한 거부로 폴백된 경우엔
    // 좌표를 빼서 서버가 IP 로 대략 위치를 잡게 한다.
    const loc = await getCurrentLocation();
    const url = loc.fallback
      ? getWeatherUrl()
      : `${getWeatherUrl()}?lat=${loc.lat.toFixed(4)}&lon=${loc.lng.toFixed(4)}`;
    const res = await fetch(url);
    if (!res.ok) return "clear";
    const data = (await res.json()) as { condition?: string };
    const c = data?.condition;
    return VALID.includes(c as WeatherCondition) ? (c as WeatherCondition) : "clear";
  } catch {
    return "clear"; // 실패해도 홈은 그대로 (연출만 생략)
  }
}

// 날씨는 천천히 변하므로 30분 캐시. 실패 시 clear.
export function useWeatherCondition() {
  return useQuery({
    queryKey: ["weatherCondition"],
    queryFn: fetchWeatherCondition,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}
