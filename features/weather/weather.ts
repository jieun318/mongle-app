import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";

// 홈 비/눈 연출용 날씨 상태. 서버(api/weather)가 IP 로 대략 위치를 잡아
// 기상청 초단기실황을 조회하고, 앱엔 상태만 내려준다.
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
    const res = await fetch(getWeatherUrl());
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
