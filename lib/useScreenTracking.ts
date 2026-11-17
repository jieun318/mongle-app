import { useEffect } from "react";
import { useSegments } from "expo-router";
import { trackScreen } from "@/lib/analytics";
import { screenNameFromSegments } from "@/lib/analyticsEvents";

// Expo Router 는 posthog 의 자동 화면 수집(react-navigation 기반)과 맞지 않아 직접 기록한다.
// usePathname 은 실제 값(/search/love)을 주므로, 패턴이 그대로 남는 useSegments 를 쓴다.
export function useScreenTracking(): void {
  const segments = useSegments() as readonly string[];
  const name = screenNameFromSegments(segments);
  useEffect(() => {
    trackScreen(name);
  }, [name]);
}
